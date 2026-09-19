"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { Plus, Loader2, Utensils, CheckCircle2, AlertCircle, Sparkles, Search, Leaf } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchTodayMeals,
  fetchNutritionRecommendations,
  searchFoods,
  logMeal,
  ApiError,
  NutritionTargets,
  MealRecommendation,
  FoodItem,
} from "@/lib/api";
import { GamificationToastBanner, GamificationToastItem } from "@/components/GamificationToast";

function Macro({
  label,
  consumed,
  goal,
  unit,
  color,
}: {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, Math.round((consumed / goal) * 100));
  const remaining = Math.max(0, goal - consumed);
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium text-ink dark:text-white">{label}</span>
        <span className="text-ink-muted">
          {consumed}{unit} / {goal}{unit}
          <span className="text-xs text-primary ml-2 font-medium">({remaining}{unit} left)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function getDefaultRecommendedMeals(
  dietaryPref: string = "",
  goal: string = "",
  targets: NutritionTargets
): MealRecommendation[] {
  const prefLower = dietaryPref.toLowerCase();
  const isVeg = prefLower.includes("veg") && !prefLower.includes("non");
  const isVegan = prefLower.includes("vegan");

  let breakfastItems = "Greek yogurt + mixed berries + almond granola";
  let lunchItems = "Paneer & quinoa bowl + roasted vegetables & tahini dressing";
  let dinnerItems = "Dal tadka + brown rice + mixed vegetables + probiotic curd";
  let snacksItems = "Mixed raw almonds & walnuts + fresh apple slices";

  if (isVegan) {
    breakfastItems = "Oatmeal with chia seeds, sliced bananas & almond butter";
    lunchItems = "Tofu & brown rice power bowl + steamed broccoli & sesame dressing";
    dinnerItems = "Edamame & vegetable stir-fry with tofu + jasmine rice";
    snacksItems = "Hummus with cucumber sticks & whole wheat pita";
  } else if (!isVeg) {
    breakfastItems = "Egg white omelet with spinach, feta cheese & whole grain toast";
    lunchItems = "Grilled chicken breast + quinoa + roasted asparagus & lemon herbs";
    dinnerItems = "Pan-seared salmon fillet + sweet potato mash & steamed green beans";
    snacksItems = "Greek yogurt with chia seeds & berries";
  }

  const cals = targets.calories || 2200;
  const p = targets.protein_g || 150;
  const c = targets.carbs_g || 220;
  const f = targets.fat_g || 70;

  return [
    {
      id: "fallback-bf",
      name: "Breakfast",
      time: "7:30 AM",
      items: breakfastItems,
      calories: Math.round(cals * 0.25),
      protein_g: Math.round(p * 0.25),
      carbs_g: Math.round(c * 0.25),
      fat_g: Math.round(f * 0.25),
    },
    {
      id: "fallback-lu",
      name: "Lunch",
      time: "12:45 PM",
      items: lunchItems,
      calories: Math.round(cals * 0.35),
      protein_g: Math.round(p * 0.35),
      carbs_g: Math.round(c * 0.35),
      fat_g: Math.round(f * 0.35),
    },
    {
      id: "fallback-dn",
      name: "Dinner",
      time: "7:00 PM",
      items: dinnerItems,
      calories: Math.round(cals * 0.30),
      protein_g: Math.round(p * 0.30),
      carbs_g: Math.round(c * 0.30),
      fat_g: Math.round(f * 0.30),
    },
    {
      id: "fallback-sn",
      name: "Snacks",
      time: "4:30 PM",
      items: snacksItems,
      calories: Math.round(cals * 0.10),
      protein_g: Math.round(p * 0.10),
      carbs_g: Math.round(c * 0.10),
      fat_g: Math.round(f * 0.10),
    },
  ];
}

export default function NutritionPage() {
  const { user, token } = useAuth();

  const [loggedTotals, setLoggedTotals] = useState({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  });
  const [loggedMeals, setLoggedMeals] = useState<any[]>([]);
  const [targets, setTargets] = useState<NutritionTargets>({
    calories: 2200,
    protein_g: 150,
    carbs_g: 220,
    fat_g: 70,
  });
  const [recommendedMeals, setRecommendedMeals] = useState<MealRecommendation[]>([]);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Gamification Toasts
  const [gamiToasts, setGamiToasts] = useState<GamificationToastItem[]>([]);

  useEffect(() => {
    if (gamiToasts.length > 0) {
      const timer = setTimeout(() => {
        setGamiToasts((prev) => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [gamiToasts]);

  // Form states
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const loadMealsAndTargets = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([fetchTodayMeals(token), fetchNutritionRecommendations(token)])
      .then(([todayRes, recsRes]) => {
        setLoggedMeals(todayRes.meals || []);
        setLoggedTotals({
          calories: todayRes.totals?.calories || 0,
          protein_g: Math.round(todayRes.totals?.protein_g || 0),
          carbs_g: Math.round(todayRes.totals?.carbs_g || 0),
          fat_g: Math.round(todayRes.totals?.fat_g || 0),
        });

        if (recsRes?.targets) {
          setTargets(recsRes.targets);
        }
        if (recsRes?.recommended_meals && recsRes.recommended_meals.length > 0) {
          setRecommendedMeals(recsRes.recommended_meals);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadMealsAndTargets();
  }, [loadMealsAndTargets, user]);

  // Food Search Handler
  useEffect(() => {
    if (!searchQuery.trim() || !token) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchFoods(token, searchQuery)
        .then((items) => setSearchResults(items))
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !calories || !token) return;

    const mealName = name.trim();
    const mealCals = parseInt(calories, 10) || 0;

    // Prevent duplicates
    const isDuplicate = loggedMeals.some(
      (m) => m.name.toLowerCase() === mealName.toLowerCase() && m.calories === mealCals
    );
    if (isDuplicate) {
      setErrorMsg("You have already logged this meal today.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await logMeal(token, {
        name: mealName,
        calories: mealCals,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      });

      if (res.gamification) {
        const newToasts: GamificationToastItem[] = [];
        if (res.gamification.xp_gained > 0) {
          newToasts.push({
            id: Math.random().toString(),
            type: "xp",
            title: `+${res.gamification.xp_gained} XP 🎉`,
            description: "Meal logged!",
          });
        }
        if (res.gamification.leveled_up) {
          newToasts.push({
            id: Math.random().toString(),
            type: "level",
            title: "Level Up! 🚀",
            description: `You reached Level ${res.gamification.level}`,
          });
        }
        if (res.gamification.new_badges && res.gamification.new_badges.length > 0) {
          res.gamification.new_badges.forEach((b) => {
            newToasts.push({
              id: Math.random().toString(),
              type: "badge",
              title: "New Badge Unlocked! 🏆",
              description: b.name,
            });
          });
        }
        setGamiToasts((prev) => [...prev, ...newToasts]);
      }

      setSuccessMsg("Meal logged successfully!");
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setShowModal(false);
      loadMealsAndTargets();

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Could not log meal. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openModalWithMeal = (mealName: string, mealCals: number, p: number, c: number, f: number) => {
    setName(mealName);
    setCalories(String(mealCals));
    setProtein(String(p));
    setCarbs(String(c));
    setFat(String(f));
    setShowModal(true);
  };

  const totalCalories = loggedTotals.calories;
  const calorieGoal = targets.calories || 2200;
  const caloriesPct = Math.min(100, Math.round((totalCalories / calorieGoal) * 100));
  const remainingCalories = Math.max(0, calorieGoal - totalCalories);

  // Compute final meal plans list (guaranteed 4 cards)
  const displayMeals =
    recommendedMeals.length > 0
      ? recommendedMeals
      : getDefaultRecommendedMeals(user?.dietary_preference || "Vegetarian", user?.fitness_goal || "Build muscle", targets);

  return (
    <>
      <GamificationToastBanner
        toast={gamiToasts[0] || null}
        onClose={() => setGamiToasts((prev) => prev.slice(1))}
      />
      <Topbar
        placeholder="Search foods, recipes, or meals..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="px-6 lg:px-10 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink dark:text-white flex items-center gap-3">
              Nutrition
              {user?.dietary_preference && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
                  <Leaf size={12} /> {user.dietary_preference}
                </span>
              )}
            </h1>
            <p className="text-ink-muted mt-1">
              Personalized for {user?.name || "Athlete"} ({user?.fitness_goal || "Maintain fitness"} • {user?.activity_level || "Lightly active"})
            </p>
          </div>
          <button
            onClick={() => {
              setName("");
              setCalories("");
              setProtein("");
              setCarbs("");
              setFat("");
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
          >
            <Plus size={18} /> Log Meal
          </button>
        </div>

        {/* Search Results Display */}
        {searchQuery.trim() && (
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold text-ink dark:text-white flex items-center gap-2">
                <Search size={16} className="text-primary" /> Search Results for &quot;{searchQuery}&quot;
              </h2>
              <span className="text-xs text-ink-muted">
                Dietary Preference: <strong className="text-primary">{user?.dietary_preference || "Flexible"}</strong>
              </span>
            </div>

            {isSearching ? (
              <div className="flex items-center gap-2 text-sm text-ink-muted py-4">
                <Loader2 size={16} className="animate-spin text-primary" /> Searching options...
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-ink-muted py-2">
                No matching foods found adhering to your <strong>{user?.dietary_preference || "dietary"}</strong> preference.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-xl border border-black/10 dark:border-white/10 p-3 bg-white dark:bg-card-dark"
                  >
                    <div>
                      <h3 className="font-semibold text-sm text-ink dark:text-white">{item.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.dietary_tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                      <span className="text-xs text-ink-muted">
                        P: {item.protein_g}g • C: {item.carbs_g}g • F: {item.fat_g}g
                      </span>
                      <button
                        onClick={() => openModalWithMeal(item.name, item.calories, item.protein_g, item.carbs_g, item.fat_g)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        + Log
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 text-accent text-sm px-4 py-3 border border-accent/20">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="flex flex-col items-center text-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Calories Today
            </p>
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-black/5 dark:text-white/10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#D4A373"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - caloriesPct / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-display font-bold text-ink dark:text-white">
                  {totalCalories}
                </span>
                <span className="text-[11px] text-ink-muted">
                  of {calorieGoal} kcal
                </span>
              </div>
            </div>
            <p className="text-xs text-primary font-semibold">
              {remainingCalories} kcal remaining
            </p>
          </Card>

          <Card className="lg:col-span-2 flex flex-col justify-center gap-5">
            <Macro
              label="Protein"
              consumed={loggedTotals.protein_g}
              goal={targets.protein_g}
              unit="g"
              color="#2D6A4F"
            />
            <Macro
              label="Carbs"
              consumed={loggedTotals.carbs_g}
              goal={targets.carbs_g}
              unit="g"
              color="#40916C"
            />
            <Macro
              label="Fat"
              consumed={loggedTotals.fat_g}
              goal={targets.fat_g}
              unit="g"
              color="#D4A373"
            />
          </Card>
        </div>

        {/* Logged Meals & Recommended Meal Plans */}
        <Card>
          <h2 className="text-lg font-display font-semibold text-ink dark:text-white mb-4">
            Today&apos;s Logged Meals ({loggedMeals.length})
          </h2>

          {loggedMeals.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No meals logged today yet. Click &quot;Log Meal&quot; above to start tracking!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {loggedMeals.map((m, idx) => (
                <div
                  key={m._id || idx}
                  className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-ink dark:text-white">{m.name}</h3>
                    <span className="text-sm font-semibold text-primary">{m.calories} kcal</span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    P: {m.protein_g}g • C: {m.carbs_g}g • F: {m.fat_g}g
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 mb-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-ink dark:text-white flex items-center gap-2">
                Recommended Meal Plans <Sparkles size={16} className="text-accent" />
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Tailored for {user?.dietary_preference || "Vegetarian"} • {user?.fitness_goal || "Build muscle"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayMeals.map((meal) => (
              <div
                key={meal.id}
                className="rounded-xl border border-black/5 dark:border-white/10 p-4 hover:border-primary transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-ink dark:text-white">{meal.name}</h3>
                    <span className="text-xs text-ink-muted">{meal.time}</span>
                  </div>
                  <p className="text-sm text-ink-muted mb-3 leading-relaxed">{meal.items}</p>
                </div>
                <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-primary block">{meal.calories} kcal</span>
                    <span className="text-[11px] text-ink-muted">
                      P: {meal.protein_g}g • C: {meal.carbs_g}g • F: {meal.fat_g}g
                    </span>
                  </div>
                  <button
                    onClick={() => openModalWithMeal(meal.items, meal.calories, meal.protein_g, meal.carbs_g, meal.fat_g)}
                    className="text-xs font-semibold text-white bg-primary hover:bg-secondary px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>

      {/* Log Meal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-black/10 dark:border-white/10">
            <h3 className="text-lg font-bold text-ink dark:text-white mb-4">Log Today&apos;s Meal</h3>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 text-xs text-error bg-error/10 p-3 rounded-xl">
                <AlertCircle size={15} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                  Meal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Quinoa Bowl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="550"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    placeholder="30"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    placeholder="60"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    placeholder="18"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-primary text-white px-5 py-2 text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {submitting ? "Saving..." : "Save Meal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
