"""
Adaptive AI Coach recommendation engine.

Scores an athlete's readiness for training intensity today, based on
recent workout consistency, self-reported recovery, and streak data.
This is intentionally simple (a weighted heuristic) so it can run
without any external ML dependencies; swap in a trained model once
you have enough logged athlete data to justify one.

`backend/app/routers/ai_coach.py` is the intended caller of
`recommend_session`.
"""

from dataclasses import dataclass


@dataclass
class AthleteState:
    days_since_last_workout: int
    workouts_last_7_days: int
    self_reported_recovery: int  # 1-10 scale
    current_streak: int


@dataclass
class SessionRecommendation:
    readiness_score: int  # 0-100
    intensity: str  # "Recovery", "Moderate", "High", "Elite"
    rationale: str


def compute_readiness(state: AthleteState) -> int:
    score = 50
    score += min(state.self_reported_recovery, 10) * 4
    score -= max(0, state.workouts_last_7_days - 4) * 5
    score += min(state.current_streak, 10) * 1.5
    score -= min(state.days_since_last_workout, 3) * 5
    return max(0, min(100, round(score)))


def recommend_session(state: AthleteState) -> SessionRecommendation:
    score = compute_readiness(state)

    if score >= 85:
        return SessionRecommendation(
            score, "Elite", "Recovery and consistency are both strong — a good day to push."
        )
    if score >= 65:
        return SessionRecommendation(
            score, "High", "Solid readiness. A challenging session should be well tolerated."
        )
    if score >= 40:
        return SessionRecommendation(
            score, "Moderate", "Readiness is average — a moderate session keeps progress without added fatigue."
        )
    return SessionRecommendation(
        score, "Recovery", "Recovery signals are low. An active recovery session is recommended today."
    )
