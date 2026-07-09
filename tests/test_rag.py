"""Unit tests for chunking. No embeddings / API key needed."""
from app.rag import _chunk


def test_chunk_keeps_paragraphs_intact():
    text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
    chunks = _chunk(text, size=100, overlap=10)
    # Everything fits under 100 chars, so it stays one clean chunk.
    assert chunks == ["First paragraph.\nSecond paragraph.\nThird paragraph."]


def test_chunk_splits_when_over_size():
    text = "A" * 40 + "\n\n" + "B" * 40  # two 40-char paragraphs
    chunks = _chunk(text, size=50, overlap=5)
    # They can't both fit in 50 chars, so each paragraph lands in its own chunk.
    assert len(chunks) == 2
    assert chunks[0].strip("A") == ""
    assert chunks[1].strip("B") == ""


def test_chunk_empty_text():
    assert _chunk("   ", size=100, overlap=10) == []
