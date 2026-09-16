"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
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
  ApiError,
} from "@/lib/api";
import { getRecommendedWorkouts } from "@/lib/recommendationEngine";
import { GamificationToastBanner, GamificationToastItem } from "@/components/GamificationToast";

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

  return (
    <>
      <GamificationToastBanner toast={gamiToasts[0] || null} onClose={() => setGamiToasts(prev => prev.slice(1))} />
      <Topbar placeholder="Search workouts by name, trainer, or muscle group..." />
      <main className="px-6 lg:px-10 py-8 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
              Workouts
            </h1>
            <p className="text-ink-muted mt-1">
              Curated training sessions, tuned to your goals.
            </p>
          </div>
        </div>

        {toastMsg && gamiToasts.length === 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 text-accent text-sm px-4 py-3 border border-accent/20">
            <CheckCircle2 size={18} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* ── Recommended for You Section ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-primary" />
                <h2 className="text-xl font-display font-bold text-ink dark:text-white">
                  Recommended for You
                </h2>
              </div>
              <p className="text-sm text-ink-muted mt-0.5">
                Based on your fitness goal, activity level and experience
              </p>
            </div>
            {user && (
              <span className="hidden sm:inline-block rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
                {user.fitness_goal || "Maintain fitness"} • {user.workout_experience || "Beginner"}
              </span>
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
              All Workouts
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
    </>
  );
}


