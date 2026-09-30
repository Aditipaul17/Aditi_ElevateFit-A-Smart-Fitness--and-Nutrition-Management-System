"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Flame,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  Trophy,
  SkipForward,
} from "lucide-react";
import { GeneratedWorkoutPlan, RecommendedExercise } from "@/lib/exerciseRecommendationEngine";

export interface CompletedWorkoutRecord {
  id: string;
  planId: string;
  title: string;
  date: string;
  durationMinutes: number;
  caloriesBurned: number;
  totalSets: number;
  totalExercises: number;
  exercisesSummary: string[];
}

interface ActiveWorkoutSessionModalProps {
  workoutPlan: GeneratedWorkoutPlan | null;
  onClose: () => void;
  onCompleteWorkout: (record: CompletedWorkoutRecord) => void;
}

export function ActiveWorkoutSessionModal({
  workoutPlan,
  onClose,
  onCompleteWorkout,
}: ActiveWorkoutSessionModalProps) {
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState<number>(0);
  const [completedSetMap, setCompletedSetMap] = useState<Record<string, number>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Rest Timer State
  const [isResting, setIsResting] = useState<boolean>(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(60);
  const [workoutFinished, setWorkoutFinished] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Main Workout Timer
  useEffect(() => {
    if (!workoutPlan || isPaused || workoutFinished) return;

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workoutPlan, isPaused, workoutFinished]);

  // Rest Countdown Timer
  useEffect(() => {
    if (!isResting) return;

    restTimerRef.current = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsResting(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isResting]);

  if (!workoutPlan) return null;

  const currentItem: RecommendedExercise = workoutPlan.exercises[currentExerciseIdx];
  const totalExercises = workoutPlan.exercises.length;

  const exerciseId = currentItem.exercise.id;
  const currentCompletedSets = completedSetMap[exerciseId] || 0;

  const handleToggleSet = (setNum: number) => {
    const nextVal = currentCompletedSets >= setNum ? setNum - 1 : setNum;
    setCompletedSetMap({
      ...completedSetMap,
      [exerciseId]: nextVal,
    });

    // Start rest timer if user completed a set
    if (nextVal > currentCompletedSets) {
      setRestSecondsLeft(currentItem.restSeconds || 45);
      setIsResting(true);
    }
  };

  const handleNextExercise = () => {
    setIsResting(false);
    if (currentExerciseIdx < totalExercises - 1) {
      setCurrentExerciseIdx((prev) => prev + 1);
    } else {
      finishWorkoutSession();
    }
  };

  const handlePrevExercise = () => {
    setIsResting(false);
    if (currentExerciseIdx > 0) {
      setCurrentExerciseIdx((prev) => prev - 1);
    }
  };

  const finishWorkoutSession = () => {
    setWorkoutFinished(true);
    const durationMin = Math.max(1, Math.round(elapsedSeconds / 60));
    
    // Calculate total sets completed
    let totalSetsDone = 0;
    Object.values(completedSetMap).forEach((val) => {
      totalSetsDone += val;
    });
    if (totalSetsDone === 0) {
      totalSetsDone = workoutPlan.exercises.reduce((sum, e) => sum + e.sets, 0);
    }

    const calories = Math.round(totalSetsDone * 14 + durationMin * 5);

    const record: CompletedWorkoutRecord = {
      id: `history_${Date.now()}`,
      planId: workoutPlan.id,
      title: workoutPlan.title,
      date: new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      durationMinutes: durationMin,
      caloriesBurned: calories,
      totalSets: totalSetsDone,
      totalExercises: totalExercises,
      exercisesSummary: workoutPlan.exercises.map(
        (e) => `${e.exercise.name} (${e.sets} Sets x ${e.reps})`
      ),
    };

    onCompleteWorkout(record);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card dark:bg-card-dark border border-black/10 dark:border-white/10 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden text-ink dark:text-white my-6 relative flex flex-col max-h-[90vh]"
        >
          {/* TOP SESSION BAR */}
          <div className="p-4 px-6 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-surface dark:bg-surface-dark">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                <Clock size={15} /> {formatTimer(elapsedSeconds)}
              </span>

              <span className="text-xs font-semibold text-ink-muted">
                Ex {currentExerciseIdx + 1} of {totalExercises}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 rounded-xl border border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary text-xs font-semibold flex items-center gap-1"
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                <span>{isPaused ? "Resume" : "Pause"}</span>
              </button>

              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-ink-muted hover:text-ink dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {workoutFinished ? (
            /* FINISHED CELEBRATION SUMMARY */
            <div className="p-8 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/20 text-primary flex items-center justify-center animate-bounce">
                <Trophy size={40} />
              </div>

              <div>
                <h2 className="text-3xl font-display font-extrabold text-ink dark:text-white">
                  Workout Completed! 🎉
                </h2>
                <p className="text-sm text-ink-muted mt-1 max-w-md">
                  Great effort! You finished &ldquo;{workoutPlan.title}&rdquo; and logged your performed exercises.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-sm w-full bg-surface dark:bg-surface-dark p-4 rounded-2xl border border-black/5 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Time</span>
                  <span className="text-base font-bold text-ink dark:text-white font-mono">
                    {Math.max(1, Math.round(elapsedSeconds / 60))} min
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Exercises</span>
                  <span className="text-base font-bold text-primary font-mono">
                    {totalExercises}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-ink-muted uppercase block">Calories</span>
                  <span className="text-base font-bold text-warning font-mono">
                    {Math.round(totalExercises * 35 + elapsedSeconds * 0.1)} kcal
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="btn-primary py-3 px-8 text-sm font-bold shadow-lg"
              >
                Return to Workouts
              </button>
            </div>
          ) : (
            /* ACTIVE WORKOUT PLAYER */
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* REST COUNTDOWN OVERLAY IF RESTING */}
              <AnimatePresence>
                {isResting && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center justify-between text-ink dark:text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm font-mono animate-pulse">
                        {restSecondsLeft}s
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                          Rest Interval Active
                        </h4>
                        <p className="text-xs text-ink-muted">Catch your breath &amp; hydrate.</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsResting(false)}
                      className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-secondary transition-all flex items-center gap-1"
                    >
                      <SkipForward size={14} /> Skip Rest
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* EXERCISE HEADER & MEDIA */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-6 relative h-56 w-full rounded-2xl overflow-hidden bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10">
                  <Image
                    src={currentItem.exercise.gifUrl || currentItem.exercise.imageUrl}
                    alt={currentItem.exercise.name}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-semibold uppercase">
                      {currentItem.exercise.target}
                    </span>
                  </div>
                </div>

                <div className="md:col-span-6 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      Exercise {currentExerciseIdx + 1}
                    </span>
                    <h3 className="text-2xl font-display font-extrabold text-ink dark:text-white leading-tight">
                      {currentItem.exercise.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-medium text-ink-muted">
                    <span className="px-2.5 py-1 rounded-lg bg-surface dark:bg-surface-dark border border-black/5 dark:border-white/10">
                      Equipment: {currentItem.exercise.equipment}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-surface dark:bg-surface-dark border border-black/5 dark:border-white/10">
                      Body Part: {currentItem.exercise.bodyPart}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-black/5 dark:border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-muted">Prescription:</span>
                      <span className="font-bold text-primary">
                        {currentItem.sets} Sets &bull; {currentItem.reps}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-muted">Rest Time:</span>
                      <span className="font-bold text-warning">{currentItem.restSeconds}s Rest</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SET CHECKLIST TRACKER */}
              <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Log Completed Sets for this Exercise
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Array.from({ length: currentItem.sets }).map((_, idx) => {
                    const setNum = idx + 1;
                    const isDone = currentCompletedSets >= setNum;
                    return (
                      <button
                        key={setNum}
                        onClick={() => handleToggleSet(setNum)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                          isDone
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-surface dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary/50"
                        }`}
                      >
                        <span>Set {setNum}</span>
                        <CheckCircle2 size={16} className={isDone ? "text-white" : "text-ink-muted/40"} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* INSTRUCTION STEP */}
              {currentItem.exercise.instructions.length > 0 && (
                <div className="bg-surface dark:bg-surface-dark p-4 rounded-2xl border border-black/5 dark:border-white/5 text-xs">
                  <span className="font-bold text-ink dark:text-white block mb-1">
                    Instruction Tip:
                  </span>
                  <p className="text-ink-muted leading-relaxed">
                    {currentItem.exercise.instructions[0]}
                  </p>
                </div>
              )}

              {/* STEP PLAYER CONTROLS */}
              <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/10">
                <button
                  onClick={handlePrevExercise}
                  disabled={currentExerciseIdx === 0}
                  className="btn-secondary py-2.5 px-4 text-xs disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <button
                  onClick={handleNextExercise}
                  className="btn-primary py-2.5 px-6 text-xs font-bold"
                >
                  <span>
                    {currentExerciseIdx === totalExercises - 1
                      ? "Finish Workout"
                      : "Next Exercise"}
                  </span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
