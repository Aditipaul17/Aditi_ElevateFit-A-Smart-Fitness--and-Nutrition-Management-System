#!/usr/bin/env python3
"""
Evaluation harness for the ElevateFit paper (Table IV protocol).
Needs only numpy. It computes metrics from CSV files YOU produce from real runs;
it contains no data and reports nothing by itself.

Usage
  python evaluate_elevatefit.py classify  preds.csv   [--bins 10] [--out results/]
  python evaluate_elevatefit.py nutrients plates.csv  [--out results/]
  python evaluate_elevatefit.py reps      reps.csv    [--out results/]

CSV columns
  classify : image,true_label,pred_label,conf_raw[,conf_clamped][,baseline_pred]
             conf_raw = max softmax BEFORE the 0.82-0.98 clamp;
             baseline_pred = colour-rule classifier's label on the same image.
  nutrients: plate_id,true_label,pred_label,
             ref_kcal,ref_protein,ref_carb,ref_fat,
             est_kcal,est_protein,est_carb,est_fat
             (ref_* from weighed plate + cited recipe data; est_* from the pipeline)
  reps     : video,manual_a,manual_b,auto
             manual_a / manual_b = two annotators' counts; auto = counter's output.
"""
import argparse, csv, math, os
import numpy as np


# ---------- helpers ----------
def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def wilson(k, n, z=1.96):
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (c - h, c + h)


def exact_binom_two_sided(b, c):
    """Exact McNemar: discordant pairs b (A right, B wrong) and c (A wrong, B right)."""
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    tail = sum(math.comb(n, i) for i in range(0, k + 1)) / 2 ** n
    return min(1.0, 2 * tail)


def save(out, name, header, rows):
    if not out:
        return
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def ece(conf, correct, bins=10):
    conf, correct = np.asarray(conf, float), np.asarray(correct, float)
    edges = np.linspace(0.0, 1.0, bins + 1)
    n, total, rows = len(conf), 0.0, []
    for i in range(bins):
        lo, hi = edges[i], edges[i + 1]
        m = (conf > lo) & (conf <= hi) if i else (conf >= lo) & (conf <= hi)
        if m.sum() == 0:
            rows.append((lo, hi, 0, "", ""))
            continue
        acc, cf = correct[m].mean(), conf[m].mean()
        total += m.sum() / n * abs(acc - cf)
        rows.append((lo, hi, int(m.sum()), acc, cf))
    return total, rows


# ---------- classify ----------
def run_classify(path, bins, out):
    d = read_csv(path)
    y = [r["true_label"] for r in d]
    p = [r["pred_label"] for r in d]
    n = len(y)
    k = sum(a == b for a, b in zip(y, p))
    lo, hi = wilson(k, n)
    print(f"N = {n}")
    print(f"Top-1 accuracy = {k/n:.4f}  (95% Wilson CI {lo:.4f} to {hi:.4f})")

    labels = sorted(set(y) | set(p))
    idx = {l: i for i, l in enumerate(labels)}
    cm = np.zeros((len(labels), len(labels)), int)
    for a, b in zip(y, p):
        cm[idx[a], idx[b]] += 1
    f1s = []
    per_class = []
    for l in labels:
        i = idx[l]
        tp = cm[i, i]
        prec = tp / cm[:, i].sum() if cm[:, i].sum() else 0.0
        rec = tp / cm[i, :].sum() if cm[i, :].sum() else 0.0
        f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
        f1s.append(f1)
        per_class.append((l, int(cm[i, :].sum()), prec, rec, f1))
    print(f"Macro-F1 = {np.mean(f1s):.4f}")
    save(out, "confusion_matrix.csv", ["true\\pred"] + labels,
         [[l] + cm[idx[l]].tolist() for l in labels])
    save(out, "per_class.csv", ["class", "support", "precision", "recall", "f1"], per_class)

    if "baseline_pred" in d[0] and d[0]["baseline_pred"] != "":
        bp = [r["baseline_pred"] for r in d]
        kb = sum(a == b for a, b in zip(y, bp))
        lb, hb = wilson(kb, n)
        print(f"Baseline accuracy = {kb/n:.4f}  (95% CI {lb:.4f} to {hb:.4f})")
        b_ = sum(a == m and a != c for a, m, c in zip(y, p, bp))  # model right, baseline wrong
        c_ = sum(a != m and a == c for a, m, c in zip(y, p, bp))  # model wrong, baseline right
        print(f"Paired: model-only correct = {b_}, baseline-only correct = {c_}, "
              f"exact McNemar p = {exact_binom_two_sided(b_, c_):.4g}")

    correct = [a == b for a, b in zip(y, p)]
    for col, label in (("conf_raw", "raw softmax"), ("conf_clamped", "clamped")):
        if col in d[0] and d[0][col] != "":
            conf = [float(r[col]) for r in d]
            e, rows = ece(conf, correct, bins)
            print(f"ECE ({label}, {bins} bins) = {e:.4f}; mean confidence = {np.mean(conf):.4f}")
            save(out, f"reliability_{col}.csv",
                 ["bin_lo", "bin_hi", "count", "accuracy", "mean_conf"], rows)


