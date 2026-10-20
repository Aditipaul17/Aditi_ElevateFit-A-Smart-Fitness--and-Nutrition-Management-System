"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Gauge, ChevronLeft, ChevronRight, Target, Sparkles } from "lucide-react";
import type { Exercise } from "./workoutData";

// ─── Color Palette (matching ElevateFit Theme) ─────────────────────────────
const THEME = {
  primary: "#2D6A4F",
  secondary: "#40916C",
  accent: "#D4A373",
  accentLight: "#E9D8A6",
  jointActive: "#D4A373",
  jointPassive: "#2D6A4F",
  bone: "#40916C",
  boneDark: "#1B4332",
  equipment: "#64748B",
  equipmentLight: "#94A3B8",
  equipmentDark: "#334155",
  weightPlate: "#0F172A",
  floor: "#94A3B8",
  bench: "#1E293B",
  cable: "#0284C7",
  grid: "rgba(45,106,79,0.06)",
};

interface JointCoord {
  x: number;
  y: number;
}

export interface AnimationKeyframe {
  // Key body landmarks (mapped to 260x300 viewBox)
  head: JointCoord;
  neck: JointCoord;
  shoulderL: JointCoord;
  shoulderR: JointCoord;
  elbowL: JointCoord;
  elbowR: JointCoord;
  wristL: JointCoord;
  wristR: JointCoord;
  hipL: JointCoord;
  hipR: JointCoord;
  kneeL: JointCoord;
  kneeR: JointCoord;
  ankleL: JointCoord;
  ankleR: JointCoord;
  // Dynamic equipment / barbell / weights positions
  equipmentProps?: {
    barbell?: { x: number; y: number; width?: number; angle?: number };
    dumbbellL?: { x: number; y: number; angle?: number };
    dumbbellR?: { x: number; y: number; angle?: number };
    cablePulley?: { x: number; y: number };
    cableAttachment?: { x: number; y: number };
    sled?: { x: number; y: number };
  };
  phaseLabel: string;
  referenceAngle: number;
}

// Linear interpolation between values
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpCoord(p1: JointCoord, p2: JointCoord, t: number): JointCoord {
  return { x: lerp(p1.x, p2.x, t), y: lerp(p1.y, p2.y, t) };
}

function lerpKeyframe(k1: AnimationKeyframe, k2: AnimationKeyframe, t: number): AnimationKeyframe {
  // Guard: if either keyframe is missing, return whichever exists (or an empty shell)
  if (!k1 && !k2) {
    // Should never happen in practice, but prevents a crash from uninitialized registry entries
    throw new Error("lerpKeyframe: both keyframes are undefined");
  }
  if (!k1) return k2;
  if (!k2) return k1;

  const result: any = {};
  const coordKeys: (keyof AnimationKeyframe)[] = [
    "head", "neck", "shoulderL", "shoulderR",
    "elbowL", "elbowR", "wristL", "wristR",
    "hipL", "hipR", "kneeL", "kneeR", "ankleL", "ankleR"
  ];

  for (const k of coordKeys) {
    const start = k1[k] as JointCoord | undefined;
    const end = k2[k] as JointCoord | undefined;

    if (start && end) {
      result[k] = lerpCoord(start, end, t);
    } else if (start) {
      result[k] = start;
    } else if (end) {
      result[k] = end;
    }
    // If both are missing, the key is simply omitted — AnimatedCharacter uses fallbacks below
  }

  // Equipment interpolation — only when both frames carry equipmentProps
  if (k1.equipmentProps && k2.equipmentProps) {
    result.equipmentProps = {};
    if (k1.equipmentProps.barbell && k2.equipmentProps.barbell) {
      result.equipmentProps.barbell = {
        x: lerp(k1.equipmentProps.barbell.x, k2.equipmentProps.barbell.x, t),
        y: lerp(k1.equipmentProps.barbell.y, k2.equipmentProps.barbell.y, t),
        width: k1.equipmentProps.barbell.width ?? 120,
        angle: lerp(k1.equipmentProps.barbell.angle ?? 0, k2.equipmentProps.barbell.angle ?? 0, t),
      };
    }
    if (k1.equipmentProps.dumbbellL && k2.equipmentProps.dumbbellL) {
      result.equipmentProps.dumbbellL = {
        x: lerp(k1.equipmentProps.dumbbellL.x, k2.equipmentProps.dumbbellL.x, t),
        y: lerp(k1.equipmentProps.dumbbellL.y, k2.equipmentProps.dumbbellL.y, t),
        angle: lerp(k1.equipmentProps.dumbbellL.angle ?? 0, k2.equipmentProps.dumbbellL.angle ?? 0, t),
      };
    }
    if (k1.equipmentProps.dumbbellR && k2.equipmentProps.dumbbellR) {
      result.equipmentProps.dumbbellR = {
        x: lerp(k1.equipmentProps.dumbbellR.x, k2.equipmentProps.dumbbellR.x, t),
        y: lerp(k1.equipmentProps.dumbbellR.y, k2.equipmentProps.dumbbellR.y, t),
        angle: lerp(k1.equipmentProps.dumbbellR.angle ?? 0, k2.equipmentProps.dumbbellR.angle ?? 0, t),
      };
    }
    if (k1.equipmentProps.cableAttachment && k2.equipmentProps.cableAttachment) {
      result.equipmentProps.cableAttachment = {
        x: lerp(k1.equipmentProps.cableAttachment.x, k2.equipmentProps.cableAttachment.x, t),
        y: lerp(k1.equipmentProps.cableAttachment.y, k2.equipmentProps.cableAttachment.y, t),
      };
    }
    if (k1.equipmentProps.sled && k2.equipmentProps.sled) {
      result.equipmentProps.sled = {
        x: lerp(k1.equipmentProps.sled.x, k2.equipmentProps.sled.x, t),
        y: lerp(k1.equipmentProps.sled.y, k2.equipmentProps.sled.y, t),
      };
    }
  } else if (k1.equipmentProps) {
    // Only k1 has equipment — hold the k1 position (no interpolation possible)
    result.equipmentProps = k1.equipmentProps;
  } else if (k2.equipmentProps) {
    // Only k2 has equipment — hold the k2 position
    result.equipmentProps = k2.equipmentProps;
  }

  result.phaseLabel = t < 0.5 ? k1.phaseLabel : k2.phaseLabel;
  result.referenceAngle = Math.round(lerp(k1.referenceAngle, k2.referenceAngle, t));
  return result as AnimationKeyframe;
}

// ─────────────────────────────────────────────────────────────────────────────
// 22 DISTINCT BIOMECHANICAL ANIMATION DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

type ExerciseAnimDef = {
  viewType: "standing_front" | "standing_side" | "lying_side" | "incline_side" | "plank_side" | "seated_row" | "bench_kneel" | "machine_seated" | "prone_side";
  durationSec: number;
  highlightJoint: string; // Joint name to highlight with angle arc
  keyframes: AnimationKeyframe[];
  sceneryType: "bench" | "incline_bench" | "cable_high" | "cable_mid" | "floor" | "step" | "leg_press_machine" | "extension_machine" | "curl_bench" | "none";
};

// --- Helper Pose Generators ---

// 1. BENCH PRESS (Lying flat on bench, bar lowers to chest and presses up)
const BENCH_PRESS_TOP: AnimationKeyframe = {
  head: { x: 75, y: 170 },
  neck: { x: 92, y: 172 },
  shoulderL: { x: 105, y: 174 },
  shoulderR: { x: 105, y: 174 },
  elbowL: { x: 105, y: 120 },
  elbowR: { x: 105, y: 120 },
  wristL: { x: 105, y: 68 },
  wristR: { x: 105, y: 68 },
  hipL: { x: 155, y: 178 },
  hipR: { x: 155, y: 178 },
  kneeL: { x: 195, y: 195 },
  kneeR: { x: 195, y: 195 },
  ankleL: { x: 200, y: 250 },
  ankleR: { x: 200, y: 250 },
  equipmentProps: {
    barbell: { x: 105, y: 68, width: 130 },
  },
  phaseLabel: "Lockout",
  referenceAngle: 165,
};

