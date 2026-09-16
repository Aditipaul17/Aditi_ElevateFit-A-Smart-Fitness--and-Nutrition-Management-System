import logging
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_gemini_configured() -> bool:
    key = (settings.gemini_api_key or settings.groq_api_key or "").strip()
    return bool(key)


async def _generate_groq_response(
    api_key: str,
    system_instruction: str,
    user_prompt: str,
    chat_history: Optional[List[Dict[str, Any]]] = None,
) -> str:
    import json
    import urllib.request
    import asyncio

    messages = [{"role": "system", "content": system_instruction}]
    if chat_history:
        for msg in chat_history[-10:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            text = msg.get("message", "")
            if text:
                messages.append({"role": role, "content": text})

    messages.append({"role": "user", "content": user_prompt})

    def _call_groq(model_name: str):
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1024,
        }
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]

    try:
        return await asyncio.to_thread(_call_groq, "llama-3.3-70b-versatile")
    except Exception:
        try:
            return await asyncio.to_thread(_call_groq, "llama3-70b-8192")
        except Exception as exc:
            logger.error(f"Groq API call failed: {exc}")
            raise RuntimeError(f"AI Coach (Groq) error: {str(exc)}") from exc


async def generate_coaching_response(
    user_prompt: str,
    user_profile: Dict[str, Any],
    chat_history: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Generates a personalized AI fitness & nutrition response using Gemini or Groq."""
    api_key = (settings.gemini_api_key or settings.groq_api_key or "").strip()
    if not api_key:
        raise ValueError(
            "API key is not configured. Please set GEMINI_API_KEY in backend/.env"
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

    # Route to Groq if key starts with gsk_
    if api_key.startswith("gsk_"):
        return await _generate_groq_response(
            api_key=api_key,
            system_instruction=system_instruction,
            user_prompt=user_prompt,
            chat_history=chat_history,
        )

    # Otherwise route to Google Gemini
    client = genai.Client(api_key=api_key)

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

