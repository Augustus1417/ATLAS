from fastapi import APIRouter, Depends, HTTPException, status, Request
import json
import logging

from database import get_db_connection
from models.recommendation import RecommendationRequest
from services.recommendation_service import RecommendationServiceError, generate_recommendation
from utils.responses import ok

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

logger = logging.getLogger(__name__)


@router.post("")
async def create_recommendation(
    request: Request,
    conn=Depends(get_db_connection),
):
    """Generate recommendations via AI part selection and live PH pricing with 24-hour cache checks."""
    try:
        body = await request.json()
        logger.info(f"Parsed request body: {body}")
        payload = RecommendationRequest(**body)
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON in request body") from e
    except Exception as e:
        logger.error(f"Error parsing request: {e}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    
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
