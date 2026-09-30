import { ExerciseItem } from "./exerciseDataset";

export interface WorkoutPreferenceQuery {
  fitnessGoal: "Weight Loss" | "Muscle Gain" | "Strength" | "General Fitness" | "Flexibility";
  experienceLevel: "Beginner" | "Intermediate" | "Advanced";
  targetBodyPart: "Full Body" | "Chest" | "Back" | "Shoulders" | "Arms" | "Legs" | "Abs / Core" | "Cardio";
  equipment: "Home / Bodyweight" | "Dumbbells & Bands" | "Gym / Full Equipment" | string | string[];
  durationMinutes: number;
  numberOfExercises: number;
  preferredType?: "Strength" | "Cardio" | "HIIT" | "Yoga / Stretching" | "Functional";
}

export interface RecommendedExercise {
  exercise: ExerciseItem;
  sets: number;
  reps: string;
  restSeconds: number;
  matchReason: string;
}

export interface GeneratedWorkoutPlan {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedDurationMinutes: number;
  estimatedCalories: number;
  exercises: RecommendedExercise[];
  generatedAt: string;
  preferencesUsed: WorkoutPreferenceQuery;
}

export const DEFAULT_PREFERENCES: WorkoutPreferenceQuery = {
  fitnessGoal: "Muscle Gain",
  experienceLevel: "Beginner",
  targetBodyPart: "Full Body",
  equipment: "Home / Bodyweight",
  durationMinutes: 30,
  numberOfExercises: 6,
  preferredType: "Strength",
};

export function formatEquipmentString(eq: any): string {
  if (Array.isArray(eq)) {
    if (eq.length === 0) return "No equipment";
    return eq.join(", ");
  }
  if (typeof eq === "string" && eq.trim().length > 0) return eq;
  return "No equipment";
}

// Equipment filtering rules
function isEquipmentAllowed(exerciseEquipment: string, selectedEquipment: any): boolean {
  const eq = String(exerciseEquipment || "").toLowerCase().trim();

  let selList: string[] = [];
  if (Array.isArray(selectedEquipment)) {
    selList = selectedEquipment.map((s) => String(s).toLowerCase().trim());
  } else if (typeof selectedEquipment === "string") {
    selList = selectedEquipment
      .toLowerCase()
      .split(/,|\s+and\s+|\s+&\s+/)
      .map((s) => s.trim());
  }

  const selStr = selList.join(" ");

  // 1. Always allowed for everyone: Body Weight / No equipment exercises
  const bodyweightEquipments = ["body weight", "assisted", "none", "roller", "wheel roller"];
  if (bodyweightEquipments.some((b) => eq.includes(b))) {
    return true;
  }

  // 2. Check if user specified "Gym / Full Equipment" or "Full gym access"
  const isFullGym =
    selStr.includes("full gym") ||
    selStr.includes("gym / full") ||
    selStr.includes("full equipment") ||
    selStr.includes("gym access");

  if (isFullGym) {
    return true;
  }

  // 3. Check if user has NO equipment
  const isNoEquipment =
    selList.length === 0 ||
    selStr === "" ||
    selStr.includes("no equipment") ||
    selStr.includes("no_equipment") ||
    selStr.includes("home / bodyweight") ||
    selStr.includes("bodyweight") ||
    selStr.includes("none");

  if (
    isNoEquipment &&
    !selStr.includes("dumbbell") &&
    !selStr.includes("barbell") &&
    !selStr.includes("band") &&
    !selStr.includes("kettlebell")
  ) {
    return false;
  }

  // 4. Match required exercise equipment against user's available equipment list
  if (eq.includes("dumbbell") && (selStr.includes("dumbbell") || selStr.includes("dumbbells"))) {
    return true;
  }

  if ((eq.includes("barbell") || eq.includes("trap bar")) && (selStr.includes("barbell") || selStr.includes("barbells"))) {
    return true;
  }

  if (eq.includes("kettlebell") && selStr.includes("kettlebell")) {
    return true;
  }

  if ((eq.includes("band") || eq.includes("rope")) && (selStr.includes("band") || selStr.includes("rope"))) {
    return true;
  }

  if (eq.includes("ball") && (selStr.includes("ball") || selStr.includes("dumbbell") || selStr.includes("gym"))) {
    return true;
  }

  if (
    eq.includes("cable") ||
    eq.includes("machine") ||
    eq.includes("leverage") ||
    eq.includes("smith") ||
    eq.includes("sled") ||
    eq.includes("bike") ||
    eq.includes("skierg")
  ) {
    return isFullGym || selStr.includes("cable") || selStr.includes("machine");
  }

  return false;
}

