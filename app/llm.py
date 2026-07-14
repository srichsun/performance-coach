"""Shared Anthropic client, used by agent.py to call the Messages API."""
import anthropic

from app import config

# 30s timeout so a hung request fails fast instead of blocking the worker.
client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY, timeout=30.0)
