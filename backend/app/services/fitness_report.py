import io
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from google import genai
from google.genai import types

from app.core.config import settings


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and draw total page counts and running headers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header for pages > 1
        if self._pageNumber > 1:
            self.drawString(36, 11 * inch - 26, "ElevateFit — Personal Fitness & Nutrition Report")
            self.drawRightString(8.5 * inch - 36, 11 * inch - 26, f"Generated: {datetime.now(timezone.utc).strftime('%b %d, %Y')}")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 30, 8.5 * inch - 36, 11 * inch - 30)

        # Running Footer on all pages
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 36, 20, page_text)
        self.drawString(36, 20, "Confidential — ElevateFit Smart Fitness & Nutrition Management System")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(36, 30, 8.5 * inch - 36, 30)
        self.restoreState()


async def generate_ai_factual_summary(data_context: str) -> str:
    """
    Invokes Gemini with a strict system instruction to summarize ONLY recorded data
    without suggestions, recommendations, or forward-looking advice.
    """
    prompt = (
        "You are an objective clinical fitness and nutrition data reporting analyst.\n"
        "Analyze the athlete's recorded data below and produce a clear, factual summary of their recorded fitness and nutrition data, daily totals, and recorded progress.\n\n"
        "CRITICAL INSTRUCTIONS:\n"
        "- ONLY summarize the recorded data provided below.\n"
        "- DO NOT provide any recommendations, suggestions, tips, advice, prescriptive plans, or hypothetical goals.\n"
        "- DO NOT invent or assume any data not explicitly recorded in the log.\n"
        "- Keep the tone factual, concise, professional, and objective.\n"
        "- Provide 2 to 3 paragraphs covering:\n"
        "  1. Profile & baseline metrics overview.\n"
        "  2. Nutrition consistency and recorded daily calorie/macronutrient totals.\n"
        "  3. Completed workout sessions, exercise volume, and recorded calories burned.\n\n"
        f"RECORDED DATA LOG:\n{data_context}\n"
    )

    api_key = (settings.gemini_api_key or "").strip()
    if api_key and (api_key.startswith("AIzaSy") or api_key.startswith("AQ.")):
        try:
            client = genai.Client(api_key=api_key)
            config = types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=500,
            )
            for model_name in ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config,
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception:
                    continue
        except Exception:
            pass

    # Deterministic fallback summary if API call fails or quota is exhausted
    return ""


def build_fallback_summary(
    profile: Dict[str, Any],
    nutrition_stats: Dict[str, Any],
    workout_stats: Dict[str, Any],
    step_stats: Dict[str, Any],
) -> str:
    """Generates an objective, factual rule-based summary when AI service is unavailable."""
    name = profile.get("name") or "Athlete"
    age = profile.get("age", "N/A")
    gender = profile.get("gender", "N/A")
    height = profile.get("height", "N/A")
    weight = profile.get("weight", "N/A")
    goal = profile.get("fitness_goal", "Not specified")
    activity = profile.get("activity_level", "Not specified")

    p1 = (
        f"Athlete Profile Record: {name} (Age: {age}, Gender: {gender}, Height: {height} cm, Current Weight: {weight} kg). "
        f"The user's stated fitness goal is '{goal}' with an active baseline classification of '{activity}'."
    )

    total_meals = nutrition_stats["total_meals"]
    total_cals = nutrition_stats["total_calories"]
    avg_daily_cals = nutrition_stats["avg_daily_calories"]
    total_p = nutrition_stats["total_protein"]
    days_logged = nutrition_stats["days_logged"]

    if total_meals > 0:
        p2 = (
            f"Nutrition Records: A total of {total_meals} meals were logged across {days_logged} recorded days, "
            f"accounting for {total_cals:,} total kilocalories (daily recorded average: {avg_daily_cals:,} kcal/day). "
            f"Cumulative recorded macronutrients include {total_p:.1f}g protein, "
            f"{nutrition_stats['total_carbs']:.1f}g carbohydrates, and {nutrition_stats['total_fat']:.1f}g dietary fats."
        )
    else:
        p2 = "Nutrition Records: No meal or dietary intake entries have been logged in the system to date."

    total_workouts = workout_stats["total_workouts"]
    total_mins = workout_stats["total_minutes"]
    total_burn = workout_stats["total_calories_burned"]

    if total_workouts > 0:
        p3 = (
            f"Physical Activity Records: {total_workouts} completed workout sessions were recorded in the database, "
            f"accumulating {total_mins} total active minutes and an estimated {total_burn:,} kilocalories burned. "
            f"Step logs record a cumulative total of {step_stats['total_steps']:,} steps."
        )
    else:
        p3 = "Physical Activity Records: No completed exercise sessions have been logged in the system to date."

    return f"{p1}\n\n{p2}\n\n{p3}"


