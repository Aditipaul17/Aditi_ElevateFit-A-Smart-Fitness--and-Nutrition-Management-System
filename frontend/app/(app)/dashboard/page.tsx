"use client";

import { motion } from "framer-motion";
import {
  Plus,
  Utensils,
  Ruler,
  Share2,
  LifeBuoy,
  TrendingUp,
  Activity,
  Dumbbell,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { WeeklyActivityChart } from "@/components/WeeklyActivityChart";
import { useAuth } from "@/lib/AuthContext";

const quickActions = [
  { label: "Log Workout", icon: Plus },
  { label: "Track Meal", icon: Utensils },
  { label: "Body Metrics", icon: Ruler },
  { label: "Challenge", icon: Share2 },
  { label: "SOS Support", icon: LifeBuoy },
];

function EmptyStat({
  label,
  icon: Icon,
  colorClass,
}: {
  label: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${colorClass}`}
      >
        <Icon size={20} />
      </span>
      <div>
        <p className="text-lg font-display font-semibold text-ink-muted dark:text-white/40">
          —
        </p>
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  const firstName = user?.name?.split(" ")[0] ?? "Athlete";

  // Check if profile is complete enough to show a personalised message
  const hasGoal = Boolean(user?.fitness_goal);

  return (
    <>
      <Topbar />
      <main className="px-6 lg:px-10 py-8 space-y-8">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {isLoading ? (
            <div className="h-9 w-48 animate-pulse rounded-lg bg-black/5 dark:bg-white/10" />
          ) : (
            <>
              <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
                Hello, {firstName} 👋
              </h1>
              <p className="text-ink-muted mt-1">
                {hasGoal
                  ? `Your goal: ${user!.fitness_goal!.replace(/_/g, " ")}.`
                  : "Complete your profile in Settings to personalise your experience."}
              </p>
            </>
          )}
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Profile completion card (replaces fake fitness score) */}
          <Card className="md:col-span-1 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-xs font-semibold tracking-wide uppercase text-ink-muted">
              Profile
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
                  ];
                  const filled = fields.filter((f) => f != null).length;
                  const pct = Math.round((filled / fields.length) * 100);
                  const circumference = 2 * Math.PI * 52;
                  return (
                    <>
                      <div className="relative h-32 w-32">
                        <svg
                          viewBox="0 0 120 120"
                          className="h-full w-full -rotate-90"
                        >
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
                            strokeDashoffset={
                              circumference * (1 - pct / 100)
                            }
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
                      <p className="text-sm text-ink-muted">
                        {pct < 100
                          ? "Fill in your profile to unlock personalised coaching."
                          : "Your profile is complete!"}
                      </p>
                    </>
                  );
                })()}
              </>
            )}
          </Card>

          {/* No-data stat cards — real data available once workout/nutrition is wired */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <EmptyStat
              label="Calories Burned"
              icon={Activity}
              colorClass="bg-primary/10 text-primary"
            />
            <EmptyStat
              label="Active Minutes"
              icon={TrendingUp}
              colorClass="bg-secondary/10 text-secondary"
            />
            <EmptyStat
              label="Workouts This Week"
              icon={Dumbbell}
              colorClass="bg-accent/15 text-accent"
            />
            <EmptyStat
              label="Day Streak"
              icon={Activity}
              colorClass="bg-error/10 text-error"
            />
          </div>
        </div>

        {/* Weekly Activity + AI Pick row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-display font-semibold text-ink dark:text-white">
                  Weekly Activity
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Sample data — connect workouts to see your real activity
                </p>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <button className="rounded-full bg-primary/10 text-primary px-3 py-1.5">
                  Week
                </button>
                <button className="rounded-full text-ink-muted px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/5">
                  Month
                </button>
              </div>
            </div>
            <WeeklyActivityChart />
          </Card>

          <Card className="flex flex-col gap-4 overflow-hidden relative">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary text-white text-[11px] font-semibold px-3 py-1">
              Coming Soon
            </span>
            <h3 className="text-lg font-display font-semibold text-ink dark:text-white">
              AI Workout Pick
            </h3>
            <p className="text-sm text-ink-muted">
              Your personalised workout recommendation will appear here once
              the AI Coach is connected.
            </p>
            <div className="flex items-center justify-between mt-auto pt-2">
              <span className="text-sm text-ink-muted">—</span>
              <button
                disabled
                className="btn-primary !px-5 !py-2.5 text-sm opacity-40 cursor-not-allowed"
              >
                Start
              </button>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
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
                <span className="text-sm font-medium text-ink dark:text-white">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
