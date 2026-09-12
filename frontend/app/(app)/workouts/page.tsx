"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { WorkoutCard, WorkoutItem } from "@/components/WorkoutCard";
import { workouts as fallbackWorkouts } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchWorkouts,
  favoriteWorkout,
  completeWorkout,
  ApiError,
} from "@/lib/api";

const FILTERS = [
  "All Workouts",
  "Strength",
  "Cardio",
  "HIIT",
  "Yoga",
  "Stretching",
] as const;

export default function WorkoutsPage() {
  const { token } = useAuth();
  const [active, setActive] = useState<(typeof FILTERS)[number]>("All Workouts");
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchWorkouts(active)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        } else {
          // Fallback to static workouts filtered by category
          const filtered =
            active === "All Workouts"
              ? fallbackWorkouts
              : fallbackWorkouts.filter((w) => w.category === active);
          setItems(filtered);
        }
      })
      .catch(() => {
        const filtered =
          active === "All Workouts"
            ? fallbackWorkouts
            : fallbackWorkouts.filter((w) => w.category === active);
        setItems(filtered);
      })
      .finally(() => setLoading(false));
  }, [active]);

  const handleSave = async (workoutId: string) => {
    if (savedIds.includes(workoutId)) return;
    setSavedIds((prev) => [...prev, workoutId]);

    if (token) {
      try {
        await favoriteWorkout(token, workoutId);
      } catch {}
    }
    setToastMsg("Workout saved to your favorites!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleComplete = async (workoutId: string) => {
    if (completedIds.includes(workoutId)) return;
    setCompletedIds((prev) => [...prev, workoutId]);

    if (token) {
      try {
        await completeWorkout(token, workoutId);
      } catch (err) {
        if (err instanceof ApiError) {
          setToastMsg(err.message);
        }
      }
    }
    setToastMsg("Workout session logged! Check your Analytics dashboard.");
    setTimeout(() => setToastMsg(null), 3500);
  };

  return (
    <>
      <Topbar placeholder="Search workouts by name, trainer, or muscle group..." />
      <main className="px-6 lg:px-10 py-8 space-y-8">
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

        {toastMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 text-accent text-sm px-4 py-3 border border-accent/20">
            <CheckCircle2 size={18} />
            <span>{toastMsg}</span>
          </div>
        )}

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
            Loading curated workouts...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((workout, i) => (
              <WorkoutCard
                key={workout.id}
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
      </main>
    </>
  );
}

