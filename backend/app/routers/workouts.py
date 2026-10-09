from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.database import workouts_collection
from app.models.schemas import WorkoutOut, YouTubeRecommendationsResponse, YouTubeWorkoutVideo
from app.routers.auth import get_current_user
from app.services.gemini import generate_youtube_match_reasons, generate_youtube_search_query
from app.services.youtube import fetch_youtube_workout_videos

router = APIRouter(prefix="/workouts", tags=["workouts"])



def _serialize(doc: dict, reason: str | None = None, score: float | None = None) -> WorkoutOut:
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
        recommendation_reason=reason,
        match_score=score,
    )


def calculate_recommendation_score(workout: dict, user_profile: dict, completed_workout_ids: set[str]) -> tuple[float, str]:
    score = 0.0
    reasons = []

    exp = (user_profile.get("workout_experience") or "Beginner").capitalize()
    difficulty = workout.get("difficulty", "Beginner")

    # 1. Experience level constraint
    if exp == "Beginner":
        if difficulty == "Beginner":
            score += 35
            reasons.append("Beginner friendly")
        elif difficulty == "Intermediate":
            score -= 10
        elif difficulty in ["Advanced", "Elite"]:
            score -= 100
    elif exp == "Intermediate":
        if difficulty in ["Beginner", "Intermediate"]:
            score += 30
            reasons.append("Matches your experience level")
        elif difficulty == "Advanced":
            score += 10
        elif difficulty == "Elite":
            score -= 40
    elif exp in ["Advanced", "Elite"]:
        if difficulty in ["Intermediate", "Advanced", "Elite"]:
            score += 35
            reasons.append("Matches your experience level")
        else:
            score += 10

    # 2. Fitness Goal
    goal = (user_profile.get("fitness_goal") or "Maintain fitness").lower()
    cat = workout.get("category", "")
    
    if "lose weight" in goal or "endurance" in goal:
        if cat in ["Cardio", "HIIT"]:
            score += 30
            reasons.append("Matches your fitness goal")
        elif cat == "Strength":
            score += 15
        elif cat in ["Yoga", "Stretching"]:
            score += 10
    elif "muscle" in goal:
        if cat == "Strength":
            score += 35
            reasons.append("Matches your fitness goal")
        elif cat == "HIIT":
            score += 15
        elif cat in ["Cardio", "Yoga", "Stretching"]:
            score += 5
    elif "flexibility" in goal:
        if cat in ["Yoga", "Stretching"]:
            score += 35
            reasons.append("Prioritizes flexibility & mobility")
        elif cat == "Strength":
            score += 10
    elif "maintain" in goal:
        if cat in ["Strength", "Cardio", "Yoga", "Stretching"]:
            score += 25
            reasons.append("Balanced for fitness maintenance")
        elif cat == "HIIT" and difficulty == "Beginner":
            score += 20
            reasons.append("Suitable for active balance")
    else:
        score += 20
        reasons.append("Complements your fitness goal")

    # 3. Preferred Workout Type
    pref_type = (user_profile.get("preferred_workout_type") or "").lower().strip()
    if pref_type and pref_type in cat.lower():
        score += 25
        reasons.append(f"Matches preferred {cat}")

    # 4. Available Workout Time
    time_pref = user_profile.get("available_workout_time") or ""
    duration = workout.get("duration_minutes", 30)
    if "15-30" in time_pref:
        if duration <= 30:
            score += 20
            reasons.append("Fits 30-min available time")
        else:
            score -= 20
    elif "30-45" in time_pref:
        if 20 <= duration <= 45:
            score += 20
            reasons.append("Fits 45-min available time")
    elif "45-60" in time_pref:
        if 35 <= duration <= 60:
            score += 20
            reasons.append("Fits 60-min session length")

    # 5. Equipment & Location compatibility
    user_eq = user_profile.get("equipment") or []
    loc = workout.get("location", "Home")
    if isinstance(user_eq, list) and ("No equipment" in user_eq or len(user_eq) == 0):
        if loc == "Home":
            score += 20
            reasons.append("Suitable for home setup")
        elif loc == "Gym":
            score -= 20

    # 6. Fitness Limitations (Safety Filters)
    limitations = user_profile.get("fitness_limitations") or []
    if isinstance(limitations, str):
        limitations = [limitations]
    
    for limit in limitations:
        limit_str = limit.lower()
        if "joint" in limit_str or "knee" in limit_str or "low impact" in limit_str:
            if cat in ["Yoga", "Stretching"] or (loc == "Home" and difficulty == "Beginner" and cat != "HIIT"):
                score += 35
                reasons.append("Joint-friendly & low impact")
            elif cat == "HIIT" or difficulty in ["Advanced", "Elite"]:
                score -= 50
        elif "back" in limit_str:
            if cat in ["Yoga", "Stretching"]:
                score += 30
                reasons.append("Supports back mobility")
            elif difficulty in ["Advanced", "Elite"]:
                score -= 30
        elif "asthma" in limit_str or "breathing" in limit_str:
            if cat == "HIIT" and difficulty != "Beginner":
                score -= 30

    # 7. Activity Level
    act = (user_profile.get("activity_level") or "Lightly active").lower()
    if "sedentary" in act:
        if cat in ["Yoga", "Stretching"] or (difficulty == "Beginner" and duration <= 30):
            score += 25
            reasons.append("Gentle pace for your activity level")
        elif cat == "HIIT" or difficulty in ["Advanced", "Elite"]:
            score -= 30
    elif "lightly" in act:
        if difficulty == "Beginner" or (difficulty == "Intermediate" and duration <= 35):
            score += 20
            reasons.append("Suitable for your activity level")
        elif difficulty in ["Advanced", "Elite"]:
            score -= 20
    elif "moderately" in act:
        if difficulty in ["Beginner", "Intermediate"]:
            score += 20
            reasons.append("Matches your active schedule")
    elif "very" in act or "extremely" in act:
        if difficulty in ["Intermediate", "Advanced", "Elite"]:
            score += 20
            reasons.append("Matches your high activity level")

    # 8. Age Safety Adjustment
    age = user_profile.get("age")
    if age and isinstance(age, (int, float)):
        if age >= 50:
            if cat in ["Yoga", "Stretching"] or (difficulty == "Beginner" and cat != "HIIT"):
                score += 20
                reasons.append("Low impact & joint friendly")
            elif difficulty in ["Advanced", "Elite"] or cat == "HIIT":
                score -= 35

    # 9. Height / Weight (BMI Estimation)
    h = user_profile.get("height")
    w = user_profile.get("weight")
    if h and w and h > 0 and w > 0:
        bmi = w / ((h / 100.0) ** 2)
        if bmi >= 30:
            if cat in ["Yoga", "Stretching", "Cardio"] and difficulty == "Beginner":
                score += 15
                if "Low impact" not in " ".join(reasons):
                    reasons.append("Low impact option")
            elif cat == "HIIT" and difficulty != "Beginner":
                score -= 15

    # 10. Completed Workouts Deprioritization
    workout_id_str = str(workout.get("_id", workout.get("id", "")))
    if workout_id_str in completed_workout_ids:
        score -= 25

    unique_reasons = []
    for r in reasons:
        if r not in unique_reasons:
            unique_reasons.append(r)

    reason_str = " • ".join(unique_reasons[:2]) if unique_reasons else "Recommended for you"
    return score, reason_str


