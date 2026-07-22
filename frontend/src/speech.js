import { useRef, useState } from "react";
import { authFetch } from "./api";

// File extension for a recording's MIME type. Browsers disagree on what they
// record: Chrome produces "audio/webm;codecs=opus", iOS Safari "audio/mp4".
export function audioExtension(mimeType) {
  const type = (mimeType || "").toLowerCase();
  if (type.includes("mp4") || type.includes("m4a")) return "mp4";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("mpeg")) return "mp3";
  return "webm";
}

// Roughly how much text to synthesise at once. Small enough that the first
// chunk comes back in about a second, large enough not to chop her delivery
// into breathless fragments.
const SPEECH_CHUNK_CHARS = 220;

// Split a reply into speakable chunks, breaking on sentence ends so each one
// sounds like a finished thought rather than a cut-off line.
export function splitForSpeech(text) {
  const plain = (text || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_`#>]/g, "")
    .replace(/\n{2,}/g, "\n");
  const sentences = plain.match(/[^.!?\n]+[.!?]*\n?/g) || [];
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if (current && (current + s).length > SPEECH_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = "";
    }
    current += s;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

// A tiny silent clip used to "unlock" the audio element inside a tap, so the
// browser (iOS Safari, Chrome) lets the reply — fetched a moment later — play.
const SILENT =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

// Reading a reply aloud.
//
// Synthesis cost is wildly superlinear: one sentence comes back in ~0.6s, a
// whole reply takes ~11s. So we ask for it a chunk at a time and start playing
// the first while the next is still being made. Speaking a chunk takes about
// ten times longer than making one, so after the first there is always another
// ready and the seams stay inaudible.
//
// "Which reply is active" lives in a ref, not state: two quick taps land in the
// same render, so a state check would still read null on the second and start a
// rival playback on top of the first.
export function useSpeech() {
  const audioRef = useRef(null);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [loadingIdx, setLoadingIdx] = useState(null);
  const cache = useRef(new Map());
  const abortRef = useRef(null);
  const activeRef = useRef(null);
  const endRef = useRef(null);

  function stop() {
    activeRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
    }
    endRef.current?.();
    endRef.current = null;
    setSpeakingIdx(null);
    setLoadingIdx(null);
  }

  async function fetchSpeech(chunk, signal) {
    const cached = cache.current.get(chunk);
    if (cached) return cached;
    const res = await authFetch("/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: chunk }),
      signal,
    });
    if (!res.ok) throw new Error("speech failed");
    const url = URL.createObjectURL(await res.blob());
    cache.current.set(chunk, url);
    return url;
  }

  // Same, but tolerates being abandoned: a prefetch nobody ends up awaiting
  // would otherwise surface as an unhandled rejection.
  function prefetch(chunk, signal) {
    const p = fetchSpeech(chunk, signal);
    p.catch(() => {});
    return p;
  }

  // Play one chunk; resolves when it ends, fails, or playback is stopped, so
  // the queue can never hang waiting on audio that will never finish.
  function playOne(a, url) {
    return new Promise((resolve) => {
      endRef.current = resolve;
      a.onended = resolve;
      a.onerror = resolve;
      a.src = url;
      a.play().catch(resolve);
    });
  }

  async function play(text, idx) {
    const a = audioRef.current || (audioRef.current = new Audio());

    if (activeRef.current === idx) return stop(); // same tap again means stop
    stop(); // switching replies: abandon whatever was going
    activeRef.current = idx; // claimed synchronously, before any await

    // Unlock playback NOW, synchronously inside the tap — browsers block a
    // play() called later (after the await), which is why sound goes missing.
    try {
      a.src = SILENT;
      a.play().catch(() => {});
    } catch {
      /* ignore */
    }

    const chunks = splitForSpeech(text);
    if (!chunks.length) return stop();

    const controller = new AbortController();
    abortRef.current = controller;
    setLoadingIdx(idx);

    let pending = prefetch(chunks[0], controller.signal);
    try {
      for (let i = 0; i < chunks.length; i++) {
        const url = await pending;
        if (activeRef.current !== idx) return; // stopped while we waited
        pending =
          i + 1 < chunks.length ? prefetch(chunks[i + 1], controller.signal) : null;
        if (i === 0) {
          setLoadingIdx(null);
          setSpeakingIdx(idx);
        }
        await playOne(a, url);
        if (activeRef.current !== idx) return;
      }
    } catch {
      /* aborted by another tap, or speech failed — the text is still there */
    }
    if (activeRef.current === idx) stop();
  }

  return { play, stop, speakingIdx, loadingIdx };
}

// Recording from the microphone. onClip receives the finished blob.
export function useRecorder(onClip) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);

  async function toggle() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => chunksRef.current.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop()); // release the mic
      setRecording(false);
      // Ask the recorder what it actually produced rather than assuming: Chrome
      // gives webm, iOS Safari gives mp4, and mislabelling it means the
      // transcriber can't read the file at all.
      onClip(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
    };
    recorderRef.current = rec;
    rec.start();
    setRecording(true);
  }

  return { recording, toggle };
}

// Send a clip to be transcribed. Returns the text, or "" if nothing came back.
export async function transcribe(blob) {
  const form = new FormData();
  // The name carries the format — the transcriber reads the extension to know
  // how to decode the bytes.
  form.append("audio", blob, `clip.${audioExtension(blob.type)}`);
  const res = await authFetch("/transcribe", { method: "POST", body: form });
  if (!res.ok) throw new Error("transcription failed");
  return ((await res.json()).text || "").trim();
}
