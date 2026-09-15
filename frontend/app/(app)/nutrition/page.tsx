"use client";

import { useCallback, useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { meals } from "@/lib/data";
import { motion } from "framer-motion";
import { Plus, Loader2, Utensils, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { fetchTodayMeals, logMeal, ApiError } from "@/lib/api";
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
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium text-ink dark:text-white">{label}</span>
        <span className="text-ink-muted">
          {consumed}
          {unit} / {goal}
          {unit}
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

export default function NutritionPage() {
  const { token } = useAuth();
  const [loggedTotals, setLoggedTotals] = useState({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
  });
  const [loggedMeals, setLoggedMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
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

  const loadMeals = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetchTodayMeals(token)
      .then((res) => {
        setLoggedMeals(res.meals || []);
        setLoggedTotals({
          calories: res.totals?.calories || 0,
          protein_g: Math.round(res.totals?.protein_g || 0),
          carbs_g: Math.round(res.totals?.carbs_g || 0),
          fat_g: Math.round(res.totals?.fat_g || 0),
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);


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
            newToasts.push({ id: Math.random().toString(), type: "xp", title: `+${res.gamification.xp_gained} XP 🎉`, description: "Meal logged!" });
          }
          if (res.gamification.leveled_up) {
            newToasts.push({ id: Math.random().toString(), type: "level", title: "Level Up! 🚀", description: `You reached Level ${res.gamification.level}` });
          }
          if (res.gamification.new_badges && res.gamification.new_badges.length > 0) {
            res.gamification.new_badges.forEach(b => {
              newToasts.push({ id: Math.random().toString(), type: "badge", title: "New Badge Unlocked! 🏆", description: b.name });
            });
          }
          setGamiToasts(prev => [...prev, ...newToasts]);
      }

      setSuccessMsg("Meal logged successfully!");
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setShowModal(false);
      loadMeals();

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

  const calorieGoal = 2400;
  const totalCalories = loggedTotals.calories;
  const caloriesPct = Math.min(100, Math.round((totalCalories / calorieGoal) * 100));

  return (
    <>
      <GamificationToastBanner toast={gamiToasts[0] || null} onClose={() => setGamiToasts(prev => prev.slice(1))} />
      <Topbar placeholder="Search foods, recipes, or meals..." />
      <main className="px-6 lg:px-10 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
              Nutrition
            </h1>
            <p className="text-ink-muted mt-1">
              Track today&apos;s intake and stay aligned with your goals.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
          >
            <Plus size={18} /> Log Meal
          </button>
        </div>

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
          </Card>

          <Card className="lg:col-span-2 flex flex-col justify-center gap-5">
            <Macro label="Protein" consumed={loggedTotals.protein_g} goal={160} unit="g" color="#2D6A4F" />
            <Macro label="Carbs" consumed={loggedTotals.carbs_g} goal={250} unit="g" color="#40916C" />
            <Macro label="Fat" consumed={loggedTotals.fat_g} goal={70} unit="g" color="#D4A373" />
          </Card>
        </div>

        {/* Logged Meals & Recipes */}
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

          <h2 className="text-lg font-display font-semibold text-ink dark:text-white mt-6 mb-4">
            Recommended Meal Plans
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="rounded-xl border border-black/5 dark:border-white/10 p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-ink dark:text-white">{meal.name}</h3>
                  <span className="text-xs text-ink-muted">{meal.time}</span>
                </div>
                <p className="text-sm text-ink-muted mb-3">{meal.items}</p>
                <span className="text-sm font-semibold text-primary">{meal.calories} kcal</span>
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
                <label className="block text-xs font-semibold text-ink dark:text-white mb-1">Meal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grilled Chicken Bowl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">Calories (kcal)</label>
                  <input
                    type="number"
                    required
                    placeholder="650"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">Protein (g)</label>
                  <input
                    type="number"
                    placeholder="45"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="50"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">Fat (g)</label>
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
