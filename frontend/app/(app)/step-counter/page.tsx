"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Flame,
  Zap,
  MapPin,
  Timer,
  Trophy,
  Plus,
  Sparkles,
  TrendingUp,
  Camera,
  History,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/AuthContext";
import {
  logSteps,
  syncTotalSteps,
  fetchTodaySteps,
  fetchWeeklySteps,
  fetchRecentWorkoutSummaries,
  WeeklyStepPoint,
  WorkoutSummaryItem,
  WorkoutSessionResponse,
} from "@/lib/api";
import {
  checkDailyReset,
  WorkoutSummary,
} from "@/lib/sensorPedometer";
import { SensorWorkoutTracker } from "@/components/SensorWorkoutTracker";
import { AIPoseTrackerModal } from "@/components/AIPoseTrackerModal";

const STORAGE_KEY_TODAY = "elevatefit_real_steps_today";
const STORAGE_KEY_GOAL = "elevatefit_step_goal";
const STORAGE_KEY_WEEKLY = "elevatefit_real_weekly_history";
const STORAGE_KEY_RECENT_SESSIONS = "elevatefit_cached_recent_sessions";

export default function StepCounterPage() {
  const { token, user } = useAuth();

  // User Step State
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [stepGoal, setStepGoal] = useState<number>(10000);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyStepPoint[]>([]);
  const [recentSessions, setRecentSessions] = useState<WorkoutSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Manual Log Modal State
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [manualStepInput, setManualStepInput] = useState<string>("");
  const [logActivityName, setLogActivityName] = useState<string>("Outdoor Walk");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Goal Modal State
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [goalInput, setGoalInput] = useState<string>("10000");

  // AI Pose Modal State
  const [showPoseModal, setShowPoseModal] = useState<boolean>(false);

  // Chart Metric Filter
  const [chartMetric, setChartMetric] = useState<"steps" | "kcal" | "min">("steps");

  // 1. Initial Load: Restore from LocalStorage or Backend API with Daily Reset check
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    let loadedSteps = 0;
    let loadedGoal = 10000;

    // Check midnight rollover / daily reset
    const { didReset } = checkDailyReset();

    // Restore saved step goal
    const savedGoal = window.localStorage.getItem(STORAGE_KEY_GOAL);
    if (savedGoal) loadedGoal = parseInt(savedGoal, 10) || 10000;
    setStepGoal(loadedGoal);
    setGoalInput(String(loadedGoal));

    // Restore cached steps from local storage (or 0 if reset occurred)
    if (didReset) {
      window.localStorage.setItem(STORAGE_KEY_TODAY, "0");
      loadedSteps = 0;
      setTodaySteps(0);
    } else {
      const cachedSteps = window.localStorage.getItem(STORAGE_KEY_TODAY);
      if (cachedSteps) {
        loadedSteps = parseInt(cachedSteps, 10) || 0;
        setTodaySteps(loadedSteps);
      }
    }

    // Default 7-day fallback based on real current date
    const today = new Date();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const fallbackHistory: WeeklyStepPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = dayNames[d.getDay()];
      const isToday = i === 0;
      fallbackHistory.push({
        date: dateStr,
        day: dayName,
        steps: isToday ? loadedSteps : 0,
        kcal: Math.round((isToday ? loadedSteps : 0) * 0.045),
        min: Math.round((isToday ? loadedSteps : 0) * 0.005),
        is_today: isToday,
      });
    }

    // Restore cached weekly history if present
    const cachedWeekly = window.localStorage.getItem(STORAGE_KEY_WEEKLY);
    if (cachedWeekly) {
      try {
        const parsed = JSON.parse(cachedWeekly);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWeeklyHistory(parsed);
        } else {
          setWeeklyHistory(fallbackHistory);
        }
      } catch {
        setWeeklyHistory(fallbackHistory);
      }
    } else {
      setWeeklyHistory(fallbackHistory);
    }

    // Restore cached recent sessions
    const cachedSessions = window.localStorage.getItem(STORAGE_KEY_RECENT_SESSIONS);
    if (cachedSessions) {
      try {
        const parsed = JSON.parse(cachedSessions);
        if (Array.isArray(parsed)) setRecentSessions(parsed);
      } catch {}
    }

    // Try sync with API if logged in
    if (token) {
      try {
        const todayData = await fetchTodaySteps(token);
        if (todayData && typeof todayData.steps === "number") {
          // If local steps were greater, keep the higher value to avoid data loss
          const resolvedSteps = Math.max(loadedSteps, todayData.steps);
          setTodaySteps(resolvedSteps);
          window.localStorage.setItem(STORAGE_KEY_TODAY, String(resolvedSteps));
        }

        const weeklyData = await fetchWeeklySteps(token);
        if (Array.isArray(weeklyData) && weeklyData.length > 0) {
          setWeeklyHistory(weeklyData);
          window.localStorage.setItem(STORAGE_KEY_WEEKLY, JSON.stringify(weeklyData));
        }

        const sessions = await fetchRecentWorkoutSummaries(token);
        if (Array.isArray(sessions)) {
          setRecentSessions(sessions);
          window.localStorage.setItem(STORAGE_KEY_RECENT_SESSIONS, JSON.stringify(sessions));
        }
      } catch (err) {
        console.warn("Using offline step storage:", err);
      }
    }
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle adding steps to local state & backend with deduplication protection
  const handleAddSteps = useCallback(
    async (addedCount: number) => {
      if (addedCount <= 0) return;

      // Handle daily reset check dynamically
      checkDailyReset();

      setTodaySteps((prev) => {
        const nextTotal = prev + addedCount;
        window.localStorage.setItem(STORAGE_KEY_TODAY, String(nextTotal));

        // Update today's bar in weekly history graph
        setWeeklyHistory((oldHistory) => {
          const updated = oldHistory.map((item) => {
            if (item.is_today) {
              return {
                ...item,
                steps: nextTotal,
                kcal: Math.round(nextTotal * 0.045),
                min: Math.round(nextTotal * 0.005),
              };
            }
            return item;
          });
          window.localStorage.setItem(STORAGE_KEY_WEEKLY, JSON.stringify(updated));
          return updated;
        });

        // Sync to backend using deduplicated total sync
        if (token) {
          syncTotalSteps(token, nextTotal).catch((err) => {
            console.warn("Backend step sync error:", err);
          });
        }

        return nextTotal;
      });
    },
    [token]
  );

  // Handle completed sensor workout session
  const handleWorkoutSessionCompleted = (
    summary: WorkoutSummary,
    apiResponse?: WorkoutSessionResponse
  ) => {
    // Add to recent sessions list
    const newSessionItem: WorkoutSummaryItem = {
      id: apiResponse?.id || `local_${Date.now()}`,
      title: summary.title,
      category: summary.activityType,
      duration_minutes: summary.durationMinutes,
      duration_seconds: summary.durationSeconds,
      calories: summary.calories,
      steps: summary.steps,
      distance_km: summary.distanceKm,
      source: "phone_sensor",
      date: new Date().toISOString().replace("T", " ").slice(0, 16),
    };

    setRecentSessions((prev) => {
      const updated = [newSessionItem, ...prev.slice(0, 9)];
      window.localStorage.setItem(STORAGE_KEY_RECENT_SESSIONS, JSON.stringify(updated));
      return updated;
    });

    // Refresh weekly history if steps were tracked
    if (summary.steps > 0 && token) {
      fetchWeeklySteps(token)
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setWeeklyHistory(data);
            window.localStorage.setItem(STORAGE_KEY_WEEKLY, JSON.stringify(data));
          }
        })
        .catch(() => {});
    }
  };

  // Handle AI Pose workout completion
  const handleAIPoseCompleted = (exercise: string, reps: number, calories: number) => {
    const newSessionItem: WorkoutSummaryItem = {
      id: `pose_${Date.now()}`,
      title: `${exercise} (${reps} reps)`,
      category: "AI Pose Tracking",
      duration_minutes: Math.max(1, Math.round(reps / 12)),
      duration_seconds: Math.round(reps * 5),
      calories,
      steps: 0,
      distance_km: 0,
      source: "mediapipe_pose",
      date: new Date().toISOString().replace("T", " ").slice(0, 16),
    };

    setRecentSessions((prev) => {
      const updated = [newSessionItem, ...prev.slice(0, 9)];
      window.localStorage.setItem(STORAGE_KEY_RECENT_SESSIONS, JSON.stringify(updated));
      return updated;
    });
  };

  // Submit manual step log
  const handleManualLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(manualStepInput, 10);
    if (isNaN(count) || count <= 0) return;

    setIsSaving(true);
    await handleAddSteps(count);
    setIsSaving(false);
    setManualStepInput("");
    setShowLogModal(false);
  };

  // Submit step goal change
  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val >= 1000) {
      setStepGoal(val);
      window.localStorage.setItem(STORAGE_KEY_GOAL, String(val));
      setShowGoalModal(false);
    }
  };

  // Derived metrics
  const progressPct = Math.min(Math.round((todaySteps / stepGoal) * 100), 100);
  const realKcal = Math.round(todaySteps * 0.045);
  const realKm = (todaySteps * 0.00075).toFixed(2);
  const realMinutes = Math.round(todaySteps * 0.005);

  const totalWeeklySteps = weeklyHistory.reduce((acc, curr) => acc + curr.steps, 0);
  const avgDailySteps = Math.round(totalWeeklySteps / (weeklyHistory.length || 7));
  const peakDay = weeklyHistory.reduce(
    (max, item) => (item.steps > max.steps ? item : max),
    { day: "N/A", steps: 0 }
  );

  // SVG Circular Arc Dimensions
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <>
      <Topbar placeholder="Search activity, steps, or goals..." />
      <main className="px-6 lg:px-10 py-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* HEADER ROW */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-ink dark:text-white flex items-center gap-3">
                Step Counter &amp; Activity
              </h1>
              <p className="text-ink-muted mt-1">
                Real-time phone sensor fitness tracking, daily step goals, and active workout sessions.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowPoseModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-all shadow-xs"
              >
                <Camera size={16} />
                <span>AI Pose Rep Counter</span>
              </button>

              <button
                onClick={() => setShowLogModal(true)}
                className="btn-primary py-2.5 px-5 text-sm"
              >
                <Plus size={16} />
                <span>Log Steps</span>
              </button>

              <button
                onClick={() => setShowGoalModal(true)}
                className="flex items-center justify-center h-10 w-10 rounded-full border border-black/10 dark:border-white/15 text-ink dark:text-white hover:border-primary transition-colors"
                title="Configure Daily Step Goal"
              >
                <Trophy size={18} className="text-warning" />
              </button>
            </div>
          </div>

          {/* SENSOR WORKOUT TRACKER SECTION (Start, Pause, Resume, End Controls) */}
          <SensorWorkoutTracker
            token={token}
            onStepLogged={handleAddSteps}
            onWorkoutCompleted={handleWorkoutSessionCompleted}
          />

          {/* MAIN 2-COLUMN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: HERO STEP RING + 4 STAT CARDS (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* HERO STEP CIRCLE CARD */}
              <Card className="relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Today&apos;s Step Count
                  </h2>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    Goal: {stepGoal.toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center py-4 relative z-10">
                  {/* SVG Radial Progress Arc */}
                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="128"
                        cy="128"
                        r={radius}
                        className="stroke-black/5 dark:stroke-white/10"
                        strokeWidth="16"
                        fill="transparent"
                      />
                      <circle
                        cx="128"
                        cy="128"
                        r={radius}
                        className="stroke-primary transition-all duration-700 ease-out"
                        strokeWidth="16"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        style={{
                          filter: "drop-shadow(0 0 8px rgba(45, 106, 79, 0.4))",
                        }}
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xs uppercase tracking-widest font-bold text-primary mb-1">
                        Today
                      </span>
                      <motion.span
                        key={todaySteps}
                        initial={{ scale: 0.96 }}
                        animate={{ scale: 1 }}
                        className="text-5xl font-display font-extrabold tracking-tight text-ink dark:text-white"
                      >
                        {todaySteps.toLocaleString()}
                      </motion.span>
                      <span className="text-xs text-ink-muted mt-1 font-medium">
                        steps completed
                      </span>

                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
                        <Sparkles size={14} className="text-warning" />
                        <span>{progressPct}% of Goal</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Add Buttons */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => handleAddSteps(500)}
                      className="px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-ink dark:text-white text-xs font-semibold hover:border-primary transition-all"
                    >
                      + 500 Steps
                    </button>
                    <button
                      onClick={() => handleAddSteps(1000)}
                      className="px-3.5 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-ink dark:text-white text-xs font-semibold hover:border-primary transition-all"
                    >
                      + 1,000 Steps
                    </button>
                  </div>
                </div>

                {/* 4 STAT CARDS GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                  <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1 text-warning mb-1">
                      <Flame size={16} className="fill-warning" />
                    </div>
                    <span className="text-base font-extrabold text-ink dark:text-white font-display">14</span>
                    <span className="text-[11px] text-ink-muted block font-medium">Day Streak</span>
                  </div>

                  <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1 text-primary mb-1">
                      <Zap size={16} className="fill-primary" />
                    </div>
                    <span className="text-base font-extrabold text-ink dark:text-white font-display">{realKcal}</span>
                    <span className="text-[11px] text-ink-muted block font-medium">kcal Burned</span>
                  </div>

                  <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1 text-secondary mb-1">
                      <MapPin size={16} />
                    </div>
                    <span className="text-base font-extrabold text-ink dark:text-white font-display">{realKm}</span>
                    <span className="text-[11px] text-ink-muted block font-medium">km Walked</span>
                  </div>

                  <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5 text-center">
                    <div className="flex items-center justify-center gap-1 text-accent mb-1">
                      <Timer size={16} />
                    </div>
                    <span className="text-base font-extrabold text-ink dark:text-white font-display">{realMinutes}</span>
                    <span className="text-[11px] text-ink-muted block font-medium">Active Min</span>
                  </div>
                </div>
              </Card>

              {/* QUICK SUMMARY METRICS CARD */}
              <Card className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                  <span className="text-[11px] text-ink-muted block">Weekly Total</span>
                  <span className="text-sm font-extrabold text-ink dark:text-white font-display">
                    {totalWeeklySteps.toLocaleString()}
                  </span>
                </div>
                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                  <span className="text-[11px] text-ink-muted block">Daily Average</span>
                  <span className="text-sm font-extrabold text-primary font-display">
                    {avgDailySteps.toLocaleString()}
                  </span>
                </div>
                <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                  <span className="text-[11px] text-ink-muted block">Best Day</span>
                  <span className="text-sm font-extrabold text-warning font-display">
                    {peakDay.day} ({peakDay.steps.toLocaleString()})
                  </span>
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN: WEEKLY STEP ACTIVITY GRAPH + DETAILS (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* WEEKLY STEP GRAPH CARD */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-display font-semibold text-ink dark:text-white flex items-center gap-2">
                      <TrendingUp size={20} className="text-primary" />
                      Weekly Step Activity
                    </h2>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Daily step count breakdown for the current week
                    </p>
                  </div>

                  {/* Chart metric selector */}
                  <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/10 text-xs font-semibold">
                    {(["steps", "kcal", "min"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setChartMetric(m)}
                        className={`px-3 py-1 rounded-lg capitalize transition-all ${
                          chartMetric === m
                            ? "bg-primary text-white font-bold shadow-sm"
                            : "text-ink-muted hover:text-ink dark:hover:text-white"
                        }`}
                      >
                        {m === "steps" ? "Steps" : m === "kcal" ? "Calories" : "Minutes"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Responsive Recharts Bar Chart */}
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="currentColor"
                        className="text-black/5 dark:text-white/10"
                      />
                      <XAxis
                        dataKey="day"
                        stroke="#6B7280"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid rgba(0,0,0,0.08)",
                          fontSize: "12px",
                        }}
                        formatter={(val: any) => [
                          chartMetric === "steps"
                            ? `${Number(val).toLocaleString()} steps`
                            : chartMetric === "kcal"
                            ? `${val} kcal`
                            : `${val} min`,
                          chartMetric.toUpperCase(),
                        ]}
                      />
                      <Bar dataKey={chartMetric} radius={[8, 8, 0, 0]}>
                        {weeklyHistory.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.is_today
                                ? "#2D6A4F"
                                : entry.steps >= stepGoal
                                ? "#40916C"
                                : "#D4A373"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart Legend Footer */}
                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm bg-primary" />
                      <span>Today</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm bg-secondary" />
                      <span>Goal Reached</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm bg-accent" />
                      <span>Logged Days</span>
                    </div>
                  </div>

                  <span className="font-mono text-primary font-semibold">
                    Logged: {weeklyHistory.filter((w) => w.steps > 0).length} of 7 days
                  </span>
                </div>
              </Card>

              {/* RECENT WORKOUT SUMMARIES CARD */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-primary" />
                    <h3 className="text-base font-display font-bold text-ink dark:text-white">
                      Recent Workout Summaries
                    </h3>
                  </div>
                  <span className="text-xs text-ink-muted font-medium">
                    {recentSessions.length} recorded
                  </span>
                </div>

                {recentSessions.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-black/5 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 text-xs text-ink-muted">
                    No workout sessions recorded yet. Start a session above to record your walk or run!
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {recentSessions.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Activity size={16} />
                          </span>
                          <div>
                            <p className="font-semibold text-ink dark:text-white">{item.title}</p>
                            <p className="text-[11px] text-ink-muted">
                              {item.date} • {item.category}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-mono font-bold text-ink dark:text-white">
                            {item.duration_minutes} min • {item.calories} kcal
                          </p>
                          {item.steps > 0 && (
                            <p className="text-[11px] text-primary font-medium">
                              {item.steps.toLocaleString()} steps ({item.distance_km} km)
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: AI POSE EXERCISE TRACKER */}
      <AIPoseTrackerModal
        isOpen={showPoseModal}
        onClose={() => setShowPoseModal(false)}
        onWorkoutLogged={handleAIPoseCompleted}
      />

      {/* MODAL: MANUAL STEP LOGGING */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card dark:bg-card-dark border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-ink dark:text-white"
            >
              <div>
                <h3 className="text-lg font-display font-bold">Log Steps</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Enter the steps performed during your walk or workout session.
                </p>
              </div>

              <form onSubmit={handleManualLogSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1.5">
                    Activity Type
                  </label>
                  <select
                    value={logActivityName}
                    onChange={(e) => setLogActivityName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-ink dark:text-white text-xs focus:outline-none focus:border-primary"
                  >
                    <option value="Outdoor Walk">Outdoor Walk</option>
                    <option value="Indoor Treadmill">Indoor Treadmill</option>
                    <option value="Jogging / Running">Jogging / Running</option>
                    <option value="Daily Walking">Daily Walking</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink-muted block mb-1.5">
                    Number of Steps
                  </label>
                  <input
                    type="number"
                    value={manualStepInput}
                    onChange={(e) => setManualStepInput(e.target.value)}
                    placeholder="e.g. 3500"
                    required
                    min="1"
                    className="w-full px-4 py-3 rounded-xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-ink dark:text-white font-mono text-lg focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="btn-secondary flex-1 py-2.5 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary flex-1 py-2.5 text-xs"
                  >
                    {isSaving ? "Saving..." : "Save Step Log"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: STEP GOAL CONFIGURATION */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card dark:bg-card-dark border border-black/10 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-ink dark:text-white"
            >
              <div>
                <h3 className="text-lg font-display font-bold">Configure Daily Step Goal</h3>
                <p className="text-xs text-ink-muted mt-1">
                  Set your daily target step goal for progress tracking.
                </p>
              </div>

              <form onSubmit={handleGoalSubmit} className="space-y-4">
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="10000"
                  min="1000"
                  className="w-full px-4 py-3 rounded-xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-ink dark:text-white font-mono text-lg focus:outline-none focus:border-primary"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="btn-secondary flex-1 py-2.5 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 py-2.5 text-xs"
                  >
                    Update Goal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
