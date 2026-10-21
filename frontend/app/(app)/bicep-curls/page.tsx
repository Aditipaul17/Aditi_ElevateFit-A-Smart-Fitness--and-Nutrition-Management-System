"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Play,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Flame,
  Timer,
  Trophy,
  Activity,
  CheckCircle2,
  AlertCircle,
  Download,
  Sliders,
  Sparkles,
  History,
  Dumbbell,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/AuthContext";
import {
  saveBicepCurlSession,
  fetchBicepCurlHistory,
  fetchBicepCurlStats,
  BicepCurlSessionRecord,
  BicepCurlRepLog,
  BicepCurlStats,
} from "@/lib/api";

const STORAGE_KEY_LOCAL_HISTORY = "elevatefit_bicep_curl_history";

export default function BicepCurlCounterPage() {
  const { token, user } = useAuth();

  // Camera & Stream State
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [modelReady, setModelReady] = useState<boolean>(false);

  // Exercise & Rep State (Reusing original raxor555 algorithm)
  const [reps, setReps] = useState<number>(0);
  const [stage, setStage] = useState<"down" | "up" | "ready">("ready");
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [personDetected, setPersonDetected] = useState<boolean>(false);
  const [selectedArm, setSelectedArm] = useState<"left" | "right" | "auto">("auto");
  const [activeArmDetected, setActiveArmDetected] = useState<"left" | "right">("left");

  // Thresholds from raxor555/Bicep-Curl-Counter
  const [downThreshold, setDownThreshold] = useState<number>(160);
  const [upThreshold, setUpThreshold] = useState<number>(30);
  const [targetReps, setTargetReps] = useState<number>(10);
  const [targetSets, setTargetSets] = useState<number>(3);
  const [currentSet, setCurrentSet] = useState<number>(1);

  // Audio Feedback
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Session Workout Timer & Analytics
  const [isWorkoutActive, setIsWorkoutActive] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [repLogs, setRepLogs] = useState<BicepCurlRepLog[]>([]);
  const [formQualityScores, setFormQualityScores] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("Click 'Start Camera' to begin your AI workout.");

  // Summary Modal & History State
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [lastCompletedSession, setLastCompletedSession] = useState<{
    reps: number;
    sets: number;
    durationSeconds: number;
    calories: number;
    formAccuracy: number;
    repLogs: BicepCurlRepLog[];
    gamification?: any;
  } | null>(null);
  const [pastSessions, setPastSessions] = useState<BicepCurlSessionRecord[]>([]);
  const [stats, setStats] = useState<BicepCurlStats>({
    total_sessions: 0,
    total_reps: 0,
    total_calories: 0,
    total_duration_minutes: 0,
    best_session_reps: 0,
  });
  const [isSavingSession, setIsSavingSession] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"counter" | "history">("counter");

  // Refs for real-time video loop
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseInstanceRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Tracking mutable state in refs to avoid stale closure in requestAnimationFrame loop
  const repsRef = useRef<number>(0);
  const stageRef = useRef<"down" | "up" | "ready">("ready");
  const selectedArmRef = useRef<"left" | "right" | "auto">("auto");
  const downThresholdRef = useRef<number>(160);
  const upThresholdRef = useRef<number>(30);
  const isWorkoutActiveRef = useRef<boolean>(false);
  const soundEnabledRef = useRef<boolean>(true);
  const repLogsRef = useRef<BicepCurlRepLog[]>([]);

  repsRef.current = reps;
  stageRef.current = stage;
  selectedArmRef.current = selectedArm;
  downThresholdRef.current = downThreshold;
  upThresholdRef.current = upThreshold;
  isWorkoutActiveRef.current = isWorkoutActive;
  soundEnabledRef.current = soundEnabled;
  repLogsRef.current = repLogs;

  // 1. Audio tone synthesizer for rep feedback
  const playRepBeep = useCallback((isHighTone: boolean = true) => {
    if (!soundEnabledRef.current) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(isHighTone ? 880 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {
      // AudioContext fallback ignored
    }
  }, []);

  // 2. Trigonometric joint angle calculation (Original raxor555 algorithm)
  const calculateAngle = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
  ): number => {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) {
      angle = 360.0 - angle;
    }
    return angle;
  };

  // 3. Enumerate camera devices
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevs = devices.filter((d) => d.kind === "videoinput");
          setCameraDevices(videoDevs);
          if (videoDevs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoDevs[0].deviceId);
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4. Workout Timer Interval
  useEffect(() => {
    let timer: any = null;
    if (isWorkoutActive) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isWorkoutActive]);

  const calculateLocalStats = useCallback((records: BicepCurlSessionRecord[]) => {
    const total_sessions = records.length;
    const total_reps = records.reduce((acc, r) => acc + (r.reps || 0), 0);
    const total_calories = records.reduce((acc, r) => acc + (r.calories || 0), 0);
    const total_duration_minutes = Math.round(
      records.reduce((acc, r) => acc + (r.duration_seconds || 0), 0) / 60
    );
    const best_session_reps = Math.max(...records.map((r) => r.reps || 0), 0);
    setStats({
      total_sessions,
      total_reps,
      total_calories,
      total_duration_minutes,
      best_session_reps,
    });
  }, []);

  // 5. Load History and Stats on mount
  const loadHistoryAndStats = useCallback(async () => {
    // Check local storage first
    try {
      const localData = localStorage.getItem(STORAGE_KEY_LOCAL_HISTORY);
      if (localData) {
        const parsed: BicepCurlSessionRecord[] = JSON.parse(localData);
        setPastSessions(parsed);
        calculateLocalStats(parsed);
      }
    } catch (e) {}

    // If authenticated, sync with backend database
    if (token) {
      try {
        const [historyRes, statsRes] = await Promise.all([
          fetchBicepCurlHistory(token, 20),
          fetchBicepCurlStats(token),
        ]);
        if (historyRes && historyRes.length > 0) {
          setPastSessions(historyRes);
          localStorage.setItem(STORAGE_KEY_LOCAL_HISTORY, JSON.stringify(historyRes));
        }
        if (statsRes) {
          setStats(statsRes);
        }
      } catch (err) {
        console.warn("Backend history sync fallback to local:", err);
      }
    }
  }, [token, calculateLocalStats]);

  useEffect(() => {
    loadHistoryAndStats();
  }, [loadHistoryAndStats]);

  // 6. Camera Lifecycle: Start & Stop
  const startCamera = async () => {
    setCameraError(null);
    setStatusMessage("Requesting camera access...");
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          initPoseModel();
        };
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(
        err?.name === "NotAllowedError" || err?.message?.includes("Permission")
          ? "Camera permission denied. Please allow camera access in browser settings to use the AI rep counter."
          : "Camera not found or already in use by another application."
      );
      setStatusMessage("Camera initialization error.");
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsWorkoutActive(false);
    setStatusMessage("Camera feed stopped.");
  };

  // 7. Initialize MediaPipe Pose Model
  const initPoseModel = async () => {
    if (poseInstanceRef.current) {
      setModelReady(true);
      startDetectionLoop();
      return;
    }

    setIsModelLoading(true);
    setStatusMessage("Loading MediaPipe Pose neural network...");

    const loadScript = (src: string) => {
      return new Promise<void>((resolve, reject) => {
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
    };

    try {
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js");

      const PoseConstructor = (window as any).Pose;
      if (!PoseConstructor) {
        throw new Error("MediaPipe Pose library could not be loaded");
      }

      const pose = new PoseConstructor({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onPoseResults);
      poseInstanceRef.current = pose;
      setIsModelLoading(false);
      setModelReady(true);
      setIsWorkoutActive(true);
      setStatusMessage("Ready! Step back into frame and curl.");

      startDetectionLoop();
    } catch (err) {
      console.error("MediaPipe initialization error:", err);
      setIsModelLoading(false);
      setCameraError("Failed to initialize MediaPipe Pose neural network.");
      setStatusMessage("Error loading pose detector.");
    }
  };

  // Detection Animation Loop
  const startDetectionLoop = () => {
    const loop = async () => {
      if (
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        poseInstanceRef.current
      ) {
        try {
          await poseInstanceRef.current.send({ image: videoRef.current });
        } catch (e) {}
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  };

  // 8. Pose Processing & Rep Counting (Exact raxor555 algorithm)
  const onPoseResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Draw camera image
    if (isMirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(results.image, 0, 0, width, height);

    if (!results.poseLandmarks) {
      setPersonDetected(false);
      // "No person detected" warning overlay matching bicepcurl.py
      ctx.restore();
      ctx.save();
      ctx.fillStyle = "#EF4444";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("No person detected - Step into frame", 20, 105);
      renderStatusBox(ctx, repsRef.current, stageRef.current, null);
      ctx.restore();
      return;
    }

    setPersonDetected(true);
    const landmarks = results.poseLandmarks;

    // Landmark indices:
    // Left: shoulder (11), elbow (13), wrist (15)
    // Right: shoulder (12), elbow (14), wrist (16)
    const l_shoulder = landmarks[11];
    const l_elbow = landmarks[13];
    const l_wrist = landmarks[15];

    const r_shoulder = landmarks[12];
    const r_elbow = landmarks[14];
    const r_wrist = landmarks[16];

    const l_vis = l_elbow?.visibility ?? 0;
    const r_vis = r_elbow?.visibility ?? 0;

    let shoulder = l_shoulder;
    let elbow = l_elbow;
    let wrist = l_wrist;
    let activeArm: "left" | "right" = "left";

    const armPref = selectedArmRef.current;
    if (armPref === "left") {
      shoulder = l_shoulder;
      elbow = l_elbow;
      wrist = l_wrist;
      activeArm = "left";
    } else if (armPref === "right") {
      shoulder = r_shoulder;
      elbow = r_elbow;
      wrist = r_wrist;
      activeArm = "right";
    } else {
      // Auto-detect based on visibility
      if (r_vis > l_vis) {
        shoulder = r_shoulder;
        elbow = r_elbow;
        wrist = r_wrist;
        activeArm = "right";
      } else {
        shoulder = l_shoulder;
        elbow = l_elbow;
        wrist = l_wrist;
        activeArm = "left";
      }
    }
    setActiveArmDetected(activeArm);

    // Render skeleton connections with raxor555 colors
    drawPoseOverlay(ctx, landmarks, width, height);

    if (shoulder && elbow && wrist && (elbow.visibility || 1) > 0.4) {
      const angle = calculateAngle(shoulder, elbow, wrist);
      const roundedAngle = Math.round(angle * 10) / 10;
      setCurrentAngle(roundedAngle);

      // Rep Counting State Machine from raxor555/Bicep-Curl-Counter
      // DOWN_THRESHOLD = 160, UP_THRESHOLD = 30
      const downThresh = downThresholdRef.current;
      const upThresh = upThresholdRef.current;

      if (angle > downThresh) {
        if (stageRef.current !== "down") {
          stageRef.current = "down";
          setStage("down");
          setStatusMessage("Arm fully extended! Now curl upward.");
        }
      }

      if (angle < upThresh && stageRef.current === "down") {
        stageRef.current = "up";
        setStage("up");
        const nextReps = repsRef.current + 1;
        repsRef.current = nextReps;
        setReps(nextReps);

        // Record rep log entry with timestamp
        const nowStr = new Date().toLocaleTimeString();
        const repEntry: BicepCurlRepLog = {
          rep: nextReps,
          timestamp: nowStr,
          angle: roundedAngle,
          arm: activeArm,
        };
        const updatedLogs = [...repLogsRef.current, repEntry];
        repLogsRef.current = updatedLogs;
        setRepLogs(updatedLogs);

        // Quality score: did the user curl tight (<25 deg gets 100%, 30 deg gets 95%)
        const repQuality = Math.min(100, Math.round(100 - (roundedAngle / upThresh) * 15));
        setFormQualityScores((prev) => [...prev, repQuality]);

        setStatusMessage(`Great Curl! Rep ${nextReps} completed.`);
        playRepBeep(true);
      }

      // Render angle text at the elbow joint matching cv2.putText
      const elbowX = elbow.x * width;
      const elbowY = elbow.y * height;
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 3;
      ctx.font = "bold 16px sans-serif";
      ctx.strokeText(`${roundedAngle.toFixed(1)}°`, elbowX + 10, elbowY);
      ctx.fillText(`${roundedAngle.toFixed(1)}°`, elbowX + 10, elbowY);
    }

    ctx.restore();

    // Render original-style OpenCV Status Box overlay in top left
    ctx.save();
    renderStatusBox(ctx, repsRef.current, stageRef.current, activeArm);
    ctx.restore();
  };

  // 9. Draw Landmarks Overlay matching raxor555 colors
  const drawPoseOverlay = (
    ctx: CanvasRenderingContext2D,
    landmarks: any[],
    width: number,
    height: number
  ) => {
    const connections = [
      [11, 13], [13, 15], // Left arm
      [12, 14], [14, 16], // Right arm
      [11, 12],           // Shoulders
      [11, 23], [12, 24], // Torso
      [23, 24],           // Hips
    ];

    // Connection lines: (245, 66, 230) -> rgb(245, 66, 230) / #F542E6
    ctx.strokeStyle = "rgb(245, 66, 230)";
    ctx.lineWidth = 3;

    for (const [i1, i2] of connections) {
      const p1 = landmarks[i1];
      const p2 = landmarks[i2];
      if (p1 && p2 && (p1.visibility || 1) > 0.4 && (p2.visibility || 1) > 0.4) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    }

    // Joint landmarks: (245, 117, 66) -> rgb(245, 117, 66) / #F57542
    for (const idx of [11, 12, 13, 14, 15, 16, 23, 24]) {
      const p = landmarks[idx];
      if (p && (p.visibility || 1) > 0.4) {
        const x = p.x * width;
        const y = p.y * height;
        ctx.fillStyle = "rgb(245, 117, 66)";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  };

  // 10. Render Original OpenCV-style Status Box
  const renderStatusBox = (
    ctx: CanvasRenderingContext2D,
    repsCount: number,
    armStage: "down" | "up" | "ready",
    arm: "left" | "right" | null
  ) => {
    // Top-left rectangle: BGR (245, 117, 16) -> RGB (16, 117, 245) / #1075F5
    ctx.fillStyle = "rgb(16, 117, 245)";
    ctx.beginPath();
    ctx.roundRect(10, 10, 230, 70, 8);
    ctx.fill();

    // REPS column
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("REPS", 25, 26);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(String(repsCount), 25, 64);

    // STAGE column
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("STAGE", 95, 26);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px sans-serif";
    const stageText = armStage === "ready" ? "READY" : armStage.toUpperCase();
    ctx.fillText(stageText, 95, 62);

    // ARM column
    if (arm) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText("ARM", 180, 26);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(arm.toUpperCase(), 180, 60);
    }
  };

  // 11. Reset Counter
  const handleResetSession = () => {
    setReps(0);
    repsRef.current = 0;
    setStage("ready");
    stageRef.current = "ready";
    setElapsedSeconds(0);
    setRepLogs([]);
    repLogsRef.current = [];
    setFormQualityScores([]);
    setStatusMessage("Session reset. Start curling to count reps!");
  };

  // 12. Complete Workout & Open Summary Modal
  const handleFinishWorkout = async () => {
    stopCamera();

    const totalReps = repsRef.current;
    const duration = elapsedSeconds;
    const calories = Math.round(totalReps * 0.45 + duration * 0.05);

    const avgAccuracy =
      formQualityScores.length > 0
        ? Math.round(formQualityScores.reduce((a, b) => a + b, 0) / formQualityScores.length)
        : 100;

    const sessionData: {
      reps: number;
      sets: number;
      durationSeconds: number;
      calories: number;
      formAccuracy: number;
      repLogs: BicepCurlRepLog[];
      gamification?: any;
    } = {
      reps: totalReps,
      sets: currentSet,
      durationSeconds: duration,
      calories,
      formAccuracy: avgAccuracy,
      repLogs: repLogsRef.current,
    };

    setLastCompletedSession(sessionData);
    setShowSummaryModal(true);

    // Save to Database / Local Storage
    setIsSavingSession(true);
    let gamificationReward = null;

    if (token && totalReps > 0) {
      try {
        const payload = {
          title: `AI Bicep Curl Session (${activeArmDetected} arm)`,
          reps: totalReps,
          sets: currentSet,
          duration_seconds: duration,
          calories,
          arm: activeArmDetected,
          form_accuracy: avgAccuracy,
          rep_logs: repLogsRef.current,
        };
        const res = await saveBicepCurlSession(token, payload);
        gamificationReward = res.gamification;
        sessionData.gamification = gamificationReward;
      } catch (e) {
        console.warn("Failed saving to backend, saving locally:", e);
      }
    }

    // Save to local storage record
    const newRecord: BicepCurlSessionRecord = {
      id: String(Date.now()),
      title: `AI Bicep Curl Session (${activeArmDetected} arm)`,
      reps: totalReps,
      sets: currentSet,
      duration_seconds: duration,
      duration_minutes: Math.max(1, Math.round(duration / 60)),
      calories,
      arm: activeArmDetected,
      form_accuracy: avgAccuracy,
      rep_logs: repLogsRef.current,
      date: new Date().toISOString().replace("T", " ").substring(0, 16),
    };

    const updated = [newRecord, ...pastSessions];
    setPastSessions(updated);
    localStorage.setItem(STORAGE_KEY_LOCAL_HISTORY, JSON.stringify(updated));
    calculateLocalStats(updated);
    setIsSavingSession(false);
  };

  // 13. Download Log File (matching original workout_log.txt format)
  const downloadWorkoutLogFile = () => {
    if (!lastCompletedSession) return;
    let fileContent = `ElevateFit AI Bicep Curl Workout Log\n`;
    fileContent += `Date: ${new Date().toLocaleString()}\n`;
    fileContent += `Total Reps: ${lastCompletedSession.reps}\n`;
    fileContent += `Duration: ${Math.floor(lastCompletedSession.durationSeconds / 60)}m ${lastCompletedSession.durationSeconds % 60}s\n`;
    fileContent += `Calories: ${lastCompletedSession.calories} kcal\n`;
    fileContent += `Form Accuracy: ${lastCompletedSession.formAccuracy}%\n`;
    fileContent += `====================================\n\n`;

    lastCompletedSession.repLogs.forEach((log) => {
      fileContent += `${log.timestamp}: Curl ${log.rep} (${log.arm || "arm"}, ${log.angle || 0}°)\n`;
    });

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bicep_curl_workout_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format MM:SS
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <>
      <Topbar placeholder="Search workouts, pose detection, fitness tools..." />
      <main className="px-4 sm:px-6 lg:px-10 py-6 max-w-7xl mx-auto space-y-6">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Dumbbell size={22} />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-ink dark:text-white flex items-center gap-2">
                  AI Bicep Curl Counter
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                    Computer Vision
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-ink-muted">
                  Real-time pose estimation and automatic repetition counting powered by MediaPipe.
                </p>
              </div>
            </div>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex items-center gap-2 bg-surface dark:bg-surface-dark p-1 rounded-2xl border border-black/5 dark:border-white/10 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("counter")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "counter"
                  ? "bg-primary text-white shadow-sm"
                  : "text-ink-muted hover:text-ink dark:hover:text-white"
              }`}
            >
              <Camera size={15} />
              <span>Live Camera</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "history"
                  ? "bg-primary text-white shadow-sm"
                  : "text-ink-muted hover:text-ink dark:hover:text-white"
              }`}
            >
              <History size={15} />
              <span>Session History ({pastSessions.length})</span>
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-ink-muted uppercase">Lifetime Curls</p>
              <p className="text-xl font-display font-extrabold text-ink dark:text-white">
                {stats.total_reps}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-ink-muted uppercase">Total Sessions</p>
              <p className="text-xl font-display font-extrabold text-ink dark:text-white">
                {stats.total_sessions}
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-ink-muted uppercase">Best Session</p>
              <p className="text-xl font-display font-extrabold text-ink dark:text-white">
                {stats.best_session_reps} reps
              </p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <Flame size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-ink-muted uppercase">Calories Burned</p>
              <p className="text-xl font-display font-extrabold text-ink dark:text-white">
                {stats.total_calories} kcal
              </p>
            </div>
          </Card>
        </div>

        {activeTab === "counter" ? (
          /* TAB 1: LIVE COUNTER & REAL-TIME FEED */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT / TOP: LIVE CAMERA & CANVAS FEED */}
            <div className="lg:col-span-8 space-y-4">
              <Card className="relative overflow-hidden p-0 bg-black rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl">
                {/* VIDEO & CANVAS FEED CONTAINER */}
                <div className="relative aspect-[4/3] sm:aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {/* Invisible source video tag */}
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="hidden"
                  />

                  {/* Render Canvas */}
                  <canvas
                    ref={canvasRef}
                    width={640}
                    height={480}
                    className="w-full h-full object-contain"
                  />

                  {/* CAMERA INACTIVE SCREEN */}
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-900/90 to-slate-950/95 backdrop-blur-sm space-y-4">
                      <div className="h-16 w-16 rounded-3xl bg-primary/20 text-primary flex items-center justify-center shadow-glow">
                        <Camera size={32} />
                      </div>
                      <div className="max-w-md space-y-1">
                        <h3 className="text-lg font-display font-bold text-white">
                          Camera Is Currently Off
                        </h3>
                        <p className="text-xs text-slate-400">
                          Enable your webcam to start real-time computer vision pose tracking and rep counting.
                        </p>
                      </div>

                      {cameraError && (
                        <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs max-w-sm text-left">
                          <AlertCircle size={16} className="shrink-0 text-rose-400" />
                          <span>{cameraError}</span>
                        </div>
                      )}

                      <button
                        onClick={startCamera}
                        className="btn-primary py-3 px-8 text-sm font-bold shadow-lg shadow-primary/30 flex items-center gap-2"
                      >
                        <Play size={16} className="fill-current" />
                        <span>Start Camera &amp; AI Counter</span>
                      </button>
                    </div>
                  )}

                  {/* LOADING OVERLAY */}
                  {isModelLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md text-white space-y-3 z-20">
                      <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-semibold text-slate-200">
                        Initializing MediaPipe Pose Estimator...
                      </p>
                    </div>
                  )}

                  {/* LIVE STATUS PILL */}
                  {cameraActive && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold">
                        <span className={`h-2 w-2 rounded-full ${personDetected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                        {personDetected ? "Athlete In Frame" : "Searching for Pose"}
                      </span>
                    </div>
                  )}
                </div>

                {/* BOTTOM CAMERA CONTROL BAR */}
                <div className="p-3 sm:p-4 bg-slate-900 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-white">
                  <div className="flex items-center gap-2">
                    {cameraActive ? (
                      <button
                        onClick={stopCamera}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors"
                      >
                        <Square size={14} className="fill-current" />
                        <span>Stop Camera</span>
                      </button>
                    ) : (
                      <button
                        onClick={startCamera}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-colors"
                      >
                        <Play size={14} className="fill-current" />
                        <span>Start Camera</span>
                      </button>
                    )}

                    <button
                      onClick={handleResetSession}
                      disabled={reps === 0 && elapsedSeconds === 0}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold transition-colors disabled:opacity-40"
                    >
                      <RotateCcw size={14} />
                      <span>Reset</span>
                    </button>
                  </div>

                  {/* CONTROLS RIGHT */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMirrored(!isMirrored)}
                      title="Mirror camera"
                      className={`p-2 rounded-xl transition-colors ${
                        isMirrored
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      <FlipHorizontal size={16} />
                    </button>

                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      title={soundEnabled ? "Mute audio" : "Enable sound"}
                      className={`p-2 rounded-xl transition-colors ${
                        soundEnabled
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-white/10 text-slate-300"
                      }`}
                    >
                      {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    </button>

                    <button
                      onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-semibold"
                    >
                      <Sliders size={14} />
                      <span>Configure</span>
                    </button>

                    {reps > 0 && (
                      <button
                        onClick={handleFinishWorkout}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-900/50"
                      >
                        <CheckCircle2 size={15} />
                        <span>Finish &amp; Save</span>
                      </button>
                    )}
                  </div>
                </div>
              </Card>

              {/* COACH / FEEDBACK BANNER */}
              <div className="p-3 rounded-2xl bg-surface dark:bg-surface-dark border border-black/5 dark:border-white/10 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Sparkles size={14} />
                  </span>
                  <span className="text-ink dark:text-white font-medium">
                    {statusMessage}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-ink-muted">
                  Arm: {activeArmDetected.toUpperCase()}
                </span>
              </div>
            </div>

            {/* RIGHT: REAL-TIME WORKOUT STATUS PANEL */}
            <div className="lg:col-span-4 space-y-4">
              {/* PRIMARY REP METRIC CARD */}
              <Card className="p-6 text-center space-y-4 relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/5 dark:from-card-dark dark:to-primary/10 border-primary/20">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span className="font-semibold uppercase tracking-wider">Set {currentSet} of {targetSets}</span>
                  <span className="font-mono font-bold text-primary">Goal: {targetReps} reps</span>
                </div>

                {/* BIG REPS DISPLAY */}
                <div className="relative py-2">
                  <motion.div
                    key={reps}
                    initial={{ scale: 1.25, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="text-7xl font-display font-extrabold text-ink dark:text-white tracking-tight"
                  >
                    {reps}
                  </motion.div>
                  <p className="text-xs uppercase tracking-widest text-ink-muted font-bold mt-1">
                    Total Reps
                  </p>
                </div>

                {/* ARM STAGE BADGE */}
                <div className="flex justify-center">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all ${
                      stage === "up"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-glow"
                        : stage === "down"
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-black/5 dark:bg-white/5 text-ink-muted border-black/10 dark:border-white/10"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        stage === "up"
                          ? "bg-emerald-500 animate-ping"
                          : stage === "down"
                          ? "bg-primary"
                          : "bg-slate-400"
                      }`}
                    />
                    <span>
                      {stage === "up"
                        ? "FULL CONTRACTION (UP)"
                        : stage === "down"
                        ? "ARM EXTENDED (DOWN)"
                        : "READY FOR FIRST REP"}
                    </span>
                  </div>
                </div>

                {/* TARGET PROGRESS BAR */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px] font-semibold text-ink-muted">
                    <span>Set Completion</span>
                    <span>{Math.min(100, Math.round((reps / targetReps) * 100))}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-surface dark:bg-surface-dark rounded-full overflow-hidden border border-black/5 dark:border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (reps / targetReps) * 100)}%` }}
                    />
                  </div>
                </div>
              </Card>

              {/* REAL-TIME ELBOW ANGLE GAUGE */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
                    <Activity size={16} className="text-primary" /> Live Elbow Joint Angle
                  </span>
                  <span className="text-base font-mono font-extrabold text-primary">
                    {currentAngle !== null ? `${currentAngle}°` : "--"}
                  </span>
                </div>

                {/* Angle Gauge Slider */}
                <div className="relative pt-2 pb-1">
                  <div className="h-3 w-full bg-surface dark:bg-surface-dark rounded-full overflow-hidden border border-black/5 dark:border-white/10 relative">
                    <div
                      className="h-full bg-primary transition-all duration-100 rounded-full"
                      style={{
                        width: `${currentAngle !== null ? Math.min(100, (currentAngle / 180) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-muted font-mono mt-1">
                    <span>Flexion (30°)</span>
                    <span>90°</span>
                    <span>Extension (160°)</span>
                  </div>
                </div>
              </Card>

              {/* SECONDARY METRICS: TIMER, CALORIES, FORM ACCURACY */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-3 text-center">
                  <Timer size={16} className="mx-auto text-primary mb-1" />
                  <p className="text-[10px] text-ink-muted uppercase font-bold">Duration</p>
                  <p className="text-sm font-mono font-bold text-ink dark:text-white">
                    {formatTimer(elapsedSeconds)}
                  </p>
                </Card>

                <Card className="p-3 text-center">
                  <Flame size={16} className="mx-auto text-rose-500 mb-1" />
                  <p className="text-[10px] text-ink-muted uppercase font-bold">Burned</p>
                  <p className="text-sm font-mono font-bold text-ink dark:text-white">
                    {Math.round(reps * 0.45 + elapsedSeconds * 0.05)} kcal
                  </p>
                </Card>

                <Card className="p-3 text-center">
                  <ShieldCheck size={16} className="mx-auto text-emerald-500 mb-1" />
                  <p className="text-[10px] text-ink-muted uppercase font-bold">Form Score</p>
                  <p className="text-sm font-mono font-bold text-ink dark:text-white">
                    {formQualityScores.length > 0
                      ? Math.round(
                          formQualityScores.reduce((a, b) => a + b, 0) /
                            formQualityScores.length
                        )
                      : 100}%
                  </p>
                </Card>
              </div>

              {/* LIVE REP CHRONOLOGY LOG (MATCHING WORKOUT_LOG.TXT) */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
                    <History size={15} className="text-primary" /> Live Rep Log
                  </span>
                  <span className="text-[11px] font-mono text-ink-muted">
                    {repLogs.length} reps logged
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {repLogs.length === 0 ? (
                    <p className="text-ink-muted text-center py-6 text-xs italic">
                      Completed reps will appear here with timestamps.
                    </p>
                  ) : (
                    repLogs
                      .slice()
                      .reverse()
                      .map((log) => (
                        <div
                          key={log.rep}
                          className="flex items-center justify-between p-2 rounded-xl bg-surface dark:bg-surface-dark border border-black/5 dark:border-white/5 font-mono text-[11px]"
                        >
                          <span className="font-bold text-primary">Curl #{log.rep}</span>
                          <span className="text-ink-muted">{log.arm} arm • {log.angle}°</span>
                          <span className="text-ink-muted text-[10px]">{log.timestamp}</span>
                        </div>
                      ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : (
          /* TAB 2: WORKOUT HISTORY & PAST SESSIONS */
          <div className="space-y-4">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-display font-bold text-ink dark:text-white flex items-center gap-2">
                    <History size={20} className="text-primary" /> Past AI Bicep Curl Sessions
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Saved workout logs from your camera workouts stored in MongoDB and browser history.
                  </p>
                </div>
              </div>

              {pastSessions.length === 0 ? (
                <div className="text-center py-12 text-ink-muted space-y-2">
                  <Dumbbell size={36} className="mx-auto text-ink-muted/50" />
                  <p className="text-sm font-semibold text-ink dark:text-white">
                    No workout sessions recorded yet.
                  </p>
                  <p className="text-xs">
                    Start a workout in the Live Camera tab to record and save your bicep curls.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastSessions.map((session) => (
                    <Card
                      key={session.id}
                      className="p-4 space-y-3 hover:border-primary/40 transition-all border border-black/10 dark:border-white/10"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-primary flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          {session.title}
                        </span>
                        <span className="text-[11px] text-ink-muted font-mono">
                          {session.date}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 text-center bg-surface dark:bg-surface-dark rounded-xl">
                        <div>
                          <p className="text-[10px] text-ink-muted uppercase">Reps</p>
                          <p className="text-lg font-display font-extrabold text-ink dark:text-white">
                            {session.reps}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-ink-muted uppercase">Duration</p>
                          <p className="text-base font-display font-bold text-ink dark:text-white">
                            {Math.floor(session.duration_seconds / 60)}m {session.duration_seconds % 60}s
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-ink-muted uppercase">Calories</p>
                          <p className="text-base font-display font-bold text-rose-500">
                            {session.calories} kcal
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-ink-muted pt-1">
                        <span>Form: {session.form_accuracy}%</span>
                        <span>{session.rep_logs?.length || session.reps} curls logged</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* SETTINGS DRAWER / MODAL */}
        <AnimatePresence>
          {showSettingsDrawer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card dark:bg-card-dark border border-black/10 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-ink dark:text-white"
              >
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
                  <h3 className="text-base font-display font-bold flex items-center gap-2">
                    <Sliders size={18} className="text-primary" /> Pose Detection Settings
                  </h3>
                  <button
                    onClick={() => setShowSettingsDrawer(false)}
                    className="p-1 rounded-full text-ink-muted hover:text-ink dark:hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Camera Select */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-ink-muted block">Video Camera Device</label>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-xs text-ink dark:text-white"
                    >
                      {cameraDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Arm Preference */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-ink-muted block">Active Arm Tracking</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["auto", "left", "right"] as const).map((arm) => (
                        <button
                          key={arm}
                          onClick={() => setSelectedArm(arm)}
                          className={`py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                            selectedArm === arm
                              ? "bg-primary text-white"
                              : "bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-ink-muted hover:text-ink"
                          }`}
                        >
                          {arm}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Thresholds (Original raxor555 algorithm tuning) */}
                  <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/10">
                    <p className="font-bold text-ink dark:text-white">Angle Thresholds (raxor555 Algorithm)</p>

                    <div className="space-y-1">
                      <div className="flex justify-between text-ink-muted">
                        <span>Down Threshold (Arm Extension):</span>
                        <span className="font-bold text-ink dark:text-white">{downThreshold}°</span>
                      </div>
                      <input
                        type="range"
                        min="130"
                        max="175"
                        value={downThreshold}
                        onChange={(e) => setDownThreshold(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <p className="text-[10px] text-ink-muted">Default: 160°. Angle must exceed this to trigger stage &quot;down&quot;.</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-ink-muted">
                        <span>Up Threshold (Arm Flexion):</span>
                        <span className="font-bold text-ink dark:text-white">{upThreshold}°</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="60"
                        value={upThreshold}
                        onChange={(e) => setUpThreshold(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <p className="text-[10px] text-ink-muted">Default: 30°. Angle must be under this while in stage &quot;down&quot; to register a rep.</p>
                    </div>
                  </div>

                  {/* Target Reps & Sets */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/5 dark:border-white/10">
                    <div>
                      <label className="font-semibold text-ink-muted block mb-1">Target Reps</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={targetReps}
                        onChange={(e) => setTargetReps(Number(e.target.value))}
                        className="w-full p-2 rounded-xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-ink-muted block mb-1">Target Sets</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={targetSets}
                        onChange={(e) => setTargetSets(Number(e.target.value))}
                        className="w-full p-2 rounded-xl bg-surface dark:bg-surface-dark border border-black/10 dark:border-white/10 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-black/5 dark:border-white/10 flex justify-end">
                  <button
                    onClick={() => setShowSettingsDrawer(false)}
                    className="btn-primary py-2 px-6 text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SESSION SUMMARY MODAL */}
        <AnimatePresence>
          {showSummaryModal && lastCompletedSession && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card dark:bg-card-dark border border-black/10 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 text-ink dark:text-white"
              >
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="h-16 w-16 rounded-3xl bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center shadow-glow">
                    <Trophy size={32} />
                  </div>
                  <h2 className="text-2xl font-display font-extrabold">
                    Session Complete!
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Great bicep workout! Here is your performance breakdown.
                  </p>
                </div>

                {/* Main Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-surface dark:bg-surface-dark border border-black/5 dark:border-white/10 text-center">
                  <div>
                    <p className="text-[10px] text-ink-muted uppercase font-bold">Total Reps</p>
                    <p className="text-2xl font-display font-extrabold text-primary">
                      {lastCompletedSession.reps}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted uppercase font-bold">Duration</p>
                    <p className="text-2xl font-display font-extrabold text-ink dark:text-white">
                      {formatTimer(lastCompletedSession.durationSeconds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-muted uppercase font-bold">Calories</p>
                    <p className="text-2xl font-display font-extrabold text-rose-500">
                      {lastCompletedSession.calories}
                    </p>
                  </div>
                </div>

                {/* Form Rating & XP Feedback */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={16} /> Form Quality Score:
                    </span>
                    <span>{lastCompletedSession.formAccuracy}% Excellent</span>
                  </div>

                  {lastCompletedSession.gamification && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={16} /> Gamification XP Earned:
                      </span>
                      <span>+{lastCompletedSession.gamification.xp_earned || 50} XP</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-surface dark:bg-surface-dark border border-black/5 dark:border-white/5 text-ink-muted text-[11px] leading-relaxed">
                    Database status: <span className="text-emerald-500 font-semibold">Saved to workout history in MongoDB</span>. You can export the chronological repetition log below.
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={downloadWorkoutLogFile}
                    className="flex-1 btn-secondary py-3 px-4 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Download size={15} />
                    <span>Download Log File</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowSummaryModal(false);
                      handleResetSession();
                    }}
                    className="flex-1 btn-primary py-3 px-6 text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <span>Done &amp; New Session</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
