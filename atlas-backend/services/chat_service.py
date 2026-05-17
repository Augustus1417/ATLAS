import json
import re
from typing import Any

import httpx

from config import settings
from utils.openrouter_client import openrouter_headers
from database import dict_cursor
from services.ai_service import _candidate_models
from services.recommendation_service import generate_recommendation, lookup_parts_with_pricing
from utils.component_pricing import enrich_build_component_rows

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

CHAT_SYSTEM_PROMPT = """You are ATLAS Build Assistant, an expert PC building advisor for users in the Philippines.

Your role:
- Answer questions about PC components, compatibility, upgrades, and builds in clear, friendly language.
- Use Philippine Peso (PHP / ₱) when discussing budgets and prices.
- When the user is discussing THEIR saved build (provided in context), give advice about those exact parts, upgrades, bottlenecks, and compatibility.

CHAT FORMAT (required — replies appear in a narrow chat bubble):
- Lead with a direct answer in one short sentence (yes / no / maybe + expected FPS or outcome).
- Keep the whole visible reply under ~100 words before any ===LOOKUP_PART=== or ===RECOMMEND=== block.
- Use at most 3 bullet lines (start each with "- ") for key bottlenecks or upgrade picks.
- One optional "Verdict:" line after bullets — single sentence only.
- Never use markdown tables, headers (#), bold (**), or numbered essays.
- Do not repeat part names, prices, or specs that will appear in product cards below.
- Do not say "see the cards below" or "clickable retailer links" — the UI adds cards automatically.

IMPORTANT — You must trigger structured lookups so the app can show clickable retailer links:

1) Specific part(s) (one GPU, CPU, RAM stick, etc.) — when you name concrete products to buy:
End your reply with:
===LOOKUP_PART===
{"budget_php": <number or null>, "parts": [{"category": "GPU", "name": "NVIDIA GeForce GTX 1650 Super"}, ...]}
===END===

Use LOOKUP_PART when the user asks what to buy for a category, asks for options under a budget, or you recommend specific models.
Include every product name you suggest in the parts array (full product names).
budget_php is the user's max spend for that part (e.g. 15000 for a GPU budget); use null if not specified.

2) Full PC build (multiple categories: CPU, GPU, RAM, etc.):
===RECOMMEND===
{"budget_php": <number>, "workload": "<gaming|video_editing|student|general|streaming|productivity>", "device_type": "<desktop|laptop|mobile>"}
===END===

Use RECOMMEND only for complete builds, not single-component questions.

3) General knowledge (what is VRAM, how does PCIe work): no block."""


class ChatServiceError(Exception):
    pass


def _clean_chat_reply(text: str) -> str:
    """Normalize model output for narrow chat bubbles."""
    if not text:
        return text

    cleaned = text
    cleaned = re.sub(r"\*\*([^*]+)\*\*", r"\1", cleaned)
    cleaned = re.sub(r"__([^_]+)__", r"\1", cleaned)
    cleaned = re.sub(r"^#{1,6}\s+", "", cleaned, flags=re.MULTILINE)

    # Drop markdown table rows; keep prose lines.
    lines: list[str] = []
    for line in cleaned.splitlines():
        stripped = line.strip()
        if not stripped:
            lines.append("")
            continue
        if stripped.startswith("|") and stripped.endswith("|"):
            continue
        if re.fullmatch(r"[-|: ]+", stripped):
            continue
        lines.append(line.rstrip())

    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(
        r"(?i)\n*see the cards below[^\n]*",
        "",
        cleaned,
    ).strip()

    return cleaned


def _openrouter_headers() -> dict[str, str]:
    return openrouter_headers()


def _parse_block(content: str, tag: str) -> tuple[str, dict[str, Any] | None]:
    pattern = rf"==={tag}===\s*(\{{.*?\}})\s*===END==="
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return content.strip(), None

    clean_message = re.sub(pattern, "", content, flags=re.DOTALL).strip()
    try:
        return clean_message, json.loads(match.group(1))
    except json.JSONDecodeError:
        return clean_message, None


