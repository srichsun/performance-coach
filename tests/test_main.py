"""App-level route tests."""
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app import agent, entries, voice
from app.main import app

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_entries_endpoint_returns_todays_entries(sqlite_db):
    entries.save_entry("felt good today", "love that", mood="happy")
    today = datetime.now(timezone.utc).date().isoformat()

    resp = client.get(f"/entries?day={today}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["day"] == today
    assert len(body["entries"]) == 1
    assert body["entries"][0]["mood"] == "happy"


def test_talk_transcribes_then_replies(monkeypatch):
    # No real OpenAI/LLM calls: fake the transcription and the coach.
    monkeypatch.setattr(voice, "transcribe", lambda data, name: "I feel tired")
    monkeypatch.setattr(
        agent,
        "chat_and_log",
        lambda text, session_id=None: {
            "answer": "rest is okay",
            "tools_used": [],
            "sources": [],
            "session_id": session_id,
        },
    )
    resp = client.post(
        "/talk",
        files={"audio": ("clip.webm", b"fake-audio-bytes", "audio/webm")},
        data={"session_id": "s-voice"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["transcript"] == "I feel tired"
    assert body["answer"] == "rest is okay"
    assert body["session_id"] == "s-voice"


def test_speak_returns_audio(monkeypatch):
    monkeypatch.setattr(voice, "speak", lambda text, voice=None: b"fake-mp3")
    resp = client.post("/speak", json={"text": "you did great"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/mpeg"
    assert resp.content == b"fake-mp3"


def test_wins_endpoint_lists_only_wins(sqlite_db):
    entries.save_entry("just a normal day", "ok", wins=None)
    entries.save_entry("shipped the feature", "huge!", wins="shipped feature")

    resp = client.get("/wins")
    assert resp.status_code == 200
    wins = resp.json()["wins"]
    assert len(wins) == 1
    assert wins[0]["wins"] == "shipped feature"