// Body Part / Target Muscle matching
function matchesTargetBodyPart(ex: ExerciseItem, targetBodyPart: string): boolean {
  const t = String(targetBodyPart || "full body").toLowerCase();
  const bp = String(ex.bodyPart || "").toLowerCase();
  const target = String(ex.target || "").toLowerCase();

  if (t === "full body") return true;

  if (t === "chest") {
    return bp.includes("chest") || target.includes("pectoral") || target.includes("serratus");
  }

  if (t === "back") {
    return bp.includes("back") || target.includes("lat") || target.includes("trap") || target.includes("spine");
  }

  if (t === "shoulders") {
    return bp.includes("shoulder") || target.includes("delt") || target.includes("scapulae");
  }

  if (t === "arms") {
    return (
      bp.includes("arm") ||
      target.includes("biceps") ||
      target.includes("triceps") ||
      target.includes("forearm")
    );
  }

  if (t === "legs") {
    return (
      bp.includes("leg") ||
      target.includes("quad") ||
      target.includes("hamstring") ||
      target.includes("glute") ||
      target.includes("calf") ||
      target.includes("adductor") ||
      target.includes("abductor")
    );
  }

  if (t === "abs / core" || t === "abs" || t === "core") {
    return bp.includes("waist") || target.includes("abs") || target.includes("core");
  }

  if (t === "cardio") {
    return bp.includes("cardio") || target.includes("cardiovascular");
  }

  return bp.includes(t) || target.includes(t);
}

// Dynamic Sets, Reps, and Rest calculation
function calculatePrescription(
  goal: string,
  experience: string,
  exerciseCategory: string
): { sets: number; reps: string; restSeconds: number } {
  const g = String(goal || "").toLowerCase();
  const exp = String(experience || "").toLowerCase();
  const isCardio = String(exerciseCategory || "").toLowerCase().includes("cardio");

  let sets = 3;
  let reps = "10-12 reps";
  let restSeconds = 60;

  if (isCardio || g.includes("weight loss")) {
    sets = exp.includes("advanced") ? 4 : 3;
    reps = isCardio ? "45 sec work" : "15-20 reps";
    restSeconds = 30;
  } else if (g.includes("muscle")) {
    sets = exp.includes("advanced") ? 4 : exp.includes("intermediate") ? 4 : 3;
    reps = "8-12 reps";
    restSeconds = 60;
  } else if (g.includes("strength")) {
    sets = exp.includes("advanced") ? 5 : 4;
    reps = "4-6 reps";
    restSeconds = 90;
  } else if (g.includes("flexibility")) {
    sets = 3;
    reps = "30 sec hold";
    restSeconds = 30;
  } else {
    sets = 3;
    reps = "10-12 reps";
    restSeconds = 60;
  }

  return { sets, reps, restSeconds };
}

// Generate match reason badge for UI
function generateMatchReason(
  ex: ExerciseItem,
  prefs: WorkoutPreferenceQuery
): string {
  const reasons: string[] = [];

  const eqStr = formatEquipmentString(prefs?.equipment);
  const targetBody = String(prefs?.targetBodyPart || "Full Body");

  if (matchesTargetBodyPart(ex, targetBody) && targetBody !== "Full Body") {
    reasons.push(`Target: ${targetBody}`);
  }

  const exEq = String(ex?.equipment || "");
  if (eqStr.toLowerCase().includes("home") && exEq.toLowerCase().includes("body weight")) {
    reasons.push("No Equipment");
  } else if (exEq) {
    reasons.push(`${exEq.replace(/\b\w/g, (c) => c.toUpperCase())}`);
  }

  const exTarget = String(ex?.target || "");
  if (exTarget) {
    reasons.push(`${exTarget.replace(/\b\w/g, (c) => c.toUpperCase())}`);
  }

  return reasons.slice(0, 2).join(" • ");
}

