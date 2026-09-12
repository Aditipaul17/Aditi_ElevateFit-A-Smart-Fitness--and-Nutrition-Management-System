from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import users_collection
from app.routers import ai_coach, auth, nutrition, workouts

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workouts.router)
app.include_router(nutrition.router)
app.include_router(ai_coach.router)


@app.on_event("startup")
async def ensure_indexes() -> None:
    # Enforces uniqueness on email at the database level as a second line of
    # defense against duplicate accounts (the API also checks explicitly).
    await users_collection.create_index("email", unique=True)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.app_name}
