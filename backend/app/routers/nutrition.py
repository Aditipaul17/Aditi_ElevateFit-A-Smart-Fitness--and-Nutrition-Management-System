import base64
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException, Request
from pydantic import BaseModel

from app.database import meals_collection
from app.models.schemas import (
    MealLogCreate,
    NutritionTargetsOut,
    MealRecommendationOut,
    EvidenceSourceOut,
    NutritionRecommendationsResponse,
    MealScanResponse,
    FoodItemOut,
)
from app.routers.auth import get_current_user
from app.services.gemini import analyze_meal_image_with_ai

router = APIRouter(prefix="/nutrition", tags=["nutrition"])

class ImageScanPayload(BaseModel):
    image_base64: Optional[str] = None
    portion_multiplier: Optional[float] = 1.0

# Candidate meal dataset with dietary & allergen classification (ICMR IFCT & USDA Aligned)
CANDIDATE_MEALS = [
    # --- BREAKFAST ---
    {
        "id": "bf-1",
        "category": "breakfast",
        "name": "Breakfast",
        "time": "7:30 AM",
        "items": "Greek yogurt + mixed berries + almond granola",
        "is_vegetarian": True,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Vegetarian", "High Protein", "ICMR-NIN Aligned"],
        "goal_affinity": ["maintain fitness", "build muscle", "lose weight"],
    },
    {
        "id": "bf-2",
        "category": "breakfast",
        "name": "Breakfast",
        "time": "7:30 AM",
        "items": "Oatmeal with chia seeds, sliced bananas & almond butter",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "High Fiber", "WHO Healthy Diet"],
        "goal_affinity": ["maintain fitness", "lose weight"],
    },
    {
        "id": "bf-3",
        "category": "breakfast",
        "name": "Breakfast",
        "time": "7:30 AM",
        "items": "Paneer bhurji (scrambled cottage cheese) with whole wheat toast",
        "is_vegetarian": True,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Vegetarian", "High Protein", "ICMR IFCT"],
        "goal_affinity": ["build muscle", "maintain fitness"],
    },
    {
        "id": "bf-4",
        "category": "breakfast",
        "name": "Breakfast",
        "time": "7:30 AM",
        "items": "Tofu scramble with spinach, mushrooms & avocado toast",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "Plant Protein"],
        "goal_affinity": ["build muscle", "lose weight"],
    },
    {
        "id": "bf-5",
        "category": "breakfast",
        "name": "Breakfast",
        "time": "7:30 AM",
        "items": "Egg white omelet with spinach, feta cheese & whole grain toast",
        "is_vegetarian": False,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Non-Vegetarian", "High Protein", "Low Fat"],
        "goal_affinity": ["build muscle", "lose weight"],
    },
    {
        "id": "bf-6",
        "category": "breakfast",
        "name": "Breakfast",
        "time": "7:30 AM",
        "items": "Smoked salmon & avocado whole grain toast with poached egg",
        "is_vegetarian": False,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Non-Vegetarian", "Healthy Fats", "High Protein"],
        "goal_affinity": ["build muscle", "maintain fitness"],
    },
    {
        "id": "bf-7",
        "category": "breakfast",
        "name": "Breakfast",
        "time": "7:30 AM",
        "items": "Sprouted moong & besan chilla with mint coriander chutney",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "ICMR-NIN Cereal-Pulse Synergy"],
        "goal_affinity": ["maintain fitness", "lose weight", "build muscle"],
    },
    {
        "id": "bf-8",
        "category": "breakfast",
        "name": "Breakfast",
        "time": "7:30 AM",
        "items": "Steamed ragi idlis with sambar & flaxseed chutney",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "High Fiber", "Millet Power"],
        "goal_affinity": ["maintain fitness", "lose weight"],
    },

    # --- LUNCH ---
    {
        "id": "lu-1",
        "category": "lunch",
        "name": "Lunch",
        "time": "12:45 PM",
        "items": "Paneer & quinoa bowl + roasted vegetables & tahini dressing",
        "is_vegetarian": True,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Vegetarian", "High Protein", "Balanced"],
        "goal_affinity": ["build muscle", "maintain fitness"],
    },
    {
        "id": "lu-2",
        "category": "lunch",
        "name": "Lunch",
        "time": "12:45 PM",
        "items": "Tofu & brown rice power bowl + steamed broccoli & sesame dressing",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "Clean Energy"],
        "goal_affinity": ["lose weight", "maintain fitness"],
    },
    {
        "id": "lu-3",
        "category": "lunch",
        "name": "Lunch",
        "time": "12:45 PM",
        "items": "Mediterranean chickpea & avocado salad with quinoa & cucumber",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "High Fiber"],
        "goal_affinity": ["lose weight", "maintain fitness"],
    },
    {
        "id": "lu-4",
        "category": "lunch",
        "name": "Lunch",
        "time": "12:45 PM",
        "items": "Grilled chicken breast + quinoa + roasted asparagus & lemon herbs",
        "is_vegetarian": False,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Non-Vegetarian", "Lean Protein", "Low Carb"],
        "goal_affinity": ["lose weight", "build muscle"],
    },
    {
        "id": "lu-5",
        "category": "lunch",
        "name": "Lunch",
        "time": "12:45 PM",
        "items": "Salmon quinoa grain bowl + sweet potatoes & kale",
        "is_vegetarian": False,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Non-Vegetarian", "Omega-3", "High Protein"],
        "goal_affinity": ["build muscle", "maintain fitness"],
    },
    {
        "id": "lu-6",
        "category": "lunch",
        "name": "Lunch",
        "time": "12:45 PM",
        "items": "Rajma masala + brown rice + cucumber tomato kachumber & probiotic curd",
        "is_vegetarian": True,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Vegetarian", "ICMR-NIN 3:1 Ratio", "Gut Health"],
        "goal_affinity": ["maintain fitness", "build muscle", "lose weight"],
    },

    # --- DINNER ---
    {
        "id": "dn-1",
        "category": "dinner",
        "name": "Dinner",
        "time": "7:00 PM",
        "items": "Dal tadka + brown rice + mixed vegetables + probiotic curd",
        "is_vegetarian": True,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Vegetarian", "Gut Health", "Comfort Meal"],
        "goal_affinity": ["maintain fitness", "lose weight"],
    },
    {
        "id": "dn-2",
        "category": "dinner",
        "name": "Dinner",
        "time": "7:00 PM",
        "items": "Edamame & vegetable stir-fry with tofu + jasmine rice",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "Low Fat"],
        "goal_affinity": ["lose weight", "maintain fitness"],
    },
    {
        "id": "dn-3",
        "category": "dinner",
        "name": "Dinner",
        "time": "7:00 PM",
        "items": "Paneer tikka wrap with mint yogurt & roasted zucchini",
        "is_vegetarian": True,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Vegetarian", "High Protein"],
        "goal_affinity": ["build muscle", "maintain fitness"],
    },
    {
        "id": "dn-4",
        "category": "dinner",
        "name": "Dinner",
        "time": "7:00 PM",
        "items": "Pan-seared salmon fillet + sweet potato mash & steamed green beans",
        "is_vegetarian": False,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Non-Vegetarian", "Omega-3", "Lean Protein"],
        "goal_affinity": ["maintain fitness", "build muscle"],
    },
    {
        "id": "dn-5",
        "category": "dinner",
        "name": "Dinner",
        "time": "7:00 PM",
        "items": "Herb roasted chicken breast + brown rice & grilled veggies",
        "is_vegetarian": False,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Non-Vegetarian", "High Protein"],
        "goal_affinity": ["build muscle", "lose weight"],
    },
    {
        "id": "dn-6",
        "category": "dinner",
        "name": "Dinner",
        "time": "7:00 PM",
        "items": "Palak tofu curry with bajra (millet) roti & cucumber salad",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "Micronutrient Rich", "ICMR-NIN Aligned"],
        "goal_affinity": ["lose weight", "maintain fitness"],
    },

    # --- SNACKS ---
    {
        "id": "sn-1",
        "category": "snacks",
        "name": "Snacks",
        "time": "4:30 PM",
        "items": "Mixed raw almonds & walnuts + fresh apple slices",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "Healthy Fats"],
        "goal_affinity": ["maintain fitness", "lose weight"],
    },
    {
        "id": "sn-2",
        "category": "snacks",
        "name": "Snacks",
        "time": "4:30 PM",
        "items": "Greek yogurt with chia seeds & berries",
        "is_vegetarian": True,
        "is_vegan": False,
        "is_keto": False,
        "tags": ["Vegetarian", "High Protein"],
        "goal_affinity": ["build muscle", "maintain fitness"],
    },
    {
        "id": "sn-3",
        "category": "snacks",
        "name": "Snacks",
        "time": "4:30 PM",
        "items": "Hummus with cucumber sticks & whole wheat pita",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "Fiber Rich"],
        "goal_affinity": ["maintain fitness", "lose weight"],
    },
    {
        "id": "sn-4",
        "category": "snacks",
        "name": "Snacks",
        "time": "4:30 PM",
        "items": "Plant protein shake with banana & almond milk",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "Post Workout"],
        "goal_affinity": ["build muscle", "maintain fitness"],
    },
    {
        "id": "sn-5",
        "category": "snacks",
        "name": "Snacks",
        "time": "4:30 PM",
        "items": "Hard boiled eggs with sea salt & cucumber slices",
        "is_vegetarian": False,
        "is_vegan": False,
        "is_keto": True,
        "tags": ["Non-Vegetarian", "Keto", "High Protein"],
        "goal_affinity": ["build muscle", "lose weight"],
    },
    {
        "id": "sn-6",
        "category": "snacks",
        "name": "Snacks",
        "time": "4:30 PM",
        "items": "Roasted chana (chickpeas) & pumpkin seeds with lemon spice",
        "is_vegetarian": True,
        "is_vegan": True,
        "is_keto": False,
        "tags": ["Vegan", "Vegetarian", "High Fiber", "ICMR Snack"],
        "goal_affinity": ["maintain fitness", "lose weight"],
    },
]


