import asyncio
from bson import ObjectId
from datetime import datetime, timezone
from app.database import users_collection, step_logs_collection, workout_logs_collection
from app.routers.workouts import log_steps, get_today_steps, log_workout_session, get_recent_workout_sessions

async def run_sensor_tests():
    print("Starting sensor and fitness tracking backend tests...")
    test_user_id = ObjectId()
    test_user = {
        "_id": test_user_id,
        "name": "Sensor Test User",
        "email": "sensor_test@example.com",
        "hashed_password": "dummy_password_hash",
        "total_xp": 0,
        "current_streak": 0,
        "longest_streak": 0,
        "unlocked_badges": {},
    }
    await users_collection.insert_one(test_user)

    try:
        # Test 1: Log steps incrementally
        res1 = await log_steps({"steps": 500, "action": "add"}, current_user=test_user)
        assert res1["total_steps_today"] == 500, f"Expected 500 steps, got {res1['total_steps_today']}"
        print("Test 1 Passed: Incremental step logging adds steps correctly.")

        # Test 2: Log additional steps incrementally
        res2 = await log_steps({"steps": 300, "action": "add"}, current_user=test_user)
        assert res2["total_steps_today"] == 800, f"Expected 800 steps, got {res2['total_steps_today']}"
        print("Test 2 Passed: Second incremental log totals 800 steps.")

        # Test 3: Deduplication protection with sync_total
        # If frontend syncs current sensor total of 800 again, total should NOT double!
        res3 = await log_steps({"steps": 800, "action": "sync_total"}, current_user=test_user)
        assert res3["total_steps_today"] == 800, f"Expected 800 steps (deduplicated), got {res3['total_steps_today']}"
        print("Test 3 Passed: sync_total with same count avoids duplicate step inflation.")

        # Test 4: sync_total with higher count updates to that count
        res4 = await log_steps({"steps": 1250, "action": "sync_total"}, current_user=test_user)
        assert res4["total_steps_today"] == 1250, f"Expected 1250 steps, got {res4['total_steps_today']}"
        print("Test 4 Passed: sync_total advances to newer higher sensor count.")

        # Test 5: Verify get_today_steps
        today_res = await get_today_steps(current_user=test_user)
        assert today_res["steps"] == 1250, f"Expected 1250 today steps, got {today_res['steps']}"
        print("Test 5 Passed: get_today_steps returns correct stored total.")

        # Test 6: Log a sensor workout session (e.g. Walking workout)
        session_payload = {
            "title": "Outdoor Power Walk",
            "activity_type": "Walking",
            "duration_seconds": 900,
            "steps": 1400,
            "distance_km": 1.05,
            "calories": 75,
            "avg_cadence": 93,
            "source": "phone_sensor",
        }
        session_res = await log_workout_session(session_payload, current_user=test_user)
        assert session_res["session"]["title"] == "Outdoor Power Walk"
        assert session_res["session"]["steps"] == 1400
        assert session_res["session"]["duration_minutes"] == 15
        print("Test 6 Passed: log_workout_session records duration, steps, and activity.")

        # Test 7: Get recent workout sessions
        recent_sessions = await get_recent_workout_sessions(current_user=test_user)
        assert len(recent_sessions) >= 1
        assert recent_sessions[0]["title"] == "Outdoor Power Walk"
        assert recent_sessions[0]["category"] == "Walking"
        print("Test 7 Passed: get_recent_workout_sessions retrieves recent sessions for dashboard.")

    finally:
        # Cleanup
        await users_collection.delete_one({"_id": test_user_id})
        await step_logs_collection.delete_many({"user_id": str(test_user_id)})
        await workout_logs_collection.delete_many({"user_id": str(test_user_id)})
        print("Cleanup completed.")

if __name__ == "__main__":
    asyncio.run(run_sensor_tests())
