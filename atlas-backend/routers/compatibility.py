from fastapi import APIRouter, Depends

from database import get_db_connection
from dependencies import get_current_user
from models.compatibility import CompatibilityRequest
from services.compatibility_service import check_compatibility
from utils.responses import ok

router = APIRouter(prefix="/compatibility", tags=["Compatibility"])


@router.post("/check")
def check_components_compatibility(
    payload: CompatibilityRequest,
    conn=Depends(get_db_connection),
    _current_user=Depends(get_current_user),
):
    """Check submitted component pairs against bidirectional compatibility rules."""
    result = check_compatibility(conn, payload.component_ids)
    return ok(data=result, message="Compatibility check completed")
