"""Tests for the strengths passage.

The write-up itself is an LLM call, so it's faked here — these check the glue:
that we feed it the journal's wins, store what comes back, and degrade quietly
when there's nothing (or something stale) to show.
"""
from app.core import db
from app.models import Profile
from app.services import entries, strengths


class _FakeModel:
    """Stands in for the chat model, recording the prompt it was given."""

    def __init__(self, text):
        self._text = text
        self.prompt = None

    def invoke(self, prompt):
        self.prompt = prompt
        return type("Reply", (), {"content": self._text})()


def test_refresh_writes_a_passage_from_the_wins(sqlite_db, monkeypatch):
    entries.save_entry("a", "b", user_id="u1", wins="cold shower")
    entries.save_entry("c", "d", user_id="u1", wins="two hours while exhausted")
    fake = _FakeModel("  You keep showing up anyway.  ")
    monkeypatch.setattr(strengths.chat_model, "build_chat_model", lambda: fake)

    passage = strengths.refresh_strengths("u1")

    assert passage == "You keep showing up anyway."
    # Both entries' wins were handed to the model.
    assert "cold shower" in fake.prompt
    assert "two hours while exhausted" in fake.prompt
    # ...and it reads back.
    assert strengths.get_strengths("u1") == passage


def test_refresh_is_a_noop_without_any_wins(sqlite_db, monkeypatch):
    """No journal yet means nothing to write from — and no wasted LLM call."""
    called = []
    monkeypatch.setattr(
        strengths.chat_model,
        "build_chat_model",
        lambda: called.append(1) or _FakeModel(""),
    )

    assert strengths.refresh_strengths("u1") == ""
    assert called == []


def test_get_strengths_is_empty_for_a_new_person(sqlite_db):
    assert strengths.get_strengths("nobody") == ""


def test_get_strengths_ignores_the_older_json_format(sqlite_db):
    """A row left by the previous version must not render as raw JSON."""
    with db.get_session() as s:
        s.add(Profile(key=strengths._key("u1"), content='[{"title": "old"}]'))
        s.commit()

    assert strengths.get_strengths("u1") == ""


def test_maybe_refresh_waits_for_enough_new_entries(sqlite_db, monkeypatch):
    refreshed = []
    monkeypatch.setattr(
        strengths, "refresh_strengths", lambda uid: refreshed.append(uid)
    )

    entries.save_entry("a", "b", user_id="u1", wins="one")
    strengths.maybe_refresh("u1")
    assert refreshed == []  # one entry is nowhere near the threshold

    for _ in range(strengths.REFRESH_EVERY):
        entries.save_entry("a", "b", user_id="u1", wins="more")
    strengths.maybe_refresh("u1")
    assert refreshed == ["u1"]
