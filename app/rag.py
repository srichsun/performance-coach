"""Document ingestion and retrieval for RAG."""
import re
from pathlib import Path

from pypdf import PdfReader

from app import config, store


def _read_segments(path: Path) -> list[tuple[str, int | None]]:
    """Return (text, page) segments. PDFs are split per page; text files
    are a single segment with page=None."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(str(path))
        return [(page.extract_text() or "", i + 1) for i, page in enumerate(reader.pages)]
    if suffix in (".md", ".txt"):
        return [(path.read_text(encoding="utf-8"), None)]
    raise ValueError(f"Unsupported file type: {path.name}")


def _chunk(text: str, size: int, overlap: int) -> list[str]:
    """Split text into ~size-char chunks along paragraph boundaries.

    Packing whole paragraphs (instead of blindly cutting every `size`
    characters) keeps sentences intact, so each chunk is a clean semantic
    unit and retrieval matches on meaning rather than truncated fragments.
    A paragraph longer than `size` falls back to overlapping char windows.
    """
    text = text.strip()
    if not text:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if len(para) > size:
            if current:
                chunks.append(current)
                current = ""
            for start in range(0, len(para), size - overlap):
                chunks.append(para[start : start + size])
        elif current and len(current) + 1 + len(para) > size:
            chunks.append(current)
            current = para
        else:
            current = f"{current}\n{para}" if current else para

    if current:
        chunks.append(current)
    return chunks


def ingest_file(path: Path) -> int:
    """Chunk a single file and add it to the vector store. Returns chunk count."""
    collection = store.get_collection()
    documents, metadatas, ids = [], [], []

    for text, page in _read_segments(path):
        for idx, chunk in enumerate(_chunk(text, config.CHUNK_SIZE, config.CHUNK_OVERLAP)):
            meta = {"source": path.name}
            if page is not None:
                meta["page"] = page
            documents.append(chunk)
            metadatas.append(meta)
            ids.append(f"{path.name}:{page}:{idx}")

    if documents:
        collection.upsert(documents=documents, metadatas=metadatas, ids=ids)
    return len(documents)


def ingest_dir(data_dir: str = "data") -> dict[str, int]:
    """Ingest every supported file in a directory. Returns {filename: chunks}."""
    counts = {}
    for path in sorted(Path(data_dir).iterdir()):
        if path.suffix.lower() in (".pdf", ".md", ".txt"):
            counts[path.name] = ingest_file(path)
    return counts


def retrieve(query: str, k: int = config.TOP_K) -> list[dict]:
    """Return the k most relevant chunks for a query, with their source info."""
    collection = store.get_collection()
    result = collection.query(query_texts=[query], n_results=k)

    hits = []
    # Chroma returns each field as a list-of-lists (one inner list per query).
    for text, meta, distance in zip(
        result["documents"][0], result["metadatas"][0], result["distances"][0]
    ):
        hits.append(
            {
                "text": text,
                "source": meta.get("source"),
                "page": meta.get("page"),
                "distance": distance,
            }
        )
    return hits
