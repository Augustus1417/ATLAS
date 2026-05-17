from datetime import datetime, timedelta, timezone
import re
from typing import Any

from database import dict_cursor, is_sqlite_connection
from services.ai_service import (
    AIServiceError,
    budget_allocation_shares,
    fallback_recommendations,
    fetch_ai_category_recommendation,
    fetch_ai_recommendations,
    fetch_budget_upgrade_recommendations,
)
from utils.component_pricing import normalize_category, parse_pricing_source
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
BUDGET_UTILIZATION_MIN = 0.85
UNDERPRICE_RATIO = 0.65
UPGRADE_PRIORITY = ["GPU", "CPU", "RAM", "Storage", "Motherboard", "PSU", "Case", "Device"]
FILL_MAX_ROUNDS = 5


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
        ORDER BY ph.recorded_at DESC, ph.price DESC
        LIMIT 15
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


def _category_budget_caps(budget_php: int, workload: str, device_type: str) -> dict[str, float]:
    shares = budget_allocation_shares(workload, device_type)
    if not shares:
        return {}
    return {normalize_category(cat): float(budget_php * share) for cat, share in shares.items()}


def _pick_listing(
    listings: list[dict[str, Any]],
    max_price: float | None = None,
    target_price: float | None = None,
    min_price: float | None = None,
) -> dict[str, Any] | None:
    priced = [item for item in listings if item.get("price") is not None]
    if max_price is not None:
        priced = [item for item in priced if float(item["price"]) <= max_price]
    if min_price is not None:
        priced = [item for item in priced if float(item["price"]) >= min_price]
    if not priced and min_price is not None:
        priced = [item for item in listings if item.get("price") is not None]
        if max_price is not None:
            priced = [item for item in priced if float(item["price"]) <= max_price]
    if not priced:
        return None
    if target_price is None:
        return min(priced, key=lambda item: float(item["price"]))
    return min(priced, key=lambda item: abs(float(item["price"]) - target_price))


def _output_part_from_resolved(resolved: dict[str, Any]) -> dict[str, Any]:
    price = resolved.get("cheapest_price") or resolved.get("price")
    return {
        "component_id": resolved["component_id"],
        "category": resolved["category"],
        "name": resolved["name"],
        "brand": resolved.get("brand") or _derive_brand(resolved["name"]),
        "price": price,
        "cheapest_price": price,
        "link": resolved.get("link"),
        "store": resolved.get("store"),
        "listings": resolved.get("listings") or [],
    }


def _find_db_component_in_price_band(
    conn,
    category: str,
    min_price: float,
    max_price: float,
    target_price: float,
    exclude_names: list[str] | None = None,
) -> dict[str, Any] | None:
    """Pick a catalog component with recent pricing in the requested band."""
    if max_price <= 0:
        return None

    threshold = datetime.now(timezone.utc) - timedelta(days=7)
    exclude = {n.strip().lower() for n in (exclude_names or []) if n}

    if is_sqlite_connection(conn):
        active_clause = "(c.is_active = 1 OR c.is_active IS NULL)"
    else:
        active_clause = "(c.is_active IS TRUE OR c.is_active IS NULL)"

    cur = dict_cursor(conn)
    cur.execute(
        f"""
        SELECT c.component_id, c.name, c.brand, c.category, ph.price, ph.source
        FROM components c
        JOIN pricing_history ph ON ph.component_id = c.component_id
        WHERE LOWER(c.category) = LOWER(%s)
          AND {active_clause}
          AND ph.price >= %s
          AND ph.price <= %s
          AND ph.recorded_at >= %s
        ORDER BY ABS(ph.price - %s) ASC, ph.recorded_at DESC
        LIMIT 12
        """,
        (category, min_price, max_price, threshold, target_price),
    )
    rows = cur.fetchall()
    cur.close()

    for row in rows:
        if row["name"].strip().lower() in exclude:
            continue
        parsed = parse_pricing_source(row.get("source"))
        price = float(row["price"])
        return {
            "component_id": int(row["component_id"]),
            "category": normalize_category(row["category"]),
            "name": row["name"],
            "brand": row.get("brand") or _derive_brand(row["name"]),
            "cheapest_price": price,
            "price": price,
            "link": parsed.get("link"),
            "store": parsed.get("store"),
            "listings": [
                {
                    "store": parsed.get("store") or "Unknown",
                    "price": price,
                    "link": parsed.get("link"),
                    "status": None,
                }
            ],
        }
    return None


