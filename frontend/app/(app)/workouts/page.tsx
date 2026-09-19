"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, Footprints, ShieldCheck, Clock, Dumbbell } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { WorkoutCard, WorkoutItem } from "@/components/WorkoutCard";
import { workouts as fallbackWorkouts } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchWorkouts,
  fetchRecommendedWorkouts,
  favoriteWorkout,
  completeWorkout,
  fetchTodaySteps,
  logSteps,
  ApiError,
} from "@/lib/api";
import { getRecommendedWorkouts } from "@/lib/recommendationEngine";
import { GamificationToastBanner, GamificationToastItem } from "@/components/GamificationToast";
import { Card } from "@/components/ui/Card";

const FILTERS = [
  "All Workouts",
  "Strength",
  "Cardio",
  "HIIT",
  "Yoga",
  "Stretching",
] as const;

export default function WorkoutsPage() {
  const { token, user } = useAuth();
  const [active, setActive] = useState<(typeof FILTERS)[number]>("All Workouts");
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<WorkoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Step Tracking State
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [stepGoal] = useState<number>(10000);
  const [showStepModal, setShowStepModal] = useState<boolean>(false);
  const [stepsInput, setStepsInput] = useState<string>("1000");

  // Gamification Toasts
  const [gamiToasts, setGamiToasts] = useState<GamificationToastItem[]>([]);

  useEffect(() => {
    if (user?.id) {
      const stored = localStorage.getItem(`ef_${user.id}_completedWorkouts`);
      if (stored) {
        try {
          setCompletedIds(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (gamiToasts.length > 0) {
      const timer = setTimeout(() => {
        setGamiToasts((prev) => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [gamiToasts]);

  // Load Today's Steps
  useEffect(() => {
    if (token) {
      fetchTodaySteps(token)
        .then((res) => setTodaySteps(res.steps))
        .catch(() => {});
    }
  }, [token]);

  // Load Main Workout Catalog
  useEffect(() => {
    setLoading(true);
    fetchWorkouts(active)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        } else {
          const filtered = active === "All Workouts" ? fallbackWorkouts : fallbackWorkouts.filter((w) => w.category === active);
          setItems(filtered as WorkoutItem[]);
        }
      })
      .catch(() => {
        const filtered = active === "All Workouts" ? fallbackWorkouts : fallbackWorkouts.filter((w) => w.category === active);
        setItems(filtered as WorkoutItem[]);
      })
      .finally(() => setLoading(false));
  }, [active]);

  // Load Dynamic Recommendations based on User Profile
  useEffect(() => {
    setLoadingRecs(true);
    if (token) {
      fetchRecommendedWorkouts(token)
        .then((recs) => {
          if (Array.isArray(recs) && recs.length > 0) {
            setRecommendedItems(recs);
          } else {
            const localRecs = getRecommendedWorkouts(fallbackWorkouts as WorkoutItem[], user, completedIds);
            setRecommendedItems(localRecs);
          }
        })
        .catch(() => {
          const localRecs = getRecommendedWorkouts(fallbackWorkouts as WorkoutItem[], user, completedIds);
          setRecommendedItems(localRecs);
        })
        .finally(() => setLoadingRecs(false));
    } else {
      const localRecs = getRecommendedWorkouts(fallbackWorkouts as WorkoutItem[], user, completedIds);
      setRecommendedItems(localRecs);
      setLoadingRecs(false);
    }
  }, [token, user, completedIds]);

  const handleSave = async (workoutId: string) => {
    if (savedIds.includes(workoutId)) return;
    setSavedIds((prev) => [...prev, workoutId]);
    if (token) {
      try { await favoriteWorkout(token, workoutId); } catch {}
    }
    setToastMsg("Workout saved to your favorites!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleComplete = async (workoutId: string) => {
    if (completedIds.includes(workoutId)) return;

    const newCompleted = [...completedIds, workoutId];
    setCompletedIds(newCompleted);
    if (user?.id) {
      localStorage.setItem(`ef_${user.id}_completedWorkouts`, JSON.stringify(newCompleted));
    }

    if (token) {
      try {
        const res = await completeWorkout(token, workoutId);
        if (res.gamification) {
          const newToasts: GamificationToastItem[] = [];
          if (res.gamification.xp_gained > 0) {
            newToasts.push({ id: Math.random().toString(), type: "xp", title: `+${res.gamification.xp_gained} XP 🎉`, description: "Workout completed!" });
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
      } catch (err) {
        if (err instanceof ApiError) {
          setToastMsg(err.message);
        }
      }
    }
    if (gamiToasts.length === 0) {
        setToastMsg("Workout session logged! Check your Analytics dashboard.");
        setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleLogStepsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !stepsInput) return;
    const count = parseInt(stepsInput, 10);
    if (isNaN(count) || count <= 0) return;

    try {
      const res = await logSteps(token, count);
      setTodaySteps(res.total_steps_today);
      setShowStepModal(false);
      setStepsInput("1000");
      setToastMsg(`Logged ${count} steps! Today's total: ${res.total_steps_today}`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch {}
  };

  return (
    <>
      <GamificationToastBanner toast={gamiToasts[0] || null} onClose={() => setGamiToasts(prev => prev.slice(1))} />
      <Topbar placeholder="Search workouts by name, trainer, or muscle group..." />
      <main className="px-6 lg:px-10 py-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
              Workouts &amp; Fitness Tracking
            </h1>
            <p className="text-ink-muted mt-1">
              Personalized training recommendations tuned to your questionnaire profile.
            </p>
          </div>
        </div>

        {/* Step Tracker Banner */}
        <Card className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-accent/10 to-transparent border border-primary/20">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
              <Footprints size={24} />
            </span>
            <div>
              <h3 className="font-display font-bold text-ink dark:text-white text-base">
                Daily Step Tracker
              </h3>
              <p className="text-xs text-ink-muted">
                {todaySteps.toLocaleString()} / {stepGoal.toLocaleString()} steps logged today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-32 h-2.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden hidden md:block">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (todaySteps / stepGoal) * 100)}%` }}
              />
            </div>
            <button
              onClick={() => setShowStepModal(true)}
              className="w-full sm:w-auto btn-primary text-xs !px-4 !py-2.5 flex items-center justify-center gap-1.5"
            >
              <Footprints size={14} /> Log Steps Today
            </button>
          </div>
        </Card>

        {toastMsg && gamiToasts.length === 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 text-accent text-sm px-4 py-3 border border-accent/20">
            <CheckCircle2 size={18} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ── Recommended for You Section ── */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                <h2 className="text-xl font-display font-bold text-ink dark:text-white">
                  Recommended Exercises &amp; Workouts
                </h2>
              </div>
              <p className="text-sm text-ink-muted mt-0.5">
                Automatically updated based on your questionnaire answers
              </p>
            </div>
            {user && (
              <div className="flex flex-wrap gap-1.5">
                {user.preferred_workout_type && (
                  <span className="rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 flex items-center gap-1">
                    <Dumbbell size={12} /> {user.preferred_workout_type}
                  </span>
                )}
                {user.available_workout_time && (
                  <span className="rounded-full bg-secondary/10 text-secondary text-xs font-semibold px-3 py-1 flex items-center gap-1">
                    <Clock size={12} /> {user.available_workout_time}
                  </span>
                )}
                {user.fitness_limitations && user.fitness_limitations.length > 0 && !user.fitness_limitations.includes("None") && (
                  <span className="rounded-full bg-accent/15 text-accent text-xs font-semibold px-3 py-1 flex items-center gap-1">
                    <ShieldCheck size={12} /> {user.fitness_limitations[0]}
                  </span>
                )}
              </div>
            )}
          </div>

          {loadingRecs ? (
            <div className="flex h-48 items-center justify-center gap-2 text-ink-muted text-sm border border-dashed border-black/10 dark:border-white/10 rounded-2xl">
              <Loader2 size={20} className="animate-spin text-primary" />
              Generating recommendations from your profile...
            </div>
          ) : recommendedItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedItems.map((workout, i) => (
                <WorkoutCard
                  key={`rec-${workout.id}`}
                  workout={workout}
                  index={i}
                  onSave={handleSave}
                  onComplete={handleComplete}
                  isSaved={savedIds.includes(workout.id)}
                  isCompleted={completedIds.includes(workout.id)}
                />
              ))}
            </div>
          ) : null}
        </section>

        <hr className="border-black/5 dark:border-white/5" />

        {/* ── All Workouts & Filters ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-ink dark:text-white">
              All Workout Catalog
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActive(filter)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors border",
                  active === filter
                    ? "bg-primary text-white border-primary"
                    : "border-black/10 dark:border-white/10 text-ink-muted hover:border-primary hover:text-primary"
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center gap-2 text-ink-muted text-sm">
              <Loader2 size={24} className="animate-spin text-primary" />
              Loading catalog workouts...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((workout, i) => (
                <WorkoutCard
                  key={`all-${workout.id}`}
                  workout={workout}
                  index={i}
                  onSave={handleSave}
                  onComplete={handleComplete}
                  isSaved={savedIds.includes(workout.id)}
                  isCompleted={completedIds.includes(workout.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Log Steps Modal */}
      {showStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-card w-full max-w-sm rounded-2xl p-6 border border-black/10 dark:border-white/10 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-ink dark:text-white flex items-center gap-2">
              <Footprints size={18} className="text-primary" /> Log Daily Steps
            </h3>
            <form onSubmit={handleLogStepsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                  Steps Walked / Run Today
                </label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  placeholder="e.g. 3000"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStepModal(false)}
                  className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary text-white px-5 py-2 text-xs font-semibold hover:bg-secondary transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 size={14} /> Log Steps
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
