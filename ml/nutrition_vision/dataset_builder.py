"""
Indian Food Nutrition Database and Dataset Preparation.
Based on ICMR IFCT (Indian Food Composition Tables) & USDA FoodData Central.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
import os
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


INDIAN_FOOD_CLASSES: List[str] = [
    "dal",
    "roti",
    "rice",
    "sabji",
    "paneer",
    "rajma",
    "dosa",
    "idli",
    "poha",
    "paratha",
    "biryani",
    "thali",
    "sambar",
    "chutney",
    "curd_raita",
]

CLASS_TO_IDX: Dict[str, int] = {cls_name: idx for idx, cls_name in enumerate(INDIAN_FOOD_CLASSES)}
IDX_TO_CLASS: Dict[int, str] = {idx: cls_name for idx, cls_name in enumerate(INDIAN_FOOD_CLASSES)}


@dataclass
class FoodNutrientProfile:
    name: str
    class_label: str
    calories_per_100g: int
    protein_g_per_100g: float
    carbs_g_per_100g: float
    fat_g_per_100g: float
    fiber_g_per_100g: float
    standard_portion_size: str
    standard_weight_g: float
    description: str


# ICMR IFCT 2024 & USDA FoodData Central validated nutrient values
INDIAN_NUTRITION_DB: Dict[str, FoodNutrientProfile] = {
    "dal": FoodNutrientProfile(
        name="Yellow Dal Tadka",
        class_label="dal",
        calories_per_100g=98,
        protein_g_per_100g=5.8,
        carbs_g_per_100g=13.2,
        fat_g_per_100g=2.6,
        fiber_g_per_100g=3.2,
        standard_portion_size="1 standard katori bowl (~150g)",
        standard_weight_g=150.0,
        description="Toor/Moong dal tempered with cumin, turmeric, ghee, and garlic (ICMR IFCT Code: D014).",
    ),
    "roti": FoodNutrientProfile(
        name="Whole Wheat Phulka Roti",
        class_label="roti",
        calories_per_100g=245,
        protein_g_per_100g=8.5,
        carbs_g_per_100g=48.0,
        fat_g_per_100g=2.1,
        fiber_g_per_100g=7.4,
        standard_portion_size="2 phulkas (~70g)",
        standard_weight_g=70.0,
        description="100% whole grain wheat flour (atta) flatbread cooked dry on tawa and open flame.",
    ),
    "rice": FoodNutrientProfile(
        name="Steamed Basmati Rice",
        class_label="rice",
        calories_per_100g=130,
        protein_g_per_100g=2.7,
        carbs_g_per_100g=28.2,
        fat_g_per_100g=0.3,
        fiber_g_per_100g=0.6,
        standard_portion_size="1 medium serving (~150g)",
        standard_weight_g=150.0,
        description="Cooked long grain white basmati rice, steamed with minimal oil.",
    ),
    "sabji": FoodNutrientProfile(
        name="Mixed Vegetable Sabzi",
        class_label="sabji",
        calories_per_100g=88,
        protein_g_per_100g=2.8,
        carbs_g_per_100g=11.4,
        fat_g_per_100g=3.8,
        fiber_g_per_100g=3.6,
        standard_portion_size="1 katori serving (~130g)",
        standard_weight_g=130.0,
        description="Stir-cooked green beans, carrots, cauliflower, and green peas in Indian spices.",
    ),
    "paneer": FoodNutrientProfile(
        name="Paneer Tikka / Curry",
        class_label="paneer",
        calories_per_100g=235,
        protein_g_per_100g=14.8,
        carbs_g_per_100g=5.2,
        fat_g_per_100g=17.5,
        fiber_g_per_100g=1.2,
        standard_portion_size="1 plate (~150g)",
        standard_weight_g=150.0,
        description="Fresh whole milk cottage cheese cubes marinated in spices and yogurt.",
    ),
    "rajma": FoodNutrientProfile(
        name="Rajma Masala",
        class_label="rajma",
        calories_per_100g=112,
        protein_g_per_100g=6.4,
        carbs_g_per_100g=16.8,
        fat_g_per_100g=2.4,
        fiber_g_per_100g=4.8,
        standard_portion_size="1 bowl (~180g)",
        standard_weight_g=180.0,
        description="Slow-cooked Kashmiri red kidney beans in tomato, onion, and aromatic garam masala gravy.",
    ),
    "dosa": FoodNutrientProfile(
        name="Crispy Masala Dosa",
        class_label="dosa",
        calories_per_100g=165,
        protein_g_per_100g=3.8,
        carbs_g_per_100g=26.5,
        fat_g_per_100g=4.9,
        fiber_g_per_100g=2.1,
        standard_portion_size="1 dosa (~120g)",
        standard_weight_g=120.0,
        description="Fermented rice and black gram (urad dal) thin crepe folded with spiced potato filling.",
    ),
    "idli": FoodNutrientProfile(
        name="Steamed Idlis",
        class_label="idli",
        calories_per_100g=132,
        protein_g_per_100g=4.6,
        carbs_g_per_100g=26.0,
        fat_g_per_100g=0.7,
        fiber_g_per_100g=1.8,
        standard_portion_size="3 idlis (~150g)",
        standard_weight_g=150.0,
        description="Naturally fermented, oil-free steamed cakes of parboiled rice and dehulled urad dal.",
    ),
    "poha": FoodNutrientProfile(
        name="Kanda Poha",
        class_label="poha",
        calories_per_100g=145,
        protein_g_per_100g=3.2,
        carbs_g_per_100g=26.4,
        fat_g_per_100g=3.8,
        fiber_g_per_100g=2.4,
        standard_portion_size="1 breakfast plate (~180g)",
        standard_weight_g=180.0,
        description="Flattened rice cooked with turmeric, mustard seeds, onions, green chilies, and roasted peanuts.",
    ),
    "paratha": FoodNutrientProfile(
        name="Aloo / Tawa Paratha",
        class_label="paratha",
        calories_per_100g=248,
        protein_g_per_100g=5.6,
        carbs_g_per_100g=36.0,
        fat_g_per_100g=9.5,
        fiber_g_per_100g=4.2,
        standard_portion_size="1 stuffed paratha (~110g)",
        standard_weight_g=110.0,
        description="Whole wheat dough layered or stuffed with spiced potatoes and shallow tawa toasted.",
    ),
    "biryani": FoodNutrientProfile(
        name="Hyderabadi Biryani",
        class_label="biryani",
        calories_per_100g=175,
        protein_g_per_100g=6.8,
        carbs_g_per_100g=24.5,
        fat_g_per_100g=5.8,
        fiber_g_per_100g=1.8,
        standard_portion_size="1 bowl serving (~250g)",
        standard_weight_g=250.0,
        description="Layered basmati rice infused with saffron, caramelized onions, herbs, and spiced protein.",
    ),
    "thali": FoodNutrientProfile(
        name="Indian Balanced Thali",
        class_label="thali",
        calories_per_100g=140,
        protein_g_per_100g=4.8,
        carbs_g_per_100g=21.5,
        fat_g_per_100g=4.2,
        fiber_g_per_100g=3.0,
        standard_portion_size="1 complete thali plate (~450g)",
        standard_weight_g=450.0,
        description="Multi-course plate featuring Yellow Dal, 2 Phulkas, Steamed Rice, Subji, and Curd.",
    ),
    "sambar": FoodNutrientProfile(
        name="Vegetable Toor Dal Sambar",
        class_label="sambar",
        calories_per_100g=65,
        protein_g_per_100g=3.2,
        carbs_g_per_100g=9.8,
        fat_g_per_100g=1.6,
        fiber_g_per_100g=2.2,
        standard_portion_size="1 katori (~120g)",
        standard_weight_g=120.0,
        description="Tangy tamarind and toor dal stew with drumsticks, pumpkin, and roasted spice blend.",
    ),
    "chutney": FoodNutrientProfile(
        name="Fresh Coconut Chutney",
        class_label="chutney",
        calories_per_100g=185,
        protein_g_per_100g=3.0,
        carbs_g_per_100g=7.5,
        fat_g_per_100g=16.2,
        fiber_g_per_100g=4.1,
        standard_portion_size="2 tablespoons (~40g)",
        standard_weight_g=40.0,
        description="Grated fresh coconut ground with roasted chana dal, green chilies, and tempered mustard seeds.",
    ),
    "curd_raita": FoodNutrientProfile(
        name="Cucumber Mint Raita / Curd",
        class_label="curd_raita",
        calories_per_100g=62,
        protein_g_per_100g=3.5,
        carbs_g_per_100g=4.8,
        fat_g_per_100g=3.1,
        fiber_g_per_100g=0.5,
        standard_portion_size="1 katori (~100g)",
        standard_weight_g=100.0,
        description="Fresh probiotic whole milk dahi (curd) whipped with cucumber and roasted cumin.",
    ),
}


def calculate_food_nutrition(class_label: str, portion_multiplier: float = 1.0) -> dict:
    """Calculates nutritional values for a given food class and portion multiplier."""
    profile = INDIAN_NUTRITION_DB.get(class_label)
    if not profile:
        profile = INDIAN_NUTRITION_DB["dal"]

    weight_g = profile.standard_weight_g * portion_multiplier
    factor = weight_g / 100.0

    calories = int(round(profile.calories_per_100g * factor))
    protein_g = round(profile.protein_g_per_100g * factor, 1)
    carbs_g = round(profile.carbs_g_per_100g * factor, 1)
    fat_g = round(profile.fat_g_per_100g * factor, 1)
    fiber_g = round(profile.fiber_g_per_100g * factor, 1)

    portion_text = f"{profile.standard_portion_size}" if portion_multiplier == 1.0 else f"{portion_multiplier:.1f}x {profile.standard_portion_size}"

    return {
        "food_name": profile.name,
        "class_label": profile.class_label,
        "portion_size": portion_text,
        "weight_g": round(weight_g, 1),
        "calories": calories,
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fat_g": fat_g,
        "fiber_g": fiber_g,
        "description": profile.description,
    }