@router.get("", response_model=list[WorkoutOut])
async def list_workouts(category: str | None = None, location: str | None = None):
    query: dict = {}
    if category:
        query["category"] = category
    if location:
        query["location"] = location

    docs = await workouts_collection.find(query).to_list(length=200)
    return [_serialize(doc) for doc in docs]


@router.get("/recommendations", response_model=list[WorkoutOut])
async def get_workout_recommendations(current_user: dict = Depends(get_current_user)):
    from app.database import workout_logs_collection

    user_id_str = str(current_user["_id"])
    logs = await workout_logs_collection.find({"user_id": user_id_str}).to_list(length=500)
    completed_workout_ids = {log["workout_id"] for log in logs if "workout_id" in log}

    docs = await workouts_collection.find({}).to_list(length=200)

    scored_workouts = []
    for doc in docs:
        score, reason = calculate_recommendation_score(doc, current_user, completed_workout_ids)
        if score > -30:
            scored_workouts.append((score, reason, doc))

    # Sort descending by match_score
    scored_workouts.sort(key=lambda x: x[0], reverse=True)

    # Fallback to closest workouts if scored list is small
    if not scored_workouts:
        for doc in docs:
            scored_workouts.append((10.0, "Recommended for you", doc))

    recommended_docs = scored_workouts[:6]
    return [_serialize(doc, reason=reason, score=score) for score, reason, doc in recommended_docs]


