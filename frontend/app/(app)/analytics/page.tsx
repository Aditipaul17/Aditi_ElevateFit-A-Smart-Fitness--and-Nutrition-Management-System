"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, TrendingUp, Dumbbell, Utensils, Target, Clock } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { WeeklyActivityChart } from "@/components/WeeklyActivityChart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/lib/AuthContext";
import { AnalyticsSummary, fetchAnalytics, ApiError } from "@/lib/api";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAnalytics(token)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Failed to load analytics data.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <Topbar placeholder="Search metrics..." />
      <main className="px-6 lg:px-10 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
            Analytics
          </h1>
          <p className="text-ink-muted mt-1">
            Track your progress across real activity, nutrition, and body metrics.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error/10 text-error text-sm px-4 py-3 border border-error/20">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-ink-muted text-sm">
            <Loader2 size={24} className="animate-spin text-primary" />
            Loading analytics dashboard...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Weight Trend Card */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display font-semibold text-ink dark:text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-secondary" /> Weight Trend
                  </h2>
                </div>
                <div className="h-64">
                  {!data?.weight_trend || data.weight_trend.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center p-4 text-ink-muted">
                      <p className="text-sm font-medium">No weight logs recorded yet.</p>
                      <p className="text-xs mt-1">
                        Update your weight in Settings to see your progress chart!
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.weight_trend} margin={{ left: -20, right: 10 }}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="currentColor"
                          className="text-black/5 dark:text-white/10"
                        />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                        />
                        <YAxis
                          domain={["dataMin - 1", "dataMax + 1"]}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#6B7280", fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,0.06)",
                            fontSize: 13,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#D4A373"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#D4A373" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>

              {/* Weekly Calories Burned/Consumed */}
              <Card>
                <h2 className="text-lg font-display font-semibold text-ink dark:text-white mb-4 flex items-center gap-2">
                  <Utensils size={18} className="text-primary" /> Daily Caloric Intake
                </h2>
                <WeeklyActivityChart data={data?.weekly_calories} />
              </Card>
            </div>

            {/* Key Metric Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Dumbbell size={22} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-primary">
                    {data?.avg_workout_frequency ? `${data.avg_workout_frequency} / wk` : "0 / wk"}
                  </p>
                  <p className="text-sm text-ink-muted">Workout Frequency</p>
                </div>
              </Card>

              <Card className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <Clock size={22} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-secondary">
                    {data?.avg_workout_duration_min ? `${data.avg_workout_duration_min} min` : "0 min"}
                  </p>
                  <p className="text-sm text-ink-muted">Avg. Workout Duration</p>
                </div>
              </Card>

              <Card className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Utensils size={22} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-primary">
                    {data?.avg_protein_intake_g ? `${data.avg_protein_intake_g}g / day` : "0g / day"}
                  </p>
                  <p className="text-sm text-ink-muted">Avg. Daily Protein</p>
                </div>
              </Card>

              <Card className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Target size={22} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-accent">
                    {data?.goal_progress_pct ? `${data.goal_progress_pct}%` : "0%"}
                  </p>
                  <p className="text-sm text-ink-muted">Goal Progress</p>
                </div>
              </Card>
            </div>
          </>
        )}
      </main>
    </>
  );
}