const BENCH_PRESS_BOTTOM: AnimationKeyframe = {
  ...BENCH_PRESS_TOP,
  elbowL: { x: 88, y: 185 },
  elbowR: { x: 88, y: 185 },
  wristL: { x: 105, y: 155 },
  wristR: { x: 105, y: 155 },
  equipmentProps: {
    barbell: { x: 105, y: 155, width: 130 },
  },
  phaseLabel: "Chest Touch",
  referenceAngle: 88,
};

// 2. INCLINE PRESS (30–45° incline bench, dumbbells pressing up)
const INCLINE_PRESS_TOP: AnimationKeyframe = {
  head: { x: 85, y: 120 },
  neck: { x: 98, y: 132 },
  shoulderL: { x: 110, y: 145 },
  shoulderR: { x: 110, y: 145 },
  elbowL: { x: 125, y: 95 },
  elbowR: { x: 125, y: 95 },
  wristL: { x: 135, y: 55 },
  wristR: { x: 135, y: 55 },
  hipL: { x: 145, y: 205 },
  hipR: { x: 145, y: 205 },
  kneeL: { x: 185, y: 215 },
  kneeR: { x: 185, y: 215 },
  ankleL: { x: 195, y: 260 },
  ankleR: { x: 195, y: 260 },
  equipmentProps: {
    dumbbellR: { x: 135, y: 55, angle: 10 },
  },
  phaseLabel: "Overhead Lockout",
  referenceAngle: 158,
};

const INCLINE_PRESS_BOTTOM: AnimationKeyframe = {
  ...INCLINE_PRESS_TOP,
  elbowL: { x: 98, y: 165 },
  elbowR: { x: 98, y: 165 },
  wristL: { x: 115, y: 138 },
  wristR: { x: 115, y: 138 },
  equipmentProps: {
    dumbbellR: { x: 115, y: 138, angle: 10 },
  },
  phaseLabel: "Upper Chest Depth",
  referenceAngle: 92,
};

// 3. SHOULDER PRESS (Front view, dumbbells from shoulders to overhead)
const SHOULDER_PRESS_DOWN: AnimationKeyframe = {
  head: { x: 130, y: 60 },
  neck: { x: 130, y: 80 },
  shoulderL: { x: 100, y: 95 },
  shoulderR: { x: 160, y: 95 },
  elbowL: { x: 75, y: 125 },
  elbowR: { x: 185, y: 125 },
  wristL: { x: 80, y: 90 },
  wristR: { x: 180, y: 90 },
  hipL: { x: 110, y: 160 },
  hipR: { x: 150, y: 160 },
  kneeL: { x: 108, y: 215 },
  kneeR: { x: 152, y: 215 },
  ankleL: { x: 106, y: 265 },
  ankleR: { x: 154, y: 265 },
  equipmentProps: {
    dumbbellL: { x: 80, y: 90 },
    dumbbellR: { x: 180, y: 90 },
  },
  phaseLabel: "Shoulder Level",
  referenceAngle: 88,
};

const SHOULDER_PRESS_UP: AnimationKeyframe = {
  ...SHOULDER_PRESS_DOWN,
  elbowL: { x: 92, y: 65 },
  elbowR: { x: 168, y: 65 },
  wristL: { x: 102, y: 28 },
  wristR: { x: 158, y: 28 },
  equipmentProps: {
    dumbbellL: { x: 102, y: 28 },
    dumbbellR: { x: 158, y: 28 },
  },
  phaseLabel: "Overhead Press",
  referenceAngle: 162,
};

// 4. LATERAL RAISES (Front view, arms lifting out to parallel)
const LATERAL_DOWN: AnimationKeyframe = {
  head: { x: 130, y: 60 },
  neck: { x: 130, y: 80 },
  shoulderL: { x: 102, y: 96 },
  shoulderR: { x: 158, y: 96 },
  elbowL: { x: 95, y: 135 },
  elbowR: { x: 165, y: 135 },
  wristL: { x: 92, y: 172 },
  wristR: { x: 168, y: 172 },
  hipL: { x: 112, y: 165 },
  hipR: { x: 148, y: 165 },
  kneeL: { x: 110, y: 215 },
  kneeR: { x: 150, y: 215 },
  ankleL: { x: 108, y: 265 },
  ankleR: { x: 152, y: 265 },
  equipmentProps: {
    dumbbellL: { x: 92, y: 172 },
    dumbbellR: { x: 168, y: 172 },
  },
  phaseLabel: "Start at Sides",
  referenceAngle: 18,
};

const LATERAL_UP: AnimationKeyframe = {
  ...LATERAL_DOWN,
  elbowL: { x: 55, y: 98 },
  elbowR: { x: 205, y: 98 },
  wristL: { x: 28, y: 102 },
  wristR: { x: 232, y: 102 },
  equipmentProps: {
    dumbbellL: { x: 28, y: 102 },
    dumbbellR: { x: 232, y: 102 },
  },
  phaseLabel: "Parallel Raise",
  referenceAngle: 88,
};

// 5. TRICEP PUSHDOWN (Side view, cable station)
const PUSHDOWN_TOP: AnimationKeyframe = {
  head: { x: 120, y: 60 },
  neck: { x: 122, y: 80 },
  shoulderL: { x: 124, y: 96 },
  shoulderR: { x: 124, y: 96 },
  elbowL: { x: 130, y: 132 },
  elbowR: { x: 130, y: 132 },
  wristL: { x: 160, y: 120 },
  wristR: { x: 160, y: 120 },
  hipL: { x: 105, y: 165 },
  hipR: { x: 105, y: 165 },
  kneeL: { x: 108, y: 215 },
  kneeR: { x: 108, y: 215 },
  ankleL: { x: 106, y: 265 },
  ankleR: { x: 106, y: 265 },
  equipmentProps: {
    cablePulley: { x: 175, y: 30 },
    cableAttachment: { x: 160, y: 120 },
  },
  phaseLabel: "90° Starting Flexion",
  referenceAngle: 85,
};

const PUSHDOWN_BOTTOM: AnimationKeyframe = {
  ...PUSHDOWN_TOP,
  wristL: { x: 135, y: 180 },
  wristR: { x: 135, y: 180 },
  equipmentProps: {
    cablePulley: { x: 175, y: 30 },
    cableAttachment: { x: 135, y: 180 },
  },
  phaseLabel: "Triceps Lockout",
  referenceAngle: 162,
};

// 6. OVERHEAD TRICEPS EXTENSION (Front view)
const OVERHEAD_TRICEP_DOWN: AnimationKeyframe = {
  ...SHOULDER_PRESS_DOWN,
  elbowL: { x: 110, y: 55 },
  elbowR: { x: 150, y: 55 },
  wristL: { x: 125, y: 95 },
  wristR: { x: 135, y: 95 },
  equipmentProps: {
    dumbbellR: { x: 130, y: 100 },
  },
  phaseLabel: "Deep Stretch Behind Neck",
  referenceAngle: 78,
};

const OVERHEAD_TRICEP_UP: AnimationKeyframe = {
  ...SHOULDER_PRESS_DOWN,
  elbowL: { x: 115, y: 48 },
  elbowR: { x: 145, y: 48 },
  wristL: { x: 128, y: 15 },
  wristR: { x: 132, y: 15 },
  equipmentProps: {
    dumbbellR: { x: 130, y: 12 },
  },
  phaseLabel: "Overhead Extension",
  referenceAngle: 160,
};

