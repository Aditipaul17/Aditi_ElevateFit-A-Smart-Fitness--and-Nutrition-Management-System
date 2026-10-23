"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  Dumbbell,
  Utensils,
  Target,
  Clock,
  Scale,
  Plus,
  CheckCircle2,
  FileText,
} from "lucide-react";
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
import {
  AnalyticsSummary,
  fetchAnalytics,
  logWeightCheckin,
  downloadFitnessReport,
  ApiError,
} from "@/lib/api";

export default function AnalyticsPage() {
  const { token, refreshUser } = useAuth();
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Download Report state
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadReport = async () => {
    if (!token) return;
    setIsDownloadingReport(true);
    setDownloadError(null);
    try {
      await downloadFitnessReport(token);
    } catch (err) {
      if (err instanceof ApiError) {
        setDownloadError(err.message);
      } else {
        setDownloadError("Failed to generate and download fitness report.");
      }
    } finally {
      setIsDownloadingReport(false);
    }
  };

  // Weekly Weight Check-in state
  const [weightInput, setWeightInput] = useState("");
  const [isSubmittingWeight, setIsSubmittingWeight] = useState(false);
  const [weightSuccessMsg, setWeightSuccessMsg] = useState<string | null>(null);
  const [weightErrorMsg, setWeightErrorMsg] = useState<string | null>(null);

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

  const handleWeightCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const parsedWeight = parseFloat(weightInput);
    if (isNaN(parsedWeight) || parsedWeight <= 20 || parsedWeight > 500) {
      setWeightErrorMsg("Please enter a valid weight (20 - 500 kg).");
      return;
    }

    setIsSubmittingWeight(true);
    setWeightErrorMsg(null);
    setWeightSuccessMsg(null);

    try {
      const res = await logWeightCheckin(token, parsedWeight);
      if (data) {
        setData({
          ...data,
          weight_trend: res.weight_trend,
        });
      }
      setWeightSuccessMsg(`Logged ${res.current_weight} kg!`);
      setWeightInput("");
      if (refreshUser) {
        refreshUser().catch(() => {});
      }
      setTimeout(() => {
        setWeightSuccessMsg(null);
      }, 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setWeightErrorMsg(err.message);
      } else {
        setWeightErrorMsg("Failed to record weight.");
      }
    } finally {
      setIsSubmittingWeight(false);
    }
  };

  // Calculate delta from last 2 entries
  const weightTrend = data?.weight_trend || [];
  const latestWeight = weightTrend.length > 0 ? weightTrend[weightTrend.length - 1].weight : null;
  const prevWeight = weightTrend.length > 1 ? weightTrend[weightTrend.length - 2].weight : null;
  const weightDelta =
    latestWeight !== null && prevWeight !== null
      ? Math.round((latestWeight - prevWeight) * 10) / 10
      : null;

  return (
    <>
      <Topbar placeholder="Search metrics..." />
      <main className="px-6 lg:px-10 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
              Analytics
            </h1>
            <p className="text-ink-muted mt-1">
              Track your progress across real activity, nutrition, and body metrics.
            </p>
          </div>
          <button
            onClick={handleDownloadReport}
            disabled={isDownloadingReport}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-primary hover:bg-primary-hover active:scale-[0.98] shadow-sm shadow-primary/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isDownloadingReport ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating Report...</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>Download My Fitness Report</span>
              </>
            )}
          </button>
        </div>

        {downloadError && (
          <div className="flex items-center gap-2 rounded-xl bg-error/10 text-error text-sm px-4 py-3 border border-error/20">
            <AlertCircle size={18} className="shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

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
              {/* Weight Trend Card with Weekly Check-in */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-lg font-display font-semibold text-ink dark:text-white flex items-center gap-2">
                      <TrendingUp size={18} className="text-secondary" /> Weight Trend
                    </h2>
                    <p className="text-xs text-ink-muted">Weekly check-in & body weight progression</p>
                  </div>
                  {latestWeight !== null && (
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-base font-bold text-ink dark:text-white">
                          {latestWeight} <span className="text-xs font-normal text-ink-muted">kg</span>
                        </span>
                      </div>
                      {weightDelta !== null && (
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                            weightDelta < 0
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : weightDelta > 0
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-surface text-ink-muted"
                          }`}
                        >
                          {weightDelta > 0 ? `+${weightDelta}` : `${weightDelta}`} kg
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Weekly Check-in Input Bar */}
                <form
                  onSubmit={handleWeightCheckin}
                  className="mb-4 p-3 rounded-xl bg-surface/70 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] flex flex-wrap sm:flex-nowrap items-center gap-2.5"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <Scale size={16} className="text-secondary" />
                    <span className="text-xs font-semibold text-ink dark:text-white">
                      Weekly Check-in:
                    </span>
                  </div>
                  <div className="relative flex-1 min-w-[120px] max-w-[160px]">
                    <input
                      type="number"
                      step="0.1"
                      min="20"
                      max="500"
                      placeholder="e.g. 72.5"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      disabled={isSubmittingWeight}
                      className="w-full text-xs font-medium rounded-lg px-2.5 py-1.5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-ink dark:text-white placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-secondary pr-7"
                    />
                    <span className="absolute right-2 top-1.5 text-xs text-ink-muted font-medium pointer-events-none">
                      kg
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingWeight || !weightInput}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-ink hover:opacity-90 active:scale-95 transition disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSubmittingWeight ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Plus size={13} />
                    )}
                    Log Weight
                  </button>
                  {weightSuccessMsg && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 size={13} /> {weightSuccessMsg}
                    </span>
                  )}
                  {weightErrorMsg && (
                    <span className="text-xs text-error font-medium">{weightErrorMsg}</span>
                  )}
                </form>

                <div className="h-56">
                  {!data?.weight_trend || data.weight_trend.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center p-4 text-ink-muted">
                      <p className="text-sm font-medium">No weight logs recorded yet.</p>
                      <p className="text-xs mt-1">
                        Enter your weight above to record your first weekly check-in!
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.weight_trend} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
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
                          formatter={(value: any) => [`${value} kg`, "Weight"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="#D4A373"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#D4A373" }}
                          activeDot={{ r: 6 }}
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

