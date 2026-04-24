from datetime import datetime, timedelta, timezone
import re
from typing import Any

from database import dict_cursor
from services.ai_service import AIServiceError, fallback_recommendations, fetch_ai_recommendations
from services.serper_service import (
    SerperServiceError,
    fetch_live_prices,
    get_recent_cached_prices,
    _extract_cached_listing,
    save_pricing_history,
)


class RecommendationServiceError(Exception):
    pass


ESSENTIAL_ORDER = {
    "desktop": ["CPU", "Device", "Motherboard", "RAM", "Storage", "PSU", "Case", "GPU"],
    "laptop": ["Device"],
    "mobile": ["Device"],
}

LOW_BUDGET_THRESHOLD = 15000


def _derive_brand(name: str) -> str:
    parts = name.strip().split()
    return parts[0] if parts else "Generic"


def _ensure_component(conn, part: dict[str, str]) -> int:
    cur = dict_cursor(conn)
    cur.execute(
        """
        SELECT component_id
        FROM components
        WHERE LOWER(name) = LOWER(%s) AND LOWER(category) = LOWER(%s)
        LIMIT 1
        """,
        (part["name"], part["category"]),
    )
    row = cur.fetchone()

    if row:
        component_id = int(row["component_id"])
        cur.close()
        return component_id

    cur.execute(
        """
        INSERT INTO components (name, brand, category, is_active)
        VALUES (%s, %s, %s, %s)
        RETURNING component_id
        """,
        (part["name"], _derive_brand(part["name"]), part["category"], True),
    )
    inserted = cur.fetchone()
    conn.commit()
    cur.close()
    return int(inserted["component_id"])


def _name_match_patterns(name: str) -> list[str]:
    tokens = [token.lower() for token in re.findall(r"[A-Za-z0-9]+", name)]
    meaningful = [token for token in tokens if len(token) > 2 and token not in {"core", "processor", "graphics", "card", "desktop", "memory", "motherboard", "case", "psu", "power", "supply"}]

    patterns: list[str] = []
    if meaningful:
        if len(meaningful) >= 2:
            patterns.append(f"%{meaningful[0]}%")
            patterns.append(f"%{meaningful[-1]}%")
        else:
            patterns.append(f"%{meaningful[0]}%")

    for token in meaningful:
        pattern = f"%{token}%"
        if pattern not in patterns:
            patterns.append(pattern)

    normalized = re.sub(r"\s+", " ", name).strip().lower()
    if normalized:
        exact = f"%{normalized}%"
        if exact not in patterns:
            patterns.insert(0, exact)

    return patterns[:6]


def _lookup_recent_cached_prices(conn, part: dict[str, str]) -> list[dict[str, Any]]:
    threshold = datetime.now(timezone.utc) - timedelta(hours=24)
    patterns = _name_match_patterns(part["name"])

    if not patterns:
        return []

    cur = dict_cursor(conn)
    conditions = " OR ".join(["LOWER(c.name) LIKE %s"] * len(patterns))
    cur.execute(
        f"""
        SELECT ph.price, ph.source, ph.recorded_at
        FROM pricing_history ph
        JOIN components c ON c.component_id = ph.component_id
        WHERE LOWER(c.category) = LOWER(%s)
                    AND ph.recorded_at >= %s
          AND ({conditions})
        ORDER BY ph.price ASC, ph.recorded_at DESC
        LIMIT 3
        """,
                tuple([part["category"], threshold, *patterns]),
    )
    rows = cur.fetchall()
    cur.close()

    if not rows:
        return []

    listings: list[dict[str, Any]] = []
    for row in rows:
        listings.append(_extract_cached_listing(row["source"], float(row["price"])))
    return listings


def _part_priority(part: dict[str, Any], budget_php: int, device_type: str) -> tuple[int, int]:
    order = ESSENTIAL_ORDER.get(device_type, ESSENTIAL_ORDER["desktop"])
    category = part["category"]

    if budget_php <= LOW_BUDGET_THRESHOLD and category == "GPU":
        return (len(order) + 5, 0)

    try:
        return (order.index(category), 0)
    except ValueError:
        return (len(order), 0)


def generate_recommendation(conn, budget_php: int, workload: str, device_type: str) -> dict[str, Any]:
    try:
        ai_parts = fetch_ai_recommendations(budget_php=budget_php, workload=workload, device_type=device_type)
    except AIServiceError as exc:
        ai_parts = fallback_recommendations(workload=workload, device_type=device_type)

    candidate_parts: list[dict[str, Any]] = []

    for part in ai_parts:
        cached = _lookup_recent_cached_prices(conn, part)

        component_id = None
        if not cached:
            component_id = _ensure_component(conn, part)
            cached = get_recent_cached_prices(conn, component_id)

        if cached:
            listings = cached
        else:
            try:
                if component_id is None:
                    component_id = _ensure_component(conn, part)
                listings = fetch_live_prices(part["name"])
                save_pricing_history(conn, component_id, listings)
            except SerperServiceError as exc:
                raise RecommendationServiceError(str(exc)) from exc

        if not listings:
            listings = [{"store": "Price unavailable", "price": None, "link": None, "status": "Price unavailable"}]

        cheapest = next((item for item in listings if item.get("price") is not None), None)

        normalized_listings = []
        for listing in listings:
            normalized_listings.append(
                {
                    "store": listing.get("store", "Unknown"),
                    "price": listing.get("price"),
                    "link": listing.get("link"),
                    "status": listing.get("status"),
                }
            )

        candidate_parts.append(
            {
                "category": part["category"],
                "name": part["name"],
                "listings": normalized_listings,
                "cheapest_price": float(cheapest["price"]) if cheapest else None,
            }
        )

    candidate_parts.sort(key=lambda item: _part_priority(item, budget_php, device_type))

    output_parts: list[dict[str, Any]] = []
    estimated_total_php = 0.0

    for part in candidate_parts:
        cheapest_price = part["cheapest_price"]
        if cheapest_price is None:
            continue

        if budget_php <= LOW_BUDGET_THRESHOLD and part["category"] == "GPU" and estimated_total_php == 0:
            continue

        if estimated_total_php + cheapest_price > budget_php:
            continue

        estimated_total_php += cheapest_price
        output_parts.append(
            {
                "category": part["category"],
                "name": part["name"],
                "listings": part["listings"],
            }
        )

    return {
        "workload": workload,
        "budget_php": budget_php,
        "estimated_total_php": round(estimated_total_php, 2),
        "parts": output_parts,
    }