// 7. PUSH-UP (Plank side view)
const PUSHUP_TOP: AnimationKeyframe = {
  head: { x: 60, y: 175 },
  neck: { x: 75, y: 180 },
  shoulderL: { x: 90, y: 185 },
  shoulderR: { x: 90, y: 185 },
  elbowL: { x: 90, y: 220 },
  elbowR: { x: 90, y: 220 },
  wristL: { x: 90, y: 255 },
  wristR: { x: 90, y: 255 },
  hipL: { x: 155, y: 200 },
  hipR: { x: 155, y: 200 },
  kneeL: { x: 195, y: 215 },
  kneeR: { x: 195, y: 215 },
  ankleL: { x: 235, y: 235 },
  ankleR: { x: 235, y: 235 },
  phaseLabel: "Straight Plank",
  referenceAngle: 165,
};

const PUSHUP_BOTTOM: AnimationKeyframe = {
  ...PUSHUP_TOP,
  head: { x: 60, y: 225 },
  neck: { x: 75, y: 230 },
  shoulderL: { x: 90, y: 235 },
  shoulderR: { x: 90, y: 235 },
  elbowL: { x: 70, y: 225 },
  elbowR: { x: 70, y: 225 },
  hipL: { x: 155, y: 240 },
  hipR: { x: 155, y: 240 },
  kneeL: { x: 195, y: 245 },
  kneeR: { x: 195, y: 245 },
  phaseLabel: "Chest to Floor",
  referenceAngle: 85,
};

// 8. LAT PULLDOWN (Front view, wide grip bar)
const LATPULL_EXTENDED: AnimationKeyframe = {
  head: { x: 130, y: 90 },
  neck: { x: 130, y: 108 },
  shoulderL: { x: 105, y: 120 },
  shoulderR: { x: 155, y: 120 },
  elbowL: { x: 75, y: 75 },
  elbowR: { x: 185, y: 75 },
  wristL: { x: 50, y: 35 },
  wristR: { x: 210, y: 35 },
  hipL: { x: 115, y: 180 },
  hipR: { x: 145, y: 180 },
  kneeL: { x: 110, y: 225 },
  kneeR: { x: 150, y: 225 },
  ankleL: { x: 108, y: 265 },
  ankleR: { x: 152, y: 265 },
  equipmentProps: {
    barbell: { x: 130, y: 35, width: 180 },
    cablePulley: { x: 130, y: 10 },
  },
  phaseLabel: "Full Overhead Stretch",
  referenceAngle: 160,
};

const LATPULL_PULLED: AnimationKeyframe = {
  ...LATPULL_EXTENDED,
  elbowL: { x: 92, y: 145 },
  elbowR: { x: 168, y: 145 },
  wristL: { x: 75, y: 115 },
  wristR: { x: 185, y: 115 },
  equipmentProps: {
    barbell: { x: 130, y: 115, width: 180 },
    cablePulley: { x: 130, y: 10 },
  },
  phaseLabel: "Pull to Clavicle",
  referenceAngle: 58,
};

// 9. SEATED CABLE ROW (Side view)
const CABLE_ROW_REACH: AnimationKeyframe = {
  head: { x: 115, y: 90 },
  neck: { x: 118, y: 108 },
  shoulderL: { x: 122, y: 122 },
  shoulderR: { x: 122, y: 122 },
  elbowL: { x: 155, y: 130 },
  elbowR: { x: 155, y: 130 },
  wristL: { x: 195, y: 135 },
  wristR: { x: 195, y: 135 },
  hipL: { x: 105, y: 185 },
  hipR: { x: 105, y: 185 },
  kneeL: { x: 155, y: 180 },
  kneeR: { x: 155, y: 180 },
  ankleL: { x: 200, y: 195 },
  ankleR: { x: 200, y: 195 },
  equipmentProps: {
    cableAttachment: { x: 195, y: 135 },
  },
  phaseLabel: "Forward Stretch",
  referenceAngle: 155,
};

const CABLE_ROW_PULL: AnimationKeyframe = {
  ...CABLE_ROW_REACH,
  elbowL: { x: 85, y: 135 },
  elbowR: { x: 85, y: 135 },
  wristL: { x: 125, y: 140 },
  wristR: { x: 125, y: 140 },
  equipmentProps: {
    cableAttachment: { x: 125, y: 140 },
  },
  phaseLabel: "Squeeze Shoulder Blades",
  referenceAngle: 62,
};

// 10. DUMBBELL ROW (One knee & hand on bench)
const DB_ROW_DOWN: AnimationKeyframe = {
  head: { x: 75, y: 135 },
  neck: { x: 92, y: 140 },
  shoulderL: { x: 110, y: 148 },
  shoulderR: { x: 110, y: 148 },
  elbowL: { x: 115, y: 185 },
  elbowR: { x: 115, y: 185 },
  wristL: { x: 115, y: 228 },
  wristR: { x: 115, y: 228 },
  hipL: { x: 175, y: 155 },
  hipR: { x: 175, y: 155 },
  kneeL: { x: 135, y: 195 }, // knee on bench
  kneeR: { x: 195, y: 215 }, // leg on floor
  ankleL: { x: 105, y: 195 },
  ankleR: { x: 210, y: 265 },
  equipmentProps: {
    dumbbellR: { x: 115, y: 228, angle: 90 },
  },
  phaseLabel: "Full Lat Stretch",
  referenceAngle: 155,
};

const DB_ROW_UP: AnimationKeyframe = {
  ...DB_ROW_DOWN,
  elbowR: { x: 145, y: 118 },
  wristR: { x: 135, y: 152 },
  equipmentProps: {
    dumbbellR: { x: 135, y: 152, angle: 90 },
  },
  phaseLabel: "Row to Hip",
  referenceAngle: 60,
};

// 11. BICEP CURL (Front view, standing)
const BICEP_CURL_DOWN: AnimationKeyframe = {
  head: { x: 130, y: 60 },
  neck: { x: 130, y: 80 },
  shoulderL: { x: 102, y: 96 },
  shoulderR: { x: 158, y: 96 },
  elbowL: { x: 98, y: 142 },
  elbowR: { x: 162, y: 142 },
  wristL: { x: 96, y: 185 },
  wristR: { x: 164, y: 185 },
  hipL: { x: 112, y: 165 },
  hipR: { x: 148, y: 165 },
  kneeL: { x: 110, y: 215 },
  kneeR: { x: 150, y: 215 },
  ankleL: { x: 108, y: 265 },
  ankleR: { x: 152, y: 265 },
  equipmentProps: {
    dumbbellL: { x: 96, y: 185 },
    dumbbellR: { x: 164, y: 185 },
  },
  phaseLabel: "Full Arm Extension",
  referenceAngle: 162,
};

const BICEP_CURL_UP: AnimationKeyframe = {
  ...BICEP_CURL_DOWN,
  wristL: { x: 102, y: 105 },
  wristR: { x: 158, y: 105 },
  equipmentProps: {
    dumbbellL: { x: 102, y: 105 },
    dumbbellR: { x: 158, y: 105 },
  },
  phaseLabel: "Peak Biceps Contraction",
  referenceAngle: 45,
};

// 12. HAMMER CURL (Neutral grip, front view)
const HAMMER_CURL_DOWN: AnimationKeyframe = {
  ...BICEP_CURL_DOWN,
  equipmentProps: {
    dumbbellL: { x: 96, y: 185, angle: 90 },
    dumbbellR: { x: 164, y: 185, angle: 90 },
  },
  phaseLabel: "Neutral Grip Lowered",
  referenceAngle: 165,
};

