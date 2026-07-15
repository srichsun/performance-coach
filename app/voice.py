"""Voice in and out via OpenAI: Whisper turns speech into text, TTS turns the
coach's reply into spoken audio. Both need OPENAI_API_KEY."""
import io

from openai import OpenAI

from app import config

_client = OpenAI(api_key=config.OPENAI_API_KEY)


def transcribe(audio: bytes, filename: str = "audio.webm") -> str:
    """Turn recorded audio into text with Whisper.

    The SDK looks at the file name's extension to know the audio format, so we
    give the bytes a name.
    """
    buf = io.BytesIO(audio)
    buf.name = filename
    result = _client.audio.transcriptions.create(model="whisper-1", file=buf)
    return result.text


def speak(text: str, voice: str | None = None) -> bytes:
    """Turn text into spoken audio (mp3 bytes) with OpenAI TTS."""
    result = _client.audio.speech.create(
        model="gpt-4o-mini-tts",
        voice=voice or config.TTS_VOICE,
        input=text,
    )
    return result.read()
