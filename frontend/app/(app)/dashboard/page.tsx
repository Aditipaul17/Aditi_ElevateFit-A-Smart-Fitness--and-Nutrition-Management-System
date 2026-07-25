"use client";

import { motion } from "framer-motion";
import { Flame, Footprints, GlassWater, Flame as StreakIcon, Plus, Utensils, Ruler, Share2, LifeBuoy } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { WeeklyActivityChart } from "@/components/WeeklyActivityChart";

const quickActions = [
  { label: "Log Workout", icon: Plus },
  { label: "Track Meal", icon: Utensils },
  { label: "Body Metrics", icon: Ruler },
  { label: "Challenge", icon: Share2 },
  { label: "SOS Support", icon: LifeBuoy },
];

export default function DashboardPage() {
  return (
    <>
      <Topbar />
      <main className="px-6 lg:px-10 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
            Hello, Alex 👋
          </h1>
          <p className="text-ink-muted mt-1">
            You&apos;ve hit 85% of your goal today. Keep pushing.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <Card className="md:col-span-1 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-xs font-semibold tracking-wide uppercase text-ink-muted">
              Fitness Score
            </p>
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-black/5 dark:text-white/10" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#2D6A4F"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - 0.84)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-display font-bold text-ink dark:text-white">84</span>
                <span className="text-[10px] uppercase tracking-wide text-secondary font-semibold">Optimized</span>
              </div>
            </div>
            <p className="text-sm text-ink-muted">
              Your readiness is high. It&apos;s a great day for high-intensity training.
            </p>
          </Card>

          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Flame size={20} />
              </span>
              <div>
                <p className="text-2xl font-display font-bold text-ink dark:text-white">1,248</p>
                <p className="text-sm text-ink-muted">Calories Burned</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <GlassWater size={20} />
              </span>
              <div>
                <p className="text-2xl font-display font-bold text-ink dark:text-white">2.1 <span className="text-sm font-medium text-ink-muted">L</span></p>
                <p className="text-sm text-ink-muted">Water Intake</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Footprints size={20} />
              </span>
              <div>
                <p className="text-2xl font-display font-bold text-ink dark:text-white">8,420 <span className="text-sm font-medium text-ink-muted">/ 10k</span></p>
                <p className="text-sm text-ink-muted">Steps Today</p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-error/10 text-error">
                <StreakIcon size={20} />
              </span>
              <div>
                <p className="text-2xl font-display font-bold text-ink dark:text-white">15 <span className="text-sm font-medium text-ink-muted">/ best 24</span></p>
                <p className="text-sm text-ink-muted">Day Streak</p>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-ink dark:text-white">
                Weekly Activity
              </h2>
              <div className="flex gap-2 text-xs font-semibold">
                <button className="rounded-full bg-primary/10 text-primary px-3 py-1.5">Week</button>
                <button className="rounded-full text-ink-muted px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">Month</button>
              </div>
            </div>
            <WeeklyActivityChart />
          </Card>

          <Card className="flex flex-col gap-4 overflow-hidden relative">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary text-white text-[11px] font-semibold px-3 py-1">
              AI Pick
            </span>
            <h3 className="text-lg font-display font-semibold text-ink dark:text-white">
              Explosive Power HIIT
            </h3>
            <p className="text-sm text-ink-muted">
              Based on your recovery score and yesterday&apos;s lighter cardio, this session is tuned to maximize today&apos;s metabolic burn.
            </p>
            <div className="flex items-center justify-between mt-auto pt-2">
              <span className="text-sm text-ink-muted">25m &middot; Hard</span>
              <button className="btn-primary !px-5 !py-2.5 text-sm">Start</button>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="text-lg font-display font-semibold text-ink dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickActions.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-black/5 dark:border-white/10 py-6 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Icon size={20} className="text-primary" />
                <span className="text-sm font-medium text-ink dark:text-white">{label}</span>
              </button>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