@router.get("/youtube-recommendations", response_model=YouTubeRecommendationsResponse)
async def get_youtube_workout_recommendations(
    refresh: bool = False,
    current_user: dict = Depends(get_current_user),
):
    """Generates AI personalized YouTube workout recommendations based on user questionnaire/profile preferences."""
    # 1. Verify user has preferences set
    has_preferences = any([
        current_user.get("fitness_goal"),
        current_user.get("workout_experience"),
        current_user.get("preferred_workout_type"),
        current_user.get("available_workout_time"),
        current_user.get("equipment"),
        current_user.get("activity_level"),
    ])

    if not has_preferences:
        # Fallback to popular workout query if user hasn't completed questionnaire preferences yet
        fallback_query = "full body workout home fitness"
        try:
            raw_videos = await fetch_youtube_workout_videos(
                query=fallback_query, api_key=settings.youtube_api_key, max_results=6
            )
            video_models = [
                YouTubeWorkoutVideo(
                    video_id=item["video_id"],
                    title=item["title"],
                    channel_title=item["channel_title"],
                    thumbnail_url=item["thumbnail_url"],
                    duration=item["duration"],
                    video_url=item["video_url"],
                    recommendation_reason="Trending full body home workout",
                )
                for item in raw_videos
            ]
            return YouTubeRecommendationsResponse(
                query_used=fallback_query,
                videos=video_models,
                missing_preferences=False,
                message="Showing trending fitness workouts. Complete your profile in Settings for AI personalized recommendations!",
            )
        except Exception:
            return YouTubeRecommendationsResponse(
                query_used="",
                videos=[],
                missing_preferences=True,
                message="Please complete your questionnaire preferences in Settings to get personalized AI YouTube recommendations.",
            )

    # 2. Generate personalized search query via Gemini / AI
    query = await generate_youtube_search_query(current_user)
    if refresh:
        import random
        variations = ["workout routine", "fitness class", "home session", "exercise guide", "training video"]
        query = f"{query} {random.choice(variations)}"

    # 3. Fetch videos from YouTube Data API
    try:
        raw_videos = await fetch_youtube_workout_videos(query=query, api_key=settings.youtube_api_key, max_results=6)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(ve),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"YouTube Data API error: {str(exc)}",
        )

    if not raw_videos:
        return YouTubeRecommendationsResponse(
            query_used=query,
            videos=[],
            missing_preferences=False,
            message="No YouTube videos found matching your criteria. Try refreshing recommendations.",
        )

    # 4. Generate AI personalized match reasons
    reasons = await generate_youtube_match_reasons(current_user, raw_videos)

    # 5. Format response items
    video_models = []
    for i, item in enumerate(raw_videos):
        reason_text = reasons[i] if i < len(reasons) else f"Matches your {current_user.get('fitness_goal', 'fitness')} preferences."
        video_models.append(
            YouTubeWorkoutVideo(
                video_id=item["video_id"],
                title=item["title"],
                channel_title=item["channel_title"],
                thumbnail_url=item["thumbnail_url"],
                duration=item["duration"],
                video_url=item["video_url"],
                recommendation_reason=reason_text,
            )
        )

    return YouTubeRecommendationsResponse(
        query_used=query,
        videos=video_models,
        missing_preferences=False,
        message=None,
    )


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
    from app.routers.gamification import process_user_activity

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

    gamification_res = await process_user_activity(str(current_user["_id"]), "workout")

    return {
        "id": str(result.inserted_id),
        "message": "Workout logged successfully",
        "gamification": gamification_res.model_dump(),
    }


