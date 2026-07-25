from fastapi import APIRouter, Depends

from app.models.schemas import CoachMessageCreate
from app.routers.auth import get_current_user

router = APIRouter(prefix="/ai-coach", tags=["ai-coach"])


@router.post("/message")
async def send_message(payload: CoachMessageCreate, current_user: dict = Depends(get_current_user)):
    """
    Placeholder endpoint. Wire this up to the coaching engine in
    `ml/coaching_engine` (or an external LLM provider) to generate
    a real response based on the athlete's profile and recent sessions.
    """
    return {
        "session_id": payload.session_id or "new-session",
        "reply": (
            "This is a placeholder response. Connect this endpoint to the "
            "coaching engine in ml/coaching_engine to generate real programming."
        ),
    }
