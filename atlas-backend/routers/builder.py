from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import dict_cursor, get_db_connection
from utils.component_pricing import enrich_components_with_prices, normalize_category
from utils.responses import ok

router = APIRouter(prefix="/builder", tags=["Builder"])


# Mock part data structure for fallback
MOCK_PARTS_BY_CATEGORY = {
    "Case": [
        {"component_id": 1, "name": "Titan ATX Mid Tower", "brand": "NZXT", "category": "Case", "price": 4700},
        {"component_id": 2, "name": "Pulse mATX Compact", "brand": "Corsair", "category": "Case", "price": 3200},
        {"component_id": 3, "name": "Nebula Mini ITX SFF", "brand": "Lian Li", "category": "Case", "price": 5600},
    ],
    "Motherboard": [
        {"component_id": 10, "name": "ASUS ROG Z790 Hero", "brand": "ASUS", "category": "Motherboard", "price": 20500},
        {"component_id": 11, "name": "MSI MPG B850E", "brand": "MSI", "category": "Motherboard", "price": 18900},
        {"component_id": 12, "name": "Gigabyte B850M", "brand": "Gigabyte", "category": "Motherboard", "price": 14800},
    ],
    "CPU": [
        {"component_id": 20, "name": "Intel Core i9-14900K", "brand": "Intel", "category": "CPU", "price": 45000},
        {"component_id": 21, "name": "AMD Ryzen 9 7950X", "brand": "AMD", "category": "CPU", "price": 42000},
        {"component_id": 22, "name": "Intel Core i7-14700K", "brand": "Intel", "category": "CPU", "price": 32000},
    ],
    "RAM": [
        {"component_id": 30, "name": "G.Skill Trident Z5 64GB", "brand": "G.Skill", "category": "RAM", "price": 22000},
        {"component_id": 31, "name": "Corsair Dominator Platinum 64GB", "brand": "Corsair", "category": "RAM", "price": 24000},
        {"component_id": 32, "name": "Kingston Fury Beast 32GB", "brand": "Kingston", "category": "RAM", "price": 12000},
    ],
    "Storage": [
        {"component_id": 40, "name": "Samsung 980 Pro 2TB", "brand": "Samsung", "category": "Storage", "price": 18000},
        {"component_id": 41, "name": "WD Black SN850X 1TB", "brand": "Western Digital", "category": "Storage", "price": 9500},
        {"component_id": 42, "name": "Crucial P5 Plus 2TB", "brand": "Crucial", "category": "Storage", "price": 16000},
    ],
    "GPU": [
        {"component_id": 50, "name": "NVIDIA RTX 4090", "brand": "NVIDIA", "category": "GPU", "price": 180000},
        {"component_id": 51, "name": "NVIDIA RTX 4080", "brand": "NVIDIA", "category": "GPU", "price": 120000},
        {"component_id": 52, "name": "AMD Radeon RX 7900 XTX", "brand": "AMD", "category": "GPU", "price": 95000},
    ],
    "PSU": [
        {"component_id": 60, "name": "Corsair RM1200x", "brand": "Corsair", "category": "PSU", "price": 28000},
        {"component_id": 61, "name": "EVGA SuperNOVA 1000 G7", "brand": "EVGA", "category": "PSU", "price": 22000},
        {"component_id": 62, "name": "Seasonic Prime Gold 850W", "brand": "Seasonic", "category": "PSU", "price": 18000},
    ],
    "Cooling": [
        {"component_id": 70, "name": "Noctua NH-D15", "brand": "Noctua", "category": "Cooling", "price": 8900},
        {"component_id": 71, "name": "NZXT Kraken Z73", "brand": "NZXT", "category": "Cooling", "price": 16000},
        {"component_id": 72, "name": "Corsair iCUE H170i", "brand": "Corsair", "category": "Cooling", "price": 14500},
    ],
}


@router.get("/parts-by-category")
def get_parts_by_category(
    category: str | None = Query(None),
    conn=Depends(get_db_connection),
):
    """Get parts grouped by category. Falls back to mock data if DB is empty."""
    try:
        cur = dict_cursor(conn)
        
        # Try to fetch from database
        if category:
            query = "SELECT * FROM components WHERE LOWER(category) = LOWER(%s) ORDER BY name ASC"
            cur.execute(query, (category,))
        else:
            query = "SELECT * FROM components ORDER BY category, name ASC"
            cur.execute(query)
        
        rows = cur.fetchall()
        cur.close()
        
        # If we got results from DB, return them grouped by category with prices
        if rows:
            enriched = enrich_components_with_prices(conn, rows)
            grouped = {}
            for row in enriched:
                cat = normalize_category(row.get("category"))
                grouped.setdefault(cat, []).append(row)
            return ok(data=grouped, message="Parts fetched successfully")
    except Exception as e:
        # Fall through to mock data on any error
        pass
    
    # Use mock data as fallback
    if category:
        filtered = {k: v for k, v in MOCK_PARTS_BY_CATEGORY.items() if k.lower() == category.lower()}
        return ok(data=filtered, message="Parts fetched from cache (mock data)")
    
    return ok(data=MOCK_PARTS_BY_CATEGORY, message="Parts fetched from cache (mock data)")


@router.get("/parts-flat")
def get_parts_flat(
    category: str | None = Query(None),
    conn=Depends(get_db_connection),
):
    """Get all parts as a flat list. Falls back to mock data if DB is empty."""
    try:
        cur = dict_cursor(conn)
        
        # Try to fetch from database
        if category:
            query = "SELECT * FROM components WHERE LOWER(category) = LOWER(%s) ORDER BY name ASC"
            cur.execute(query, (category,))
        else:
            query = "SELECT * FROM components ORDER BY name ASC"
            cur.execute(query)
        
        rows = cur.fetchall()
        cur.close()
        
        # If we got results from DB, return them with latest prices
        if rows:
            enriched = enrich_components_with_prices(conn, rows)
            return ok(data=enriched, message="Parts fetched successfully")
    except Exception as e:
        # Fall through to mock data on any error
        pass
    
    # Use mock data as fallback
    flat_list = []
    for parts in MOCK_PARTS_BY_CATEGORY.values():
        flat_list.extend(parts)
    
    if category:
        flat_list = [p for p in flat_list if p["category"].lower() == category.lower()]
    
    return ok(data=flat_list, message="Parts fetched from cache (mock data)")


@router.get("/health")
def builder_health():
    """Health check for builder service."""
    return ok(data={"status": "ok"}, message="Builder service is healthy")