def calculate_nutrition_targets(user_profile: dict) -> NutritionTargetsOut:
    """Calculates evidence-based daily calorie and macro targets based on ICMR-NIN & WHO dietary guidelines."""
    age = user_profile.get("age")
    if not isinstance(age, (int, float)) or age <= 0:
        age = 25

    gender = str(user_profile.get("gender") or "female").lower()

    height = user_profile.get("height")
    if not isinstance(height, (int, float)) or height <= 0:
        height = 170.0

    weight = user_profile.get("weight")
    if not isinstance(weight, (int, float)) or weight <= 0:
        weight = 70.0

    fitness_goal = str(user_profile.get("fitness_goal") or "maintain fitness").lower()
    activity_level = str(user_profile.get("activity_level") or "lightly active").lower()

    # 1. BMR (Mifflin-St Jeor equation)
    if "male" in gender and "female" not in gender:
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
    elif "female" in gender:
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161
    else:
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 78

    # 2. Activity Level Multiplier (ICMR / WHO TDEE multipliers)
    if "sedentary" in activity_level:
        activity_multiplier = 1.2
    elif "lightly" in activity_level:
        activity_multiplier = 1.375
    elif "moderately" in activity_level:
        activity_multiplier = 1.55
    elif "very" in activity_level or "extremely" in activity_level:
        activity_multiplier = 1.725
    else:
        activity_multiplier = 1.375

    tdee = bmr * activity_multiplier

    # 3. Fitness Goal Caloric Adjustment (Evidence-based deficit/surplus)
    if "lose weight" in fitness_goal or "fat loss" in fitness_goal:
        target_cals = max(1200, tdee - 400)
    elif "muscle" in fitness_goal or "hypertrophy" in fitness_goal:
        target_cals = tdee + 350
    elif "endurance" in fitness_goal or "sport" in fitness_goal:
        target_cals = tdee + 250
    else:
        target_cals = tdee

    target_cals = int(round(target_cals / 10.0) * 10)

    # 4. Macro targets (ICMR-NIN & WHO Recommended Splits)
    # ICMR-NIN recommends 0.83g - 2.0g/kg protein depending on activity & hypertrophy goals.
    # WHO recommends total fat < 30% of energy intake.
    if "muscle" in fitness_goal or "hypertrophy" in fitness_goal:
        protein_g = max(60, int(round(weight * 2.0)))
        fat_g = max(35, int(round((target_cals * 0.25) / 9.0)))
    elif "lose weight" in fitness_goal:
        protein_g = max(70, int(round(weight * 2.2)))
        fat_g = max(35, int(round((target_cals * 0.25) / 9.0)))
    else:
        protein_g = max(50, int(round(weight * 1.6)))
        fat_g = max(40, int(round((target_cals * 0.28) / 9.0)))

    cals_from_protein_fat = (protein_g * 4) + (fat_g * 9)
    carbs_cals = max(0, target_cals - cals_from_protein_fat)
    carbs_g = max(40, int(round(carbs_cals / 4.0)))
    
    # Dynamic Fiber target (ICMR-NIN recommends min 30g/day)
    fiber_g = max(30, int(round(target_cals / 70.0)))

    return NutritionTargetsOut(
        calories=target_cals,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
        fiber_g=fiber_g,
    )


