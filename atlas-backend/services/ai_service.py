import json
import re
from typing import Any

import httpx

from config import settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class AIServiceError(Exception):
    pass


def _candidate_models() -> list[str]:
    models = [settings.openrouter_model]
    fallback_models = [item.strip() for item in settings.openrouter_fallback_models.split(",") if item.strip()]
    for model in fallback_models:
        if model not in models:
            models.append(model)
    return models


def _normalize_workload_key(workload: str) -> str:
    normalized = workload.strip().lower()
    if not normalized:
        return "general"
    if any(token in normalized for token in {"edit", "video", "content", "production"}):
        return "video_editing"
    if any(token in normalized for token in {"stream", "streaming", "broadcast"}):
        return "streaming"
    if any(token in normalized for token in {"game", "gaming", "esport"}):
        return "gaming"
    if any(token in normalized for token in {"student", "school", "study", "class"}):
        return "student"
    if any(token in normalized for token in {"general", "office", "browse", "everyday"}):
        return "general"
    return normalized


def budget_allocation_shares(workload: str, device_type: str) -> dict[str, float]:
    """Fraction of total budget to aim for per desktop category (sums to ~1.0)."""
    if device_type != "desktop":
        return {}

    key = _normalize_workload_key(workload)
    shares_by_workload: dict[str, dict[str, float]] = {
        "gaming": {
            "GPU": 0.38,
            "CPU": 0.22,
            "Motherboard": 0.12,
            "RAM": 0.08,
            "Storage": 0.08,
            "PSU": 0.07,
            "Case": 0.05,
        },
        "streaming": {
            "CPU": 0.28,
            "GPU": 0.30,
            "RAM": 0.12,
            "Motherboard": 0.10,
            "Storage": 0.08,
            "PSU": 0.07,
            "Case": 0.05,
        },
        "video_editing": {
            "CPU": 0.30,
            "GPU": 0.28,
            "RAM": 0.12,
            "Motherboard": 0.10,
            "Storage": 0.10,
            "PSU": 0.06,
            "Case": 0.04,
        },
        "student": {
            "CPU": 0.30,
            "Motherboard": 0.14,
            "RAM": 0.12,
            "Storage": 0.14,
            "GPU": 0.10,
            "PSU": 0.12,
            "Case": 0.08,
        },
        "general": {
            "CPU": 0.28,
            "GPU": 0.18,
            "Motherboard": 0.14,
            "RAM": 0.10,
            "Storage": 0.12,
            "PSU": 0.10,
            "Case": 0.08,
        },
    }
    return shares_by_workload.get(key, shares_by_workload["general"])


def _format_allocation_hint(budget_php: int, workload: str, device_type: str) -> str:
    shares = budget_allocation_shares(workload, device_type)
    if not shares:
        target_low = int(budget_php * 0.88)
        return (
            f"Target total retail price: ₱{target_low:,}–₱{budget_php:,} (use most of the budget)."
        )

    lines = [
        f"Target total retail price: ₱{int(budget_php * 0.88):,}–₱{budget_php:,}.",
        "Aim for these typical Philippine price bands per part:",
    ]
    for category, share in shares.items():
        cap = int(budget_php * share)
        floor = int(cap * 0.65)
        lines.append(f"- {category}: about ₱{floor:,}–₱{cap:,}")
    lines.append(
        "Do NOT pick entry-level parts meant for half this budget. Choose models whose street prices "
        "fill the bands above so the build total is close to the budget."
    )
    return "\n".join(lines)


def _avoid_parts_clause(avoid_parts: list[dict[str, str]] | None) -> str:
    if not avoid_parts:
        return ""
    names = [p.get("name", "") for p in avoid_parts if p.get("name")]
    if not names:
        return ""
    joined = "; ".join(names)
    return (
        f"\nDo NOT suggest these exact models (pick different alternatives): {joined}."
    )


