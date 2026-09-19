import asyncio
import json
import logging
import re
import urllib.parse
import urllib.request
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def parse_iso8601_duration(duration_str: str) -> str:
    """Parses ISO 8601 duration like PT15M30S, PT1H2M into human readable string like '15 min'."""
    if not duration_str or not duration_str.startswith("PT"):
        return "20 min"

    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_str)
    if not match:
        return "20 min"

    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)

    total_minutes = hours * 60 + minutes
    if seconds >= 30 and total_minutes > 0:
        total_minutes += 1

    if hours > 0:
        remaining_mins = minutes
        return f"{hours}h {remaining_mins}m" if remaining_mins > 0 else f"{hours} hr"
    if total_minutes > 0:
        return f"{total_minutes} min"
    if seconds > 0:
        return f"{seconds} sec"

    return "20 min"


def _call_youtube_api(endpoint: str, params: Dict[str, Any]) -> Dict[str, Any]:
    url = f"https://www.googleapis.com/youtube/v3/{endpoint}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = resp.read().decode("utf-8")
        return json.loads(data)


async def fetch_youtube_workout_videos(
    query: str,
    api_key: str,
    max_results: int = 6,
) -> List[Dict[str, Any]]:
    """Calls YouTube Data API v3 search & video endpoints to get video items."""
    api_key = (api_key or "").strip()
    if not api_key:
        raise ValueError("YouTube API key is not configured. Please set YOUTUBE_API_KEY in backend/.env")

    # Step 1: Perform YouTube Search
    search_params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "videoCategoryId": "17",  # Sports category
        "maxResults": max_results,
        "key": api_key,
    }

    try:
        search_res = await asyncio.to_thread(_call_youtube_api, "search", search_params)
    except Exception as exc:
        logger.warning(f"YouTube search with videoCategoryId=17 failed: {exc}. Retrying without category filter.")
        # Fallback search without category constraint
        search_params.pop("videoCategoryId", None)
        try:
            search_res = await asyncio.to_thread(_call_youtube_api, "search", search_params)
        except Exception as exc2:
            logger.error(f"YouTube API search failed: {exc2}", exc_info=True)
            raise RuntimeError(f"YouTube API search request failed: {str(exc2)}") from exc2

    items = search_res.get("items", [])
    if not items:
        # Retry with a broader search query if specific query returned no items
        search_params["q"] = "workout home fitness exercise"
        search_res = await asyncio.to_thread(_call_youtube_api, "search", search_params)
        items = search_res.get("items", [])

    video_ids = [
        item["id"]["videoId"]
        for item in items
        if item.get("id") and isinstance(item["id"], dict) and item["id"].get("videoId")
    ]

    if not video_ids:
        return []

    # Step 2: Fetch Video Details (Duration & Thumbnails)
    video_params = {
        "part": "snippet,contentDetails",
        "id": ",".join(video_ids),
        "key": api_key,
    }

    try:
        details_res = await asyncio.to_thread(_call_youtube_api, "videos", video_params)
        detail_items = details_res.get("items", [])
    except Exception as exc:
        logger.warning(f"Failed to fetch detailed video metadata: {exc}")
        detail_items = []

    details_map = {v["id"]: v for v in detail_items if "id" in v}

    results = []
    for item in items:
        vid_id = item["id"]["videoId"]
        snippet = item.get("snippet", {})
        detail = details_map.get(vid_id, {})
        content_details = detail.get("contentDetails", {})

        iso_duration = content_details.get("duration", "")
        formatted_duration = parse_iso8601_duration(iso_duration)

        thumbnails = snippet.get("thumbnails", {})
        thumbnail_url = (
            thumbnails.get("high", {}).get("url")
            or thumbnails.get("medium", {}).get("url")
            or thumbnails.get("default", {}).get("url")
            or f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg"
        )

        # Unescape HTML entities in title
        title = snippet.get("title", "Workout Video")
        import html
        title = html.unescape(title)

        results.append({
            "video_id": vid_id,
            "title": title,
            "channel_title": html.unescape(snippet.get("channelTitle", "Fitness Channel")),
            "thumbnail_url": thumbnail_url,
            "duration": formatted_duration,
            "video_url": f"https://www.youtube.com/watch?v={vid_id}",
            "description": snippet.get("description", ""),
        })

    return results
