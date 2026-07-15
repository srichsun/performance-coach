"""Tests for the life-coach agent and the tool helpers.

The coach is driven by a fake, offline chat model, so these tests spend no
tokens and need no API key.
"""
from langchain_core.language_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from app import agent, rag, tools


def _coach_with(replies):
    """Build a coach backed by a fake model that returns the given replies."""
    fake = GenericFakeChatModel(messages=iter([AIMessage(r) for r in replies]))
    return agent.build_agent(fake)


# --- coach agent ---

def test_coach_replies(monkeypatch):
    monkeypatch.setattr(agent, "_agent", _coach_with(["you've got this"]))
    result = agent.run("I feel down today")
    assert result == {
        "answer": "you've got this",
        "tools_used": [],
        "sources": [],
        "session_id": None,
    }


def test_coach_remembers_within_a_session(monkeypatch):
    monkeypatch.setattr(agent, "_agent", _coach_with(["hi there", "second reply"]))
    agent.run("first message", session_id="s-1")
    result = agent.run("second message", session_id="s-1")
    # Same session id -> the same agent handled both turns, in order.
    assert result["answer"] == "second reply"
    assert result["session_id"] == "s-1"


# --- tool helpers (from the original engine, reused by later phases) ---

def test_dispatch_lookup_order():
    assert "iPhone" in tools.dispatch("lookup_order", {"order_id": "1001"})
    assert "No order" in tools.dispatch("lookup_order", {"order_id": "9999"})


def test_dispatch_unknown_tool():
    assert tools.dispatch("nope", {}) == "Unknown tool: nope"


def test_search_documents_uses_retrieval(monkeypatch):
    monkeypatch.setattr(rag, "retrieve", lambda q: [{"source": "d.md", "text": "hi"}])
    assert tools.search_documents("q") == "[d.md] hi"
