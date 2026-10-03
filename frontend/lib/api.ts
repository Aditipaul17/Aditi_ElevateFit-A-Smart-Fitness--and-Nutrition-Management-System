// Thin fetch wrapper around the FastAPI backend. Only auth endpoints are
// wired up here for now; other features still use lib/data.ts mock data.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function getErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) return err.message;
  if (err && typeof err === "object") {
    if ("name" in err && (err as { name: unknown }).name === "ApiError" && "message" in err) {
      return String((err as { message: unknown }).message);
    }
    if ("message" in err && typeof (err as { message: unknown }).message === "string") {
      const msg = (err as { message: string }).message;
      if (msg === "Failed to fetch" || msg.toLowerCase().includes("fetch")) {
        return `Unable to connect to the backend server (${API_BASE_URL}). Please make sure the backend is running.`;
      }
      return msg;
    }
  }
  return fallback;
}

/** Wrapper around standard fetch that converts network/connection failures to ApiErrors. */
async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (err) {
    if (err instanceof TypeError || (err && typeof err === "object" && "message" in err && String((err as any).message).includes("fetch"))) {
      throw new ApiError(
        `Unable to connect to the backend server (${API_BASE_URL}). Please make sure the backend server is running.`,
        0
      );
    }
    throw err;
  }
}

/** Pulls a human-readable message out of a FastAPI error response body. */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      // Pydantic validation errors: [{ loc, msg, type }, ...]
      const messages = detail
        .map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : null))
        .filter(Boolean);
      if (messages.length) return messages.join(" ");
    }
  }
  return fallback;
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  age?: number | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  fitness_goal?: string | null;
  activity_level?: string | null;
  dietary_preference?: string | null;
  workout_experience?: string | null;
  equipment?: string[] | null;
  preferred_workout_type?: string | null;
  available_workout_time?: string | null;
  food_preferences?: string[] | null;
  fitness_limitations?: string[] | null;
  onboarding_completed?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
};

export type Token = {
  access_token: string;
  token_type: string;
};

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function signup(payload: SignupPayload): Promise<Token> {
  const res = await safeFetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not create your account."), res.status);
  }
  return body as Token;
}

export async function login(email: string, password: string): Promise<Token> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);

  const res = await safeFetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Invalid email or password."), res.status);
  }
  return body as Token;
}

export async function fetchCurrentUser(token: string): Promise<AuthUser> {
  const res = await safeFetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load your profile."), res.status);
  }
  return body as AuthUser;
}

/** Fields the user may update — mirrors the backend's UserProfileUpdate schema. */
export type ProfileUpdatePayload = {
  name?: string;
  age?: number | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  fitness_goal?: string | null;
  activity_level?: string | null;
  dietary_preference?: string | null;
  workout_experience?: string | null;
  equipment?: string[] | null;
  preferred_workout_type?: string | null;
  available_workout_time?: string | null;
  food_preferences?: string[] | null;
  fitness_limitations?: string[] | null;
  onboarding_completed?: boolean | null;
};

export async function updateProfile(
  token: string,
  payload: ProfileUpdatePayload
): Promise<AuthUser> {
  const res = await safeFetch(`${API_BASE_URL}/auth/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not save your profile."), res.status);
  }
  return body as AuthUser;
}

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  message: string;
  timestamp: string;
};

export async function fetchChatHistory(token: string): Promise<ChatMessage[]> {
  const res = await safeFetch(`${API_BASE_URL}/ai-coach/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load chat history."), res.status);
  }
  return body as ChatMessage[];
}

