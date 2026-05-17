"""Shared OpenRouter HTTP client settings."""

from config import settings


def openrouter_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": settings.openrouter_referer(),
        "X-Title": "ATLAS",
    }
