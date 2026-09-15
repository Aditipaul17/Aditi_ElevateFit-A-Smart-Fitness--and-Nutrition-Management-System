import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.database import users_collection
from app.routers.gamification import process_user_activity, calculate_level
from bson import ObjectId
from datetime import datetime, timezone, timedelta

async def run_tests():
    print("Starting gamification tests...")
    # 1. Setup a test user
    test_user_id = ObjectId()
    await users_collection.insert_one({
        "_id": test_user_id,
        "name": "Test Gamification",
        "email": "gametest@example.com",
        "hashed_password": "dummy_password_hash",
        "total_xp": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "unlocked_badges": {},
        "workouts_completed_count": 0,
        "meals_logged_count": 0,
    })
    
    try:
        # Test 1: First workout activity (+50 XP, First Step badge, Streak 1)
        res1 = await process_user_activity(str(test_user_id), "workout")
        assert res1.xp_gained == 50, f"Expected 50 XP, got {res1.xp_gained}"
        assert res1.total_xp == 50
        assert res1.current_streak == 1
        assert any(b.id == "first_step" for b in res1.new_badges), "Missing first_step badge"
        print("Test 1 Passed: Workout activity (+50 XP, First Step badge, Streak 1)")

        # Test 2: Multiple activities same day (Meal +10 XP, no streak increase)
        res2 = await process_user_activity(str(test_user_id), "meal")
        assert res2.xp_gained == 10
        assert res2.total_xp == 60
        assert res2.current_streak == 1, "Streak should not increase on same day"
        print("Test 2 Passed: Meal activity (+10 XP, Streak remains 1)")

        # Test 3: Activity on consecutive day (mocking last_activity_date to yesterday)
        now = datetime.now(timezone.utc)
        yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        await users_collection.update_one(
            {"_id": test_user_id},
            {"$set": {"last_activity_date": yesterday}}
        )
        res3 = await process_user_activity(str(test_user_id), "daily_checkin")
        assert res3.xp_gained == 20
        assert res3.total_xp == 80
        assert res3.current_streak == 2, f"Expected streak 2, got {res3.current_streak}"
        print("Test 3 Passed: Daily checkin next day (+20 XP, Streak becomes 2)")

        # Test 4: Simulate missing a day (mocking last_activity_date to 2 days ago)
        two_days_ago = (now - timedelta(days=2)).strftime("%Y-%m-%d")
        await users_collection.update_one(
            {"_id": test_user_id},
            {"$set": {"last_activity_date": two_days_ago}}
        )
        res4 = await process_user_activity(str(test_user_id), "meal")
        assert res4.xp_gained == 10
        assert res4.total_xp == 90
        assert res4.current_streak == 1, f"Expected streak 1 after missing a day, got {res4.current_streak}"
        assert res4.longest_streak == 2, "Longest streak should remain 2"
        print("Test 4 Passed: Missing a day resets streak to 1, longest streak preserved")

        # Test 5: Verify leveling (Level = floor(total_xp / 500) + 1)
        await users_collection.update_one(
            {"_id": test_user_id},
            {"$set": {"total_xp": 490, "workouts_completed_count": 4, "last_activity_date": now.strftime("%Y-%m-%d")}}
        )
        res5 = await process_user_activity(str(test_user_id), "workout")
        assert res5.xp_gained == 50
        assert res5.total_xp == 540
        assert res5.level == 2, f"Expected Level 2, got {res5.level}"
        assert res5.leveled_up == True
        assert any(b.id == "workout_5" for b in res5.new_badges), "Missing Workout Starter badge"
        print("Test 5 Passed: Level up to Level 2 and Workout Starter badge")

        # Test 6: Verify Consistency King (1000 XP)
        await users_collection.update_one(
            {"_id": test_user_id},
            {"$set": {"total_xp": 990, "last_activity_date": now.strftime("%Y-%m-%d")}}
        )
        res6 = await process_user_activity(str(test_user_id), "meal")
        assert res6.total_xp == 1000
        assert res6.level == 3
        assert any(b.id == "xp_1000" for b in res6.new_badges), "Missing Consistency King badge"
        print("Test 6 Passed: Consistency King badge at 1000 XP")

        # Test 7: Verify 7 Day Warrior
        await users_collection.update_one(
            {"_id": test_user_id},
            {"$set": {"current_streak": 6, "last_activity_date": yesterday}}
        )
        res7 = await process_user_activity(str(test_user_id), "workout")
        assert res7.current_streak == 7
        assert any(b.id == "streak_7" for b in res7.new_badges), "Missing 7 Day Warrior badge"
        print("Test 7 Passed: 7 Day Warrior badge at 7-day streak")

    finally:
        await users_collection.delete_one({"_id": test_user_id})
        print("Test cleanup complete.")

if __name__ == "__main__":
    asyncio.run(run_tests())