@router.post("/steps", status_code=status.HTTP_201_CREATED)
async def log_steps(payload: dict, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone
    from app.database import step_logs_collection

    steps_val = int(payload.get("steps", 0))
    action = payload.get("action", "add")  # "add" (incremental) or "sync_total" (absolute total)
    if steps_val < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Steps cannot be negative")

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user_id_str = str(current_user["_id"])

    # Upsert or increment today's step count with deduplication protection
    existing = await step_logs_collection.find_one({"user_id": user_id_str, "date": today_str})
    if existing:
        current_steps = existing.get("steps", 0)
        if action == "sync_total":
            new_total = max(current_steps, steps_val)
        else:
            new_total = current_steps + steps_val

        await step_logs_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"steps": new_total, "updated_at": datetime.now(timezone.utc)}},
        )
        total_steps = new_total
    else:
        doc = {
            "user_id": user_id_str,
            "steps": steps_val,
            "date": today_str,
            "logged_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await step_logs_collection.insert_one(doc)
        total_steps = steps_val

    return {"message": "Steps logged successfully", "total_steps_today": total_steps, "date": today_str}


@router.get("/steps/today")
async def get_today_steps(current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone
    from app.database import step_logs_collection

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    user_id_str = str(current_user["_id"])

    existing = await step_logs_collection.find_one({"user_id": user_id_str, "date": today_str})
    steps = existing.get("steps", 0) if existing else 0
    return {"steps": steps, "goal": 10000, "date": today_str}


@router.get("/steps/weekly")
async def get_weekly_steps(current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timedelta, timezone
    from app.database import step_logs_collection

    user_id_str = str(current_user["_id"])
    today = datetime.now(timezone.utc).date()
    
    # Generate past 7 days (including today)
    dates = [today - timedelta(days=i) for i in range(6, -1, -1)]
    date_strs = [d.strftime("%Y-%m-%d") for d in dates]

    logs = await step_logs_collection.find({
        "user_id": user_id_str,
        "date": {"$in": date_strs}
    }).to_list(length=100)

    log_map = {log["date"]: log.get("steps", 0) for log in logs}

    result = []
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for d, d_str in zip(dates, date_strs):
        st = log_map.get(d_str, 0)
        day_label = day_names[d.weekday()]
        kcal = round(st * 0.05)
        mins = round(st * 0.005)
        result.append({
            "date": d_str,
            "day": day_label,
            "steps": st,
            "kcal": kcal,
            "min": mins,
            "is_today": d_str == date_strs[-1]
        })

    return result


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
@router.post("/session", status_code=status.HTTP_201_CREATED)
async def log_workout_session(payload: dict, current_user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone
    from app.database import workout_logs_collection, step_logs_collection
    from app.routers.gamification import process_user_activity

    title = payload.get("title") or "Sensor Workout Session"
    activity_type = payload.get("activity_type") or "Walking"
    duration_seconds = int(payload.get("duration_seconds", 0))
    duration_minutes = int(payload.get("duration_minutes", 0)) or max(1, round(duration_seconds / 60))
    steps = int(payload.get("steps", 0))
    distance_km = float(payload.get("distance_km", 0.0))
    calories = int(payload.get("calories") or payload.get("calories_burned") or round(steps * 0.045 + duration_minutes * 3.5))
    avg_cadence = payload.get("avg_cadence")
    source = payload.get("source", "phone_sensor")

    user_id_str = str(current_user["_id"])
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")

    # Save to workout logs collection
    doc = {
        "user_id": user_id_str,
        "workout_id": "sensor_session",
        "title": title,
        "category": activity_type,
        "duration_minutes": duration_minutes,
        "duration_seconds": duration_seconds,
        "calories": calories,
        "steps": steps,
        "distance_km": distance_km,
        "avg_cadence": avg_cadence,
        "source": source,
        "logged_at": now,
        "date": today_str,
    }
    result = await workout_logs_collection.insert_one(doc)

    # If steps were tracked during session, increment today's step count as well
    if steps > 0:
        existing_steps = await step_logs_collection.find_one({"user_id": user_id_str, "date": today_str})
        if existing_steps:
            await step_logs_collection.update_one(
                {"_id": existing_steps["_id"]},
                {"$set": {"steps": existing_steps.get("steps", 0) + steps, "updated_at": now}},
            )
        else:
            await step_logs_collection.insert_one({
                "user_id": user_id_str,
                "steps": steps,
                "date": today_str,
                "logged_at": now,
                "updated_at": now,
            })

    # Award gamification XP
    gamification_res = None
    try:
        gamification_res = await process_user_activity(user_id_str, "workout")
    except Exception:
        pass

    return {
        "id": str(result.inserted_id),
        "message": "Workout session saved successfully",
        "session": {
            "title": title,
            "activity_type": activity_type,
            "duration_minutes": duration_minutes,
            "duration_seconds": duration_seconds,
            "steps": steps,
            "distance_km": distance_km,
            "calories": calories,
            "date": today_str,
        },
        "gamification": gamification_res.model_dump() if gamification_res else None,
    }


@router.get("/sessions/recent")
async def get_recent_workout_sessions(current_user: dict = Depends(get_current_user)):
    from app.database import workout_logs_collection

    user_id_str = str(current_user["_id"])
    logs = await workout_logs_collection.find(
        {"user_id": user_id_str}
    ).sort("logged_at", -1).to_list(length=10)

    summaries = []
    for log in logs:
        logged_at = log.get("logged_at")
        date_str = logged_at.strftime("%Y-%m-%d %H:%M") if hasattr(logged_at, "strftime") else str(logged_at or "")
        summaries.append({
            "id": str(log["_id"]),
            "title": log.get("title", "Workout"),
            "category": log.get("category", "General"),
            "duration_minutes": log.get("duration_minutes", 0),
            "duration_seconds": log.get("duration_seconds", log.get("duration_minutes", 0) * 60),
            "calories": log.get("calories", 0),
            "steps": log.get("steps", 0),
            "distance_km": log.get("distance_km", 0.0),
            "source": log.get("source", "manual"),
            "date": date_str,
        })
    return summaries





