"""
Bicep Curl Counter Router for ElevateFit.
Connects real-time pose tracking, repetition counting, session summaries,
and database persistence with MongoDB and Gamification.
"""

from datetime import datetime, timezone
import base64
import numpy as np
import cv2
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent.parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from app.database import workout_logs_collection
from app.routers.auth import get_current_user
from app.routers.gamification import process_user_activity
from ml.pose_detection.pose_estimator import calculate_angle, DOWN_THRESHOLD, UP_THRESHOLD

router = APIRouter(prefix="/bicep-curls", tags=["bicep-curls"])


class RepLogItem(BaseModel):
    rep: int
    timestamp: str
    angle: float | None = None
    arm: str | None = "left"


class BicepCurlSessionCreate(BaseModel):
    title: str = "AI Bicep Curl Session"
    reps: int = Field(ge=0, description="Total repetitions completed")
    sets: int = Field(default=1, ge=1, description="Number of sets completed")
    duration_seconds: int = Field(default=0, ge=0)
    calories: int = Field(default=0, ge=0)
    arm: str = "left"
    form_accuracy: float = Field(default=100.0, ge=0.0, le=100.0)
    avg_angle_min: float | None = None
    avg_angle_max: float | None = None
    rep_logs: list[RepLogItem] = []
    notes: str | None = None


class FrameAnalyzeRequest(BaseModel):
    image_base64: str
    arm: str = "auto"
    current_reps: int = 0
    current_stage: str | None = None


# Persistent in-memory detector instance for frame processing endpoint
_server_detector = None


def get_detector():
    global _server_detector
    if _server_detector is None:
        try:
            from ml.pose_detection.pose_estimator import BicepCurlCounter
            _server_detector = BicepCurlCounter(arm="auto")
        except Exception as e:
            print(f"Warning: Could not initialize server BicepCurlCounter: {e}")
            _server_detector = None
    return _server_detector


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
async def log_bicep_curl_session(
    payload: BicepCurlSessionCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Saves a completed AI Bicep Curl session into the MongoDB workout_logs collection.
    Automatically increments user XP and checks badges in the Gamification engine.
    """
    user_id_str = str(current_user["_id"])
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    duration_minutes = max(1, round(payload.duration_seconds / 60))
    # Estimate calories if not provided: ~0.4 kcal per curl + 0.05 kcal per second active
    calories = payload.calories
    if calories <= 0 and payload.reps > 0:
        calories = int(round(payload.reps * 0.45 + (payload.duration_seconds * 0.05)))

    doc = {
        "user_id": user_id_str,
        "workout_id": "ai_bicep_curls",
        "title": payload.title,
        "category": "Strength",
        "exercise": "Bicep Curls",
        "reps": payload.reps,
        "sets": payload.sets,
        "duration_seconds": payload.duration_seconds,
        "duration_minutes": duration_minutes,
        "calories": calories,
        "arm": payload.arm,
        "form_accuracy": payload.form_accuracy,
        "avg_angle_min": payload.avg_angle_min,
        "avg_angle_max": payload.avg_angle_max,
        "rep_logs": [item.model_dump() for item in payload.rep_logs],
        "notes": payload.notes,
        "source": "ai_bicep_counter",
        "logged_at": now,
        "date": today_str,
    }

    result = await workout_logs_collection.insert_one(doc)

    # Award gamification XP for completing workout
    gamification_res = None
    try:
        gamification_res = await process_user_activity(user_id_str, "workout")
    except Exception as e:
        print(f"Gamification update note: {e}")

    return {
        "id": str(result.inserted_id),
        "message": "AI Bicep Curl workout session logged successfully",
        "session": {
            "title": payload.title,
            "reps": payload.reps,
            "sets": payload.sets,
            "duration_seconds": payload.duration_seconds,
            "duration_minutes": duration_minutes,
            "calories": calories,
            "arm": payload.arm,
            "form_accuracy": payload.form_accuracy,
            "logged_at": now.isoformat(),
            "date": today_str,
        },
        "gamification": gamification_res.model_dump() if gamification_res else None,
    }


@router.get("/sessions")
async def get_bicep_curl_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetches past AI Bicep Curl workout sessions for the logged-in user.
    """
    user_id_str = str(current_user["_id"])
    query = {
        "user_id": user_id_str,
        "$or": [
            {"source": "ai_bicep_counter"},
            {"workout_id": "ai_bicep_curls"},
            {"exercise": "Bicep Curls"},
        ],
    }

    logs = (
        await workout_logs_collection.find(query)
        .sort("logged_at", -1)
        .to_list(length=limit)
    )

    history = []
    for log in logs:
        logged_at = log.get("logged_at")
        date_str = (
            logged_at.strftime("%Y-%m-%d %H:%M")
            if hasattr(logged_at, "strftime")
            else str(logged_at or "")
        )
        history.append({
            "id": str(log["_id"]),
            "title": log.get("title", "AI Bicep Curl Session"),
            "reps": log.get("reps", 0),
            "sets": log.get("sets", 1),
            "duration_seconds": log.get("duration_seconds", 0),
            "duration_minutes": log.get("duration_minutes", 0),
            "calories": log.get("calories", 0),
            "arm": log.get("arm", "left"),
            "form_accuracy": log.get("form_accuracy", 100),
            "rep_logs": log.get("rep_logs", []),
            "date": date_str,
        })

    return history


@router.get("/stats")
async def get_bicep_curl_stats(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns aggregated stats for AI Bicep Curls (total reps, sessions, calories, best set).
    """
    user_id_str = str(current_user["_id"])
    query = {
        "user_id": user_id_str,
        "$or": [
            {"source": "ai_bicep_counter"},
            {"workout_id": "ai_bicep_curls"},
            {"exercise": "Bicep Curls"},
        ],
    }

    logs = await workout_logs_collection.find(query).to_list(length=500)

    total_sessions = len(logs)
    total_reps = sum(log.get("reps", 0) for log in logs)
    total_calories = sum(log.get("calories", 0) for log in logs)
    total_seconds = sum(log.get("duration_seconds", 0) for log in logs)
    best_session_reps = max((log.get("reps", 0) for log in logs), default=0)

    return {
        "total_sessions": total_sessions,
        "total_reps": total_reps,
        "total_calories": total_calories,
        "total_duration_minutes": round(total_seconds / 60, 1),
        "best_session_reps": best_session_reps,
    }


@router.post("/analyze-frame")
async def analyze_frame(
    payload: FrameAnalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Processes a single frame uploaded by client through the server-side pose detection pipeline.
    Reuses the MediaPipe algorithm and angle calculation.
    """
    try:
        # Strip data URL prefix if present
        data_str = payload.image_base64
        if "," in data_str:
            data_str = data_str.split(",", 1)[1]
        img_bytes = base64.b64decode(data_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        detector = get_detector()
        if not detector:
            raise HTTPException(
                status_code=503,
                detail="Server pose detector is currently unavailable",
            )

        # Sync detector state
        detector.arm = payload.arm.lower()
        detector.counter = payload.current_reps
        detector.stage = payload.current_stage

        annotated_frame, metrics = detector.process_frame(frame)

        return {
            "success": True,
            "metrics": {
                "reps": metrics["reps"],
                "stage": metrics["stage"],
                "angle": metrics["angle"],
                "arm": metrics["arm"],
                "person_detected": metrics["person_detected"],
                "rep_just_completed": metrics["rep_just_completed"],
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Frame analysis error: {str(exc)}")