const HAMMER_CURL_UP: AnimationKeyframe = {
  ...BICEP_CURL_DOWN,
  wristL: { x: 105, y: 110 },
  wristR: { x: 155, y: 110 },
  equipmentProps: {
    dumbbellL: { x: 105, y: 110, angle: 90 },
    dumbbellR: { x: 155, y: 110, angle: 90 },
  },
  phaseLabel: "Thumbs Up Squeeze",
  referenceAngle: 48,
};

// 13. FACE PULL (Rope attachment, front view)
const FACEPULL_EXT: AnimationKeyframe = {
  head: { x: 130, y: 65 },
  neck: { x: 130, y: 85 },
  shoulderL: { x: 102, y: 100 },
  shoulderR: { x: 158, y: 100 },
  elbowL: { x: 95, y: 115 },
  elbowR: { x: 165, y: 115 },
  wristL: { x: 118, y: 105 },
  wristR: { x: 142, y: 105 },
  hipL: { x: 112, y: 168 },
  hipR: { x: 148, y: 168 },
  kneeL: { x: 110, y: 218 },
  kneeR: { x: 150, y: 218 },
  ankleL: { x: 108, y: 265 },
  ankleR: { x: 152, y: 265 },
  equipmentProps: {
    cableAttachment: { x: 130, y: 105 },
  },
  phaseLabel: "Rope Extended Forward",
  referenceAngle: 150,
};

const FACEPULL_PULL: AnimationKeyframe = {
  ...FACEPULL_EXT,
  elbowL: { x: 65, y: 78 },
  elbowR: { x: 195, y: 78 },
  wristL: { x: 95, y: 68 },
  wristR: { x: 165, y: 68 },
  equipmentProps: {
    cableAttachment: { x: 130, y: 68 },
  },
  phaseLabel: "Hands Beside Ears",
  referenceAngle: 72,
};

// 14. REAR DELT FLY (Bent over 50°, side view)
const REAR_DELT_DOWN: AnimationKeyframe = {
  head: { x: 105, y: 120 },
  neck: { x: 115, y: 132 },
  shoulderL: { x: 125, y: 145 },
  shoulderR: { x: 125, y: 145 },
  elbowL: { x: 128, y: 185 },
  elbowR: { x: 128, y: 185 },
  wristL: { x: 130, y: 220 },
  wristR: { x: 130, y: 220 },
  hipL: { x: 175, y: 165 },
  hipR: { x: 175, y: 165 },
  kneeL: { x: 170, y: 215 },
  kneeR: { x: 170, y: 215 },
  ankleL: { x: 165, y: 265 },
  ankleR: { x: 165, y: 265 },
  equipmentProps: {
    dumbbellR: { x: 130, y: 220, angle: 90 },
  },
  phaseLabel: "Dumbbells Hanging Under Chest",
  referenceAngle: 25,
};

const REAR_DELT_UP: AnimationKeyframe = {
  ...REAR_DELT_DOWN,
  elbowR: { x: 145, y: 135 },
  wristR: { x: 175, y: 130 },
  equipmentProps: {
    dumbbellR: { x: 175, y: 130, angle: 90 },
  },
  phaseLabel: "Reverse Fly Squeeze",
  referenceAngle: 82,
};

// 15. SQUAT (Side view, barbell on traps)
const SQUAT_STAND: AnimationKeyframe = {
  head: { x: 130, y: 55 },
  neck: { x: 130, y: 75 },
  shoulderL: { x: 130, y: 88 },
  shoulderR: { x: 130, y: 88 },
  elbowL: { x: 118, y: 110 },
  elbowR: { x: 118, y: 110 },
  wristL: { x: 126, y: 88 },
  wristR: { x: 126, y: 88 },
  hipL: { x: 130, y: 155 },
  hipR: { x: 130, y: 155 },
  kneeL: { x: 130, y: 210 },
  kneeR: { x: 130, y: 210 },
  ankleL: { x: 130, y: 265 },
  ankleR: { x: 130, y: 265 },
  equipmentProps: {
    barbell: { x: 130, y: 88, width: 120 },
  },
  phaseLabel: "Standing Lockout",
  referenceAngle: 170,
};

const SQUAT_BOTTOM: AnimationKeyframe = {
  ...SQUAT_STAND,
  head: { x: 115, y: 125 },
  neck: { x: 118, y: 142 },
  shoulderL: { x: 122, y: 152 },
  shoulderR: { x: 122, y: 152 },
  wristL: { x: 120, y: 152 },
  wristR: { x: 120, y: 152 },
  hipL: { x: 85, y: 218 },
  hipR: { x: 85, y: 218 },
  kneeL: { x: 155, y: 218 },
  kneeR: { x: 155, y: 218 },
  ankleL: { x: 130, y: 265 },
  ankleR: { x: 130, y: 265 },
  equipmentProps: {
    barbell: { x: 122, y: 152, width: 120 },
  },
  phaseLabel: "Parallel Depth (Thighs Level)",
  referenceAngle: 95,
};

// 16. LEG PRESS (Seated reclined in machine)
const LEG_PRESS_EXTENDED: AnimationKeyframe = {
  head: { x: 65, y: 160 },
  neck: { x: 80, y: 170 },
  shoulderL: { x: 95, y: 180 },
  shoulderR: { x: 95, y: 180 },
  elbowL: { x: 105, y: 205 },
  elbowR: { x: 105, y: 205 },
  wristL: { x: 115, y: 220 },
  wristR: { x: 115, y: 220 },
  hipL: { x: 125, y: 225 },
  hipR: { x: 125, y: 225 },
  kneeL: { x: 165, y: 175 },
  kneeR: { x: 165, y: 175 },
  ankleL: { x: 210, y: 125 },
  ankleR: { x: 210, y: 125 },
  equipmentProps: {
    sled: { x: 210, y: 125 },
  },
  phaseLabel: "Sled Pressed to Soft Lockout",
  referenceAngle: 155,
};

const LEG_PRESS_BOTTOM: AnimationKeyframe = {
  ...LEG_PRESS_EXTENDED,
  kneeL: { x: 145, y: 195 },
  kneeR: { x: 145, y: 195 },
  ankleL: { x: 175, y: 160 },
  ankleR: { x: 175, y: 160 },
  equipmentProps: {
    sled: { x: 175, y: 160 },
  },
  phaseLabel: "90° Sled Descent",
  referenceAngle: 90,
};

// 17. ROMANIAN DEADLIFT (RDL - Hip hinge, side view)
const RDL_TOP: AnimationKeyframe = {
  ...SQUAT_STAND,
  elbowL: { x: 130, y: 135 },
  elbowR: { x: 130, y: 135 },
  wristL: { x: 130, y: 170 },
  wristR: { x: 130, y: 170 },
  equipmentProps: {
    barbell: { x: 130, y: 170, width: 120 },
  },
  phaseLabel: "Standing Tall at Lockout",
  referenceAngle: 172,
};

const RDL_BOTTOM: AnimationKeyframe = {
  ...RDL_TOP,
  head: { x: 165, y: 115 },
  neck: { x: 155, y: 125 },
  shoulderL: { x: 145, y: 135 },
  shoulderR: { x: 145, y: 135 },
  elbowL: { x: 145, y: 175 },
  elbowR: { x: 145, y: 175 },
  wristL: { x: 145, y: 225 },
  wristR: { x: 145, y: 225 },
  hipL: { x: 75, y: 165 },
  hipR: { x: 75, y: 165 },
  kneeL: { x: 110, y: 218 },
  kneeR: { x: 110, y: 218 },
  ankleL: { x: 130, y: 265 },
  ankleR: { x: 130, y: 265 },
  equipmentProps: {
    barbell: { x: 145, y: 225, width: 120 },
  },
  phaseLabel: "Hips Pushed Back (Deep Hamstring Stretch)",
  referenceAngle: 112,
};

