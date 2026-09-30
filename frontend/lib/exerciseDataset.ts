export interface RawInstructionObj {
  en?: string[];
  es?: string[];
  it?: string[];
  tr?: string[];
  ru?: string[];
  zh?: string[];
  hi?: string[];
  pl?: string[];
  ko?: string[];
  fr?: string[];
  [key: string]: any;
}

export interface RawExerciseItem {
  id: string;
  name: string;
  category: string;
  body_part: string;
  equipment: string;
  target: string;
  muscle_group?: string;
  secondary_muscles?: string[];
  instructions?: RawInstructionObj | string | string[];
  instruction_steps?: string[];
  image?: string;
  gif_url?: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  category: string;
  bodyPart: string;
  equipment: string;
  target: string;
  muscleGroup: string;
  secondaryMuscles: string[];
  instructions: string[];
  imageUrl: string;
  gifUrl: string;
}

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/";

let cachedExercises: ExerciseItem[] | null = null;

function normalizeInstructions(input?: RawInstructionObj | string | string[]): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.map((s) => String(s).trim()).filter(Boolean);
  }

  if (typeof input === "string") {
    return [input.trim()];
  }

  if (typeof input === "object") {
    if (Array.isArray(input.en) && input.en.length > 0) {
      return input.en.map((s) => String(s).trim()).filter(Boolean);
    }
    // Fallback to any language array
    const firstArr = Object.values(input).find((val) => Array.isArray(val) && val.length > 0);
    if (firstArr) {
      return (firstArr as string[]).map((s) => String(s).trim()).filter(Boolean);
    }
  }

  return [];
}

export function normalizeExercise(raw: RawExerciseItem): ExerciseItem {
  const gifPath = raw.gif_url || "";
  const imgPath = raw.image || "";

  const gifUrl = gifPath.startsWith("http")
    ? gifPath
    : gifPath
    ? `${GITHUB_RAW_BASE}${gifPath}`
    : "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop";

  const imageUrl = imgPath.startsWith("http")
    ? imgPath
    : imgPath
    ? `${GITHUB_RAW_BASE}${imgPath}`
    : gifUrl;

  const instructions = normalizeInstructions(raw.instructions || raw.instruction_steps);

  const secondary = Array.isArray(raw.secondary_muscles)
    ? raw.secondary_muscles
    : [];

  return {
    id: String(raw.id).padStart(4, "0"),
    name: raw.name ? raw.name.replace(/\b\w/g, (c) => c.toUpperCase()) : "Exercise",
    category: raw.category || "General",
    bodyPart: raw.body_part || raw.category || "Full Body",
    equipment: raw.equipment || "Body Weight",
    target: raw.target || raw.muscle_group || "General",
    muscleGroup: raw.muscle_group || raw.target || "General",
    secondaryMuscles: secondary,
    instructions,
    imageUrl,
    gifUrl,
  };
}

export async function fetchExercisesDataset(): Promise<ExerciseItem[]> {
  if (cachedExercises && cachedExercises.length > 0) {
    return cachedExercises;
  }

  try {
    // Attempt fetch from /data/exercises.json
    const res = await fetch("/data/exercises.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData: RawExerciseItem[] = await res.json();
    cachedExercises = rawData.map(normalizeExercise);
    return cachedExercises;
  } catch (err) {
    console.warn("Could not fetch /data/exercises.json from public directory, trying raw fallback...", err);
    try {
      const res = await fetch("https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rawData: RawExerciseItem[] = await res.json();
      cachedExercises = rawData.map(normalizeExercise);
      return cachedExercises;
    } catch (fallbackErr) {
      console.error("Failed to load exercise dataset:", fallbackErr);
      return [];
    }
  }
}

export function searchExercises(
  exercises: ExerciseItem[],
  query: string = "",
  bodyPartFilter: string = "All",
  equipmentFilter: string = "All"
): ExerciseItem[] {
  const q = String(query || "").toLowerCase().trim();
  const bp = String(bodyPartFilter || "All").toLowerCase();
  const eq = String(equipmentFilter || "All").toLowerCase();

  return exercises.filter((ex) => {
    const exName = String(ex?.name || "").toLowerCase();
    const exTarget = String(ex?.target || "").toLowerCase();
    const exBodyPart = String(ex?.bodyPart || "").toLowerCase();
    const exEquipment = String(ex?.equipment || "").toLowerCase();
    const exCategory = String(ex?.category || "").toLowerCase();

    const matchesQuery =
      !q ||
      exName.includes(q) ||
      exTarget.includes(q) ||
      exBodyPart.includes(q) ||
      exEquipment.includes(q);

    const matchesBp =
      bp === "all" || exBodyPart.includes(bp) || exCategory.includes(bp);

    let matchesEq = eq === "all" || exEquipment.includes(eq);
    if (eq === "no equipment" || eq === "bodyweight" || eq === "body weight") {
      matchesEq = ["body weight", "assisted", "none", "roller", "wheel roller"].some((b) =>
        exEquipment.includes(b)
      );
    }

    return matchesQuery && matchesBp && matchesEq;
  });
}
