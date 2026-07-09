"""FastAPI entrypoint for the document Q&A assistant."""
import anthropic
from fastapi import FastAPI
from pydantic import BaseModel

from app import config

app = FastAPI(title="Doc AI Assistant")
client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    message = client.messages.create(
        model=config.CHAT_MODEL,
        max_tokens=config.MAX_TOKENS,
        messages=[{"role": "user", "content": req.question}],
    )
    answer = "".join(block.text for block in message.content if block.type == "text")
    return ChatResponse(answer=answer)
