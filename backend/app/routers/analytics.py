from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field

from app.database import meals_collection, users_collection, workouts_collection, workout_logs_collection, step_logs_collection
from app.services.fitness_report import generate_fitness_report_pdf, generate_ai_factual_summary, build_fallback_summary
from app.routers.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


class WeightPoint(BaseModel):
    date: str
    weight: float


class WeightCheckinPayload(BaseModel):
    weight: float = Field(..., gt=20.0, le=500.0, description="Weight in kg")
    date: Optional[str] = None


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


class WeightCheckinOut(BaseModel):
    message: str
    current_weight: float
    weight_trend: List[WeightPoint]


@router.post("/weight-checkin", response_model=WeightCheckinOut)
async def log_weight_checkin(
    payload: WeightCheckinPayload,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["_id"]
    now = datetime.now(timezone.utc)
    date_label = payload.date.strip() if payload.date and payload.date.strip() else now.strftime("%b %d")
    weight_val = round(float(payload.weight), 1)

    new_entry = {
        "weight": weight_val,
        "date": date_label,
        "timestamp": now.isoformat(),
    }

    # Update current weight and append to history
    await users_collection.update_one(
        {"_id": user_id},
        {
            "$set": {"weight": weight_val, "updated_at": now},
            "$push": {"weight_history": new_entry},
        },
    )

    # Fetch updated history for the trend
    user = await users_collection.find_one({"_id": user_id})
    raw_history = user.get("weight_history", []) if user else []

    trend_points: List[WeightPoint] = []
    if isinstance(raw_history, list) and len(raw_history) > 0:
        for entry in raw_history[-10:]:
            if isinstance(entry, dict) and "weight" in entry:
                trend_points.append(
                    WeightPoint(date=entry.get("date", "Log"), weight=float(entry["weight"]))
                )
    else:
        trend_points.append(WeightPoint(date=date_label, weight=weight_val))

    return WeightCheckinOut(
        message="Weight logged successfully",
        current_weight=weight_val,
        weight_trend=trend_points,
    )



@router.get("/fitness-report/download")
async def download_fitness_report_pdf(current_user: dict = Depends(get_current_user)):
    """
    Generates and downloads a complete fitness & nutrition report PDF
    containing user biometrics, logged meals, exercise logs, daily totals,
    and a strictly factual AI summary of recorded history.
    """
    user_id = str(current_user["_id"])
    now = datetime.now(timezone.utc)

    # 1. Fetch user records from MongoDB
    meals = await meals_collection.find({"user_id": user_id}).sort("logged_at", -1).to_list(length=500)
    workouts = await workout_logs_collection.find({"user_id": user_id}).sort("logged_at", -1).to_list(length=500)
    steps = await step_logs_collection.find({"user_id": user_id}).sort("date", -1).to_list(length=100)

    # 2. Compute statistics for summary context
    daily_meals_set = set()
    total_cals = 0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0
    for m in meals:
        total_cals += int(m.get("calories") or 0)
        total_protein += float(m.get("protein_g") or 0.0)
        total_carbs += float(m.get("carbs_g") or 0.0)
        total_fat += float(m.get("fat_g") or 0.0)
        d_str = str(m.get("logged_at") or m.get("date") or "")[:10]
        if d_str:
            daily_meals_set.add(d_str)

    days_logged = max(1, len(daily_meals_set))
    avg_cals = round(total_cals / days_logged) if meals else 0

    total_workout_mins = sum(int(w.get("duration_minutes") or 0) for w in workouts)
    total_burn = sum(int(w.get("calories") or w.get("calories_burned") or 0) for w in workouts)
    total_steps = sum(int(s.get("steps") or 0) for s in steps)

    nutrition_stats = {
        "total_meals": len(meals),
        "total_calories": total_cals,
        "avg_daily_calories": avg_cals,
        "total_protein": total_protein,
        "total_carbs": total_carbs,
        "total_fat": total_fat,
        "days_logged": len(daily_meals_set),
    }
    workout_stats = {
        "total_workouts": len(workouts),
        "total_minutes": total_workout_mins,
        "total_calories_burned": total_burn,
    }
    step_stats = {
        "total_steps": total_steps,
    }

    # 3. Create context for AI summary
    name_str = current_user.get("name") or "Athlete"
    goal_str = current_user.get("fitness_goal") or "Not set"
    activity_str = current_user.get("activity_level") or "Not set"
    diet_str = current_user.get("dietary_preference") or "Not set"

    context = (
        f"Athlete: {name_str}\n"
        f"Profile: Age {current_user.get('age', 'N/A')}, Gender {current_user.get('gender', 'N/A')}, "
        f"Height {current_user.get('height', 'N/A')} cm, Weight {current_user.get('weight', 'N/A')} kg, "
        f"Goal: {goal_str}, Activity: {activity_str}, Diet: {diet_str}\n"
        f"Nutrition Recorded: {len(meals)} logged meals across {len(daily_meals_set)} days. "
        f"Total calories: {total_cals:,} kcal, Daily average: {avg_cals:,} kcal. "
        f"Macronutrients: {total_protein:.1f}g protein, {total_carbs:.1f}g carbs, {total_fat:.1f}g fat.\n"
        f"Exercise Recorded: {len(workouts)} completed workout sessions. "
        f"Total duration: {total_workout_mins} active minutes, Total calories burned: {total_burn:,} kcal.\n"
        f"Steps Recorded: {total_steps:,} cumulative steps."
    )

    ai_summary = await generate_ai_factual_summary(context)
    if not ai_summary or len(ai_summary.strip()) < 20:
        ai_summary = build_fallback_summary(current_user, nutrition_stats, workout_stats, step_stats)

    # 4. Generate PDF bytes
    pdf_bytes = generate_fitness_report_pdf(
        profile=current_user,
        meals=meals,
        workouts=workouts,
        steps=steps,
        ai_summary=ai_summary,
    )

    safe_name = "".join(c if c.isalnum() else "_" for c in name_str).strip("_") or "Athlete"
    date_tag = now.strftime("%Y%m%d")
    filename = f"ElevateFit_Report_{safe_name}_{date_tag}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