def _part_priority(part: dict[str, Any], budget_php: int, device_type: str) -> tuple[int, int]:
    order = ESSENTIAL_ORDER.get(device_type, ESSENTIAL_ORDER["desktop"])
    category = part["category"]

    if budget_php <= LOW_BUDGET_THRESHOLD and category == "GPU":
        return (len(order) + 5, 0)

    try:
        return (order.index(category), 0)
    except ValueError:
        return (len(order), 0)


def _resolve_part_with_pricing(
    conn,
    part: dict[str, str],
    max_price: float | None = None,
    target_price: float | None = None,
) -> dict[str, Any] | None:
    """Resolve one part to DB + listings; pick listing near target within max_price."""
    cached = _lookup_recent_cached_prices(conn, part)

    component_id = None
    if not cached:
        component_id = _ensure_component(conn, part)
        cached = get_recent_cached_prices(conn, component_id)

    if cached:
        listings = list(cached)
    else:
        listings = []

    try:
        if component_id is None:
            component_id = _ensure_component(conn, part)
        live = fetch_live_prices(part["name"])
        if live:
            save_pricing_history(conn, component_id, live)
            listings = [*listings, *live]
    except SerperServiceError:
        pass

    if component_id is None:
        component_id = _ensure_component(conn, part)
    if not listings:
        listings = get_recent_cached_prices(conn, component_id, limit=15)

    if not listings:
        listings = [{"store": "Price unavailable", "price": None, "link": None, "status": "Price unavailable"}]

    min_price = None
    if target_price is not None and target_price >= 5000:
        min_price = target_price * 0.35

    chosen = _pick_listing(
        listings,
        max_price=max_price,
        target_price=target_price,
        min_price=min_price,
    )
    if chosen is None and max_price is not None:
        chosen = _pick_listing(listings, max_price=None, target_price=target_price)
    if chosen is None:
        chosen = next((item for item in listings if item.get("price") is not None), None)

    normalized_listings = [
        {
            "store": listing.get("store", "Unknown"),
            "price": listing.get("price"),
            "link": listing.get("link"),
            "status": listing.get("status"),
        }
        for listing in listings
    ]

    if component_id is None:
        component_id = _ensure_component(conn, part)

    chosen_price = float(chosen["price"]) if chosen else None
    if max_price is not None and chosen_price is not None and chosen_price > max_price:
        return None

    chosen_listing = chosen or {}

    return {
        "component_id": component_id,
        "category": part["category"],
        "name": part["name"],
        "brand": _derive_brand(part["name"]),
        "price": chosen_price,
        "cheapest_price": chosen_price,
        "link": chosen_listing.get("link"),
        "store": chosen_listing.get("store"),
        "listings": normalized_listings,
    }


def lookup_parts_with_pricing(
    conn,
    parts: list[dict[str, str]],
    budget_php: int | None = None,
) -> list[dict[str, Any]]:
    """Look up specific parts (e.g. one GPU) with retailer links; budget applies per part."""
    max_price = float(budget_php) if budget_php else None
    resolved: list[dict[str, Any]] = []
    for part in parts:
        category = str(part.get("category") or "Other").strip()
        name = str(part.get("name") or "").strip()
        if not name:
            continue
        item = _resolve_part_with_pricing(
            conn,
            {"category": category, "name": name},
            max_price=max_price,
        )
        if item:
            resolved.append(item)
    return resolved


def _candidate_from_ai_part(
    conn,
    part: dict[str, str],
    category_caps: dict[str, float],
) -> dict[str, Any]:
    category = normalize_category(part["category"])
    cap = category_caps.get(category)
    target = cap * 0.88 if cap else None
    resolved = _resolve_part_with_pricing(
        conn,
        {"category": category, "name": part["name"]},
        max_price=cap,
        target_price=target,
    )
    if not resolved:
        return {
            "component_id": _ensure_component(conn, part),
            "category": category,
            "name": part["name"],
            "brand": _derive_brand(part["name"]),
            "listings": [],
            "cheapest_price": None,
            "cheapest_listing": None,
        }
    return {
        "component_id": resolved["component_id"],
        "category": category,
        "name": resolved["name"],
        "brand": resolved["brand"],
        "listings": resolved["listings"],
        "cheapest_price": resolved["cheapest_price"],
        "cheapest_listing": {
            "price": resolved["cheapest_price"],
            "link": resolved.get("link"),
            "store": resolved.get("store"),
        },
    }


