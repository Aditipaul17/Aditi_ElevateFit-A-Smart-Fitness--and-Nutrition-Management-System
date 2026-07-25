"""
Meal-photo macro estimation for the Precision Nutrition module.

This module is a scaffold: `classify_food` and `estimate_macros` show the
intended interface so the FastAPI backend can be wired up early, while the
actual model (a fine-tuned image classifier, or a call to a hosted vision
model) gets swapped in later.

Suggested approach for a first real version:
1. Fine-tune a lightweight image classifier (e.g. MobileNetV3 via
   TensorFlow/Keras) on a food-recognition dataset (Food-101 is a common
   starting point).
2. Map predicted classes to a nutrition lookup table (USDA FoodData
   Central is a free, comprehensive source).
3. Return a macro estimate with a confidence score, and let the user
   correct portion size in the UI (`nutrition/page.tsx` meal logger).
"""

from dataclasses import dataclass


@dataclass
class MacroEstimate:
    food_name: str
    confidence: float
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float


# Placeholder lookup table. Replace with a USDA FoodData Central query
# or a proper food-recognition model's output mapping.
_MOCK_NUTRITION_TABLE = {
    "grilled_chicken_breast": MacroEstimate("Grilled Chicken Breast", 0.0, 165, 31, 0, 3.6),
    "brown_rice": MacroEstimate("Brown Rice (1 cup)", 0.0, 216, 5, 45, 1.8),
    "mixed_salad": MacroEstimate("Mixed Green Salad", 0.0, 120, 3, 10, 8),
}


def classify_food(image_bytes: bytes) -> str:
    """Stub classifier. Replace with a real model inference call."""
    raise NotImplementedError(
        "Wire this up to a trained food-classification model before use."
    )


def estimate_macros(food_label: str, portion_multiplier: float = 1.0) -> MacroEstimate:
    base = _MOCK_NUTRITION_TABLE.get(food_label)
    if base is None:
        raise KeyError(f"No nutrition data available for '{food_label}'")

    return MacroEstimate(
        food_name=base.food_name,
        confidence=base.confidence,
        calories=round(base.calories * portion_multiplier),
        protein_g=round(base.protein_g * portion_multiplier, 1),
        carbs_g=round(base.carbs_g * portion_multiplier, 1),
        fat_g=round(base.fat_g * portion_multiplier, 1),
    )
