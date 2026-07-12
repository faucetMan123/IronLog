// Curated local exercise library. IDs are permanent, stable, and never
// reused for a different exercise — renaming `displayName` must never break
// history/PRs/autofill/exports, since all of those key off `id`, not the
// display string. See docs/DATA_MODEL.md.
//
// Custom (user-created) exercises are NOT stored here — they live in the
// `exercises` SQLite table with `isCustom = true` and a generated id
// (see database/schema.ts). This file is the seed data inserted once on
// first run / migration.

export type MuscleGroup =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms"
  | "quads" | "hamstrings" | "glutes" | "calves" | "core" | "traps" | "full_body";

export type Equipment =
  | "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight"
  | "kettlebell" | "ez_bar" | "smith_machine" | "trap_bar" | "bands";

export type MovementCategory =
  | "horizontal_push" | "vertical_push" | "horizontal_pull" | "vertical_pull"
  | "squat" | "hinge" | "lunge" | "carry" | "core" | "isolation";

export interface ExerciseLibraryEntry {
  id: string;
  displayName: string;
  aliases: string[];
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  movementCategory: MovementCategory;
  unilateral: boolean;
  defaultWeightIncrement: number; // kg
}

export const EXERCISE_LIBRARY: ExerciseLibraryEntry[] = [
  // ---- chest ----
  { id: "bench_press_barbell", displayName: "Bench Press", aliases: ["bench", "barbell bench press", "flat bench"], primaryMuscle: "chest", secondaryMuscles: ["triceps", "shoulders"], equipment: "barbell", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "incline_bench_press_barbell", displayName: "Incline Bench Press", aliases: ["incline bench", "incline barbell press"], primaryMuscle: "chest", secondaryMuscles: ["shoulders", "triceps"], equipment: "barbell", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "incline_dumbbell_press", displayName: "Incline Dumbbell Press", aliases: ["incline db", "incline db press", "incline dumbbell press"], primaryMuscle: "chest", secondaryMuscles: ["shoulders", "triceps"], equipment: "dumbbell", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 2 },
  { id: "decline_bench_press", displayName: "Decline Bench Press", aliases: ["decline bench"], primaryMuscle: "chest", secondaryMuscles: ["triceps"], equipment: "barbell", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "dumbbell_bench_press", displayName: "Dumbbell Bench Press", aliases: ["db bench", "db bench press"], primaryMuscle: "chest", secondaryMuscles: ["triceps", "shoulders"], equipment: "dumbbell", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 2 },
  { id: "cable_chest_fly", displayName: "Cable Chest Fly", aliases: ["cable fly", "cable chest fly", "cable crossover"], primaryMuscle: "chest", secondaryMuscles: [], equipment: "cable", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "dumbbell_fly", displayName: "Dumbbell Fly", aliases: ["db fly", "chest fly"], primaryMuscle: "chest", secondaryMuscles: [], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2 },
  { id: "pec_deck", displayName: "Pec Deck", aliases: ["machine fly", "chest fly machine"], primaryMuscle: "chest", secondaryMuscles: [], equipment: "machine", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 5 },
  { id: "chest_press_machine", displayName: "Chest Press Machine", aliases: ["machine chest press"], primaryMuscle: "chest", secondaryMuscles: ["triceps", "shoulders"], equipment: "machine", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 5 },
  { id: "dips_chest", displayName: "Dips", aliases: ["chest dips", "parallel bar dips"], primaryMuscle: "chest", secondaryMuscles: ["triceps", "shoulders"], equipment: "bodyweight", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "close_grip_bench_press", displayName: "Close-Grip Bench Press", aliases: ["cgbp"], primaryMuscle: "triceps", secondaryMuscles: ["chest"], equipment: "barbell", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "smith_machine_bench_press", displayName: "Smith Machine Bench Press", aliases: ["smith bench"], primaryMuscle: "chest", secondaryMuscles: ["triceps"], equipment: "smith_machine", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 2.5 },

  // ---- back ----
  { id: "pull_up", displayName: "Pull-Up", aliases: ["pull-ups", "pullups", "pull up", "pull-up"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "bodyweight", movementCategory: "vertical_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "chin_up", displayName: "Chin-Up", aliases: ["chinups", "chin up"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "bodyweight", movementCategory: "vertical_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "assisted_pull_up", displayName: "Assisted Pull-Up", aliases: ["assisted pullup"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "machine", movementCategory: "vertical_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "lat_pulldown", displayName: "Lat Pulldown", aliases: ["pulldown", "lat pulldown"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "cable", movementCategory: "vertical_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "single_arm_lat_pulldown", displayName: "Single-Arm Lat Pulldown", aliases: ["one arm pulldown"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "cable", movementCategory: "vertical_pull", unilateral: true, defaultWeightIncrement: 2 },
  { id: "seated_cable_row", displayName: "Seated Cable Row", aliases: ["seated row", "seated cable rowing", "seated cable row"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "cable", movementCategory: "horizontal_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "barbell_row", displayName: "Barbell Row", aliases: ["bent over row", "bb row"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "barbell", movementCategory: "horizontal_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "pendlay_row", displayName: "Pendlay Row", aliases: [], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "barbell", movementCategory: "horizontal_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "dumbbell_row", displayName: "Dumbbell Row", aliases: ["one arm db row", "single arm dumbbell row"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "dumbbell", movementCategory: "horizontal_pull", unilateral: true, defaultWeightIncrement: 2 },
  { id: "t_bar_row", displayName: "T-Bar Row", aliases: [], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "barbell", movementCategory: "horizontal_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "chest_supported_row", displayName: "Chest-Supported Row", aliases: ["seal row"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "machine", movementCategory: "horizontal_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "meadows_row", displayName: "Meadows Row", aliases: [], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "barbell", movementCategory: "horizontal_pull", unilateral: true, defaultWeightIncrement: 2 },
  { id: "inverted_row", displayName: "Inverted Row", aliases: ["bodyweight row"], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "bodyweight", movementCategory: "horizontal_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "straight_arm_pulldown", displayName: "Straight-Arm Pulldown", aliases: ["straight arm pulldown"], primaryMuscle: "back", secondaryMuscles: [], equipment: "cable", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "landmine_row", displayName: "Landmine Row", aliases: [], primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: "barbell", movementCategory: "horizontal_pull", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "shrug_barbell", displayName: "Barbell Shrug", aliases: ["shrugs", "barbell shrugs"], primaryMuscle: "traps", secondaryMuscles: [], equipment: "barbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 5 },
  { id: "shrug_dumbbell", displayName: "Dumbbell Shrug", aliases: ["db shrugs"], primaryMuscle: "traps", secondaryMuscles: [], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2 },

  // ---- shoulders ----
  { id: "overhead_press_barbell", displayName: "Overhead Press", aliases: ["ohp", "military press", "standing press"], primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], equipment: "barbell", movementCategory: "vertical_push", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "push_press", displayName: "Push Press", aliases: [], primaryMuscle: "shoulders", secondaryMuscles: ["triceps", "quads"], equipment: "barbell", movementCategory: "vertical_push", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "dumbbell_shoulder_press", displayName: "Dumbbell Shoulder Press", aliases: ["db shoulder press", "dumbbell shoulder press"], primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], equipment: "dumbbell", movementCategory: "vertical_push", unilateral: false, defaultWeightIncrement: 2 },
  { id: "arnold_press", displayName: "Arnold Press", aliases: [], primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], equipment: "dumbbell", movementCategory: "vertical_push", unilateral: false, defaultWeightIncrement: 2 },
  { id: "machine_shoulder_press", displayName: "Machine Shoulder Press", aliases: [], primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], equipment: "machine", movementCategory: "vertical_push", unilateral: false, defaultWeightIncrement: 5 },
  { id: "landmine_press", displayName: "Landmine Press", aliases: [], primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], equipment: "barbell", movementCategory: "vertical_push", unilateral: true, defaultWeightIncrement: 2.5 },
  { id: "lateral_raise", displayName: "Lateral Raise", aliases: ["side raise", "db lateral raise"], primaryMuscle: "shoulders", secondaryMuscles: [], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },
  { id: "cable_lateral_raise", displayName: "Cable Lateral Raise", aliases: [], primaryMuscle: "shoulders", secondaryMuscles: [], equipment: "cable", movementCategory: "isolation", unilateral: true, defaultWeightIncrement: 1 },
  { id: "front_raise", displayName: "Front Raise", aliases: ["db front raise"], primaryMuscle: "shoulders", secondaryMuscles: [], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },
  { id: "rear_delt_fly", displayName: "Rear Delt Fly", aliases: ["reverse fly", "rear delt fly"], primaryMuscle: "shoulders", secondaryMuscles: ["back"], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },
  { id: "reverse_pec_deck", displayName: "Reverse Pec Deck", aliases: ["rear delt machine"], primaryMuscle: "shoulders", secondaryMuscles: ["back"], equipment: "machine", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 5 },
  { id: "face_pull", displayName: "Face Pull", aliases: [], primaryMuscle: "shoulders", secondaryMuscles: ["back"], equipment: "cable", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "upright_row", displayName: "Upright Row", aliases: [], primaryMuscle: "shoulders", secondaryMuscles: ["traps"], equipment: "barbell", movementCategory: "vertical_pull", unilateral: false, defaultWeightIncrement: 2.5 },

  // ---- biceps ----
  { id: "ez_bar_curl", displayName: "EZ-Bar Curl", aliases: ["ez curl", "ez/bar curl", "ez bar curl", "ez-bar curl"], primaryMuscle: "biceps", secondaryMuscles: ["forearms"], equipment: "ez_bar", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "barbell_curl", displayName: "Barbell Curl", aliases: ["bb curl"], primaryMuscle: "biceps", secondaryMuscles: ["forearms"], equipment: "barbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "dumbbell_curl", displayName: "Dumbbell Curl", aliases: ["db curl", "alternating curl"], primaryMuscle: "biceps", secondaryMuscles: ["forearms"], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },
  { id: "hammer_curl", displayName: "Hammer Curl", aliases: ["db hammer curl"], primaryMuscle: "biceps", secondaryMuscles: ["forearms"], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },
  { id: "rope_hammer_curl", displayName: "Rope Hammer Curl", aliases: ["cable hammer curl"], primaryMuscle: "biceps", secondaryMuscles: ["forearms"], equipment: "cable", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "preacher_curl", displayName: "Preacher Curl", aliases: [], primaryMuscle: "biceps", secondaryMuscles: [], equipment: "ez_bar", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "cable_curl", displayName: "Cable Curl", aliases: [], primaryMuscle: "biceps", secondaryMuscles: [], equipment: "cable", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "concentration_curl", displayName: "Concentration Curl", aliases: [], primaryMuscle: "biceps", secondaryMuscles: [], equipment: "dumbbell", movementCategory: "isolation", unilateral: true, defaultWeightIncrement: 1 },
  { id: "incline_dumbbell_curl", displayName: "Incline Dumbbell Curl", aliases: ["incline curl"], primaryMuscle: "biceps", secondaryMuscles: [], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },
  { id: "spider_curl", displayName: "Spider Curl", aliases: [], primaryMuscle: "biceps", secondaryMuscles: [], equipment: "ez_bar", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "reverse_curl", displayName: "Reverse Curl", aliases: [], primaryMuscle: "forearms", secondaryMuscles: ["biceps"], equipment: "ez_bar", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "zottman_curl", displayName: "Zottman Curl", aliases: [], primaryMuscle: "biceps", secondaryMuscles: ["forearms"], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },

  // ---- triceps ----
  { id: "triceps_pushdown", displayName: "Triceps Pushdown", aliases: ["rope pushdown", "pushdown", "triceps pushdown", "rope triceps pushdown"], primaryMuscle: "triceps", secondaryMuscles: [], equipment: "cable", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "overhead_triceps_extension", displayName: "Overhead Triceps Extension", aliases: ["overhead extension"], primaryMuscle: "triceps", secondaryMuscles: [], equipment: "dumbbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },
  { id: "overhead_cable_triceps_extension", displayName: "Overhead Cable Triceps Extension", aliases: [], primaryMuscle: "triceps", secondaryMuscles: [], equipment: "cable", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "skull_crusher", displayName: "Skull Crusher", aliases: ["lying triceps extension"], primaryMuscle: "triceps", secondaryMuscles: [], equipment: "ez_bar", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "triceps_kickback", displayName: "Triceps Kickback", aliases: ["db kickback"], primaryMuscle: "triceps", secondaryMuscles: [], equipment: "dumbbell", movementCategory: "isolation", unilateral: true, defaultWeightIncrement: 1 },
  { id: "jm_press", displayName: "JM Press", aliases: [], primaryMuscle: "triceps", secondaryMuscles: ["chest"], equipment: "barbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "diamond_push_up", displayName: "Diamond Push-Up", aliases: ["close grip push up"], primaryMuscle: "triceps", secondaryMuscles: ["chest"], equipment: "bodyweight", movementCategory: "horizontal_push", unilateral: false, defaultWeightIncrement: 2.5 },

  // ---- quads / legs (squat pattern) ----
  { id: "back_squat", displayName: "Squat", aliases: ["back squat", "barbell squat"], primaryMuscle: "quads", secondaryMuscles: ["glutes", "hamstrings"], equipment: "barbell", movementCategory: "squat", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "front_squat", displayName: "Front Squat", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes", "core"], equipment: "barbell", movementCategory: "squat", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "goblet_squat", displayName: "Goblet Squat", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "dumbbell", movementCategory: "squat", unilateral: false, defaultWeightIncrement: 2 },
  { id: "hack_squat", displayName: "Hack Squat", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "machine", movementCategory: "squat", unilateral: false, defaultWeightIncrement: 5 },
  { id: "smith_machine_squat", displayName: "Smith Machine Squat", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "smith_machine", movementCategory: "squat", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "leg_press", displayName: "Leg Press", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes", "hamstrings"], equipment: "machine", movementCategory: "squat", unilateral: false, defaultWeightIncrement: 5 },
  { id: "leg_extension", displayName: "Leg Extension", aliases: ["leg extension"], primaryMuscle: "quads", secondaryMuscles: [], equipment: "machine", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "bulgarian_split_squat", displayName: "Bulgarian Split Squat", aliases: ["rear foot elevated split squat"], primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "dumbbell", movementCategory: "lunge", unilateral: true, defaultWeightIncrement: 2 },
  { id: "walking_lunge", displayName: "Walking Lunge", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "dumbbell", movementCategory: "lunge", unilateral: true, defaultWeightIncrement: 2 },
  { id: "reverse_lunge", displayName: "Reverse Lunge", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "dumbbell", movementCategory: "lunge", unilateral: true, defaultWeightIncrement: 2 },
  { id: "step_up", displayName: "Step-Up", aliases: ["box step up"], primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "dumbbell", movementCategory: "lunge", unilateral: true, defaultWeightIncrement: 2 },
  { id: "sissy_squat", displayName: "Sissy Squat", aliases: [], primaryMuscle: "quads", secondaryMuscles: [], equipment: "bodyweight", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "zercher_squat", displayName: "Zercher Squat", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes", "core"], equipment: "barbell", movementCategory: "squat", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "box_squat", displayName: "Box Squat", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "barbell", movementCategory: "squat", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "kettlebell_goblet_squat", displayName: "Kettlebell Goblet Squat", aliases: [], primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: "kettlebell", movementCategory: "squat", unilateral: false, defaultWeightIncrement: 2 },

  // ---- hamstrings / hinge ----
  { id: "conventional_deadlift", displayName: "Deadlift", aliases: ["conventional deadlift", "barbell deadlift"], primaryMuscle: "hamstrings", secondaryMuscles: ["back", "glutes"], equipment: "barbell", movementCategory: "hinge", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "sumo_deadlift", displayName: "Sumo Deadlift", aliases: [], primaryMuscle: "hamstrings", secondaryMuscles: ["glutes", "back"], equipment: "barbell", movementCategory: "hinge", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "trap_bar_deadlift", displayName: "Trap Bar Deadlift", aliases: ["hex bar deadlift"], primaryMuscle: "hamstrings", secondaryMuscles: ["glutes", "quads"], equipment: "trap_bar", movementCategory: "hinge", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "romanian_deadlift", displayName: "Romanian Deadlift", aliases: ["rdl", "romanian deadlift"], primaryMuscle: "hamstrings", secondaryMuscles: ["glutes", "back"], equipment: "barbell", movementCategory: "hinge", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "single_leg_rdl", displayName: "Single-Leg RDL", aliases: ["single leg romanian deadlift"], primaryMuscle: "hamstrings", secondaryMuscles: ["glutes"], equipment: "dumbbell", movementCategory: "hinge", unilateral: true, defaultWeightIncrement: 2 },
  { id: "good_morning", displayName: "Good Morning", aliases: [], primaryMuscle: "hamstrings", secondaryMuscles: ["back", "glutes"], equipment: "barbell", movementCategory: "hinge", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "leg_curl", displayName: "Leg Curl", aliases: ["leg curl", "hamstring curl"], primaryMuscle: "hamstrings", secondaryMuscles: [], equipment: "machine", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "nordic_curl", displayName: "Nordic Curl", aliases: [], primaryMuscle: "hamstrings", secondaryMuscles: [], equipment: "bodyweight", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "cable_pull_through", displayName: "Cable Pull-Through", aliases: [], primaryMuscle: "hamstrings", secondaryMuscles: ["glutes"], equipment: "cable", movementCategory: "hinge", unilateral: false, defaultWeightIncrement: 2.5 },

  // ---- glutes ----
  { id: "hip_thrust", displayName: "Hip Thrust", aliases: ["barbell hip thrust"], primaryMuscle: "glutes", secondaryMuscles: ["hamstrings"], equipment: "barbell", movementCategory: "hinge", unilateral: false, defaultWeightIncrement: 5 },
  { id: "glute_bridge", displayName: "Glute Bridge", aliases: [], primaryMuscle: "glutes", secondaryMuscles: ["hamstrings"], equipment: "bodyweight", movementCategory: "hinge", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "glute_kickback", displayName: "Glute Kickback", aliases: ["cable kickback"], primaryMuscle: "glutes", secondaryMuscles: [], equipment: "cable", movementCategory: "isolation", unilateral: true, defaultWeightIncrement: 2.5 },
  { id: "hip_abduction_machine", displayName: "Hip Abduction Machine", aliases: ["hip abductor"], primaryMuscle: "glutes", secondaryMuscles: [], equipment: "machine", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "hip_adduction_machine", displayName: "Hip Adduction Machine", aliases: ["hip adductor"], primaryMuscle: "glutes", secondaryMuscles: [], equipment: "machine", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "curtsy_lunge", displayName: "Curtsy Lunge", aliases: [], primaryMuscle: "glutes", secondaryMuscles: ["quads"], equipment: "dumbbell", movementCategory: "lunge", unilateral: true, defaultWeightIncrement: 2 },

  // ---- calves ----
  { id: "calf_raise", displayName: "Calf Raise", aliases: ["standing calf raise"], primaryMuscle: "calves", secondaryMuscles: [], equipment: "machine", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 5 },
  { id: "seated_calf_raise", displayName: "Seated Calf Raise", aliases: [], primaryMuscle: "calves", secondaryMuscles: [], equipment: "machine", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 5 },
  { id: "leg_press_calf_raise", displayName: "Leg Press Calf Raise", aliases: [], primaryMuscle: "calves", secondaryMuscles: [], equipment: "machine", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 5 },

  // ---- core ----
  { id: "plank", displayName: "Plank", aliases: [], primaryMuscle: "core", secondaryMuscles: [], equipment: "bodyweight", movementCategory: "core", unilateral: false, defaultWeightIncrement: 0 },
  { id: "side_plank", displayName: "Side Plank", aliases: [], primaryMuscle: "core", secondaryMuscles: [], equipment: "bodyweight", movementCategory: "core", unilateral: true, defaultWeightIncrement: 0 },
  { id: "hanging_leg_raise", displayName: "Hanging Leg Raise", aliases: ["hanging knee raise"], primaryMuscle: "core", secondaryMuscles: [], equipment: "bodyweight", movementCategory: "core", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "cable_crunch", displayName: "Cable Crunch", aliases: [], primaryMuscle: "core", secondaryMuscles: [], equipment: "cable", movementCategory: "core", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "weighted_situp", displayName: "Weighted Sit-Up", aliases: [], primaryMuscle: "core", secondaryMuscles: [], equipment: "bodyweight", movementCategory: "core", unilateral: false, defaultWeightIncrement: 2.5 },
  { id: "decline_situp", displayName: "Decline Sit-Up", aliases: [], primaryMuscle: "core", secondaryMuscles: [], equipment: "bodyweight", movementCategory: "core", unilateral: false, defaultWeightIncrement: 0 },
  { id: "russian_twist", displayName: "Russian Twist", aliases: [], primaryMuscle: "core", secondaryMuscles: [], equipment: "dumbbell", movementCategory: "core", unilateral: false, defaultWeightIncrement: 1 },
  { id: "ab_wheel_rollout", displayName: "Ab Wheel Rollout", aliases: ["ab rollout"], primaryMuscle: "core", secondaryMuscles: [], equipment: "bodyweight", movementCategory: "core", unilateral: false, defaultWeightIncrement: 0 },
  { id: "cable_woodchopper", displayName: "Cable Woodchopper", aliases: ["woodchopper"], primaryMuscle: "core", secondaryMuscles: [], equipment: "cable", movementCategory: "core", unilateral: true, defaultWeightIncrement: 2.5 },

  // ---- forearms ----
  { id: "wrist_curl", displayName: "Wrist Curl", aliases: [], primaryMuscle: "forearms", secondaryMuscles: [], equipment: "barbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },
  { id: "reverse_wrist_curl", displayName: "Reverse Wrist Curl", aliases: [], primaryMuscle: "forearms", secondaryMuscles: [], equipment: "barbell", movementCategory: "isolation", unilateral: false, defaultWeightIncrement: 1 },

  // ---- full body / carries ----
  { id: "farmer_carry", displayName: "Farmer Carry", aliases: ["farmers walk", "farmer's walk", "farmer's carry"], primaryMuscle: "full_body", secondaryMuscles: ["forearms", "traps", "core"], equipment: "dumbbell", movementCategory: "carry", unilateral: false, defaultWeightIncrement: 2 },
  { id: "suitcase_carry", displayName: "Suitcase Carry", aliases: [], primaryMuscle: "full_body", secondaryMuscles: ["core", "forearms"], equipment: "dumbbell", movementCategory: "carry", unilateral: true, defaultWeightIncrement: 2 },
  { id: "kettlebell_swing", displayName: "Kettlebell Swing", aliases: ["kb swing"], primaryMuscle: "glutes", secondaryMuscles: ["hamstrings", "core"], equipment: "kettlebell", movementCategory: "hinge", unilateral: false, defaultWeightIncrement: 2 },
  { id: "renegade_row", displayName: "Renegade Row", aliases: [], primaryMuscle: "back", secondaryMuscles: ["core"], equipment: "dumbbell", movementCategory: "horizontal_pull", unilateral: true, defaultWeightIncrement: 2 },
];

const aliasIndex = new Map<string, string>();
for (const ex of EXERCISE_LIBRARY) {
  aliasIndex.set(ex.displayName.toLowerCase(), ex.id);
  for (const alias of ex.aliases) aliasIndex.set(alias.toLowerCase(), ex.id);
}

/** Resolve a display-name string to a curated library id, or null if it isn't in the library (i.e. should become a custom exercise). */
export function resolveLibraryId(name: string): string | null {
  const key = String(name ?? "").trim().toLowerCase();
  if (!key) return null;
  return aliasIndex.get(key) ?? null;
}

export function getLibraryEntry(id: string): ExerciseLibraryEntry | undefined {
  return EXERCISE_LIBRARY.find((e) => e.id === id);
}
