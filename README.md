# ElevateFit — Smart Fitness & Nutrition Management System

A premium fitness and nutrition platform: adaptive AI coaching, real-time
pose-based form feedback, precision nutrition tracking, and performance
analytics — designed to feel like a commercial product (Nike Training
Club / Apple Fitness+ / WHOOP), not an AI demo.

```
ElevateFit/
├── frontend/   Next.js 14 + TypeScript + Tailwind CSS
├── backend/    FastAPI + MongoDB
├── ml/         Pose detection, nutrition vision, coaching engine
└── README.md
```

## Design system

| Token | Value |
|---|---|
| Primary — Forest Green | `#2D6A4F` |
| Secondary — Emerald | `#40916C` |
| Accent — Warm Gold | `#D4A373` |
| Background (light) | `#F8F9FA` |
| Background (dark) | `#111827` |
| Success / Warning / Error | `#16A34A` / `#F59E0B` / `#DC2626` |

Typography: **Poppins** for display/headings, **Inter** for body text.
Both light and dark mode are supported app-wide (toggle in Settings or the
top bar).

## Getting started

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`. Pages: `/` (landing), `/dashboard`,
`/workouts`, `/nutrition`, `/ai-coach`, `/analytics`, `/settings`.

> Note: `next/font` fetches Inter and Poppins from Google Fonts at build
> time, so an internet connection is required for `npm run build` /
> `npm run dev` the first time.

The frontend currently reads from `lib/data.ts` (mock data) so it runs
standalone without the backend. Replace those calls with `fetch()`s to
the FastAPI endpoints below as you wire things up.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then edit MONGODB_URI / JWT_SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`. Requires a running
MongoDB instance (local, Docker, or Atlas) — set `MONGODB_URI` in `.env`.

Endpoints implemented:
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- `GET /workouts`, `GET /workouts/{id}`, `POST /workouts/{id}/favorite`
- `POST /nutrition/meals`, `GET /nutrition/meals/today`
- `POST /ai-coach/message` (placeholder — see `ml/coaching_engine`)

### 3. ML

```bash
cd ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python pose_detection/pose_estimator.py   # webcam demo
```

See `ml/README.md` for the status and integration path of each module.

## Pushing to Git

```bash
cd ElevateFit
git init
git add .
git commit -m "Initial ElevateFit scaffold: premium redesign + backend + ml"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## What's implemented vs. scaffolded

- **Frontend:** fully built and functional against mock data — every page
  from the brief (landing, dashboard, workouts, nutrition, AI coach,
  analytics, settings) is real, responsive, animated code, not a stub.
- **Backend:** working FastAPI service with real auth (JWT + bcrypt),
  MongoDB models, and CRUD-style endpoints for workouts and nutrition.
- **ML:** pose detection is a runnable demo; nutrition vision and the
  coaching engine are working scaffolds meant to be extended with a
  trained model as you collect real usage data — see `ml/README.md`.

Community features (feed, leaderboard, friend requests), push
notifications, and payment/pricing integration from the original brief
are not yet built — they're natural next additions once the core loop
above is running end-to-end.
