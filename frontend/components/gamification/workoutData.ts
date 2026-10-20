// Gamification section — Push / Pull / Legs workout data
// All pose landmark indices adhere to MediaPipe Pose (33-point model)

export type ExerciseCategory = "push" | "pull" | "legs";
export type MobilityLevel = "standard" | "beginner" | "strict";

export type ToleranceRange = {
  startThreshold: number;
  inflectionThreshold: number;
  label: string;
};

export type SecondaryCheckDef = {
  id: string;
  name: string;
  cueText: string;
  type: "knee_cave" | "hip_sag" | "elbow_flare" | "back_arch" | "arm_height" | "torso_lean";
};

export type PoseJointConfig = {
  primaryJointName: string;
  // MediaPipe landmark indices [A, B (vertex), C]
  landmarkIndices: [number, number, number];
  // Alternative side (left vs right body) — picker selects higher visibility side
  altLandmarkIndices?: [number, number, number];
  // Movement direction:
  // "flexion" = starts high (straight limb), bends to low angle, returns to high angle (e.g. Squat, Curl, Push-up, Bench Press)
  // "extension" = starts low (bent/adducted), extends to high angle, returns to low angle (e.g. Shoulder Press, Lateral Raise, Calf Raise, Glute Bridge)
  direction: "flexion" | "extension";
  // Default inflection angle trigger (contracted/bottom phase)
  bottomAngleMax: number;
  // Default start/completion angle trigger (lockout/neutral phase)
  topAngleMin: number;
  // Mobility profile thresholds
  mobilityProfiles: Record<MobilityLevel, ToleranceRange>;
  // Ideal range label shown to user
  targetRangeLabel: string;
  // Phase labels
  bottomPhaseLabel: string;
  topPhaseLabel: string;
  // Actionable corrective cues
  formCues: string[];
  // Secondary biomechanical checks
  secondaryChecks?: SecondaryCheckDef[];
  // Recommended camera placement note
  cameraAngleNote?: string;
};

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscles: string[];
  secondaryMuscles: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  equipment: "Barbell" | "Dumbbell" | "Cable" | "Bodyweight" | "Machine";
  viewOrientation: "side" | "front" | "lying_side" | "prone_side";
  animationType:
    | "bench_press"
    | "incline_press"
    | "shoulder_press"
    | "lateral_raise"
    | "tricep_pushdown"
    | "overhead_tricep"
    | "push_up"
    | "lat_pulldown"
    | "cable_row"
    | "dumbbell_row"
    | "bicep_curl"
    | "hammer_curl"
    | "face_pull"
    | "rear_delt"
    | "squat"
    | "leg_press"
    | "rdl"
    | "lunge"
    | "leg_extension"
    | "leg_curl"
    | "calf_raise"
    | "glute_bridge";
  instructions: string[];
  formTips: string[];
  commonMistakes: string[];
  poseConfig: PoseJointConfig;
  xpPerRep: number;
  caloriesPerRep: number;
};

