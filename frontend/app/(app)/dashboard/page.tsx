"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Plus,
  Utensils,
  Ruler,
  Bot,
  TrendingUp,
  Activity,
  Dumbbell,
  Clock,
  Sparkles,
  Footprints,
  SlidersHorizontal,
  CheckCircle2,
  History,
  Play,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { WeeklyActivityChart } from "@/components/WeeklyActivityChart";
import { GamificationCard } from "@/components/GamificationCard";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useAuth } from "@/lib/AuthContext";
import {
  AnalyticsSummary,
  fetchAnalytics,
  fetchGamification,
  fetchTodaySteps,
  syncTotalSteps,
  fetchRecentWorkoutSummaries,
  WorkoutSummaryItem,
  GamificationData,
} from "@/lib/api";
import { checkDailyReset } from "@/lib/sensorPedometer";

const quickActions = [
  { label: "Step Tracker", icon: Footprints, href: "/step-counter" },
  { label: "Log Workout", icon: Plus, href: "/workouts" },
  { label: "Track Meal", icon: Utensils, href: "/nutrition" },
  { label: "Body Metrics", icon: Ruler, href: "/settings" },
  { label: "AI Coach", icon: Bot, href: "/ai-coach" },
  { label: "Analytics", icon: TrendingUp, href: "/analytics" },
];

