from fastapi import APIRouter, Body, Depends
import logging

from services.scraper_service import (
    scrape_easypc_list,
    scrape_pcx_list,
    scrape_pcworth_list,
    scrape_gameone_list,
    scrape_site_by_url,
    find_best_match,
    parse_brand_category,
    clean_listing_title,
    extract_image_url,
    _is_prebuilt_title,
    infer_component_category,
    should_import_listing,
)
from utils.responses import ok
from dependencies import require_admin
from database import dict_cursor, get_db_connection, db_connection
from fastapi import Depends

router = APIRouter(prefix="/imports", tags=["Imports"])

KNOWN_RETAILER_SOURCES = [
    {"name": "EasyPC", "url": "https://easypc.com.ph/"},
    {"name": "PCX", "url": "https://pcx.com.ph/"},
    {"name": "PCWorth", "url": "https://www.pcworth.com/"},
    {"name": "GameOne", "url": "https://gameone.ph/computer-parts.html"},
    {"name": "Datablitz", "url": "https://ecommerce.datablitz.com.ph/collections/pc-parts-and-components"},
]


def _upsert_scraped_items(cur, items):
    imported = []
    for it in items:
        try:
            title = clean_listing_title(it.get("title") or "")
            if not should_import_listing(title):
                continue

            price = it.get("price")
            image_url = it.get("image_url") or it.get("image")

            cur.execute("SELECT component_id, name FROM components")
            existing = cur.fetchall() or []
            names = [r["name"] for r in existing if r and r.get("name")]
            match = find_best_match(title, names, cutoff=0.85)
            if match:
                matched = next((r for r in existing if r.get("name") == match), None)
                component_id = matched.get("component_id")
                cur.execute(
                    "UPDATE components SET updated_at = CURRENT_TIMESTAMP WHERE component_id = %s",
                    (component_id,),
                )
                if _is_prebuilt_title(title):
                    cur.execute(
                        "UPDATE components SET category = 'Pre-built', updated_at = CURRENT_TIMESTAMP WHERE component_id = %s",
                        (component_id,),
                    )
            else:
                brand, category = parse_brand_category(title)
                category = infer_component_category(title) or category or "Uncategorized"
                cur.execute(
                    """
                    INSERT INTO components (name, brand, category, image_url, form_factor, release_year, is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (title, brand, category, image_url, None, None, True),
                )
                component_id = cur._cursor.lastrowid if hasattr(cur, "_cursor") else None
                if component_id is None:
                    cur.execute("SELECT component_id FROM components WHERE LOWER(name) = LOWER(%s)", (title,))
                    row = cur.fetchone()
                    component_id = row.get("component_id") if row else None

            if component_id is not None and image_url:
                cur.execute(
                    "UPDATE components SET image_url = COALESCE(image_url, %s), updated_at = CURRENT_TIMESTAMP WHERE component_id = %s",
                    (image_url, component_id),
                )

            if price is not None and component_id is not None:
                try:
                    cur.execute(
                        "INSERT INTO pricing_history (component_id, price, currency, source) VALUES (%s, %s, %s, %s)",
                        (component_id, float(price), "PHP", it.get("link") or it.get("store")),
                    )
                except Exception:
                    logging.exception("Failed to insert pricing history for %s", title)

            imported.append({"component_id": component_id, "title": title, "price": price})
        except Exception:
            logging.exception("Import failed for item: %s", it)
    return imported


def sync_known_sources(limit: int = 20):
    """Synchronize all remembered retailer sources into the components database."""
    all_imported = []
    per_source = []

    with db_connection() as conn:
        cur = dict_cursor(conn)
        for source in KNOWN_RETAILER_SOURCES:
            try:
                items = scrape_site_by_url(source["url"], limit=limit)
                imported = _upsert_scraped_items(cur, items)
                conn.commit()
                all_imported.extend(imported)
                per_source.append({"name": source["name"], "url": source["url"], "imported_count": len(imported)})
            except Exception:
                conn.rollback()
                logging.exception("Failed to import known source: %s", source)
                per_source.append({"name": source["name"], "url": source["url"], "imported_count": 0})

        cur.close()

    return {"imported_count": len(all_imported), "sources": per_source, "items": all_imported}


@router.post("/preview/easypc")
def preview_easypc(url: str = Body(..., embed=True), limit: int = Body(10, embed=True), _admin=Depends(require_admin)):
    """Preview products scraped from an EasyPC listing/search URL. Admin only.

    Returns a list of normalized product objects (title, link, price, store).
    """
    items = scrape_easypc_list(url, limit=limit)
    return ok(data={"preview_count": len(items), "items": items}, message="Preview generated")


@router.post("/preview/easypc/public")
def preview_easypc_public(url: str = Body(..., embed=True), limit: int = Body(10, embed=True)):
    """Unprotected preview endpoint for EasyPC (useful for local testing)."""
    items = scrape_easypc_list(url, limit=limit)
    return ok(data={"preview_count": len(items), "items": items}, message="Preview generated")


@router.post("/preview/site/public")
def preview_site_public(url: str = Body(..., embed=True), limit: int = Body(10, embed=True)):
    """Generic public preview that dispatches to a site-specific parser based on URL."""
    items = scrape_site_by_url(url, limit=limit)
    return ok(data={"preview_count": len(items), "items": items}, message="Preview generated")


@router.post("/easypc/import")
def import_easypc(url: str = Body(..., embed=True), limit: int = Body(20, embed=True), conn=Depends(get_db_connection), _admin=Depends(require_admin)):
    """Scrape EasyPC and upsert results into the components and pricing tables. Admin only."""
    items = scrape_site_by_url(url, limit=limit)
    cur = dict_cursor(conn)
    imported = _upsert_scraped_items(cur, items)
    conn.commit()

    cur.close()
    return ok(data={"imported_count": len(imported), "items": imported}, message="Import completed")


@router.post("/import/site")
def import_site(url: str = Body(..., embed=True), limit: int = Body(20, embed=True), conn=Depends(get_db_connection), _admin=Depends(require_admin)):
    """Generic import endpoint that scrapes and upserts based on the provided URL."""
    items = scrape_site_by_url(url, limit=limit)
    cur = dict_cursor(conn)
    imported = _upsert_scraped_items(cur, items)
    conn.commit()

    cur.close()
    return ok(data={"imported_count": len(imported), "items": imported}, message="Import completed")


@router.post("/import/known")
def import_known_sources(conn=Depends(get_db_connection), _admin=Depends(require_admin), limit: int = Body(20, embed=True)):
    """Automatically scrape and import the remembered retailer sources without requiring a URL."""
    result = sync_known_sources(limit=limit)
    return ok(data=result, message="Known sources imported")
