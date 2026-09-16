from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database import users_collection
from app.routers import ai_coach, analytics, auth, gamification, nutrition, workouts

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
app.include_router(analytics.router)
app.include_router(gamification.router)




@app.on_event("startup")
async def ensure_indexes() -> None:
    # Enforces uniqueness on email at the database level as a second line of
    # defense against duplicate accounts (the API also checks explicitly).
    await users_collection.create_index("email", unique=True)

    # Seed initial workouts if database collection is missing workouts
    from app.database import workouts_collection
    initial_workouts = [
        {
            "title": "Beginner Full Body",
            "category": "Strength",
            "location": "Home",
            "duration_minutes": 30,
            "difficulty": "Beginner",
            "calories": 220,
            "trainer": "Coach Marcus",
            "target_muscles": ["Full Body", "Core"],
            "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "Low Impact Cardio",
            "category": "Cardio",
            "location": "Home",
            "duration_minutes": 25,
            "difficulty": "Beginner",
            "calories": 190,
            "trainer": "Coach Sam",
            "target_muscles": ["Legs", "Cardio"],
            "image_url": "https://images.unsplash.com/photo-1508923567004-3a6b8004f3d7?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "Beginner Yoga",
            "category": "Yoga",
            "location": "Home",
            "duration_minutes": 25,
            "difficulty": "Beginner",
            "calories": 150,
            "trainer": "Coach Maya",
            "target_muscles": ["Flexibility", "Balance"],
            "image_url": "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "Full Body Stretching",
            "category": "Stretching",
            "location": "Home",
            "duration_minutes": 15,
            "difficulty": "Beginner",
            "calories": 85,
            "trainer": "Coach Priya",
            "target_muscles": ["Full Body", "Joints"],
            "image_url": "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "Hypertrophy Upper Body",
            "category": "Strength",
            "location": "Gym",
            "duration_minutes": 45,
            "difficulty": "Intermediate",
            "calories": 380,
            "trainer": "Coach Marcus",
            "target_muscles": ["Chest", "Back", "Arms"],
            "image_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "Core Conditioning",
            "category": "HIIT",
            "location": "Home",
            "duration_minutes": 25,
            "difficulty": "Beginner",
            "calories": 240,
            "trainer": "Coach Elena",
            "target_muscles": ["Abs", "Obliques"],
            "image_url": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "Full Body Power",
            "category": "Strength",
            "location": "Gym",
            "duration_minutes": 50,
            "difficulty": "Advanced",
            "calories": 490,
            "trainer": "Coach David",
            "target_muscles": ["Full Body", "Legs"],
            "image_url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "Vinyasa Flow",
            "category": "Yoga",
            "location": "Home",
            "duration_minutes": 35,
            "difficulty": "Beginner",
            "calories": 180,
            "trainer": "Coach Maya",
            "target_muscles": ["Flexibility", "Core"],
            "image_url": "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "HIIT Cardio Blast",
            "category": "Cardio",
            "location": "Home",
            "duration_minutes": 30,
            "difficulty": "Intermediate",
            "calories": 320,
            "trainer": "Coach Sam",
            "target_muscles": ["Quads", "Cardio"],
            "image_url": "https://images.unsplash.com/photo-1434596922112-19c563067271?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "Deep Stretch & Mobility",
            "category": "Stretching",
            "location": "Home",
            "duration_minutes": 20,
            "difficulty": "Beginner",
            "calories": 110,
            "trainer": "Coach Maya",
            "target_muscles": ["Hamstrings", "Hips"],
            "image_url": "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop",
        },
        {
            "title": "Metabolic Firestorm",
            "category": "HIIT",
            "location": "Gym",
            "duration_minutes": 45,
            "difficulty": "Elite",
            "calories": 620,
            "trainer": "Coach Marcus",
            "target_muscles": ["Full Body", "Core"],
            "image_url": "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop",
        },
    ]

    for workout_data in initial_workouts:
        existing = await workouts_collection.find_one({"title": workout_data["title"]})
        if not existing:
            await workouts_collection.insert_one(workout_data)



@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.app_name}

