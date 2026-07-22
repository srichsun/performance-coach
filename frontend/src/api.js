// Where the FastAPI backend runs. In the deployed build the frontend is served
// by the same server, so VITE_API_BASE is "" (same origin); local dev falls
// back to the separate dev server.
import { getIdToken } from "./firebase";

export const API = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

// fetch() with the signed-in user's ID token attached, so the backend knows
// who's asking and can scope the journal to them.
export async function authFetch(path, options = {}) {
  const token = await getIdToken();
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// GET returning JSON, or null if anything goes wrong. Every screen here can
// show something sensible when a request fails, so a thrown error would only
// ever be caught and ignored a line later.
export async function getJSON(path) {
  try {
    const res = await authFetch(path);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// POST JSON, returning { ok, status, data } so callers can tell a refusal
// (409 out of edits) apart from a failure.
export async function postJSON(path, body) {
  try {
    const res = await authFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      ok: res.ok,
      status: res.status,
      data: res.ok ? await res.json() : null,
    };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
