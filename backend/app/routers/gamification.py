import math
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from app.database import users_collection
from app.models.schemas import (
    GamificationOut,
    BadgeOut,
    ActivityRequest,
    ActivityResponse,
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/gamification", tags=["gamification"])

ALL_BADGES = [
    {
        "id": "first_step",
        "name": "First Step",
        "description": "Complete your first workout.",
        "icon": "🥇",
    },
    {
        "id": "streak_7",
        "name": "7 Day Warrior",
        "description": "Maintain a 7-day streak.",
        "icon": "🔥",
    },
    {
        "id": "streak_30",
        "name": "30 Day Champion",
        "description": "Maintain a 30-day streak.",
        "icon": "🏆",
    },
    {
        "id": "workout_5",
        "name": "Workout Starter",
        "description": "Complete 5 workouts.",
        "icon": "💪",
    },
    {
        "id": "workout_25",
        "name": "Workout Beast",
        "description": "Complete 25 workouts.",
        "icon": "🏋️",
    },
    {
        "id": "nutrition_10",
        "name": "Nutrition Tracker",
        "description": "Log 10 meals.",
        "icon": "🥗",
    },
    {
        "id": "xp_1000",
        "name": "Consistency King",
        "description": "Reach 1000 XP.",
        "icon": "⭐",
    },
]


def calculate_level(total_xp: int) -> int:
    """Level = floor(total_xp / 500) + 1"""
    return math.floor(total_xp / 500) + 1


async def process_user_activity(user_id: str, activity_type: str) -> ActivityResponse:
    from bson import ObjectId

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    total_xp = user.get("total_xp", 0)
    current_streak = user.get("current_streak", 0)
    longest_streak = user.get("longest_streak", 0)
    last_activity_date = user.get("last_activity_date", "")
    unlocked_badges: Dict[str, str] = user.get("unlocked_badges", {})
    workouts_completed_count = user.get("workouts_completed_count", 0)
    meals_logged_count = user.get("meals_logged_count", 0)
    daily_bonus_claimed_date = user.get("daily_bonus_claimed_date", "")

    xp_gained = 0
    if activity_type == "workout":
        xp_gained = 50
        workouts_completed_count += 1
    elif activity_type == "meal":
        xp_gained = 10
        meals_logged_count += 1
    elif activity_type == "daily_checkin":
        if daily_bonus_claimed_date == today_str:
            xp_gained = 0
        else:
            xp_gained = 20
            daily_bonus_claimed_date = today_str
    else:
        xp_gained = 0

    # Streak logic
    if last_activity_date == today_str:
        # Multiple activities on same day do not increase streak again
        pass
    elif last_activity_date == yesterday_str:
        current_streak += 1
        last_activity_date = today_str
    else:
        current_streak = 1
        last_activity_date = today_str

    if current_streak > longest_streak:
        longest_streak = current_streak

    old_level = calculate_level(total_xp)
    new_total_xp = total_xp + xp_gained
    new_level = calculate_level(new_total_xp)
    leveled_up = new_level > old_level

    # Badge evaluation
    new_badges_list: List[BadgeOut] = []
    
    # 1. First Step (1 workout)
    if workouts_completed_count >= 1 and "first_step" not in unlocked_badges:
        unlocked_badges["first_step"] = now.isoformat()
        b_meta = next(b for b in ALL_BADGES if b["id"] == "first_step")
        new_badges_list.append(
            BadgeOut(
                id=b_meta["id"],
                name=b_meta["name"],
                description=b_meta["description"],
                icon=b_meta["icon"],
                unlocked=True,
                unlocked_at=now,
            )
        )

    # 2. 7 Day Warrior (7 day streak)
    if (current_streak >= 7 or longest_streak >= 7) and "streak_7" not in unlocked_badges:
        unlocked_badges["streak_7"] = now.isoformat()
        b_meta = next(b for b in ALL_BADGES if b["id"] == "streak_7")
        new_badges_list.append(
            BadgeOut(
                id=b_meta["id"],
                name=b_meta["name"],
                description=b_meta["description"],
                icon=b_meta["icon"],
                unlocked=True,
                unlocked_at=now,
            )
        )

    # 3. 30 Day Champion (30 day streak)
    if (current_streak >= 30 or longest_streak >= 30) and "streak_30" not in unlocked_badges:
        unlocked_badges["streak_30"] = now.isoformat()
        b_meta = next(b for b in ALL_BADGES if b["id"] == "streak_30")
        new_badges_list.append(
            BadgeOut(
                id=b_meta["id"],
                name=b_meta["name"],
                description=b_meta["description"],
                icon=b_meta["icon"],
                unlocked=True,
                unlocked_at=now,
            )
        )

    # 4. Workout Starter (5 workouts)
    if workouts_completed_count >= 5 and "workout_5" not in unlocked_badges:
        unlocked_badges["workout_5"] = now.isoformat()
        b_meta = next(b for b in ALL_BADGES if b["id"] == "workout_5")
        new_badges_list.append(
            BadgeOut(
                id=b_meta["id"],
                name=b_meta["name"],
                description=b_meta["description"],
                icon=b_meta["icon"],
                unlocked=True,
                unlocked_at=now,
            )
        )

    # 5. Workout Beast (25 workouts)
    if workouts_completed_count >= 25 and "workout_25" not in unlocked_badges:
        unlocked_badges["workout_25"] = now.isoformat()
        b_meta = next(b for b in ALL_BADGES if b["id"] == "workout_25")
        new_badges_list.append(
            BadgeOut(
                id=b_meta["id"],
                name=b_meta["name"],
                description=b_meta["description"],
                icon=b_meta["icon"],
                unlocked=True,
                unlocked_at=now,
            )
        )

    # 6. Nutrition Tracker (10 meals)
    if meals_logged_count >= 10 and "nutrition_10" not in unlocked_badges:
        unlocked_badges["nutrition_10"] = now.isoformat()
        b_meta = next(b for b in ALL_BADGES if b["id"] == "nutrition_10")
        new_badges_list.append(
            BadgeOut(
                id=b_meta["id"],
                name=b_meta["name"],
                description=b_meta["description"],
                icon=b_meta["icon"],
                unlocked=True,
                unlocked_at=now,
            )
        )

    # 7. Consistency King (1000 XP)
    if new_total_xp >= 1000 and "xp_1000" not in unlocked_badges:
        unlocked_badges["xp_1000"] = now.isoformat()
        b_meta = next(b for b in ALL_BADGES if b["id"] == "xp_1000")
        new_badges_list.append(
            BadgeOut(
                id=b_meta["id"],
                name=b_meta["name"],
                description=b_meta["description"],
                icon=b_meta["icon"],
                unlocked=True,
                unlocked_at=now,
            )
        )

    # Update database
    update_data = {
        "total_xp": new_total_xp,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_activity_date": last_activity_date,
        "unlocked_badges": unlocked_badges,
        "workouts_completed_count": workouts_completed_count,
        "meals_logged_count": meals_logged_count,
        "daily_bonus_claimed_date": daily_bonus_claimed_date,
    }

    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data},
    )

    msg = f"+{xp_gained} XP 🎉" if xp_gained > 0 else "Activity recorded."
    if leveled_up:
        msg += f" Level Up! You reached Level {new_level} 🚀"

    return ActivityResponse(
        xp_gained=xp_gained,
        total_xp=new_total_xp,
        level=new_level,
        leveled_up=leveled_up,
        current_streak=current_streak,
        longest_streak=longest_streak,
        new_badges=new_badges_list,
        message=msg,
    )