function StatItem({
  value,
  label,
  icon: Icon,
  colorClass,
}: {
  value: string | number;
  label: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full ${colorClass}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xl font-display font-bold text-ink dark:text-white">{value}</p>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, token, isLoading } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [gamification, setGamification] = useState<GamificationData | null>(null);
  const [gamificationLoading, setGamificationLoading] = useState(true);

  // Step Tracking & Goals State
  const [todaySteps, setTodaySteps] = useState<number>(0);
  const [stepGoal, setStepGoal] = useState<number>(10000);
  const [showStepModal, setShowStepModal] = useState<boolean>(false);
  const [stepsInput, setStepsInput] = useState<string>("1000");
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSummaryItem[]>([]);

  // Onboarding Modal state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const firstName = user?.name?.split(" ")[0] ?? "Athlete";
  const hasGoal = Boolean(user?.fitness_goal);

  // Trigger Onboarding modal if user hasn't completed questionnaire
  useEffect(() => {
    if (!isLoading && user && user.onboarding_completed === false) {
      setShowOnboarding(true);
    }
  }, [isLoading, user]);

  useEffect(() => {
    // 1. Daily Reset check
    const { didReset } = checkDailyReset();

    // 2. Step Goal from localStorage
    const savedGoal = window.localStorage.getItem("elevatefit_step_goal");
    if (savedGoal) {
      setStepGoal(parseInt(savedGoal, 10) || 10000);
    }

    // 3. Local steps
    if (didReset) {
      setTodaySteps(0);
      window.localStorage.setItem("elevatefit_real_steps_today", "0");
    } else {
      const cached = window.localStorage.getItem("elevatefit_real_steps_today");
      if (cached) {
        setTodaySteps(parseInt(cached, 10) || 0);
      }
    }

    // 4. Local recent workout sessions
    const cachedSessions = window.localStorage.getItem("elevatefit_cached_recent_sessions");
    if (cachedSessions) {
      try {
        const parsed = JSON.parse(cachedSessions);
        if (Array.isArray(parsed)) setRecentWorkouts(parsed);
      } catch {}
    }

    if (!token) {
      setGamificationLoading(false);
      return;
    }

    fetchAnalytics(token)
      .then((data) => setAnalytics(data))
      .catch(() => {});

    fetchGamification(token)
      .then((data) => setGamification(data))
      .catch(() => {})
      .finally(() => setGamificationLoading(false));

    fetchTodaySteps(token)
      .then((res) => {
        if (typeof res?.steps === "number") {
          setTodaySteps((prev) => {
            const resolved = Math.max(prev, res.steps);
            window.localStorage.setItem("elevatefit_real_steps_today", String(resolved));
            return resolved;
          });
        }
      })
      .catch(() => {});

    fetchRecentWorkoutSummaries(token)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRecentWorkouts(data);
          window.localStorage.setItem("elevatefit_cached_recent_sessions", JSON.stringify(data));
        }
      })
      .catch(() => {});
  }, [token]);

  const handleLogStepsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(stepsInput, 10);
    if (isNaN(count) || count <= 0) return;

    checkDailyReset();
    const newTotal = todaySteps + count;
    setTodaySteps(newTotal);
    window.localStorage.setItem("elevatefit_real_steps_today", String(newTotal));
    setShowStepModal(false);
    setStepsInput("1000");

    if (token) {
      try {
        await syncTotalSteps(token, newTotal);
      } catch {}
    }
  };

  const stepsPct = Math.min(100, Math.round((todaySteps / stepGoal) * 100));

  return (
    <>
      <Topbar />

      {/* Onboarding Questionnaire Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          setShowOnboarding(false);
        }}
      />

      <main className="px-6 lg:px-10 py-8 space-y-8">
        {/* Greeting & Header Action */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          {isLoading ? (
            <div className="h-9 w-48 animate-pulse rounded-lg bg-black/5 dark:bg-white/10" />
          ) : (
            <div>
              <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
                Hello, {firstName} 👋
              </h1>
              <p className="text-ink-muted mt-1">
                {hasGoal
                  ? `Goal: ${user!.fitness_goal} • ${user!.dietary_preference || "Flexible"} • ${user!.workout_experience || "Beginner"}`
                  : "Complete your profile to unlock custom coaching and personalized recommendations."}
              </p>
            </div>
          )}

          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-2 rounded-xl bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 text-xs font-semibold hover:bg-primary hover:text-white transition-colors"
          >
            <SlidersHorizontal size={15} /> Retake Questionnaire
          </button>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Profile completion card */}
          <Card className="md:col-span-1 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-xs font-semibold tracking-wide uppercase text-ink-muted">
              Profile Setup
            </p>
            {isLoading ? (
              <div className="h-32 w-32 animate-pulse rounded-full bg-black/5 dark:bg-white/10" />
            ) : (
              <>
                {(() => {
                  const fields = [
                    user?.age,
                    user?.gender,
                    user?.height,
                    user?.weight,
                    user?.fitness_goal,
                    user?.activity_level,
                    user?.dietary_preference,
                    user?.workout_experience,
                    user?.preferred_workout_type,
                    user?.available_workout_time,
                  ];
                  const filled = fields.filter((f) => f != null).length;
                  const pct = Math.round((filled / fields.length) * 100);
                  const circumference = 2 * Math.PI * 52;
                  return (
                    <>
                      <div className="relative h-32 w-32 cursor-pointer" onClick={() => setShowOnboarding(true)}>
                        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                          <circle
                            cx="60"
                            cy="60"
                            r="52"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="10"
                            className="text-black/5 dark:text-white/10"
                          />
                          <circle
                            cx="60"
                            cy="60"
                            r="52"
                            fill="none"
                            stroke="#2D6A4F"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={circumference * (1 - pct / 100)}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-display font-bold text-ink dark:text-white">
                            {pct}%
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-secondary font-semibold">
                            Complete
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-ink-muted">
                        {pct < 100
                          ? "Click to complete questionnaire for custom training."
                          : "Questionnaire 100% complete! Recommendations active."}
                      </p>
                    </>
                  );
                })()}
              </>
            )}
          </Card>

          {/* Real data stat cards + Step Tracker */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Step Tracker Card */}
            <Card className="flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Footprints size={18} />
                </span>
                <button
                  onClick={() => setShowStepModal(true)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  + Add Steps
                </button>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-display font-bold text-ink dark:text-white">
                  {todaySteps.toLocaleString()}
                </p>
                <div className="flex items-center justify-between text-xs text-ink-muted mt-1">
                  <span>Daily Steps</span>
                  <span>{stepsPct}% of {stepGoal.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${stepsPct}%` }}
                  />
                </div>
              </div>
            </Card>

            <StatItem
              value={analytics ? `${analytics.total_meals_logged} Meals` : "0 Meals"}
              label="Logged Meals Intake"
              icon={Utensils}
              colorClass="bg-primary/10 text-primary"
            />
            <StatItem
              value={analytics ? `${analytics.total_workout_minutes} min` : "0 min"}
              label="Active Duration"
              icon={Clock}
              colorClass="bg-secondary/10 text-secondary"
            />
            <StatItem
              value={analytics ? `${analytics.avg_workout_frequency} / wk` : "0 / wk"}
              label="Workout Frequency"
              icon={Dumbbell}
              colorClass="bg-accent/15 text-accent"
            />
            <StatItem
              value={analytics ? `${analytics.goal_progress_pct}%` : "0%"}
              label="Overall Goal Progress"
              icon={Activity}
              colorClass="bg-primary/10 text-primary"
            />
          </div>
        </div>

        {/* Gamification Card */}
        <GamificationCard data={gamification} isLoading={gamificationLoading} />

        {/* Weekly Activity + AI Pick row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-display font-semibold text-ink dark:text-white">
                  Weekly Activity &amp; Nutrition Log
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Daily calorie intake logged over the past 7 days
                </p>
              </div>
            </div>
            <WeeklyActivityChart data={analytics?.weekly_calories} />
          </Card>

          <Card className="flex flex-col gap-4 overflow-hidden relative">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary text-white text-[11px] font-semibold px-3 py-1">
              <Sparkles size={12} /> AI Coach
            </span>
            <h3 className="text-lg font-display font-semibold text-ink dark:text-white">
              Personalized AI Guidance
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Your AI Coach uses your questionnaire profile ({user?.dietary_preference || "Flexible"}, {user?.fitness_goal || "General fitness"}, {user?.equipment?.join(", ") || "Bodyweight"}) to answer questions &amp; prescribe workouts.
            </p>
            <div className="flex items-center justify-between mt-auto pt-2">
              <span className="text-xs text-ink-muted font-medium">Ready 24/7</span>
              <Link href="/ai-coach" className="btn-primary !px-4 !py-2 text-xs">
                Chat AI Coach
              </Link>
            </div>
          </Card>
        </div>

        {/* Recent Workout Summaries & Fitness Activity */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History size={18} className="text-primary" />
              <h2 className="text-lg font-display font-semibold text-ink dark:text-white">
                Recent Workout Summaries &amp; Fitness Tracking
              </h2>
            </div>
            <Link
              href="/step-counter"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Play size={12} className="fill-current" /> Open Live Sensor Tracker
            </Link>
          </div>

          {recentWorkouts.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-black/5 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 text-xs text-ink-muted space-y-2">
              <p>No phone sensor workout sessions recorded yet.</p>
              <Link
                href="/step-counter"
                className="btn-primary !px-4 !py-2 text-xs inline-flex items-center gap-1.5 font-semibold"
              >
                <Play size={12} className="fill-white" /> Start Your First Sensor Workout
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentWorkouts.slice(0, 6).map((workout) => (
                <div
                  key={workout.id}
                  className="flex flex-col justify-between p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-ink dark:text-white text-sm">
                      {workout.title}
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
                      {workout.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-ink-muted text-[11px] mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                    <span>{workout.duration_minutes} min • {workout.calories} kcal</span>
                    {workout.steps > 0 && (
                      <span className="font-semibold text-primary">
                        {workout.steps.toLocaleString()} steps ({workout.distance_km} km)
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-ink-muted mt-1">{workout.date}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-display font-semibold text-ink dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-black/5 dark:border-white/10 py-6 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Icon size={20} className="text-primary" />
                <span className="text-sm font-medium text-ink dark:text-white">{label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </main>

      {/* Log Steps Modal */}
      {showStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-card w-full max-w-sm rounded-2xl p-6 border border-black/10 dark:border-white/10 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-ink dark:text-white flex items-center gap-2">
              <Footprints size={18} className="text-accent" /> Log Daily Steps
            </h3>
            <form onSubmit={handleLogStepsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                  Steps Walked / Run Today
                </label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={stepsInput}
                  onChange={(e) => setStepsInput(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  placeholder="e.g. 2500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStepModal(false)}
                  className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent text-white px-5 py-2 text-xs font-semibold hover:bg-accent/90 transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 size={14} /> Save Steps
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
