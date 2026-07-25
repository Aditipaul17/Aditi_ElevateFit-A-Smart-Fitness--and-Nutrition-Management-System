from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    goal: Optional[str] = None


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


class MealLogCreate(BaseModel):
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    logged_at: datetime = Field(default_factory=datetime.utcnow)


class CoachMessageCreate(BaseModel):
    session_id: Optional[str] = None
    message: str
