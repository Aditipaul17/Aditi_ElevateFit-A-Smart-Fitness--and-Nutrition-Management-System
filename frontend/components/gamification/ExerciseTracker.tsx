"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Dumbbell,
  Star,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Flame,
  Target,
  Trophy,
  Award,
  Zap,
  Info,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/AuthContext";
import { recordGamificationActivity } from "@/lib/api";
import type { Exercise as WorkoutExercise } from "./workoutData";
import { ExerciseAnimationPanel } from "./ExerciseAnimationPanel";
import { LivePoseTracker } from "./LivePoseTracker";
import { cn } from "@/lib/utils";

// ── Collapsible coach notes accordion ──────────────────────────────────────
type CoachTab = "guide" | "tips";
function CoachNotes({ exercise }: { exercise: WorkoutExercise }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CoachTab>("guide");

  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-card-dark overflow-hidden shadow-soft">
      {/* Toggle row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left group"
      >
        <div className="flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Info size={14} />
          </span>
          <span className="font-display font-bold text-sm text-ink dark:text-white">
            Coach Notes
          </span>
          {/* Quick-peek chips */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
              {exercise.instructions.length} steps
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
              {exercise.formTips.length} tips
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
              {exercise.commonMistakes.length} mistakes to avoid
            </span>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            "text-ink-muted transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {/* Tab row */}
            <div className="flex items-center gap-1 px-5 pb-3 border-t border-black/5 dark:border-white/5 pt-3">
              {(["guide", "tips"] as CoachTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-colors",
                    tab === t
                      ? "bg-primary text-white shadow-sm"
                      : "bg-black/5 dark:bg-white/5 text-ink-muted hover:text-ink"
                  )}
                >
                  {t === "guide" ? "📋 Execution Guide" : "💡 Form Tips & Mistakes"}
                </button>
              ))}
            </div>

            <div className="px-5 pb-5">
              <AnimatePresence mode="wait">
                {tab === "guide" && (
                  <motion.ol
                    key="guide"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-2"
                  >
                    {exercise.instructions.map((step, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-ink-muted leading-relaxed">
                        <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </motion.ol>
                )}
                {tab === "tips" && (
                  <motion.div
                    key="tips"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-4"
                  >
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                        ✓ Pro Form Tips
                      </p>
                      <ul className="space-y-1.5">
                        {exercise.formTips.map((tip, i) => (
                          <li key={i} className="text-xs text-ink-muted flex items-start gap-2">
                            <span className="text-emerald-500 font-bold shrink-0">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
                        ⚠️ Avoid These Mistakes
                      </p>
                      <ul className="space-y-1.5">
                        {exercise.commonMistakes.map((mistake, i) => (
                          <li key={i} className="text-xs text-ink-muted flex items-start gap-2">
                            <span className="text-amber-500 font-bold shrink-0">•</span>
                            <span>{mistake}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ExerciseTrackerProps {
  exercise: WorkoutExercise;
  onBack: () => void;
  onXpAwarded: (xp: number, newBadges: any[]) => void;
}

const MIN_REPS_TO_LOG = 3;
const COOLDOWN_MS = 30_000; // 30s cooldown between XP claims

export function ExerciseTracker({
  exercise,
  onBack,
  onXpAwarded,
}: ExerciseTrackerProps) {
  const { token, user } = useAuth();
  const [liveReps, setLiveReps] = useState(0);
  const [userPhase, setUserPhase] = useState<"top" | "bottom">("top");
  const [pendingReps, setPendingReps] = useState(0);
  const [pendingCals, setPendingCals] = useState(0);
  const [formAccuracy, setFormAccuracy] = useState(100);
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [lastLoggedAt, setLastLoggedAt] = useState<number | null>(null);
  const [rewardMsg, setRewardMsg] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [completedSetsCount, setCompletedSetsCount] = useState(0);

  // Load saved completed sets from localStorage for today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const key = `elevatefit_exercise_sets_${today}_${exercise.id}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setCompletedSetsCount(parseInt(saved, 10) || 0);
      }
    } catch {}
  }, [exercise.id]);

  const cooldownRemaining = lastLoggedAt
    ? Math.max(0, COOLDOWN_MS - (Date.now() - lastLoggedAt))
    : 0;

  // Strict check: Progress awarded based ONLY on actual completed repetitions and sets
  const canLog =
    pendingReps >= MIN_REPS_TO_LOG &&
    cooldownRemaining === 0 &&
    !isLogging;

  const handleRepsUpdate = useCallback((reps: number) => {
    setLiveReps(reps);
  }, []);

  const handlePhaseChange = useCallback((phase: "top" | "bottom") => {
    setUserPhase(phase);
  }, []);

  const handleSessionEnd = useCallback(
    (reps: number, calories: number, accuracy: number) => {
      setPendingReps(reps);
      setPendingCals(calories);
      setFormAccuracy(accuracy);
      setShowSummary(true);
    },
    []
  );

  const handleLogXP = async () => {
    if (!token || !canLog) return;
    setIsLogging(true);
    setLogError(null);

    try {
      // Award progress to existing gamification backend
      const reward = await recordGamificationActivity(token, "workout");
      setLastLoggedAt(Date.now());
      setRewardMsg(reward.message ?? `+${reward.xp_gained} XP earned!`);

      // Update sets completed locally
      const today = new Date().toISOString().split("T")[0];
      const key = `elevatefit_exercise_sets_${today}_${exercise.id}`;
      const newSets = completedSetsCount + 1;
      setCompletedSetsCount(newSets);
      try {
        localStorage.setItem(key, newSets.toString());
        // Also register completion in category list
        const catKey = `elevatefit_completed_exercises_${today}`;
        const existingCompleted = JSON.parse(localStorage.getItem(catKey) ?? "[]");
        if (!existingCompleted.includes(exercise.id)) {
          existingCompleted.push(exercise.id);
          localStorage.setItem(catKey, JSON.stringify(existingCompleted));
        }
      } catch {}

      // Fire callback to refresh parent gamification page XP & badges
      onXpAwarded(reward.xp_gained, reward.new_badges ?? []);
      setTimeout(() => setRewardMsg(null), 5000);
    } catch (err: any) {
      setLogError(err?.message ?? "Could not log workout set. Please try again.");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-card-dark p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-soft">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-ink-muted hover:text-ink dark:hover:text-white transition-colors text-xs font-semibold"
          >
            <ArrowLeft size={14} />
            Back to Category
          </button>

          <div className="h-5 w-px bg-black/10 dark:bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Dumbbell size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-ink dark:text-white text-lg leading-tight">
                  {exercise.name}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-accent/15 text-accent px-2 py-0.5 rounded-md">
                  {exercise.difficulty}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                {exercise.muscles.join(" · ")} &nbsp;|&nbsp; {exercise.equipment}
              </p>
            </div>
          </div>
        </div>

        {/* Set Counter Badge */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-ink-muted block">
              Today&apos;s Sets
            </span>
            <span className="text-sm font-bold text-primary">
              {completedSetsCount} completed
            </span>
          </div>
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            ✓
          </div>
        </div>
      </div>

      {/* ── Two-Panel Side-by-Side View ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Panel 1: Correct Form Reference Animation */}
        <Card className="p-5 border-primary/20 bg-gradient-to-br from-white via-primary/[0.02] to-secondary/[0.04] dark:from-card-dark dark:to-primary/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <h4 className="font-display font-bold text-ink dark:text-white text-base">
                  Correct Form Reference
                </h4>
              </div>
              <span className="text-[10px] font-semibold text-ink-muted bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
                Anatomical AI
              </span>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              Reference angles & joint path
            </p>
          </div>

          <div className="h-[380px] flex flex-col">
            <ExerciseAnimationPanel
              exercise={exercise}
              userMovementPhase={userPhase}
            />
          </div>
        </Card>

        {/* Panel 2: Live Webcam Pose Tracking */}
        <Card className="p-5 border-secondary/20 bg-gradient-to-br from-white via-secondary/[0.02] to-accent/[0.04] dark:from-card-dark dark:to-secondary/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
                <h4 className="font-display font-bold text-ink dark:text-white text-base">
                  Your Form (Webcam AI)
                </h4>
              </div>
              <span className="text-[10px] font-bold text-ink-muted">
                Completed: <span className="text-primary font-bold">{liveReps} reps</span>
              </span>
            </div>
            <p className="text-xs text-ink-muted mb-3">
              Live skeleton overlay · auto angle detection
            </p>
          </div>

          <div className="h-[380px] flex flex-col">
            <LivePoseTracker
              exercise={exercise}
              onRepsUpdate={handleRepsUpdate}
              onPhaseChange={handlePhaseChange}
              onSessionEnd={handleSessionEnd}
            />
          </div>
        </Card>
      </div>

      {/* ── Set Complete & XP Award Card ── */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <Card className="p-6 border-accent/30 bg-gradient-to-r from-accent/10 via-primary/5 to-secondary/10 shadow-soft-lg">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
                      <Trophy size={16} />
                    </span>
                    <h3 className="font-display font-bold text-ink dark:text-white text-xl">
                      Set Complete!
                    </h3>
                  </div>

                  {/* Stats Row */}
                  <div className="flex flex-wrap items-center gap-4 text-sm pt-1">
                    <div className="flex items-center gap-1.5 bg-white/70 dark:bg-card-dark/80 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                      <Zap size={15} className="text-primary" />
                      <span className="text-ink-muted text-xs">Reps:</span>
                      <span className="font-bold text-ink dark:text-white">
                        {pendingReps}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/70 dark:bg-card-dark/80 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                      <Flame size={15} className="text-amber-500" />
                      <span className="text-ink-muted text-xs">Calories:</span>
                      <span className="font-bold text-ink dark:text-white">
                        ~{pendingCals} kcal
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/70 dark:bg-card-dark/80 px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/5">
                      <Target size={15} className="text-emerald-500" />
                      <span className="text-ink-muted text-xs">Form Accuracy:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formAccuracy}%
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-xl font-bold">
                      <Star size={15} />
                      <span>+{pendingReps * exercise.xpPerRep + 50} XP est.</span>
                    </div>
                  </div>

                  {pendingReps < MIN_REPS_TO_LOG && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 pt-1">
                      <ShieldAlert size={13} />
                      Complete at least {MIN_REPS_TO_LOG} verified webcam reps to log this set and claim XP.
                    </p>
                  )}
                </div>

                {/* Log & Claim Button */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {rewardMsg ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl shadow-glow"
                    >
                      <CheckCircle2 size={18} />
                      <span className="text-sm font-bold">{rewardMsg}</span>
                    </motion.div>
                  ) : (
                    <button
                      onClick={handleLogXP}
                      disabled={!canLog}
                      className="btn-primary !px-6 !py-3 text-sm font-bold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isLogging ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Crediting XP…
                        </>
                      ) : (
                        <>
                          <Award size={16} />
                          Log Set & Claim XP
                        </>
                      )}
                    </button>
                  )}

                  {cooldownRemaining > 0 && (
                    <p className="text-[11px] text-ink-muted">
                      Anti-spam cooldown: {Math.ceil(cooldownRemaining / 1000)}s
                    </p>
                  )}

                  {logError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500">
                      <AlertCircle size={13} />
                      {logError}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collapsible Coach Notes ── */}
      <CoachNotes exercise={exercise} />
    </div>
  );
}
