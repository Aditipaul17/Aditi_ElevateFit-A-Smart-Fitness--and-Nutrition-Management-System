"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Flame, Bookmark, CheckCircle2 } from "lucide-react";

export type WorkoutItem = {
  id: string;
  title: string;
  category: string;
  duration_minutes?: number;
  duration?: string;
  difficulty: string;
  calories: number;
  trainer: string;
  image_url?: string;
  image?: string;
};

export function WorkoutCard({
  workout,
  index = 0,
  onSave,
  onComplete,
  isSaved,
  isCompleted,
}: {
  workout: WorkoutItem;
  index?: number;
  onSave?: (id: string) => void;
  onComplete?: (id: string) => void;
  isSaved?: boolean;
  isCompleted?: boolean;
}) {
  const imageUrl =
    workout.image_url ||
    workout.image ||
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop";

  const durationText = workout.duration_minutes
    ? `${workout.duration_minutes} min`
    : workout.duration || "30 min";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="surface-card overflow-hidden group cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={workout.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold px-3 py-1 uppercase tracking-wide">
            {workout.category}
          </span>
          {onSave && (
            <button
              type="button"
              aria-label="Save workout"
              onClick={(e) => {
                e.stopPropagation();
                onSave(workout.id);
              }}
              className={`absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                isSaved
                  ? "bg-primary text-white"
                  : "bg-white/90 text-ink hover:text-primary"
              }`}
            >
              <Bookmark size={14} className={isSaved ? "fill-current" : ""} />
            </button>
          )}
        </div>
        <div className="p-5">
          <h3 className="font-display font-semibold text-ink dark:text-white leading-snug mb-2">
            {workout.title}
          </h3>
          <div className="flex items-center gap-4 text-xs text-ink-muted mb-1">
            <span className="flex items-center gap-1">
              <Clock size={13} /> {durationText}
            </span>
            <span>{workout.difficulty}</span>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="flex items-center gap-1 text-sm font-semibold text-primary">
              <Flame size={14} /> {workout.calories} kcal
            </span>
            <span className="text-xs text-ink-muted">{workout.trainer}</span>
          </div>
        </div>
      </div>

      {onComplete && (
        <div className="px-5 pb-5 pt-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(workout.id);
            }}
            disabled={isCompleted}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-colors ${
              isCompleted
                ? "bg-accent/15 text-accent cursor-default"
                : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
            }`}
          >
            <CheckCircle2 size={14} />
            {isCompleted ? "Completed Today!" : "Log Workout Session"}
          </button>
        </div>
      )}
    </motion.div>
  );
}

