import asyncio
import sys
from pathlib import Path

_project_root = Path(__file__).resolve().parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))
_backend_root = Path(__file__).resolve().parent
if str(_backend_root) not in sys.path:
    sys.path.insert(0, str(_backend_root))

from bson import ObjectId
from datetime import datetime, timezone
from app.database import users_collection, workout_logs_collection
from app.routers.bicep_curls import (
    log_bicep_curl_session,
    get_bicep_curl_history,
    get_bicep_curl_stats,
    BicepCurlSessionCreate,
    RepLogItem,
)
from ml.pose_detection.pose_estimator import calculate_angle, DOWN_THRESHOLD, UP_THRESHOLD


async def run_bicep_curl_tests():
    print("Starting AI Bicep Curl Counter backend tests...")

    # Test 1: Algorithmic angle calculation verification
    # Perpendicular 90 deg arm: shoulder (0, 0), elbow (0, 1), wrist (1, 1) -> 90 deg
    a1 = calculate_angle([0, 0], [0, 1], [1, 1])
    assert abs(a1 - 90.0) < 1e-4, f"Expected 90 deg, got {a1}"
    print(f"Test 1 Passed: calculate_angle returns {a1:.1f} for right angle.")

    # Straight arm: shoulder (0, 0), elbow (0, 1), wrist (0, 2) -> 180 deg
    a2 = calculate_angle([0, 0], [0, 1], [0, 2])
    assert abs(a2 - 180.0) < 1e-4, f"Expected 180 deg, got {a2}"
    print(f"Test 2 Passed: calculate_angle returns {a2:.1f} for full extension (>{DOWN_THRESHOLD} deg).")

    # Fully curled arm: shoulder (0, 0), elbow (0, 1), wrist (0.1, 0.1) -> < 30 deg
    a3 = calculate_angle([0, 0], [0, 1], [0.1, 0.1])
    assert a3 < UP_THRESHOLD, f"Expected < {UP_THRESHOLD} deg, got {a3}"
    print(f"Test 3 Passed: calculate_angle returns {a3:.1f} for full flexion (<{UP_THRESHOLD} deg).")

    # Test User Setup in MongoDB
    test_user_id = ObjectId()
    test_user = {
        "_id": test_user_id,
        "name": "Bicep Curl Tester",
        "email": "bicep_tester@example.com",
        "hashed_password": "dummy_password_hash",
        "total_xp": 50,
        "current_streak": 1,
        "longest_streak": 1,
        "unlocked_badges": {},
    }
    await users_collection.insert_one(test_user)

    try:
        # Test 4: Log a full Bicep Curl session with rep timestamps
        rep_logs = [
            RepLogItem(rep=1, timestamp="2026-10-21 17:21:10", angle=18.9, arm="left"),
            RepLogItem(rep=2, timestamp="2026-10-21 17:21:21", angle=25.8, arm="left"),
            RepLogItem(rep=3, timestamp="2026-10-21 17:21:29", angle=24.3, arm="left"),
            RepLogItem(rep=4, timestamp="2026-10-21 17:21:40", angle=29.0, arm="left"),
        ]
        session_payload = BicepCurlSessionCreate(
            title="AI Bicep Curl Workout - Left Arm",
            reps=4,
            sets=1,
            duration_seconds=45,
            calories=18,
            arm="left",
            form_accuracy=96.5,
            avg_angle_min=18.9,
            avg_angle_max=165.2,
            rep_logs=rep_logs,
            notes="Real-time test session from elevated MediaPipe model",
        )

        log_res = await log_bicep_curl_session(session_payload, current_user=test_user)
        assert "id" in log_res, "Session log did not return inserted id"
        assert log_res["session"]["reps"] == 4, f"Expected 4 reps, got {log_res['session']['reps']}"
        print(f"Test 4 Passed: log_bicep_curl_session successfully saved session ID {log_res['id']}.")

        # Test 5: Fetch Bicep Curl History for current user
        history = await get_bicep_curl_history(limit=10, current_user=test_user)
        assert len(history) >= 1, "Expected at least 1 history item"
        latest = history[0]
        assert latest["reps"] == 4, f"Expected 4 reps in history, got {latest['reps']}"
        assert len(latest["rep_logs"]) == 4, f"Expected 4 rep logs, got {len(latest['rep_logs'])}"
        print(f"Test 5 Passed: get_bicep_curl_history retrieved saved session with {len(latest['rep_logs'])} rep logs.")

        # Test 6: Fetch Aggregated Bicep Curl Stats
        stats = await get_bicep_curl_stats(current_user=test_user)
        assert stats["total_sessions"] >= 1, f"Expected at least 1 session, got {stats['total_sessions']}"
        assert stats["total_reps"] >= 4, f"Expected at least 4 total reps, got {stats['total_reps']}"
        assert stats["best_session_reps"] >= 4, f"Expected best reps >= 4, got {stats['best_session_reps']}"
        print(f"Test 6 Passed: get_bicep_curl_stats verified (Total Reps: {stats['total_reps']}, Sessions: {stats['total_sessions']}).")

    finally:
        # Cleanup
        await users_collection.delete_one({"_id": test_user_id})
        await workout_logs_collection.delete_many({"user_id": str(test_user_id)})
        print("AI Bicep Curl backend tests cleanup completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_bicep_curl_tests())
