import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { authFetch, getJSON } from "../api";
import { longDay } from "../energy";
import { useRecorder, useSpeech, transcribe } from "../speech";
import { MicIcon, PlayIcon, StopIcon, WaitIcon } from "../icons";

// Asking about your own journal.
//
// This screen only ever reads. Nothing said here becomes a journal entry or a
// remembered fact — what she knows about you comes from what you sat down and
// wrote. The thread is today's, and tomorrow starts clean.
export default function Ask() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState([]);
  const [viewing, setViewing] = useState(null); // a past day, or null for today
  const speech = useSpeech();
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Load a day's thread — today's on arrival, an older one when picked.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getJSON(
        viewing ? `/questions?day=${viewing}` : "/questions",
      );
      if (cancelled || !data) return;
      setMessages(
        (data.questions || []).flatMap((q) => [
          { role: "user", text: q.question },
          { role: "assistant", text: q.answer, sources: q.sources },
        ]),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [viewing]);

  // Refresh the day list when a thread goes from empty to answered, so today
  // appears in the history the moment it has something in it.
  const threadStarted = messages.length > 0;
  useEffect(() => {
    getJSON("/questions/days").then((d) => d && setDays(d.days || []));
  }, [threadStarted]);

  async function ask(question) {
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await authFetch("/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let started = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!started) {
          started = true;
          setLoading(false); // first token in — drop the dots, open the bubble
          setMessages((prev) => [...prev, { role: "assistant", text: chunk }]);
        } else {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, text: last.text + chunk };
            return copy;
          });
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I couldn't reach her just now." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const recorder = useRecorder(async (blob) => {
    setLoading(true);
    try {
      const text = await transcribe(blob);
      setLoading(false);
      if (text) await ask(text);
    } catch {
      setLoading(false);
    }
  });

  function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading || viewing) return;
    setInput("");
    ask(text);
  }

  return (
    <main className="screen ask">
      {days.length > 1 && (
        <nav className="threaddays">
          <button className={viewing ? "" : "on"} onClick={() => setViewing(null)}>
            Today
          </button>
          {days.slice(1).map((d) => (
            <button
              key={d}
              className={viewing === d ? "on" : ""}
              onClick={() => setViewing(d)}
            >
              {longDay(d)}
            </button>
          ))}
        </nav>
      )}

      <div className="thread">
        {messages.length === 0 && !loading && (
          <p className="hint centred">
            Ask her anything about what you've written.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "assistant" ? (
              <>
                <div className="prose">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
                {m.sources?.length > 0 && (
                  <p className="sources">
                    Looked at {m.sources.map(longDay).join(" · ")}
                  </p>
                )}
                {m.text && (
                  <button
                    type="button"
                    className={"speak" + (speech.loadingIdx === i ? " busy" : "")}
                    onClick={() => speech.play(m.text, i)}
                  >
                    {speech.loadingIdx === i ? (
                      <><WaitIcon /> Finding her voice…</>
                    ) : speech.speakingIdx === i ? (
                      <><StopIcon /> Stop</>
                    ) : (
                      <><PlayIcon /> Listen</>
                    )}
                  </button>
                )}
              </>
            ) : (
              m.text
            )}
          </div>
        ))}

        {loading && (
          <div className="msg assistant typing">
            <span /><span /><span />
          </div>
        )}
        <div ref={bottom} />
      </div>

      {viewing ? (
        <p className="hint centred closed">
          That day's conversation is closed. Come back to today to ask again.
        </p>
      ) : (
        <form className="bar" onSubmit={send}>
          <button
            type="button"
            className={"mic" + (recorder.recording ? " on" : "")}
            onClick={recorder.toggle}
            aria-label={recorder.recording ? "Stop recording" : "Speak instead"}
          >
            {recorder.recording ? <StopIcon /> : <MicIcon />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={recorder.recording ? "Listening…" : "Ask about your days…"}
          />
          <button className="send" disabled={loading || !input.trim()}>
            Ask
          </button>
        </form>
      )}
    </main>
  );
}
