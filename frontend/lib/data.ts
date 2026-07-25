// Temporary mock data. Replace with fetch() calls to the FastAPI backend
// once the corresponding endpoints in `backend/app/routers` are live.

export const weeklyActivity = [
  { day: "Mon", calories: 420, steps: 6200 },
  { day: "Tue", calories: 580, steps: 8400 },
  { day: "Wed", calories: 310, steps: 4100 },
  { day: "Thu", calories: 690, steps: 9800 },
  { day: "Fri", calories: 520, steps: 7300 },
  { day: "Sat", calories: 780, steps: 11200 },
  { day: "Sun", calories: 240, steps: 3100 },
];

export type Workout = {
  id: string;
  title: string;
  category: "Strength" | "Cardio" | "HIIT" | "Yoga" | "Stretching";
  location: "Home" | "Gym";
  duration: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Elite";
  calories: number;
  trainer: string;
  targetMuscles: string[];
  image: string;
};

export const workouts: Workout[] = [
  {
    id: "metabolic-firestorm",
    title: "Metabolic Firestorm: High-Intensity Shred",
    category: "HIIT",
    location: "Gym",
    duration: "45 min",
    difficulty: "Elite",
    calories: 620,
    trainer: "Marcus Thorne",
    targetMuscles: ["Full Body", "Core"],
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "flow-foundations",
    title: "Flow Foundations",
    category: "Yoga",
    location: "Home",
    duration: "30 min",
    difficulty: "Beginner",
    calories: 180,
    trainer: "Priya Nandan",
    targetMuscles: ["Mobility", "Core"],
    image:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "hypertrophy-chest",
    title: "Hypertrophy Blueprint: Chest",
    category: "Strength",
    location: "Gym",
    duration: "60 min",
    difficulty: "Advanced",
    calories: 450,
    trainer: "Daniel Cho",
    targetMuscles: ["Chest", "Triceps"],
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "velocity-peak-sprints",
    title: "Velocity Peak: Sprints",
    category: "Cardio",
    location: "Gym",
    duration: "25 min",
    difficulty: "Intermediate",
    calories: 320,
    trainer: "Marcus Thorne",
    targetMuscles: ["Legs", "Cardio"],
    image:
      "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "mountain-ascent-5k",
    title: "Mountain Ascent 5K",
    category: "Cardio",
    location: "Home",
    duration: "35 min",
    difficulty: "Intermediate",
    calories: 380,
    trainer: "Sofia Reyes",
    targetMuscles: ["Legs", "Endurance"],
    image:
      "https://images.unsplash.com/photo-1508923567004-3a6b8004f3d7?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "recovery-stretch",
    title: "Deep Recovery Stretch",
    category: "Stretching",
    location: "Home",
    duration: "20 min",
    difficulty: "Beginner",
    calories: 90,
    trainer: "Priya Nandan",
    targetMuscles: ["Full Body"],
    image:
      "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=800&auto=format&fit=crop",
  },
];

export const nutritionToday = {
  calories: { consumed: 1640, goal: 2200 },
  protein: { consumed: 118, goal: 160, unit: "g" },
  carbs: { consumed: 172, goal: 240, unit: "g" },
  fat: { consumed: 48, goal: 70, unit: "g" },
  fiber: { consumed: 19, goal: 30, unit: "g" },
  water: { consumed: 2.1, goal: 3, unit: "L" },
};

export const meals = [
  {
    id: "breakfast",
    name: "Breakfast",
    time: "7:30 AM",
    items: "Greek yogurt, blueberries, granola",
    calories: 420,
  },
  {
    id: "lunch",
    name: "Lunch",
    time: "12:45 PM",
    items: "Grilled chicken, quinoa, roasted vegetables",
    calories: 610,
  },
  {
    id: "dinner",
    name: "Dinner",
    time: "7:00 PM",
    items: "Salmon, sweet potato, steamed greens",
    calories: 540,
  },
  {
    id: "snacks",
    name: "Snacks",
    time: "Throughout the day",
    items: "Almonds, protein shake",
    calories: 320,
  },
];
