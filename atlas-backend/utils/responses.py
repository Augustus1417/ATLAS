from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi.responses import JSONResponse


def serialize_for_json(obj):
    """Recursively convert DB types to JSON-safe values."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, dict):
        return {key: serialize_for_json(value) for key, value in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [serialize_for_json(item) for item in obj]
    return obj


# Backwards-compatible alias
serialize_datetime = serialize_for_json


def ok(data, message: str = "Success", status_code: int = 200):
    serialized_data = serialize_for_json(data)
    return JSONResponse(status_code=status_code, content={"data": serialized_data, "message": message})