def generate_evidence_and_guidance(user_profile: dict, targets: NutritionTargetsOut) -> dict:
    """Generates source references, verified nutritionist notes, and personalized metrics summary."""
    goal = str(user_profile.get("fitness_goal") or "Maintain fitness")
    diet = str(user_profile.get("dietary_preference") or "Vegetarian")
    weight = user_profile.get("weight") or 70.0

    protein_ratio = round(targets.protein_g / max(1.0, float(weight)), 2)

    evidence_sources = [
        EvidenceSourceOut(
            name="ICMR-NIN Dietary Guidelines for Indians (2024)",
            authority="Indian Council of Medical Research & National Institute of Nutrition",
            summary="Recommends a macronutrient distribution of 50-56% complex carbohydrates, 10-15% protein (0.83-2.0g/kg based on physical activity), 20-30% healthy fats, minimum 30g daily fiber, and a 3:1 cereal-to-pulse ratio for complete amino acid profiles.",
            reference_url="https://www.nin.res.in/dietaryguidelines/",
        ),
        EvidenceSourceOut(
            name="WHO Healthy Diet Standard",
            authority="World Health Organization",
            summary="Advises limiting free sugars to <5-10% of total energy, total fat to <30% of energy (favoring unsaturated fats from nuts, seeds, and oils), sodium <2000mg (<5g salt/day), and at least 400g of fruits & vegetables daily.",
            reference_url="https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
        ),
        EvidenceSourceOut(
            name="ICMR IFCT 2024 & USDA FoodData Central",
            authority="Indian Food Composition Tables & USDA Food Data System",
            summary="Validated nutrient analysis reference database providing accurate energy, macronutrient, and micronutrient profiles per 100g serving.",
            reference_url="https://fdc.nal.usda.gov/",
        ),
    ]

    guidance_notes = [
        f"Goal-Based Protein Target: Formulated at {protein_ratio}g protein/kg body weight based on your '{goal}' objective. ICMR-NIN guidelines advise spreading protein evenly across 4 daily meals to optimize muscle protein synthesis.",
        f"Cereal-to-Pulse Synergy: For {diet} preferences, pair grains (brown rice, whole wheat, millets) with legumes (dal, chickpeas, rajma) in a 3:1 ratio to ensure a complete essential amino acid profile.",
        "Micronutrient & Fiber Density: Your daily plan targets 30g+ of dietary fiber and 400g+ of whole plant foods to support gut microbiome diversity, insulin sensitivity, and satiety.",
    ]

    food_prefs = user_profile.get("food_preferences") or []
    if isinstance(food_prefs, list) and len(food_prefs) > 0:
        allergens = ", ".join(food_prefs)
        guidance_notes.append(f"Allergen & Preference Safeguard: Strict filtering active for: {allergens}.")

    user_metrics_summary = {
        "protein_per_kg": f"{protein_ratio} g/kg",
        "fiber_target": f"{targets.fiber_g} g/day",
        "recommended_water": "2.5 - 3.5 Liters/day",
        "cereal_pulse_ratio": "3:1 (Complete Protein)",
    }

    return {
        "evidence_sources": evidence_sources,
        "guidance_notes": guidance_notes,
        "user_metrics_summary": user_metrics_summary,
    }