// 18. LUNGES (Split stance, side view)
const LUNGE_STAND: AnimationKeyframe = { ...SQUAT_STAND, phaseLabel: "Upright Stance", referenceAngle: 170 };

const LUNGE_BOTTOM: AnimationKeyframe = {
  ...SQUAT_STAND,
  head: { x: 130, y: 95 },
  neck: { x: 130, y: 115 },
  shoulderL: { x: 130, y: 128 },
  shoulderR: { x: 130, y: 128 },
  hipL: { x: 130, y: 185 },
  hipR: { x: 130, y: 185 },
  kneeL: { x: 175, y: 215 }, // front knee 90°
  kneeR: { x: 80, y: 245 },  // back knee hovering
  ankleL: { x: 175, y: 265 },
  ankleR: { x: 50, y: 265 },
  phaseLabel: "Front Knee at 90°",
  referenceAngle: 92,
};

// 19. LEG EXTENSION (Machine seated)
const LEG_EXT_BENT: AnimationKeyframe = {
  head: { x: 105, y: 80 },
  neck: { x: 108, y: 100 },
  shoulderL: { x: 112, y: 115 },
  shoulderR: { x: 112, y: 115 },
  elbowL: { x: 118, y: 155 },
  elbowR: { x: 118, y: 155 },
  wristL: { x: 125, y: 185 },
  wristR: { x: 125, y: 185 },
  hipL: { x: 120, y: 190 },
  hipR: { x: 120, y: 190 },
  kneeL: { x: 165, y: 190 },
  kneeR: { x: 165, y: 190 },
  ankleL: { x: 165, y: 255 },
  ankleR: { x: 165, y: 255 },
  phaseLabel: "90° Seated Start",
  referenceAngle: 90,
};

const LEG_EXT_STRAIGHT: AnimationKeyframe = {
  ...LEG_EXT_BENT,
  ankleL: { x: 230, y: 195 },
  ankleR: { x: 230, y: 195 },
  phaseLabel: "Full Knee Extension",
  referenceAngle: 160,
};

// 20. LEG CURL (Lying prone face-down on bench)
const LEG_CURL_STRAIGHT: AnimationKeyframe = {
  head: { x: 60, y: 190 },
  neck: { x: 80, y: 195 },
  shoulderL: { x: 100, y: 200 },
  shoulderR: { x: 100, y: 200 },
  elbowL: { x: 105, y: 220 },
  elbowR: { x: 105, y: 220 },
  wristL: { x: 115, y: 225 },
  wristR: { x: 115, y: 225 },
  hipL: { x: 165, y: 205 },
  hipR: { x: 165, y: 205 },
  kneeL: { x: 195, y: 205 },
  kneeR: { x: 195, y: 205 },
  ankleL: { x: 245, y: 205 },
  ankleR: { x: 245, y: 205 },
  phaseLabel: "Legs Straight on Bench",
  referenceAngle: 168,
};

const LEG_CURL_BENT: AnimationKeyframe = {
  ...LEG_CURL_STRAIGHT,
  ankleL: { x: 185, y: 150 },
  ankleR: { x: 185, y: 150 },
  phaseLabel: "Hamstrings Curled to Glutes",
  referenceAngle: 60,
};

// 21. CALF RAISE (Side view on step)
const CALF_DOWN: AnimationKeyframe = {
  ...SQUAT_STAND,
  ankleL: { x: 130, y: 258 },
  ankleR: { x: 130, y: 258 },
  phaseLabel: "Deep Heel Drop",
  referenceAngle: 75,
};

const CALF_UP: AnimationKeyframe = {
  ...SQUAT_STAND,
  head: { x: 130, y: 40 },
  neck: { x: 130, y: 60 },
  shoulderL: { x: 130, y: 73 },
  shoulderR: { x: 130, y: 73 },
  hipL: { x: 130, y: 140 },
  hipR: { x: 130, y: 140 },
  kneeL: { x: 130, y: 195 },
  kneeR: { x: 130, y: 195 },
  ankleL: { x: 130, y: 245 },
  ankleR: { x: 130, y: 245 },
  phaseLabel: "Tiptoe Peak Contraction",
  referenceAngle: 125,
};

// 22. GLUTE BRIDGE (Lying supine, feet on floor)
const BRIDGE_DOWN: AnimationKeyframe = {
  head: { x: 60, y: 235 },
  neck: { x: 78, y: 235 },
  shoulderL: { x: 95, y: 235 },
  shoulderR: { x: 95, y: 235 },
  elbowL: { x: 110, y: 245 },
  elbowR: { x: 110, y: 245 },
  wristL: { x: 125, y: 250 },
  wristR: { x: 125, y: 250 },
  hipL: { x: 145, y: 245 },
  hipR: { x: 145, y: 245 },
  kneeL: { x: 185, y: 195 },
  kneeR: { x: 185, y: 195 },
  ankleL: { x: 215, y: 250 },
  ankleR: { x: 215, y: 250 },
  phaseLabel: "Hips Rested on Floor",
  referenceAngle: 115,
};

const BRIDGE_UP: AnimationKeyframe = {
  ...BRIDGE_DOWN,
  hipL: { x: 145, y: 190 },
  hipR: { x: 145, y: 190 },
  phaseLabel: "Straight Bridge & Glute Lockout",
  referenceAngle: 168,
};

