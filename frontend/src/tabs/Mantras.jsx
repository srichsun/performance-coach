import { useEffect, useState } from "react";
import { authFetch, getJSON } from "../api";
import { useRecorder, transcribe } from "../speech";

// The lines you keep for the hard days. Your own words, in your own voice —
// she is told to hand one back when it fits rather than reaching for her own.
export default function Mantras() {
  const [mantras, setMantras] = useState([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    getJSON("/mantras").then((d) => d && setMantras(d.mantras || []));
  }, []);

  // On this screen the microphone is a way of writing, not talking — the words
  // belong in the box.
  const recorder = useRecorder(async (blob) => {
    try {
      const text = await transcribe(blob);
      if (text) setDraft((prev) => (prev ? `${prev} ${text}` : text));
    } catch {
      /* nothing to add — the box is still there */
    }
  });

  async function keep() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const res = await authFetch("/mantras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const saved = await res.json();
    setMantras((prev) => [saved, ...prev]); // newest first
  }

  async function reword(id, text) {
    setEditingId(null);
    const trimmed = text.trim();
    if (!trimmed) return;
    const res = await authFetch(`/mantras/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });
    if (!res.ok) return;
    const saved = await res.json();
    setMantras((prev) => prev.map((m) => (m.id === id ? saved : m)));
  }

  async function letGo(id) {
    // Drop it from the screen first; putting it back on failure is kinder than
    // making someone wait to watch a line disappear.
    const previous = mantras;
    setMantras((prev) => prev.filter((m) => m.id !== id));
    const res = await authFetch(`/mantras/${id}`, { method: "DELETE" });
    if (!res.ok) setMantras(previous);
  }

  return (
    <main className="screen">
      <section className="panel">
        <h2 className="display">Lines to come back to</h2>
        <p className="note">Your own words, given back to you when they fit.</p>
        <div className="compose">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && keep()}
            placeholder="Something worth remembering when it's hard…"
          />
          <button
            type="button"
            className={"mic" + (recorder.recording ? " on" : "")}
            onClick={recorder.toggle}
            aria-label={recorder.recording ? "Stop" : "Speak it instead"}
          >
            {recorder.recording ? "■" : "●"}
          </button>
          <button type="button" className="primary" onClick={keep}>
            Keep
          </button>
        </div>
      </section>

      {mantras.length === 0 && <p className="hint centred">Nothing kept yet.</p>}

      {mantras.map((m) => (
        <blockquote key={m.id} className="panel mantra">
          {editingId === m.id ? (
            <input
              autoFocus
              defaultValue={m.text}
              onBlur={(e) => reword(m.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") reword(m.id, e.target.value);
                if (e.key === "Escape") setEditingId(null);
              }}
            />
          ) : (
            <p onClick={() => setEditingId(m.id)} title="Tap to reword">
              {m.text}
            </p>
          )}
          <button type="button" className="drop" onClick={() => letGo(m.id)}>
            ×
          </button>
        </blockquote>
      ))}
    </main>
  );
}
