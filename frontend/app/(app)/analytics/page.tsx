"use client";

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

const weightTrend = [
  { week: "W1", weight: 78.4 },
  { week: "W2", weight: 78.0 },
  { week: "W3", weight: 77.5 },
  { week: "W4", weight: 77.1 },
  { week: "W5", weight: 76.6 },
  { week: "W6", weight: 76.3 },
];

export default function AnalyticsPage() {
  return (
    <>
      <Topbar placeholder="Search metrics..." />
      <main className="px-6 lg:px-10 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
            Analytics
          </h1>
          <p className="text-ink-muted mt-1">
            Track your progress across the metrics that matter.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <h2 className="text-lg font-display font-semibold text-ink dark:text-white mb-4">
              Weight Trend
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightTrend} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-black/5 dark:text-white/10" />
                  <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} tickLine={false} axisLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }} />
                  <Line type="monotone" dataKey="weight" stroke="#D4A373" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-display font-semibold text-ink dark:text-white mb-4">
              Weekly Calories Burned
            </h2>
            <WeeklyActivityChart />
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: "Avg. Workout Frequency", value: "5.2 / week" },
            { label: "Avg. Recovery Score", value: "82 / 100" },
            { label: "Goal Achievement Rate", value: "94%" },
          ].map((stat) => (
            <Card key={stat.label}>
              <p className="text-2xl font-display font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-ink-muted mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
