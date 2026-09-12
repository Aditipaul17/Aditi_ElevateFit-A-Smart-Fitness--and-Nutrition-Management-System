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
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


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