def _call_openrouter(messages: list[dict[str, str]], system_extra: str = "") -> str:
    system = CHAT_SYSTEM_PROMPT
    if system_extra:
        system = f"{system}\n\n{system_extra}"

    payload_base: dict[str, Any] = {
        "messages": [{"role": "system", "content": system}, *messages],
        "temperature": 0.4,
        "max_tokens": 700,
    }

    last_error: Exception | None = None

    for model in _candidate_models():
        payload = {**payload_base, "model": model}
        for attempt in range(2):
            try:
                with httpx.Client(timeout=60) as client:
                    response = client.post(
                        OPENROUTER_URL,
                        json=payload,
                        headers=_openrouter_headers(),
                    )
                    if response.status_code >= 400:
                        detail = response.text.strip()[:300]
                        raise ChatServiceError(
                            f"OpenRouter request failed for model {model} with status {response.status_code}"
                            + (f": {detail}" if detail else "")
                        )
                    body = response.json()
                return body["choices"][0]["message"]["content"].strip()
            except ChatServiceError as exc:
                last_error = exc
                break
            except (httpx.HTTPError, KeyError, IndexError) as exc:
                last_error = exc
                if attempt == 1:
                    break

    if last_error is not None:
        raise ChatServiceError(f"Failed to generate chat response: {last_error}") from last_error
    raise ChatServiceError("Failed to generate chat response")


def _extract_lookup_fallback(user_message: str, assistant_reply: str) -> dict[str, Any] | None:
    """If the model forgot the block, ask for structured part names only."""
    combined = f"{user_message}\n{assistant_reply}".lower()
    part_keywords = (
        "gpu",
        "graphics",
        "cpu",
        "processor",
        "ram",
        "memory",
        "motherboard",
        "mobo",
        "ssd",
        "storage",
        "psu",
        "power supply",
        "case",
    )
    if not any(k in combined for k in part_keywords):
        return None

    budget_match = re.search(r"(?:₱|php|peso)?\s*([0-9]{4,7})", user_message, re.IGNORECASE)
    budget_php = int(budget_match.group(1)) if budget_match else None

    extract_prompt = (
        "From the conversation below, list specific PC parts the assistant recommended to BUY "
        "(full product names). Return ONLY JSON:\n"
        '{"parts": [{"category": "GPU", "name": "..."}], "budget_php": <number or null>}\n'
        "If no specific purchasable products were named, return {\"parts\": [], \"budget_php\": null}.\n\n"
        f"User: {user_message}\n\nAssistant: {assistant_reply}"
    )

    try:
        with httpx.Client(timeout=30) as client:
            response = client.post(
                OPENROUTER_URL,
                json={
                    "model": _candidate_models()[0],
                    "messages": [
                        {"role": "system", "content": "Return only valid JSON."},
                        {"role": "user", "content": extract_prompt},
                    ],
                    "temperature": 0,
                    "max_tokens": 400,
                },
                headers=_openrouter_headers(),
            )
            if response.status_code >= 400:
                return None
            text = response.json()["choices"][0]["message"]["content"].strip()
            if text.startswith("```"):
                text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
                text = re.sub(r"\s*```$", "", text)
            data = json.loads(text)
    except Exception:
        return None

    parts = data.get("parts") or []
    if not parts:
        return None

    if budget_php is None and data.get("budget_php"):
        budget_php = int(data["budget_php"])

    return {"parts": parts, "budget_php": budget_php}


def _load_build_context(conn, build_id: int, user_id: int) -> str:
    cur = dict_cursor(conn)
    cur.execute("SELECT * FROM builds WHERE build_id = %s", (build_id,))
    build = cur.fetchone()
    if not build:
        cur.close()
        raise ChatServiceError("Build not found")
    if (not build["is_public"]) and build["user_id"] != user_id:
        cur.close()
        raise ChatServiceError("Not allowed to access this build")

    cur.execute(
        """
        SELECT bc.*, c.name, c.brand, c.category
        FROM build_components bc
        JOIN components c ON c.component_id = bc.component_id
        WHERE bc.build_id = %s
        ORDER BY bc.build_component_id ASC
        """,
        (build_id,),
    )
    components = enrich_build_component_rows(conn, cur.fetchall())
    cur.close()

    lines = [
        f"ACTIVE BUILD CONTEXT (build_id={build_id}):",
        f"Name: {build['build_name']}",
        f"Workload: {build.get('intended_workload') or 'unspecified'}",
        f"Saved total: ₱{float(build.get('total_price') or 0):,.0f}",
        "Components in this build:",
    ]
    if not components:
        lines.append("- (no components saved yet)")
    else:
        for comp in components:
            name = comp.get("name") or comp.get("component_name") or "Unknown"
            category = comp.get("category") or comp.get("component_category") or "Part"
            price = comp.get("price_at_save")
            price_str = f" — ₱{float(price):,.0f}" if price else ""
            lines.append(f"- {category}: {name}{price_str}")

    lines.append(
        "When the user asks about 'my build', 'this build', or part choices, refer to these components."
    )
    return "\n".join(lines)