async def generate_recommended_meals(
    user_profile: dict, targets: NutritionTargetsOut
) -> List[MealRecommendationOut]:
    """Generates 4 personalized meal cards dynamically using AI (Gemini/Groq) tailored to athlete profile & targets."""
    from app.services.gemini import generate_ai_meal_recommendations
    raw_meals = await generate_ai_meal_recommendations(user_profile, targets.model_dump())
    return [MealRecommendationOut(**m) for m in raw_meals]


@router.get("/recommendations", response_model=NutritionRecommendationsResponse)
async def get_nutrition_recommendations(current_user: dict = Depends(get_current_user)):
    targets = calculate_nutrition_targets(current_user)
    meals = await generate_recommended_meals(current_user, targets)
    extra = generate_evidence_and_guidance(current_user, targets)
    return NutritionRecommendationsResponse(
        targets=targets,
        recommended_meals=meals,
        evidence_sources=extra["evidence_sources"],
        guidance_notes=extra["guidance_notes"],
        user_metrics_summary=extra["user_metrics_summary"],
    )


@router.post("/scan-meal", response_model=MealScanResponse)
async def scan_meal_image(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """Identifies food items and estimates macros from uploaded/captured meal image."""
    image_bytes = None
    mime_type = "image/jpeg"
    mult = 1.0

    content_type = request.headers.get("content-type", "").lower()
    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file = form.get("file")
        if uploaded_file and hasattr(uploaded_file, "read"):
            image_bytes = await uploaded_file.read()
            if hasattr(uploaded_file, "content_type") and uploaded_file.content_type:
                mime_type = uploaded_file.content_type
        mult_val = form.get("portion_multiplier")
        if mult_val:
            try:
                mult = float(mult_val)
            except ValueError:
                mult = 1.0
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        raw_b64 = body.get("image_base64", "")
        if raw_b64:
            if "," in raw_b64:
                header, raw_b64 = raw_b64.split(",", 1)
                if "png" in header:
                    mime_type = "image/png"
                elif "webp" in header:
                    mime_type = "image/webp"
            try:
                image_bytes = base64.b64decode(raw_b64)
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid base64 image data")
        mult_val = body.get("portion_multiplier")
        if mult_val:
            try:
                mult = float(mult_val)
            except ValueError:
                mult = 1.0

    if not image_bytes:
        raise HTTPException(status_code=400, detail="No image file or base64 data provided")

    res = await analyze_meal_image_with_ai(image_bytes, mime_type)

    if mult != 1.0:
        res["calories"] = round(res["calories"] * mult)
        res["protein_g"] = round(res["protein_g"] * mult, 1)
        res["carbs_g"] = round(res["carbs_g"] * mult, 1)
        res["fat_g"] = round(res["fat_g"] * mult, 1)

    return MealScanResponse(**res)


@router.get("/search", response_model=List[FoodItemOut])
async def search_foods(
    q: str = Query("", min_length=0), current_user: dict = Depends(get_current_user)
):
    dietary_pref = str(current_user.get("dietary_preference") or "").lower().strip()
    query_str = q.lower().strip()

    def satisfies_diet(meal: dict) -> bool:
        if "vegan" in dietary_pref:
            return meal["is_vegan"] is True
        if "vegetarian" in dietary_pref:
            return meal["is_vegetarian"] is True
        if "keto" in dietary_pref:
            return meal["is_keto"] is True or meal["is_vegetarian"] is True
        return True

    results = []
    for m in CANDIDATE_MEALS:
        if not satisfies_diet(m):
            continue
        if (
            not query_str
            or query_str in m["items"].lower()
            or query_str in m["name"].lower()
            or any(query_str in t.lower() for t in m["tags"])
        ):
            results.append(
                FoodItemOut(
                    name=m["items"],
                    calories=350,
                    protein_g=20.0,
                    carbs_g=40.0,
                    fat_g=10.0,
                    dietary_tags=m["tags"],
                )
            )

    return results


@router.post("/meals", status_code=201)
async def log_meal(payload: MealLogCreate, current_user: dict = Depends(get_current_user)):
    from app.routers.gamification import process_user_activity

    doc = payload.model_dump()
    doc["user_id"] = str(current_user["_id"])
    result = await meals_collection.insert_one(doc)

    gamification_res = await process_user_activity(str(current_user["_id"]), "meal")

    return {
        "id": str(result.inserted_id),
        "gamification": gamification_res.model_dump(),
    }


@router.get("/meals/today")
async def today_meals(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date()
    start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)

    docs = await meals_collection.find(
        {"user_id": str(current_user["_id"]), "logged_at": {"$gte": start}}
    ).to_list(length=100)

    formatted_meals = []
    totals = {"calories": 0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0}
    for meal in docs:
        meal["_id"] = str(meal["_id"])
        formatted_meals.append(meal)
        totals["calories"] += meal.get("calories", 0)
        totals["protein_g"] += meal.get("protein_g", 0)
        totals["carbs_g"] += meal.get("carbs_g", 0)
        totals["fat_g"] += meal.get("fat_g", 0)
        totals["fiber_g"] += meal.get("fiber_g", 0)

    return {"meals": formatted_meals, "totals": totals}
