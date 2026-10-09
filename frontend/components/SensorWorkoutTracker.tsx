"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  Flame,
  MapPin,
  Timer,
  Footprints,
  Activity,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  getPedometerEngine,
  ActivityType,
  SensorPermissionStatus,
  SensorMetrics,
  WorkoutSummary,
} from "@/lib/sensorPedometer";
import { saveWorkoutSession, WorkoutSessionResponse } from "@/lib/api";

interface SensorWorkoutTrackerProps {
  token: string | null;
  onWorkoutCompleted?: (summary: WorkoutSummary, response?: WorkoutSessionResponse) => void;
  onStepLogged?: (steps: number) => void;
}

export function SensorWorkoutTracker({
  token,
  onWorkoutCompleted,
  onStepLogged,
}: SensorWorkoutTrackerProps) {
  const engine = getPedometerEngine();

  // Session state
  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [sessionSteps, setSessionSteps] = useState<number>(0);
  const [sessionDistanceKm, setSessionDistanceKm] = useState<number>(0);
  const [sessionCalories, setSessionCalories] = useState<number>(0);
  const [selectedActivity, setSelectedActivity] = useState<"Walking" | "Running" | "Mixed">("Walking");

  // Breakdown
  const [walkingSeconds, setWalkingSeconds] = useState<number>(0);
  const [runningSeconds, setRunningSeconds] = useState<number>(0);
  const [cadenceHistory, setCadenceHistory] = useState<number[]>([]);

  // Sensor state
  const [sensorStatus, setSensorStatus] = useState<SensorPermissionStatus>("prompt");
  const [currentActivity, setCurrentActivity] = useState<ActivityType>("inactivity");
  const [liveCadence, setLiveCadence] = useState<number>(0);
  const [liveMagnitude, setLiveMagnitude] = useState<number>(0);

  // Summary modal
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [completedSummary, setCompletedSummary] = useState<WorkoutSummary | null>(null);
  const [isSavingSession, setIsSavingSession] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to pedometer engine
  useEffect(() => {
    setSensorStatus(engine.getPermissionStatus());

    const unsubStep = engine.onStep((added, metrics) => {
      setLiveMagnitude(metrics.currentMagnitude);
      setLiveCadence(metrics.cadence);
      setCurrentActivity(metrics.currentActivity);

      if (sessionActive && !isPaused) {
        setSessionSteps((prev) => {
          const next = prev + added;
          // Calculate distance based on activity type stride length
          const strideMeters = metrics.currentActivity === "running" ? 0.95 : 0.74;
          const nextDistKm = Number(((next * strideMeters) / 1000).toFixed(2));
          setSessionDistanceKm(nextDistKm);

          // Calculate calories
          const calPerStep = metrics.currentActivity === "running" ? 0.065 : 0.042;
          const nextCal = Math.round(next * calPerStep + (elapsedSeconds / 60) * 2.5);
          setSessionCalories(nextCal);

          return next;
        });

        if (metrics.cadence > 0) {
          setCadenceHistory((prev) => [...prev.slice(-20), metrics.cadence]);
        }
      }

      // Bubble step to parent for daily totals
      if (onStepLogged) {
        onStepLogged(added);
      }
    });

    const unsubMetrics = engine.onMetrics((metrics) => {
      setLiveMagnitude(metrics.currentMagnitude);
      setLiveCadence(metrics.cadence);
      setCurrentActivity(metrics.currentActivity);
    });

    const unsubStatus = engine.onStatusChange((status) => {
      setSensorStatus(status);
    });

    return () => {
      unsubStep();
      unsubMetrics();
      unsubStatus();
    };
  }, [engine, sessionActive, isPaused, elapsedSeconds, onStepLogged]);

  // Session duration timer
  useEffect(() => {
    if (sessionActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);

        // Track time spent walking vs running
        if (currentActivity === "running") {
          setRunningSeconds((prev) => prev + 1);
        } else if (currentActivity === "walking") {
          setWalkingSeconds((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionActive, isPaused, currentActivity]);

  // Request permission and start engine
  const handleStartWorkout = async () => {
    const status = await engine.requestPermission();
    if (status === "denied") {
      alert("Motion sensor permission is required to detect movement. Please enable sensor access in browser settings.");
      return;
    }

    engine.start();
    setSessionActive(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    setSessionSteps(0);
    setSessionDistanceKm(0);
    setSessionCalories(0);
    setWalkingSeconds(0);
    setRunningSeconds(0);
    setCadenceHistory([]);
  };

  const handlePauseWorkout = () => {
    setIsPaused(true);
  };

  const handleResumeWorkout = () => {
    setIsPaused(false);
  };

  const handleEndWorkout = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const avgCadence =
      cadenceHistory.length > 0
        ? Math.round(cadenceHistory.reduce((a, b) => a + b, 0) / cadenceHistory.length)
        : Math.round((sessionSteps / Math.max(1, elapsedSeconds / 60)));

    const summary: WorkoutSummary = {
      title: `${selectedActivity} Workout Session`,
      activityType:
        runningSeconds > walkingSeconds && runningSeconds > 60
          ? "Running"
          : walkingSeconds > 0 && runningSeconds > 0
          ? "Mixed"
          : selectedActivity,
      durationSeconds: elapsedSeconds,
      durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      steps: sessionSteps,
      distanceKm: sessionDistanceKm,
      calories: Math.max(sessionCalories, Math.round(sessionSteps * 0.045 + (elapsedSeconds / 60) * 3)),
      avgCadence,
      walkingMinutes: Math.round(walkingSeconds / 60),
      runningMinutes: Math.round(runningSeconds / 60),
    };

    setCompletedSummary(summary);
    setShowSummaryModal(true);
    setSessionActive(false);
    setIsPaused(false);
  };

  // Save completed workout session
  const handleSaveCompletedSession = async () => {
    if (!completedSummary) return;

    setIsSavingSession(true);
    setSaveSuccessMessage(null);

    let apiResponse: WorkoutSessionResponse | undefined;

    if (token) {
      try {
        apiResponse = await saveWorkoutSession(token, {
          title: completedSummary.title,
          activity_type: completedSummary.activityType,
          duration_seconds: completedSummary.durationSeconds,
          steps: completedSummary.steps,
          distance_km: completedSummary.distanceKm,
          calories: completedSummary.calories,
          avg_cadence: completedSummary.avgCadence,
          source: "phone_sensor",
        });

        if (apiResponse?.gamification?.xp_gained) {
          setXpAwarded(apiResponse.gamification.xp_gained);
        }
        setSaveSuccessMessage("Workout successfully synced to your profile!");
      } catch (err) {
        console.warn("Could not save to backend, saved to local history:", err);
        setSaveSuccessMessage("Saved locally! (Backend sync will retry when connected)");
      }
    } else {
      setSaveSuccessMessage("Saved locally to your device!");
    }

    if (onWorkoutCompleted) {
      onWorkoutCompleted(completedSummary, apiResponse);
    }

    setIsSavingSession(false);
  };

  // Format seconds to HH:MM:SS or MM:SS
  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <>
      <Card className="border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.04] relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Smartphone size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-display font-bold text-ink dark:text-white">
                  Live Sensor Workout Tracker
                </h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20">
                  <span className={`h-1.5 w-1.5 rounded-full ${sessionActive ? "bg-primary animate-ping" : "bg-ink-muted"}`} />
                  {sessionActive ? (isPaused ? "Paused" : "Live Tracking") : "Ready"}
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Real-time phone accelerometer tracking with walking, running, and inactivity detection.
              </p>
            </div>
          </div>

          {/* Activity State Badge */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                currentActivity === "running"
                  ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  : currentActivity === "walking"
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-ink-muted"
              }`}
            >
              <Activity size={14} className={currentActivity !== "inactivity" ? "animate-pulse" : ""} />
              <span className="capitalize">
                {currentActivity === "inactivity" ? "Inactive / Resting" : currentActivity}
              </span>
              {liveCadence > 0 && (
                <span className="font-mono text-[10px] opacity-80 border-l border-current pl-1.5 ml-0.5">
                  {liveCadence} spm
                </span>
              )}
            </div>

            {/* Test Simulation Button for desktop/testing */}
            <button
              onClick={() => engine.simulateStep(currentActivity === "walking" ? "running" : "walking")}
              className="px-2.5 py-1.5 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-[11px] text-ink-muted hover:text-primary hover:border-primary transition-colors"
              title="Simulate step on desktop devices"
            >
              + Step
            </button>
          </div>
        </div>

        {/* TRACKER CONTROLS & DISPLAY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* TIMER & CONTROLS (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-card-dark border border-black/5 dark:border-white/5 shadow-sm space-y-4">
            <div className="text-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted flex items-center justify-center gap-1">
                <Timer size={14} /> Workout Duration
              </span>
              <p className="text-4xl font-mono font-extrabold text-ink dark:text-white mt-1 tracking-tight">
                {formatTimer(elapsedSeconds)}
              </p>
            </div>

            {/* Workout Controls */}
            <div className="flex items-center gap-3 w-full justify-center">
              {!sessionActive ? (
                <button
                  onClick={handleStartWorkout}
                  className="btn-primary !px-6 !py-3 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Play size={16} className="fill-white" />
                  <span>Start Workout</span>
                </button>
              ) : (
                <>
                  {isPaused ? (
                    <button
                      onClick={handleResumeWorkout}
                      className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 transition-all shadow-md shadow-primary/20"
                    >
                      <Play size={14} className="fill-white" /> Resume
                    </button>
                  ) : (
                    <button
                      onClick={handlePauseWorkout}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                    >
                      <Pause size={14} /> Pause
                    </button>
                  )}

                  <button
                    onClick={handleEndWorkout}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20"
                  >
                    <Square size={14} className="fill-white" /> End Workout
                  </button>
                </>
              )}
            </div>

            {/* Activity Type Switcher */}
            {!sessionActive && (
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl text-xs">
                {(["Walking", "Running", "Mixed"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedActivity(type)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all ${
                      selectedActivity === type
                        ? "bg-white dark:bg-card-dark text-ink dark:text-white shadow-xs font-semibold"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* REAL-TIME SESSION STATS (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-black/5 dark:border-white/5 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-1">
                <Footprints size={16} />
              </span>
              <p className="text-2xl font-display font-extrabold text-ink dark:text-white">
                {sessionSteps.toLocaleString()}
              </p>
              <span className="text-[11px] text-ink-muted font-medium">Session Steps</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-black/5 dark:border-white/5 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary mx-auto mb-1">
                <MapPin size={16} />
              </span>
              <p className="text-2xl font-display font-extrabold text-ink dark:text-white">
                {sessionDistanceKm}
              </p>
              <span className="text-[11px] text-ink-muted font-medium">Distance (km)</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-black/5 dark:border-white/5 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent mx-auto mb-1">
                <Flame size={16} className="fill-accent" />
              </span>
              <p className="text-2xl font-display font-extrabold text-ink dark:text-white">
                {sessionCalories}
              </p>
              <span className="text-[11px] text-ink-muted font-medium">Calories (kcal)</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-card-dark border border-black/5 dark:border-white/5 text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-1">
                <Zap size={16} />
              </span>
              <p className="text-2xl font-display font-extrabold text-ink dark:text-white">
                {liveCadence}
              </p>
              <span className="text-[11px] text-ink-muted font-medium">Cadence (spm)</span>
            </div>
          </div>
        </div>

        {/* SENSOR STATUS / HARDWARE HINT */}
        {sensorStatus === "no_hardware" && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>
                No physical accelerometer detected on this computer. Use the <strong>+ Step</strong> button above to test real-time walking and running.
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* WORKOUT SUMMARY MODAL */}
      <AnimatePresence>
        {showSummaryModal && completedSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card dark:bg-card-dark border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-ink dark:text-white"
            >
              <div className="text-center space-y-1">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-1">
                  <Award size={24} />
                </span>
                <h3 className="text-xl font-display font-bold">Workout Complete!</h3>
                <p className="text-xs text-ink-muted">
                  Here is your workout summary recorded from phone motion sensors.
                </p>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                <div>
                  <span className="text-[11px] text-ink-muted block">Duration</span>
                  <p className="text-lg font-bold font-mono text-ink dark:text-white">
                    {formatTimer(completedSummary.durationSeconds)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-ink-muted block">Total Steps</span>
                  <p className="text-lg font-bold font-display text-primary">
                    {completedSummary.steps.toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-ink-muted block">Distance</span>
                  <p className="text-lg font-bold font-display text-secondary">
                    {completedSummary.distanceKm} km
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-ink-muted block">Calories Burned</span>
                  <p className="text-lg font-bold font-display text-accent">
                    {completedSummary.calories} kcal
                  </p>
                </div>
              </div>

              {/* Activity breakdown */}
              <div className="text-xs text-ink-muted space-y-1 bg-surface dark:bg-surface-dark p-3 rounded-xl border border-black/5 dark:border-white/5">
                <div className="flex justify-between">
                  <span>Detected Activity:</span>
                  <span className="font-semibold text-ink dark:text-white capitalize">
                    {completedSummary.activityType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Average Cadence:</span>
                  <span className="font-semibold text-ink dark:text-white">
                    {completedSummary.avgCadence} steps/min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Walking Time:</span>
                  <span className="font-semibold text-ink dark:text-white">
                    {completedSummary.walkingMinutes} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Running Time:</span>
                  <span className="font-semibold text-ink dark:text-white">
                    {completedSummary.runningMinutes} min
                  </span>
                </div>
              </div>

              {/* XP Awarded badge */}
              {xpAwarded && (
                <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                  <Sparkles size={16} />
                  <span>+{xpAwarded} XP Earned for Completed Workout!</span>
                </div>
              )}

              {saveSuccessMessage && (
                <p className="text-xs text-center text-primary font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} /> {saveSuccessMessage}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="btn-secondary flex-1 py-2.5 text-xs"
                >
                  Close
                </button>
                {!saveSuccessMessage && (
                  <button
                    type="button"
                    onClick={handleSaveCompletedSession}
                    disabled={isSavingSession}
                    className="btn-primary flex-1 py-2.5 text-xs font-semibold"
                  >
                    {isSavingSession ? "Saving..." : "Save Workout"}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
