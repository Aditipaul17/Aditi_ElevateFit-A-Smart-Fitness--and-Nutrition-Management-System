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

    models_to_try = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"]
    last_err = None
    for model in models_to_try:
        try:
            return await asyncio.to_thread(_call_groq, model)
        except Exception as exc:
            last_err = exc
            logger.warning(f"Groq model {model} call failed: {exc}")

    logger.error(f"Groq API call failed across all models: {last_err}", exc_info=True)
    raise RuntimeError(f"Groq API error: {str(last_err)}") from last_err


async def generate_coaching_response(
    user_prompt: str,
    user_profile: Dict[str, Any],
    chat_history: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Generates a personalized AI fitness & nutrition response using Gemini or Groq."""
    api_key = (settings.gemini_api_key or settings.groq_api_key or "").strip()
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

    if user_profile.get("preferred_workout_type"):
        profile_items.append(f"Preferred Workout Type: {user_profile['preferred_workout_type']}")
    if user_profile.get("available_workout_time"):
        profile_items.append(f"Available Workout Time: {user_profile['available_workout_time']}")
    if user_profile.get("food_preferences"):
        fp = (
            ", ".join(user_profile["food_preferences"])
            if isinstance(user_profile["food_preferences"], list)
            else str(user_profile["food_preferences"])
        )
        profile_items.append(f"Food Preferences & Allergies: {fp}")
    if user_profile.get("fitness_limitations"):
        lim = (
            ", ".join(user_profile["fitness_limitations"])
            if isinstance(user_profile["fitness_limitations"], list)
            else str(user_profile["fitness_limitations"])
        )
        profile_items.append(f"Fitness Limitations / Injuries: {lim}")

    bio_summary = (
        "\n".join(f"- {item}" for item in profile_items)
        if profile_items
        else "- Profile details not fully set."
    )

    dietary_pref_rule = ""
    diet_val = (user_profile.get("dietary_preference") or "").lower()
    if "vegetarian" in diet_val and "non" not in diet_val:
        dietary_pref_rule = "\n- STRICT DIETARY REQUIREMENT: The athlete is VEGETARIAN. You must NEVER suggest chicken, meat, beef, pork, fish, seafood, or eggs under any circumstances. Only suggest vegetarian foods like paneer, tofu, lentils, beans, yogurt, nuts, seeds, fruits, and vegetables."
    elif "vegan" in diet_val:
        dietary_pref_rule = "\n- STRICT DIETARY REQUIREMENT: The athlete is VEGAN. You must NEVER suggest any animal products, including meat, chicken, fish, eggs, dairy, paneer, yogurt, cheese, or honey. Only suggest 100% plant-based foods."
    elif diet_val and "no preference" not in diet_val:
        dietary_pref_rule = f"\n- STRICT DIETARY REQUIREMENT: The athlete follows a '{user_profile['dietary_preference']}' diet. Respect this dietary restriction strictly in all meal suggestions."

    food_prefs_val = user_profile.get("food_preferences")
    if food_prefs_val:
        fp_str = ", ".join(food_prefs_val) if isinstance(food_prefs_val, list) else str(food_prefs_val)
        dietary_pref_rule += f"\n- FOOD PREFERENCES & ALLERGIES: Strictly respect the following allergies/preferences: {fp_str}. Do NOT recommend foods containing these allergens."

    limits_val = user_profile.get("fitness_limitations")
    if limits_val:
        lim_str = ", ".join(limits_val) if isinstance(limits_val, list) else str(limits_val)
        dietary_pref_rule += f"\n- SAFETY & PHYSICAL LIMITATIONS: The athlete has the following limitations/injuries: {lim_str}. Avoid high-risk or aggravating exercises and offer low-impact or safe modifications."

    system_instruction = (
        "You are ElevateFit AI Coach, an elite, encouraging, and scientific personal fitness and nutrition coach.\n"
        "Provide clear, actionable, and personalized advice on workout programming, exercise technique, nutrition, macros, and recovery.\n"
        "Tailor your recommendation directly to the athlete's body metrics, goals, physical limitations, and equipment preferences.\n\n"
        f"ATHLETE PROFILE:\n{bio_summary}\n\n"
        "Guidelines:\n"
        "- Be highly motivating, precise, and practical.\n"
        "- When providing workouts, specify exercise names, sets, reps, and target muscle groups.\n"
        "- When providing meal suggestions, include realistic ingredients and approximate calories/protein."
        f"{dietary_pref_rule}\n"
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

    # Otherwise route to Google Gemini SDK
    try:
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

        # Try gemini-3.6-flash first, then fallback models
        models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"]
        last_exc = None
        for m in models:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=contents,
                    config=config,
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                last_exc = e
                logger.warning(f"Gemini model {m} call failed: {e}")

        raise last_exc or RuntimeError("Gemini returned an empty response.")
    except Exception as exc:
        logger.error(f"Gemini API call failed: {exc}", exc_info=True)
        raise RuntimeError(f"Gemini API error: {str(exc)}") from exc


async def _call_ai_raw(api_key: str, user_prompt: str) -> str:
    """Internal helper to execute a simple prompt on Groq or Gemini."""
    system_instruction = "You are ElevateFit AI, an expert fitness assistant. Be concise and precise."
    if api_key.startswith("gsk_"):
        return await _generate_groq_response(
            api_key=api_key,
            system_instruction=system_instruction,
            user_prompt=user_prompt,
        )

    client = genai.Client(api_key=api_key)
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.5,
        max_output_tokens=500,
    )
    models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"]
    for m in models:
        try:
            res = client.models.generate_content(model=m, contents=user_prompt, config=config)
            if res and res.text:
                return res.text.strip()
        except Exception:
            continue
    raise RuntimeError("Gemini call returned empty response.")


async def generate_youtube_search_query(user_profile: Dict[str, Any]) -> str:
    """Uses AI to generate a highly targeted YouTube search query string from user preferences."""
    goal = user_profile.get("fitness_goal") or "Fitness"
    exp = user_profile.get("workout_experience") or "Beginner"
    wtype = user_profile.get("preferred_workout_type") or "Workout"
    wtime = user_profile.get("available_workout_time") or "30 min"
    equipment = user_profile.get("equipment") or []
    eq_str = ", ".join(equipment) if isinstance(equipment, list) else str(equipment)
    act = user_profile.get("activity_level") or ""

    user_prompt = (
        f"Generate a single concise YouTube workout search query (4-7 words) for an athlete with preferences:\n"
        f"- Fitness Goal: {goal}\n"
        f"- Workout Type: {wtype}\n"
        f"- Experience Level: {exp}\n"
        f"- Available Time: {wtime}\n"
        f"- Equipment Available: {eq_str}\n"
        f"- Activity Level: {act}\n\n"
        "Return ONLY the search query string, nothing else. Do not use quotes or explanations."
    )

    api_key = (settings.gemini_api_key or settings.groq_api_key or "").strip()
    if not api_key:
        parts = [wtime, exp, wtype, goal, eq_str, "workout"]
        clean_parts = [p for p in parts if p and p.lower() != "none" and "no preference" not in p.lower()]
        return " ".join(clean_parts)

    try:
        query = await _call_ai_raw(api_key, user_prompt)
        query = query.strip().strip('"').strip("'")
        if query:
            return query
    except Exception as e:
        logger.warning(f"AI query generation failed: {e}. Using fallback query.")

    parts = [wtime, exp, wtype, goal, eq_str, "workout"]
    clean_parts = [p for p in parts if p and p.lower() != "none" and "no preference" not in p.lower()]
    return " ".join(clean_parts)



async def generate_youtube_match_reasons(
    user_profile: Dict[str, Any],
    videos: List[Dict[str, Any]],
) -> List[str]:
    """Generates a short personalized reason for why each video matches user preferences."""
    goal = user_profile.get("fitness_goal") or "fitness goal"
    exp = user_profile.get("workout_experience") or "experience level"
    wtype = user_profile.get("preferred_workout_type") or "workout type"
    wtime = user_profile.get("available_workout_time") or "available time"
    equipment = user_profile.get("equipment") or []
    eq_str = ", ".join(equipment) if isinstance(equipment, list) and equipment else "no equipment"

    video_titles = [f"{i+1}. {v.get('title', '')} ({v.get('duration', '')})" for i, v in enumerate(videos)]
    titles_block = "\n".join(video_titles)

    user_prompt = (
        f"Athlete Profile:\n"
        f"- Fitness Goal: {goal}\n"
        f"- Preferred Workout: {wtype}\n"
        f"- Experience: {exp}\n"
        f"- Time Available: {wtime}\n"
        f"- Equipment: {eq_str}\n\n"
        f"For each of the following YouTube videos, provide 1 short sentence (max 12 words) explaining why it matches the athlete's preferences:\n"
        f"{titles_block}\n\n"
        "Return a JSON list of strings, e.g. [\"Reason 1\", \"Reason 2\", ...]. Return ONLY valid JSON."
    )

    api_key = (settings.gemini_api_key or settings.groq_api_key or "").strip()
    if api_key:
        try:
            raw = await _call_ai_raw(api_key, user_prompt)
            import json
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            reasons = json.loads(raw.strip())
            if isinstance(reasons, list) and len(reasons) == len(videos):
                return [str(r).strip() for r in reasons]
        except Exception as e:
            logger.warning(f"AI match reasons generation failed: {e}. Using rule-based fallback.")

    fallback_reasons = []
    for v in videos:
        reason = f"Matches your {exp} level, {wtime} time slot, and {goal} goal."
        fallback_reasons.append(reason)
    return fallback_reasons



