import unittest
from app.routers.nutrition import calculate_nutrition_targets, generate_recommended_meals, CANDIDATE_MEALS

class TestNutritionRecommendations(unittest.TestCase):

    def test_vegetarian_profile_recommendations(self):
        user_profile = {
            "age": 25,
            "gender": "Female",
            "height": 165.0,
            "weight": 60.0,
            "fitness_goal": "Maintain fitness",
            "activity_level": "Lightly active",
            "dietary_preference": "Vegetarian",
            "workout_experience": "Beginner"
        }
        targets = calculate_nutrition_targets(user_profile)
        self.assertGreater(targets.calories, 1000)
        self.assertGreater(targets.protein_g, 30)

        meals = generate_recommended_meals(user_profile, targets)
        self.assertEqual(len(meals), 4)

        # Verify no non-vegetarian items
        non_veg_keywords = ["chicken", "salmon", "beef", "pork", "turkey", "egg", "fish", "meat"]
        for meal in meals:
            items_lower = meal.items.lower()
            for kw in non_veg_keywords:
                self.assertNotIn(kw, items_lower, f"Non-vegetarian item '{kw}' found in vegetarian meal: {meal.items}")

    def test_vegan_profile_recommendations(self):
        user_profile = {
            "age": 30,
            "gender": "Male",
            "height": 178.0,
            "weight": 75.0,
            "fitness_goal": "Lose weight",
            "activity_level": "Moderately active",
            "dietary_preference": "Vegan",
            "workout_experience": "Intermediate"
        }
        targets = calculate_nutrition_targets(user_profile)
        meals = generate_recommended_meals(user_profile, targets)
        self.assertEqual(len(meals), 4)

        non_vegan_keywords = ["chicken", "salmon", "paneer", "yogurt", "curd", "feta", "egg", "fish", "meat", "cheese"]
        for meal in meals:
            items_lower = meal.items.lower()
            for kw in non_vegan_keywords:
                self.assertNotIn(kw, items_lower, f"Non-vegan item '{kw}' found in vegan meal: {meal.items}")

    def test_build_muscle_increases_protein(self):
        profile_maintain = {
            "age": 28, "height": 170.0, "weight": 70.0,
            "fitness_goal": "Maintain fitness", "activity_level": "Lightly active"
        }
        profile_build = {
            "age": 28, "height": 170.0, "weight": 70.0,
            "fitness_goal": "Build muscle", "activity_level": "Lightly active"
        }
        targets_maintain = calculate_nutrition_targets(profile_maintain)
        targets_build = calculate_nutrition_targets(profile_build)

        self.assertGreater(targets_build.calories, targets_maintain.calories)
        self.assertGreaterEqual(targets_build.protein_g, targets_maintain.protein_g)

if __name__ == "__main__":
    unittest.main()