// ── Master Animation Library ──────────────────────────────────────────────
export const ANIMATION_REGISTRY: Record<string, ExerciseAnimDef> = {
  bench_press: {
    viewType: "lying_side",
    durationSec: 2.6,
    highlightJoint: "elbowR",
    keyframes: [BENCH_PRESS_TOP, BENCH_PRESS_BOTTOM, BENCH_PRESS_TOP],
    sceneryType: "bench",
  },
  incline_press: {
    viewType: "incline_side",
    durationSec: 2.6,
    highlightJoint: "elbowR",
    keyframes: [INCLINE_PRESS_TOP, INCLINE_PRESS_BOTTOM, INCLINE_PRESS_TOP],
    sceneryType: "incline_bench",
  },
  shoulder_press: {
    viewType: "standing_front",
    durationSec: 2.4,
    highlightJoint: "elbowR",
    keyframes: [SHOULDER_PRESS_DOWN, SHOULDER_PRESS_UP, SHOULDER_PRESS_DOWN],
    sceneryType: "none",
  },
  lateral_raise: {
    viewType: "standing_front",
    durationSec: 2.2,
    highlightJoint: "shoulderR",
    keyframes: [LATERAL_DOWN, LATERAL_UP, LATERAL_DOWN],
    sceneryType: "none",
  },
  tricep_pushdown: {
    viewType: "standing_side",
    durationSec: 2.0,
    highlightJoint: "elbowR",
    keyframes: [PUSHDOWN_TOP, PUSHDOWN_BOTTOM, PUSHDOWN_TOP],
    sceneryType: "cable_high",
  },
  overhead_tricep: {
    viewType: "standing_front",
    durationSec: 2.2,
    highlightJoint: "elbowR",
    keyframes: [OVERHEAD_TRICEP_DOWN, OVERHEAD_TRICEP_UP, OVERHEAD_TRICEP_DOWN],
    sceneryType: "none",
  },
  push_up: {
    viewType: "plank_side",
    durationSec: 2.3,
    highlightJoint: "elbowR",
    keyframes: [PUSHUP_TOP, PUSHUP_BOTTOM, PUSHUP_TOP],
    sceneryType: "floor",
  },
  lat_pulldown: {
    viewType: "standing_front",
    durationSec: 2.7,
    highlightJoint: "shoulderR",
    keyframes: [LATPULL_EXTENDED, LATPULL_PULLED, LATPULL_EXTENDED],
    sceneryType: "cable_high",
  },
  cable_row: {
    viewType: "seated_row",
    durationSec: 2.4,
    highlightJoint: "elbowR",
    keyframes: [CABLE_ROW_REACH, CABLE_ROW_PULL, CABLE_ROW_REACH],
    sceneryType: "cable_mid",
  },
  dumbbell_row: {
    viewType: "bench_kneel",
    durationSec: 2.3,
    highlightJoint: "elbowR",
    keyframes: [DB_ROW_DOWN, DB_ROW_UP, DB_ROW_DOWN],
    sceneryType: "bench",
  },
  bicep_curl: {
    viewType: "standing_front",
    durationSec: 2.2,
    highlightJoint: "elbowR",
    keyframes: [BICEP_CURL_DOWN, BICEP_CURL_UP, BICEP_CURL_DOWN],
    sceneryType: "none",
  },
  hammer_curl: {
    viewType: "standing_front",
    durationSec: 2.2,
    highlightJoint: "elbowR",
    keyframes: [HAMMER_CURL_DOWN, HAMMER_CURL_UP, HAMMER_CURL_DOWN],
    sceneryType: "none",
  },
  face_pull: {
    viewType: "standing_front",
    durationSec: 2.2,
    highlightJoint: "shoulderR",
    keyframes: [FACEPULL_EXT, FACEPULL_PULL, FACEPULL_EXT],
    sceneryType: "cable_mid",
  },
  rear_delt: {
    viewType: "standing_side",
    durationSec: 2.3,
    highlightJoint: "shoulderR",
    keyframes: [REAR_DELT_DOWN, REAR_DELT_UP, REAR_DELT_DOWN],
    sceneryType: "none",
  },
  squat: {
    viewType: "standing_side",
    durationSec: 2.6,
    highlightJoint: "kneeR",
    keyframes: [SQUAT_STAND, SQUAT_BOTTOM, SQUAT_STAND],
    sceneryType: "floor",
  },
  leg_press: {
    viewType: "machine_seated",
    durationSec: 2.6,
    highlightJoint: "kneeR",
    keyframes: [LEG_PRESS_EXTENDED, LEG_PRESS_BOTTOM, LEG_PRESS_EXTENDED],
    sceneryType: "leg_press_machine",
  },
  rdl: {
    viewType: "standing_side",
    durationSec: 2.7,
    highlightJoint: "hipR",
    keyframes: [RDL_TOP, RDL_BOTTOM, RDL_TOP],
    sceneryType: "floor",
  },
  lunge: {
    viewType: "standing_side",
    durationSec: 2.4,
    highlightJoint: "kneeL",
    keyframes: [LUNGE_STAND, LUNGE_BOTTOM, LUNGE_STAND],
    sceneryType: "floor",
  },
  leg_extension: {
    viewType: "machine_seated",
    durationSec: 2.2,
    highlightJoint: "kneeR",
    keyframes: [LEG_EXT_BENT, LEG_EXT_STRAIGHT, LEG_EXT_BENT],
    sceneryType: "extension_machine",
  },
  leg_curl: {
    viewType: "prone_side",
    durationSec: 2.2,
    highlightJoint: "kneeR",
    keyframes: [LEG_CURL_STRAIGHT, LEG_CURL_BENT, LEG_CURL_STRAIGHT],
    sceneryType: "curl_bench",
  },
  calf_raise: {
    viewType: "standing_side",
    durationSec: 2.0,
    highlightJoint: "ankleR",
    keyframes: [CALF_DOWN, CALF_UP, CALF_DOWN],
    sceneryType: "step",
  },
  glute_bridge: {
    viewType: "lying_side",
    durationSec: 2.4,
    highlightJoint: "hipR",
    keyframes: [BRIDGE_DOWN, BRIDGE_UP, BRIDGE_DOWN],
    sceneryType: "floor",
  },
};

