"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Card } from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Leaf,
  Camera,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  RefreshCw,
  Upload,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Award,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchTodayMeals,
  fetchNutritionRecommendations,
  searchFoods,
  logMeal,
  scanMealImage,
  ApiError,
  NutritionTargets,
  MealRecommendation,
  FoodItem,
  EvidenceSource,
  MealScanResponse,
} from "@/lib/api";
import { GamificationToastBanner, GamificationToastItem } from "@/components/GamificationToast";

function Macro({
  label,
  consumed,
  goal,
  unit,
  color,
}: {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, Math.round((consumed / goal) * 100));
  const remaining = Math.max(0, goal - consumed);
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium text-ink dark:text-white">{label}</span>
        <span className="text-ink-muted">
          {consumed}{unit} / {goal}{unit}
          <span className="text-xs text-primary ml-2 font-medium">({remaining}{unit} left)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function getDefaultRecommendedMeals(
  dietaryPref: string = "",
  goal: string = "",
  targets: NutritionTargets
): MealRecommendation[] {
  const prefLower = dietaryPref.toLowerCase();
  const isVegan = prefLower.includes("vegan");
  const isVeg = (prefLower.includes("veg") || prefLower.includes("vegetarian")) && !prefLower.includes("non");

  let bfPool = [
    "Besan & paneer chilla with mint coriander chutney",
    "Greek yogurt bowl with mixed berries, chia seeds & granola",
    "Paneer bhurji with multigrain toast",
    "Steamed ragi idlis with lentil sambar",
  ];
  let luPool = [
    "Paneer & quinoa bowl with roasted vegetables & tahini dressing",
    "Dal tadka + rajma with brown rice, cucumber salad & curd",
    "Paneer tikka wrap with mint yogurt & roasted zucchini",
    "Chana masala with millet roti & cucumber kachumber",
  ];
  let dnPool = [
    "Light Dal Makhani with brown rice & mixed vegetables",
    "Palak paneer with bajra roti & fresh salad",
    "Grilled paneer skewers with quinoa pilaf & green beans",
    "Moong dal khichdi with ghee & probiotic curd",
  ];
  let snPool = [
    "Greek yogurt with chia seeds & mixed berries",
    "Roasted chana with lemon spice & green tea",
    "Mixed raw almonds & walnuts with apple slices",
    "Cottage cheese cubes with sea salt & cucumber",
  ];

  if (isVegan) {
    bfPool = [
      "Sprouted moong & besan chilla with mint chutney",
      "Tofu scramble with spinach, mushrooms & toast",
      "Oatmeal with chia seeds, sliced bananas & almond butter",
      "Steamed ragi idlis with flaxseed chutney & sambar",
    ];
    luPool = [
      "Tofu & brown rice power bowl with steamed broccoli",
      "Mediterranean chickpea & avocado salad with quinoa",
      "Rajma masala with brown rice & coconut yogurt",
      "Soy chunk & vegetable biryani with cucumber kachumber",
    ];
    dnPool = [
      "Edamame & vegetable stir-fry with tofu + jasmine rice",
      "Palak tofu curry with bajra roti & green salad",
      "Lentil & pumpkin curry with quinoa & kale",
      "Chickpea coconut curry with red rice & veggies",
    ];
    snPool = [
      "Hummus with cucumber sticks & whole wheat pita",
      "Roasted chana & pumpkin seeds with lemon spice",
      "Mixed raw almonds & walnuts with fresh apple",
      "Plant protein shake with banana & almond milk",
    ];
  } else if (!isVeg) {
    bfPool = [
      "Egg white omelet with spinach, feta & toast",
      "Smoked salmon & avocado whole grain toast with poached egg",
      "Indian spiced egg bhurji with multigrain toast",
      "Turkey breast & avocado breakfast wrap",
    ];
    luPool = [
      "Grilled chicken breast + quinoa + roasted asparagus",
      "Salmon quinoa grain bowl with sweet potatoes & kale",
      "Chicken tikka brown rice bowl with mint chutney",
      "Turkey breast avocado wrap with green salad",
    ];
    dnPool = [
      "Pan-seared salmon fillet + sweet potato mash & green beans",
      "Herb roasted chicken breast + brown rice & grilled veggies",
      "Grilled fish curry with red rice & cucumber salad",
      "Lean beef stir-fry with broccoli & jasmine rice",
    ];
    snPool = [
      "Hard boiled eggs with sea salt & cucumber",
      "Greek yogurt with chia seeds & berries",
      "Whey protein shake with banana",
      "Turkey jerky & almonds with apple slices",
    ];
  }

  const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const randSeed = Math.floor(1000 + Math.random() * 9000);

  const cals = targets.calories || 2200;
  const p = targets.protein_g || 150;
  const c = targets.carbs_g || 220;
  const f = targets.fat_g || 70;
  const fib = targets.fiber_g || 30;

  return [
    {
      id: `ai-${randSeed}-bf`,
      name: "Breakfast",
      time: "7:30 AM",
      items: pickRandom(bfPool),
      calories: Math.round(cals * 0.25),
      protein_g: Math.round(p * 0.25),
      carbs_g: Math.round(c * 0.25),
      fat_g: Math.round(f * 0.25),
      fiber_g: Math.round(fib * 0.25),
    },
    {
      id: `ai-${randSeed}-lu`,
      name: "Lunch",
      time: "12:45 PM",
      items: pickRandom(luPool),
      calories: Math.round(cals * 0.35),
      protein_g: Math.round(p * 0.35),
      carbs_g: Math.round(c * 0.35),
      fat_g: Math.round(f * 0.35),
      fiber_g: Math.round(fib * 0.35),
    },
    {
      id: `ai-${randSeed}-dn`,
      name: "Dinner",
      time: "7:00 PM",
      items: pickRandom(dnPool),
      calories: Math.round(cals * 0.30),
      protein_g: Math.round(p * 0.30),
      carbs_g: Math.round(c * 0.30),
      fat_g: Math.round(f * 0.30),
      fiber_g: Math.round(fib * 0.30),
    },
    {
      id: `ai-${randSeed}-sn`,
      name: "Snacks",
      time: "4:30 PM",
      items: pickRandom(snPool),
      calories: Math.round(cals * 0.10),
      protein_g: Math.round(p * 0.10),
      carbs_g: Math.round(c * 0.10),
      fat_g: Math.round(f * 0.10),
      fiber_g: Math.round(fib * 0.10),
    },
  ];
}

export default function NutritionPage() {
  const { user, token } = useAuth();

  const [loggedTotals, setLoggedTotals] = useState({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
  });
  const [loggedMeals, setLoggedMeals] = useState<any[]>([]);
  const [targets, setTargets] = useState<NutritionTargets>({
    calories: 2200,
    protein_g: 150,
    carbs_g: 220,
    fat_g: 70,
    fiber_g: 30,
  });
  const [recommendedMeals, setRecommendedMeals] = useState<MealRecommendation[]>([]);
  const [evidenceSources, setEvidenceSources] = useState<EvidenceSource[]>([]);
  const [guidanceNotes, setGuidanceNotes] = useState<string[]>([]);
  const [userMetricsSummary, setUserMetricsSummary] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Verified Guidance drawer open/close
  const [showGuidanceDetails, setShowGuidanceDetails] = useState(true);

  // Scan Meal Camera & Image Upload Modal state
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanTab, setScanTab] = useState<"camera" | "upload">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<MealScanResponse | null>(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1.0);

  // Editable Review Form state for scanned meal
  const [scanName, setScanName] = useState("");
  const [scanPortion, setScanPortion] = useState("");
  const [scanCalories, setScanCalories] = useState("");
  const [scanProtein, setScanProtein] = useState("");
  const [scanCarbs, setScanCarbs] = useState("");
  const [scanFat, setScanFat] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Gamification Toasts
  const [gamiToasts, setGamiToasts] = useState<GamificationToastItem[]>([]);

  useEffect(() => {
    if (gamiToasts.length > 0) {
      const timer = setTimeout(() => {
        setGamiToasts((prev) => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [gamiToasts]);

  // Form states (Manual Log)
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const loadMealsAndTargets = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);

    Promise.all([fetchTodayMeals(token), fetchNutritionRecommendations(token)])
      .then(([todayRes, recsRes]) => {
        setLoggedMeals(todayRes.meals || []);
        setLoggedTotals({
          calories: todayRes.totals?.calories || 0,
          protein_g: Math.round(todayRes.totals?.protein_g || 0),
          carbs_g: Math.round(todayRes.totals?.carbs_g || 0),
          fat_g: Math.round(todayRes.totals?.fat_g || 0),
          fiber_g: Math.round(todayRes.totals?.fiber_g || 0),
        });

        if (recsRes?.targets) {
          setTargets(recsRes.targets);
        }
        if (recsRes?.recommended_meals && recsRes.recommended_meals.length > 0) {
          setRecommendedMeals(recsRes.recommended_meals);
        }
        if (recsRes?.evidence_sources) {
          setEvidenceSources(recsRes.evidence_sources);
        }
        if (recsRes?.guidance_notes) {
          setGuidanceNotes(recsRes.guidance_notes);
        }
        if (recsRes?.user_metrics_summary) {
          setUserMetricsSummary(recsRes.user_metrics_summary);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadMealsAndTargets();
  }, [loadMealsAndTargets, user]);

  // Food Search Handler
  useEffect(() => {
    if (!searchQuery.trim() || !token) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setIsSearching(true);
      searchFoods(token, searchQuery)
        .then((items) => setSearchResults(items))
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, token]);

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError("Unable to access device camera. Please upload an image file instead.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (showScanModal && scanTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [showScanModal, scanTab]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setImagePreview(dataUrl);
      setSelectedFile(null);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScanImage = async () => {
    if (!token || (!imagePreview && !selectedFile)) return;
    setIsScanning(true);
    setErrorMsg(null);
    try {
      const imagePayload = selectedFile || imagePreview!;
      const res = await scanMealImage(token, imagePayload, portionMultiplier);
      setScannedResult(res);
      setScanName(res.food_name);
      setScanPortion(res.portion_size);
      setScanCalories(String(res.calories));
      setScanProtein(String(res.protein_g));
      setScanCarbs(String(res.carbs_g));
      setScanFat(String(res.fat_g));
    } catch (err) {
      setErrorMsg("Failed to identify meal. Please check network connection or try a clearer food photo.");
    } finally {
      setIsScanning(false);
    }
  };

  const updatePortionMultiplier = (multiplier: number) => {
    setPortionMultiplier(multiplier);
    if (scannedResult) {
      setScanCalories(String(Math.round(scannedResult.calories * multiplier)));
      setScanProtein(String((scannedResult.protein_g * multiplier).toFixed(1)));
      setScanCarbs(String((scannedResult.carbs_g * multiplier).toFixed(1)));
      setScanFat(String((scannedResult.fat_g * multiplier).toFixed(1)));
    }
  };

  const handleSaveScannedMeal = async () => {
    if (!token || !scanName.trim() || !scanCalories) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await logMeal(token, {
        name: scanName.trim(),
        calories: parseInt(scanCalories, 10) || 0,
        protein_g: parseFloat(scanProtein) || 0,
        carbs_g: parseFloat(scanCarbs) || 0,
        fat_g: parseFloat(scanFat) || 0,
      });

      if (res.gamification) {
        const newToasts: GamificationToastItem[] = [];
        if (res.gamification.xp_gained > 0) {
          newToasts.push({
            id: Math.random().toString(),
            type: "xp",
            title: `+${res.gamification.xp_gained} XP 🎉`,
            description: "Meal scanned & logged to diary!",
          });
        }
        if (res.gamification.leveled_up) {
          newToasts.push({
            id: Math.random().toString(),
            type: "level",
            title: "Level Up! 🚀",
            description: `You reached Level ${res.gamification.level}`,
          });
        }
        setGamiToasts((prev) => [...prev, ...newToasts]);
      }

      setSuccessMsg("Scanned meal verified and logged successfully!");
      setShowScanModal(false);
      setImagePreview(null);
      setSelectedFile(null);
      setScannedResult(null);
      loadMealsAndTargets();

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Could not log scanned meal. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !calories || !token) return;

    const mealName = name.trim();
    const mealCals = parseInt(calories, 10) || 0;

    const isDuplicate = loggedMeals.some(
      (m) => m.name.toLowerCase() === mealName.toLowerCase() && m.calories === mealCals
    );
    if (isDuplicate) {
      setErrorMsg("You have already logged this meal today.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await logMeal(token, {
        name: mealName,
        calories: mealCals,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
      });

      if (res.gamification) {
        const newToasts: GamificationToastItem[] = [];
        if (res.gamification.xp_gained > 0) {
          newToasts.push({
            id: Math.random().toString(),
            type: "xp",
            title: `+${res.gamification.xp_gained} XP 🎉`,
            description: "Meal logged!",
          });
        }
        if (res.gamification.leveled_up) {
          newToasts.push({
            id: Math.random().toString(),
            type: "level",
            title: "Level Up! 🚀",
            description: `You reached Level ${res.gamification.level}`,
          });
        }
        if (res.gamification.new_badges && res.gamification.new_badges.length > 0) {
          res.gamification.new_badges.forEach((b) => {
            newToasts.push({
              id: Math.random().toString(),
              type: "badge",
              title: "New Badge Unlocked! 🏆",
              description: b.name,
            });
          });
        }
        setGamiToasts((prev) => [...prev, ...newToasts]);
      }

      setSuccessMsg("Meal logged successfully!");
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setShowModal(false);
      loadMealsAndTargets();

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Could not log meal. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openModalWithMeal = (mealName: string, mealCals: number, p: number, c: number, f: number) => {
    setName(mealName);
    setCalories(String(mealCals));
    setProtein(String(p));
    setCarbs(String(c));
    setFat(String(f));
    setShowModal(true);
  };

  const totalCalories = loggedTotals.calories;
  const calorieGoal = targets.calories || 2200;
  const caloriesPct = Math.min(100, Math.round((totalCalories / calorieGoal) * 100));
  const remainingCalories = Math.max(0, calorieGoal - totalCalories);

  const displayMeals =
    recommendedMeals.length > 0
      ? recommendedMeals
      : getDefaultRecommendedMeals(user?.dietary_preference || "Vegetarian", user?.fitness_goal || "Build muscle", targets);

  return (
    <>
      <GamificationToastBanner
        toast={gamiToasts[0] || null}
        onClose={() => setGamiToasts((prev) => prev.slice(1))}
      />
      <Topbar
        placeholder="Search foods, recipes, or ICMR-verified meal options..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <main className="px-6 lg:px-10 py-8 space-y-8">
        {/* Header Title Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-ink dark:text-white flex items-center gap-3">
              Nutrition & Precision Guidance
              {user?.dietary_preference && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
                  <Leaf size={12} /> {user.dietary_preference}
                </span>
              )}
            </h1>
            <p className="text-ink-muted mt-1">
              Evidence-based targets for {user?.name || "Athlete"} ({user?.fitness_goal || "Maintain fitness"} • {user?.activity_level || "Lightly active"})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setImagePreview(null);
                setSelectedFile(null);
                setScannedResult(null);
                setCameraError(null);
                setShowScanModal(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2.5 text-sm font-semibold transition-all shadow-sm"
            >
              <Camera size={18} /> Scan Your Meal
            </button>
            <button
              onClick={() => {
                setName("");
                setCalories("");
                setProtein("");
                setCarbs("");
                setFat("");
                setShowModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition-colors"
            >
              <Plus size={18} /> Log Meal
            </button>
          </div>
        </div>

        {/* Search Results Display */}
        {searchQuery.trim() && (
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-semibold text-ink dark:text-white flex items-center gap-2">
                <Search size={16} className="text-primary" /> Search Results for &quot;{searchQuery}&quot;
              </h2>
              <span className="text-xs text-ink-muted">
                Dietary Preference: <strong className="text-primary">{user?.dietary_preference || "Flexible"}</strong>
              </span>
            </div>

            {isSearching ? (
              <div className="flex items-center gap-2 text-sm text-ink-muted py-4">
                <Loader2 size={16} className="animate-spin text-primary" /> Searching database...
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-ink-muted py-2">
                No matching foods found adhering to your <strong>{user?.dietary_preference || "dietary"}</strong> preference.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-xl border border-black/10 dark:border-white/10 p-3 bg-white dark:bg-card-dark"
                  >
                    <div>
                      <h3 className="font-semibold text-sm text-ink dark:text-white">{item.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.dietary_tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                      <span className="text-xs text-ink-muted">
                        P: {item.protein_g}g • C: {item.carbs_g}g • F: {item.fat_g}g
                      </span>
                      <button
                        onClick={() => openModalWithMeal(item.name, item.calories, item.protein_g, item.carbs_g, item.fat_g)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        + Log
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-accent/10 text-accent text-sm px-4 py-3 border border-accent/20">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Macro Gauge Cards & Calorie Ring */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="flex flex-col items-center text-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Calories Today
            </p>
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-black/5 dark:text-white/10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="#D4A373"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - caloriesPct / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-display font-bold text-ink dark:text-white">
                  {totalCalories}
                </span>
                <span className="text-[11px] text-ink-muted">
                  of {calorieGoal} kcal
                </span>
              </div>
            </div>
            <p className="text-xs text-primary font-semibold">
              {remainingCalories} kcal remaining
            </p>
          </Card>

          <Card className="lg:col-span-2 flex flex-col justify-center gap-4">
            <Macro
              label="Protein (ICMR Target)"
              consumed={loggedTotals.protein_g}
              goal={targets.protein_g}
              unit="g"
              color="#2D6A4F"
            />
            <Macro
              label="Carbohydrates"
              consumed={loggedTotals.carbs_g}
              goal={targets.carbs_g}
              unit="g"
              color="#40916C"
            />
            <Macro
              label="Fats (WHO Healthy Limit)"
              consumed={loggedTotals.fat_g}
              goal={targets.fat_g}
              unit="g"
              color="#D4A373"
            />
            <Macro
              label="Dietary Fiber (ICMR-NIN Target)"
              consumed={loggedTotals.fiber_g}
              goal={targets.fiber_g || 30}
              unit="g"
              color="#52B788"
            />
          </Card>
        </div>

        {/* Logged Meals & Recommended Meal Plans */}
        <Card>
          <h2 className="text-lg font-display font-semibold text-ink dark:text-white mb-4">
            Today&apos;s Logged Meals ({loggedMeals.length})
          </h2>

          {loggedMeals.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No meals logged today yet. Click &quot;Scan Your Meal&quot; or &quot;Log Meal&quot; above to track!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {loggedMeals.map((m, idx) => (
                <div
                  key={m._id || idx}
                  className="rounded-xl border border-black/10 dark:border-white/10 p-4 bg-black/5 dark:bg-white/5"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-ink dark:text-white">{m.name}</h3>
                    <span className="text-sm font-semibold text-primary">{m.calories} kcal</span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    P: {m.protein_g}g • C: {m.carbs_g}g • F: {m.fat_g}g
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-8 mb-4">
            <div>
              <h2 className="text-lg font-display font-semibold text-ink dark:text-white flex items-center gap-2">
                Recommended Evidence-Based Meal Plans <Sparkles size={16} className="text-accent" />
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Tailored for {user?.dietary_preference || "Vegetarian"} • {user?.fitness_goal || "Build muscle"} • ICMR IFCT Aligned
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayMeals.map((meal) => (
              <div
                key={meal.id}
                className="rounded-xl border border-black/5 dark:border-white/10 p-4 hover:border-primary transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-ink dark:text-white">{meal.name}</h3>
                    <span className="text-xs text-ink-muted">{meal.time}</span>
                  </div>
                  <p className="text-sm text-ink-muted mb-3 leading-relaxed">{meal.items}</p>
                </div>
                <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-primary block">{meal.calories} kcal</span>
                    <span className="text-[11px] text-ink-muted">
                      P: {meal.protein_g}g • C: {meal.carbs_g}g • F: {meal.fat_g}g
                    </span>
                  </div>
                  <button
                    onClick={() => openModalWithMeal(meal.items, meal.calories, meal.protein_g, meal.carbs_g, meal.fat_g)}
                    className="text-xs font-semibold text-white bg-primary hover:bg-secondary px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Nutritionist / Verified Guidance Section */}
        <Card className="space-y-4 border border-primary/20 bg-emerald-950/10 dark:bg-card-dark">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="text-lg font-display font-semibold text-ink dark:text-white flex items-center gap-2">
                  Verified Guidance & Evidence-Based Science
                  <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    ICMR-NIN & WHO
                  </span>
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Scientific nutrition standards tailored to your body metrics and daily energy expenditure
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuidanceDetails(!showGuidanceDetails)}
              className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
            >
              {showGuidanceDetails ? (
                <>
                  Hide Details <ChevronUp size={14} />
                </>
              ) : (
                <>
                  View Guidelines <ChevronDown size={14} />
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {showGuidanceDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 pt-2 border-t border-black/5 dark:border-white/10"
              >
                {/* Verified Reference Sources Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(evidenceSources.length > 0
                    ? evidenceSources
                    : [
                        {
                          name: "ICMR-NIN Dietary Guidelines (2024)",
                          authority: "Indian Council of Medical Research - NIN",
                          summary:
                            "Recommends 50-56% complex carbs, 10-15% protein (0.83-2.0g/kg based on activity), 20-30% healthy fats, min 30g dietary fiber, and a 3:1 cereal-pulse ratio.",
                          reference_url: "https://www.nin.res.in/dietaryguidelines/",
                        },
                        {
                          name: "WHO Healthy Diet Standards",
                          authority: "World Health Organization",
                          summary:
                            "Advises total fat intake <30% of energy, free sugars <5-10%, salt <5g/day, and at least 400g of fruits & vegetables per day.",
                          reference_url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
                        },
                        {
                          name: "ICMR IFCT & USDA Database",
                          authority: "Indian Food Composition Tables & USDA",
                          summary:
                            "Validated nutritional composition reference for accurate macronutrient and micronutrient tracking.",
                          reference_url: "https://fdc.nal.usda.gov/",
                        },
                      ]
                  ).map((src, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-black/10 dark:border-white/10 p-3.5 bg-white dark:bg-card-dark flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
                            <BookOpen size={13} className="text-primary" /> {src.name}
                          </h3>
                        </div>
                        <p className="text-[11px] font-semibold text-primary mb-1.5">{src.authority}</p>
                        <p className="text-xs text-ink-muted leading-relaxed">{src.summary}</p>
                      </div>
                      {src.reference_url && (
                        <a
                          href={src.reference_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          View Official Document <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Guidance Notes & Metrics Summary */}
                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Award size={14} /> Nutritionist Tailored Recommendations
                  </h3>
                  <div className="space-y-2">
                    {(guidanceNotes.length > 0
                      ? guidanceNotes
                      : [
                          `Goal-Based Target: Formulated based on your '${user?.fitness_goal || "Maintain fitness"}' goal following ICMR-NIN recommendations.`,
                          "Cereal-to-Pulse Synergy: Combine grains and lentils in a 3:1 ratio for a complete amino acid profile.",
                          "Fiber & Hydration: Maintain 30g+ dietary fiber and 2.5 - 3.5L daily hydration.",
                        ]
                    ).map((note, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-ink dark:text-gray-200">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>

                  {/* Summary Metric Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary/10">
                    <span className="text-[11px] font-semibold bg-white dark:bg-card-dark text-ink dark:text-white px-3 py-1 rounded-lg border border-black/5 dark:border-white/10">
                      Target Protein: <strong className="text-primary">{userMetricsSummary.protein_per_kg || "1.8 g/kg"}</strong>
                    </span>
                    <span className="text-[11px] font-semibold bg-white dark:bg-card-dark text-ink dark:text-white px-3 py-1 rounded-lg border border-black/5 dark:border-white/10">
                      Target Fiber: <strong className="text-primary">{userMetricsSummary.fiber_target || "30 g/day"}</strong>
                    </span>
                    <span className="text-[11px] font-semibold bg-white dark:bg-card-dark text-ink dark:text-white px-3 py-1 rounded-lg border border-black/5 dark:border-white/10">
                      Hydration: <strong className="text-primary">{userMetricsSummary.recommended_water || "3.0 L/day"}</strong>
                    </span>
                    <span className="text-[11px] font-semibold bg-white dark:bg-card-dark text-ink dark:text-white px-3 py-1 rounded-lg border border-black/5 dark:border-white/10">
                      Amino Synergy: <strong className="text-primary">{userMetricsSummary.cereal_pulse_ratio || "3:1 Ratio"}</strong>
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </main>

      {/* Manual Log Meal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-card w-full max-w-md rounded-2xl p-6 shadow-xl border border-black/10 dark:border-white/10">
            <h3 className="text-lg font-bold text-ink dark:text-white mb-4">Log Today&apos;s Meal</h3>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 text-xs text-error bg-error/10 p-3 rounded-xl">
                <AlertCircle size={15} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogMeal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                  Meal Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Quinoa Bowl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="550"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    placeholder="30"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    placeholder="60"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    placeholder="18"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-primary text-white px-5 py-2 text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={15} className="animate-spin" />}
                  {submitting ? "Saving..." : "Save Meal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prominent "Scan Your Meal" Modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="surface-card w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-primary/30 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary text-white">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink dark:text-white">Scan Your Meal</h3>
                  <p className="text-xs text-ink-muted">AI-powered food recognition & macro estimation</p>
                </div>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setShowScanModal(false);
                }}
                className="text-ink-muted hover:text-ink dark:hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-xs text-error bg-error/10 p-3 rounded-xl border border-error/20">
                <AlertCircle size={15} /> {errorMsg}
              </div>
            )}

            {/* If meal is not scanned yet, show Camera/Upload interface */}
            {!scannedResult ? (
              <div className="space-y-4">
                {/* Tab Switcher */}
                <div className="flex rounded-xl bg-black/5 dark:bg-white/5 p-1 border border-black/5 dark:border-white/5">
                  <button
                    onClick={() => setScanTab("camera")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      scanTab === "camera"
                        ? "bg-primary text-white shadow-sm"
                        : "text-ink-muted hover:text-ink dark:hover:text-white"
                    }`}
                  >
                    <Camera size={14} /> Live Camera
                  </button>
                  <button
                    onClick={() => setScanTab("upload")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                      scanTab === "upload"
                        ? "bg-primary text-white shadow-sm"
                        : "text-ink-muted hover:text-ink dark:hover:text-white"
                    }`}
                  >
                    <Upload size={14} /> Upload Image
                  </button>
                </div>

                {scanTab === "camera" ? (
                  <div className="space-y-3">
                    <div className="relative aspect-video rounded-xl bg-black overflow-hidden border border-black/20 dark:border-white/10 flex items-center justify-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Captured Meal" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                          />
                          <canvas ref={canvasRef} className="hidden" />
                          {!cameraActive && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center space-y-2">
                              {cameraError ? (
                                <p className="text-xs text-red-400">{cameraError}</p>
                              ) : (
                                <Loader2 size={24} className="animate-spin text-primary" />
                              )}
                              <button
                                onClick={startCamera}
                                className="text-xs bg-primary px-3 py-1.5 rounded-lg font-semibold"
                              >
                                Retry Camera Access
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      {imagePreview ? (
                        <button
                          onClick={() => {
                            setImagePreview(null);
                            startCamera();
                          }}
                          className="flex-1 py-2 text-xs font-semibold rounded-xl border border-black/10 dark:border-white/10 text-ink dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw size={14} /> Retake Photo
                        </button>
                      ) : (
                        <button
                          onClick={capturePhoto}
                          disabled={!cameraActive}
                          className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-secondary disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-md"
                        >
                          <Camera size={16} /> Capture Photo
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-primary/30 rounded-2xl p-6 text-center bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {imagePreview ? (
                        <div className="space-y-2">
                          <img
                            src={imagePreview}
                            alt="Selected Meal"
                            className="max-h-48 mx-auto rounded-xl object-cover border border-black/10 dark:border-white/10"
                          />
                          <p className="text-xs text-primary font-semibold">Click or drag another image to replace</p>
                        </div>
                      ) : (
                        <div className="space-y-2 py-4">
                          <Upload size={32} className="mx-auto text-primary" />
                          <p className="text-sm font-semibold text-ink dark:text-white">
                            Click or drag a photo of your meal here
                          </p>
                          <p className="text-xs text-ink-muted">Supports JPG, PNG, WebP (Max 5MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scan Trigger Button */}
                {imagePreview && (
                  <button
                    onClick={handleScanImage}
                    disabled={isScanning}
                    className="w-full py-3 text-sm font-bold rounded-xl bg-gradient-to-r from-primary to-emerald-600 text-white hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Analyzing Food & Macros with ML...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} /> Analyze Meal Image with AI
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : (
              /* Review and Correct Detected Information Screen (Requirement) */
              <div className="space-y-4">
                {/* Image & Confidence Banner */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Scanned Food"
                      className="w-16 h-16 rounded-lg object-cover border border-primary/30"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary flex items-center gap-1">
                        <Sparkles size={12} /> ML Detection Complete
                      </span>
                      <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {Math.round(scannedResult.confidence * 100)}% Confidence
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-1 leading-snug">{scannedResult.breakdown}</p>
                  </div>
                </div>

                {/* Important Disclaimer Notice */}
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <Info size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>Review & Adjust Required:</strong> Image-based calorie estimation is an ML estimate. Please review and edit the detected food items and portion sizes below before logging to your food diary.
                  </span>
                </div>

                {/* Quick Portion Multipliers */}
                <div>
                  <label className="block text-xs font-semibold text-ink dark:text-white mb-1.5">
                    Portion Multiplier Scale
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.5, 1.0, 1.5, 2.0].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updatePortionMultiplier(m)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          portionMultiplier === m
                            ? "bg-primary text-white border-primary"
                            : "border-black/10 dark:border-white/10 text-ink dark:text-white hover:border-primary"
                        }`}
                      >
                        {m}x Portion
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable Detected Meal Form */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                      Detected Food Item Name
                    </label>
                    <input
                      type="text"
                      required
                      value={scanName}
                      onChange={(e) => setScanName(e.target.value)}
                      className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                      Serving & Portion Size
                    </label>
                    <input
                      type="text"
                      value={scanPortion}
                      onChange={(e) => setScanPortion(e.target.value)}
                      className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                        Calories (kcal)
                      </label>
                      <input
                        type="number"
                        required
                        value={scanCalories}
                        onChange={(e) => setScanCalories(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary font-bold text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={scanProtein}
                        onChange={(e) => setScanProtein(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                        Carbohydrates (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={scanCarbs}
                        onChange={(e) => setScanCarbs(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink dark:text-white mb-1">
                        Fats (g)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={scanFat}
                        onChange={(e) => setScanFat(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-card-dark border border-black/10 dark:border-white/10 px-3 py-2 text-sm text-ink dark:text-white outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Final Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setScannedResult(null);
                    }}
                    className="rounded-xl border border-black/10 dark:border-white/10 px-4 py-2 text-sm text-ink-muted hover:text-ink transition-colors"
                  >
                    Rescan
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveScannedMeal}
                    disabled={submitting}
                    className="rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-bold hover:bg-secondary transition-colors disabled:opacity-60 flex items-center gap-2 shadow-md"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting ? "Saving..." : "Confirm & Log to Diary"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
