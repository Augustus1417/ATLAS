from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db_connection
from dependencies import get_current_user
from models.recommendation import RecommendationRequest
from services.recommendation_service import RecommendationServiceError, generate_recommendation
from utils.responses import ok

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.post("")
def create_recommendation(
    payload: RecommendationRequest,
    conn=Depends(get_db_connection),
    _current_user=Depends(get_current_user),
):
    """Generate recommendations via AI part selection and live PH pricing with 24-hour cache checks."""
    try:
        data = generate_recommendation(
            conn=conn,
            budget_php=payload.budget_php,
            workload=payload.workload,
            device_type=payload.device_type,
        )
    except RecommendationServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return ok(data=data, message="Recommendation generated successfully", status_code=status.HTTP_200_OK)
