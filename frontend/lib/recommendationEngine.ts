import { AuthUser } from "./api";
import { WorkoutItem } from "@/components/WorkoutCard";

export function getRecommendedWorkouts(
  workouts: WorkoutItem[],
  user: AuthUser | null,
  completedIds: string[] = []
): (WorkoutItem & { recommendation_reason?: string; match_score?: number })[] {
  if (!workouts || workouts.length === 0) return [];

  const profile = {
    workout_experience: user?.workout_experience || "Beginner",
    fitness_goal: user?.fitness_goal || "Maintain fitness",
    activity_level: user?.activity_level || "Lightly active",
    age: user?.age,
    height: user?.height,
    weight: user?.weight,
  };

  const scored = workouts.map((workout) => {
    let score = 0;
    const reasons: string[] = [];

    const exp = profile.workout_experience.toLowerCase();
    const diff = (workout.difficulty || "Beginner").toLowerCase();

    // 1. Experience Level
    if (exp.includes("beginner")) {
      if (diff === "beginner") {
        score += 35;
        reasons.push("Beginner friendly");
      } else if (diff === "intermediate") {
        score -= 10;
      } else if (diff === "advanced" || diff === "elite") {
        score -= 100; // Strictly exclude Advanced/Elite for Beginners
      }
    } else if (exp.includes("intermediate")) {
      if (diff === "beginner" || diff === "intermediate") {
        score += 30;
        reasons.push("Matches your experience level");
      } else if (diff === "advanced") {
        score += 10;
      } else if (diff === "elite") {
        score -= 40;
      }
    } else if (exp.includes("advanced") || exp.includes("elite")) {
      if (diff === "intermediate" || diff === "advanced" || diff === "elite") {
        score += 35;
        reasons.push("Matches your experience level");
      } else {
        score += 10;
      }
    }

    // 2. Fitness Goal
    const goal = profile.fitness_goal.toLowerCase();
    const cat = (workout.category || "").toLowerCase();

    if (goal.includes("lose weight") || goal.includes("endurance")) {
      if (cat === "cardio" || cat === "hiit") {
        score += 30;
        reasons.push("Matches your fitness goal");
      } else if (cat === "strength") {
        score += 15;
      } else if (cat === "yoga" || cat === "stretching") {
        score += 10;
      }
    } else if (goal.includes("muscle")) {
      if (cat === "strength") {
        score += 35;
        reasons.push("Matches your fitness goal");
      } else if (cat === "hiit") {
        score += 15;
      } else {
        score += 5;
      }
    } else if (goal.includes("flexibility")) {
      if (cat === "yoga" || cat === "stretching") {
        score += 35;
        reasons.push("Prioritizes flexibility & mobility");
      } else {
        score += 10;
      }
    } else if (goal.includes("maintain")) {
      if (cat === "strength" || cat === "cardio" || cat === "yoga" || cat === "stretching") {
        score += 25;
        reasons.push("Balanced for fitness maintenance");
      } else if (cat === "hiit" && diff === "beginner") {
        score += 20;
        reasons.push("Suitable for active balance");
      }
    } else {
      score += 20;
      reasons.push("Complements your fitness goal");
    }

    // 3. Activity Level
    const act = profile.activity_level.toLowerCase();
    const durationMin = workout.duration_minutes || (parseInt(workout.duration || "30") || 30);

    if (act.includes("sedentary")) {
      if (cat === "yoga" || cat === "stretching" || (diff === "beginner" && durationMin <= 30)) {
        score += 25;
        reasons.push("Gentle pace for your activity level");
      } else if (cat === "hiit" || diff === "advanced" || diff === "elite") {
        score -= 30;
      }
    } else if (act.includes("lightly")) {
      if (diff === "beginner" || (diff === "intermediate" && durationMin <= 35)) {
        score += 20;
        reasons.push("Suitable for your activity level");
      } else if (diff === "advanced" || diff === "elite") {
        score -= 20;
      }
    } else if (act.includes("moderately")) {
      if (diff === "beginner" || diff === "intermediate") {
        score += 20;
        reasons.push("Matches your active schedule");
      }
    } else if (act.includes("very") || act.includes("extremely")) {
      if (diff === "intermediate" || diff === "advanced" || diff === "elite") {
        score += 20;
        reasons.push("Matches your high activity level");
      }
    }

    // 4. Age Safety Adjustment
    if (profile.age && typeof profile.age === "number" && profile.age >= 50) {
      if (cat === "yoga" || cat === "stretching" || (diff === "beginner" && cat !== "hiit")) {
        score += 20;
        reasons.push("Low impact & joint friendly");
      } else if (diff === "advanced" || diff === "elite" || cat === "hiit") {
        score -= 35;
      }
    }

    // 5. Height / Weight (BMI)
    if (profile.height && profile.weight && profile.height > 0 && profile.weight > 0) {
      const bmi = profile.weight / Math.pow(profile.height / 100, 2);
      if (bmi >= 30) {
        if ((cat === "yoga" || cat === "stretching" || cat === "cardio") && diff === "beginner") {
          score += 15;
          if (!reasons.some((r) => r.includes("Low impact"))) {
            reasons.push("Low impact option");
          }
        }
      }
    }

    // 6. Completed Workouts
    if (completedIds.includes(workout.id)) {
      score -= 25;
    }

    const uniqueReasons = Array.from(new Set(reasons));
    const reasonStr = uniqueReasons.length > 0 ? uniqueReasons.slice(0, 2).join(" • ") : "Recommended for you";

    return {
      ...workout,
      recommendation_reason: workout.recommendation_reason || reasonStr,
      match_score: score,
    };
  });

  // Filter out heavily penalized items (score <= -30) and sort descending
  const filtered = scored
    .filter((item) => (item.match_score || 0) > -30)
    .sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

  // Fallback to top workouts if filtered list is empty
  if (filtered.length === 0) {
    return workouts.slice(0, 6).map((w) => ({
      ...w,
      recommendation_reason: "Recommended for you",
    }));
  }

  return filtered.slice(0, 6);
}