// ==========================================
// 1. PUSH DAY EXERCISES (7)
// ==========================================
const pushExercises: Exercise[] = [
  {
    id: "bench_press",
    name: "Bench Press",
    category: "push",
    muscles: ["Chest", "Triceps", "Anterior Deltoids"],
    secondaryMuscles: ["Lats", "Serratus Anterior"],
    difficulty: "Intermediate",
    equipment: "Barbell",
    viewOrientation: "lying_side",
    animationType: "bench_press",
    instructions: [
      "Lie flat on the bench with eyes under the barbell, feet planted firmly.",
      "Grip the bar slightly wider than shoulder-width with wrists straight.",
      "Unrack with straight arms and stabilize over mid-chest.",
      "Lower the barbell under control until it gently touches mid-chest (~90° elbow).",
      "Drive feet into the floor and press bar up explosively back to lockout.",
    ],
    formTips: [
      "Keep elbows tucked at a 45–60° angle — avoid flared 90° elbows.",
      "Retract and depress shoulder blades into the bench pad.",
      "Keep glutes and upper back in contact with bench throughout the press.",
    ],
    commonMistakes: [
      "Bouncing barbell off ribcage",
      "Elbows flaring excessively out to sides",
      "Lifting hips off the bench during drive",
    ],
    poseConfig: {
      primaryJointName: "Elbow",
      landmarkIndices: [12, 14, 16], // right shoulder -> elbow -> wrist
      altLandmarkIndices: [11, 13, 15],
      direction: "flexion",
      bottomAngleMax: 95,
      topAngleMin: 155,
      mobilityProfiles: {
        standard: { startThreshold: 155, inflectionThreshold: 95, label: "Standard (90–95° depth)" },
        beginner: { startThreshold: 145, inflectionThreshold: 105, label: "Beginner ROM (100–105°)" },
        strict: { startThreshold: 165, inflectionThreshold: 85, label: "Strict Chest Touch (80–85°)" },
      },
      targetRangeLabel: "Elbow: 85–95° at bottom",
      bottomPhaseLabel: "Lower to Chest",
      topPhaseLabel: "Press to Lockout",
      formCues: [
        "Tuck elbows to 45° from torso — don't flare wide.",
        "Retract shoulder blades tight into the bench.",
        "Maintain wrist stacked over elbow joint.",
      ],
      secondaryChecks: [
        {
          id: "elbow_flare",
          name: "Elbow Flare",
          cueText: "Elbows flaring too wide! Tuck elbows closer to 45°.",
          type: "elbow_flare",
        },
      ],
      cameraAngleNote: "Position camera to your side at bench height for clear elbow tracking.",
    },
    xpPerRep: 3,
    caloriesPerRep: 0.5,
  },
  {
    id: "incline_dumbbell_press",
    name: "Incline Dumbbell Press",
    category: "push",
    muscles: ["Upper Chest", "Anterior Deltoids", "Triceps"],
    secondaryMuscles: ["Rotator Cuff", "Core"],
    difficulty: "Intermediate",
    equipment: "Dumbbell",
    viewOrientation: "side",
    animationType: "incline_press",
    instructions: [
      "Set incline bench to 30–45 degrees.",
      "Bring dumbbells to upper chest level with palms facing forward.",
      "Retract shoulder blades and brace core tight.",
      "Press dumbbells up and slightly inward in an arc overhead.",
      "Lower with control until dumbbells align with chest level.",
    ],
    formTips: [
      "Don't let incline angle exceed 45° or shoulders take over.",
      "Squeeze upper pectorals together at top contraction.",
      "Control the 2-second eccentric lowering phase.",
    ],
    commonMistakes: [
      "Clanking dumbbells violently at top",
      "Arching lower back off the pad excessively",
      "Dropping elbows too deep below shoulder plane",
    ],
    poseConfig: {
      primaryJointName: "Elbow",
      landmarkIndices: [12, 14, 16],
      altLandmarkIndices: [11, 13, 15],
      direction: "flexion",
      bottomAngleMax: 100,
      topAngleMin: 152,
      mobilityProfiles: {
        standard: { startThreshold: 152, inflectionThreshold: 100, label: "Standard (95–100°)" },
        beginner: { startThreshold: 140, inflectionThreshold: 110, label: "Beginner ROM (105–110°)" },
        strict: { startThreshold: 160, inflectionThreshold: 90, label: "Full Depth (85–90°)" },
      },
      targetRangeLabel: "Elbow: 90–100° at bottom",
      bottomPhaseLabel: "Lower Down",
      topPhaseLabel: "Press Up",
      formCues: [
        "Control descent — don't let elbows drop below shoulder level.",
        "Squeeze upper chest at top of movement.",
        "Keep wrists stacked vertically over elbows.",
      ],
      cameraAngleNote: "Side-diagonal camera angle captures incline pressing path cleanly.",
    },
    xpPerRep: 3,
    caloriesPerRep: 0.45,
  },
  {
    id: "shoulder_press",
    name: "Shoulder Press",
    category: "push",
    muscles: ["Deltoids", "Triceps", "Upper Traps"],
    secondaryMuscles: ["Core", "Upper Chest"],
    difficulty: "Intermediate",
    equipment: "Dumbbell",
    viewOrientation: "front",
    animationType: "shoulder_press",
    instructions: [
      "Hold dumbbells at shoulder level, palms forward or semi-neutral.",
      "Brace glutes and core to keep spine neutral.",
      "Press weights vertically overhead in a smooth path.",
      "Reach full overhead extension without shrugging traps to ears.",
      "Lower under control back to shoulder height.",
    ],
    formTips: [
      "Avoid arching lower back — engage core like a plank.",
      "Push head slightly forward through the window at top lockout.",
      "Breathe out on the press, inhale on the descent.",
    ],
    commonMistakes: [
      "Excessive lumbar arching when pressing heavy",
      "Incomplete lockout overhead",
      "Dropping elbows too low below collarbone",
    ],
    poseConfig: {
      primaryJointName: "Elbow & Shoulder",
      landmarkIndices: [14, 12, 24], // elbow -> shoulder -> hip
      altLandmarkIndices: [13, 11, 23],
      direction: "extension",
      bottomAngleMax: 95,
      topAngleMin: 155,
      mobilityProfiles: {
        standard: { startThreshold: 95, inflectionThreshold: 155, label: "Standard (155°+ overhead)" },
        beginner: { startThreshold: 100, inflectionThreshold: 145, label: "Gentle (145°+ overhead)" },
        strict: { startThreshold: 90, inflectionThreshold: 165, label: "Strict Lockout (165°+)" },
      },
      targetRangeLabel: "Press overhead to ~160°",
      bottomPhaseLabel: "Lower to Shoulders",
      topPhaseLabel: "Press Overhead",
      formCues: [
        "Brace core tight — avoid hyperextending your lower back.",
        "Don't shrug shoulders up into ears.",
        "Press straight overhead, not forward.",
      ],
      secondaryChecks: [
        {
          id: "back_arch",
          name: "Lower Back Arch",
          cueText: "Torso leaning back! Squeeze glutes and brace core.",
          type: "back_arch",
        },
      ],
      cameraAngleNote: "Front view works best to track both arms overhead simultaneously.",
    },
    xpPerRep: 3,
    caloriesPerRep: 0.4,
  },
  {
    id: "lateral_raises",
    name: "Lateral Raises",
    category: "push",
    muscles: ["Lateral Deltoids"],
    secondaryMuscles: ["Trapezius", "Forearms"],
    difficulty: "Beginner",
    equipment: "Dumbbell",
    viewOrientation: "front",
    animationType: "lateral_raise",
    instructions: [
      "Stand tall holding dumbbells at thighs with slight forward torso lean.",
      "Keep a subtle 10–15° bend in elbows.",
      "Raise arms out to sides in scapular plane until parallel to floor (90°).",
      "Lead with elbows, keeping pinkies slightly higher than thumbs.",
      "Lower slowly over 3 seconds to starting position.",
    ],
    formTips: [
      "Never swing body or use momentum — isolate the side delt.",
      "Stop at parallel to avoid shoulder impingement.",
      "Imagine pouring water out of pitchers at the top.",
    ],
    commonMistakes: [
      "Using torso swinging / hip thrust to launch weights",
      "Raising arms way above shoulder height",
      "Shrugging traps excessively",
    ],
    poseConfig: {
      primaryJointName: "Shoulder Abduction",
      landmarkIndices: [14, 12, 24], // elbow -> shoulder -> hip
      altLandmarkIndices: [13, 11, 23],
      direction: "extension",
      bottomAngleMax: 30,
      topAngleMin: 80,
      mobilityProfiles: {
        standard: { startThreshold: 30, inflectionThreshold: 80, label: "Standard (80–90° raise)" },
        beginner: { startThreshold: 35, inflectionThreshold: 70, label: "Gentle (70–75°)" },
        strict: { startThreshold: 25, inflectionThreshold: 88, label: "Strict Parallel (85–90°)" },
      },
      targetRangeLabel: "Raise arms to 80–90°",
      bottomPhaseLabel: "Lower to Sides",
      topPhaseLabel: "Raise to Parallel",
      formCues: [
        "Control the movement — avoid body swing or momentum.",
        "Raise to shoulder level (90° max) — protect rotator cuffs.",
        "Lead with elbows, not wrists.",
      ],
      secondaryChecks: [
        {
          id: "arm_height",
          name: "Over-Elevation",
          cueText: "Arms raised too high! Stop at shoulder height (90°).",
          type: "arm_height",
        },
      ],
      cameraAngleNote: "Front camera view required to track both arm abduction angles.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.25,
  },
  {
    id: "tricep_pushdowns",
    name: "Triceps Pushdowns",
    category: "push",
    muscles: ["Triceps Lateral Head", "Triceps Medial Head"],
    secondaryMuscles: ["Triceps Long Head", "Forearms"],
    difficulty: "Beginner",
    equipment: "Cable",
    viewOrientation: "side",
    animationType: "tricep_pushdown",
    instructions: [
      "Stand facing cable stack with bar or rope attachment at chest height.",
      "Pin elbows tight against your ribs with a slight forward torso hinge.",
      "Push attachment down toward thighs until arms are fully locked out.",
      "Squeeze triceps intensely at full contraction for 1 second.",
      "Allow forearms to rise back to 90° while keeping upper arms pinned.",
    ],
    formTips: [
      "Upper arms must stay completely motionless throughout.",
      "Don't lean forward with whole body to press the weight down.",
      "Spread rope attachment apart at the bottom for peak squeeze.",
    ],
    commonMistakes: [
      "Elbows drifting forward and backward like a row",
      "Using body weight to press down instead of triceps",
      "Incomplete lockout at the bottom",
    ],
    poseConfig: {
      primaryJointName: "Elbow Extension",
      landmarkIndices: [12, 14, 16], // shoulder -> elbow -> wrist
      altLandmarkIndices: [11, 13, 15],
      direction: "extension",
      bottomAngleMax: 85,
      topAngleMin: 155,
      mobilityProfiles: {
        standard: { startThreshold: 85, inflectionThreshold: 155, label: "Standard (155°+ lockout)" },
        beginner: { startThreshold: 90, inflectionThreshold: 145, label: "Beginner (145°+ extension)" },
        strict: { startThreshold: 80, inflectionThreshold: 165, label: "Full Lockout (165°+)" },
      },
      targetRangeLabel: "Elbow: 85° start → 160° lockout",
      bottomPhaseLabel: "Return to 90°",
      topPhaseLabel: "Push to Lockout",
      formCues: [
        "Keep elbows stationary at your ribs — don't let them drift forward.",
        "Full extension at the bottom for peak tricep contraction.",
        "Control the negative — don't let weight stack bounce back.",
      ],
      cameraAngleNote: "Side-view camera ensures upper-arm stillness can be monitored.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.3,
  },
  {
    id: "overhead_tricep",
    name: "Overhead Triceps Extensions",
    category: "push",
    muscles: ["Triceps Long Head"],
    secondaryMuscles: ["Triceps Lateral Head", "Core"],
    difficulty: "Intermediate",
    equipment: "Dumbbell",
    viewOrientation: "front",
    animationType: "overhead_tricep",
    instructions: [
      "Sit or stand tall holding dumbbell overhead with both hands under top plate.",
      "Keep upper arms vertical and elbows tucked close to ears.",
      "Bend elbows to lower weight behind your head until deep tricep stretch.",
      "Extend forearms explosively back to overhead lockout.",
      "Keep core tight to avoid excessive lower back curvature.",
    ],
    formTips: [
      "Don't let elbows flare outward to sides.",
      "Upper arms remain vertical; only forearms hinge.",
      "Feel the deep stretch in long head of triceps at bottom.",
    ],
    commonMistakes: [
      "Elbows flaring wide like butterfly wings",
      "Moving upper arms forward and back",
      "Arching lower spine",
    ],
    poseConfig: {
      primaryJointName: "Elbow Angle",
      landmarkIndices: [12, 14, 16],
      altLandmarkIndices: [11, 13, 15],
      direction: "flexion",
      bottomAngleMax: 85,
      topAngleMin: 150,
      mobilityProfiles: {
        standard: { startThreshold: 150, inflectionThreshold: 85, label: "Standard (80–85° stretch)" },
        beginner: { startThreshold: 140, inflectionThreshold: 95, label: "Gentle (90–95°)" },
        strict: { startThreshold: 160, inflectionThreshold: 75, label: "Deep Stretch (70–75°)" },
      },
      targetRangeLabel: "Elbow: 80° bottom → 155° top",
      bottomPhaseLabel: "Lower Behind Head",
      topPhaseLabel: "Extend Overhead",
      formCues: [
        "Keep elbows tucked forward close to ears — don't flare.",
        "Keep upper arms vertical — only forearms move.",
        "Full overhead lockout with peak squeeze.",
      ],
      cameraAngleNote: "Front or 3/4 camera view captures overhead arm extension clearly.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.3,
  },
  {
    id: "push_ups",
    name: "Push-ups",
    category: "push",
    muscles: ["Chest", "Core", "Triceps", "Anterior Deltoids"],
    secondaryMuscles: ["Glutes", "Serratus Anterior"],
    difficulty: "Beginner",
    equipment: "Bodyweight",
    viewOrientation: "side",
    animationType: "push_up",
    instructions: [
      "Set hands on floor slightly wider than shoulders, fingers pointed forward.",
      "Form a straight rigid plank from top of head to heels, core locked.",
      "Lower chest toward floor by bending elbows back at ~45°.",
      "Descend until chest is 2 inches off floor (elbows at 90° or less).",
      "Push floor away powerfully back to full plank extension.",
    ],
    formTips: [
      "Squeeze glutes and brace abs to prevent sagging lower back.",
      "Don't crane neck down toward floor; keep neck neutral.",
      "Elbows track backward at 45°, never flared at 90°.",
    ],
    commonMistakes: [
      "Hips sagging down or piking up in air",
      "Incomplete depth (half push-ups)",
      "Flaring elbows straight out to sides",
    ],
    poseConfig: {
      primaryJointName: "Elbow Angle",
      landmarkIndices: [12, 14, 16],
      altLandmarkIndices: [11, 13, 15],
      direction: "flexion",
      bottomAngleMax: 90,
      topAngleMin: 155,
      mobilityProfiles: {
        standard: { startThreshold: 155, inflectionThreshold: 90, label: "Standard (90° depth)" },
        beginner: { startThreshold: 145, inflectionThreshold: 105, label: "Beginner Depth (100–105°)" },
        strict: { startThreshold: 165, inflectionThreshold: 80, label: "Chest to Floor (75–80°)" },
      },
      targetRangeLabel: "Elbow: ≤90° at bottom",
      bottomPhaseLabel: "Lower Chest",
      topPhaseLabel: "Push to Plank",
      formCues: [
        "Lock core tight — maintain straight line from shoulders to heels.",
        "Elbows at 45° angle, not flared 90° sideways.",
        "Push floor away for full lockout at the top.",
      ],
      secondaryChecks: [
        {
          id: "hip_sag",
          name: "Plank Line",
          cueText: "Hips sagging or piking! Squeeze glutes and tuck pelvis.",
          type: "hip_sag",
        },
      ],
      cameraAngleNote: "Side-profile camera at ground level gives best tracking of plank & depth.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.35,
  },
];

// ==========================================
// 2. PULL DAY EXERCISES (7)
// ==========================================
const pullExercises: Exercise[] = [
  {
    id: "lat_pulldowns",
    name: "Lat Pulldowns",
    category: "pull",
    muscles: ["Latissimus Dorsi", "Biceps", "Rhomboids"],
    secondaryMuscles: ["Teres Major", "Posterior Deltoids"],
    difficulty: "Beginner",
    equipment: "Cable",
    viewOrientation: "front",
    animationType: "lat_pulldown",
    instructions: [
      "Grip wide lat bar with overhand grip wider than shoulder-width.",
      "Sit with thighs snug under thigh pads, slight 10–15° torso lean.",
      "Depress shoulders first, then drive elbows down toward ribs.",
      "Pull bar smoothly to upper chest (clavicle level).",
      "Slowly extend arms up for full lat stretch at the top.",
    ],
    formTips: [
      "Pull with your lats and elbows, not by gripping tight with biceps.",
      "Never pull bar behind neck — causes severe rotator cuff stress.",
      "Keep chest lifted proud toward the bar.",
    ],
    commonMistakes: [
      "Swinging torso backward like a rowing machine",
      "Pulling bar down to stomach instead of clavicle",
      "Releasing weight stack without controlled negative",
    ],
    poseConfig: {
      primaryJointName: "Shoulder & Elbow",
      landmarkIndices: [14, 12, 24], // elbow -> shoulder -> hip
      altLandmarkIndices: [13, 11, 23],
      direction: "flexion",
      bottomAngleMax: 65,
      topAngleMin: 150,
      mobilityProfiles: {
        standard: { startThreshold: 150, inflectionThreshold: 65, label: "Standard (55–65° pull)" },
        beginner: { startThreshold: 140, inflectionThreshold: 75, label: "Beginner (70–75°)" },
        strict: { startThreshold: 160, inflectionThreshold: 55, label: "Deep Squeeze (50–55°)" },
      },
      targetRangeLabel: "Shoulder angle: 55–65° at bottom",
      bottomPhaseLabel: "Pull to Chest",
      topPhaseLabel: "Full Overhead Stretch",
      formCues: [
        "Drive elbows down and back — squeeze your armpits.",
        "Don't lean excessively back — keep torso stable at ~15°.",
        "Full stretch at top to elongate lats under tension.",
      ],
      secondaryChecks: [
        {
          id: "torso_lean",
          name: "Excessive Lean",
          cueText: "Leaning too far back! Keep torso steady at 15°.",
          type: "torso_lean",
        },
      ],
      cameraAngleNote: "Front view captures both sides of bar path and elbow depression.",
    },
    xpPerRep: 3,
    caloriesPerRep: 0.45,
  },
  {
    id: "seated_cable_rows",
    name: "Seated Cable Rows",
    category: "pull",
    muscles: ["Middle Back", "Rhomboids", "Latissimus Dorsi"],
    secondaryMuscles: ["Biceps", "Erector Spinae"],
    difficulty: "Beginner",
    equipment: "Cable",
    viewOrientation: "side",
    animationType: "cable_row",
    instructions: [
      "Sit on machine with feet firmly on footplates, knees slightly bent.",
      "Reach forward with neutral spine and grip V-handle.",
      "Sit upright with tall posture and chest lifted.",
      "Drive elbows back past torso and pull handle into lower abdomen.",
      "Squeeze shoulder blades together firmly, then extend arms slowly.",
    ],
    formTips: [
      "Keep torso stationary — don't rock back and forth.",
      "Squeeze shoulder blades together at peak contraction.",
      "Maintain soft bend in knees to protect lower back.",
    ],
    commonMistakes: [
      "Rounding lower back when reaching forward",
      "Using torso momentum to fling weight backward",
      "Shrugging shoulders up instead of rowing back",
    ],
    poseConfig: {
      primaryJointName: "Elbow Angle",
      landmarkIndices: [12, 14, 16],
      altLandmarkIndices: [11, 13, 15],
      direction: "flexion",
      bottomAngleMax: 65,
      topAngleMin: 145,
      mobilityProfiles: {
        standard: { startThreshold: 145, inflectionThreshold: 65, label: "Standard (60–65° row)" },
        beginner: { startThreshold: 135, inflectionThreshold: 75, label: "Beginner (70–75°)" },
        strict: { startThreshold: 155, inflectionThreshold: 55, label: "Deep Squeeze (50–55°)" },
      },
      targetRangeLabel: "Elbow: 150° stretch → 60° row",
      bottomPhaseLabel: "Row to Abdomen",
      topPhaseLabel: "Controlled Stretch",
      formCues: [
        "Don't round lower back — keep chest tall and spine neutral.",
        "Drive elbows back and squeeze scapulae together.",
        "Keep torso upright — avoid swinging back and forth.",
      ],
      cameraAngleNote: "Side-view camera is ideal to track spine neutrality and elbow travel.",
    },
    xpPerRep: 3,
    caloriesPerRep: 0.4,
  },
  {
    id: "dumbbell_rows",
    name: "Dumbbell Rows",
    category: "pull",
    muscles: ["Lats", "Rhomboids", "Rear Delts", "Biceps"],
    secondaryMuscles: ["Forearms", "Core"],
    difficulty: "Intermediate",
    equipment: "Dumbbell",
    viewOrientation: "side",
    animationType: "dumbbell_row",
    instructions: [
      "Place same-side knee and hand on flat bench for solid tripod support.",
      "Keep opposite foot planted wide on floor, back flat parallel to floor.",
      "Hold dumbbell hanging down with arm fully extended.",
      "Pull dumbbell up toward hip crease, leading with elbow.",
      "Hold peak contraction for 1 second, then lower with control.",
    ],
    formTips: [
      "Pull to your hip, not your chest, to bias lats over biceps.",
      "Don't rotate torso upward to cheat the dumbbell up.",
      "Keep neck neutral looking at floor ahead.",
    ],
    commonMistakes: [
      "Torso twisting like a lawnmower pull",
      "Bouncing dumbbell up with leg drive",
      "Rounding thoracic spine",
    ],
    poseConfig: {
      primaryJointName: "Elbow Angle",
      landmarkIndices: [12, 14, 16],
      altLandmarkIndices: [11, 13, 15],
      direction: "flexion",
      bottomAngleMax: 65,
      topAngleMin: 145,
      mobilityProfiles: {
        standard: { startThreshold: 145, inflectionThreshold: 65, label: "Standard (60–65°)" },
        beginner: { startThreshold: 135, inflectionThreshold: 75, label: "Beginner (70–75°)" },
        strict: { startThreshold: 155, inflectionThreshold: 55, label: "Deep Lat Row (50–55°)" },
      },
      targetRangeLabel: "Elbow: 145° hang → 60° hip pull",
      bottomPhaseLabel: "Row to Hip",
      topPhaseLabel: "Lower under Control",
      formCues: [
        "Pull elbow toward your hip — isolates lats over biceps.",
        "Keep torso flat and stationary — no twisting.",
        "Full arm stretch at the bottom.",
      ],
      cameraAngleNote: "Side camera view facing the working arm gives clean tracking.",
    },
    xpPerRep: 3,
    caloriesPerRep: 0.4,
  },
  {
    id: "bicep_curls",
    name: "Bicep Curls",
    category: "pull",
    muscles: ["Biceps Brachii", "Brachialis"],
    secondaryMuscles: ["Forearms", "Anterior Deltoids"],
    difficulty: "Beginner",
    equipment: "Dumbbell",
    viewOrientation: "front",
    animationType: "bicep_curl",
    instructions: [
      "Stand tall holding dumbbells at your sides, palms facing forward.",
      "Keep elbows pinned securely at sides, chest up.",
      "Curl weights up toward shoulders by flexing biceps only.",
      "Squeeze biceps hard at top contraction for 1 second.",
      "Lower under control over 3 seconds to full arm extension.",
    ],
    formTips: [
      "Elbows must stay pinned at sides — don't let them swing forward.",
      "Supinate wrist (rotate pinky up) at top for peak biceps peak.",
      "Do not lean back or use hip swinging momentum.",
    ],
    commonMistakes: [
      "Elbows drifting forward turning curl into a front raise",
      "Leaning back to swing weight up",
      "Dropping weight without eccentric control",
    ],
    poseConfig: {
      primaryJointName: "Elbow Angle",
      landmarkIndices: [12, 14, 16],
      altLandmarkIndices: [11, 13, 15],
      direction: "flexion",
      bottomAngleMax: 50,
      topAngleMin: 150,
      mobilityProfiles: {
        standard: { startThreshold: 150, inflectionThreshold: 50, label: "Standard (40–50° curl)" },
        beginner: { startThreshold: 140, inflectionThreshold: 60, label: "Gentle (55–60°)" },
        strict: { startThreshold: 160, inflectionThreshold: 40, label: "Full Squeeze (35–40°)" },
      },
      targetRangeLabel: "Elbow: 45° top contraction → 155° bottom",
      bottomPhaseLabel: "Curl to Shoulders",
      topPhaseLabel: "Lower to Extension",
      formCues: [
        "Keep elbows pinned to your sides — do not swing!",
        "Supinate wrists at top for maximum bicep peak contraction.",
        "Lower under full 3-second control — don't drop the weight.",
      ],
      secondaryChecks: [
        {
          id: "elbow_flare",
          name: "Elbow Drift",
          cueText: "Elbows drifting forward! Keep upper arms pinned to ribs.",
          type: "elbow_flare",
        },
      ],
      cameraAngleNote: "Front view allows tracking of both arms and wrist supination.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.3,
  },
  {
    id: "hammer_curls",
    name: "Hammer Curls",
    category: "pull",
    muscles: ["Brachialis", "Brachioradialis", "Biceps"],
    secondaryMuscles: ["Forearms"],
    difficulty: "Beginner",
    equipment: "Dumbbell",
    viewOrientation: "front",
    animationType: "hammer_curl",
    instructions: [
      "Stand tall holding dumbbells with neutral grip (palms facing each other).",
      "Lock elbows in place against your sides.",
      "Curl dumbbells upward keeping thumbs pointing toward ceiling.",
      "Squeeze at top contraction, focusing on outer arm and forearm.",
      "Lower under control back to side extension.",
    ],
    formTips: [
      "Maintain neutral grip throughout — do not rotate wrists.",
      "Targets the brachialis under the bicep to push biceps wider.",
      "Control the lowering phase to maximize brachioradialis growth.",
    ],
    commonMistakes: [
      "Twisting wrists into supination",
      "Using torso momentum to rock weights up",
      "Shortening range of motion at bottom",
    ],
    poseConfig: {
      primaryJointName: "Elbow Angle",
      landmarkIndices: [12, 14, 16],
      altLandmarkIndices: [11, 13, 15],
      direction: "flexion",
      bottomAngleMax: 50,
      topAngleMin: 150,
      mobilityProfiles: {
        standard: { startThreshold: 150, inflectionThreshold: 50, label: "Standard (45–50° curl)" },
        beginner: { startThreshold: 140, inflectionThreshold: 60, label: "Gentle (55–60°)" },
        strict: { startThreshold: 160, inflectionThreshold: 40, label: "Strict ROM (38–42°)" },
      },
      targetRangeLabel: "Elbow: 45° top → 155° bottom",
      bottomPhaseLabel: "Curl with Neutral Grip",
      topPhaseLabel: "Lower to Sides",
      formCues: [
        "Keep thumbs pointing to ceiling — maintain neutral grip.",
        "Elbows stay pinned tight to torso.",
        "Slow controlled negative for forearm & brachialis development.",
      ],
      cameraAngleNote: "Front or 3/4 camera view captures neutral hammer grip clearly.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.28,
  },
  {
    id: "face_pulls",
    name: "Face Pulls",
    category: "pull",
    muscles: ["Rear Deltoids", "Rotator Cuff", "Upper Traps"],
    secondaryMuscles: ["Rhomboids"],
    difficulty: "Intermediate",
    equipment: "Cable",
    viewOrientation: "front",
    animationType: "face_pull",
    instructions: [
      "Attach rope to cable pulley set at eye/upper-chest height.",
      "Grip rope ends with thumbs pointing back, step back into staggered stance.",
      "Pull rope straight toward face, splitting hands beside ears.",
      "Externally rotate shoulders as you pull so hands finish high beside head.",
      "Squeeze rear deltoids and external rotators for 1 second, return slowly.",
    ],
    formTips: [
      "Elbows must stay high — at or slightly above shoulder level.",
      "Think of striking a double bicep pose at end of pull.",
      "Keep core braced so weight doesn't pull torso forward.",
    ],
    commonMistakes: [
      "Pulling downward to chest like an upright row",
      "Dropping elbows below shoulders",
      "Failing to externally rotate at end of pull",
    ],
    poseConfig: {
      primaryJointName: "Shoulder & Elbow",
      landmarkIndices: [14, 12, 24],
      altLandmarkIndices: [13, 11, 23],
      direction: "flexion",
      bottomAngleMax: 75,
      topAngleMin: 145,
      mobilityProfiles: {
        standard: { startThreshold: 145, inflectionThreshold: 75, label: "Standard (70–75° pull)" },
        beginner: { startThreshold: 135, inflectionThreshold: 85, label: "Beginner (80–85°)" },
        strict: { startThreshold: 155, inflectionThreshold: 65, label: "Deep Pull (60–65°)" },
      },
      targetRangeLabel: "Elbows high past torso level",
      bottomPhaseLabel: "Pull toward Face",
      topPhaseLabel: "Extend Forward",
      formCues: [
        "Keep elbows high — at or above shoulder height throughout.",
        "Externally rotate thumbs backward as you finish pull.",
        "Don't shrug shoulders up to ears — depress traps.",
      ],
      cameraAngleNote: "Front or 3/4 view captures elbow elevation and external rotation.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.25,
  },
  {
    id: "rear_delt_flyes",
    name: "Rear Delt Flyes",
    category: "pull",
    muscles: ["Rear Deltoids", "Rhomboids"],
    secondaryMuscles: ["Trapezius", "Forearms"],
    difficulty: "Intermediate",
    equipment: "Dumbbell",
    viewOrientation: "side",
    animationType: "rear_delt",
    instructions: [
      "Hinge forward at hips ~45–60 degrees with flat back and knees soft.",
      "Hold dumbbells hanging under shoulders with slight bend in elbows.",
      "Raise arms out to sides in wide arc, leading with elbows.",
      "Squeeze posterior deltoids at top parallel position.",
      "Lower under control over 2–3 seconds.",
    ],
    formTips: [
      "Maintain the same slight elbow bend throughout the arc.",
      "Do not shrug traps — keep shoulders pulled away from ears.",
      "Focus on driving pinkies toward ceiling.",
    ],
    commonMistakes: [
      "Standing up during the raise to use momentum",
      "Bending elbows to 90° turning fly into a row",
      "Using heavy weights and jerking torso",
    ],
    poseConfig: {
      primaryJointName: "Shoulder Raise",
      landmarkIndices: [14, 12, 24],
      altLandmarkIndices: [13, 11, 23],
      direction: "extension",
      bottomAngleMax: 30,
      topAngleMin: 75,
      mobilityProfiles: {
        standard: { startThreshold: 30, inflectionThreshold: 75, label: "Standard (75–80° raise)" },
        beginner: { startThreshold: 35, inflectionThreshold: 65, label: "Beginner (65–70°)" },
        strict: { startThreshold: 25, inflectionThreshold: 85, label: "Strict Parallel (80–85°)" },
      },
      targetRangeLabel: "Arms raise to shoulder level (~80°)",
      bottomPhaseLabel: "Lower Down",
      topPhaseLabel: "Raise to Sides",
      formCues: [
        "Keep slight bend in elbows — maintain static arm angle.",
        "Squeeze rear deltoids — avoid torso jerking.",
        "Lead with elbows, not wrists.",
      ],
      cameraAngleNote: "Side-angle camera verifies hip hinge depth and raise height.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.22,
  },
];

// ==========================================
// 3. LEGS DAY EXERCISES (8)
// ==========================================
const legsExercises: Exercise[] = [
  {
    id: "squats",
    name: "Squats",
    category: "legs",
    muscles: ["Quadriceps", "Glutes", "Hamstrings", "Core"],
    secondaryMuscles: ["Calves", "Adductors"],
    difficulty: "Intermediate",
    equipment: "Barbell",
    viewOrientation: "side",
    animationType: "squat",
    instructions: [
      "Set feet shoulder-width apart, toes turned outward 15–30 degrees.",
      "Brace core deeply and initiate by pushing hips back and knees out.",
      "Descend smoothly until hip crease drops parallel to or below knee top.",
      "Keep chest upright and knees tracking directly over toes.",
      "Drive through mid-foot/heels to stand up to full hip lockout.",
    ],
    formTips: [
      "Keep knees pushed out in line with toes — prevent knee valgus cave.",
      "Maintain neutral spine throughout — avoid rounding lower back at bottom.",
      "Inhale into abdomen on way down; exhale forcefully past sticking point.",
    ],
    commonMistakes: [
      "Knees caving inward during ascent",
      "Heels lifting off floor due to ankle tightness",
      "Cutting depth short above parallel",
    ],
    poseConfig: {
      primaryJointName: "Knee Angle",
      landmarkIndices: [24, 26, 28], // right hip -> knee -> ankle
      altLandmarkIndices: [23, 25, 27],
      direction: "flexion",
      bottomAngleMax: 105,
      topAngleMin: 160,
      mobilityProfiles: {
        standard: { startThreshold: 160, inflectionThreshold: 100, label: "Parallel (95–100°)" },
        beginner: { startThreshold: 155, inflectionThreshold: 115, label: "Mobility Friendly (110–115°)" },
        strict: { startThreshold: 168, inflectionThreshold: 90, label: "Deep Squat (85–90°)" },
      },
      targetRangeLabel: "Knee: ≤100° at bottom (parallel)",
      bottomPhaseLabel: "Squat to Parallel",
      topPhaseLabel: "Stand & Lockout",
      formCues: [
        "Push knees outward over toes — do NOT let them cave in!",
        "Maintain upright chest and neutral spine.",
        "Drive through heels and midfoot on ascent.",
      ],
      secondaryChecks: [
        {
          id: "knee_cave",
          name: "Knee Alignment",
          cueText: "Knees caving in! Push knees out over your toes.",
          type: "knee_cave",
        },
      ],
      cameraAngleNote: "Side-profile camera at hip height provides accurate knee depth tracking.",
    },
    xpPerRep: 4,
    caloriesPerRep: 0.6,
  },
  {
    id: "leg_press",
    name: "Leg Press",
    category: "legs",
    muscles: ["Quadriceps", "Glutes", "Hamstrings"],
    secondaryMuscles: ["Calves"],
    difficulty: "Beginner",
    equipment: "Machine",
    viewOrientation: "side",
    animationType: "leg_press",
    instructions: [
      "Sit back firmly in machine with hips and back flush against backrest.",
      "Place feet shoulder-width on sled platform, toes slightly angled out.",
      "Release safety bars and lower sled until knees reach ~90 degrees.",
      "Press platform away driving through full foot.",
      "Extend legs fully without locking knees violently at the top.",
    ],
    formTips: [
      "Never let lower back or glutes peel off the seat pad.",
      "Do NOT hyperextend or snap knees into rigid lockout at the top.",
      "Control the descent — do not bounce sled off bottom stoppers.",
    ],
    commonMistakes: [
      "Aggressive knee hyperextension under load",
      "Lower back rolling off seat during deep descent",
      "Knees caving inward during pressing phase",
    ],
    poseConfig: {
      primaryJointName: "Knee Angle",
      landmarkIndices: [24, 26, 28],
      altLandmarkIndices: [23, 25, 27],
      direction: "flexion",
      bottomAngleMax: 95,
      topAngleMin: 155,
      mobilityProfiles: {
        standard: { startThreshold: 155, inflectionThreshold: 95, label: "Standard (90–95° depth)" },
        beginner: { startThreshold: 145, inflectionThreshold: 105, label: "Beginner (100–105°)" },
        strict: { startThreshold: 160, inflectionThreshold: 85, label: "Full Depth (80–85°)" },
      },
      targetRangeLabel: "Knee: 90° bottom → 155° press",
      bottomPhaseLabel: "Lower Sled",
      topPhaseLabel: "Press Platform",
      formCues: [
        "Do not lock knees aggressively at top — keep soft joint.",
        "Keep lower back glued to seat pad throughout.",
        "Press through heels and midfoot — no toe-only pushing.",
      ],
      cameraAngleNote: "Side view camera tracking knee flexion on the machine rails.",
    },
    xpPerRep: 4,
    caloriesPerRep: 0.55,
  },
  {
    id: "romanian_deadlifts",
    name: "Romanian Deadlifts",
    category: "legs",
    muscles: ["Hamstrings", "Gluteus Maximus", "Lower Back"],
    secondaryMuscles: ["Forearms", "Core"],
    difficulty: "Advanced",
    equipment: "Barbell",
    viewOrientation: "side",
    animationType: "rdl",
    instructions: [
      "Stand holding barbell at hips, feet hip-width, knees slightly soft.",
      "Keep chest tall, lats engaged, and spine neutral.",
      "Hinge at hips by pushing glutes straight backward toward wall behind you.",
      "Slide barbell down front of thighs and shins until deep hamstring stretch.",
      "Drive hips forward and squeeze glutes hard to return to standing tall.",
    ],
    formTips: [
      "This is a hip hinge, NOT a squat — knees remain soft with minimal extra bend.",
      "Barbell must stay in contact with or inches from thighs/shins at all times.",
      "Never round your lower back — maintain natural lumbar arch.",
    ],
    commonMistakes: [
      "Rounding the lumbar spine under load",
      "Letting bar drift away from legs putting huge torque on spine",
      "Squatting down instead of pushing hips back",
    ],
    poseConfig: {
      primaryJointName: "Hip Hinge Angle",
      landmarkIndices: [12, 24, 26], // shoulder -> hip -> knee
      altLandmarkIndices: [11, 23, 25],
      direction: "flexion",
      bottomAngleMax: 115,
      topAngleMin: 165,
      mobilityProfiles: {
        standard: { startThreshold: 165, inflectionThreshold: 115, label: "Standard (110–115° hinge)" },
        beginner: { startThreshold: 155, inflectionThreshold: 125, label: "Tight Hamstrings (120–125°)" },
        strict: { startThreshold: 170, inflectionThreshold: 105, label: "Deep Hinge (100–105°)" },
      },
      targetRangeLabel: "Hip angle: 105–115° at bottom stretch",
      bottomPhaseLabel: "Hinge Glutes Back",
      topPhaseLabel: "Drive Hips to Stand",
      formCues: [
        "Push hips straight back — feel deep hamstring stretch.",
        "Keep bar skimming your shins — don't let it drift away.",
        "Maintain flat, neutral spine — do not round your back!",
      ],
      secondaryChecks: [
        {
          id: "back_arch",
          name: "Spine Neutrality",
          cueText: "Back rounding detected! Keep chest proud and lats packed.",
          type: "back_arch",
        },
      ],
      cameraAngleNote: "Side-profile camera is essential to verify hip hinge depth and spine flatness.",
    },
    xpPerRep: 4,
    caloriesPerRep: 0.55,
  },
  {
    id: "lunges",
    name: "Lunges",
    category: "legs",
    muscles: ["Quads", "Glutes", "Hamstrings", "Calves"],
    secondaryMuscles: ["Core", "Balance Stabilizers"],
    difficulty: "Intermediate",
    equipment: "Bodyweight",
    viewOrientation: "side",
    animationType: "lunge",
    instructions: [
      "Stand tall with feet together, hands at hips or holding dumbbells.",
      "Take a controlled step forward with one leg.",
      "Lower hips until front thigh is parallel to floor (front knee ~90°).",
      "Rear knee descends until hovering 1–2 inches above floor.",
      "Drive through front heel to step back to starting position.",
    ],
    formTips: [
      "Keep torso tall and vertical — do not pitch forward.",
      "Front knee stays stacked directly over ankle/midfoot, not caving in.",
      "Distribute weight evenly between front heel and back ball of foot.",
    ],
    commonMistakes: [
      "Front knee shooting way past toes and heel lifting",
      "Front knee collapsing inward",
      "Banging rear kneecap onto hard floor",
    ],
    poseConfig: {
      primaryJointName: "Lead Knee Angle",
      landmarkIndices: [24, 26, 28],
      altLandmarkIndices: [23, 25, 27],
      direction: "flexion",
      bottomAngleMax: 100,
      topAngleMin: 160,
      mobilityProfiles: {
        standard: { startThreshold: 160, inflectionThreshold: 100, label: "Standard (90–100° front knee)" },
        beginner: { startThreshold: 150, inflectionThreshold: 110, label: "Beginner (105–110°)" },
        strict: { startThreshold: 165, inflectionThreshold: 90, label: "Deep Lunge (85–90°)" },
      },
      targetRangeLabel: "Front knee: ~90° at bottom",
      bottomPhaseLabel: "Lunge Down",
      topPhaseLabel: "Drive to Stand",
      formCues: [
        "Keep front knee tracking over midfoot — avoid inward collapse.",
        "Keep torso upright and proud — avoid forward hunching.",
        "Back knee hovers just above the floor.",
      ],
      secondaryChecks: [
        {
          id: "knee_cave",
          name: "Front Knee Tracking",
          cueText: "Front knee collapsing inward! Push knee outward.",
          type: "knee_cave",
        },
      ],
      cameraAngleNote: "Side-view camera captures both front and rear knee flexion angles.",
    },
    xpPerRep: 3,
    caloriesPerRep: 0.45,
  },
  {
    id: "leg_extensions",
    name: "Leg Extensions",
    category: "legs",
    muscles: ["Quadriceps"],
    secondaryMuscles: ["Patellar Tendon"],
    difficulty: "Beginner",
    equipment: "Machine",
    viewOrientation: "side",
    animationType: "leg_extension",
    instructions: [
      "Adjust backrest so knees align directly with machine pivot axis.",
      "Position padded roller against lower shins just above ankle joints.",
      "Grip side handles and press back firmly against backrest.",
      "Extend legs upward until knees are fully straightened.",
      "Hold peak quad contraction for 1 second, then lower under 3-second control.",
    ],
    formTips: [
      "Pause and squeeze quads hard at peak extension.",
      "Never kick or swing legs violently using momentum.",
      "Keep buttocks firmly on seat throughout repetition.",
    ],
    commonMistakes: [
      "Using momentum to kick weight up",
      "Dropping weight rapidly without eccentric tension",
      "Hips lifting off seat at top",
    ],
    poseConfig: {
      primaryJointName: "Knee Extension",
      landmarkIndices: [24, 26, 28],
      altLandmarkIndices: [23, 25, 27],
      direction: "extension",
      bottomAngleMax: 95,
      topAngleMin: 155,
      mobilityProfiles: {
        standard: { startThreshold: 95, inflectionThreshold: 155, label: "Standard (155°+ lockout)" },
        beginner: { startThreshold: 95, inflectionThreshold: 145, label: "Beginner (140–145°)" },
        strict: { startThreshold: 90, inflectionThreshold: 165, label: "Full Lockout (165°+)" },
      },
      targetRangeLabel: "Knee: 90° start → 160° peak contraction",
      bottomPhaseLabel: "Lower Weight",
      topPhaseLabel: "Extend to Peak",
      formCues: [
        "Full extension for maximum quad peak contraction.",
        "Hold 1-second squeeze at the top — no kicking with momentum.",
        "Control 3-second lowering phase.",
      ],
      cameraAngleNote: "Side camera view shows full path of shin roller and knee lockout.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.3,
  },
  {
    id: "leg_curls",
    name: "Leg Curls",
    category: "legs",
    muscles: ["Hamstrings"],
    secondaryMuscles: ["Gastrocnemius"],
    difficulty: "Beginner",
    equipment: "Machine",
    viewOrientation: "prone_side",
    animationType: "leg_curl",
    instructions: [
      "Lie face down on bench with pad resting on back of lower calves/Achilles.",
      "Align knee joints with pivot point of machine.",
      "Grip side handles and keep hips pressed firmly into bench pad.",
      "Curl legs up toward glutes as far as possible in full contraction.",
      "Hold squeeze for 1 second, then lower under strict control.",
    ],
    formTips: [
      "Press hips down into bench — do not let hips lift into air.",
      "Point toes slightly or keep neutral for maximum hamstring load.",
      "Avoid letting weight stack slam between repetitions.",
    ],
    commonMistakes: [
      "Hips rising off bench to help initiate curl",
      "Fast uncontrolled lowering",
      "Partial range of motion",
    ],
    poseConfig: {
      primaryJointName: "Knee Flexion",
      landmarkIndices: [24, 26, 28],
      altLandmarkIndices: [23, 25, 27],
      direction: "flexion",
      bottomAngleMax: 65,
      topAngleMin: 150,
      mobilityProfiles: {
        standard: { startThreshold: 150, inflectionThreshold: 65, label: "Standard (60–65° curl)" },
        beginner: { startThreshold: 140, inflectionThreshold: 75, label: "Beginner (70–75°)" },
        strict: { startThreshold: 160, inflectionThreshold: 55, label: "Deep Squeeze (50–55°)" },
      },
      targetRangeLabel: "Knee: 155° straight → 60° contracted",
      bottomPhaseLabel: "Curl to Glutes",
      topPhaseLabel: "Extend Legs",
      formCues: [
        "Keep hips pressed firmly into bench pad — don't pike hips.",
        "Curl all the way up for full hamstring contraction.",
        "Resist the weight stack during 3-second descent.",
      ],
      cameraAngleNote: "Side-view camera aligned with bench captures knee curl arc clearly.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.28,
  },
  {
    id: "calf_raises",
    name: "Standing Calf Raises",
    category: "legs",
    muscles: ["Gastrocnemius", "Soleus"],
    secondaryMuscles: ["Tibialis Anterior"],
    difficulty: "Beginner",
    equipment: "Bodyweight",
    viewOrientation: "side",
    animationType: "calf_raise",
    instructions: [
      "Stand with balls of feet on edge of step or platform, heels hanging off.",
      "Hold a wall or rail lightly for balance only.",
      "Lower heels below step level until deep calf stretch.",
      "Drive through balls of big toes to rise as high as possible on tiptoes.",
      "Hold peak contraction at top for 2 full seconds, then lower slowly.",
    ],
    formTips: [
      "Keep knees straight (soft, not hyperlocked) to emphasize gastrocnemius.",
      "Pause for 1–2 seconds at bottom stretch to eliminate Achilles bounce.",
      "Push through balls of big toes, not outer foot edges.",
    ],
    commonMistakes: [
      "Bouncing fast at bottom using Achilles tendon reflex",
      "Bending knees turning exercise into a knee movement",
      "Shortening range of motion at top",
    ],
    poseConfig: {
      primaryJointName: "Ankle Plantarflexion",
      landmarkIndices: [26, 28, 32], // knee -> ankle -> foot index
      altLandmarkIndices: [25, 27, 31],
      direction: "extension",
      bottomAngleMax: 80,
      topAngleMin: 120,
      mobilityProfiles: {
        standard: { startThreshold: 80, inflectionThreshold: 120, label: "Standard (Full Tiptions)" },
        beginner: { startThreshold: 85, inflectionThreshold: 110, label: "Gentle (110°)" },
        strict: { startThreshold: 75, inflectionThreshold: 128, label: "Peak Extension (125°+)" },
      },
      targetRangeLabel: "Ankle: Full plantarflexion at top",
      bottomPhaseLabel: "Deep Heel Stretch",
      topPhaseLabel: "Rise on Tiptoes",
      formCues: [
        "Full range of motion — all the way up, all the way down.",
        "Hold 2-second squeeze at top peak height.",
        "Pause at bottom stretch — do not bounce.",
      ],
      cameraAngleNote: "Side view of lower legs and ankles tracks heel drop and tiptoe rise.",
    },
    xpPerRep: 1,
    caloriesPerRep: 0.2,
  },
  {
    id: "glute_bridges",
    name: "Glute Bridges",
    category: "legs",
    muscles: ["Gluteus Maximus", "Hamstrings", "Core"],
    secondaryMuscles: ["Lower Back", "Adductors"],
    difficulty: "Beginner",
    equipment: "Bodyweight",
    viewOrientation: "lying_side",
    animationType: "glute_bridge",
    instructions: [
      "Lie supine on floor, arms flat at sides, knees bent, feet flat hip-width.",
      "Tuck chin slightly and engage core to flatten lower back against floor.",
      "Drive through heels and thrust hips upward toward ceiling.",
      "Reach full straight diagonal line from knees through hips to shoulders.",
      "Squeeze glutes intensely for 2 seconds at top, then lower under control.",
    ],
    formTips: [
      "Do NOT hyperextend lower spine at top — movement comes from glutes.",
      "Drive through heels, not toes.",
      "Keep knees tracking forward, not splaying out or caving in.",
    ],
    commonMistakes: [
      "Arching lower back rather than extending hips",
      "Pushing with toes instead of heels",
      "Rushing repetitions without pause at top",
    ],
    poseConfig: {
      primaryJointName: "Hip Extension",
      landmarkIndices: [12, 24, 26], // shoulder -> hip -> knee
      altLandmarkIndices: [11, 23, 25],
      direction: "extension",
      bottomAngleMax: 120,
      topAngleMin: 160,
      mobilityProfiles: {
        standard: { startThreshold: 120, inflectionThreshold: 160, label: "Standard (~160° bridge)" },
        beginner: { startThreshold: 125, inflectionThreshold: 150, label: "Beginner (~150° bridge)" },
        strict: { startThreshold: 115, inflectionThreshold: 168, label: "Full Bridge (~168° straight)" },
      },
      targetRangeLabel: "Hip angle: ~160–170° straight bridge",
      bottomPhaseLabel: "Lower to Floor",
      topPhaseLabel: "Bridge & Squeeze Glutes",
      formCues: [
        "Drive through heels — squeeze glutes hard at the top.",
        "Straight line from shoulders to knees — don't over-arch lower back.",
        "Hold 2-second contraction at peak height.",
      ],
      cameraAngleNote: "Side camera at floor level monitors hip rise and pelvic alignment.",
    },
    xpPerRep: 2,
    caloriesPerRep: 0.25,
  },
];

export const ALL_EXERCISES: Exercise[] = [
  ...pushExercises,
  ...pullExercises,
  ...legsExercises,
];

export const CATEGORIES: {
  id: ExerciseCategory;
  label: string;
  emoji: string;
  description: string;
  color: string;
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
  borderClass: string;
  bgLightClass: string;
}[] = [
  {
    id: "push",
    label: "Push Day",
    emoji: "💪",
    description: "Chest, Shoulders & Triceps",
    color: "#2D6A4F",
    accentColor: "#40916C",
    gradientFrom: "from-emerald-500/10",
    gradientTo: "to-green-600/5",
    borderClass: "border-emerald-500/30",
    bgLightClass: "bg-emerald-500/10",
  },
  {
    id: "pull",
    label: "Pull Day",
    emoji: "🏋️",
    description: "Back, Lats & Biceps",
    color: "#1E3A8A",
    accentColor: "#3B82F6",
    gradientFrom: "from-blue-500/10",
    gradientTo: "to-cyan-600/5",
    borderClass: "border-blue-500/30",
    bgLightClass: "bg-blue-500/10",
  },
  {
    id: "legs",
    label: "Legs Day",
    emoji: "🦵",
    description: "Quads, Hamstrings & Glutes",
    color: "#D4A373",
    accentColor: "#F59E0B",
    gradientFrom: "from-amber-500/10",
    gradientTo: "to-yellow-600/5",
    borderClass: "border-amber-500/30",
    bgLightClass: "bg-amber-500/10",
  },
];

export function getExercisesByCategory(cat: ExerciseCategory): Exercise[] {
  return ALL_EXERCISES.filter((e) => e.category === cat);
}

export function getExerciseById(id: string): Exercise | undefined {
  return ALL_EXERCISES.find((e) => e.id === id);
}
