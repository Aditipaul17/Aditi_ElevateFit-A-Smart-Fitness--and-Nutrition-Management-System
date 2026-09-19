"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Loader2,
  Dumbbell,
  Utensils,
  Target,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { updateProfile, ApiError } from "@/lib/api";

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const FITNESS_GOALS = [
  "Lose weight",
  "Build muscle",
  "Improve endurance",
  "Increase flexibility",
  "Maintain fitness",
  "Train for sport",
];
const ACTIVITY_LEVELS = [
  "Sedentary",
  "Lightly active",
  "Moderately active",
  "Very active",
  "Extremely active",
];
const WORKOUT_TYPES = ["Strength", "HIIT", "Cardio", "Yoga", "Stretching"];
const TIME_OPTIONS = ["15-30 min", "30-45 min", "45-60 min", "60+ min"];
const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced", "Elite"];
const EQUIPMENT_OPTIONS = [
  "No equipment",
  "Dumbbells",
  "Barbell",
  "Resistance bands",
  "Pull-up bar",
  "Bench",
  "Kettlebell",
  "Full gym",
];
const DIETARY_PREFS = [
  "Vegetarian",
  "Vegan",
  "Non-Vegetarian",
  "Keto",
  "Paleo",
  "Gluten-free",
  "Dairy-free",
  "No preference",
];
const FOOD_PREFERENCES = [
  "High-Protein",
  "Low-Carb",
  "Nut-Free",
  "Dairy-Free",
  "Gluten-Free",
  "Soy-Free",
];
const FITNESS_LIMITATIONS = [
  "None",
  "Joint pain / Low impact",
  "Back issues",
  "Asthma / Breathing",
  "Knee issues",
];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { user, token, refreshUser } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [age, setAge] = useState(user?.age ? String(user.age) : "25");
  const [gender, setGender] = useState(user?.gender || "Female");
  const [height, setHeight] = useState(user?.height ? String(user.height) : "168");
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : "62");

  const [fitnessGoal, setFitnessGoal] = useState(user?.fitness_goal || "Build muscle");
  const [activityLevel, setActivityLevel] = useState(user?.activity_level || "Lightly active");

  const [workoutExperience, setWorkoutExperience] = useState(user?.workout_experience || "Beginner");
  const [preferredWorkoutType, setPreferredWorkoutType] = useState(user?.preferred_workout_type || "Strength");
  const [availableWorkoutTime, setAvailableWorkoutTime] = useState(user?.available_workout_time || "30-45 min");
  const [equipment, setEquipment] = useState<string[]>(user?.equipment || ["Dumbbells"]);

  const [dietaryPreference, setDietaryPreference] = useState(user?.dietary_preference || "Vegetarian");
  const [foodPreferences, setFoodPreferences] = useState<string[]>(user?.food_preferences || ["High-Protein"]);
  const [fitnessLimitations, setFitnessLimitations] = useState<string[]>(user?.fitness_limitations || ["None"]);

  if (!isOpen) return null;

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleFoodPreference = (item: string) => {
    setFoodPreferences((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleLimitation = (item: string) => {
    if (item === "None") {
      setFitnessLimitations(["None"]);
      return;
    }
    setFitnessLimitations((prev) => {
      const filtered = prev.filter((i) => i !== "None");
      return filtered.includes(item) ? filtered.filter((i) => i !== item) : [...filtered, item];
    });
  };

  const handleFinish = async () => {
    if (!token) {
      onClose();
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await updateProfile(token, {
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        fitness_goal: fitnessGoal,
        activity_level: activityLevel,
        workout_experience: workoutExperience,
        preferred_workout_type: preferredWorkoutType,
        available_workout_time: availableWorkoutTime,
        equipment: equipment.length > 0 ? equipment : ["No equipment"],
        dietary_preference: dietaryPreference,
        food_preferences: foodPreferences,
        fitness_limitations: fitnessLimitations,
        onboarding_completed: true,
      });

      await refreshUser();
      if (onComplete) onComplete();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to save questionnaire. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl rounded-3xl bg-surface-light dark:bg-card-dark border border-black/10 dark:border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-xl font-display font-bold text-ink dark:text-white">
                Personalize Your ElevateFit Experience
              </h2>
              <p className="text-xs text-ink-muted">
                Step {step} of 4 • Answer 4 quick questions for custom workouts &amp; meals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink dark:hover:text-white transition-colors"
            title="Skip for now"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "25%" }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-error/10 text-error text-xs p-3 border border-error/20 flex items-center gap-2">
            <ShieldAlert size={16} /> {errorMsg}
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[280px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Target size={16} /> Step 1: Body Metrics &amp; Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink dark:text-white mb-1.5">
                      Age (years)
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-dark px-4 py-2.5 text-sm text-ink dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink dark:text-white mb-1.5">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-dark px-4 py-2.5 text-sm text-ink dark:text-white outline-none focus:border-primary"
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink dark:text-white mb-1.5">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={250}
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-dark px-4 py-2.5 text-sm text-ink dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink dark:text-white mb-1.5">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={250}
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-dark px-4 py-2.5 text-sm text-ink dark:text-white outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Target size={16} /> Step 2: Fitness Goal &amp; Activity Level
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-2">
                    Primary Fitness Goal
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {FITNESS_GOALS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFitnessGoal(g)}
                        className={`rounded-xl p-3 text-xs font-semibold text-left border transition-all ${
                          fitnessGoal === g
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-2">
                    Daily Activity Level
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {ACTIVITY_LEVELS.map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => setActivityLevel(act)}
                        className={`rounded-xl p-3 text-xs font-semibold text-left border transition-all ${
                          activityLevel === act
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary"
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Dumbbell size={16} /> Step 3: Exercise &amp; Workout Preferences
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink dark:text-white mb-1.5">
                      Workout Experience
                    </label>
                    <select
                      value={workoutExperience}
                      onChange={(e) => setWorkoutExperience(e.target.value)}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 text-xs font-medium text-ink dark:text-white outline-none focus:border-primary"
                    >
                      {EXPERIENCE_LEVELS.map((exp) => (
                        <option key={exp} value={exp}>
                          {exp}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink dark:text-white mb-1.5">
                      Preferred Workout Type
                    </label>
                    <select
                      value={preferredWorkoutType}
                      onChange={(e) => setPreferredWorkoutType(e.target.value)}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 text-xs font-medium text-ink dark:text-white outline-none focus:border-primary"
                    >
                      {WORKOUT_TYPES.map((wt) => (
                        <option key={wt} value={wt}>
                          {wt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink dark:text-white mb-1.5">
                      Available Workout Time
                    </label>
                    <select
                      value={availableWorkoutTime}
                      onChange={(e) => setAvailableWorkoutTime(e.target.value)}
                      className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-dark px-3 py-2 text-xs font-medium text-ink dark:text-white outline-none focus:border-primary"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-2">
                    Available Equipment (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EQUIPMENT_OPTIONS.map((item) => {
                      const sel = equipment.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleEquipment(item)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                            sel
                              ? "bg-primary text-white border-primary"
                              : "bg-white dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink-muted hover:border-primary"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Utensils size={16} /> Step 4: Nutrition &amp; Health Restrictions
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-2">
                    Dietary Preference
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DIETARY_PREFS.map((dp) => (
                      <button
                        key={dp}
                        type="button"
                        onClick={() => setDietaryPreference(dp)}
                        className={`rounded-xl p-2.5 text-xs font-semibold text-center border transition-all ${
                          dietaryPreference === dp
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary"
                        }`}
                      >
                        {dp}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-2">
                    Food Preferences &amp; Allergies
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FOOD_PREFERENCES.map((item) => {
                      const sel = foodPreferences.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleFoodPreference(item)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                            sel
                              ? "bg-primary text-white border-primary"
                              : "bg-white dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink-muted hover:border-primary"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-2">
                    Fitness Limitations / Injuries
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {FITNESS_LIMITATIONS.map((lim) => {
                      const sel = fitnessLimitations.includes(lim);
                      return (
                        <button
                          key={lim}
                          type="button"
                          onClick={() => toggleLimitation(lim)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                            sel
                              ? "bg-secondary text-white border-secondary"
                              : "bg-white dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink-muted hover:border-secondary"
                          }`}
                        >
                          {lim}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/10">
          <button
            onClick={onClose}
            className="text-xs text-ink-muted hover:text-ink dark:hover:text-white font-medium hover:underline"
          >
            Skip for now
          </button>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((prev) => prev - 1)}
                className="flex items-center gap-1 rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-xs font-semibold text-ink dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep((prev) => prev + 1)}
                className="flex items-center gap-1 rounded-xl bg-primary text-white px-5 py-2 text-xs font-semibold hover:bg-secondary transition-colors"
              >
                Next <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-xl bg-primary text-white px-6 py-2.5 text-xs font-semibold hover:bg-secondary transition-colors disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={15} />
                )}
                {submitting ? "Personalizing..." : "Save & Personalize App"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