def _fill_missing_categories(
    conn,
    output_parts: list[dict[str, Any]],
    budget_php: int,
    workload: str,
    device_type: str,
    category_caps: dict[str, float],
) -> list[dict[str, Any]]:
    if device_type != "desktop":
        return output_parts

    present = {p["category"] for p in output_parts}
    needed = [
        normalize_category(cat)
        for cat in ESSENTIAL_ORDER["desktop"]
        if cat not in present and cat != "Device"
    ]
    if not needed:
        return output_parts

    fallback = fallback_recommendations(workload, device_type, budget_php)
    candidates: list[dict[str, Any]] = []
    for part in output_parts:
        candidates.append(
            {
                "component_id": part["component_id"],
                "category": part["category"],
                "name": part["name"],
                "brand": part.get("brand") or _derive_brand(part["name"]),
                "listings": part.get("listings") or [],
                "cheapest_price": part.get("price"),
                "cheapest_listing": {
                    "price": part.get("price"),
                    "link": part.get("link"),
                    "store": part.get("store"),
                },
            }
        )
    for spec in fallback:
        cat = normalize_category(spec["category"])
        if cat not in needed:
            continue
        candidates.append(_candidate_from_ai_part(conn, spec, category_caps))

    return _assemble_within_budget(candidates, budget_php, device_type)


def _assemble_within_budget(
    candidate_parts: list[dict[str, Any]],
    budget_php: int,
    device_type: str,
) -> list[dict[str, Any]]:
    candidate_parts.sort(key=lambda item: _part_priority(item, budget_php, device_type))

    output_parts: list[dict[str, Any]] = []
    estimated_total_php = 0.0

    for part in candidate_parts:
        part_price = part["cheapest_price"]
        if part_price is None:
            continue

        if budget_php <= LOW_BUDGET_THRESHOLD and part["category"] == "GPU" and estimated_total_php == 0:
            continue

        if estimated_total_php + part_price > budget_php:
            continue

        estimated_total_php += part_price
        listing = part.get("cheapest_listing") or {}

        output_parts.append(
            {
                "component_id": part["component_id"],
                "category": part["category"],
                "name": part["name"],
                "brand": part["brand"],
                "price": part_price,
                "cheapest_price": part_price,
                "link": listing.get("link"),
                "store": listing.get("store"),
                "listings": part["listings"],
            }
        )

    return output_parts


def _total_for_parts(parts: list[dict[str, Any]]) -> float:
    return sum(float(p["price"]) for p in parts if p.get("price") is not None)


def _apply_part_upgrades(
    conn,
    output_parts: list[dict[str, Any]],
    upgrades: list[dict[str, str]],
    budget_php: int,
    category_caps: dict[str, float],
) -> list[dict[str, Any]]:
    if not upgrades:
        return output_parts

    by_category = {p["category"]: dict(p) for p in output_parts}
    upgrade_map = {normalize_category(u["category"]): u for u in upgrades}

    for category in UPGRADE_PRIORITY:
        upgrade = upgrade_map.get(category)
        if not upgrade:
            continue

        remaining = budget_php - _total_for_parts(list(by_category.values()))
        if remaining <= 0:
            break

        current = by_category.get(category)
        current_price = float(current["price"]) if current and current.get("price") else 0.0
        cap = min(float(category_caps.get(category, remaining)), remaining + current_price)
        target = min(cap * 0.95, remaining + current_price)

        resolved = _resolve_part_with_pricing(
            conn,
            {"category": category, "name": upgrade["name"]},
            max_price=cap,
            target_price=target if target > 0 else None,
        )
        if not resolved or resolved["cheapest_price"] is None:
            continue

        new_price = float(resolved["cheapest_price"])
        if new_price <= current_price:
            continue

        trial_total = _total_for_parts(
            [p for cat, p in by_category.items() if cat != category]
        ) + new_price
        if trial_total > budget_php:
            continue

        by_category[category] = {
            "component_id": resolved["component_id"],
            "category": category,
            "name": resolved["name"],
            "brand": resolved["brand"],
            "price": new_price,
            "cheapest_price": new_price,
            "link": resolved.get("link"),
            "store": resolved.get("store"),
            "listings": resolved["listings"],
        }

    order = ESSENTIAL_ORDER.get("desktop", ESSENTIAL_ORDER["desktop"])
    ordered: list[dict[str, Any]] = []
    seen: set[str] = set()
    for cat in order:
        if cat in by_category:
            ordered.append(by_category[cat])
            seen.add(cat)
    for cat, part in by_category.items():
        if cat not in seen:
            ordered.append(part)
    return ordered


def _replace_category_part(
    output_parts: list[dict[str, Any]],
    new_part: dict[str, Any],
    budget_php: int,
) -> list[dict[str, Any]]:
    category = new_part["category"]
    others = [p for p in output_parts if p["category"] != category]
    trial_total = _total_for_parts(others) + float(new_part.get("price") or 0)
    if trial_total > budget_php:
        return output_parts
    return _merge_parts_by_category([*others, new_part])