def format_date_str(dt: Any) -> str:
    if isinstance(dt, datetime):
        return dt.strftime("%b %d, %Y %H:%M")
    if isinstance(dt, str):
        try:
            parsed = datetime.fromisoformat(dt.replace("Z", "+00:00"))
            return parsed.strftime("%b %d, %Y %H:%M")
        except Exception:
            return dt[:16]
    return "N/A"


def format_day_only(dt: Any) -> str:
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d")
    if isinstance(dt, str):
        return dt[:10]
    return "Unknown"


def generate_fitness_report_pdf(
    profile: Dict[str, Any],
    meals: List[Dict[str, Any]],
    workouts: List[Dict[str, Any]],
    steps: List[Dict[str, Any]],
    ai_summary: str,
) -> bytes:
    """
    Compiles user profile, recorded nutrition, and workout logs into a professional PDF report.
    """
    # 1. Compute Nutrition Aggregates and Daily Totals
    daily_meals: Dict[str, Dict[str, float]] = {}
    total_cals = 0
    total_protein = 0.0
    total_carbs = 0.0
    total_fat = 0.0

    for m in meals:
        cals = int(m.get("calories") or 0)
        p = float(m.get("protein_g") or 0.0)
        c = float(m.get("carbs_g") or 0.0)
        f = float(m.get("fat_g") or 0.0)
        total_cals += cals
        total_protein += p
        total_carbs += c
        total_fat += f

        day_key = format_day_only(m.get("logged_at") or m.get("date") or "Unknown")
        if day_key not in daily_meals:
            daily_meals[day_key] = {"count": 0, "cals": 0, "p": 0.0, "c": 0.0, "f": 0.0}
        daily_meals[day_key]["count"] += 1
        daily_meals[day_key]["cals"] += cals
        daily_meals[day_key]["p"] += p
        daily_meals[day_key]["c"] += c
        daily_meals[day_key]["f"] += f

    num_nutrition_days = max(1, len(daily_meals))
    avg_daily_cals = round(total_cals / num_nutrition_days) if meals else 0
    avg_daily_protein = round(total_protein / num_nutrition_days, 1) if meals else 0.0

    # 2. Compute Workout Aggregates and Daily Totals
    daily_workouts: Dict[str, Dict[str, float]] = {}
    total_duration = 0
    total_burn = 0

    for w in workouts:
        dur = int(w.get("duration_minutes") or 0)
        burn = int(w.get("calories") or w.get("calories_burned") or 0)
        total_duration += dur
        total_burn += burn

        day_key = format_day_only(w.get("logged_at") or w.get("date") or "Unknown")
        if day_key not in daily_workouts:
            daily_workouts[day_key] = {"count": 0, "dur": 0, "burn": 0}
        daily_workouts[day_key]["count"] += 1
        daily_workouts[day_key]["dur"] += dur
        daily_workouts[day_key]["burn"] += burn

    # 3. Steps Aggregates
    total_steps = sum(int(s.get("steps") or 0) for s in steps)
    total_step_cals = sum(int(s.get("calories") or 0) for s in steps)

    # 4. Athlete BMI Calculation
    height_cm = float(profile.get("height") or 0)
    weight_kg = float(profile.get("weight") or 0)
    bmi_str = "N/A"
    bmi_class = "N/A"
    if height_cm > 50 and weight_kg > 20:
        bmi_val = round(weight_kg / ((height_cm / 100.0) ** 2), 1)
        if bmi_val < 18.5:
            bmi_class = "Underweight"
        elif bmi_val < 25.0:
            bmi_class = "Normal weight"
        elif bmi_val < 30.0:
            bmi_class = "Overweight"
        else:
            bmi_class = "Obese"
        bmi_str = f"{bmi_val} ({bmi_class})"

    # Setup Document
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    c_primary = colors.HexColor("#0f172a")    # Deep slate
    c_accent = colors.HexColor("#0284c7")     # Sky blue / cyan
    c_subtext = colors.HexColor("#475569")    # Slate text
    c_border = colors.HexColor("#cbd5e1")     # Light border
    c_bg_head = colors.HexColor("#f1f5f9")    # Table head bg
    c_card_bg = colors.HexColor("#f8fafc")    # Card bg
    c_pill = colors.HexColor("#e0f2fe")       # Highlight pill

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=c_primary,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=c_subtext,
    )
    section_h1 = ParagraphStyle(
        "SectionH1",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    )
    callout_text = ParagraphStyle(
        "CalloutText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )
    table_cell = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1e293b"),
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#0f172a"),
    )
    table_head = ParagraphStyle(
        "TableHead",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
    )

    story = []

    # ------------------ HEADER SECTION ------------------
    header_data = [
        [
            Paragraph("<b>ELEVATEFIT</b> &bull; FITNESS & NUTRITION REPORT", title_style),
            Paragraph(f"<b>Report ID:</b> EF-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}<br/><b>Date:</b> {datetime.now(timezone.utc).strftime('%B %d, %Y')}", subtitle_style),
        ],
        [
            Paragraph("Automated Clinical Summary of Recorded Historical Data — MongoDB Verified Log", subtitle_style),
            Paragraph(f"<b>Athlete:</b> {profile.get('name', 'Aditi Paul')} ({profile.get('email', 'N/A')})", subtitle_style),
        ],
    ]
    header_table = Table(header_data, colWidths=[5.0 * inch, 2.5 * inch])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_accent, spaceBefore=4, spaceAfter=8))

    # ------------------ SUMMARY CALLOUT BOX ------------------
    story.append(Paragraph("<b>1. RECORDED PERFORMANCE OVERVIEW & SUMMARY</b>", section_h1))
    def _clean_md(t: str) -> str:
        # Convert markdown bold to HTML bold
        t = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', t)
        t = re.sub(r'\*(.*?)\*', r'<i>\1</i>', t)
        return t

    summary_paragraphs = ai_summary.strip().split("\n\n") if ai_summary else []
    summary_content = []
    for p in summary_paragraphs:
        if p.strip():
            cleaned_text = _clean_md(p.strip().replace("\n", " "))
            summary_content.append(Paragraph(cleaned_text, callout_text))
            summary_content.append(Spacer(1, 4))

    summary_box_data = [
        [
            summary_content if summary_content else [Paragraph("All recorded profile inputs, logged foods, macronutrients, and exercise sessions are compiled below from verified database records.", callout_text)]
        ]
    ]
    summary_box_table = Table(summary_box_data, colWidths=[7.5 * inch])
    summary_box_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
        ("BOX", (0, 0), (-1, -1), 1.0, colors.HexColor("#86efac")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(summary_box_table)

    # ------------------ ATHLETE PROFILE & BIOMETRICS ------------------
    story.append(Paragraph("<b>2. ATHLETE PROFILE & RECORDED BIOMETRICS</b>", section_h1))

    # Helper to clean list/strings
    def _clean_field(v):
        if isinstance(v, list):
            return ", ".join(str(i) for i in v) if v else "Not set"
        return str(v) if v else "Not set"

    bio_data = [
        [
            Paragraph("<b>Full Name:</b>", table_cell_bold),
            Paragraph(profile.get("name") or "Aditi Paul", table_cell),
            Paragraph("<b>Age:</b>", table_cell_bold),
            Paragraph(f"{profile.get('age', 'N/A')} yrs", table_cell),
            Paragraph("<b>Gender:</b>", table_cell_bold),
            Paragraph(str(profile.get("gender") or "N/A").title(), table_cell),
        ],
        [
            Paragraph("<b>Height:</b>", table_cell_bold),
            Paragraph(f"{profile.get('height', 'N/A')} cm", table_cell),
            Paragraph("<b>Weight:</b>", table_cell_bold),
            Paragraph(f"{profile.get('weight', 'N/A')} kg", table_cell),
            Paragraph("<b>Calculated BMI:</b>", table_cell_bold),
            Paragraph(bmi_str, table_cell),
        ],
        [
            Paragraph("<b>Fitness Goal:</b>", table_cell_bold),
            Paragraph(_clean_field(profile.get("fitness_goal")), table_cell),
            Paragraph("<b>Activity Level:</b>", table_cell_bold),
            Paragraph(_clean_field(profile.get("activity_level")), table_cell),
            Paragraph("<b>Target Calories:</b>", table_cell_bold),
            Paragraph(f"{profile.get('target_calories', 2000)} kcal", table_cell),
        ],
        [
            Paragraph("<b>Dietary Preference:</b>", table_cell_bold),
            Paragraph(_clean_field(profile.get("dietary_preference")), table_cell),
            Paragraph("<b>Experience:</b>", table_cell_bold),
            Paragraph(_clean_field(profile.get("workout_experience")), table_cell),
            Paragraph("<b>Workout Time:</b>", table_cell_bold),
            Paragraph(_clean_field(profile.get("available_workout_time")), table_cell),
        ],
        [
            Paragraph("<b>Equipment:</b>", table_cell_bold),
            Paragraph(_clean_field(profile.get("equipment")), table_cell),
            Paragraph("<b>Workout Type:</b>", table_cell_bold),
            Paragraph(_clean_field(profile.get("preferred_workout_type")), table_cell),
            Paragraph("<b>Physical Limits:</b>", table_cell_bold),
            Paragraph(_clean_field(profile.get("fitness_limitations") or "None reported"), table_cell),
        ],
    ]
    bio_table = Table(bio_data, colWidths=[1.15 * inch, 1.35 * inch, 1.15 * inch, 1.35 * inch, 1.15 * inch, 1.35 * inch])
    bio_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), c_card_bg),
        ("GRID", (0, 0), (-1, -1), 0.5, c_border),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(bio_table)

    # ------------------ NUTRITION & MEAL INTAKE ------------------
    story.append(Paragraph("<b>3. RECORDED NUTRITION & CALORIE INTAKE</b>", section_h1))

    # Daily Nutrition Totals Table
    daily_nutr_rows = [
        [
            Paragraph("<b>Date</b>", table_head),
            Paragraph("<b>Logged Items</b>", table_head),
            Paragraph("<b>Total Calories</b>", table_head),
            Paragraph("<b>Protein (g)</b>", table_head),
            Paragraph("<b>Carbs (g)</b>", table_head),
            Paragraph("<b>Fat (g)</b>", table_head),
        ]
    ]

    for d_key, stats in sorted(daily_meals.items(), reverse=True):
        daily_nutr_rows.append([
            Paragraph(d_key, table_cell),
            Paragraph(str(stats["count"]), table_cell),
            Paragraph(f"{int(stats['cals']):,} kcal", table_cell_bold),
            Paragraph(f"{stats['p']:.1f} g", table_cell),
            Paragraph(f"{stats['c']:.1f} g", table_cell),
            Paragraph(f"{stats['f']:.1f} g", table_cell),
        ])

    if len(daily_nutr_rows) == 1:
        daily_nutr_rows.append([
            Paragraph("No recorded meals", table_cell),
            Paragraph("0", table_cell),
            Paragraph("0 kcal", table_cell),
            Paragraph("0 g", table_cell),
            Paragraph("0 g", table_cell),
            Paragraph("0 g", table_cell),
        ])
    else:
        # Totals row
        daily_nutr_rows.append([
            Paragraph("<b>RECORDED TOTALS</b>", table_cell_bold),
            Paragraph(f"<b>{len(meals)}</b>", table_cell_bold),
            Paragraph(f"<b>{total_cals:,} kcal</b>", table_cell_bold),
            Paragraph(f"<b>{total_protein:.1f} g</b>", table_cell_bold),
            Paragraph(f"<b>{total_carbs:.1f} g</b>", table_cell_bold),
            Paragraph(f"<b>{total_fat:.1f} g</b>", table_cell_bold),
        ])

    nutr_summary_table = Table(daily_nutr_rows, colWidths=[1.5 * inch, 1.1 * inch, 1.3 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch])
    nutr_summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), c_bg_head),
        ("GRID", (0, 0), (-1, -1), 0.5, c_border),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, c_card_bg]),
        ("BACKGROUND", (0, -1), (-1, -1), c_pill),
    ]))
    story.append(nutr_summary_table)

    # Detailed Logged Meals (up to 15 recent items)
    if meals:
        story.append(Spacer(1, 4))
        story.append(Paragraph("<b>Recent Logged Meals (Chronological Excerpt)</b>", ParagraphStyle(
            "SubH", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.5, textColor=c_primary, spaceBefore=4, spaceAfter=2
        )))
        meal_detail_rows = [
            [
                Paragraph("<b>Date / Time</b>", table_head),
                Paragraph("<b>Food / Meal Item</b>", table_head),
                Paragraph("<b>Calories</b>", table_head),
                Paragraph("<b>Protein</b>", table_head),
                Paragraph("<b>Carbs</b>", table_head),
                Paragraph("<b>Fat</b>", table_head),
            ]
        ]
        for m in meals[:15]:
            meal_detail_rows.append([
                Paragraph(format_date_str(m.get("logged_at") or m.get("date")), table_cell),
                Paragraph(str(m.get("name") or m.get("food_name") or "Logged Meal"), table_cell),
                Paragraph(f"{int(m.get('calories') or 0)} kcal", table_cell),
                Paragraph(f"{float(m.get('protein_g') or 0.0):.1f}g", table_cell),
                Paragraph(f"{float(m.get('carbs_g') or 0.0):.1f}g", table_cell),
                Paragraph(f"{float(m.get('fat_g') or 0.0):.1f}g", table_cell),
            ])
        meal_detail_table = Table(meal_detail_rows, colWidths=[1.5 * inch, 2.6 * inch, 1.0 * inch, 0.8 * inch, 0.8 * inch, 0.8 * inch])
        meal_detail_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), c_bg_head),
            ("GRID", (0, 0), (-1, -1), 0.5, c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_card_bg]),
        ]))
        story.append(meal_detail_table)

    # ------------------ COMPLETED EXERCISES & WORKOUTS ------------------
    story.append(Paragraph("<b>4. COMPLETED EXERCISES & RECORDED WORKOUTS</b>", section_h1))

    # Workouts Log Table
    workout_rows = [
        [
            Paragraph("<b>Date / Time</b>", table_head),
            Paragraph("<b>Exercise / Workout Title</b>", table_head),
            Paragraph("<b>Category</b>", table_head),
            Paragraph("<b>Duration</b>", table_head),
            Paragraph("<b>Calories Burned</b>", table_head),
            Paragraph("<b>Volume / Reps</b>", table_head),
        ]
    ]

    for w in workouts[:20]:
        reps_val = w.get("reps")
        reps_str = f"{reps_val} reps" if reps_val is not None else "-"
        workout_rows.append([
            Paragraph(format_date_str(w.get("logged_at") or w.get("date")), table_cell),
            Paragraph(str(w.get("title") or w.get("workout_title") or "Workout Session"), table_cell_bold),
            Paragraph(str(w.get("category") or "General"), table_cell),
            Paragraph(f"{int(w.get('duration_minutes') or 0)} min", table_cell),
            Paragraph(f"{int(w.get('calories') or w.get('calories_burned') or 0)} kcal", table_cell),
            Paragraph(reps_str, table_cell),
        ])

    if len(workout_rows) == 1:
        workout_rows.append([
            Paragraph("No recorded workouts", table_cell),
            Paragraph("-", table_cell),
            Paragraph("-", table_cell),
            Paragraph("0 min", table_cell),
            Paragraph("0 kcal", table_cell),
            Paragraph("-", table_cell),
        ])
    else:
        # Totals row
        workout_rows.append([
            Paragraph("<b>RECORDED TOTALS</b>", table_cell_bold),
            Paragraph(f"<b>{len(workouts)} Completed Sessions</b>", table_cell_bold),
            Paragraph("<b>-</b>", table_cell_bold),
            Paragraph(f"<b>{total_duration} min</b>", table_cell_bold),
            Paragraph(f"<b>{total_burn:,} kcal</b>", table_cell_bold),
            Paragraph("<b>-</b>", table_cell_bold),
        ])

    workout_table = Table(workout_rows, colWidths=[1.5 * inch, 2.2 * inch, 1.1 * inch, 0.9 * inch, 1.0 * inch, 0.8 * inch])
    workout_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), c_bg_head),
        ("GRID", (0, 0), (-1, -1), 0.5, c_border),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, c_card_bg]),
        ("BACKGROUND", (0, -1), (-1, -1), c_pill),
    ]))
    story.append(workout_table)

    # ------------------ STEP TRACKING (IF RECORDED) ------------------
    if steps:
        story.append(Paragraph("<b>5. RECORDED DAILY STEP LOGS</b>", section_h1))
        step_rows = [
            [
                Paragraph("<b>Date</b>", table_head),
                Paragraph("<b>Step Count</b>", table_head),
                Paragraph("<b>Estimated Walking Calories</b>", table_head),
            ]
        ]
        for s in steps[:10]:
            step_rows.append([
                Paragraph(str(s.get("date") or "Logged Day"), table_cell),
                Paragraph(f"{int(s.get('steps') or 0):,} steps", table_cell_bold),
                Paragraph(f"{int(s.get('calories') or 0)} kcal", table_cell),
            ])
        step_rows.append([
            Paragraph("<b>TOTALS</b>", table_cell_bold),
            Paragraph(f"<b>{total_steps:,} steps</b>", table_cell_bold),
            Paragraph(f"<b>{total_step_cals:,} kcal</b>", table_cell_bold),
        ])
        step_table = Table(step_rows, colWidths=[2.5 * inch, 2.5 * inch, 2.5 * inch])
        step_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), c_bg_head),
            ("GRID", (0, 0), (-1, -1), 0.5, c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, c_card_bg]),
            ("BACKGROUND", (0, -1), (-1, -1), c_pill),
        ]))
        story.append(step_table)

    # ------------------ DISCLAIMER & AUDIT INTEGRITY ------------------
    story.append(Spacer(1, 10))
    disclaimer_text = (
        "<b>DATA INTEGRITY & COMPLIANCE NOTICE:</b> This document is an automated clinical summary of user-recorded historical entries "
        "stored in the ElevateFit MongoDB database. In strict compliance with application guidelines, this report contains ONLY recorded facts, "
        "historical totals, and completed activities. It contains <b>no prescriptive medical recommendations, diagnosis, speculative targets, "
        "or unverified advice</b>. Always consult a certified healthcare professional or registered dietitian for medical evaluation."
    )
    disclaimer_table = Table([[Paragraph(disclaimer_text, ParagraphStyle('Disc', parent=styles['Normal'], fontName='Helvetica', fontSize=7, leading=9.5, textColor=colors.HexColor('#64748b')))]], colWidths=[7.5 * inch])
    disclaimer_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(disclaimer_table)

    # Build PDF with custom NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
