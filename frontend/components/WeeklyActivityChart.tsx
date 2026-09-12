"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { DailyCaloriePoint } from "@/lib/api";
import { weeklyActivity } from "@/lib/data";

interface WeeklyActivityChartProps {
  data?: DailyCaloriePoint[];
}

export function WeeklyActivityChart({ data }: WeeklyActivityChartProps) {
  const chartData = data && data.length > 0 ? data : weeklyActivity;
  const hasData = chartData.some((d) => d.calories > 0);

  if (data && !hasData) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-center p-4 text-ink-muted">
        <p className="text-sm font-medium">No meal calories recorded in the last 7 days.</p>
        <p className="text-xs mt-1">Log your meals on the Nutrition page to see your real intake trend!</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="caloriesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2D6A4F" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#2D6A4F" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-black/5 dark:text-white/10" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.06)",
              fontSize: 13,
            }}
          />
          <Area
            type="monotone"
            dataKey="calories"
            stroke="#2D6A4F"
            strokeWidth={2.5}
            fill="url(#caloriesFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