export async function sendCoachMessage(token: string, message: string): Promise<ChatMessage> {
  const res = await safeFetch(`${API_BASE_URL}/ai-coach/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Failed to send message."), res.status);
  }
  return body as ChatMessage;
}

export async function clearChatHistory(token: string): Promise<void> {
  const res = await safeFetch(`${API_BASE_URL}/ai-coach/history`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new ApiError(extractErrorMessage(body, "Could not clear chat history."), res.status);
  }
}

export type WeightPoint = {
  date: string;
  weight: number;
};

export type DailyCaloriePoint = {
  day: string;
  calories: number;
};

export type AnalyticsSummary = {
  weight_trend: WeightPoint[];
  weekly_calories: DailyCaloriePoint[];
  avg_workout_frequency: number;
  avg_workout_duration_min: number;
  total_workout_minutes: number;
  avg_protein_intake_g: number;
  goal_progress_pct: number;
  total_meals_logged: number;
  total_workouts_saved: number;
};

export async function fetchAnalytics(token: string): Promise<AnalyticsSummary> {
  const res = await safeFetch(`${API_BASE_URL}/analytics/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load analytics summary."), res.status);
  }
  return body as AnalyticsSummary;
}

export type MealLogPayload = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export async function logMeal(token: string, payload: MealLogPayload): Promise<{ id: string; gamification?: ActivityRewardResponse }> {
  const res = await safeFetch(`${API_BASE_URL}/nutrition/meals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not log meal."), res.status);
  }
  return body as { id: string; gamification?: ActivityRewardResponse };
}

export async function fetchTodayMeals(token: string): Promise<{
  meals: any[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g?: number };
}> {
  const res = await safeFetch(`${API_BASE_URL}/nutrition/meals/today`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load today's meals."), res.status);
  }
  return body as any;
}

export type NutritionTargets = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
};

export type MealRecommendation = {
  id: string;
  name: string;
  time: string;
  items: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
};

export type EvidenceSource = {
  name: string;
  authority: string;
  summary: string;
  reference_url?: string;
};

export type NutritionRecommendationsResponse = {
  targets: NutritionTargets;
  recommended_meals: MealRecommendation[];
  evidence_sources?: EvidenceSource[];
  guidance_notes?: string[];
  user_metrics_summary?: Record<string, string>;
};

export type FoodItem = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  dietary_tags: string[];
};

export type MealScanResponse = {
  food_name: string;
  portion_size: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  breakdown: string;
};

export async function fetchNutritionRecommendations(
  token: string
): Promise<NutritionRecommendationsResponse> {
  const res = await safeFetch(`${API_BASE_URL}/nutrition/recommendations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load nutrition recommendations."), res.status);
  }
  return body as NutritionRecommendationsResponse;
}

export async function scanMealImage(
  token: string,
  imageInput: File | string,
  portionMultiplier: number = 1.0
): Promise<MealScanResponse> {
  let res: Response;
  if (typeof imageInput === "string") {
    // base64 image data
    res = await safeFetch(`${API_BASE_URL}/nutrition/scan-meal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        image_base64: imageInput,
        portion_multiplier: portionMultiplier,
      }),
    });
  } else {
    // multipart file upload
    const formData = new FormData();
    formData.append("file", imageInput);
    formData.append("portion_multiplier", String(portionMultiplier));

    res = await safeFetch(`${API_BASE_URL}/nutrition/scan-meal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  }

  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not scan meal image."), res.status);
  }
  return body as MealScanResponse;
}

export async function searchFoods(token: string, query: string): Promise<FoodItem[]> {
  const url = new URL(`${API_BASE_URL}/nutrition/search`);
  if (query) url.searchParams.set("q", query);
  const res = await safeFetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not search foods."), res.status);
  }
  return body as FoodItem[];
}

export async function fetchWorkouts(category?: string): Promise<any[]> {
  const url = new URL(`${API_BASE_URL}/workouts`);
  if (category && category !== "All Workouts") {
    url.searchParams.set("category", category);
  }
  const res = await safeFetch(url.toString());
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load workouts."), res.status);
  }
  return body as any[];
}

