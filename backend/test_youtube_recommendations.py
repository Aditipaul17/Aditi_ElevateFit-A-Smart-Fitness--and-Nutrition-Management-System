import asyncio
import unittest
from unittest.mock import patch, MagicMock

from app.services.youtube import parse_iso8601_duration
from app.services.gemini import generate_youtube_search_query, generate_youtube_match_reasons


class TestYouTubeRecommendations(unittest.TestCase):

    def test_duration_parsing(self):
        self.assertEqual(parse_iso8601_duration("PT15M30S"), "16 min")
        self.assertEqual(parse_iso8601_duration("PT45M"), "45 min")
        self.assertEqual(parse_iso8601_duration("PT1H10M"), "1h 10m")
        self.assertEqual(parse_iso8601_duration("PT1H"), "1 hr")
        self.assertEqual(parse_iso8601_duration("PT25S"), "25 sec")
        self.assertEqual(parse_iso8601_duration("invalid"), "20 min")

    def test_fallback_query_generation(self):
        user_profile = {
            "fitness_goal": "Build muscle",
            "workout_experience": "Intermediate",
            "preferred_workout_type": "Strength",
            "available_workout_time": "30-45 min",
            "equipment": ["Dumbbells"],
            "activity_level": "Moderately active",
        }
        query = asyncio.run(generate_youtube_search_query(user_profile))
        self.assertTrue(len(query) > 0)
        self.assertTrue(any(term in query.lower() for term in ["workout", "strength", "dumbbell", "intermediate", "muscle"]))

    def test_match_reasons_generation(self):
        user_profile = {
            "fitness_goal": "Lose weight",
            "workout_experience": "Beginner",
            "preferred_workout_type": "HIIT",
            "available_workout_time": "15-30 min",
            "equipment": ["No equipment"],
        }
        videos = [
            {
                "video_id": "v1",
                "title": "20 Min Full Body HIIT Workout",
                "duration": "20 min",
            }
        ]
        reasons = asyncio.run(generate_youtube_match_reasons(user_profile, videos))
        self.assertEqual(len(reasons), 1)
        self.assertTrue(len(reasons[0]) > 0)


if __name__ == "__main__":
    unittest.main()
