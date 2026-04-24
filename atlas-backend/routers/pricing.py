from fastapi import APIRouter, Depends, HTTPException, status

from database import dict_cursor, get_db_connection
from dependencies import get_current_user
from models.component import ComponentPricingCreateRequest
from utils.responses import ok

router = APIRouter(prefix="/components", tags=["Pricing"])


@router.get("/{component_id}/pricing")
def get_component_pricing_history(component_id: int, conn=Depends(get_db_connection)):
    """Return complete pricing history for the specified component."""
    cur = dict_cursor(conn)
    cur.execute("SELECT component_id FROM components WHERE component_id = %s", (component_id,))
    if not cur.fetchone():
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")

    cur.execute(
        """
        SELECT price_id, component_id, price, currency, source, recorded_at
        FROM pricing_history
        WHERE component_id = %s
        ORDER BY recorded_at DESC
        """,
        (component_id,),
    )
    rows = cur.fetchall()
    cur.close()
    return ok(data=rows, message="Pricing history fetched successfully")


@router.post("/{component_id}/pricing", status_code=status.HTTP_201_CREATED)
def create_pricing_entry(
    component_id: int,
    payload: ComponentPricingCreateRequest,
    conn=Depends(get_db_connection),
    _current_user=Depends(get_current_user),
):
    """Manually insert a pricing record for a component."""
    cur = dict_cursor(conn)
    cur.execute("SELECT component_id FROM components WHERE component_id = %s", (component_id,))
    if not cur.fetchone():
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")

    cur.execute(
        """
        INSERT INTO pricing_history (component_id, price, currency, source)
        VALUES (%s, %s, %s, %s)
        RETURNING price_id, component_id, price, currency, source, recorded_at
        """,
        (component_id, payload.price, payload.currency, payload.source),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    return ok(data=row, message="Pricing record created successfully", status_code=201)
