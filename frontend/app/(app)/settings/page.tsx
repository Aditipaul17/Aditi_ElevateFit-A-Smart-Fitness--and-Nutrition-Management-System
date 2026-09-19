"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useAuth } from "@/lib/AuthContext";
import { updateProfile, ProfileUpdatePayload, ApiError } from "@/lib/api";
import { CheckCircle, AlertCircle, Loader2, SlidersHorizontal, Sparkles } from "lucide-react";

// ─── Option lists ───────────────────────────────────────────────────────────

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const FITNESS_GOAL_OPTIONS = [
  "Lose weight",
  "Build muscle",
  "Improve endurance",
  "Increase flexibility",
  "Maintain fitness",
  "Train for sport",
];
const ACTIVITY_LEVEL_OPTIONS = [
  "Sedentary",
  "Lightly active",
  "Moderately active",
  "Very active",
  "Extremely active",
];
const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Non-Vegetarian",
  "Keto",
  "Paleo",
  "Gluten-free",
  "Dairy-free",
  "No preference",
];
const EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Elite"];
const WORKOUT_TYPES = ["Strength", "HIIT", "Cardio", "Yoga", "Stretching"];
const TIME_OPTIONS = ["15-30 min", "30-45 min", "45-60 min", "60+ min"];
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

const OTHER_SETTINGS = [
  {
    label: "Notifications",
    desc: "Workout reminders, meal reminders, and achievements",
  },
  {
    label: "Privacy",
    desc: "Control what's visible to your friends and the community",
  },
  { label: "Language", desc: "English (United States)" },
  {
    label: "Connected Devices",
    desc: "Manage synced wearables and apps",
  },
  {
    label: "Export Data",
    desc: "Download a copy of your training and nutrition history",
  },
];

// ─── Form state type ─────────────────────────────────────────────────────────

type FormState = {
  name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  fitness_goal: string;
  activity_level: string;
  dietary_preference: string;
  workout_experience: string;
  equipment: string[];
  preferred_workout_type: string;
  available_workout_time: string;
  food_preferences: string[];
  fitness_limitations: string[];
};

type FormErrors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};

  const trimmedName = form.name.trim();
  if (!trimmedName) {
    errors.name = "Name is required.";
  } else if (trimmedName.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (trimmedName.length > 100) {
    errors.name = "Name must be 100 characters or fewer.";
  }

  if (form.age !== "") {
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      errors.age = "Age must be a whole number between 1 and 120.";
    }
  }

  if (form.height !== "") {
    const h = Number(form.height);
    if (isNaN(h) || h <= 0 || h > 300) {
      errors.height = "Height must be a positive number (cm).";
    }
  }

  if (form.weight !== "") {
    const w = Number(form.weight);
    if (isNaN(w) || w <= 0 || w > 700) {
      errors.weight = "Weight must be a positive number (kg).";
    }
  }

  return errors;
}

function buildPayload(form: FormState): ProfileUpdatePayload {
  return {
    name: form.name.trim(),
    age: form.age !== "" ? parseInt(form.age, 10) : null,
    gender: form.gender || null,
    height: form.height !== "" ? parseFloat(form.height) : null,
    weight: form.weight !== "" ? parseFloat(form.weight) : null,
    fitness_goal: form.fitness_goal || null,
    activity_level: form.activity_level || null,
    dietary_preference: form.dietary_preference || null,
    workout_experience: form.workout_experience || null,
    equipment: form.equipment.length > 0 ? form.equipment : null,
    preferred_workout_type: form.preferred_workout_type || null,
    available_workout_time: form.available_workout_time || null,
    food_preferences: form.food_preferences.length > 0 ? form.food_preferences : null,
    fitness_limitations: form.fitness_limitations.length > 0 ? form.fitness_limitations : null,
    onboarding_completed: true,
  };
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink dark:text-white mb-1">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-error">{message}</p>;
}

const inputClass =
  "w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-dark px-4 py-2.5 text-sm text-ink dark:text-white placeholder:text-ink-muted focus:border-primary outline-none transition-colors";

