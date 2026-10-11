import unittest
import io
import sys
from pathlib import Path
from PIL import Image

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))
_backend = Path(__file__).resolve().parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from app.routers.nutrition import (
    calculate_nutrition_targets,
    generate_remaining_meal_suggestions,
    CANDIDATE_MEALS,
)
from ml.nutrition_vision.dataset_builder import INDIAN_NUTRITION_DB, calculate_food_nutrition
from ml.nutrition_vision.macro_estimator import (
    classify_food_with_ml,
    estimate_macros,
    estimate_from_image,
)


class TestSmartNutritionSystem(unittest.TestCase):

    def test_personalized_target_calculation(self):
        # 1. Sedentary 30yo looking to lose weight
        user_weight_loss = {
            "age": 30,
            "gender": "Female",
            "height": 160.0,
            "weight": 68.0,
            "fitness_goal": "Lose weight",
            "activity_level": "Sedentary",
        }
        targets_loss = calculate_nutrition_targets(user_weight_loss)
        self.assertGreater(targets_loss.calories, 1100)
        self.assertGreaterEqual(targets_loss.protein_g, 100)
        self.assertGreaterEqual(targets_loss.fiber_g, 30)

        # 2. Very active 24yo looking to build muscle
        user_build = {
            "age": 24,
            "gender": "Male",
            "height": 182.0,
            "weight": 78.0,
            "fitness_goal": "Build muscle",
            "activity_level": "Very active",
        }
        targets_build = calculate_nutrition_targets(user_build)
        self.assertGreater(targets_build.calories, targets_loss.calories)
        self.assertGreater(targets_build.protein_g, targets_loss.protein_g)

    def test_verified_indian_nutrition_database(self):
        # Test required Indian foods: dal, roti, sabji, poha, idli
        indian_foods = ["dal", "roti", "sabji", "poha", "idli"]
        for food in indian_foods:
            self.assertIn(food, INDIAN_NUTRITION_DB, f"Missing verified profile for {food}")
            profile = INDIAN_NUTRITION_DB[food]
            self.assertGreater(profile.calories_per_100g, 0)
            self.assertGreater(profile.protein_g_per_100g, 0)
            self.assertGreater(profile.carbs_g_per_100g, 0)
            self.assertGreater(profile.standard_weight_g, 0)

    def test_portion_size_scaling(self):
        # Standard portion (1.0x) vs Generous portion (1.5x) vs Half portion (0.5x)
        poha_half = estimate_macros("poha", portion_multiplier=0.5)
        poha_std = estimate_macros("poha", portion_multiplier=1.0)
        poha_large = estimate_macros("poha", portion_multiplier=1.5)

        self.assertAlmostEqual(poha_half.calories, round(poha_std.calories * 0.5), delta=3)
        self.assertAlmostEqual(poha_large.calories, round(poha_std.calories * 1.5), delta=3)
        self.assertAlmostEqual(poha_large.protein_g, round(poha_std.protein_g * 1.5, 1), delta=1.0)
        self.assertEqual(poha_std.reliable_source, "ICMR IFCT 2024 & USDA FoodData Central")

    def test_ml_model_food_recognition(self):
        # Create synthetic test image for dal
        img = Image.new("RGB", (224, 224), (220, 175, 45))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        raw_bytes = buf.getvalue()

        label, conf = classify_food_with_ml(raw_bytes)
        self.assertIsInstance(label, str)
        self.assertGreaterEqual(conf, 0.70)

        estimate = estimate_from_image(raw_bytes, portion_multiplier=1.0)
        self.assertGreater(estimate.calories, 0)
        self.assertGreater(estimate.protein_g, 0)

    def test_remaining_nutritional_needs_suggestions(self):
        profile = {
            "age": 26,
            "gender": "Male",
            "weight": 70.0,
            "dietary_preference": "Vegetarian",
            "allergies": ["Peanut"],
        }
        targets = calculate_nutrition_targets(profile)

        # User has 550 kcal and 30g protein remaining
        remaining_high = {
            "calories": 550,
            "protein_g": 30.0,
            "carbs_g": 60.0,
            "fat_g": 15.0,
            "fiber_g": 10.0,
        }
        suggestions_high = generate_remaining_meal_suggestions(profile, remaining_high, targets)
        self.assertGreater(len(suggestions_high), 0)

        # Check that Indian items like Dal, Roti, Sabji or Paneer are suggested
        suggested_names = " ".join([s.items for s in suggestions_high]).lower()
        self.assertTrue(
            any(item in suggested_names for item in ["dal", "roti", "sabji", "paneer", "khichdi", "idli"]),
            f"Expected Indian meal staples in suggestions: {suggested_names}"
        )

        # User has only 80 kcal remaining -> should suggest light digestive option
        remaining_low = {
            "calories": 80,
            "protein_g": 2.0,
            "carbs_g": 10.0,
            "fat_g": 2.0,
            "fiber_g": 1.0,
        }
        suggestions_low = generate_remaining_meal_suggestions(profile, remaining_low, targets)
        self.assertGreater(len(suggestions_low), 0)
        low_names = " ".join([s.items for s in suggestions_low]).lower()
        self.assertTrue(any(word in low_names for word in ["chaas", "buttermilk", "herbal", "tea", "sip"]))


if __name__ == "__main__":
    unittest.main()
