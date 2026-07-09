# Doc AI Assistant

A small **RAG (Retrieval-Augmented Generation) document Q&A API**. You load a
set of documents (product docs, policies, FAQs), and users ask questions in
natural language. The service retrieves the relevant passages and asks Claude to
answer **using only those passages**, returning the answer together with its
sources. If the answer isn't in the documents, it says so instead of guessing.

The demo knowledge base is a product **customer-support assistant** (plans,
returns policy, warranty). Swap the files in `data/` and it becomes an internal
knowledge base, a technical-docs bot, etc.

## Why RAG (and not just ChatGPT)

A general chatbot doesn't know your private documents, and pasting whole
documents into every prompt is expensive and hits context limits. RAG retrieves
only the relevant chunks, so answers are **cheaper, grounded, and cite their
source** — which is exactly what companies build in-house.

## Architecture

```
                ingest (offline)                     query (per request)
  data/*.pdf,*.md ──> chunk ──> embed ──> Chroma      question
                                            │            │
                                            └── retrieve top-k chunks
                                                         │
                                        build prompt (context + question)
                                                         │
                                              Claude (Anthropic API)
                                                         │
                                             answer + source citations
```

- **Embeddings** run locally via Chroma's built-in model — no API key needed to
  ingest or retrieve.
- Only the **answer generation** step (`/chat`) calls the Anthropic API.

## Tech choices

| Piece         | Choice     | Why not the alternative |
|---------------|------------|-------------------------|
| Web framework | FastAPI    | Async + type hints + auto Swagger docs; lighter than Django for an API. |
| Packaging     | uv         | One tool for venv + lockfile, much faster than pip/poetry. |
| Vector store  | Chroma     | Embedded, zero infra; no SaaS account (Pinecone) or extra DB (pgvector). |
| LLM           | Claude     | Clean Anthropic SDK; model configurable, defaults to `claude-haiku-4-5` (cheap for dev). |
| Embeddings    | Chroma local (all-MiniLM) | No API key / cost in week 1; can swap to a cloud model later. |

## Project layout

```
app/
  config.py   settings from env / .env
  main.py     FastAPI routes: /health, /search, /chat
  llm.py      Anthropic Messages API wrapper
  store.py    Chroma client + collection
  rag.py      read/chunk/ingest + retrieve + prompt building
scripts/
  ingest.py   CLI to load data/ into the vector store
data/          your source documents (gitignored)
tests/         pytest (LLM + retrieval mocked, no API key needed)
```

## Setup

```bash
# 1. install deps (uv creates the venv from the lockfile)
uv sync

# 2. add your Anthropic key (only needed for /chat)
cp .env.example .env         # then edit .env and paste your key

# 3. load documents into the vector store (downloads the embedding model once)
uv run python -m scripts.ingest

# 4. run the API
uv run uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs for the interactive Swagger UI.

## Endpoints

| Method | Path         | Description |
|--------|--------------|-------------|
| GET    | `/health`    | Liveness check. |
| GET    | `/search?q=` | Return the top-k retrieved chunks (retrieval sanity check; no LLM, no key). |
| POST   | `/chat`      | `{"question": "..."}` → `{"answer": "...", "sources": [...]}`. Requires `ANTHROPIC_API_KEY`. |

Example:

```bash
curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "How much does an iPhone screen repair cost with AppleCare?"}'
```

## Tests

```bash
uv run pytest
```

The LLM call and retrieval are mocked, so the suite runs without an API key.

## Roadmap (week 2)

- Swap local embeddings for a cloud model and compare retrieval quality.
- Turn `retrieve` into a tool and let Claude decide when to call it
  (Agent / function calling), then add more tools.
- Multi-turn conversation memory, deploy to Render.
