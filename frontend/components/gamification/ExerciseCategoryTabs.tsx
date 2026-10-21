"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Trophy,
  Flame,
  Zap,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  Dumbbell,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  getExercisesByCategory,
  type ExerciseCategory,
  type Exercise,
} from "./workoutData";
import { ExerciseTracker } from "./ExerciseTracker";

interface ExerciseCategoryTabsProps {
  onXpAwarded: (xp: number, newBadges: any[]) => void;
}

export function ExerciseCategoryTabs({ onXpAwarded }: ExerciseCategoryTabsProps) {
  const [activeCategory, setActiveCategory] = useState<ExerciseCategory>("push");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>("All");
  const [completedExerciseIds, setCompletedExerciseIds] = useState<string[]>([]);

  // Load today's completed exercises from localStorage
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const catKey = `elevatefit_completed_exercises_${today}`;
    try {
      const stored = localStorage.getItem(catKey);
      if (stored) {
        setCompletedExerciseIds(JSON.parse(stored));
      }
    } catch {}
  }, [selectedExercise]);

  // Navigate to workout tracker
  const openExercise = (ex: Exercise) => setSelectedExercise(ex);

  // Return to exercise list from tracker
  const backToList = () => setSelectedExercise(null);

  // Available muscles for active category
  const categoryExercises = useMemo(() => {
    return getExercisesByCategory(activeCategory);
  }, [activeCategory]);

  const allMusclesInCategory = useMemo(() => {
    const set = new Set<string>();
    categoryExercises.forEach((e) => e.muscles.forEach((m) => set.add(m)));
    return ["All", ...Array.from(set)];
  }, [categoryExercises]);

  // Filtered exercises based on search and muscle pill
  const filteredExercises = useMemo(() => {
    return categoryExercises.filter((e) => {
      const matchesSearch =
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.muscles.some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesMuscle =
        selectedMuscleFilter === "All" ||
        e.muscles.includes(selectedMuscleFilter) ||
        e.secondaryMuscles.includes(selectedMuscleFilter);
      return matchesSearch && matchesMuscle;
    });
  }, [categoryExercises, searchQuery, selectedMuscleFilter]);

  // Category completion progress
  const completedCount = useMemo(() => {
    return categoryExercises.filter((e) => completedExerciseIds.includes(e.id)).length;
  }, [categoryExercises, completedExerciseIds]);

  // If an exercise is selected, render the dual-panel workout screen
  if (selectedExercise) {
    return (
      <ExerciseTracker
        exercise={selectedExercise}
        onBack={backToList}
        onXpAwarded={(xp, badges) => {
          onXpAwarded(xp, badges);
          // Mark completed
          if (!completedExerciseIds.includes(selectedExercise.id)) {
            setCompletedExerciseIds((prev) => [...prev, selectedExercise.id]);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Category Switcher Interactive Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => {
          const exercises = getExercisesByCategory(cat.id);
          const doneInCat = exercises.filter((e) =>
            completedExerciseIds.includes(e.id)
          ).length;
          const isSelected = activeCategory === cat.id;

          return (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setActiveCategory(cat.id);
                setSelectedMuscleFilter("All");
              }}
              className={cn(
                "relative overflow-hidden rounded-2xl p-5 text-left border-2 transition-all duration-300 cursor-pointer shadow-soft",
                "bg-gradient-to-br",
                cat.gradientFrom,
                cat.gradientTo,
                isSelected
                  ? `${cat.borderClass} ring-2 ring-primary/20 shadow-glow bg-white dark:bg-card-dark`
                  : "border-black/5 dark:border-white/5 hover:border-primary/30 bg-white/70 dark:bg-card-dark/60"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeCatIndicator"
                  className="absolute inset-0 bg-primary/[0.04] rounded-2xl"
                />
              )}

              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="text-3xl mb-2">{cat.emoji}</div>
                  <h3 className="font-display font-bold text-ink dark:text-white text-lg leading-tight">
                    {cat.label}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">{cat.description}</p>
                </div>

                {/* Progress / Status Pill */}
                <div className="flex flex-col items-end">
                  <span
                    className={cn(
                      "text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full",
                      doneInCat > 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-black/5 dark:bg-white/5 text-ink-muted"
                    )}
                  >
                    {doneInCat}/{exercises.length} Done
                  </span>
                </div>
              </div>

              {/* Progress Bar under category card */}
              <div className="relative z-10 mt-4">
                <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{
                      width: `${(doneInCat / exercises.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── 2. Search & Muscle Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-card-dark p-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-soft">
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeCategory.toUpperCase()} exercises or muscles...`}
            className="w-full pl-9 pr-4 py-2 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl text-xs text-ink dark:text-white focus:outline-none focus:ring-1 focus:ring-primary border border-transparent"
          />
        </div>

        {/* Muscle group filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Filter size={13} className="text-ink-muted shrink-0 mr-1 hidden sm:block" />
          {allMusclesInCategory.slice(0, 5).map((m) => (
            <button
              key={m}
              onClick={() => setSelectedMuscleFilter(m)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-colors",
                selectedMuscleFilter === m
                  ? "bg-primary text-white shadow-sm"
                  : "bg-black/5 dark:bg-white/5 text-ink-muted hover:text-ink hover:bg-black/10"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. Exercise Grid ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-ink dark:text-white text-lg flex items-center gap-2">
            <span>{CATEGORIES.find((c) => c.id === activeCategory)?.emoji}</span>
            <span>{CATEGORIES.find((c) => c.id === activeCategory)?.label} Exercises</span>
            <span className="text-xs font-normal text-ink-muted ml-1">
              ({filteredExercises.length} available)
            </span>
          </h3>

          {completedCount === categoryExercises.length && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <Trophy size={13} />
              Full Category Completed Today!
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExercises.map((exercise, i) => {
            const isCompletedToday = completedExerciseIds.includes(exercise.id);

            return (
              <motion.div
                key={exercise.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
              >
                <Card
                  onClick={() => openExercise(exercise)}
                  className={cn(
                    "group p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between h-full border",
                    "hover:shadow-soft-lg hover:-translate-y-1",
                    isCompletedToday
                      ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                      : "border-black/5 dark:border-white/5 hover:border-primary/40 bg-white dark:bg-card-dark"
                  )}
                >
                  <div>
                    {/* Top row: tags & completion badge */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-black/5 dark:bg-white/5 text-ink-muted px-2 py-0.5 rounded-md">
                          {exercise.equipment}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-0.5 rounded-md">
                          {exercise.difficulty}
                        </span>
                      </div>

                      {isCompletedToday ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 size={11} /> Done
                        </span>
                      ) : (
                        <div className="h-7 w-7 rounded-lg bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                          <ChevronRight size={14} />
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="font-display font-bold text-ink dark:text-white text-base group-hover:text-primary transition-colors">
                      {exercise.name}
                    </h4>

                    {/* Muscles Pill List */}
                    <p className="text-xs text-ink-muted mt-1 leading-snug">
                      {exercise.muscles.join(" · ")}
                    </p>

                  </div>

                  {/* Bottom Stats Row */}
                  <div className="pt-4 mt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-bold text-amber-500">
                      <Zap size={12} />
                      {exercise.xpPerRep} XP / rep
                    </span>

                    <span className="flex items-center gap-1 text-ink-muted font-medium">
                      <Flame size={12} className="text-rose-400" />
                      ~{exercise.caloriesPerRep} kcal
                    </span>

                    <span className="text-primary font-bold text-xs group-hover:underline">
                      Start →
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredExercises.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-card-dark rounded-2xl border border-black/5 dark:border-white/5">
            <p className="text-ink-muted text-sm">
              No exercises found matching &quot;{searchQuery}&quot;.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedMuscleFilter("All");
              }}
              className="mt-3 text-xs font-bold text-primary hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
