# ElevateFit — ML

Machine learning components that power the AI-driven features of ElevateFit.

| Module | Purpose | Status |
|---|---|---|
| `pose_detection/` | Real-time pose estimation and rep counting via MediaPipe | Working starting point (webcam/video demo) |
| `nutrition_vision/` | Meal-photo macro estimation | Scaffold — needs a trained classifier + nutrition data source |
| `coaching_engine/` | Adaptive readiness scoring for the AI Coach | Working heuristic model |

## Setup

```bash
cd ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Pose Detection quick start

```bash
python pose_detection/pose_estimator.py            # webcam
python pose_detection/pose_estimator.py --video clip.mp4
```

## Integration path

These modules are designed to be called from the FastAPI backend
(`backend/app/routers/`), not run as a separate service, for the first
version:

- `ai_coach.py` → `coaching_engine.readiness_model.recommend_session`
- A new `pose.py` websocket router → `pose_detection.pose_estimator.PoseEstimator`
- `nutrition.py` → `nutrition_vision.macro_estimator.estimate_macros`

As usage grows, consider splitting inference into its own service
(e.g. behind a lightweight FastAPI microservice or a queue) so heavy
model calls don't block the main API.
