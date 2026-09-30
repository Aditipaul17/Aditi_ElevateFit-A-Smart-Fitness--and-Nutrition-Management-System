"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sliders, X, Check, Dumbbell, Target, Clock, ShieldCheck, Flame } from "lucide-react";
import { WorkoutPreferenceQuery } from "@/lib/exerciseRecommendationEngine";

interface QuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreferences: WorkoutPreferenceQuery;
  onSavePreferences: (prefs: WorkoutPreferenceQuery) => void;
}

export function WorkoutQuestionnaireModal({
  isOpen,
  onClose,
  currentPreferences,
  onSavePreferences,
}: QuestionnaireModalProps) {
  const [prefs, setPrefs] = useState<WorkoutPreferenceQuery>(currentPreferences);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePreferences(prefs);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card dark:bg-card-dark border border-black/10 dark:border-white/10 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden text-ink dark:text-white my-8 relative"
        >
          {/* HEADER */}
          <div className="p-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Sliders size={20} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-ink dark:text-white">
                  Workout Preferences
                </h2>
                <p className="text-xs text-ink-muted">
                  Customize filters to generate personalized workouts from 1,324 exercises.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-ink-muted hover:text-ink dark:hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* FORM BODY */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* 1. FITNESS GOAL */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">
                1. Fitness Goal
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  [
                    "Muscle Gain",
                    "Weight Loss",
                    "Strength",
                    "General Fitness",
                    "Flexibility",
                  ] as const
                ).map((goal) => (
                  <button
                    type="button"
                    key={goal}
                    onClick={() => setPrefs({ ...prefs, fitnessGoal: goal })}
                    className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                      prefs.fitnessGoal === goal
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-surface dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary/50"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. EXPERIENCE LEVEL */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">
                2. Experience Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Beginner", "Intermediate", "Advanced"] as const).map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setPrefs({ ...prefs, experienceLevel: level })}
                    className={`p-3 rounded-2xl border text-xs font-semibold text-center transition-all ${
                      prefs.experienceLevel === level
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-surface dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary/50"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. TARGET BODY PART */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">
                3. Target Body Part / Muscle
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    "Full Body",
                    "Chest",
                    "Back",
                    "Shoulders",
                    "Arms",
                    "Legs",
                    "Abs / Core",
                    "Cardio",
                  ] as const
                ).map((bp) => (
                  <button
                    type="button"
                    key={bp}
                    onClick={() => setPrefs({ ...prefs, targetBodyPart: bp })}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                      prefs.targetBodyPart === bp
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-surface dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary/50"
                    }`}
                  >
                    {bp}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. AVAILABLE EQUIPMENT */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">
                4. Available Equipment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { label: "No Equipment / Bodyweight", sub: "No equipment required" },
                    { label: "Dumbbells & Bands", sub: "Dumbbells, bands, kettlebells" },
                    { label: "Gym / Full Equipment", sub: "Barbells, cables, machines" },
                  ] as const
                ).map((eq) => {
                  const isSelected =
                    prefs.equipment === eq.label ||
                    (eq.label.startsWith("No Equipment") &&
                      (prefs.equipment === "No equipment" ||
                        prefs.equipment === "Home / Bodyweight" ||
                        prefs.equipment === "Bodyweight" ||
                        prefs.equipment === "None"));

                  return (
                    <button
                      type="button"
                      key={eq.label}
                      onClick={() => setPrefs({ ...prefs, equipment: eq.label })}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-surface dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary/50"
                      }`}
                    >
                      <span className="text-xs font-bold block">{eq.label}</span>
                      <span
                        className={`text-[10px] block mt-0.5 ${
                          isSelected ? "text-white/80" : "text-ink-muted"
                        }`}
                      >
                        {eq.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. WORKOUT DURATION & NUMBER OF EXERCISES */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">
                  5. Duration (min)
                </label>
                <select
                  value={prefs.durationMinutes}
                  onChange={(e) =>
                    setPrefs({ ...prefs, durationMinutes: parseInt(e.target.value, 10) })
                  }
                  className="w-full p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-ink dark:text-white text-xs focus:outline-none focus:border-primary"
                >
                  <option value={15}>15 Minutes (Express)</option>
                  <option value={30}>30 Minutes (Standard)</option>
                  <option value={45}>45 Minutes (Extended)</option>
                  <option value={60}>60 Minutes (Full Routine)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2">
                  6. Exercise Count
                </label>
                <select
                  value={prefs.numberOfExercises}
                  onChange={(e) =>
                    setPrefs({ ...prefs, numberOfExercises: parseInt(e.target.value, 10) })
                  }
                  className="w-full p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-ink dark:text-white text-xs focus:outline-none focus:border-primary"
                >
                  <option value={4}>4 Exercises</option>
                  <option value={6}>6 Exercises</option>
                  <option value={8}>8 Exercises</option>
                  <option value={10}>10 Exercises</option>
                </select>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary w-full py-3.5 text-sm font-bold shadow-md"
              >
                Apply &amp; Generate Dynamic Workout
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