export async function fetchRecommendedWorkouts(token: string): Promise<any[]> {
  const res = await safeFetch(`${API_BASE_URL}/workouts/recommendations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load recommendations."), res.status);
  }
  return body as any[];
}


export async function favoriteWorkout(token: string, workoutId: string): Promise<void> {
  const res = await safeFetch(`${API_BASE_URL}/workouts/${workoutId}/favorite`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new ApiError(extractErrorMessage(body, "Could not save workout."), res.status);
  }
}

export async function completeWorkout(token: string, workoutId: string): Promise<{ id: string; gamification?: ActivityRewardResponse }> {
  const res = await safeFetch(`${API_BASE_URL}/workouts/${workoutId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not log workout session."), res.status);
  }
  return body as { id: string; gamification?: ActivityRewardResponse };
}

export async function logWorkoutSession(
  token: string,
  payload: { title: string; duration_minutes: number; calories_burned: number }
): Promise<{ id: string; gamification?: ActivityRewardResponse }> {
  try {
    const res = await safeFetch(`${API_BASE_URL}/workouts/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await parseJsonSafe(res);
    if (res.ok) return body as { id: string; gamification?: ActivityRewardResponse };
  } catch (e) {}
  // Fallback to complete workout endpoint
  return completeWorkout(token, "custom_dataset_session");
}


export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string | null;
};

export type GamificationData = {
  total_xp: number;
  level: number;
  xp_in_level: number;
  xp_needed_for_next: number;
  next_level_xp: number;
  progress_pct: number;
  current_streak: number;
  longest_streak: number;
  badges_earned_count: number;
  total_badges_count: number;
  badges: Badge[];
  workouts_completed_count: number;
  meals_logged_count: number;
  last_activity_date?: string | null;
};

export type ActivityRewardResponse = {
  xp_gained: number;
  total_xp: number;
  level: number;
  leveled_up: boolean;
  current_streak: number;
  longest_streak: number;
  new_badges: Badge[];
  message: string;
};

export async function fetchGamification(token: string): Promise<GamificationData> {
  const res = await safeFetch(`${API_BASE_URL}/gamification`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load gamification data."), res.status);
  }
  return body as GamificationData;
}

export async function recordGamificationActivity(
  token: string,
  activityType: "workout" | "meal" | "daily_checkin"
): Promise<ActivityRewardResponse> {
  const res = await safeFetch(`${API_BASE_URL}/gamification/activity`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ activity_type: activityType }),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not record activity."), res.status);
  }
  return body as ActivityRewardResponse;
}

export async function logSteps(token: string, steps: number): Promise<{ total_steps_today: number }> {
  const res = await safeFetch(`${API_BASE_URL}/workouts/steps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ steps }),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not log steps."), res.status);
  }
  return body as { total_steps_today: number };
}

export async function fetchTodaySteps(token: string): Promise<{ steps: number; goal: number }> {
  const res = await safeFetch(`${API_BASE_URL}/workouts/steps/today`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load today's steps."), res.status);
  }
  return body as { steps: number; goal: number };
}

export type WeeklyStepPoint = {
  date: string;
  day: string;
  steps: number;
  kcal: number;
  min: number;
  is_today: boolean;
};

export async function fetchWeeklySteps(token: string): Promise<WeeklyStepPoint[]> {
  const res = await safeFetch(`${API_BASE_URL}/workouts/steps/weekly`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load weekly steps."), res.status);
  }
  return body as WeeklyStepPoint[];
}

export type YouTubeWorkoutVideoItem = {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  duration: string;
  video_url: string;
  recommendation_reason: string;
};

export type YouTubeRecommendationsResponse = {
  query_used: string;
  videos: YouTubeWorkoutVideoItem[];
  missing_preferences: boolean;
  message?: string | null;
};

export async function fetchYouTubeRecommendations(
  token: string,
  refresh: boolean = false
): Promise<YouTubeRecommendationsResponse> {
  const url = new URL(`${API_BASE_URL}/workouts/youtube-recommendations`);
  if (refresh) url.searchParams.set("refresh", "true");

  const res = await safeFetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load YouTube recommendations."), res.status);
  }
  return body as YouTubeRecommendationsResponse;
}







