# ElevateFit
**A Smart Fitness and Nutrition Management System**

ElevateFit is a comprehensive, AI-powered health and fitness platform that helps users personalize workouts, analyze nutrition, monitor progress, and receive intelligent coaching. Built with a Next.js 14 frontend, a FastAPI backend, MongoDB, and integrated AI services (Google Gemini & Groq).

---

## Features

### 🔐 Authentication & Profile Management
- User registration and JWT-based authentication
- Secure password hashing with bcrypt
- User profile personalization (age, gender, height, weight, fitness goals, target calories, activity level, dietary preferences, physical limitations)

### 🏋️ Workouts & Exercise
- Browse and filter workout plans by category, duration, and difficulty
- YouTube workout recommendations integration
- Active workout session tracking with live metrics
- AI Pose Tracker modal for real-time exercise rep counting (e.g., Squats & Form feedback)

### 🥗 Nutrition & Meal Tracking
- Log daily meals (Breakfast, Lunch, Dinner, Snacks) with macronutrient breakdown
- Real-time daily calorie and macro progress tracking against personalized goals
- **AI Food Analyzer**: Image-based meal analysis powered by Google Gemini vision models

### 🤖 AI Coach
- Interactive fitness and nutrition assistant powered by Gemini & Groq LLMs
- Context-aware advice tailored to user metrics, workout history, and diet goals

### 👣 Step Counter & Activity
- Daily step tracking with milestone celebrations and calorie burn estimation

### 🏆 Gamification & Motivation
- Experience points (XP), streak tracking, level progression, and unlockable achievement badges
- Leaderboards and interactive workout milestones

### 📊 Analytics & Insights
- Visual charts and trends for workout consistency, calorie burn, and nutrition compliance
- Historical workout and nutrition summary breakdowns

### 📄 Download My Fitness Report (PDF)
- **Comprehensive PDF Export**: Generates a downloadable clinical-style PDF report summarizing:
  - **Athlete Profile & Biometrics**: Name, age, gender, height, weight, calculated BMI & classification, fitness goal, activity level, dietary preference, and equipment.
  - **Nutrition & Calorie Intake**: Daily breakdown tables (daily calories, protein, carbs, fats, logged meals count) and chronological meal logs.
  - **Exercise & Workout Activity**: Completed sessions, categories, active durations, calories burned, volume/reps, and cumulative totals.
  - **Daily Step Logs**: Recorded steps, walking distance, and estimated calorie expenditure.
- **Strictly Factual AI Executive Summary**: Objective synthesis of recorded user data, volume, and daily totals powered by Gemini (with automated deterministic fallback). **Strictly restricted to recorded data—no speculative advice, recommendations, or unverified claims.**
- **One-Click Download**: Accessible directly from both the **Dashboard** and **Analytics** pages.

---

## Tech Stack

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | FastAPI, Python 3.10+, Uvicorn, Pydantic |
| **PDF Generation** | ReportLab (clinical typography, dynamic multi-page numbering, tables) |
| **Database** | MongoDB (Motor async driver) |
| **AI / LLMs** | Google Gemini API, Groq Cloud API |
| **Computer Vision** | MediaPipe (Pose estimation & joint angle tracking) |
| **Auth** | JWT (JSON Web Tokens), Bcrypt |

---

## Application Pages

| Route | Description |
|---|---|
| `/` | Landing page highlighting core features and entry points |
| `/login` & `/signup` | User authentication and account creation |
| `/dashboard` | User overview: daily summary, active streaks, quick actions & **Download Fitness Report** |
| `/workouts` | Workout library, personalized generation, and active session player |
| `/step-counter` | Step tracking, daily goal progress, and activity stats |
| `/nutrition` | Daily meal logger, macro targets, and nutrition history |
| `/nutrition-analyzer` | AI-assisted meal photo analysis and nutritional estimation |
| `/ai-coach` | Interactive AI chat for personalized training and diet guidance |
| `/gamification` | User levels, badges, streaks, and achievement status |
| `/analytics` | Workout volume, calorie trends, health progress graphs & **Download Fitness Report** |
| `/settings` | Profile preferences, goals, and account settings |

---

## API Endpoints

Interactive Swagger API documentation is available at `http://localhost:8000/docs`.

### Authentication
- `POST /auth/register` — Register a new account
- `POST /auth/login` — Log in and receive JWT token
- `GET /auth/me` — Retrieve current authenticated user profile
- `PATCH /auth/me` — Update user profile details and baseline biometrics

### Workouts
- `GET /workouts` — List available workouts
- `GET /workouts/{id}` — Retrieve specific workout details
- `POST /workouts/{id}/favorite` — Toggle workout favorite status
- `GET /workouts/recommendations` — Fetch curated workout recommendations

### Nutrition
- `POST /nutrition/meals` — Log a meal with nutritional values
- `GET /nutrition/meals/today` — Retrieve today's logged meals and totals
- `POST /nutrition/analyze` — AI food vision analysis

### AI Coach
- `POST /ai-coach/message` — Conversational fitness guidance via Gemini / Groq
- `GET /ai-coach/history` — Retrieve previous coaching conversation sessions

### Gamification & Analytics
- `GET /gamification/profile` — User level, XP, badges, and streaks
- `GET /analytics/summary` — Performance summaries and aggregate statistics
- `POST /analytics/weight-checkin` — Log periodic body weight progression
- `GET /analytics/fitness-report/download` — **Generate and download comprehensive PDF fitness & nutrition report**

---

## Installation & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/) (v3.10 or higher)
- [MongoDB](https://www.mongodb.com/) (running locally or MongoDB Atlas URI)

### 1. Clone the Repository
```bash
git clone https://github.com/Aditipaul17/Aditi_ElevateFit-A-Smart-Fitness--and-Nutrition-Management-System.git
cd Aditi_ElevateFit-A-Smart-Fitness--and-Nutrition-Management-System
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

Configure `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=elevatefit
JWT_SECRET_KEY=your_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
YOUTUBE_API_KEY=your_youtube_api_key
```

Start the FastAPI backend:
```bash
uvicorn app.main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000`.

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Configure `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the Next.js dev server:
```bash
npm run dev
```
Frontend will be available at `http://localhost:3000`.

---

## Project Structure

```
ElevateFit/
├── frontend/                 # Next.js 14 App Router frontend
│   ├── app/                  # Routes: dashboard, analytics, workouts, nutrition, coach, etc.
│   ├── components/           # Reusable UI, modals, navigation, and charts
│   ├── lib/                  # API client (downloadFitnessReport), auth context, and utilities
│   └── public/               # Static assets and icons
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── routers/          # API route controllers (analytics, auth, workouts, nutrition, coach)
│   │   ├── models/           # Pydantic schemas and database models
│   │   ├── services/         # ReportLab PDF generator (fitness_report.py), AI service (gemini.py)
│   │   └── database.py       # MongoDB connection and indexing
│   └── requirements.txt      # Python backend dependencies (ReportLab, FastAPI, Motor, etc.)
├── ml/                       # Machine learning, pose estimation, and food vision modules
└── README.md
```

---

## Security
- Password hashing using `bcrypt`
- Stateless authentication with signed JWT tokens
- Secure environment configuration for secrets and API keys
- Scoped database operations per authenticated user

---

## License
MIT License