const selectClass =
  "w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-surface-dark px-4 py-2.5 text-sm text-ink dark:text-white focus:border-primary outline-none transition-colors";

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, logout, refreshUser } = useAuth();

  const [form, setForm] = useState<FormState>({
    name: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    fitness_goal: "",
    activity_level: "",
    dietary_preference: "",
    workout_experience: "",
    equipment: [],
    preferred_workout_type: "",
    available_workout_time: "",
    food_preferences: [],
    fitness_limitations: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");
  const [showQuestionnaireModal, setShowQuestionnaireModal] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name ?? "",
      age: user.age != null ? String(user.age) : "",
      gender: user.gender ?? "",
      height: user.height != null ? String(user.height) : "",
      weight: user.weight != null ? String(user.weight) : "",
      fitness_goal: user.fitness_goal ?? "",
      activity_level: user.activity_level ?? "",
      dietary_preference: user.dietary_preference ?? "",
      workout_experience: user.workout_experience ?? "",
      equipment: user.equipment ?? [],
      preferred_workout_type: user.preferred_workout_type ?? "",
      available_workout_time: user.available_workout_time ?? "",
      food_preferences: user.food_preferences ?? [],
      fitness_limitations: user.fitness_limitations ?? [],
    });
  }, [user]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    if (saveStatus !== "idle") setSaveStatus("idle");
  }

  function toggleArrayItem<K extends "equipment" | "food_preferences" | "fitness_limitations">(
    key: K,
    item: string
  ) {
    setForm((prev) => {
      const arr = prev[key];
      const exists = arr.includes(item);
      return {
        ...prev,
        [key]: exists ? arr.filter((i) => i !== item) : [...arr, item],
      };
    });
    if (saveStatus !== "idle") setSaveStatus("idle");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!token) {
      setSaveStatus("error");
      setSaveErrorMsg("You are not authenticated. Please log in again.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    setSaveErrorMsg("");

    try {
      await updateProfile(token, buildPayload(form));
      await refreshUser();
      setSaveStatus("success");
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSaveStatus("idle"), 4000);
    } catch (err) {
      setSaveStatus("error");
      if (err instanceof ApiError) {
        setSaveErrorMsg(err.message);
      } else {
        setSaveErrorMsg("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Topbar placeholder="Search settings..." />

      <OnboardingModal
        isOpen={showQuestionnaireModal}
        onClose={() => setShowQuestionnaireModal(false)}
        onComplete={() => {
          setShowQuestionnaireModal(false);
          refreshUser();
        }}
      />

      <main className="px-6 lg:px-10 py-8 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold text-ink dark:text-white">
            Profile &amp; Settings
          </h1>

          <button
            onClick={() => setShowQuestionnaireModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2.5 text-xs font-semibold hover:bg-secondary transition-colors"
          >
            <SlidersHorizontal size={14} /> Launch Setup Wizard
          </button>
        </div>

        {/* Questionnaire Re-run Card */}
        <Card className="bg-gradient-to-r from-primary/10 via-accent/10 to-transparent border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-ink dark:text-white text-base flex items-center gap-2">
              <Sparkles size={16} className="text-primary" /> Personalized Questionnaire Setup
            </h3>
            <p className="text-xs text-ink-muted mt-1">
              Update your goals, dietary preferences, workout time, equipment, or limitations anytime.
            </p>
          </div>
          <button
            onClick={() => setShowQuestionnaireModal(true)}
            className="w-full sm:w-auto btn-primary text-xs !px-4 !py-2 shrink-0"
          >
            Retake Questionnaire
          </button>
        </Card>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} noValidate>
          <Card className="space-y-6">
            <h2 className="text-lg font-display font-semibold text-ink dark:text-white">
              Athlete Profile Details
            </h2>

            {/* Name + Email row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="profile-name">Full Name *</FieldLabel>
                <input
                  id="profile-name"
                  type="text"
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Your name"
                  disabled={isSaving}
                />
                <FieldError message={errors.name} />
              </div>
              <div>
                <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                <input
                  id="profile-email"
                  type="email"
                  className={`${inputClass} opacity-60 cursor-not-allowed`}
                  value={user?.email ?? ""}
                  disabled
                />
              </div>
            </div>

            {/* Age + Gender row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="profile-age">Age</FieldLabel>
                <input
                  id="profile-age"
                  type="number"
                  min={1}
                  max={120}
                  className={inputClass}
                  value={form.age}
                  onChange={(e) => setField("age", e.target.value)}
                  placeholder="e.g. 28"
                  disabled={isSaving}
                />
                <FieldError message={errors.age} />
              </div>
              <div>
                <FieldLabel htmlFor="profile-gender">Gender</FieldLabel>
                <select
                  id="profile-gender"
                  className={selectClass}
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Height + Weight row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="profile-height">Height (cm)</FieldLabel>
                <input
                  id="profile-height"
                  type="number"
                  min={1}
                  step={0.1}
                  className={inputClass}
                  value={form.height}
                  onChange={(e) => setField("height", e.target.value)}
                  placeholder="e.g. 175"
                  disabled={isSaving}
                />
                <FieldError message={errors.height} />
              </div>
              <div>
                <FieldLabel htmlFor="profile-weight">Weight (kg)</FieldLabel>
                <input
                  id="profile-weight"
                  type="number"
                  min={1}
                  step={0.1}
                  className={inputClass}
                  value={form.weight}
                  onChange={(e) => setField("weight", e.target.value)}
                  placeholder="e.g. 70"
                  disabled={isSaving}
                />
                <FieldError message={errors.weight} />
              </div>
            </div>

            {/* Fitness Goal & Activity Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="profile-goal">Fitness Goal</FieldLabel>
                <select
                  id="profile-goal"
                  className={selectClass}
                  value={form.fitness_goal}
                  onChange={(e) => setField("fitness_goal", e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select a goal</option>
                  {FITNESS_GOAL_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="profile-activity">Activity Level</FieldLabel>
                <select
                  id="profile-activity"
                  className={selectClass}
                  value={form.activity_level}
                  onChange={(e) => setField("activity_level", e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select activity level</option>
                  {ACTIVITY_LEVEL_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Workout Experience & Preferred Workout Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel htmlFor="profile-experience">Experience</FieldLabel>
                <select
                  id="profile-experience"
                  className={selectClass}
                  value={form.workout_experience}
                  onChange={(e) => setField("workout_experience", e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select experience</option>
                  {EXPERIENCE_OPTIONS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="profile-type">Preferred Workout Type</FieldLabel>
                <select
                  id="profile-type"
                  className={selectClass}
                  value={form.preferred_workout_type}
                  onChange={(e) => setField("preferred_workout_type", e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select type</option>
                  {WORKOUT_TYPES.map((wt) => (
                    <option key={wt} value={wt}>
                      {wt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="profile-time">Available Workout Time</FieldLabel>
                <select
                  id="profile-time"
                  className={selectClass}
                  value={form.available_workout_time}
                  onChange={(e) => setField("available_workout_time", e.target.value)}
                  disabled={isSaving}
                >
                  <option value="">Select time</option>
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dietary Preference */}
            <div>
              <FieldLabel htmlFor="profile-diet">Dietary Preference</FieldLabel>
              <select
                id="profile-diet"
                className={selectClass}
                value={form.dietary_preference}
                onChange={(e) => setField("dietary_preference", e.target.value)}
                disabled={isSaving}
              >
                <option value="">Select dietary preference</option>
                {DIETARY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Food Preferences & Allergies */}
            <div>
              <FieldLabel htmlFor="profile-food-pref">Food Preferences &amp; Allergies</FieldLabel>
              <div id="profile-food-pref" className="flex flex-wrap gap-2 mt-1">
                {FOOD_PREFERENCES.map((item) => {
                  const selected = form.food_preferences.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleArrayItem("food_preferences", item)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        selected
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

            {/* Fitness Limitations / Injuries */}
            <div>
              <FieldLabel htmlFor="profile-limitations">Fitness Limitations / Injuries</FieldLabel>
              <div id="profile-limitations" className="flex flex-wrap gap-2 mt-1">
                {FITNESS_LIMITATIONS.map((item) => {
                  const selected = form.fitness_limitations.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleArrayItem("fitness_limitations", item)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        selected
                          ? "bg-secondary text-white border-secondary"
                          : "bg-white dark:bg-surface-dark border-black/10 dark:border-white/10 text-ink-muted hover:border-secondary"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <FieldLabel htmlFor="profile-equipment">Available Equipment</FieldLabel>
              <div id="profile-equipment" className="flex flex-wrap gap-2 mt-1">
                {EQUIPMENT_OPTIONS.map((item) => {
                  const selected = form.equipment.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={isSaving}
                      onClick={() => toggleArrayItem("equipment", item)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                        selected
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

            {/* Save feedback banners */}
            {saveStatus === "success" && (
              <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-4 py-3 text-xs text-success font-medium">
                <CheckCircle size={16} /> Profile saved! Recommendations updated.
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-2 rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-xs text-error font-medium">
                <AlertCircle size={16} /> {saveErrorMsg || "Failed to save profile."}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex items-center gap-2 min-w-[120px] justify-center disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : "Save Changes"}
              </button>
            </div>
          </Card>
        </form>

        {/* Dark Mode */}
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-ink dark:text-white">Dark Mode</p>
            <p className="text-sm text-ink-muted">Switch between light and dark themes</p>
          </div>
          <ThemeToggle />
        </Card>

        {/* Other settings */}
        <Card className="divide-y divide-black/5 dark:divide-white/5 !p-0">
          {OTHER_SETTINGS.map((row) => (
            <button
              key={row.label}
              className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/5 transition-colors"
            >
              <div>
                <p className="font-medium text-ink dark:text-white">{row.label}</p>
                <p className="text-sm text-ink-muted">{row.desc}</p>
              </div>
            </button>
          ))}
        </Card>

        <button onClick={handleLogout} className="text-error text-sm font-semibold hover:underline">
          Log Out
        </button>
      </main>
    </>
  );
}