# ---------- nutrients ----------
def run_nutrients(path, out):
    d = read_csv(path)
    keys = [("kcal", "kcal"), ("protein", "g"), ("carb", "g"), ("fat", "g")]
    groups = {
        "all": d,
        "class correct": [r for r in d if r["true_label"] == r["pred_label"]],
        "class wrong": [r for r in d if r["true_label"] != r["pred_label"]],
    }
    rows_out = []
    for gname, g in groups.items():
        if not g:
            continue
        print(f"\n[{gname}]  N = {len(g)}")
        for k, unit in keys:
            ref = np.array([float(r[f"ref_{k}"]) for r in g])
            est = np.array([float(r[f"est_{k}"]) for r in g])
            ae = np.abs(est - ref)
            mask = ref > 0
            mape = 100 * np.mean(ae[mask] / ref[mask]) if mask.any() else float("nan")
            bias = np.mean(est - ref)
            print(f"  {k:8s} MAE = {ae.mean():.2f} {unit}   MAPE = {mape:.1f}%   mean signed error = {bias:+.2f}")
            rows_out.append((gname, k, len(g), ae.mean(), mape, bias))
    save(out, "nutrient_errors.csv", ["group", "nutrient", "n", "mae", "mape_pct", "bias"], rows_out)


# ---------- reps ----------
def run_reps(path, out):
    d = read_csv(path)
    a = np.array([float(r["manual_a"]) for r in d])
    b = np.array([float(r["manual_b"]) for r in d])
    auto = np.array([float(r["auto"]) for r in d])
    print(f"Videos = {len(d)}")
    print(f"Annotators agree exactly on {np.mean(a == b)*100:.1f}% of videos "
          f"(mean abs difference {np.mean(np.abs(a-b)):.2f})")
    agreed = np.array([(x if x == y else np.nan) for x, y in zip(a, b)])
    ref = np.where(np.isnan(agreed), np.round((a + b) / 2), agreed)  # disagreements: mean, rounded; report separately
    ae = np.abs(auto - ref)
    mask = ref > 0
    print(f"Counter vs manual: MAE = {ae.mean():.2f} reps; "
          f"MAPE = {100*np.mean(ae[mask]/ref[mask]):.1f}%; "
          f"exact match = {np.mean(auto == ref)*100:.1f}%; within +/-1 = {np.mean(ae <= 1)*100:.1f}%")
    print(f"Mean signed error = {np.mean(auto - ref):+.2f} (negative = under-counting)")
    save(out, "rep_errors.csv", ["video", "manual_a", "manual_b", "reference", "auto", "abs_error"],
         [(r["video"], int(x), int(y), int(z), int(w), float(e))
          for r, x, y, z, w, e in zip(d, a, b, ref, auto, ae)])


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("classify"); c.add_argument("csv"); c.add_argument("--bins", type=int, default=10); c.add_argument("--out")
    n = sub.add_parser("nutrients"); n.add_argument("csv"); n.add_argument("--out")
    r = sub.add_parser("reps"); r.add_argument("csv"); r.add_argument("--out")
    a = ap.parse_args()
    if a.cmd == "classify":
        run_classify(a.csv, a.bins, a.out)
    elif a.cmd == "nutrients":
        run_nutrients(a.csv, a.out)
    else:
        run_reps(a.csv, a.out)
