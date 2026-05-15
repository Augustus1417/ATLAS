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
    if any(token in normalized for token in {"game", "gaming", "esport"}):
        return "gaming"
    if any(token in normalized for token in {"student", "school", "study", "class"}):
        return "student"
    if any(token in normalized for token in {"general", "office", "browse", "everyday"}):
        return "general"
    return normalized


def _build_prompt(budget_php: int, workload: str, device_type: str) -> str:
    return (
        "You are a hardware recommendation assistant for users in the Philippines. "
        f"Budget in PHP: {budget_php}. Workload: {workload}. Device type: {device_type}. "
        "Return ONLY a raw JSON array. Do not return markdown. Do not return explanations. "
        "No code fences. "
        "For desktop return parts using categories like CPU, GPU, RAM, Motherboard, Storage, PSU, Case. "
        "For laptop or mobile, return complete devices instead of individual parts. "
        "Each array item must follow {\"category\": string, \"name\": string}."
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


def fetch_ai_recommendations(budget_php: int, workload: str, device_type: str) -> list[dict[str, str]]:
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": "http://localhost",
        "X-Title": "ATLAS",
    }

    payload_base: dict[str, Any] = {
        "messages": [
            {"role": "system", "content": "Follow instructions exactly."},
            {"role": "user", "content": _build_prompt(budget_php, workload, device_type)},
        ],
        "temperature": 0,
        "max_tokens": 800,
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


def fallback_recommendations(workload: str, device_type: str) -> list[dict[str, str]]:
    if device_type in {"laptop", "mobile"}:
        return [
            {"category": "Device", "name": "Acer Aspire Lite 15"},
        ]

    workload_key = _normalize_workload_key(workload)

    presets: dict[str, list[dict[str, str]]] = {
        "gaming": [
            {"category": "CPU", "name": "AMD Ryzen 5 5600 6-Core Processor"},
            {"category": "GPU", "name": "Palit GeForce RTX 4060 Dual 8GB"},
            {"category": "RAM", "name": "Corsair Vengeance LPX 16GB DDR4 3200MHz"},
            {"category": "Motherboard", "name": "MSI B550M PRO-VDH WIFI"},
            {"category": "Storage", "name": "Kingston NV2 1TB NVMe SSD"},
            {"category": "PSU", "name": "Seasonic S12III 650W 80+ Bronze"},
            {"category": "Case", "name": "Tecware Forge M2 Airflow Case"},
        ],
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

    return presets.get(workload_key, presets["general"])
