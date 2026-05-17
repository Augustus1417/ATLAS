"""Helpers for attaching latest component prices from pricing_history."""

import json

from database import dict_cursor, is_sqlite_connection

# Map common DB / AI category strings to builder UI categories
CATEGORY_CANONICAL = {
    "cpu": "CPU",
    "processor": "CPU",
    "gpu": "GPU",
    "graphics card": "GPU",
    "graphics": "GPU",
    "video card": "GPU",
    "motherboard": "Motherboard",
    "mobo": "Motherboard",
    "mainboard": "Motherboard",
    "ram": "RAM",
    "memory": "RAM",
    "storage": "Storage",
    "ssd": "Storage",
    "hdd": "Storage",
    "nvme": "Storage",
    "psu": "PSU",
    "power supply": "PSU",
    "case": "Case",
    "pc case": "Case",
    "chassis": "Case",
    "laptop": "Device",
    "notebook": "Device",
    "mobile": "Device",
    "phone": "Device",
    "tablet": "Device",
    "cooling": "Cooling",
    "cooler": "Cooling",
    "cpu cooler": "Cooling",
    "aio": "Cooling",
}


def parse_pricing_source(source: str | None) -> dict:
    """Extract retailer name and product URL from pricing_history.source JSON."""
    if not source:
        return {"store": None, "link": None}

    try:
        payload = json.loads(source)
        if isinstance(payload, dict):
            return {
                "store": payload.get("store") or payload.get("s"),
                "link": payload.get("link") or payload.get("l"),
            }
    except (json.JSONDecodeError, TypeError):
        pass

    return {"store": str(source), "link": None}


def enrich_pricing_row(row: dict | None) -> dict | None:
    if not row:
        return None
    parsed = parse_pricing_source(row.get("source"))
    return {**row, "store": parsed["store"], "link": parsed["link"]}


def enrich_pricing_rows(rows: list[dict]) -> list[dict]:
    return [enrich_pricing_row(row) for row in rows]


def normalize_category(category: str | None) -> str:
    if not category:
        return "Other"
    key = category.strip().lower()
    return CATEGORY_CANONICAL.get(key, category.strip())


def fetch_latest_prices_map(conn, component_ids: list[int]) -> dict[int, dict]:
    """Return {component_id: {price, currency, source, recorded_at}} for latest entry each."""
    if not component_ids:
        return {}

    unique_ids = sorted({int(cid) for cid in component_ids})
    placeholders = ", ".join(["%s"] * len(unique_ids))

    if is_sqlite_connection(conn):
        query = f"""
            SELECT ph.component_id, ph.price, ph.currency, ph.source, ph.recorded_at
            FROM pricing_history ph
            INNER JOIN (
                SELECT component_id, MAX(recorded_at) AS max_recorded
                FROM pricing_history
                WHERE component_id IN ({placeholders})
                GROUP BY component_id
            ) latest
                ON ph.component_id = latest.component_id
               AND ph.recorded_at = latest.max_recorded
        """
    else:
        query = f"""
            SELECT DISTINCT ON (component_id)
                component_id, price, currency, source, recorded_at
            FROM pricing_history
            WHERE component_id IN ({placeholders})
            ORDER BY component_id, recorded_at DESC
        """

    cur = dict_cursor(conn)
    cur.execute(query, tuple(unique_ids))
    rows = cur.fetchall()
    cur.close()

    return {
        int(row["component_id"]): {
            "price": float(row["price"]) if row["price"] is not None else None,
            "currency": row.get("currency"),
            "source": row.get("source"),
            "recorded_at": row.get("recorded_at"),
        }
        for row in rows
    }


def enrich_build_component_rows(conn, rows: list[dict]) -> list[dict]:
    """Attach component display fields and latest retailer links for build views."""
    if not rows:
        return []

    component_ids = [int(row["component_id"]) for row in rows if row.get("component_id") is not None]
    try:
        price_map = fetch_latest_prices_map(conn, component_ids)
    except Exception:
        price_map = {}

    enriched: list[dict] = []
    for row in rows:
        item = dict(row)
        item["component_name"] = item.get("name") or item.get("component_name")
        item["component_category"] = item.get("category") or item.get("component_category")
        item["component_brand"] = item.get("brand") or item.get("component_brand")

        latest = price_map.get(int(item["component_id"]), {}) if item.get("component_id") else {}
        parsed = parse_pricing_source(latest.get("source"))
        if parsed.get("link"):
            item["link"] = parsed["link"]
        if parsed.get("store"):
            item["store"] = parsed["store"]

        enriched.append(item)
    return enriched


def enrich_components_with_prices(conn, rows: list[dict]) -> list[dict]:
    """Add `price`, `link`, `store`, and `latest_price` from pricing_history."""
    if not rows:
        return []

    component_ids = [
        int(row["component_id"]) for row in rows if row.get("component_id") is not None
    ]
    try:
        price_map = fetch_latest_prices_map(conn, component_ids)
    except Exception:
        price_map = {}

    enriched: list[dict] = []
    for row in rows:
        item = dict(row)
        component_id = item.get("component_id")
        if component_id is not None:
            latest = price_map.get(int(component_id))
            if latest:
                parsed = parse_pricing_source(latest.get("source"))
                if item.get("price") is None and latest.get("price") is not None:
                    item["price"] = latest["price"]
                if parsed.get("link"):
                    item["link"] = parsed["link"]
                if parsed.get("store"):
                    item["store"] = parsed["store"]
                item["latest_price"] = enrich_pricing_row(latest)
        elif item.get("price") is not None and item.get("latest_price") is None:
            item["latest_price"] = {"price": float(item["price"])}
        item["category"] = normalize_category(item.get("category"))
        enriched.append(item)
    return enriched
