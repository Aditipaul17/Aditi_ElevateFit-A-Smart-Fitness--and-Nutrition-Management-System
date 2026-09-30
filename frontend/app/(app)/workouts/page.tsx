"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Footprints,
  ShieldCheck,
  Clock,
  Dumbbell,
  RotateCw,
  Video,
  AlertCircle,
  SlidersHorizontal,
  Play,
  Search,
  Plus,
  Flame,
  Target,
  Trophy,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { YouTubeWorkoutCard } from "@/components/YouTubeWorkoutCard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchYouTubeRecommendations,
  YouTubeWorkoutVideoItem,
  getErrorMessage,
  logWorkoutSession,
  fetchTodaySteps,
  logSteps,
} from "@/lib/api";
import { Card } from "@/components/ui/Card";
import {
  fetchExercisesDataset,
  searchExercises,
  ExerciseItem,
} from "@/lib/exerciseDataset";
import {
  generatePersonalizedWorkout,
  formatEquipmentString,
  DEFAULT_PREFERENCES,
  WorkoutPreferenceQuery,
  GeneratedWorkoutPlan,
  RecommendedExercise,
} from "@/lib/exerciseRecommendationEngine";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseDetailsModal } from "@/components/ExerciseDetailsModal";
import { WorkoutQuestionnaireModal } from "@/components/WorkoutQuestionnaireModal";
import {
  ActiveWorkoutSessionModal,
  CompletedWorkoutRecord,
} from "@/components/ActiveWorkoutSessionModal";
import { WorkoutHistorySection } from "@/components/WorkoutHistorySection";

const STORAGE_KEY_PREFS = "elevatefit_workout_prefs";
const STORAGE_KEY_HISTORY = "elevatefit_workout_history";

const FALLBACK_YT_VIDEOS: YouTubeWorkoutVideoItem[] = [
  {
    video_id: "vc1E5CF5fas",
    title: "20 Min Full Body Workout - No Equipment",
    channel_title: "MadFit",
    thumbnail_url: "https://i.ytimg.com/vi/vc1E5CF5fas/hqdefault.jpg",
    duration: "20 min",
    video_url: "https://www.youtube.com/watch?v=vc1E5CF5fas",
    recommendation_reason: "Popular Home Bodyweight Routine",
  },
  {
    video_id: "cbKaa11P1Ok",
    title: "15 Minute HIIT Workout - Burn Fat Fast",
    channel_title: "Chris Heria",
    thumbnail_url: "https://i.ytimg.com/vi/cbKaa11P1Ok/hqdefault.jpg",
    duration: "15 min",
    video_url: "https://www.youtube.com/watch?v=cbKaa11P1Ok",
    recommendation_reason: "High Energy Fat Burner",
  },
  {
    video_id: "gC_L9qAHVJ8",
    title: "30 Min Dumbbell Full Body Workout",
    channel_title: "Juice & Toya",
    thumbnail_url: "https://i.ytimg.com/vi/gC_L9qAHVJ8/hqdefault.jpg",
    duration: "30 min",
    video_url: "https://www.youtube.com/watch?v=gC_L9qAHVJ8",
    recommendation_reason: "Great for Dumbbells & Strength",
  },
];