// Fisher-Yates shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generatePersonalizedWorkout(
  allExercises: ExerciseItem[],
  prefs: WorkoutPreferenceQuery = DEFAULT_PREFERENCES,
  excludeIds: string[] = []
): GeneratedWorkoutPlan {
  const safeGoal = String(prefs?.fitnessGoal || "Muscle Gain");
  const safeExp = String(prefs?.experienceLevel || "Beginner");
  const safeTarget = String(prefs?.targetBodyPart || "Full Body");
  const safeEquipment = formatEquipmentString(prefs?.equipment);
  const safeDuration = Number(prefs?.durationMinutes) || 30;
  const safeCount = Number(prefs?.numberOfExercises) || 6;

  if (!allExercises || allExercises.length === 0) {
    return {
      id: `plan_${Date.now()}`,
      title: "Custom Workout Plan",
      description: "Personalized dataset workout",
      category: prefs.preferredType || "Strength",
      difficulty: safeExp,
      estimatedDurationMinutes: safeDuration,
      estimatedCalories: 250,
      exercises: [],
      generatedAt: new Date().toISOString(),
      preferencesUsed: prefs,
    };
  }

  // 1. Strict Equipment Filter (mandatory constraint)
  const equipmentFiltered = allExercises.filter((ex) =>
    isEquipmentAllowed(ex.equipment, safeEquipment)
  );

  // Pool of candidate exercises: if strict equipment filter returns empty, fallback ONLY to bodyweight exercises
  let candidates = equipmentFiltered;
  if (candidates.length === 0) {
    candidates = allExercises.filter((ex) =>
      ["body weight", "assisted", "none", "roller", "wheel roller"].some((b) =>
        String(ex.equipment || "").toLowerCase().includes(b)
      )
    );
  }

  // Filter out any recently excluded IDs if needed
  if (excludeIds.length > 0) {
    const nonExcluded = candidates.filter((ex) => !excludeIds.includes(ex.id));
    if (nonExcluded.length >= safeCount) {
      candidates = nonExcluded;
    }
  }

  // 2. Target Body Part Filter
  let matchedTarget = candidates.filter((ex) =>
    matchesTargetBodyPart(ex, safeTarget)
  );

  // 3. Fallback Mechanism: If strict body part matching produces too few exercises,
  // gradually relax target muscle filter while strictly maintaining equipment safety.
  if (matchedTarget.length < safeCount) {
    const existingIds = new Set(matchedTarget.map((m) => m.id));
    const filler = candidates.filter((ex) => !existingIds.has(ex.id));
    matchedTarget = [...matchedTarget, ...shuffleArray(filler)];
  }

  // Shuffle matched pool to ensure variety each time user generates new workout
  const shuffledPool = shuffleArray(matchedTarget);

  // Deduplicate exercises by ID and normalized Name
  const selectedExercises: ExerciseItem[] = [];
  const seenNames = new Set<string>();

  for (const ex of shuffledPool) {
    const normName = ex.name.toLowerCase().trim();
    if (!seenNames.has(normName)) {
      seenNames.add(normName);
      selectedExercises.push(ex);
    }
    if (selectedExercises.length >= safeCount) break;
  }

  // Build recommended exercise objects with prescription math
  const recommendedList: RecommendedExercise[] = selectedExercises.map((ex) => {
    const rx = calculatePrescription(safeGoal, safeExp, ex.category);
    const matchReason = generateMatchReason(ex, prefs);
    return {
      exercise: ex,
      sets: rx.sets,
      reps: rx.reps,
      restSeconds: rx.restSeconds,
      matchReason,
    };
  });

  // Calculate estimated total calories and duration
  const totalSets = recommendedList.reduce((sum, r) => sum + r.sets, 0);
  const estimatedCalories = Math.round(totalSets * 12 + safeDuration * 4.5);

  const title = `${safeTarget === "Full Body" ? "Full Body" : safeTarget} ${safeGoal} Routine`;

  const description = `${safeExp} routine optimized for ${safeGoal.toLowerCase()} using ${safeEquipment.toLowerCase()}.`;

  return {
    id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    description,
    category: prefs.preferredType || "Strength",
    difficulty: safeExp,
    estimatedDurationMinutes: safeDuration,
    estimatedCalories,
    exercises: recommendedList,
    generatedAt: new Date().toISOString(),
    preferencesUsed: prefs,
  };
}