def _build_prompt(
    budget_php: int,
    workload: str,
    device_type: str,
    avoid_parts: list[dict[str, str]] | None = None,
    regenerate: bool = False,
) -> str:
    allocation = _format_allocation_hint(budget_php, workload, device_type)
    regen_note = (
        "\nThis is a REGENERATION request — suggest a different balanced build than before."
        if regenerate
        else ""
    )
    return (
        "You are a hardware recommendation assistant for users in the Philippines. "
        f"Maximum budget in PHP: {budget_php}. Workload: {workload}. Device type: {device_type}.\n"
        f"{allocation}{regen_note}{_avoid_parts_clause(avoid_parts)}\n"
        "Return ONLY a raw JSON array. Do not return markdown. Do not return explanations. "
        "No code fences. "
        "For desktop return parts using categories: CPU, GPU, RAM, Motherboard, Storage, PSU, Case. "
        "For laptop or mobile, return one Device item priced near the full budget. "
        "Each array item must follow {\"category\": string, \"name\": string}."
    )


def _build_single_category_prompt(
    budget_php: int,
    workload: str,
    device_type: str,
    category: str,
    category_budget_php: int,
    locked_parts: list[dict[str, str]],
    avoid_parts: list[dict[str, str]] | None = None,
) -> str:
    locked_desc = (
        "; ".join(f"{p['category']}: {p['name']}" for p in locked_parts) if locked_parts else "(none)"
    )
    return (
        "You are a hardware recommendation assistant for users in the Philippines.\n"
        f"Suggest ONE replacement part. Category: {category}. "
        f"Max price for this part: ₱{category_budget_php:,}. "
        f"Full PC budget: ₱{budget_php:,}. Workload: {workload}. Device: {device_type}.\n"
        f"Keep these other parts unchanged: {locked_desc}.\n"
        f"{_avoid_parts_clause(avoid_parts)}\n"
        "Pick a different model than before that still fits the budget and pairs well with the locked parts.\n"
        'Return ONLY a JSON array with one item: {"category": string, "name": string}. No markdown.'
    )


def _build_upgrade_prompt(
    budget_php: int,
    workload: str,
    device_type: str,
    current_parts: list[dict[str, str]],
    current_total: float,
) -> str:
    remaining = max(0, int(budget_php - current_total))
    target = int(budget_php * 0.92)
    parts_desc = "; ".join(f"{p['category']}: {p['name']}" for p in current_parts)
    return (
        "You are upgrading a PC parts list for the Philippines.\n"
        f"Budget: ₱{budget_php:,}. Current build total: ₱{int(current_total):,}. "
        f"Remaining: ₱{remaining:,}. Target new total: about ₱{target:,}.\n"
        f"Workload: {workload}. Device type: {device_type}.\n"
        f"Current parts: {parts_desc}\n"
        "Return ONLY a JSON array of UPGRADED replacements (not the whole build unchanged). "
        "Include every category you upgrade with a clearly better model that costs more "
        "(stronger GPU/CPU, more RAM/storage, etc.). "
        'Each item: {"category": string, "name": string}. No markdown.'
    )


def _extract_json_array(raw_text: str) -> list[dict[str, str]]:
    cleaned = raw_text.strip()

    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start == -1 or end == -1 or end <= start:
            raise
        parsed = json.loads(cleaned[start : end + 1])

    if not isinstance(parsed, list):
        raise ValueError("AI output is not a JSON array")

    validated: list[dict[str, str]] = []
    for item in parsed:
        if not isinstance(item, dict) or "category" not in item or "name" not in item:
            raise ValueError("AI output item is missing category or name")
        validated.append({"category": str(item["category"]), "name": str(item["name"])})
    return validated