// ── SVG Character Renderer ──────────────────────────────────────────────────
function AnimatedCharacter({
  pose,
  animDef,
  highlightJointName,
}: {
  pose: AnimationKeyframe;
  animDef: ExerciseAnimDef;
  highlightJointName: string;
}) {
  // Fallback coords for any joint that might be missing after interpolation (safety net)
  const FALLBACK: JointCoord = { x: 130, y: 150 };

  const h      = pose.head      ?? FALLBACK;
  const n      = pose.neck      ?? FALLBACK;
  const sL     = pose.shoulderL ?? FALLBACK;
  const sR     = pose.shoulderR ?? FALLBACK;
  const eL     = pose.elbowL    ?? FALLBACK;
  const eR     = pose.elbowR    ?? FALLBACK;
  const wL     = pose.wristL    ?? FALLBACK;
  const wR     = pose.wristR    ?? FALLBACK;
  const hipL   = pose.hipL      ?? FALLBACK;
  const hipR   = pose.hipR      ?? FALLBACK;
  const kL     = pose.kneeL     ?? FALLBACK;
  const kR     = pose.kneeR     ?? FALLBACK;
  const aL     = pose.ankleL    ?? FALLBACK;
  const aR     = pose.ankleR    ?? FALLBACK;

  // Active highlighted joint position
  const targetPos = (pose as any)[highlightJointName] ?? eR;

  return (
    <g>
      {/* ── Scenery / Equipment ── */}
      {/* Floor line */}
      <line x1="10" y1="268" x2="250" y2="268" stroke={THEME.floor} strokeWidth="1.5" strokeDasharray="4 4" />

      {/* Flat workout bench */}
      {(animDef.sceneryType === "bench" || animDef.viewType === "lying_side" && animDef.sceneryType !== "floor") && (
        <g opacity={0.85}>
          <rect x="55" y="180" width="135" height="12" rx="4" fill={THEME.bench} stroke="#475569" strokeWidth="1" />
          <line x1="75" y1="192" x2="75" y2="268" stroke={THEME.bench} strokeWidth="5" />
          <line x1="165" y1="192" x2="165" y2="268" stroke={THEME.bench} strokeWidth="5" />
          {/* Barbell rack uprights for bench press */}
          {animDef.keyframes[0] === BENCH_PRESS_TOP && (
            <line x1="95" y1="100" x2="95" y2="268" stroke="#334155" strokeWidth="4" />
          )}
        </g>
      )}

      {/* Incline bench */}
      {animDef.sceneryType === "incline_bench" && (
        <g opacity={0.85}>
          <line x1="75" y1="110" x2="155" y2="215" stroke={THEME.bench} strokeWidth="10" strokeLinecap="round" />
          <rect x="140" y="210" width="40" height="8" rx="2" fill={THEME.bench} />
          <line x1="150" y1="218" x2="150" y2="268" stroke={THEME.bench} strokeWidth="5" />
        </g>
      )}

      {/* Cable machine tower */}
      {animDef.sceneryType === "cable_high" && (
        <g opacity={0.75}>
          <line x1="180" y1="15" x2="180" y2="268" stroke="#334155" strokeWidth="4" />
          <circle cx="175" cy="30" r="8" fill="#475569" stroke="#64748B" strokeWidth="1.5" />
          {/* Cable wire */}
          {pose.equipmentProps?.cableAttachment && (
            <line
              x1="175"
              y1="30"
              x2={pose.equipmentProps.cableAttachment.x}
              y2={pose.equipmentProps.cableAttachment.y}
              stroke={THEME.cable}
              strokeWidth="2"
            />
          )}
        </g>
      )}

      {/* Seated cable row pulley */}
      {animDef.sceneryType === "cable_mid" && (
        <g opacity={0.75}>
          <rect x="220" y="110" width="10" height="90" fill="#334155" />
          <circle cx="215" cy="135" r="7" fill="#475569" />
          {pose.equipmentProps?.cableAttachment && (
            <line
              x1="215"
              y1="135"
              x2={pose.equipmentProps.cableAttachment.x}
              y2={pose.equipmentProps.cableAttachment.y}
              stroke={THEME.cable}
              strokeWidth="2"
            />
          )}
        </g>
      )}

      {/* Leg press sled machine */}
      {animDef.sceneryType === "leg_press_machine" && (
        <g opacity={0.8}>
          <line x1="80" y1="250" x2="230" y2="100" stroke="#334155" strokeWidth="6" />
          {/* Sled platform */}
          {pose.equipmentProps?.sled && (
            <g transform={`translate(${pose.equipmentProps.sled.x}, ${pose.equipmentProps.sled.y}) rotate(-45)`}>
              <rect x="-15" y="-30" width="30" height="60" rx="3" fill="#D4A373" stroke="#B45309" strokeWidth="1.5" />
              <rect x="-8" y="-40" width="16" height="80" rx="2" fill="#0F172A" />
            </g>
          )}
        </g>
      )}

      {/* Step platform for calf raises */}
      {animDef.sceneryType === "step" && (
        <rect x="110" y="258" width="80" height="12" rx="2" fill="#475569" />
      )}

      {/* ── Anatomical Character ── */}
      {/* Torso polygon */}
      <path
        d={`M ${sL.x} ${sL.y} L ${sR.x} ${sR.y} L ${hipR.x} ${hipR.y} L ${hipL.x} ${hipL.y} Z`}
        fill="url(#torsoGradient)"
        stroke={THEME.boneDark}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Spine / neck */}
      <line x1={n.x} y1={n.y} x2={(hipL.x + hipR.x) / 2} y2={(hipL.y + hipR.y) / 2} stroke={THEME.boneDark} strokeWidth="3" />
      <line x1={n.x} y1={n.y} x2={h.x} y2={h.y} stroke={THEME.bone} strokeWidth="4" />

      {/* Limbs (Left Side) */}
      <line x1={sL.x} y1={sL.y} x2={eL.x} y2={eL.y} stroke={THEME.bone} strokeWidth="4.5" strokeLinecap="round" />
      <line x1={eL.x} y1={eL.y} x2={wL.x} y2={wL.y} stroke={THEME.bone} strokeWidth="4" strokeLinecap="round" />
      <line x1={hipL.x} y1={hipL.y} x2={kL.x} y2={kL.y} stroke={THEME.bone} strokeWidth="5.5" strokeLinecap="round" />
      <line x1={kL.x} y1={kL.y} x2={aL.x} y2={aL.y} stroke={THEME.bone} strokeWidth="4.5" strokeLinecap="round" />

      {/* Limbs (Right Side) */}
      <line x1={sR.x} y1={sR.y} x2={eR.x} y2={eR.y} stroke={THEME.secondary} strokeWidth="5" strokeLinecap="round" />
      <line x1={eR.x} y1={eR.y} x2={wR.x} y2={wR.y} stroke={THEME.secondary} strokeWidth="4" strokeLinecap="round" />
      <line x1={hipR.x} y1={hipR.y} x2={kR.x} y2={kR.y} stroke={THEME.secondary} strokeWidth="6" strokeLinecap="round" />
      <line x1={kR.x} y1={kR.y} x2={aR.x} y2={aR.y} stroke={THEME.secondary} strokeWidth="5" strokeLinecap="round" />

      {/* Head */}
      <circle cx={h.x} cy={h.y} r="13" fill="#1B4332" stroke="white" strokeWidth="2" />
      {/* Directional visor / eye indicator */}
      <circle cx={h.x + (animDef.viewType.includes("side") ? 5 : 0)} cy={h.y - 1} r="3" fill="#D4A373" />

      {/* Joints (Circles) */}
      {[
        { id: "sL", x: sL.x, y: sL.y },
        { id: "sR", x: sR.x, y: sR.y },
        { id: "eL", x: eL.x, y: eL.y },
        { id: "eR", x: eR.x, y: eR.y },
        { id: "wL", x: wL.x, y: wL.y },
        { id: "wR", x: wR.x, y: wR.y },
        { id: "hipL", x: hipL.x, y: hipL.y },
        { id: "hipR", x: hipR.x, y: hipR.y },
        { id: "kneeL", x: kL.x, y: kL.y },
        { id: "kneeR", x: kR.x, y: kR.y },
        { id: "ankleL", x: aL.x, y: aL.y },
        { id: "ankleR", x: aR.x, y: aR.y },
      ].map((jt) => {
        const isTarget = jt.id.toLowerCase() === highlightJointName.toLowerCase();
        return (
          <circle
            key={jt.id}
            cx={jt.x}
            cy={jt.y}
            r={isTarget ? 6.5 : 4}
            fill={isTarget ? THEME.jointActive : THEME.jointPassive}
            stroke="white"
            strokeWidth={1.5}
          />
        );
      })}

      {/* ── Active Angle Arc Visualizer ── */}
      <g>
        <circle
          cx={targetPos.x}
          cy={targetPos.y}
          r="16"
          fill="none"
          stroke={THEME.accent}
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity={0.8}
        />
        <rect
          x={targetPos.x + 10}
          y={targetPos.y - 16}
          width="42"
          height="18"
          rx="5"
          fill="#0F172A"
          stroke={THEME.accent}
          strokeWidth="1"
        />
        <text
          x={targetPos.x + 31}
          y={targetPos.y - 4}
          textAnchor="middle"
          fill={THEME.accentLight}
          fontSize="10"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {pose.referenceAngle}°
        </text>
      </g>

      {/* ── Equipment Render (Barbell / Dumbbells) ── */}
      {pose.equipmentProps?.barbell && (
        <g>
          {/* Bar */}
          <line
            x1={pose.equipmentProps.barbell.x - (pose.equipmentProps.barbell.width ?? 120) / 2}
            y1={pose.equipmentProps.barbell.y}
            x2={pose.equipmentProps.barbell.x + (pose.equipmentProps.barbell.width ?? 120) / 2}
            y2={pose.equipmentProps.barbell.y}
            stroke={THEME.equipment}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Weight plates */}
          <rect
            x={pose.equipmentProps.barbell.x - (pose.equipmentProps.barbell.width ?? 120) / 2}
            y={pose.equipmentProps.barbell.y - 16}
            width="6"
            height="32"
            rx="2"
            fill={THEME.weightPlate}
            stroke={THEME.accent}
            strokeWidth="1"
          />
          <rect
            x={pose.equipmentProps.barbell.x + (pose.equipmentProps.barbell.width ?? 120) / 2 - 6}
            y={pose.equipmentProps.barbell.y - 16}
            width="6"
            height="32"
            rx="2"
            fill={THEME.weightPlate}
            stroke={THEME.accent}
            strokeWidth="1"
          />
        </g>
      )}

      {/* Dumbbell R */}
      {pose.equipmentProps?.dumbbellR && (
        <g transform={`translate(${pose.equipmentProps.dumbbellR.x}, ${pose.equipmentProps.dumbbellR.y}) rotate(${pose.equipmentProps.dumbbellR.angle ?? 0})`}>
          <line x1="-12" y1="0" x2="12" y2="0" stroke={THEME.equipmentLight} strokeWidth="3" />
          <rect x="-15" y="-8" width="4" height="16" rx="2" fill={THEME.weightPlate} stroke={THEME.accent} strokeWidth="0.8" />
          <rect x="11" y="-8" width="4" height="16" rx="2" fill={THEME.weightPlate} stroke={THEME.accent} strokeWidth="0.8" />
        </g>
      )}

      {/* Dumbbell L */}
      {pose.equipmentProps?.dumbbellL && (
        <g transform={`translate(${pose.equipmentProps.dumbbellL.x}, ${pose.equipmentProps.dumbbellL.y}) rotate(${pose.equipmentProps.dumbbellL.angle ?? 0})`}>
          <line x1="-12" y1="0" x2="12" y2="0" stroke={THEME.equipmentLight} strokeWidth="3" />
          <rect x="-15" y="-8" width="4" height="16" rx="2" fill={THEME.weightPlate} stroke={THEME.accent} strokeWidth="0.8" />
          <rect x="11" y="-8" width="4" height="16" rx="2" fill={THEME.weightPlate} stroke={THEME.accent} strokeWidth="0.8" />
        </g>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ExerciseAnimationPanel COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface ExerciseAnimationPanelProps {
  exercise: Exercise;
  userMovementPhase?: "bottom" | "top";
}

export function ExerciseAnimationPanel({
  exercise,
  userMovementPhase,
}: ExerciseAnimationPanelProps) {
  const animDef = useMemo(() => {
    return ANIMATION_REGISTRY[exercise.animationType] ?? ANIMATION_REGISTRY["squat"];
  }, [exercise.animationType]);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 0.5 | 1.5>(1);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [instructionIdx, setInstructionIdx] = useState(0);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const cycleDurationMs = (animDef.durationSec / speedMultiplier) * 1000;

  // Animation cycle loop
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    // Initialize startRef so the loop continues from now (not from a stale progress value)
    if (startRef.current === null) {
      startRef.current = performance.now();
    }

    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      const t = (elapsed % cycleDurationMs) / cycleDurationMs;
      setProgress(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // NOTE: `progress` is intentionally NOT in this dep array.
  // Adding it would re-fire this effect on every frame, resetting startRef each tick
  // and causing the loop to restart from ~0, which is the root cause of the undefined-frame crash.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, speedMultiplier, cycleDurationMs]);

  // Compute interpolated frame
  // Guard: require at least 2 keyframes to interpolate; fall back to first frame otherwise
  const kf = animDef.keyframes;
  let currentPose: AnimationKeyframe;
  if (kf.length === 0) {
    // Registry entry exists but has no frames — this should never happen with valid data
    currentPose = ANIMATION_REGISTRY["squat"].keyframes[0];
  } else if (kf.length === 1) {
    // Single-frame definition — hold static pose
    currentPose = kf[0];
  } else {
    const segCount = kf.length - 1;            // number of interpolation segments
    const segProgress = progress * segCount;
    // Clamp segIdx to valid range [0, segCount-1] to prevent out-of-bounds on progress = 1.0
    const segIdx = Math.min(Math.floor(segProgress), segCount - 1);
    // Clamp segT to [0, 1] so the last segment doesn't overshoot
    const segT = Math.min(segProgress - segIdx, 1);
    currentPose = lerpKeyframe(kf[segIdx], kf[segIdx + 1], segT);
  }

  const replay = () => {
    startRef.current = null; // will be re-initialized in the effect on next run
    setProgress(0);
    setIsPlaying(true);
  };

  const toggleSpeed = () => {
    if (speedMultiplier === 1) setSpeedMultiplier(0.5); // Slow Motion
    else if (speedMultiplier === 0.5) setSpeedMultiplier(1.5); // Fast
    else setSpeedMultiplier(1); // Normal
  };

  // Movement comparison logic
  const isReferenceBottom = progress > 0.4 && progress < 0.6;
  const isInSync = userMovementPhase
    ? (isReferenceBottom && userMovementPhase === "bottom") || (!isReferenceBottom && userMovementPhase === "top")
    : null;

  return (
    <div className="flex flex-col h-full select-none">
      {/* ── Top Header / Badges ── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 flex items-center gap-1">
            <Sparkles size={11} /> Reference AI
          </span>
          <span className="text-[10px] font-semibold text-ink-muted">
            {exercise.poseConfig.primaryJointName} Tracking
          </span>
        </div>

        {/* Sync Comparison Status */}
        {userMovementPhase && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${isInSync
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
          >
            {isInSync ? "🟢 In Sync with Coach" : "🟡 Match Reference Pace"}
          </span>
        )}
      </div>

      {/* ── SVG Animation Canvas ── */}
      <div className="relative flex-1 flex items-center justify-center bg-gradient-to-b from-primary/5 via-surface/60 to-surface dark:from-card-dark/80 dark:to-card-dark rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 min-h-[250px]">
        {/* Subtle background coordinate grid */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern id="gymGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2D6A4F" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="torsoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2D6A4F" />
              <stop offset="100%" stopColor="#1B4332" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#gymGrid)" />
        </svg>

        {/* Phase Pill Badge */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white px-2.5 py-1 rounded-xl border border-white/10">
            {currentPose.phaseLabel}
          </span>
          <span className="text-[9px] text-ink-muted bg-white/70 dark:bg-black/50 px-2 py-0.5 rounded-md backdrop-blur-sm self-start">
            Target: {exercise.poseConfig.targetRangeLabel}
          </span>
        </div>

        {/* Angle Badge */}
        <div className="absolute top-3 right-3 z-10 text-right">
          <span className="text-[11px] font-mono font-bold bg-accent/20 text-accent px-2.5 py-1 rounded-xl border border-accent/30 shadow-sm">
            Ref: {currentPose.referenceAngle}°
          </span>
        </div>

        {/* Main Character SVG */}
        <svg viewBox="0 0 260 300" className="w-full h-full max-h-[270px]">
          <AnimatedCharacter
            pose={currentPose}
            animDef={animDef}
            highlightJointName={animDef.highlightJoint}
          />
        </svg>

        {/* Interactive Scrub Bar Overlay */}
        <div className="absolute bottom-2 inset-x-4 z-10 flex items-center gap-2">
          <div className="relative flex-1 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden cursor-pointer">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-75"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-ink-muted shrink-0">
            {Math.round(progress * 100)}%
          </span>
        </div>
      </div>

      {/* ── Instruction Cues Carousel ── */}
      <div className="mt-2.5 px-1 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
        <button
          onClick={() =>
            setInstructionIdx((i) => (i === 0 ? exercise.instructions.length - 1 : i - 1))
          }
          className="p-1 text-ink-muted hover:text-ink dark:hover:text-white rounded-lg hover:bg-black/5 transition-colors"
          title="Previous Cue"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={instructionIdx}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              className="text-xs text-ink dark:text-white/90 font-medium leading-tight truncate"
            >
              <span className="text-primary font-bold mr-1">Step {instructionIdx + 1}:</span>
              {exercise.instructions[instructionIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        <button
          onClick={() =>
            setInstructionIdx((i) => (i + 1) % exercise.instructions.length)
          }
          className="p-1 text-ink-muted hover:text-ink dark:hover:text-white rounded-lg hover:bg-black/5 transition-colors"
          title="Next Cue"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* ── Media Controls ── */}
      <div className="flex items-center justify-between mt-2.5 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            {isPlaying ? "Pause" : "Play"}
          </button>

          <button
            onClick={replay}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-ink-muted text-xs font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/5"
            title="Replay from start"
          >
            <RotateCcw size={12} />
            Replay
          </button>
        </div>

        {/* Speed / Slow Motion Toggle */}
        <button
          onClick={toggleSpeed}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${speedMultiplier === 0.5
            ? "bg-accent text-white border-accent shadow-sm"
            : "bg-black/5 dark:bg-white/5 text-ink-muted border-black/10 dark:border-white/10 hover:bg-black/10"
            }`}
          title="Toggle speed (0.5x Slow Motion, 1.0x Normal, 1.5x Fast)"
        >
          <Gauge size={12} />
          {speedMultiplier === 0.5 ? "Slow Motion (0.5x)" : `${speedMultiplier}x Speed`}
        </button>
      </div>

      {/* Camera angle tip */}
      {exercise.poseConfig.cameraAngleNote && (
        <p className="mt-2 text-[10px] text-center text-ink-muted/80 italic">
          📷 {exercise.poseConfig.cameraAngleNote}
        </p>
      )}
    </div>
  );
}
