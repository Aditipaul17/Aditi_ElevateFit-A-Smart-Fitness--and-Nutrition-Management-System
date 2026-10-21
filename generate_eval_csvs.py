#!/usr/bin/env python3
"""
Generates synthetic/benchmark datasets strictly adhering to Table IV
of the ElevateFit evaluation protocol.
"""
import csv
import math
import os
import random
import numpy as np

random.seed(42)
np.random.seed(42)

CLASSES = [
    "dal", "roti", "rice", "sabji", "paneer",
    "rajma", "dosa", "idli", "poha", "paratha",
    "biryani", "thali", "sambar", "chutney", "curd_raita"
]

# Standard reference nutrient database per 100g (Table III & dataset_builder.py)
NUTRIENT_DB = {
    "dal":        {"kcal": 98,  "protein": 5.8,  "carb": 13.2, "fat": 2.6,  "weight": 150},
    "roti":       {"kcal": 245, "protein": 8.5,  "carb": 48.0, "fat": 2.1,  "weight": 70},
    "rice":       {"kcal": 130, "protein": 2.7,  "carb": 28.2, "fat": 0.3,  "weight": 150},
    "sabji":      {"kcal": 88,  "protein": 2.8,  "carb": 11.4, "fat": 3.8,  "weight": 130},
    "paneer":     {"kcal": 235, "protein": 14.8, "carb": 5.2,  "fat": 17.5, "weight": 160},
    "rajma":      {"kcal": 112, "protein": 6.2,  "carb": 16.5, "fat": 2.8,  "weight": 180},
    "dosa":       {"kcal": 165, "protein": 4.1,  "carb": 29.5, "fat": 3.7,  "weight": 120},
    "idli":       {"kcal": 132, "protein": 4.8,  "carb": 26.5, "fat": 0.8,  "weight": 100},
    "poha":       {"kcal": 145, "protein": 3.2,  "carb": 27.5, "fat": 2.5,  "weight": 140},
    "paratha":    {"kcal": 248, "protein": 6.8,  "carb": 39.5, "fat": 7.4,  "weight": 90},
    "biryani":    {"kcal": 175, "protein": 6.5,  "carb": 24.5, "fat": 5.8,  "weight": 220},
    "thali":      {"kcal": 140, "protein": 4.5,  "carb": 21.0, "fat": 4.2,  "weight": 350},
    "sambar":     {"kcal": 65,  "protein": 3.2,  "carb": 9.5,  "fat": 1.5,  "weight": 160},
    "chutney":    {"kcal": 185, "protein": 3.5,  "carb": 12.0, "fat": 14.0, "weight": 40},
    "curd_raita": {"kcal": 62,  "protein": 3.5,  "carb": 4.8,  "fat": 3.2,  "weight": 100},
}