def _upgrade_underpriced_categories(
    conn,
    output_parts: list[dict[str, Any]],
    budget_php: int,
    workload: str,
    device_type: str,
    category_caps: dict[str, float],
) -> list[dict[str, Any]]:
    by_category = {p["category"]: p for p in output_parts}

    for category in UPGRADE_PRIORITY:
        cap = category_caps.get(category)
        if not cap:
            continue

        current = by_category.get(category)
        current_price = float(current["price"]) if current and current.get("price") else 0.0
        if current_price >= cap * UNDERPRICE_RATIO:
            continue

        others_total = _total_for_parts([p for c, p in by_category.items() if c != category])
        remaining = budget_php - others_total
        if remaining <= 0:
            break

        target = min(float(cap), remaining)
        min_price = max(target * 0.45, 1000.0)
        exclude = [current["name"]] if current else []

        db_match = _find_db_component_in_price_band(
            conn,
            category,
            min_price=min_price,
            max_price=target,
            target_price=target * 0.9,
            exclude_names=exclude,
        )
        if db_match and float(db_match["price"]) > current_price:
            output_parts = _replace_category_part(
                output_parts, _output_part_from_resolved(db_match), budget_php
            )
            by_category = {p["category"]: p for p in output_parts}
            continue

        locked = [
            {"category": p["category"], "name": p["name"]}
            for c, p in by_category.items()
            if c != category
        ]
        avoid = [{"category": category, "name": current["name"]}] if current else []

        try:
            ai_parts = fetch_ai_category_recommendation(
                budget_php=budget_php,
                workload=workload,
                device_type=device_type,
                category=category,
                category_budget_php=int(target),
                locked_parts=locked,
                avoid_parts=avoid,
            )
        except AIServiceError:
            continue

        if not ai_parts:
            continue

        resolved = _resolve_part_with_pricing(
            conn,
            {"category": category, "name": ai_parts[0]["name"]},
            max_price=target,
            target_price=target * 0.9,
        )
        if not resolved or resolved.get("cheapest_price") is None:
            continue

        new_price = float(resolved["cheapest_price"])
        if new_price <= current_price:
            continue

        output_parts = _replace_category_part(
            output_parts, _output_part_from_resolved(resolved), budget_php
        )
        by_category = {p["category"]: p for p in output_parts}

    return output_parts


def _fill_build_to_budget(
    conn,
    output_parts: list[dict[str, Any]],
    budget_php: int,
    workload: str,
    device_type: str,
    category_caps: dict[str, float],
) -> list[dict[str, Any]]:
    target_total = budget_php * BUDGET_UTILIZATION_MIN

    for _ in range(FILL_MAX_ROUNDS):
        total = _total_for_parts(output_parts)
        if total >= target_total:
            break

        current_specs = [{"category": p["category"], "name": p["name"]} for p in output_parts]
        try:
            upgrades = fetch_budget_upgrade_recommendations(
                budget_php=budget_php,
                workload=workload,
                device_type=device_type,
                current_parts=current_specs,
                current_total=total,
            )
            output_parts = _apply_part_upgrades(
                conn, output_parts, upgrades, budget_php, category_caps
            )
        except AIServiceError:
            pass

        total = _total_for_parts(output_parts)
        if total >= target_total:
            break

        output_parts = _upgrade_underpriced_categories(
            conn, output_parts, budget_php, workload, device_type, category_caps
        )

    return output_parts


def _parts_to_specs(parts: list[dict[str, str]]) -> list[dict[str, str]]:
    return [
        {"category": normalize_category(p["category"]), "name": p["name"]}
        for p in parts
        if p.get("category") and p.get("name")
    ]


def _resolve_locked_parts(
    conn,
    locked_parts: list[dict[str, str]],
    category_caps: dict[str, float],
) -> list[dict[str, Any]]:
    resolved: list[dict[str, Any]] = []
    for spec in locked_parts:
        candidate = _candidate_from_ai_part(conn, spec, category_caps)
        if candidate.get("cheapest_price") is None:
            continue
        listing = candidate.get("cheapest_listing") or {}
        resolved.append(
            {
                "component_id": candidate["component_id"],
                "category": candidate["category"],
                "name": candidate["name"],
                "brand": candidate["brand"],
                "price": candidate["cheapest_price"],
                "cheapest_price": candidate["cheapest_price"],
                "link": listing.get("link"),
                "store": listing.get("store"),
                "listings": candidate.get("listings") or [],
            }
        )
    return resolved


