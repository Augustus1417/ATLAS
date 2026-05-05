from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db_connection
from dependencies import get_current_user
from models.chat import ChatRequest, ChatMessage
from services.chatbot_service import ChatbotServiceError, process_chat_message
from utils.responses import ok

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("")
def chat(
    payload: ChatRequest,
    conn=Depends(get_db_connection),
    _current_user=Depends(get_current_user),
):
    """
    Send a message to the PC building chatbot.
    
    The bot can answer PC building questions and recommend parts from the database or via web search.
    Conversation history is supported for context-aware responses.
    """
    try:
        # Convert ChatMessage objects to dicts for the service
        history = [{"role": msg.role, "content": msg.content} for msg in payload.conversation_history]
        
        result = process_chat_message(
            conn=conn,
            message=payload.message,
            conversation_history=history,
        )
    except ChatbotServiceError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return ok(
        data=result,
        message="Chat response generated successfully",
        status_code=status.HTTP_200_OK,
    )
