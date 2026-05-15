from itertools import combinations
from typing import Any

from database import dict_cursor


def check_compatibility(conn, component_ids: list[int]) -> dict[str, Any]:
    conflicts: list[dict[str, Any]] = []
    cur = dict_cursor(conn)

    for component_a_id, component_b_id in combinations(component_ids, 2):
        cur.execute(
            """
            SELECT component_a_id, component_b_id, is_compatible, reason
            FROM compatibility_rules
            WHERE (component_a_id = %s AND component_b_id = %s)
               OR (component_a_id = %s AND component_b_id = %s)
            LIMIT 1
            """,
            (component_a_id, component_b_id, component_b_id, component_a_id),
        )
        row = cur.fetchone()
        if row and row["is_compatible"] is False:
            conflicts.append(
                {
                    "component_a_id": int(row["component_a_id"]),
                    "component_b_id": int(row["component_b_id"]),
                    "reason": row["reason"],
                }
            )

    cur.close()
    return {"compatible": len(conflicts) == 0, "conflicts": conflicts}
