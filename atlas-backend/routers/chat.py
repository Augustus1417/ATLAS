from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db_connection
from dependencies import get_optional_user
from models.chat import ChatRequest
from services.chat_service import ChatServiceError, process_chat
from utils.responses import ok

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("")
def send_chat_message(
    payload: ChatRequest,
    conn=Depends(get_db_connection),
    current_user: dict | None = Depends(get_optional_user),
):
    """Multi-turn PC build assistant with part lookups, full builds, and saved-build context."""
    if payload.build_id is not None and current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to discuss a saved build",
        )

    try:
        messages = [{"role": m.role, "content": m.content} for m in payload.messages]
        user_id = int(current_user["user_id"]) if current_user else None
        data = process_chat(
            conn=conn,
            messages=messages,
            build_id=payload.build_id,
            user_id=user_id,
        )
    except ChatServiceError as exc:
        detail = str(exc)
        if "not found" in detail.lower() or "not allowed" in detail.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail) from exc

    return ok(data=data, message="Chat response generated", status_code=status.HTTP_200_OK)