def _merge_parts_by_category(parts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_category: dict[str, dict[str, Any]] = {}
    for part in parts:
        by_category[part["category"]] = part
    order = ESSENTIAL_ORDER.get("desktop", ESSENTIAL_ORDER["desktop"])
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()
    for cat in order:
        if cat in by_category:
            merged.append(by_category[cat])
            seen.add(cat)
    for cat, part in by_category.items():
        if cat not in seen:
            merged.append(part)
    return merged


def _recommendation_result(
    output_parts: list[dict[str, Any]],
    budget_php: int,
    workload: str,
    device_type: str = "desktop",
) -> dict[str, Any]:
    estimated_total_php = _total_for_parts(output_parts)
    utilization = round(estimated_total_php / budget_php, 3) if budget_php > 0 else 0.0
    return {
        "workload": workload,
        "device_type": device_type,
        "budget_php": budget_php,
        "estimated_total_php": round(estimated_total_php, 2),
        "budget_utilization": utilization,
        "parts": output_parts,
        "components": output_parts,
    }


def _regenerate_single_category(
    conn,
    budget_php: int,
    workload: str,
    device_type: str,
    category: str,
    locked_parts: list[dict[str, str]],
    avoid_parts: list[dict[str, str]],
) -> dict[str, Any]:
    category = normalize_category(category)
    category_caps = _category_budget_caps(budget_php, workload, device_type)

    locked_resolved = _resolve_locked_parts(conn, locked_parts, category_caps)
    locked_total = _total_for_parts(locked_resolved)
    remaining = max(0.0, float(budget_php) - locked_total)
    if remaining <= 0:
        raise RecommendationServiceError(
            "No budget left for this part — remove or regenerate a more expensive component first."
        )

    category_cap = min(float(category_caps.get(category, remaining)), remaining)

    try:
        ai_parts = fetch_ai_category_recommendation(
            budget_php=budget_php,
            workload=workload,
            device_type=device_type,
            category=category,
            category_budget_php=int(category_cap),
            locked_parts=locked_parts,
            avoid_parts=avoid_parts,
        )
    except AIServiceError:
        fallback = fallback_recommendations(workload, device_type, budget_php)
        ai_parts = [p for p in fallback if normalize_category(p["category"]) == category][:1]
        if not ai_parts:
            raise RecommendationServiceError(f"Could not suggest an alternative {category}.")

    candidate = _candidate_from_ai_part(conn, ai_parts[0], category_caps)
    if candidate.get("cheapest_price") is None:
        raise RecommendationServiceError(f"Could not price an alternative {category}.")

    price = float(candidate["cheapest_price"])
    if price > remaining:
        raise RecommendationServiceError(
            f"Alternative {category} exceeds remaining budget (₱{int(remaining):,})."
        )

    listing = candidate.get("cheapest_listing") or {}
    new_part = {
        "component_id": candidate["component_id"],
        "category": category,
        "name": candidate["name"],
        "brand": candidate["brand"],
        "price": price,
        "cheapest_price": price,
        "link": listing.get("link"),
        "store": listing.get("store"),
        "listings": candidate.get("listings") or [],
    }

    output_parts = _merge_parts_by_category([*locked_resolved, new_part])
    return _recommendation_result(output_parts, budget_php, workload, device_type)


def generate_recommendation(
    conn,
    budget_php: int,
    workload: str,
    device_type: str,
    *,
    regenerate: bool = False,
    regenerate_category: str | None = None,
    avoid_parts: list[dict[str, str]] | None = None,
    locked_parts: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    avoid_parts = avoid_parts or []
    locked_parts = locked_parts or []

    if regenerate_category:
        return _regenerate_single_category(
            conn,
            budget_php,
            workload,
            device_type,
            regenerate_category,
            locked_parts,
            avoid_parts,
        )

    category_caps = _category_budget_caps(budget_php, workload, device_type)

    try:
        ai_parts = fetch_ai_recommendations(
            budget_php=budget_php,
            workload=workload,
            device_type=device_type,
            avoid_parts=avoid_parts if avoid_parts else None,
            regenerate=regenerate,
        )
    except AIServiceError:
        ai_parts = fallback_recommendations(
            workload=workload, device_type=device_type, budget_php=budget_php
        )

    candidate_parts = [_candidate_from_ai_part(conn, part, category_caps) for part in ai_parts]
    output_parts = _assemble_within_budget(candidate_parts, budget_php, device_type)
    output_parts = _fill_missing_categories(
        conn, output_parts, budget_php, workload, device_type, category_caps
    )
    output_parts = _fill_build_to_budget(
        conn, output_parts, budget_php, workload, device_type, category_caps
    )

    return _recommendation_result(output_parts, budget_php, workload, device_type)