export default function WorkoutsPage() {
  const { token, user } = useAuth();

  // Dataset State
  const [allDatasetExercises, setAllDatasetExercises] = useState<ExerciseItem[]>([]);
  const [loadingDataset, setLoadingDataset] = useState<boolean>(true);

  // User Preferences State
  const [userPrefs, setUserPrefs] = useState<WorkoutPreferenceQuery>(DEFAULT_PREFERENCES);

  // Active Dynamic Workout Plan
  const [activePlan, setActivePlan] = useState<GeneratedWorkoutPlan | null>(null);

  // Explore Dataset Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterBodyPart, setFilterBodyPart] = useState<string>("All");
  const [filterEquipment, setFilterEquipment] = useState<string>("All");

  // Modals State
  const [selectedInstructionItem, setSelectedInstructionItem] = useState<RecommendedExercise | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState<boolean>(false);
  const [showActiveSession, setShowActiveSession] = useState<boolean>(false);

  // Workout History State
  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkoutRecord[]>([]);

  // Toast Notification State
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // YouTube Recommendations State
  const [ytVideos, setYtVideos] = useState<YouTubeWorkoutVideoItem[]>([]);
  const [loadingYt, setLoadingYt] = useState<boolean>(true);

  // Load Saved Preferences & History on Mount and sync with user profile
  useEffect(() => {
    const savedPrefs = localStorage.getItem(STORAGE_KEY_PREFS);
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        if (user && user.equipment) {
          parsed.equipment = formatEquipmentString(user.equipment);
        }
        setUserPrefs(parsed);
      } catch (e) {}
    } else if (user) {
      // Initialize preferences from user profile answers
      const initialPrefs: WorkoutPreferenceQuery = {
        fitnessGoal: (user.fitness_goal as any) || "Muscle Gain",
        experienceLevel: (user.workout_experience as any) || "Beginner",
        targetBodyPart: "Full Body",
        equipment: formatEquipmentString(user.equipment),
        durationMinutes: 30,
        numberOfExercises: 6,
        preferredType: (user.preferred_workout_type as any) || "Strength",
      };
      setUserPrefs(initialPrefs);
    }

    // Restore Workout History
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistory) {
      try {
        setWorkoutHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, [user]);

  // Load 1,324 Exercises Dataset from exercises.json
  useEffect(() => {
    setLoadingDataset(true);
    fetchExercisesDataset()
      .then((data) => {
        setAllDatasetExercises(data);
      })
      .catch((err) => {
        console.error("Failed loading dataset:", err);
      })
      .finally(() => setLoadingDataset(false));
  }, []);

  // Generate Personalized Workout whenever dataset or user preferences update
  useEffect(() => {
    if (allDatasetExercises.length > 0) {
      const plan = generatePersonalizedWorkout(allDatasetExercises, userPrefs);
      setActivePlan(plan);
    }
  }, [allDatasetExercises, userPrefs]);

  // Handle "Generate New Workout" button click (produces a fresh dynamic combination)
  const handleGenerateNewWorkout = () => {
    if (allDatasetExercises.length === 0) return;
    const plan = generatePersonalizedWorkout(allDatasetExercises, userPrefs);
    setActivePlan(plan);
    setToastMsg("Generated a fresh dynamic workout plan!");
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Handle Save Preferences from Questionnaire
  const handleSavePreferences = (newPrefs: WorkoutPreferenceQuery) => {
    setUserPrefs(newPrefs);
    localStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(newPrefs));
    setToastMsg("Preferences saved! Generated new matching workout.");
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Handle Workout Completion
  const handleCompleteWorkout = async (record: CompletedWorkoutRecord) => {
    const updated = [record, ...workoutHistory];
    setWorkoutHistory(updated);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));

    // Try logging to backend API if authenticated
    if (token) {
      try {
        await logWorkoutSession(token, {
          title: record.title,
          duration_minutes: record.durationMinutes,
          calories_burned: record.caloriesBurned,
        });
      } catch (e) {
        console.warn("Backend session log failed, saved locally:", e);
      }
    }
  };

  const handleClearHistory = () => {
    setWorkoutHistory([]);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  };

  // Load YouTube Recommendations
  useEffect(() => {
    setLoadingYt(true);
    if (token) {
      fetchYouTubeRecommendations(token, false)
        .then((res) => {
          if (res.videos && res.videos.length > 0) {
            setYtVideos(res.videos);
          } else {
            setYtVideos(FALLBACK_YT_VIDEOS);
          }
        })
        .catch(() => {
          setYtVideos(FALLBACK_YT_VIDEOS);
        })
        .finally(() => setLoadingYt(false));
    } else {
      setYtVideos(FALLBACK_YT_VIDEOS);
      setLoadingYt(false);
    }
  }, [token]);

  // Filtered dataset for Explore All Exercises section
  const filteredDataset = searchExercises(
    allDatasetExercises,
    searchQuery,
    filterBodyPart,
    filterEquipment
  );

  return (
    <>
      <Topbar placeholder="Search 1,324 exercises, body parts, or targets..." />
      <main className="px-6 lg:px-10 py-8 space-y-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* TOAST NOTIFICATION */}
          {toastMsg && (
            <div className="fixed top-20 right-6 z-50 flex items-center gap-2 rounded-2xl bg-primary text-white text-xs font-semibold px-4 py-3 shadow-glow animate-fade-up">
              <Sparkles size={16} />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* PAGE HEADER ROW */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-ink dark:text-white flex items-center gap-3">
                Workouts &amp; Personalized Recommendations
              </h1>
              <p className="text-ink-muted mt-1">
                Data-driven workout recommendations powered by 1,324 exercises.
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowQuestionnaire(true)}
                className="btn-secondary py-2.5 px-4 text-xs font-semibold"
              >
                <SlidersHorizontal size={16} />
                <span>Customize Preferences</span>
              </button>

              <button
                onClick={handleGenerateNewWorkout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-black/10 dark:border-white/15 text-ink dark:text-white hover:border-primary text-xs font-semibold transition-all"
              >
                <RotateCw size={15} />
                <span>Generate New Workout</span>
              </button>

              {activePlan && activePlan.exercises.length > 0 && (
                <button
                  onClick={() => setShowActiveSession(true)}
                  className="btn-primary py-2.5 px-6 text-xs font-bold shadow-md"
                >
                  <Play size={16} className="fill-current" />
                  <span>Start Workout</span>
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE PREFERENCES BANNER */}
          <Card className="p-4 bg-primary/5 border-primary/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <Target size={15} /> Your Workout Profile:
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                Goal: {userPrefs.fitnessGoal}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary font-semibold">
                Level: {userPrefs.experienceLevel}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                Target: {userPrefs.targetBodyPart}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-ink-muted font-medium">
                Equipment: {formatEquipmentString(userPrefs.equipment)}
              </span>
            </div>

            <button
              onClick={() => setShowQuestionnaire(true)}
              className="text-xs text-primary font-bold hover:underline"
            >
              Change Profile &rarr;
            </button>
          </Card>

          {/* SECTION 1: RECOMMENDED FOR YOU (SUMMARY CARD) */}
          {activePlan && (
            <Card className="p-6 relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 dark:from-card-dark dark:to-primary/10 border-primary/20">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold">
                    <Sparkles size={14} className="text-warning" />
                    <span>Personalized Recommendation</span>
                  </div>
                  <h2 className="text-2xl font-display font-extrabold text-ink dark:text-white leading-tight">
                    {activePlan.title}
                  </h2>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {activePlan.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold pt-2">
                    <span className="flex items-center gap-1 text-ink dark:text-white">
                      <Clock size={15} className="text-primary" /> {activePlan.estimatedDurationMinutes} min
                    </span>
                    <span className="flex items-center gap-1 text-warning">
                      <Flame size={15} /> {activePlan.estimatedCalories} kcal
                    </span>
                    <span className="flex items-center gap-1 text-secondary">
                      <Dumbbell size={15} /> {activePlan.exercises.length} Exercises
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-ink-muted">
                      Difficulty: {activePlan.difficulty}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleGenerateNewWorkout}
                    className="btn-secondary py-3 px-5 text-xs font-semibold"
                  >
                    <RotateCw size={16} />
                    <span>Shuffle Exercises</span>
                  </button>

                  <button
                    onClick={() => setShowActiveSession(true)}
                    className="btn-primary py-3 px-8 text-sm font-bold shadow-lg"
                  >
                    <Play size={18} className="fill-current" />
                    <span>Start Workout Now</span>
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 2: TODAY'S WORKOUT EXERCISES GRID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-bold text-ink dark:text-white flex items-center gap-2">
                  <Dumbbell size={22} className="text-primary" /> Today&apos;s Recommended Exercises
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Filtered from dataset based on your equipment and goal.
                </p>
              </div>

              {activePlan && (
                <span className="text-xs text-ink-muted font-mono font-semibold">
                  {activePlan.exercises.length} Exercises Selected
                </span>
              )}
            </div>

            {loadingDataset ? (
              <div className="flex h-64 items-center justify-center gap-2 text-ink-muted text-sm">
                <Loader2 size={24} className="animate-spin text-primary" />
                Loading dataset exercises...
              </div>
            ) : activePlan && activePlan.exercises.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activePlan.exercises.map((item, idx) => (
                  <ExerciseCard
                    key={`${item.exercise.id}_${idx}`}
                    item={item}
                    index={idx}
                    onViewInstructions={(itm) => setSelectedInstructionItem(itm)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center text-ink-muted">
                <p className="text-sm font-semibold text-ink dark:text-white">
                  No exercises matched your current filters.
                </p>
                <p className="text-xs mt-1">
                  Try adjusting your questionnaire preferences or selecting &quot;Gym / Full Equipment&quot;.
                </p>
              </Card>
            )}
          </div>

          {/* SECTION 3: BROWSE ALL 1,324 EXERCISES DATASET */}
          <div className="space-y-6 pt-6 border-t border-black/5 dark:border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-display font-bold text-ink dark:text-white flex items-center gap-2">
                  <Search size={22} className="text-primary" /> Explore 1,324 Exercises Dataset
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Browse and search the complete ExerciseDB dataset.
                </p>
              </div>
            </div>

            {/* SEARCH & FILTERS BAR */}
            <Card className="p-4 space-y-4">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exercise name, muscle (e.g. Biceps, Abs, Bench), target..."
                  className="w-full rounded-2xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 pl-11 pr-4 py-3 text-xs text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink-muted">Body Part:</span>
                  <select
                    value={filterBodyPart}
                    onChange={(e) => setFilterBodyPart(e.target.value)}
                    className="p-2 rounded-xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-ink dark:text-white text-xs"
                  >
                    <option value="All">All Body Parts</option>
                    <option value="chest">Chest</option>
                    <option value="back">Back</option>
                    <option value="shoulders">Shoulders</option>
                    <option value="upper arms">Arms</option>
                    <option value="upper legs">Legs</option>
                    <option value="waist">Abs / Waist</option>
                    <option value="cardio">Cardio</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink-muted">Equipment:</span>
                  <select
                    value={filterEquipment}
                    onChange={(e) => setFilterEquipment(e.target.value)}
                    className="p-2 rounded-xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-ink dark:text-white text-xs"
                  >
                    <option value="All">All Equipment</option>
                    <option value="body weight">Body Weight</option>
                    <option value="dumbbell">Dumbbell</option>
                    <option value="barbell">Barbell</option>
                    <option value="cable">Cable</option>
                    <option value="kettlebell">Kettlebell</option>
                    <option value="band">Bands</option>
                  </select>
                </div>

                <span className="ml-auto text-xs text-ink-muted font-mono">
                  Showing {filteredDataset.length} of {allDatasetExercises.length} exercises
                </span>
              </div>
            </Card>

            {/* BROWSE GRID (Preview top 12 matches) */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredDataset.slice(0, 12).map((ex) => (
                <Card key={ex.id} className="p-4 flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {ex.equipment}
                    </span>
                    <h3 className="font-display font-bold text-sm text-ink dark:text-white mt-2 leading-snug">
                      {ex.name}
                    </h3>
                    <p className="text-xs text-ink-muted mt-1 capitalize">
                      Target: {ex.target} &bull; {ex.bodyPart}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setSelectedInstructionItem({
                        exercise: ex,
                        sets: 3,
                        reps: "10-12 reps",
                        restSeconds: 60,
                        matchReason: "Dataset Exercise",
                      })
                    }
                    className="mt-3 text-xs text-primary font-semibold hover:underline text-left"
                  >
                    View Details &rarr;
                  </button>
                </Card>
              ))}
            </div>
          </div>

          {/* SECTION 4: WORKOUT HISTORY */}
          <div className="pt-6 border-t border-black/5 dark:border-white/10">
            <WorkoutHistorySection
              history={workoutHistory}
              onClearHistory={handleClearHistory}
            />
          </div>

          {/* AI YOUTUBE RECOMMENDATIONS */}
          <div className="pt-6 border-t border-black/5 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-ink dark:text-white flex items-center gap-2">
                <Video size={22} className="text-red-500" /> Recommended Video Workouts
              </h2>
              <span className="text-xs text-ink-muted">Curated Video Sessions</span>
            </div>

            {loadingYt ? (
              <div className="flex h-32 items-center justify-center gap-2 text-ink-muted text-xs">
                <Loader2 size={20} className="animate-spin text-primary" />
                Loading recommended workout videos...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ytVideos.map((video) => (
                  <YouTubeWorkoutCard key={video.video_id} video={video} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL 1: EXERCISE INSTRUCTIONS */}
      <ExerciseDetailsModal
        item={selectedInstructionItem}
        onClose={() => setSelectedInstructionItem(null)}
      />

      {/* MODAL 2: QUESTIONNAIRE PREFERENCES */}
      <WorkoutQuestionnaireModal
        isOpen={showQuestionnaire}
        onClose={() => setShowQuestionnaire(false)}
        currentPreferences={userPrefs}
        onSavePreferences={handleSavePreferences}
      />

      {/* MODAL 3: ACTIVE WORKOUT SESSION PLAYER */}
      <ActiveWorkoutSessionModal
        workoutPlan={showActiveSession ? activePlan : null}
        onClose={() => setShowActiveSession(false)}
        onCompleteWorkout={handleCompleteWorkout}
      />
    </>
  );
}
