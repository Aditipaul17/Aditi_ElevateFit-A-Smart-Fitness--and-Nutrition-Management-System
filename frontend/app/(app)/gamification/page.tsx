"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { fetchGamification, GamificationData } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { Award, Sparkles, Dumbbell, Star, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { ExerciseCategoryTabs } from "@/components/gamification/ExerciseCategoryTabs";

const DEFAULT_GAMIFICATION_DATA: GamificationData = {
  total_xp: 0,
  level: 1,
  xp_in_level: 0,
  xp_needed_for_next: 500,
  next_level_xp: 500,
  progress_pct: 0,
  current_streak: 0,
  longest_streak: 0,
  badges_earned_count: 0,
  total_badges_count: 7,
  workouts_completed_count: 0,
  meals_logged_count: 0,
  badges: [
    {
      id: "first_step",
      name: "First Step",
      description: "Complete your first workout.",
      icon: "🥇",
      unlocked: false,
    },
    {
      id: "streak_7",
      name: "7 Day Warrior",
      description: "Maintain a 7-day streak.",
      icon: "🔥",
      unlocked: false,
    },
    {
      id: "streak_30",
      name: "30 Day Champion",
      description: "Maintain a 30-day streak.",
      icon: "🏆",
      unlocked: false,
    },
    {
      id: "workout_5",
      name: "Workout Starter",
      description: "Complete 5 workouts.",
      icon: "💪",
      unlocked: false,
    },
    {
      id: "workout_25",
      name: "Workout Beast",
      description: "Complete 25 workouts.",
      icon: "🏋️",
      unlocked: false,
    },
    {
      id: "nutrition_10",
      name: "Nutrition Tracker",
      description: "Log 10 meals.",
      icon: "🥗",
      unlocked: false,
    },
    {
      id: "xp_1000",
      name: "Consistency King",
      description: "Reach 1000 XP.",
      icon: "⭐",
      unlocked: false,
    },
  ],
};

