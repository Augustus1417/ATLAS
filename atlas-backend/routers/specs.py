from fastapi import APIRouter, Depends, HTTPException, status

from database import dict_cursor, get_db_connection
from dependencies import get_current_user
from models.component import ComponentSpecCreateRequest
from utils.responses import ok

router = APIRouter(prefix="/components", tags=["Specs"])


@router.get("/{component_id}/specs")
def get_component_specs(
    component_id: int,
    conn=Depends(get_db_connection),
):
    """Return all specification entries for a single component."""
    cur = dict_cursor(conn)
    cur.execute("SELECT component_id FROM components WHERE component_id = %s", (component_id,))
    if not cur.fetchone():
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
    cur.close()
    return ok(data=specs, message="Component specs fetched successfully")


@router.post("/{component_id}/specs", status_code=status.HTTP_201_CREATED)
def create_component_specs(
    component_id: int,
    payload: ComponentSpecCreateRequest,
    conn=Depends(get_db_connection),
    _current_user=Depends(get_current_user),
):
    """Add one or more specification entries to a component."""
    cur = dict_cursor(conn)
    cur.execute("SELECT component_id FROM components WHERE component_id = %s", (component_id,))
    if not cur.fetchone():
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")

    inserted = []
    for spec in payload.specs:
        cur.execute(
            """
            INSERT INTO component_specs (component_id, spec_name, spec_value, unit)
            VALUES (%s, %s, %s, %s)
            RETURNING spec_id, component_id, spec_name, spec_value, unit
            """,
            (component_id, spec.spec_name, spec.spec_value, spec.unit),
        )
        inserted.append(cur.fetchone())

    conn.commit()
    cur.close()
    return ok(data=inserted, message="Component specs created successfully", status_code=201)
