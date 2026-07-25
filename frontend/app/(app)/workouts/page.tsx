"use client";

import { useState } from "react";
import { Topbar } from "@/components/Topbar";
import { WorkoutCard } from "@/components/WorkoutCard";
import { workouts } from "@/lib/data";
import { cn } from "@/lib/utils";

const FILTERS = ["All Workouts", "Strength", "Cardio", "HIIT", "Yoga", "Stretching"] as const;

export default function WorkoutsPage() {
  const [active, setActive] = useState<(typeof FILTERS)[number]>("All Workouts");

  const filtered =
    active === "All Workouts"
      ? workouts
      : workouts.filter((w) => w.category === active);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((workout, i) => (
            <WorkoutCard key={workout.id} workout={workout} index={i} />
          ))}
        </div>
      </main>
    </>
  );
}
