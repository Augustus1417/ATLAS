import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from config import settings
from database import dict_cursor

SERPER_URL = "https://google.serper.dev/shopping"
SOURCE_MAX_LENGTH = 255


class SerperServiceError(Exception):
    pass


def _parse_price(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    text = str(value)
    match = re.search(r"([0-9][0-9,]*\.?[0-9]*)", text)
    if not match:
        return None
    numeric = match.group(1).replace(",", "")
    try:
        return float(numeric)
    except ValueError:
        return None


def _normalize_listing(item: dict[str, Any]) -> dict[str, Any] | None:
    price = _parse_price(item.get("price") or item.get("extractedPrice") or item.get("priceValue"))
    if price is None:
        return None

    source = item.get("source") or item.get("seller") or item.get("store") or "Unknown"
    return {
        "title": item.get("title") or "",
        "store": str(source),
        "price": price,
        "link": item.get("link"),
    }


def _build_query_variants(part_name: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", part_name).strip()
    compact = normalized

    replacements = [
        r"\b6-Core Processor\b",
        r"\b8-Core Processor\b",
        r"\bProcessor\b",
        r"\bDesktop Memory\b",
        r"\bMemory\b",
        r"\bGraphics Card\b",
        r"\bMotherboard\b",
        r"\bNVMe SSD\b",
        r"\bSSD\b",
        r"\bPSU\b",
        r"\bPower Supply\b",
        r"\bCase\b",
        r"\bAirflow Case\b",
        r"\bWi-Fi\b",
        r"\bWIFI\b",
    ]

    for pattern in replacements:
        compact = re.sub(pattern, "", compact, flags=re.IGNORECASE)

    compact = re.sub(r"\s+", " ", compact).strip()

    candidates = [normalized]
    if compact and compact not in candidates:
        candidates.append(compact)

    lowered = normalized.lower()
    if "ryzen" in lowered and "5600" in lowered:
        candidates.append("Ryzen 5 5600")
    if "ryzen" in lowered and "5700" in lowered:
        candidates.append("Ryzen 7 5700X")
    if "rtx 4060 ti" in lowered:
        candidates.append("RTX 4060 Ti")
    elif "rtx 4060" in lowered:
        candidates.append("RTX 4060")
    if "ddr4" in lowered and "16gb" in lowered:
        candidates.append("DDR4 3200 16GB")
    if "ddr4" in lowered and "32gb" in lowered:
        candidates.append("DDR4 3200 32GB")
    if "nv2" in lowered and "1tb" in lowered:
        candidates.append("Kingston NV2 1TB")
    if "b550" in lowered:
        candidates.append("MSI B550M Pro-VDH")

    query_variants: list[str] = []
    for candidate in candidates:
        for query in (
            candidate,
            f'"{candidate}"',
            f"{candidate} Philippines",
        ):
            if query not in query_variants:
                query_variants.append(query)

    return query_variants


def _extract_cached_listing(source: str | None, fallback_price: float) -> dict[str, Any]:
    if not source:
        return {"store": "Unknown", "price": fallback_price, "link": None}

    try:
        payload = json.loads(source)
        store = payload.get("store") or payload.get("s") or "Unknown"
        link = payload.get("link") or payload.get("l")
        return {
            "store": store,
            "price": fallback_price,
            "link": link,
        }
    except (json.JSONDecodeError, TypeError):
        return {"store": source, "price": fallback_price, "link": None}


def _encode_cached_source(store: str | None, link: str | None) -> str:
    payload = {"s": (store or "Unknown").strip()}
    if link:
        payload["l"] = link.strip()

    encoded = json.dumps(payload, separators=(",", ":"))
    if len(encoded) <= SOURCE_MAX_LENGTH:
        return encoded

    if link:
        available = SOURCE_MAX_LENGTH - len(json.dumps({"s": payload["s"], "l": ""}, separators=(",", ":")))
        if available > 0:
            payload["l"] = link.strip()[:available]
            encoded = json.dumps(payload, separators=(",", ":"))
            if len(encoded) <= SOURCE_MAX_LENGTH:
                return encoded

    return json.dumps({"s": payload["s"]}, separators=(",", ":"))


def get_recent_cached_prices(conn, component_id: int) -> list[dict[str, Any]]:
    threshold = datetime.now(timezone.utc) - timedelta(hours=24)

    cur = dict_cursor(conn)
    cur.execute(
        """
        SELECT price, source, recorded_at
        FROM pricing_history
        WHERE component_id = %s AND recorded_at >= %s
        ORDER BY price ASC, recorded_at DESC
        LIMIT 3
        """,
        (component_id, threshold),
    )
    rows = cur.fetchall()
    cur.close()

    if not rows:
        return []

    listings: list[dict[str, Any]] = []
    for row in rows:
        listings.append(_extract_cached_listing(row["source"], float(row["price"])))
    return listings


def fetch_live_prices(part_name: str) -> list[dict[str, Any]]:
    headers = {"X-API-KEY": settings.serper_api_key}

    query_variants = _build_query_variants(part_name)

    normalized: list[dict[str, Any]] = []

    for query in query_variants:
        body = {
            "q": query,
            "gl": "ph",
            "hl": "en",
            "num": 10,
        }

        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(SERPER_URL, json=body, headers=headers)
                response.raise_for_status()
                payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise SerperServiceError("Live pricing service request failed") from exc

        shopping = payload.get("shopping") or payload.get("shopping_results") or payload.get("results") or []

        for item in shopping:
            if not isinstance(item, dict):
                continue
            normalized_item = _normalize_listing(item)
            if normalized_item:
                normalized.append(normalized_item)

        if normalized:
            break

    normalized.sort(key=lambda row: row["price"])
    return normalized[:3]


def save_pricing_history(conn, component_id: int, listings: list[dict[str, Any]]) -> None:
    if not listings:
        return

    cur = dict_cursor(conn)
    for listing in listings:
        cur.execute(
            """
            INSERT INTO pricing_history (component_id, price, currency, source)
            VALUES (%s, %s, %s, %s)
            """,
            (
                component_id,
                listing["price"],
                "PHP",
                _encode_cached_source(listing.get("store"), listing.get("link")),
            ),
        )
    conn.commit()
    cur.close()
