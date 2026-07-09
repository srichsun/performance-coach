"""Central configuration, loaded from environment / .env."""
import os

from dotenv import load_dotenv

load_dotenv()

# LLM
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CHAT_MODEL = os.getenv("CHAT_MODEL", "claude-haiku-4-5")
MAX_TOKENS = 1024

# Vector store
CHROMA_DIR = os.getenv("CHROMA_DIR", "chroma_db")
COLLECTION_NAME = "documents"

# Retrieval
CHUNK_SIZE = 500  # characters per chunk
CHUNK_OVERLAP = 50
TOP_K = 4  # how many chunks to retrieve per question
