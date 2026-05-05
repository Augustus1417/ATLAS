import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from config import settings
from database import dict_cursor
from services.ai_service import AIServiceError
from services.serper_service import SerperServiceError, fetch_live_prices


class ChatbotServiceError(Exception):
    pass


def _build_system_prompt() -> str:
    return (
        "You are a friendly and concise PC building assistant for users in the Philippines. "
        "Keep responses SHORT and conversational - 2-4 sentences max per message. "
        "Answer PC building questions: compatibility, recommendations, performance, budget tips, cooling, overclocking. "
        "IMPORTANT: Only recommend the specific parts the user asks for. If they ask for just a GPU, return only a GPU. "
        "Do NOT force a complete build - respect the user's request scope. "
        "When recommending parts, format them in a JSON code block like: "
        "```json\n{\"parts\": [{\"category\": \"GPU\", \"name\": \"NVIDIA RTX 4060\"}, ...]}\n``` "
        "Include JSON ONLY when recommending specific parts that the user requested. "
        "Be helpful but brief. Use local PHP pricing context. "
        "For complex topics, offer to dive deeper if the user asks."
    )


def _format_conversation_for_ai(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    """Convert conversation history to AI service format."""
    formatted = []
    for msg in messages:
        formatted.append({"role": msg["role"], "content": msg["content"]})
    return formatted


def _extract_parts_from_ai_response(response_text: str) -> list[dict[str, str]] | None:
    """Extract part recommendations from AI response if present."""
    json_pattern = r"```(?:json)?\s*(\{.*?\})\s*```"
    matches = re.findall(json_pattern, response_text, re.DOTALL)

    if not matches:
        return None

    parts = []
    for match in matches:
        try:
            data = json.loads(match)
            if "parts" in data and isinstance(data["parts"], list):
                for part in data["parts"]:
                    # Validate that both category and name exist and are non-empty
                    if "category" in part and "name" in part:
                        category = str(part["category"]).strip() if part["category"] else None
                        name = str(part["name"]).strip() if part["name"] else None
                        
                        if category and name:  # Only add if both are valid
                            parts.append({"category": category, "name": name})
        except json.JSONDecodeError:
            continue

    return parts if parts else None


def _clean_response_for_user(response_text: str) -> str:
    """Remove JSON code blocks from response text for user display."""
    cleaned = re.sub(r"```(?:json)?\s*\{.*?\}\s*```", "", response_text, flags=re.DOTALL)
    return cleaned.strip()


def _lookup_part_in_database(conn, part: dict[str, str]) -> list[dict[str, Any]] | None:
    """Look up a part in the database and return listings if found."""
    # Validate part data
    if not part or not isinstance(part, dict):
        return None
    
    category = part.get("category", "").strip() if part.get("category") else None
    name = part.get("name", "").strip() if part.get("name") else None
    
    if not category or not name:
        return None
    
    cur = dict_cursor(conn)

    patterns = _generate_search_patterns(name)
    if not patterns:
        cur.close()
        return None

    # Search for matching components
    conditions = " OR ".join(["LOWER(name) LIKE %s"] * len(patterns))
    cur.execute(
        f"""
        SELECT DISTINCT component_id, name
        FROM components
        WHERE LOWER(category) = LOWER(%s) AND ({conditions})
        LIMIT 1
        """,
        tuple([category, *patterns]),
    )
    row = cur.fetchone()

    if not row:
        cur.close()
        return None

    component_id = row["component_id"]

    # Get recent pricing history
    threshold = datetime.now(timezone.utc) - timedelta(hours=24)
    cur.execute(
        """
        SELECT DISTINCT source, price
        FROM pricing_history
        WHERE component_id = %s AND recorded_at >= %s
        ORDER BY price ASC
        LIMIT 5
        """,
        (component_id, threshold),
    )
    pricing_rows = cur.fetchall()
    cur.close()

    if not pricing_rows:
        return None

    listings = []
    for pricing_row in pricing_rows:
        listings.append(
            {"store": pricing_row["source"], "price": float(pricing_row["price"]), "link": None}
        )

    return listings


def _generate_search_patterns(name: str) -> list[str]:
    """Generate search patterns for flexible part matching."""
    if not name or not isinstance(name, str):
        return []
    
    tokens = [token.lower() for token in re.findall(r"[A-Za-z0-9]+", name)]
    meaningful = [
        token
        for token in tokens
        if len(token) > 2
        and token not in {"core", "processor", "graphics", "card", "memory", "desktop", "laptop"}
    ]

    patterns = []
    if meaningful:
        if len(meaningful) >= 2:
            patterns.append(f"%{meaningful[0]}%")
            patterns.append(f"%{meaningful[-1]}%")
        else:
            patterns.append(f"%{meaningful[0]}%")

    normalized = re.sub(r"\s+", " ", name).strip().lower()
    if normalized and f"%{normalized}%" not in patterns:
        patterns.insert(0, f"%{normalized}%")

    return patterns[:5]


def _fetch_ai_chat_response(
    message: str, conversation_history: list[dict[str, str]]
) -> str:
    """Fetch conversational response from AI with part extraction capability."""
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": "http://localhost",
        "X-Title": "ATLAS",
    }

    messages = _format_conversation_for_ai(conversation_history)
    messages.append({"role": "user", "content": message})

    payload_base = {
        "messages": [{"role": "system", "content": _build_system_prompt()}, *messages],
        "temperature": 0.7,
        "max_tokens": 400,
    }

    candidates = [settings.openrouter_model]
    fallback = [item.strip() for item in settings.openrouter_fallback_models.split(",") if item.strip()]
    for model in fallback:
        if model not in candidates:
            candidates.append(model)

    last_error = None

    for model in candidates:
        payload = dict(payload_base)
        payload["model"] = model

        try:
            with httpx.Client(timeout=60.0) as client:
                resp = client.post(OPENROUTER_URL, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()

                if "choices" not in data or not data["choices"]:
                    last_error = ChatbotServiceError(f"No choices in response from {model}")
                    continue

                return data["choices"][0]["message"]["content"]

        except Exception as exc:
            last_error = exc
            continue

    raise ChatbotServiceError(f"All AI models failed. Last error: {last_error}")


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def process_chat_message(conn, message: str, conversation_history: list[dict[str, str]]) -> dict[str, Any]:
    """
    Process a user message and generate a chatbot response with optional part recommendations.

    Returns:
        dict with keys: message (str), recommended_parts (list or None), sources (list or None)
    """
    try:
        ai_response = _fetch_ai_chat_response(message, conversation_history)
    except ChatbotServiceError as exc:
        raise ChatbotServiceError(f"Failed to get AI response: {str(exc)}") from exc

    recommended_parts = _extract_parts_from_ai_response(ai_response)
    clean_message = _clean_response_for_user(ai_response)

    recommended_data = None
    sources = None

    if recommended_parts:
        recommended_data = []
        sources = set()

        for part in recommended_parts:
            # Try database first
            listings = _lookup_part_in_database(conn, part)

            # If not found in database, try Serper
            if not listings:
                try:
                    listings = fetch_live_prices(part_name=part["name"])
                    if listings:
                        sources.add("Serper API (Live Web Search)")
                except SerperServiceError:
                    listings = None

            if listings:
                recommended_data.append(
                    {
                        "category": part["category"],
                        "name": part["name"],
                        "listings": listings[:3],  # Top 3 listings
                    }
                )

        # Convert sources set to list
        if sources:
            sources = list(sources)
        else:
            sources = None

    return {
        "message": clean_message,
        "recommended_parts": recommended_data if recommended_data else None,
        "sources": sources,
    }
