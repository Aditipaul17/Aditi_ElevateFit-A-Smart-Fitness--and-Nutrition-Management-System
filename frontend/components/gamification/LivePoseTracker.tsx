"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  VideoOff,
  Sliders,
  Sparkles,
  Zap,
  Info,
} from "lucide-react";
import type { Exercise, MobilityLevel } from "./workoutData";

interface LivePoseTrackerProps {
  exercise: Exercise;
  onRepsUpdate: (reps: number) => void;
  onSessionEnd: (reps: number, calories: number, accuracyScore: number) => void;
  onPhaseChange?: (phase: "bottom" | "top") => void;
}

// Geometric angle at vertex B between 2D points A, B, C
function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return Math.round(angle);
}

// Dynamically load external scripts with fallback
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

// MediaPipe 33-landmark skeleton connection pairs
const SKELETON_PAIRS: [number, number][] = [
  // Upper body
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso sides
  [23, 24], // hips
  // Lower body
  [23, 25], [25, 27], [27, 29], [29, 31], // left leg
  [24, 26], [26, 28], [28, 30], [30, 32], // right leg
];

export function LivePoseTracker({
  exercise,
  onRepsUpdate,
  onSessionEnd,
  onPhaseChange,
}: LivePoseTrackerProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [reps, setReps] = useState(0);
  const [movementPhase, setMovementPhase] = useState<"top" | "bottom">("top");
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState("Ready — click Start Exercise below.");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [poseLoaded, setPoseLoaded] = useState(false);
  const [feedbackCue, setFeedbackCue] = useState<string | null>(null);
  const [mobilityLevel, setMobilityLevel] = useState<MobilityLevel>("standard");
  const [showMobilitySettings, setShowMobilitySettings] = useState(false);
  const [goodFormReps, setGoodFormReps] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);

  const repsRef = useRef(0);
  const phaseRef = useRef<"top" | "bottom">("top");
  const hasReachedInflectionRef = useRef(false);
  const lastRepTimeRef = useRef(0);
  const cueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobilityLevelRef = useRef(mobilityLevel);

  repsRef.current = reps;
  phaseRef.current = movementPhase;
  mobilityLevelRef.current = mobilityLevel;

  const cfg = exercise.poseConfig;
  const currentThresholds = cfg.mobilityProfiles[mobilityLevel];

  const showCue = useCallback((cue: string) => {
    setFeedbackCue(cue);
    if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
    cueTimerRef.current = setTimeout(() => setFeedbackCue(null), 4000);
  }, []);

  // ─── Real-Time MediaPipe Landmark & Biomechanical Analysis ───────────────
  const onPoseResults = useCallback(
    (results: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Draw camera background image
      if (results.image) {
        ctx.drawImage(results.image, 0, 0, width, height);
      }

      const lm = results.poseLandmarks;
      if (!lm) {
        setStatusMsg("⚠️ Looking for athlete — step fully into frame.");
        ctx.restore();
        return;
      }

      // Draw full 33-point body skeleton overlay
      ctx.strokeStyle = "rgba(45, 106, 79, 0.85)";
      ctx.lineWidth = 3;
      for (const [a, b] of SKELETON_PAIRS) {
        if (lm[a] && lm[b] && lm[a].visibility > 0.4 && lm[b].visibility > 0.4) {
          ctx.beginPath();
          ctx.moveTo(lm[a].x * width, lm[a].y * height);
          ctx.lineTo(lm[b].x * width, lm[b].y * height);
          ctx.stroke();
        }
      }

      // Draw landmark joint points
      for (let i = 0; i < lm.length; i++) {
        const point = lm[i];
        if (point.visibility > 0.4) {
          ctx.fillStyle = "#40916C";
          ctx.beginPath();
          ctx.arc(point.x * width, point.y * height, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Select best visible tracking side ──
      const [a1, b1, c1] = cfg.landmarkIndices;
      const [a2, b2, c2] = cfg.altLandmarkIndices ?? cfg.landmarkIndices;

      const p1Available = lm[a1] && lm[b1] && lm[c1];
      const p2Available = lm[a2] && lm[b2] && lm[c2];

      if (!p1Available && !p2Available) {
        setStatusMsg("⚠️ Active joint not detected — adjust position.");
        ctx.restore();
        return;
      }

      const usePrimary =
        !p2Available ||
        (p1Available && (lm[b1].visibility ?? 0) >= (lm[b2].visibility ?? 0));

      const [ai, bi, ci] = usePrimary
        ? cfg.landmarkIndices
        : (cfg.altLandmarkIndices ?? cfg.landmarkIndices);

      const pA = lm[ai];
      const pB = lm[bi]; // vertex joint
      const pC = lm[ci];

      if (!pA || !pB || !pC || (pB.visibility ?? 0) < 0.42) {
        setStatusMsg(`⚠️ ${cfg.primaryJointName} partially hidden — face the camera.`);
        ctx.restore();
        return;
      }

      // Calculate actual geometric angle at vertex B
      const angle = calculateAngle(
        { x: pA.x, y: pA.y },
        { x: pB.x, y: pB.y },
        { x: pC.x, y: pC.y }
      );
      setCurrentAngle(angle);

      // Vertex highlight on canvas
      const vertexX = pB.x * width;
      const vertexY = pB.y * height;

      ctx.fillStyle = "#D4A373";
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(vertexX, vertexY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Degree label overlay beside active joint
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.beginPath();
      ctx.roundRect(vertexX + 10, vertexY - 24, 52, 22, 6);
      ctx.fill();
      ctx.fillStyle = "#F8FAFC";
      ctx.font = "bold 13px monospace";
      ctx.fillText(`${angle}°`, vertexX + 16, vertexY - 9);

      // ── Exercise-Specific Rep Counting State Machine ──
      const thresholds = cfg.mobilityProfiles[mobilityLevelRef.current];
      const isFlexion = cfg.direction === "flexion";
      const now = performance.now();

      if (isFlexion) {
        // e.g. Squat, Bicep Curl, Push-up, Bench Press, RDL
        // Phase 1: Reaches bottom flexion (angle drops below inflectionThreshold)
        if (angle <= thresholds.inflectionThreshold) {
          if (!hasReachedInflectionRef.current) {
            hasReachedInflectionRef.current = true;
            phaseRef.current = "bottom";
            setMovementPhase("bottom");
            onPhaseChange?.("bottom");
            setStatusMsg(`${cfg.bottomPhaseLabel} achieved! Now drive back up.`);
          }
        }

        // Phase 2: Returns to lockout extension (angle rises above startThreshold)
        if (
          hasReachedInflectionRef.current &&
          angle >= thresholds.startThreshold &&
          now - lastRepTimeRef.current > 750 // Prevent debounce spam
        ) {
          hasReachedInflectionRef.current = false;
          phaseRef.current = "top";
          setMovementPhase("top");
          onPhaseChange?.("top");
          lastRepTimeRef.current = now;

          const nextRep = repsRef.current + 1;
          setReps(nextRep);
          setGoodFormReps((g) => g + 1);
          onRepsUpdate(nextRep);
          setStatusMsg(`Rep ${nextRep} completed! Excellent form.`);

          // Show occasional technique cue
          if (nextRep % 3 === 0 && cfg.formCues.length > 0) {
            showCue(cfg.formCues[Math.floor(Math.random() * cfg.formCues.length)]);
          }
        }
      } else {
        // e.g. Shoulder Press, Lateral Raise, Calf Raise, Leg Extension, Glute Bridge
        // Phase 1: Reaches top extension (angle rises above inflectionThreshold)
        if (angle >= thresholds.inflectionThreshold) {
          if (!hasReachedInflectionRef.current) {
            hasReachedInflectionRef.current = true;
            phaseRef.current = "bottom"; // "inflection"
            setMovementPhase("bottom");
            onPhaseChange?.("bottom");
            setStatusMsg(`${cfg.topPhaseLabel} reached! Lower under control.`);
          }
        }

        // Phase 2: Returns to starting position (angle drops below startThreshold)
        if (
          hasReachedInflectionRef.current &&
          angle <= thresholds.startThreshold &&
          now - lastRepTimeRef.current > 750
        ) {
          hasReachedInflectionRef.current = false;
          phaseRef.current = "top";
          setMovementPhase("top");
          onPhaseChange?.("top");
          lastRepTimeRef.current = now;

          const nextRep = repsRef.current + 1;
          setReps(nextRep);
          setGoodFormReps((g) => g + 1);
          onRepsUpdate(nextRep);
          setStatusMsg(`Rep ${nextRep} completed! Clean lockout.`);

          if (nextRep % 3 === 0 && cfg.formCues.length > 0) {
            showCue(cfg.formCues[Math.floor(Math.random() * cfg.formCues.length)]);
          }
        }
      }

      // ── Secondary Biomechanical Checks ──
      // 1. Knee Cave check on Squat / Lunge
      if (
        (exercise.id === "squats" || exercise.id === "lunges") &&
        lm[25] &&
        lm[26] &&
        lm[27] &&
        lm[28]
      ) {
        const kneeDist = Math.abs(lm[25].x - lm[26].x);
        const ankleDist = Math.abs(lm[27].x - lm[28].x);
        if (ankleDist > 0.15 && kneeDist < ankleDist * 0.75 && phaseRef.current === "bottom") {
          showCue("⚠️ Push knees out over your toes — don't let knees cave in!");
        }
      }

      // 2. Hip Sag check on Push-up
      if (exercise.id === "push_ups" && lm[12] && lm[24] && lm[28]) {
        const hipLineAngle = calculateAngle(
          { x: lm[12].x, y: lm[12].y },
          { x: lm[24].x, y: lm[24].y },
          { x: lm[28].x, y: lm[28].y }
        );
        if (hipLineAngle < 150) {
          showCue("⚠️ Keep core tight — body should form a straight plank line!");
        }
      }

      // 3. Lateral raise over-elevation
      if (exercise.id === "lateral_raises" && angle > 105) {
        showCue("⚠️ Stop at shoulder height (90°) to protect rotator cuff!");
      }

      ctx.restore();
    },
    [cfg, exercise.id, onPhaseChange, onRepsUpdate, showCue]
  );

  // ── Start Webcam Feed ────────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError(null);
    setStatusMsg("Accessing webcam…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          initPose();
        };
      }
    } catch (err: any) {
      setCameraError(
        err?.name === "NotAllowedError" || err?.message?.includes("ermission")
          ? "Camera permission denied. Please enable camera access in your browser."
          : "Webcam not available or in use by another application."
      );
      setStatusMsg("Camera unavailable.");
    }
  };

  // ── Load & Initialize MediaPipe Pose ─────────────────────────────────────
  const initPose = async () => {
    setStatusMsg("Loading MediaPipe Pose AI model…");
    try {
      // Try jsdelivr CDN first
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js");
      } catch {
        // Fallback to unpkg
        await loadScript("https://unpkg.com/@mediapipe/pose/pose.js");
      }

      const PoseCtor = (window as any).Pose;
      if (!PoseCtor) throw new Error("MediaPipe library not found on window");

      const pose = new PoseCtor({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onPoseResults);
      poseRef.current = pose;
      setPoseLoaded(true);

      // Throttled frame processing loop
      let active = true;
      const processFrame = async () => {
        if (!active) return;
        if (
          !isProcessingRef.current &&
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          poseRef.current
        ) {
          isProcessingRef.current = true;
          try {
            await poseRef.current.send({ image: videoRef.current });
          } catch (e) {
            console.warn("Pose estimation error:", e);
          } finally {
            isProcessingRef.current = false;
          }
        }
        rafRef.current = requestAnimationFrame(processFrame);
      };

      rafRef.current = requestAnimationFrame(processFrame);
      setStatusMsg(`Tracking ${exercise.name} — step into frame!`);
    } catch (e) {
      console.warn("MediaPipe load error:", e);
      setStatusMsg("Pose model failed to load. Please check internet connection.");
      setCameraError("Could not load MediaPipe Pose estimation model from CDN.");
    }
  };

  // ── Stop Camera & Pose ───────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (poseRef.current) {
      try {
        poseRef.current.close?.();
      } catch {}
      poseRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setPoseLoaded(false);
  }, []);

  const handleFinish = () => {
    const finalReps = repsRef.current;
    stopCamera();
    const calories = Math.round(finalReps * exercise.caloriesPerRep * 10) / 10;
    const accuracy = finalReps > 0 ? Math.min(100, Math.round((goodFormReps / finalReps) * 100)) : 100;
    onSessionEnd(finalReps, calories, accuracy);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (cueTimerRef.current) clearTimeout(cueTimerRef.current);
    };
  }, [stopCamera]);

  // Visual angle range bar color
  const getAngleStatus = () => {
    if (currentAngle === null) return { color: "bg-gray-400", label: "Waiting..." };
    const { startThreshold, inflectionThreshold } = currentThresholds;
    const isFlex = cfg.direction === "flexion";

    if (isFlex) {
      if (currentAngle <= inflectionThreshold) {
        return { color: "bg-emerald-500", label: "Full Depth! ✓" };
      }
      if (currentAngle >= startThreshold) {
        return { color: "bg-blue-500", label: "Lockout Start" };
      }
      return { color: "bg-amber-400", label: "Moving in Range" };
    } else {
      if (currentAngle >= inflectionThreshold) {
        return { color: "bg-emerald-500", label: "Peak Lockout! ✓" };
      }
      if (currentAngle <= startThreshold) {
        return { color: "bg-blue-500", label: "Starting Level" };
      }
      return { color: "bg-amber-400", label: "Ascending" };
    }
  };

  const angleStatus = getAngleStatus();
  const anglePct = currentAngle !== null ? Math.min(100, Math.max(0, (currentAngle / 180) * 100)) : 0;

  return (
    <div className="flex flex-col h-full select-none">
      {/* ── Top Header Controls ── */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-secondary/10 text-secondary px-2.5 py-1 rounded-full border border-secondary/20 flex items-center gap-1">
            <Zap size={11} /> Live Pose AI
          </span>

          {poseLoaded && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 size={10} /> Active
            </span>
          )}
        </div>

        {/* Mobility Profile Dropdown Toggle */}
        <button
          onClick={() => setShowMobilitySettings((s) => !s)}
          className="flex items-center gap-1 text-[10px] font-semibold text-ink-muted hover:text-ink dark:hover:text-white px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-black/5 dark:border-white/5"
          title="Configure mobility tolerance range"
        >
          <Sliders size={11} />
          <span>Mobility: {mobilityLevel}</span>
        </button>
      </div>

      {/* Mobility settings accordion */}
      <AnimatePresence>
        {showMobilitySettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-xs space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-ink dark:text-white flex items-center gap-1">
                <Info size={12} className="text-primary" /> Range of Motion Profile:
              </span>
              <span className="text-[10px] text-ink-muted">Tailors target angles</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {(["standard", "beginner", "strict"] as MobilityLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => {
                    setMobilityLevel(level);
                    setShowMobilitySettings(false);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                    mobilityLevel === level
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white dark:bg-card-dark text-ink-muted border border-black/5 dark:border-white/5 hover:text-ink"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-ink-muted italic">
              Current: {currentThresholds.label}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Camera & Canvas Area ── */}
      <div className="relative flex-1 rounded-2xl overflow-hidden bg-slate-950 border border-black/10 dark:border-white/10 min-h-[250px] flex items-center justify-center">
        {/* Hidden video source */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover -scale-x-100 hidden"
        />

        {/* Mirrored canvas with skeleton overlay */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full object-cover -scale-x-100"
        />

        {/* Inactive Camera Prompt */}
        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-10 bg-slate-950/90 backdrop-blur-sm">
            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-inner">
              <Camera size={26} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Real-Time Pose Tracking</p>
              <p className="text-white/60 text-xs max-w-xs mt-1 leading-relaxed">
                Position your camera so your full body is visible. Repetitions and angles are tracked locally in your browser.
              </p>
            </div>

            {cameraError && (
              <div className="bg-red-950/80 border border-red-700/60 rounded-xl px-4 py-2 text-red-300 text-xs flex items-start gap-2 max-w-xs">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
                <span>{cameraError}</span>
              </div>
            )}

            <button
              onClick={startCamera}
              className="btn-primary !px-5 !py-2.5 text-xs font-semibold inline-flex items-center gap-2 shadow-glow mt-1"
            >
              <Play size={14} className="fill-white" /> Start Exercise
            </button>
          </div>
        )}

        {/* Live Overlays when active */}
        {cameraActive && (
          <>
            {/* Rep Counter Display */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-3 bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15 shadow-lg">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/60 block font-bold">
                  Reps
                </span>
                <span className="text-3xl font-display font-extrabold text-white leading-none">
                  {reps}
                </span>
              </div>

              {currentAngle !== null && (
                <div className="border-l border-white/20 pl-3">
                  <span className="text-[9px] uppercase tracking-wider text-white/60 block font-bold">
                    {cfg.primaryJointName}
                  </span>
                  <span className="text-xl font-mono font-bold text-amber-300">
                    {currentAngle}°
                  </span>
                </div>
              )}
            </div>

            {/* Current Phase Badge */}
            <div className="absolute top-3 right-3 z-20">
              <span className="px-3 py-1.5 rounded-xl bg-primary/90 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md backdrop-blur-sm border border-white/20">
                {movementPhase === "bottom" ? cfg.bottomPhaseLabel : cfg.topPhaseLabel}
              </span>
            </div>

            {/* Bottom Real-Time Status Bar */}
            <div className="absolute bottom-3 inset-x-3 z-20 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-center text-xs font-medium text-white/95 border border-white/10 shadow-sm truncate">
              {statusMsg}
            </div>
          </>
        )}
      </div>

      {/* ── Form Feedback Cue Alert ── */}
      <AnimatePresence>
        {feedbackCue && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300/40 dark:border-amber-700/40 rounded-xl px-3.5 py-2 flex items-start gap-2 shadow-sm"
          >
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200 font-semibold leading-tight">
              {feedbackCue}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Angle Range Indicator Bar ── */}
      {cameraActive && currentAngle !== null && (
        <div className="mt-2.5 space-y-1">
          <div className="flex justify-between text-[10px] font-bold text-ink-muted">
            <span>0°</span>
            <span className="text-primary font-semibold flex items-center gap-1">
              <span className={`inline-block h-2 w-2 rounded-full ${angleStatus.color}`} />
              {angleStatus.label}
            </span>
            <span>180°</span>
          </div>

          <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden relative">
            {/* Target inflection range indicator */}
            <div
              className="absolute top-0 h-full bg-emerald-400/30 rounded-full"
              style={{
                left: `${Math.min(currentThresholds.startThreshold, currentThresholds.inflectionThreshold) / 1.8}%`,
                width: `${Math.abs(currentThresholds.startThreshold - currentThresholds.inflectionThreshold) / 1.8}%`,
              }}
            />
            {/* Current Angle marker */}
            <motion.div
              className={`absolute top-0 h-full w-2.5 rounded-full ${angleStatus.color} shadow-sm`}
              animate={{ left: `${anglePct}%` }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            />
          </div>
        </div>
      )}

      {/* ── Media & Finish Controls ── */}
      <div className="flex items-center justify-between mt-2.5 pt-1">
        {cameraActive ? (
          <>
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Square size={12} /> Stop Camera
            </button>

            <button
              onClick={handleFinish}
              className="btn-primary !px-4 !py-1.5 text-xs font-semibold shadow-sm"
            >
              Finish & Log ({reps} reps)
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <VideoOff size={13} />
            <span>Camera inactive</span>
          </div>
        )}
      </div>
    </div>
  );
}
