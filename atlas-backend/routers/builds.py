from fastapi import APIRouter, Depends, HTTPException, status

from database import dict_cursor, get_db_connection
from dependencies import get_current_user
from models.build import BuildCreateRequest, BuildUpdateRequest
from utils.responses import ok

router = APIRouter(prefix="/builds", tags=["Builds"])


def _compute_total_price(components: list[dict]) -> float:
    total = 0.0
    for component in components:
        total += float(component["price_at_save"]) * int(component["quantity"])
    return round(total, 2)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_build(
    payload: BuildCreateRequest,
    conn=Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    """Create a build and persist selected components with price_at_save."""
    components = [item.model_dump() for item in payload.components]
    total_price = _compute_total_price(components)

    cur = dict_cursor(conn)
    cur.execute(
        """
        INSERT INTO builds (user_id, build_name, intended_workload, total_price, is_public)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING *
        """,
        (current_user["user_id"], payload.build_name, payload.intended_workload, total_price, payload.is_public),
    )
    build = cur.fetchone()

    inserted_components = []
    for component in components:
        cur.execute(
            """
            INSERT INTO build_components (build_id, component_id, quantity, price_at_save)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (build["build_id"], component["component_id"], component["quantity"], component["price_at_save"]),
        )
        inserted_components.append(cur.fetchone())

    conn.commit()
    cur.close()

    build["components"] = inserted_components
    return ok(data=build, message="Build created successfully", status_code=201)


@router.get("/{build_id}")
def get_build(
    build_id: int,
    conn=Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    """Return full details of a build and its selected components."""
    cur = dict_cursor(conn)
    cur.execute("SELECT * FROM builds WHERE build_id = %s", (build_id,))
    build = cur.fetchone()

    if not build:
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Build not found")

    if (not build["is_public"]) and build["user_id"] != current_user["user_id"]:
        cur.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not allowed to access this build")

    cur.execute(
        """
        SELECT bc.*, c.name, c.brand, c.category
        FROM build_components bc
        JOIN components c ON c.component_id = bc.component_id
        WHERE bc.build_id = %s
        ORDER BY bc.build_component_id ASC
        """,
        (build_id,),
    )
    components = cur.fetchall()
    cur.close()

    build["components"] = components
    return ok(data=build, message="Build detail fetched successfully")


@router.put("/{build_id}")
def update_build(
    build_id: int,
    payload: BuildUpdateRequest,
    conn=Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    """Update build metadata and optionally replace the selected component list."""
    cur = dict_cursor(conn)
    cur.execute("SELECT * FROM builds WHERE build_id = %s", (build_id,))
    existing = cur.fetchone()

    if not existing:
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Build not found")
    if existing["user_id"] != current_user["user_id"]:
        cur.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not allowed to edit this build")

    updates = payload.model_dump(exclude_unset=True)
    components_input = updates.pop("components", None)

    if components_input is not None:
        component_dicts = [component.model_dump() for component in components_input]
        total_price = _compute_total_price(component_dicts)
        updates["total_price"] = total_price

        cur.execute("DELETE FROM build_components WHERE build_id = %s", (build_id,))
        for component in component_dicts:
            cur.execute(
                """
                INSERT INTO build_components (build_id, component_id, quantity, price_at_save)
                VALUES (%s, %s, %s, %s)
                """,
                (build_id, component["component_id"], component["quantity"], component["price_at_save"]),
            )

    if updates:
        set_parts = []
        values = []
        for key, value in updates.items():
            set_parts.append(f"{key} = %s")
            values.append(value)

        set_parts.append("updated_at = NOW()")
        values.append(build_id)

        cur.execute(
            f"UPDATE builds SET {', '.join(set_parts)} WHERE build_id = %s RETURNING *",
            tuple(values),
        )
    else:
        cur.execute("SELECT * FROM builds WHERE build_id = %s", (build_id,))

    updated = cur.fetchone()
    conn.commit()

    cur.execute("SELECT * FROM build_components WHERE build_id = %s ORDER BY build_component_id ASC", (build_id,))
    components = cur.fetchall()
    cur.close()

    updated["components"] = components
    return ok(data=updated, message="Build updated successfully")


@router.delete("/{build_id}")
def delete_build(
    build_id: int,
    conn=Depends(get_db_connection),
    current_user=Depends(get_current_user),
):
    """Permanently delete a build and its component mappings."""
    cur = dict_cursor(conn)
    cur.execute("SELECT user_id FROM builds WHERE build_id = %s", (build_id,))
    existing = cur.fetchone()

    if not existing:
        cur.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Build not found")
    if existing["user_id"] != current_user["user_id"]:
        cur.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not allowed to delete this build")

    cur.execute("DELETE FROM build_components WHERE build_id = %s", (build_id,))
    cur.execute("DELETE FROM builds WHERE build_id = %s", (build_id,))
    conn.commit()
    cur.close()

    return ok(data={"build_id": build_id}, message="Build deleted successfully")
