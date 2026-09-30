"use client";

import React, { useState } from "react";
import { CompletedWorkoutRecord } from "./ActiveWorkoutSessionModal";
import { Card } from "@/components/ui/Card";
import { Clock, Flame, Calendar, CheckCircle2, Trophy, ChevronDown, ChevronUp } from "lucide-react";

interface WorkoutHistorySectionProps {
  history: CompletedWorkoutRecord[];
  onClearHistory?: () => void;
}

export function WorkoutHistorySection({ history, onClearHistory }: WorkoutHistorySectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!history || history.length === 0) {
    return (
      <Card className="p-8 text-center text-ink-muted">
        <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <Trophy size={24} />
        </div>
        <h3 className="font-display font-semibold text-ink dark:text-white text-base">
          No Completed Workouts Yet
        </h3>
        <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
          Start a workout from your recommendations above! Completed workout sessions will automatically appear in your workout history.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-ink dark:text-white flex items-center gap-2">
            <CheckCircle2 size={22} className="text-primary" /> Workout History
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Your logged workout sessions and performance history.
          </p>
        </div>

        {onClearHistory && (
          <button
            onClick={onClearHistory}
            className="text-xs text-ink-muted hover:text-error transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      <div className="space-y-3">
        {history.map((record) => {
          const isExpanded = expandedId === record.id;
          return (
            <Card key={record.id} className="p-5 overflow-hidden transition-all">
              <div
                onClick={() => setExpandedId(isExpanded ? null : record.id)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-primary font-semibold mb-1">
                    <Calendar size={14} />
                    <span>{record.date}</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-ink dark:text-white leading-tight">
                    {record.title}
                  </h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-4 text-xs font-medium text-ink-muted bg-surface dark:bg-surface-dark px-4 py-2 rounded-2xl border border-black/5 dark:border-white/5">
                    <span className="flex items-center gap-1 text-ink dark:text-white font-bold">
                      <Clock size={14} className="text-primary" /> {record.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1 text-warning font-bold">
                      <Flame size={14} /> {record.caloriesBurned} kcal
                    </span>
                    <span className="text-xs font-semibold text-secondary">
                      {record.totalExercises} Exercises
                    </span>
                  </div>

                  <button className="h-8 w-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-ink-muted">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* EXPANDABLE EXERCISES LIST */}
              {isExpanded && record.exercisesSummary && record.exercisesSummary.length > 0 && (
                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/10 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
                    Performed Exercises
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {record.exercisesSummary.map((itemStr, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-surface dark:bg-surface-dark border border-black/5 dark:border-white/5 text-xs text-ink dark:text-white font-medium"
                      >
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span>{itemStr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
