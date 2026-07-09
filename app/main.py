"""FastAPI entrypoint for the document Q&A assistant."""
from fastapi import FastAPI

app = FastAPI(title="Doc AI Assistant")


@app.get("/health")
def health():
    return {"status": "ok"}
