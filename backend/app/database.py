from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

client = AsyncIOMotorClient(settings.mongodb_uri)
db = client[settings.mongodb_db_name]

users_collection = db["users"]
workouts_collection = db["workouts"]
meals_collection = db["meals"]
sessions_collection = db["ai_coach_sessions"]
workout_logs_collection = db["workout_logs"]

