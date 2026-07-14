"""FastAPI entrypoint for the document Q&A assistant."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import agent, rag

app = FastAPI(title="Doc AI Assistant")

# Allow the local React dev server (Vite) to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AgentRequest(BaseModel):
    question: str
    session_id: str | None = None  # pass the same id to continue a conversation


class AgentResponse(BaseModel):
    answer: str
    tools_used: list[str]
    sources: list[str] = []
    session_id: str | None = None


@app.get("/health")
def health():
    """Liveness check — no dependencies, no API key needed."""
    return {"status": "ok"}


@app.get("/search")
def search(q: str):
    """Return the most relevant chunks for a query (retrieval sanity check)."""
    return {"query": q, "hits": rag.retrieve(q)}


@app.post("/agent", response_model=AgentResponse)
def agent_endpoint(req: AgentRequest):
    """Agent version: Claude decides which tools to call (search / order lookup).

    Pass a session_id to keep context across follow-up questions.
    """
    return agent.run(req.question, session_id=req.session_id)
