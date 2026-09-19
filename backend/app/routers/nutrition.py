from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.database import meals_collection
from app.models.schemas import (
    MealLogCreate,
    NutritionTargetsOut,
    MealRecommendationOut,
    NutritionRecommendationsResponse,
    FoodItemOut,
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/nutrition", tags=["nutrition"])

# Candidate meal dataset with dietary classification
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
        "tags": ["Vegetarian", "High Protein", "Breakfast"],
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
        "tags": ["Vegan", "Vegetarian", "High Fiber"],
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
        "tags": ["Vegetarian", "High Protein"],
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
]


def calculate_nutrition_targets(user_profile: dict) -> NutritionTargetsOut:
    """Calculates personalized daily calorie and macro targets based on user profile metrics."""
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

    # 2. Activity Level Multiplier
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

    # 3. Fitness Goal Adjustment
    if "lose weight" in fitness_goal:
        target_cals = max(1200, tdee - 400)
    elif "muscle" in fitness_goal:
        target_cals = tdee + 350
    elif "endurance" in fitness_goal or "sport" in fitness_goal:
        target_cals = tdee + 250
    else:
        target_cals = tdee

    target_cals = int(round(target_cals / 10.0) * 10)

    # 4. Macro targets
    if "muscle" in fitness_goal:
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

    return NutritionTargetsOut(
        calories=target_cals,
        protein_g=protein_g,
        carbs_g=carbs_g,
        fat_g=fat_g,
    )


def generate_recommended_meals(
    user_profile: dict, targets: NutritionTargetsOut
) -> List[MealRecommendationOut]:
    """Generates 4 meal cards (Breakfast, Lunch, Dinner, Snacks) tailored to user dietary preference & targets."""
    dietary_pref = str(user_profile.get("dietary_preference") or "").lower().strip()
    fitness_goal = str(user_profile.get("fitness_goal") or "").lower().strip()

    food_prefs = user_profile.get("food_preferences") or []
    if isinstance(food_prefs, str):
        food_prefs = [food_prefs]
    food_prefs_lower = [fp.lower() for fp in food_prefs]

    # Strictly filter candidate meals by dietary preference & allergies
    def satisfies_diet(meal: dict) -> bool:
        items_str = meal["items"].lower()

        # Dietary preference filter
        if "vegan" in dietary_pref:
            if not meal["is_vegan"]:
                return False
        elif "vegetarian" in dietary_pref and "non" not in dietary_pref:
            if not meal["is_vegetarian"]:
                return False
        elif "keto" in dietary_pref:
            if not (meal["is_keto"] or meal["is_vegetarian"]):
                return False

        # Allergy / Preference filters
        for fp in food_prefs_lower:
            if "nut" in fp and "free" in fp or "nut allergy" in fp:
                if any(nut in items_str for nut in ["almond", "walnut", "peanut", "cashew", "nut"]):
                    return False
            if "dairy" in fp and "free" in fp:
                if any(dairy in items_str for dairy in ["yogurt", "paneer", "feta", "cheese", "curd", "milk"]):
                    return False
            if "gluten" in fp and "free" in fp:
                if any(g in items_str for g in ["wheat", "bread", "toast", "pita", "wrap"]):
                    return False

        return True

    filtered_candidates = [m for m in CANDIDATE_MEALS if satisfies_diet(m)]

    categories = ["breakfast", "lunch", "dinner", "snacks"]
    slots = {
        "breakfast": {"pct": 0.25, "default_time": "7:30 AM", "name": "Breakfast"},
        "lunch": {"pct": 0.35, "default_time": "12:45 PM", "name": "Lunch"},
        "dinner": {"pct": 0.30, "default_time": "7:00 PM", "name": "Dinner"},
        "snacks": {"pct": 0.10, "default_time": "4:30 PM", "name": "Snacks"},
    }

    result = []
    for cat in categories:
        cat_candidates = [m for m in filtered_candidates if m["category"] == cat]
        if not cat_candidates:
            cat_candidates = filtered_candidates or CANDIDATE_MEALS

        best_candidate = cat_candidates[0]
        for c in cat_candidates:
            if any(g in fitness_goal for g in c.get("goal_affinity", [])):
                best_candidate = c
                break

        pct = slots[cat]["pct"]
        meal_cals = int(round(targets.calories * pct))
        meal_p = int(round(targets.protein_g * pct))
        meal_c = int(round(targets.carbs_g * pct))
        meal_f = int(round(targets.fat_g * pct))

        result.append(
            MealRecommendationOut(
                id=best_candidate["id"],
                name=slots[cat]["name"],
                time=best_candidate.get("time", slots[cat]["default_time"]),
                items=best_candidate["items"],
                calories=meal_cals,
                protein_g=meal_p,
                carbs_g=meal_c,
                fat_g=meal_f,
            )
        )

    return result


@router.get("/recommendations", response_model=NutritionRecommendationsResponse)
async def get_nutrition_recommendations(current_user: dict = Depends(get_current_user)):
    targets = calculate_nutrition_targets(current_user)
    meals = generate_recommended_meals(current_user, targets)
    return NutritionRecommendationsResponse(targets=targets, recommended_meals=meals)


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
    totals = {"calories": 0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0}
    for meal in docs:
        meal["_id"] = str(meal["_id"])
        formatted_meals.append(meal)
        totals["calories"] += meal.get("calories", 0)
        totals["protein_g"] += meal.get("protein_g", 0)
        totals["carbs_g"] += meal.get("carbs_g", 0)
        totals["fat_g"] += meal.get("fat_g", 0)

    return {"meals": formatted_meals, "totals": totals}


