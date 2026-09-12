import logging
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_gemini_configured() -> bool:
    return bool(settings.gemini_api_key and settings.gemini_api_key.strip())


async def generate_coaching_response(
    user_prompt: str,
    user_profile: Dict[str, Any],
    chat_history: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Generates a personalized AI fitness & nutrition response using Google Gemini."""
    api_key = settings.gemini_api_key.strip() if settings.gemini_api_key else ""
    if not api_key:
        raise ValueError(
            "Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env"
        )

    # Formulate personalized system instruction using stored athlete profile
    profile_items = []
    if user_profile.get("name"):
        profile_items.append(f"Name: {user_profile['name']}")
    if user_profile.get("age"):
        profile_items.append(f"Age: {user_profile['age']} years")
    if user_profile.get("gender"):
        profile_items.append(f"Gender: {user_profile['gender']}")
    if user_profile.get("height"):
        profile_items.append(f"Height: {user_profile['height']} cm")
    if user_profile.get("weight"):
        profile_items.append(f"Weight: {user_profile['weight']} kg")
    if user_profile.get("fitness_goal"):
        profile_items.append(f"Fitness Goal: {user_profile['fitness_goal']}")
    if user_profile.get("activity_level"):
        profile_items.append(f"Activity Level: {user_profile['activity_level']}")
    if user_profile.get("dietary_preference"):
        profile_items.append(f"Dietary Preference: {user_profile['dietary_preference']}")
    if user_profile.get("workout_experience"):
        profile_items.append(f"Workout Experience: {user_profile['workout_experience']}")
    if user_profile.get("equipment"):
        eq = (
            ", ".join(user_profile["equipment"])
            if isinstance(user_profile["equipment"], list)
            else str(user_profile["equipment"])
        )
        profile_items.append(f"Available Equipment: {eq}")

    bio_summary = (
        "\n".join(f"- {item}" for item in profile_items)
        if profile_items
        else "- Profile details not fully set."
    )

    system_instruction = (
        "You are ElevateFit AI Coach, an elite, encouraging, and scientific personal fitness and nutrition coach.\n"
        "Provide clear, actionable, and personalized advice on workout programming, exercise technique, nutrition, macros, and recovery.\n"
        "Tailor your recommendation directly to the athlete's body metrics, goals, and equipment preferences.\n\n"
        f"ATHLETE PROFILE:\n{bio_summary}\n\n"
        "Guidelines:\n"
        "- Be highly motivating, precise, and practical.\n"
        "- When providing workouts, specify exercise names, sets, reps, and target muscle groups.\n"
        "- When providing meal suggestions, include realistic ingredients and approximate calories/protein.\n"
        "- Keep responses well-structured with clear bullet points or numbered sections."
    )

    client = genai.Client(api_key=api_key)

    # Format recent chat history (up to last 10 messages) as context
    contents: List[Any] = []
    if chat_history:
        for msg in chat_history[-10:]:
            role = "user" if msg.get("role") == "user" else "model"
            text = msg.get("message", "")
            if text:
                contents.append(
                    types.Content(role=role, parts=[types.Part.from_text(text=text)])
                )

    contents.append(
        types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)])
    )

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.7,
        max_output_tokens=1024,
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=config,
        )

        if not response.text:
            raise RuntimeError("Gemini returned an empty response.")
        return response.text.strip()
    except Exception as exc:
        logger.error(f"Gemini API call failed: {exc}")
        raise RuntimeError(f"Gemini API error: {str(exc)}") from exc