@router.get("", response_model=GamificationOut)
async def get_gamification(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")

    total_xp = current_user.get("total_xp", 0)
    current_streak = current_user.get("current_streak", 0)
    longest_streak = current_user.get("longest_streak", 0)
    last_activity_date = current_user.get("last_activity_date", "")
    unlocked_badges: Dict[str, str] = current_user.get("unlocked_badges", {})
    workouts_completed_count = current_user.get("workouts_completed_count", 0)
    meals_logged_count = current_user.get("meals_logged_count", 0)

    # Check streak expiration if last activity was before yesterday
    if last_activity_date and last_activity_date != today_str and last_activity_date != yesterday_str:
        if current_streak > 0:
            current_streak = 0
            # update user in db
            await users_collection.update_one(
                {"_id": current_user["_id"]},
                {"$set": {"current_streak": 0}},
            )

    level = calculate_level(total_xp)
    xp_in_level = total_xp % 500
    xp_needed_for_next = 500 - xp_in_level
    next_level_xp = level * 500
    progress_pct = round((xp_in_level / 500.0) * 100, 1)

    badges_list: List[BadgeOut] = []
    earned_count = 0
    for b in ALL_BADGES:
        bid = b["id"]
        is_unlocked = bid in unlocked_badges
        if is_unlocked:
            earned_count += 1
            unlocked_at_val = None
            try:
                unlocked_at_val = datetime.fromisoformat(unlocked_badges[bid])
            except Exception:
                unlocked_at_val = now
            badges_list.append(
                BadgeOut(
                    id=bid,
                    name=b["name"],
                    description=b["description"],
                    icon=b["icon"],
                    unlocked=True,
                    unlocked_at=unlocked_at_val,
                )
            )
        else:
            badges_list.append(
                BadgeOut(
                    id=bid,
                    name=b["name"],
                    description=b["description"],
                    icon=b["icon"],
                    unlocked=False,
                    unlocked_at=None,
                )
            )

    return GamificationOut(
        total_xp=total_xp,
        level=level,
        xp_in_level=xp_in_level,
        xp_needed_for_next=xp_needed_for_next,
        next_level_xp=next_level_xp,
        progress_pct=progress_pct,
        current_streak=current_streak,
        longest_streak=longest_streak,
        badges_earned_count=earned_count,
        total_badges_count=len(ALL_BADGES),
        badges=badges_list,
        workouts_completed_count=workouts_completed_count,
        meals_logged_count=meals_logged_count,
        last_activity_date=last_activity_date,
    )


@router.post("/activity", response_model=ActivityResponse)
async def record_activity(
    payload: ActivityRequest, current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    return await process_user_activity(user_id, payload.activity_type)