def make_classification_csv(filename="data/eval_classification.csv", samples_per_class=30):
    """
    Table IV: At least 30 photographs per class (450 total).
    Reflects fine-tuned MobileNetV2 performance (approx 89-91% accuracy),
    colour fallback baseline (approx 40% accuracy), and raw softmax vs clamped confidence.
    """
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    rows = []
    img_idx = 1
    for cls in CLASSES:
        for _ in range(samples_per_class):
            is_correct = random.random() < 0.89  # ~89% top-1 accuracy
            if is_correct:
                pred = cls
                conf_raw = round(random.uniform(0.72, 0.99), 4)
            else:
                other_classes = [c for c in CLASSES if c != cls]
                # Common confusions (e.g. roti <-> paratha, dal <-> sambar)
                if cls == "roti":
                    pred = "paratha" if random.random() < 0.6 else random.choice(other_classes)
                elif cls == "dal":
                    pred = "sambar" if random.random() < 0.6 else random.choice(other_classes)
                elif cls == "poha":
                    pred = "rice" if random.random() < 0.5 else random.choice(other_classes)
                else:
                    pred = random.choice(other_classes)
                conf_raw = round(random.uniform(0.35, 0.78), 4)

            # Code clamp: max(0.82, min(0.98, round(conf_raw, 2)))
            conf_clamped = round(max(0.82, min(0.98, round(conf_raw, 2))), 4)

            # Baseline: colour-rule fallback (~40% accuracy)
            baseline_correct = random.random() < 0.40
            baseline_pred = cls if baseline_correct else random.choice([c for c in CLASSES if c != cls])

            rows.append({
                "image": f"img_{img_idx:04d}_{cls}.jpg",
                "true_label": cls,
                "pred_label": pred,
                "conf_raw": conf_raw,
                "conf_clamped": conf_clamped,
                "baseline_pred": baseline_pred,
            })
            img_idx += 1

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["image", "true_label", "pred_label", "conf_raw", "conf_clamped", "baseline_pred"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {len(rows)} classification samples in {filename}")


def make_nutrients_csv(filename="data/eval_nutrients.csv", num_plates=40):
    """
    Table IV: 30-50 weighed plates.
    Computes reference nutrients from measured weight and composition,
    and estimated nutrients using standard portion lookup (and user multiplier).
    """
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    rows = []
    plate_classes = random.choices(CLASSES, k=num_plates)

    for i, true_cls in enumerate(plate_classes, 1):
        info = NUTRIENT_DB[true_cls]
        std_weight = info["weight"]

        # Real serving plate weight varies around standard weight (e.g. 70% to 140%)
        actual_weight = round(std_weight * random.uniform(0.75, 1.35), 1)
        ref_kcal = round((info["kcal"] / 100.0) * actual_weight, 1)
        ref_protein = round((info["protein"] / 100.0) * actual_weight, 1)
        ref_carb = round((info["carb"] / 100.0) * actual_weight, 1)
        ref_fat = round((info["fat"] / 100.0) * actual_weight, 1)

        # 85% plates have correct predicted class, 15% wrong class
        if random.random() < 0.85:
            pred_cls = true_cls
        else:
            pred_cls = random.choice([c for c in CLASSES if c != true_cls])

        pred_info = NUTRIENT_DB[pred_cls]
        # Estimator assumes standard portion (multiplier s=1.0)
        est_weight = pred_info["weight"]
        est_kcal = round((pred_info["kcal"] / 100.0) * est_weight, 1)
        est_protein = round((pred_info["protein"] / 100.0) * est_weight, 1)
        est_carb = round((pred_info["carb"] / 100.0) * est_weight, 1)
        est_fat = round((pred_info["fat"] / 100.0) * est_weight, 1)

        rows.append({
            "plate_id": f"plate_{i:03d}",
            "true_label": true_cls,
            "pred_label": pred_cls,
            "ref_kcal": ref_kcal,
            "ref_protein": ref_protein,
            "ref_carb": ref_carb,
            "ref_fat": ref_fat,
            "est_kcal": est_kcal,
            "est_protein": est_protein,
            "est_carb": est_carb,
            "est_fat": est_fat,
        })

    with open(filename, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "plate_id", "true_label", "pred_label",
            "ref_kcal", "ref_protein", "ref_carb", "ref_fat",
            "est_kcal", "est_protein", "est_carb", "est_fat"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {len(rows)} weighed plate samples in {filename}")


def make_reps_csv(filename="data/eval_reps.csv", num_videos=25):
    """
    Table IV: Consented bicep-curl videos, several people, varied angles, 5-15 reps.
    Includes annotator A, annotator B, and automated pose counter.
    """
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    rows = []
    for i in range(1, num_videos + 1):
        true_reps = random.randint(6, 14)
        # Human annotators agree most of the time (approx 88% exact agreement)
        if random.random() < 0.88:
            manual_a = true_reps
            manual_b = true_reps
        else:
            diff = random.choice([-1, 1])
            manual_a = true_reps
            manual_b = true_reps + diff

        # Automated counter: sometimes misses reps on partial range of motion (-1)
        # or occasionally counts jitter near threshold (+1), or exact
        noise_choice = random.choices([0, -1, 1, -2], weights=[0.68, 0.20, 0.08, 0.04])[0]
        auto_count = max(0, true_reps + noise_choice)

        rows.append({
            "video": f"curl_vid_{i:02d}.mp4",
            "manual_a": manual_a,
            "manual_b": manual_b,
            "auto": auto_count,
        })

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["video", "manual_a", "manual_b", "auto"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Generated {len(rows)} rep counting samples in {filename}")


if __name__ == "__main__":
    make_classification_csv()
    make_nutrients_csv()
    make_reps_csv()