export default function GamificationPage() {
  const { token } = useAuth();
  const [data, setData] = useState<GamificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [xpToast, setXpToast] = useState<{ xp: number; badges: any[] } | null>(null);

  const refetchGamification = useCallback(() => {
    if (!token) return;
    fetchGamification(token)
      .then(setData)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    setIsLoading(true);
    if (!token) {
      setData(DEFAULT_GAMIFICATION_DATA);
      setIsLoading(false);
      return;
    }
    fetchGamification(token)
      .then(setData)
      .catch(() => {
        setData(DEFAULT_GAMIFICATION_DATA);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleXpAwarded = useCallback(
    (xp: number, newBadges: any[]) => {
      setXpToast({ xp, badges: newBadges });
      setTimeout(() => setXpToast(null), 5000);

      // Instantly update local gamification stats
      setData((prev) => {
        if (!prev) return prev;
        const newTotal = prev.total_xp + xp;
        const newLevel = Math.floor(newTotal / 500) + 1;
        const xpInLevel = newTotal % 500;
        const xpNeeded = 500 - xpInLevel;
        const progressPct = Math.round((xpInLevel / 500) * 100);

        const updatedBadges = prev.badges.map((b) => {
          if (newBadges.some((nb: any) => nb.id === b.id)) {
            return { ...b, unlocked: true };
          }
          if (b.id === "first_step") return { ...b, unlocked: true };
          if (b.id === "workout_5" && prev.workouts_completed_count + 1 >= 5) {
            return { ...b, unlocked: true };
          }
          if (b.id === "xp_1000" && newTotal >= 1000) {
            return { ...b, unlocked: true };
          }
          return b;
        });
        const earnedCount = updatedBadges.filter((b) => b.unlocked).length;

        return {
          ...prev,
          total_xp: newTotal,
          level: newLevel,
          xp_in_level: xpInLevel,
          xp_needed_for_next: xpNeeded,
          progress_pct: progressPct,
          workouts_completed_count: prev.workouts_completed_count + 1,
          current_streak: Math.max(1, prev.current_streak),
          longest_streak: Math.max(1, prev.longest_streak),
          badges: updatedBadges,
          badges_earned_count: earnedCount,
        };
      });

      refetchGamification();
    },
    [refetchGamification]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-surface dark:bg-surface-dark min-h-screen">
        <Topbar placeholder="Search gamification..." />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="h-40 w-full animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
            <div className="h-64 w-full animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
          </div>
        </main>
      </div>
    );
  }

  if (!data) return null;

  const isNewUser =
    data.total_xp === 0 &&
    data.current_streak === 0 &&
    data.badges_earned_count === 0;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface dark:bg-surface-dark min-h-screen">
      <Topbar placeholder="Search gamification..." />
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-up">
          {/* ── Header (preserved) ── */}
          <div>
            <h1 className="text-3xl font-display font-bold text-ink dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg shadow-sm">
                <Sparkles size={20} />
              </span>
              Gamification
            </h1>
            <p className="text-ink-muted mt-2">
              Earn XP, build streaks, and unlock badges as you train.
            </p>
          </div>

          {/* ── New user welcome (preserved) ── */}
          {isNewUser && (
            <Card className="p-6 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="h-16 w-16 rounded-full bg-accent/20 text-accent flex items-center justify-center text-3xl">
                  👋
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl text-ink dark:text-white">
                    Welcome to Gamification!
                  </h3>
                  <p className="text-ink-muted max-w-md mx-auto mt-2 leading-relaxed">
                    Start a workout below to earn XP, build streaks, and unlock badges!
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ── XP & Streaks grid (preserved) ── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* XP & Level (takes 7 cols) */}
            <Card className="md:col-span-7 p-8 border-primary/20 bg-gradient-to-br from-white via-primary/[0.03] to-secondary/[0.06] dark:from-card-dark dark:via-card-dark dark:to-primary/10 flex flex-col justify-center">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Total XP
                  </p>
                  <p className="text-5xl font-display font-bold text-ink dark:text-white mt-2 flex items-center gap-3">
                    {data.total_xp} <span className="text-3xl">⭐</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-2xl bg-primary text-white font-bold shadow-md shadow-primary/20">
                    Level {data.level}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold mb-3">
                  <span className="text-ink-muted">Progress to Level {data.level + 1}</span>
                  <span className="text-primary font-bold">{data.xp_needed_for_next} XP left</span>
                </div>
                <div className="h-4 w-full rounded-full bg-black/5 dark:bg-white/5 overflow-hidden p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.progress_pct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary shadow-sm"
                  />
                </div>
              </div>
            </Card>

            {/* Streaks (takes 5 cols) */}
            <div className="md:col-span-5 grid grid-cols-1 gap-6">
              <Card className="p-6 flex items-center gap-5 border-orange-500/10 bg-gradient-to-br from-white to-orange-500/5 dark:from-card-dark dark:to-orange-500/10">
                <div className="h-16 w-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-3xl shadow-sm">
                  🔥
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted mb-1">
                    Current Streak
                  </p>
                  <p className="text-4xl font-display font-bold text-ink dark:text-white leading-none">
                    {data.current_streak}{" "}
                    <span className="text-lg font-medium text-ink-muted ml-1">Days</span>
                  </p>
                </div>
              </Card>

              <Card className="p-6 flex items-center gap-5 border-accent/10 bg-gradient-to-br from-white to-accent/5 dark:from-card-dark dark:to-accent/10">
                <div className="h-16 w-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center text-3xl shadow-sm">
                  🏆
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-ink-muted mb-1">
                    Longest Streak
                  </p>
                  <p className="text-4xl font-display font-bold text-ink dark:text-white leading-none">
                    {data.longest_streak}{" "}
                    <span className="text-lg font-medium text-ink-muted ml-1">Days</span>
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* ── Badges (preserved) ── */}
          <div className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-ink dark:text-white flex items-center gap-3">
                <Award className="text-accent" size={28} />
                Badges Unlocked
              </h2>
              <span className="bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-bold border border-accent/20">
                {data.badges_earned_count} / {data.total_badges_count}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {data.badges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                >
                  <Card
                    className={cn(
                      "h-full p-6 text-center flex flex-col items-center transition-all duration-300",
                      badge.unlocked
                        ? "bg-white dark:bg-card-dark border-primary/20 shadow-soft hover:shadow-soft-lg hover:-translate-y-1"
                        : "opacity-60 grayscale bg-black/5 dark:bg-white/5 border-transparent"
                    )}
                  >
                    <div
                      className={cn(
                        "h-20 w-20 rounded-2xl flex items-center justify-center text-4xl mb-5 shadow-sm",
                        badge.unlocked
                          ? "bg-gradient-to-br from-primary/10 to-secondary/10 text-primary border border-primary/10"
                          : "bg-black/10 dark:bg-white/10"
                      )}
                    >
                      {badge.icon}
                    </div>
                    <h3 className="font-bold text-ink dark:text-white text-lg mb-2">
                      {badge.name}
                    </h3>
                    <p className="text-sm text-ink-muted leading-relaxed mb-4 flex-1">
                      {badge.description}
                    </p>

                    <div className="mt-auto w-full pt-3 border-t border-black/5 dark:border-white/5">
                      <span
                        className={cn(
                          "text-xs uppercase font-bold tracking-wider",
                          badge.unlocked ? "text-primary" : "text-ink-muted"
                        )}
                      >
                        {badge.unlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ── AI Form Coach — Push / Pull / Legs ── */}
          <div className="pt-8 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Dumbbell size={20} />
              </span>
              <div>
                <h2 className="text-2xl font-display font-bold text-ink dark:text-white">
                  Train with AI Form Coach
                </h2>
                <p className="text-sm text-ink-muted mt-0.5">
                  Pick a category, choose an exercise, and train with real-time AI form coaching.
                </p>
              </div>
            </div>
            <ExerciseCategoryTabs onXpAwarded={handleXpAwarded} />
          </div>
        </div>
      </main>

      {/* XP Award Toast Notification */}
      <AnimatePresence>
        {xpToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-card-dark border border-primary/20 shadow-soft-lg px-5 py-3.5 rounded-2xl"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Star size={18} />
            </span>
            <div>
              <p className="font-bold text-ink dark:text-white text-sm">
                +{xpToast.xp} XP earned!
              </p>
              {xpToast.badges.length > 0 && (
                <p className="text-xs text-accent font-semibold">
                  {"🏅 " + xpToast.badges.map((b: any) => b.name).join(", ") + " unlocked!"}
                </p>
              )}
            </div>
            <CheckCircle2 size={16} className="text-primary ml-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
