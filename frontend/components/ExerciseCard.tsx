"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Clock, Dumbbell, Target, Info, Flame, RotateCcw } from "lucide-react";
import { RecommendedExercise } from "@/lib/exerciseRecommendationEngine";

interface ExerciseCardProps {
  item: RecommendedExercise;
  index?: number;
  onViewInstructions: (item: RecommendedExercise) => void;
}

export function ExerciseCard({
  item,
  index = 0,
  onViewInstructions,
}: ExerciseCardProps) {
  const { exercise, sets, reps, restSeconds, matchReason } = item;
  const [imgSrc, setImgSrc] = useState<string>(
    exercise.gifUrl || exercise.imageUrl
  );
  const [hasError, setHasError] = useState<boolean>(false);

  const fallbackImage =
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop";

  const firstInstruction =
    exercise.instructions && exercise.instructions.length > 0
      ? exercise.instructions[0]
      : "Follow standard posture and controlled motion.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      whileHover={{ y: -4 }}
      className="surface-card rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 bg-card dark:bg-card-dark flex flex-col justify-between group shadow-sm hover:shadow-md transition-all"
    >
      <div>
        {/* MEDIA PREVIEW HEADER */}
        <div className="relative h-44 w-full bg-black/5 dark:bg-white/5 overflow-hidden">
          <Image
            src={hasError ? fallbackImage : imgSrc}
            alt={exercise.name}
            fill
            unoptimized
            onError={() => {
              if (!hasError) {
                setHasError(true);
                setImgSrc(fallbackImage);
              }
            }}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* BADGES OVERLAY */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <span className="rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 uppercase tracking-wide border border-white/10">
              {exercise.bodyPart}
            </span>
            <span className="rounded-full bg-primary/90 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-1 uppercase tracking-wide border border-primary/30">
              {exercise.equipment}
            </span>
          </div>

          {matchReason && (
            <div className="absolute bottom-2 left-3 right-3">
              <span className="inline-block rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 border border-white/10 truncate max-w-full">
                ✨ {matchReason}
              </span>
            </div>
          )}
        </div>

        {/* CONTENT BODY */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-display font-bold text-base text-ink dark:text-white leading-snug line-clamp-1">
              {exercise.name}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mt-0.5">
              <Target size={13} className="shrink-0" />
              <span className="capitalize">{exercise.target}</span>
            </div>
          </div>

          {/* PRESCRIPTION STATS ROW */}
          <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 rounded-xl bg-surface dark:bg-surface-dark border border-black/5 dark:border-white/5 text-center">
            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">
                Sets
              </span>
              <span className="text-xs font-bold font-display text-ink dark:text-white">
                {sets} Sets
              </span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">
                Reps
              </span>
              <span className="text-xs font-bold font-display text-primary">
                {reps}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-ink-muted uppercase block font-semibold">
                Rest
              </span>
              <span className="text-xs font-bold font-display text-warning">
                {restSeconds}s
              </span>
            </div>
          </div>

          {/* SHORT INSTRUCTION */}
          <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed italic bg-black/5 dark:bg-white/5 p-2 rounded-lg">
            &ldquo;{firstInstruction}&rdquo;
          </p>
        </div>
      </div>

      {/* FOOTER ACTION */}
      <div className="p-4 pt-0">
        <button
          type="button"
          onClick={() => onViewInstructions(item)}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-ink dark:text-white text-xs font-semibold hover:border-primary hover:bg-primary/10 transition-all"
        >
          <Info size={14} />
          <span>View Details & Instructions</span>
        </button>
      </div>
    </motion.div>
  );
}
