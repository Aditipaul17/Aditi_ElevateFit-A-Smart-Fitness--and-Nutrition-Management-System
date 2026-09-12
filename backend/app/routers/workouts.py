from fastapi import APIRouter, Depends, HTTPException, status

from app.database import workouts_collection
from app.models.schemas import WorkoutOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/workouts", tags=["workouts"])


def _serialize(doc: dict) -> WorkoutOut:
    return WorkoutOut(
        id=str(doc["_id"]),
        title=doc["title"],
        category=doc["category"],
        location=doc["location"],
        duration_minutes=doc["duration_minutes"],
        difficulty=doc["difficulty"],
        calories=doc["calories"],
        trainer=doc["trainer"],
        target_muscles=doc.get("target_muscles", []),
        image_url=doc.get("image_url", ""),
    )


@router.get("", response_model=list[WorkoutOut])
async def list_workouts(category: str | None = None, location: str | None = None):
    query: dict = {}
    if category:
        query["category"] = category
    if location:
        query["location"] = location

    docs = await workouts_collection.find(query).to_list(length=200)
    return [_serialize(doc) for doc in docs]


@router.get("/{workout_id}", response_model=WorkoutOut)
async def get_workout(workout_id: str):
    from bson import ObjectId

    doc = await workouts_collection.find_one({"_id": ObjectId(workout_id)})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")
    return _serialize(doc)


@router.post("/{workout_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def favorite_workout(workout_id: str, current_user: dict = Depends(get_current_user)):
    from app.database import users_collection

    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$addToSet": {"favorite_workout_ids": workout_id}},
    )


@router.post("/{workout_id}/complete", status_code=status.HTTP_201_CREATED)
async def log_completed_workout(workout_id: str, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone
    from bson import ObjectId
    from app.database import workout_logs_collection

    workout = await workouts_collection.find_one({"_id": ObjectId(workout_id)})
    if not workout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout not found")

    doc = {
        "user_id": str(current_user["_id"]),
        "workout_id": workout_id,
        "title": workout["title"],
        "duration_minutes": workout["duration_minutes"],
        "calories": workout["calories"],
        "category": workout["category"],
        "logged_at": datetime.now(timezone.utc),
    }
    result = await workout_logs_collection.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Workout logged successfully"}

