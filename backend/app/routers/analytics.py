from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.database import meals_collection, users_collection, workouts_collection, workout_logs_collection
from app.routers.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


class WeightPoint(BaseModel):
    date: str
    weight: float


class DailyCaloriePoint(BaseModel):
    day: str
    calories: int


class AnalyticsSummaryOut(BaseModel):
    weight_trend: List[WeightPoint]
    weekly_calories: List[DailyCaloriePoint]
    avg_workout_frequency: float
    avg_workout_duration_min: int
    total_workout_minutes: int
    avg_protein_intake_g: float
    goal_progress_pct: int
    total_meals_logged: int
    total_workouts_saved: int


@router.get("/summary", response_model=AnalyticsSummaryOut)
async def get_analytics_summary(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    # 1. Weight Trend (from user's weight_history or current weight)
    weight_history = current_user.get("weight_history", [])
    weight_trend_data: List[WeightPoint] = []

    if isinstance(weight_history, list) and len(weight_history) > 0:
        for entry in weight_history[-6:]:
            if isinstance(entry, dict) and "weight" in entry:
                dt_str = entry.get("date", "Log")
                weight_trend_data.append(
                    WeightPoint(date=dt_str, weight=float(entry["weight"]))
                )
    elif current_user.get("weight"):
        # Current weight point
        weight_trend_data.append(
            WeightPoint(date="Current", weight=float(current_user["weight"]))
        )

    # 2. Daily Calories & Protein for past 7 days
    recent_meals = await meals_collection.find(
        {"user_id": user_id, "logged_at": {"$gte": seven_days_ago}}
    ).to_list(length=300)

    # Group calories by day (Mon..Sun or date)
    days_map: Dict[str, int] = {}
    total_protein = 0.0

    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).strftime("%a")
        days_map[day_date] = 0

    for meal in recent_meals:
        logged_at = meal.get("logged_at")
        if isinstance(logged_at, datetime):
            day_str = logged_at.strftime("%a")
            if day_str in days_map:
                days_map[day_str] += meal.get("calories", 0)
        total_protein += meal.get("protein_g", 0.0)

    weekly_calories_data = [
        DailyCaloriePoint(day=day_name, calories=cal_val)
        for day_name, cal_val in days_map.items()
    ]

    avg_protein = round(total_protein / 7.0, 1) if recent_meals else 0.0

    # 3. Workout stats from workout_logs
    recent_workout_logs = await workout_logs_collection.find(
        {"user_id": user_id, "logged_at": {"$gte": seven_days_ago}}
    ).to_list(length=300)

    favorite_ids = current_user.get("favorite_workout_ids", [])
    total_saved_workouts = len(favorite_ids) if isinstance(favorite_ids, list) else 0

    total_duration = sum(w.get("duration_minutes", 0) for w in recent_workout_logs)
    avg_duration = (
        round(total_duration / len(recent_workout_logs)) if recent_workout_logs else 0
    )

    # Workout frequency (count of workouts logged in the past week + saved workouts influence)
    if recent_workout_logs:
        freq = float(len(recent_workout_logs))
    else:
        freq = round(min(7.0, max(0.0, total_saved_workouts * 1.2)), 1)

    # Calculate goal progress % based on filled bio fields + activity
    bio_fields = [
        "age",
        "gender",
        "height",
        "weight",
        "fitness_goal",
        "activity_level",
        "dietary_preference",
        "workout_experience",
    ]
    filled_count = sum(1 for field in bio_fields if current_user.get(field))
    base_pct = int((filled_count / len(bio_fields)) * 60)
    activity_bonus = min(
        40, (len(recent_meals) * 5) + (len(recent_workout_logs) * 10) + (total_saved_workouts * 5)
    )
    goal_progress = min(100, base_pct + activity_bonus)

    return AnalyticsSummaryOut(
        weight_trend=weight_trend_data,
        weekly_calories=weekly_calories_data,
        avg_workout_frequency=freq,
        avg_workout_duration_min=avg_duration,
        total_workout_minutes=total_duration,
        avg_protein_intake_g=avg_protein,
        goal_progress_pct=goal_progress,
        total_meals_logged=len(recent_meals),
        total_workouts_saved=total_saved_workouts,
    )

