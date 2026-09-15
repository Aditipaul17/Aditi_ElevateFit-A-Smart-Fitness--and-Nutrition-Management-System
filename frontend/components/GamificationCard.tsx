"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Flame, Trophy, Award, ArrowRight, Star } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GamificationData } from "@/lib/api";

export function GamificationCard({
  data,
  isLoading,
}: {
  data: GamificationData | null;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="flex flex-col gap-4 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5">
        <div className="h-6 w-36 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-20 w-full animate-pulse rounded-xl bg-black/10 dark:bg-white/10" />
      </Card>
    );
  }

  const totalXp = data?.total_xp ?? 0;
  const level = data?.level ?? 1;
  const currentStreak = data?.current_streak ?? 0;
  const longestStreak = data?.longest_streak ?? 0;
  const badgesEarned = data?.badges_earned_count ?? 0;
  const xpNeededForNext = data?.xp_needed_for_next ?? 500;
  const nextLevel = level + 1;
  const progressPct = data?.progress_pct ?? 0;

  const isNewUser = totalXp === 0 && currentStreak === 0 && badgesEarned === 0;

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-white via-primary/[0.03] to-emerald-500/[0.06] dark:from-card-dark dark:via-card-dark dark:to-primary/10 p-6">
      {/* Header section matching reference layout */}
      <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-sm">
              <Sparkles size={14} />
            </span>
            <h2 className="font-display font-bold tracking-wider text-xs uppercase text-ink dark:text-white">
              GAMIFICATION
            </h2>
          </div>
          <p className="text-[11px] font-semibold text-secondary mt-0.5 tracking-wide uppercase">
            XP • Badges • Streaks
          </p>
        </div>
        <Link
          href="/gamification"
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-secondary transition-colors"
        >
          View All Badges <ArrowRight size={14} />
        </Link>
      </div>

      {isNewUser ? (
        <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
            ⭐
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">
              Complete your first workout to start earning XP!
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Earn badges, build streaks, and unlock new levels as you train.
            </p>
          </div>
          <Link
            href="/workouts"
            className="btn-primary !px-4 !py-2 text-xs font-semibold mt-1"
          >
            Start a Workout
          </Link>
        </div>
      ) : (
        <div className="pt-4 space-y-5">
          {/* XP & Level Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <div>
                <span className="text-xl font-display font-bold text-ink dark:text-white">
                  {totalXp} XP
                </span>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold px-3 py-1 border border-primary/20">
              Level {level}
            </span>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
              <span className="text-ink-muted">Level {level} Progress</span>
              <span className="text-primary font-bold">
                {xpNeededForNext} XP to Level {nextLevel}
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 shadow-sm"
              />
            </div>
          </div>

          {/* Streaks & Badges Summary */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2.5 rounded-xl bg-black/[0.03] dark:bg-white/5 p-3 border border-black/5 dark:border-white/5">
              <span className="text-lg">🔥</span>
              <div>
                <p className="text-xs font-bold text-ink dark:text-white leading-tight">
                  {currentStreak} Day Streak
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  🏆 Best: {longestStreak} Days
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl bg-black/[0.03] dark:bg-white/5 p-3 border border-black/5 dark:border-white/5">
              <span className="text-lg">🏅</span>
              <div>
                <p className="text-xs font-bold text-ink dark:text-white leading-tight">
                  {badgesEarned} Badges
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">Earned so far</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
