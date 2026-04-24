from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import dict_cursor, get_db_connection
from dependencies import get_current_user, require_admin
from models.component import ComponentCreateRequest, ComponentUpdateRequest
from utils.responses import ok

router = APIRouter(prefix="/components", tags=["Components"])


@router.get("")
def list_components(
    category: str | None = Query(default=None),
    brand: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    conn=Depends(get_db_connection),
):
    """List all components with optional category, brand, and active-state filters."""
    query = "SELECT * FROM components WHERE 1=1"
    params = []

    if category is not None:
        query += " AND LOWER(category) = LOWER(%s)"
        params.append(category)
    if brand is not None:
        query += " AND LOWER(brand) = LOWER(%s)"
        params.append(brand)
    if is_active is not None:
        query += " AND is_active = %s"
        params.append(is_active)

    query += " ORDER BY component_id ASC"

    cur = dict_cursor(conn)
    cur.execute(query, tuple(params))
    rows = cur.fetchall()
    cur.close()
    return ok(data=rows, message="Components fetched successfully")


@router.get("/{component_id}")
def get_component_detail(component_id: int, conn=Depends(get_db_connection)):
    """Get component detail including specs and latest known price entry."""
    cur = dict_cursor(conn)
    cur.execute("SELECT * FROM components WHERE component_id = %s", (component_id,))
    component = cur.fetchone()

    if not component:
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")

    cur.execute(
        """
        SELECT spec_id, component_id, spec_name, spec_value, unit
        FROM component_specs
        WHERE component_id = %s
        ORDER BY spec_id ASC
        """,
        (component_id,),
    )
    specs = cur.fetchall()

    cur.execute(
        """
        SELECT price_id, component_id, price, currency, source, recorded_at
        FROM pricing_history
        WHERE component_id = %s
        ORDER BY recorded_at DESC
        LIMIT 1
        """,
        (component_id,),
    )
    latest_price = cur.fetchone()
    cur.close()

    return ok(
        data={"component": component, "specs": specs, "latest_price": latest_price},
        message="Component detail fetched successfully",
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_component(
    payload: ComponentCreateRequest,
    conn=Depends(get_db_connection),
    _admin=Depends(require_admin),
):
    """Create a new component record. This endpoint is restricted to admins."""
    cur = dict_cursor(conn)
    cur.execute(
        """
        INSERT INTO components (name, brand, category, form_factor, release_year, is_active)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        (
            payload.name,
            payload.brand,
            payload.category,
            payload.form_factor,
            payload.release_year,
            True,
        ),
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    return ok(data=row, message="Component created successfully", status_code=201)


@router.put("/{component_id}")
def update_component(
    component_id: int,
    payload: ComponentUpdateRequest,
    conn=Depends(get_db_connection),
    _current_user=Depends(get_current_user),
):
    """Update mutable fields of an existing component."""
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="No fields provided")

    set_parts = []
    values = []
    for key, value in updates.items():
        set_parts.append(f"{key} = %s")
        values.append(value)

    set_parts.append("updated_at = NOW()")
    values.append(component_id)

    cur = dict_cursor(conn)
    cur.execute(
        f"UPDATE components SET {', '.join(set_parts)} WHERE component_id = %s RETURNING *",
        tuple(values),
    )
    row = cur.fetchone()

    if not row:
        conn.rollback()
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")

    conn.commit()
    cur.close()
    return ok(data=row, message="Component updated successfully")


@router.delete("/{component_id}")
def soft_delete_component(
    component_id: int,
    conn=Depends(get_db_connection),
    _current_user=Depends(get_current_user),
):
    """Soft delete a component by setting is_active to false."""
    cur = dict_cursor(conn)
    cur.execute(
        """
        UPDATE components
        SET is_active = FALSE, updated_at = NOW()
        WHERE component_id = %s
        RETURNING *
        """,
        (component_id,),
    )
    row = cur.fetchone()
    if not row:
        conn.rollback()
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")

    conn.commit()
    cur.close()
    return ok(data=row, message="Component soft deleted successfully")
