# ElevateFit
**A Smart Fitness and Nutrition Management System**

ElevateFit helps users track workouts, log meals, monitor progress, and get personalized fitness guidance. Built with a Next.js frontend, a FastAPI backend, and an ML module for pose detection and coaching.

Frontend pages currently run on mock data; the backend auth, workout, and nutrition APIs are functional but not yet wired to the frontend.

---

## Features

**Authentication (backend)**
- Register, login (JWT), get current user
- Password hashing with bcrypt

**Dashboard, Workouts, Nutrition, Analytics, Settings**
- Fully built responsive pages, currently backed by mock data
- Workouts & nutrition also have working backend APIs (list/get/favorite workouts, log meals, view today's meals)

**AI Coach** — 🚧 Planned / In Development. Page exists; backend endpoint is a placeholder, not yet functional.

---

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python |
| Database | MongoDB |
| Auth | JWT, bcrypt |
| ML/CV | Pose detection (working demo); nutrition vision & coaching engine (scaffolds) |

No AI/LLM (e.g. Gemini) integration is implemented yet.

---

## Architecture

```
User → Next.js Frontend → FastAPI Backend → MongoDB
```

`ml/` runs independently for now and will connect to the backend as it matures.

---

## Application Pages

| Page | Status |
|---|---|
| Landing (`/`) | ✅ Completed |
| Dashboard (`/dashboard`) | ✅ Completed |
| Workouts (`/workouts`) | ✅ Completed |
| Nutrition (`/nutrition`) | ✅ Completed |
| AI Coach (`/ai-coach`) | 🚧 In Development |
| Analytics (`/analytics`) | ✅ Completed |
| Settings (`/settings`) | ✅ Completed |

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Log in, receive JWT |
| GET | `/auth/me` | Get current user |
| GET | `/workouts` | List workouts |
| GET | `/workouts/{id}` | Get a workout |
| POST | `/workouts/{id}/favorite` | Favorite a workout |
| POST | `/nutrition/meals` | Log a meal |
| GET | `/nutrition/meals/today` | Get today's meals |
| POST | `/ai-coach/message` | AI coach chat (placeholder) |

Interactive docs: `http://localhost:8000/docs`

---

## Database

MongoDB is used for persistent storage, covering users, workouts, and nutrition logs. User-specific data is scoped via the JWT issued at login.

---

## Project Structure

```
ElevateFit/
├── frontend/   # Next.js 14 + TypeScript + Tailwind CSS
├── backend/    # FastAPI + MongoDB
├── ml/         # Pose detection, nutrition vision, coaching engine
└── README.md
```

---

## Installation & Setup

**1. Clone**
```bash
git clone https://github.com/Aditipaul17/Aditi_ElevateFit-A-Smart-Fitness--and-Nutrition-Management-System.git
cd Aditi_ElevateFit-A-Smart-Fitness--and-Nutrition-Management-System
```

**2. Backend**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

**3. Environment variables** (`.env`)
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET_KEY=your_secret
```

**4. Frontend**
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`.

---

## Authentication Flow

```
Register → stored in MongoDB → Login → JWT issued → protected API requests
```

---

## Screenshots

Screenshots will be added after the final UI testing phase.

---

## Security

- Bcrypt password hashing
- JWT-based authentication
- Secrets via environment variables (not committed)
- User data scoped to the authenticated JWT

---

## Contributors

**Aditi Paul** — [github.com/Aditipaul17](https://github.com/Aditipaul17)

## License

Not specified
