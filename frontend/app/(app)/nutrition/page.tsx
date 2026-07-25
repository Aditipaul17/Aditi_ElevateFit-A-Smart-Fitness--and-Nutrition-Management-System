"use client";

import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { nutritionToday, meals } from "@/lib/data";
import { motion } from "framer-motion";

function Macro({
  label,
  consumed,
  goal,
  unit,
  color,
}: {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, Math.round((consumed / goal) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium text-ink dark:text-white">{label}</span>
        <span className="text-ink-muted">
          {consumed}
          {unit} / {goal}
          {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function NutritionPage() {
  const caloriesPct = Math.round(
    (nutritionToday.calories.consumed / nutritionToday.calories.goal) * 100
  );

  return (
    <>
      <Topbar placeholder="Search foods, recipes, or meals..." />
      <main className="px-6 lg:px-10 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
            Nutrition
          </h1>
          <p className="text-ink-muted mt-1">
            Track today&apos;s intake and stay aligned with your goals.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="flex flex-col items-center text-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Calories Today
            </p>
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-black/5 dark:text-white/10" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#D4A373"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - caloriesPct / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-display font-bold text-ink dark:text-white">
                  {nutritionToday.calories.consumed}
                </span>
                <span className="text-[11px] text-ink-muted">
                  of {nutritionToday.calories.goal} kcal
                </span>
              </div>
            </div>
          </Card>

          <Card className="lg:col-span-2 flex flex-col justify-center gap-5">
            <Macro label="Protein" consumed={nutritionToday.protein.consumed} goal={nutritionToday.protein.goal} unit="g" color="#2D6A4F" />
            <Macro label="Carbs" consumed={nutritionToday.carbs.consumed} goal={nutritionToday.carbs.goal} unit="g" color="#40916C" />
            <Macro label="Fat" consumed={nutritionToday.fat.consumed} goal={nutritionToday.fat.goal} unit="g" color="#D4A373" />
            <Macro label="Fiber" consumed={nutritionToday.fiber.consumed} goal={nutritionToday.fiber.goal} unit="g" color="#16A34A" />
            <Macro label="Water" consumed={nutritionToday.water.consumed} goal={nutritionToday.water.goal} unit="L" color="#3B82F6" />
          </Card>
        </div>

        <Card>
          <h2 className="text-lg font-display font-semibold text-ink dark:text-white mb-4">
            Meal Planner
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="rounded-xl border border-black/5 dark:border-white/10 p-4 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-ink dark:text-white">{meal.name}</h3>
                  <span className="text-xs text-ink-muted">{meal.time}</span>
                </div>
                <p className="text-sm text-ink-muted mb-3">{meal.items}</p>
                <span className="text-sm font-semibold text-primary">{meal.calories} kcal</span>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