def _call_openrouter_json(
    user_content: str,
    *,
    temperature: float = 0,
    max_tokens: int = 800,
) -> list[dict[str, str]]:
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": "http://localhost",
        "X-Title": "ATLAS",
    }

    payload_base: dict[str, Any] = {
        "messages": [
            {"role": "system", "content": "Follow instructions exactly."},
            {"role": "user", "content": user_content},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    last_error: Exception | None = None

    for model in _candidate_models():
        payload = dict(payload_base)
        payload["model"] = model

        for attempt in range(2):
            try:
                with httpx.Client(timeout=45) as client:
                    response = client.post(OPENROUTER_URL, json=payload, headers=headers)
                    if response.status_code >= 400:
                        error_detail = response.text.strip()
                        raise AIServiceError(
                            f"OpenRouter request failed for model {model} with status {response.status_code}"
                            + (f": {error_detail[:300]}" if error_detail else "")
                        )

                    body = response.json()

                content = body["choices"][0]["message"]["content"].strip()
                return _extract_json_array(content)
            except AIServiceError as exc:
                last_error = exc
                break
            except (httpx.HTTPError, KeyError, ValueError, json.JSONDecodeError) as exc:
                last_error = exc
                if attempt == 1:
                    break

    if last_error is not None:
        raise AIServiceError(f"Failed to generate structured AI recommendations: {last_error}") from last_error

    raise AIServiceError("Failed to generate structured AI recommendations")


def fetch_ai_recommendations(
    budget_php: int,
    workload: str,
    device_type: str,
    *,
    avoid_parts: list[dict[str, str]] | None = None,
    regenerate: bool = False,
) -> list[dict[str, str]]:
    prompt = _build_prompt(
        budget_php,
        workload,
        device_type,
        avoid_parts=avoid_parts,
        regenerate=regenerate,
    )
    temperature = 0.45 if regenerate or avoid_parts else 0.0
    return _call_openrouter_json(prompt, temperature=temperature, max_tokens=800)


def fetch_ai_category_recommendation(
    budget_php: int,
    workload: str,
    device_type: str,
    category: str,
    category_budget_php: int,
    locked_parts: list[dict[str, str]],
    avoid_parts: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    prompt = _build_single_category_prompt(
        budget_php,
        workload,
        device_type,
        category,
        category_budget_php,
        locked_parts,
        avoid_parts=avoid_parts,
    )
    parts = _call_openrouter_json(prompt, temperature=0.5, max_tokens=300)
    return [p for p in parts if p.get("category") and p.get("name")][:1]


def fetch_budget_upgrade_recommendations(
    budget_php: int,
    workload: str,
    device_type: str,
    current_parts: list[dict[str, str]],
    current_total: float,
) -> list[dict[str, str]]:
    """Ask AI for higher-tier replacements when the first pass is far under budget."""
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": "http://localhost",
        "X-Title": "ATLAS",
    }
    payload_base: dict[str, Any] = {
        "messages": [
            {"role": "system", "content": "Follow instructions exactly."},
            {
                "role": "user",
                "content": _build_upgrade_prompt(
                    budget_php, workload, device_type, current_parts, current_total
                ),
            },
        ],
        "temperature": 0.2,
        "max_tokens": 600,
    }

    last_error: Exception | None = None
    for model in _candidate_models():
        payload = {**payload_base, "model": model}
        try:
            with httpx.Client(timeout=45) as client:
                response = client.post(OPENROUTER_URL, json=payload, headers=headers)
                if response.status_code >= 400:
                    raise AIServiceError(f"OpenRouter upgrade failed: {response.status_code}")
                content = response.json()["choices"][0]["message"]["content"].strip()
            return _extract_json_array(content)
        except Exception as exc:
            last_error = exc

    if last_error is not None:
        raise AIServiceError(f"Failed to generate budget upgrade recommendations: {last_error}")
    raise AIServiceError("Failed to generate budget upgrade recommendations")


def fallback_recommendations(
    workload: str,
    device_type: str,
    budget_php: int = 0,
) -> list[dict[str, str]]:
    if device_type in {"laptop", "mobile"}:
        return [
            {"category": "Device", "name": "Acer Aspire Lite 15"},
        ]

    workload_key = _normalize_workload_key(workload)

    entry_gaming = [
        {"category": "CPU", "name": "AMD Ryzen 5 5500 6-Core Processor"},
        {"category": "GPU", "name": "Palit GeForce GTX 1660 Super 6GB"},
        {"category": "RAM", "name": "Team T-Force Vulcan 16GB DDR4 3200MHz"},
        {"category": "Motherboard", "name": "ASRock B550M-HDV"},
        {"category": "Storage", "name": "Kingston NV2 500GB NVMe SSD"},
        {"category": "PSU", "name": "FSP HV Pro 550W 80+ Bronze"},
        {"category": "Case", "name": "Tecware Nexus M2"},
    ]

    mid_gaming = [
        {"category": "CPU", "name": "AMD Ryzen 5 5600 6-Core Processor"},
        {"category": "GPU", "name": "Palit GeForce RTX 4060 Dual 8GB"},
        {"category": "RAM", "name": "Corsair Vengeance LPX 16GB DDR4 3200MHz"},
        {"category": "Motherboard", "name": "MSI B550M PRO-VDH WIFI"},
        {"category": "Storage", "name": "Kingston NV2 1TB NVMe SSD"},
        {"category": "PSU", "name": "Seasonic S12III 650W 80+ Bronze"},
        {"category": "Case", "name": "Tecware Forge M2 Airflow Case"},
    ]

    ultra_budget = [
        {"category": "CPU", "name": "AMD Ryzen 5 5600G 6-Core Processor"},
        {"category": "RAM", "name": "Team Elite 8GB DDR4 3200MHz"},
        {"category": "Motherboard", "name": "ASRock A520M-HDV"},
        {"category": "Storage", "name": "ADATA Legend 480GB NVMe SSD"},
        {"category": "PSU", "name": "FSP HV Pro 450W 80+ Bronze"},
        {"category": "Case", "name": "Tecware Nexus M2"},
    ]

    if budget_php > 0 and budget_php <= 20000:
        gaming_preset = ultra_budget
    elif budget_php > 0 and budget_php <= 45000:
        gaming_preset = entry_gaming
    else:
        gaming_preset = mid_gaming

    presets: dict[str, list[dict[str, str]]] = {
        "gaming": gaming_preset,
        "streaming": gaming_preset,
        "video_editing": [
            {"category": "CPU", "name": "AMD Ryzen 7 5700X 8-Core Processor"},
            {"category": "GPU", "name": "PNY GeForce RTX 4060 Ti 8GB"},
            {"category": "RAM", "name": "G.Skill Ripjaws V 32GB DDR4 3200MHz"},
            {"category": "Motherboard", "name": "MSI B550M PRO-VDH WIFI"},
            {"category": "Storage", "name": "WD Blue SN580 1TB NVMe SSD"},
            {"category": "PSU", "name": "Corsair CX650 650W 80+ Bronze"},
            {"category": "Case", "name": "Cooler Master MasterBox MB311L"},
        ],
        "student": [
            {"category": "CPU", "name": "Intel Core i3-12100F"},
            {"category": "GPU", "name": "Integrated Graphics"},
            {"category": "RAM", "name": "Team Elite 16GB DDR4 3200MHz"},
            {"category": "Motherboard", "name": "ASUS PRIME H610M-K D4"},
            {"category": "Storage", "name": "ADATA XPG SX8200 Pro 512GB NVMe SSD"},
            {"category": "PSU", "name": "FSP HV Pro 550W 80+ Bronze"},
            {"category": "Case", "name": "Tecware Nexus M2"},
        ],
        "general": [
            {"category": "CPU", "name": "AMD Ryzen 5 5600G 6-Core Processor"},
            {"category": "GPU", "name": "Integrated Graphics"},
            {"category": "RAM", "name": "Corsair Vengeance LPX 16GB DDR4 3200MHz"},
            {"category": "Motherboard", "name": "MSI B550M PRO-VDH WIFI"},
            {"category": "Storage", "name": "Kingston NV2 1TB NVMe SSD"},
            {"category": "PSU", "name": "FSP HV Pro 550W 80+ Bronze"},
            {"category": "Case", "name": "Tecware Nexus M2"},
        ],
    }

    general = presets["general"]
    if budget_php > 0 and budget_php <= 20000:
        general = ultra_budget
    return presets.get(workload_key, general)
