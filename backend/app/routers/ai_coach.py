from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import sessions_collection
from app.models.schemas import ChatMessageOut, CoachMessageCreate
from app.routers.auth import get_current_user
from app.services.gemini import generate_coaching_response, is_gemini_configured

router = APIRouter(prefix="/ai-coach", tags=["ai-coach"])


@router.get("/history", response_model=List[ChatMessageOut])
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    """Fetch the authenticated user's past AI Coach chat history, sorted chronologically."""
    user_id = str(current_user["_id"])
    cursor = sessions_collection.find({"user_id": user_id}).sort("timestamp", 1)
    messages = await cursor.to_list(length=200)

    return [
        ChatMessageOut(
            id=str(msg["_id"]),
            role=msg["role"],
            message=msg["message"],
            timestamp=msg["timestamp"],
        )
        for msg in messages
    ]


@router.post("/message", response_model=ChatMessageOut)
async def send_message(
    payload: CoachMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message to the AI Coach.
    Stores the user prompt and AI response in MongoDB under user_id,
    and queries Gemini with athlete context.
    """
    user_id = str(current_user["_id"])
    user_prompt = payload.message.strip()

    if not user_prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty",
        )

    # 1. Fetch recent chat history for context
    history_cursor = sessions_collection.find({"user_id": user_id}).sort("timestamp", 1)
    recent_msgs = await history_cursor.to_list(length=20)
    chat_history = [
        {"role": m["role"], "message": m["message"]} for m in recent_msgs
    ]

    # 2. Save user message to MongoDB
    now = datetime.now(timezone.utc)
    user_msg_doc = {
        "user_id": user_id,
        "role": "user",
        "message": user_prompt,
        "timestamp": now,
    }
    insert_res = await sessions_collection.insert_one(user_msg_doc)

    # 3. Call Gemini API service with user profile and chat history
    try:
        reply_text = await generate_coaching_response(
            user_prompt=user_prompt,
            user_profile=current_user,
            chat_history=chat_history,
        )
    except ValueError as val_err:
        # Roll back un-responded prompt
        await sessions_collection.delete_one({"_id": insert_res.inserted_id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(val_err),
        )
    except Exception as exc:
        # Roll back un-responded prompt
        await sessions_collection.delete_one({"_id": insert_res.inserted_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI Coach response. Please try again later.",
        )


    # 4. Save AI response to MongoDB
    ai_msg_now = datetime.now(timezone.utc)
    ai_msg_doc = {
        "user_id": user_id,
        "role": "assistant",
        "message": reply_text,
        "timestamp": ai_msg_now,
    }
    ai_result = await sessions_collection.insert_one(ai_msg_doc)

    return ChatMessageOut(
        id=str(ai_result.inserted_id),
        role="assistant",
        message=reply_text,
        timestamp=ai_msg_now,
    )


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(current_user: dict = Depends(get_current_user)):
    """Clear all stored chat history for the authenticated user."""
    user_id = str(current_user["_id"])
    await sessions_collection.delete_many({"user_id": user_id})
    return None
