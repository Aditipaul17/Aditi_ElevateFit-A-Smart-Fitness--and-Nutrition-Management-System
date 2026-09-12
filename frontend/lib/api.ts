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
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
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

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
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
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
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
};

export async function updateProfile(
  token: string,
  payload: ProfileUpdatePayload
): Promise<AuthUser> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
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
  const res = await fetch(`${API_BASE_URL}/ai-coach/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load chat history."), res.status);
  }
  return body as ChatMessage[];
}

export async function sendCoachMessage(token: string, message: string): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE_URL}/ai-coach/message`, {
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
  const res = await fetch(`${API_BASE_URL}/ai-coach/history`, {
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
  const res = await fetch(`${API_BASE_URL}/analytics/summary`, {
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

export async function logMeal(token: string, payload: MealLogPayload): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE_URL}/nutrition/meals`, {
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
  return body as { id: string };
}

export async function fetchTodayMeals(token: string): Promise<{
  meals: any[];
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}> {
  const res = await fetch(`${API_BASE_URL}/nutrition/meals/today`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load today's meals."), res.status);
  }
  return body as any;
}

export async function fetchWorkouts(category?: string): Promise<any[]> {
  const url = new URL(`${API_BASE_URL}/workouts`);
  if (category && category !== "All Workouts") {
    url.searchParams.set("category", category);
  }
  const res = await fetch(url.toString());
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not load workouts."), res.status);
  }
  return body as any[];
}

export async function favoriteWorkout(token: string, workoutId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/workouts/${workoutId}/favorite`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await parseJsonSafe(res);
    throw new ApiError(extractErrorMessage(body, "Could not save workout."), res.status);
  }
}

export async function completeWorkout(token: string, workoutId: string): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE_URL}/workouts/${workoutId}/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, "Could not log workout session."), res.status);
  }
  return body as { id: string };
}




