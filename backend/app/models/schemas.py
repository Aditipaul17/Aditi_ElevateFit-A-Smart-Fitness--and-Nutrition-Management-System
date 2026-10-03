from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    confirm_password: str = Field(min_length=8, max_length=72)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v

    @model_validator(mode="after")
    def passwords_match(self) -> "UserCreate":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserProfileUpdate(BaseModel):
    """Fields a user may update about their own profile."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    age: Optional[int] = Field(default=None, ge=0, le=120)
    gender: Optional[str] = None
    height: Optional[float] = Field(default=None, ge=0)
    weight: Optional[float] = Field(default=None, ge=0)
    fitness_goal: Optional[str] = None
    activity_level: Optional[str] = None
    dietary_preference: Optional[str] = None
    workout_experience: Optional[str] = None
    equipment: Optional[list[str]] = None
    preferred_workout_type: Optional[str] = None
    available_workout_time: Optional[str] = None
    food_preferences: Optional[list[str]] = None
    fitness_limitations: Optional[list[str]] = None
    onboarding_completed: Optional[bool] = None


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    fitness_goal: Optional[str] = None
    activity_level: Optional[str] = None
    dietary_preference: Optional[str] = None
    workout_experience: Optional[str] = None
    equipment: Optional[list[str]] = None
    preferred_workout_type: Optional[str] = None
    available_workout_time: Optional[str] = None
    food_preferences: Optional[list[str]] = None
    fitness_limitations: Optional[list[str]] = None
    onboarding_completed: Optional[bool] = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class StepLogCreate(BaseModel):
    steps: int = Field(gt=0, le=200000)
    date: Optional[str] = None


class StepLogOut(BaseModel):
    id: str
    user_id: str
    steps: int
    date: str
    logged_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class WorkoutOut(BaseModel):
    id: str
    title: str
    category: Literal["Strength", "Cardio", "HIIT", "Yoga", "Stretching"]
    location: Literal["Home", "Gym"]
    duration_minutes: int
    difficulty: Literal["Beginner", "Intermediate", "Advanced", "Elite"]
    calories: int
    trainer: str
    target_muscles: list[str]
    image_url: str
    recommendation_reason: Optional[str] = None
    match_score: Optional[float] = None



class NutritionTargetsOut(BaseModel):
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: Optional[int] = 30


class MealRecommendationOut(BaseModel):
    id: str
    name: str
    time: str
    items: str
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    fiber_g: Optional[int] = 5


class EvidenceSourceOut(BaseModel):
    name: str
    authority: str
    summary: str
    reference_url: Optional[str] = None


class NutritionRecommendationsResponse(BaseModel):
    targets: NutritionTargetsOut
    recommended_meals: list[MealRecommendationOut]
    evidence_sources: list[EvidenceSourceOut] = []
    guidance_notes: list[str] = []
    user_metrics_summary: Optional[dict] = None


class MealScanResponse(BaseModel):
    food_name: str
    portion_size: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    confidence: float
    breakdown: str


class FoodItemOut(BaseModel):
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    dietary_tags: list[str] = []


class MealLogCreate(BaseModel):
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    logged_at: datetime = Field(default_factory=datetime.utcnow)


class CoachMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def message_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class ChatMessageOut(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    message: str
    timestamp: datetime


class BadgeOut(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    unlocked: bool
    unlocked_at: Optional[datetime] = None


class GamificationOut(BaseModel):
    total_xp: int
    level: int
    xp_in_level: int
    xp_needed_for_next: int
    next_level_xp: int
    progress_pct: float
    current_streak: int
    longest_streak: int
    badges_earned_count: int
    total_badges_count: int
    badges: list[BadgeOut]
    workouts_completed_count: int
    meals_logged_count: int
    last_activity_date: Optional[str] = None


class ActivityRequest(BaseModel):
    activity_type: Literal["workout", "meal", "daily_checkin"]


class ActivityResponse(BaseModel):
    xp_gained: int
    total_xp: int
    level: int
    leveled_up: bool
    current_streak: int
    longest_streak: int
    new_badges: list[BadgeOut]
    message: str


class YouTubeWorkoutVideo(BaseModel):
    video_id: str
    title: str
    channel_title: str
    thumbnail_url: str
    duration: str
    video_url: str
    recommendation_reason: str


class YouTubeRecommendationsResponse(BaseModel):
    query_used: str
    videos: list[YouTubeWorkoutVideo]
    missing_preferences: bool = False
    message: Optional[str] = None



