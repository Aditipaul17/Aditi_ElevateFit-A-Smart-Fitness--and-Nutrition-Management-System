from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.database import meals_collection
from app.models.schemas import MealLogCreate
from app.routers.auth import get_current_user

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.post("/meals", status_code=201)
async def log_meal(payload: MealLogCreate, current_user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["user_id"] = str(current_user["_id"])
    result = await meals_collection.insert_one(doc)
    return {"id": str(result.inserted_id)}


@router.get("/meals/today")
async def today_meals(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)

    docs = await meals_collection.find(
        {"user_id": str(current_user["_id"]), "logged_at": {"$gte": start}}
    ).to_list(length=100)

    totals = {"calories": 0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    for meal in docs:
        totals["calories"] += meal.get("calories", 0)
        totals["protein_g"] += meal.get("protein_g", 0)
        totals["carbs_g"] += meal.get("carbs_g", 0)
        totals["fat_g"] += meal.get("fat_g", 0)

    return {"meals": docs, "totals": totals}
