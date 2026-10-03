import asyncio
import unittest
from app.models.schemas import UserProfileUpdate, UserOut, StepLogCreate
from app.routers.workouts import calculate_recommendation_score
from app.routers.nutrition import calculate_nutrition_targets, generate_recommended_meals

class TestPersonalizedFeatures(unittest.TestCase):

    def test_workout_recommendation_scoring(self):
        user_profile = {
            "fitness_goal": "Build muscle",
            "workout_experience": "Beginner",
            "preferred_workout_type": "Strength",
            "available_workout_time": "15-30 min",
            "equipment": ["Dumbbells"],
            "fitness_limitations": ["Joint pain / Low impact"],
            "age": 30,
            "height": 175,
            "weight": 70,
        }

        workout_strength = {
            "_id": "w1",
            "title": "Beginner Dumbbell Strength",
            "category": "Strength",
            "location": "Home",
            "duration_minutes": 25,
            "difficulty": "Beginner",
            "calories": 200,
        }

        workout_hiit_adv = {
            "_id": "w2",
            "title": "Extreme HIIT Blast",
            "category": "HIIT",
            "location": "Gym",
            "duration_minutes": 50,
            "difficulty": "Advanced",
            "calories": 500,
        }

        score_strength, reason_strength = calculate_recommendation_score(workout_strength, user_profile, set())
        score_hiit, reason_hiit = calculate_recommendation_score(workout_hiit_adv, user_profile, set())

        self.assertGreater(score_strength, score_hiit)

    def test_nutrition_recommendations_dietary_restrictions(self):
        veg_profile = {
            "age": 28,
            "gender": "male",
            "height": 180,
            "weight": 75,
            "fitness_goal": "Build muscle",
            "activity_level": "Moderately active",
            "dietary_preference": "Vegetarian",
            "food_preferences": ["Nut-Free"],
        }

        targets = calculate_nutrition_targets(veg_profile)
        self.assertGreater(targets.calories, 2000)
        self.assertGreater(targets.protein_g, 100)

        meals = asyncio.run(generate_recommended_meals(veg_profile, targets))
        self.assertEqual(len(meals), 4)
        for meal in meals:
            items_lower = meal.items.lower()
            self.assertNotIn("chicken", items_lower)
            self.assertNotIn("salmon", items_lower)
            self.assertNotIn("almond", items_lower)

if __name__ == "__main__":
    unittest.main()
