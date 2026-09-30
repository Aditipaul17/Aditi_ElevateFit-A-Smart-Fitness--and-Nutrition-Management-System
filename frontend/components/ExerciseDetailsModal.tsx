"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Target, Dumbbell, Clock, Flame, CheckCircle2, Shield } from "lucide-react";
import { RecommendedExercise } from "@/lib/exerciseRecommendationEngine";

interface ExerciseDetailsModalProps {
  item: RecommendedExercise | null;
  onClose: () => void;
}

export function ExerciseDetailsModal({ item, onClose }: ExerciseDetailsModalProps) {
  if (!item) return null;

  const { exercise, sets, reps, restSeconds, matchReason } = item;
  const imageUrl = exercise.gifUrl || exercise.imageUrl;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-card dark:bg-card-dark border border-black/10 dark:border-white/10 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden text-ink dark:text-white my-8 relative"
        >
          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition-colors"
          >
            <X size={18} />
          </button>

          {/* MEDIA HEADER */}
          <div className="relative h-60 w-full bg-black/10 dark:bg-white/5">
            <Image
              src={imageUrl}
              alt={exercise.name}
              fill
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            
            <div className="absolute bottom-4 left-6 right-6">
              <span className="inline-block px-3 py-1 rounded-full bg-primary text-white text-[11px] font-bold uppercase tracking-wider mb-2">
                {exercise.equipment}
              </span>
              <h2 className="text-2xl font-display font-extrabold text-white leading-tight">
                {exercise.name}
              </h2>
            </div>
          </div>

          {/* MODAL BODY */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* PRESCRIPTION STATS ROW */}
            <div className="grid grid-cols-3 gap-3 bg-surface dark:bg-surface-dark p-4 rounded-2xl border border-black/5 dark:border-white/5 text-center">
              <div>
                <span className="text-xs text-ink-muted block uppercase font-semibold">Target Sets</span>
                <span className="text-lg font-bold text-ink dark:text-white font-display">{sets} Sets</span>
              </div>
              <div>
                <span className="text-xs text-ink-muted block uppercase font-semibold">Target Reps</span>
                <span className="text-lg font-bold text-primary font-display">{reps}</span>
              </div>
              <div>
                <span className="text-xs text-ink-muted block uppercase font-semibold">Rest Between</span>
                <span className="text-lg font-bold text-warning font-display">{restSeconds} sec</span>
              </div>
            </div>

            {/* MUSCLE TARGETS & DETAILS */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span className="text-ink-muted block mb-1 font-medium">Target Muscle</span>
                <span className="font-bold text-primary text-sm capitalize flex items-center gap-1.5">
                  <Target size={14} /> {exercise.target}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <span className="text-ink-muted block mb-1 font-medium">Body Part</span>
                <span className="font-bold text-secondary text-sm capitalize flex items-center gap-1.5">
                  <Dumbbell size={14} /> {exercise.bodyPart}
                </span>
              </div>
            </div>

            {/* SECONDARY MUSCLES */}
            {exercise.secondaryMuscles.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
                  Secondary Muscles Involved
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.secondaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold capitalize border border-primary/20"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* STEP BY STEP INSTRUCTIONS */}
            <div>
              <h4 className="text-sm font-display font-bold text-ink dark:text-white mb-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" /> Step-by-Step Instructions
              </h4>

              {exercise.instructions && exercise.instructions.length > 0 ? (
                <ol className="space-y-2.5">
                  {exercise.instructions.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-xs text-ink/90 dark:text-white/90 leading-relaxed">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary/15 text-primary font-bold text-[11px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-ink-muted italic">
                  Maintain controlled posture, breathe evenly, and perform movements smoothly through full range of motion.
                </p>
              )}
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-4 border-t border-black/5 dark:border-white/10 bg-surface dark:bg-surface-dark flex justify-end">
            <button
              onClick={onClose}
              className="btn-primary py-2.5 px-6 text-xs"
            >
              Got it!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