def _is_full_build(parts: list[dict[str, Any]]) -> bool:
    if len(parts) < 3:
        return False
    categories = {str(p.get("category", "")).upper() for p in parts}
    desktop_core = {"CPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASE", "GPU", "DEVICE"}
    return len(categories & desktop_core) >= 3


def _fallback_reply(user_message: str) -> str:
    lowered = user_message.lower()
    if any(word in lowered for word in ("recommend", "suggest", "build", "parts", "budget")):
        return (
            "I'd be happy to recommend parts for your build. Please share your budget in PHP "
            "(e.g. ₱80,000), what you'll use the PC for (gaming, editing, school, etc.), "
            "and whether you need a desktop or laptop."
        )
    return (
        "I'm ATLAS Build Assistant. I can help with PC building questions, compatibility, "
        "and part recommendations with Philippine retailer links. What would you like to know?"
    )


def process_chat(
    conn,
    messages: list[dict[str, str]],
    build_id: int | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    system_extra = ""
    active_build: dict[str, Any] | None = None

    if build_id is not None:
        if user_id is None:
            raise ChatServiceError("Authentication required to discuss a saved build")
        system_extra = _load_build_context(conn, build_id, user_id)
        active_build = {"build_id": build_id}

    api_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

    try:
        raw_reply = _call_openrouter(api_messages, system_extra=system_extra)
    except ChatServiceError:
        last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        return {
            "message": _fallback_reply(last_user),
            "parts": [],
            "recommendation": None,
            "is_full_build": False,
            "active_build": active_build,
        }

    reply_text, recommend_params = _parse_block(raw_reply, "RECOMMEND")
    if recommend_params is None:
        reply_text, lookup_params = _parse_block(reply_text, "LOOKUP_PART")
    else:
        lookup_params = None

    parts: list[dict[str, Any]] = []
    recommendation: dict[str, Any] | None = None
    is_full_build = False

    if recommend_params:
        budget = recommend_params.get("budget_php")
        if isinstance(budget, (int, float)) and budget >= 10000:
            try:
                recommendation = generate_recommendation(
                    conn=conn,
                    budget_php=int(budget),
                    workload=str(recommend_params.get("workload") or "general"),
                    device_type=str(recommend_params.get("device_type") or "desktop"),
                )
                parts = recommendation.get("parts") or recommendation.get("components") or []
                is_full_build = _is_full_build(parts)
            except Exception:
                parts = []

    elif lookup_params:
        raw_parts = lookup_params.get("parts") or []
        budget = lookup_params.get("budget_php")
        budget_int = int(budget) if isinstance(budget, (int, float)) and budget > 0 else None
        if raw_parts:
            try:
                parts = lookup_parts_with_pricing(conn, raw_parts, budget_php=budget_int)
            except Exception:
                parts = []

    if not parts:
        last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        fallback_lookup = _extract_lookup_fallback(last_user, reply_text or raw_reply)
        if fallback_lookup and fallback_lookup.get("parts"):
            budget_int = fallback_lookup.get("budget_php")
            try:
                parts = lookup_parts_with_pricing(
                    conn,
                    fallback_lookup["parts"],
                    budget_php=int(budget_int) if budget_int else None,
                )
            except Exception:
                parts = []

    if parts and not reply_text:
        reply_text = "Here are matching parts with retailer links."

    reply_text = _clean_chat_reply(reply_text or "")

    return {
        "message": reply_text or raw_reply,
        "parts": parts,
        "recommendation": recommendation,
        "is_full_build": is_full_build,
        "active_build": active_build,
    }
