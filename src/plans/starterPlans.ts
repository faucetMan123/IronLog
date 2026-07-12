// Curated starter plans offered during onboarding's "Use a Starter Plan"
// path. Structurally identical to a MentorPlan (day/exercise/target
// shape) so both paths can share one "create plan from spec" function.
import type { MentorPlan, MentorPlanDay } from "../mentor/types";

function day(name: string, exercises: MentorPlanDay["exercises"]): MentorPlanDay {
  return { name, exercises };
}

function ex(exerciseId: string, displayName: string, targetSets: number, minReps: number, maxReps: number, restSeconds: number) {
  return { exerciseId, displayName, targetSets, minReps, maxReps, restSeconds };
}

export const STARTER_PLANS: MentorPlan[] = [
  {
    planName: "Push / Pull / Legs",
    structure: "Push/Pull/Legs",
    explanation: "A classic 3-day split — one session per movement pattern, repeatable weekly or run twice for 6 days.",
    days: [
      day("Push", [
        ex("bench_press_barbell", "Bench Press", 4, 6, 10, 120),
        ex("overhead_press_barbell", "Overhead Press", 3, 6, 10, 90),
        ex("incline_dumbbell_press", "Incline Dumbbell Press", 3, 8, 12, 90),
        ex("lateral_raise", "Lateral Raise", 3, 12, 15, 60),
        ex("triceps_pushdown", "Triceps Pushdown", 3, 10, 15, 60),
      ]),
      day("Pull", [
        ex("conventional_deadlift", "Deadlift", 3, 5, 8, 150),
        ex("pull_up", "Pull-Up", 4, 6, 10, 90),
        ex("seated_cable_row", "Seated Cable Row", 3, 8, 12, 90),
        ex("face_pull", "Face Pull", 3, 12, 15, 60),
        ex("ez_bar_curl", "EZ-Bar Curl", 3, 8, 12, 60),
      ]),
      day("Legs", [
        ex("back_squat", "Squat", 4, 6, 10, 150),
        ex("romanian_deadlift", "Romanian Deadlift", 3, 8, 12, 90),
        ex("leg_press", "Leg Press", 3, 10, 15, 90),
        ex("leg_curl", "Leg Curl", 3, 10, 15, 60),
        ex("calf_raise", "Calf Raise", 4, 10, 15, 60),
      ]),
    ],
  },
  {
    planName: "Upper / Lower",
    structure: "Upper/Lower",
    explanation: "4 days a week, each muscle group trained twice — a strong balance of frequency and recoverable volume.",
    days: [
      day("Upper A", [
        ex("bench_press_barbell", "Bench Press", 4, 6, 10, 120),
        ex("barbell_row", "Barbell Row", 4, 6, 10, 120),
        ex("dumbbell_shoulder_press", "Dumbbell Shoulder Press", 3, 8, 12, 90),
        ex("lat_pulldown", "Lat Pulldown", 3, 8, 12, 90),
        ex("hammer_curl", "Hammer Curl", 3, 10, 15, 60),
      ]),
      day("Lower A", [
        ex("back_squat", "Squat", 4, 6, 10, 150),
        ex("romanian_deadlift", "Romanian Deadlift", 3, 8, 12, 90),
        ex("leg_press", "Leg Press", 3, 10, 15, 90),
        ex("leg_curl", "Leg Curl", 3, 10, 15, 60),
        ex("calf_raise", "Calf Raise", 4, 10, 15, 60),
      ]),
      day("Upper B", [
        ex("incline_bench_press_barbell", "Incline Bench Press", 4, 6, 10, 120),
        ex("chest_supported_row", "Chest-Supported Row", 4, 8, 12, 90),
        ex("lateral_raise", "Lateral Raise", 3, 12, 15, 60),
        ex("triceps_pushdown", "Triceps Pushdown", 3, 10, 15, 60),
        ex("cable_curl", "Cable Curl", 3, 10, 15, 60),
      ]),
      day("Lower B", [
        ex("trap_bar_deadlift", "Trap Bar Deadlift", 4, 5, 8, 150),
        ex("bulgarian_split_squat", "Bulgarian Split Squat", 3, 8, 12, 90),
        ex("leg_extension", "Leg Extension", 3, 10, 15, 60),
        ex("hip_thrust", "Hip Thrust", 3, 8, 12, 90),
        ex("seated_calf_raise", "Seated Calf Raise", 4, 10, 15, 60),
      ]),
    ],
  },
  {
    planName: "Full Body (3x/week)",
    structure: "Full Body A/B/C",
    explanation: "3 full-body sessions a week — efficient, minimal time commitment, ideal for beginners or busy schedules.",
    days: [
      day("Full Body A", [
        ex("back_squat", "Squat", 3, 6, 10, 120),
        ex("bench_press_barbell", "Bench Press", 3, 6, 10, 120),
        ex("seated_cable_row", "Seated Cable Row", 3, 8, 12, 90),
        ex("plank", "Plank", 3, 1, 1, 45),
      ]),
      day("Full Body B", [
        ex("romanian_deadlift", "Romanian Deadlift", 3, 8, 12, 90),
        ex("dumbbell_shoulder_press", "Dumbbell Shoulder Press", 3, 8, 12, 90),
        ex("lat_pulldown", "Lat Pulldown", 3, 8, 12, 90),
        ex("hanging_leg_raise", "Hanging Leg Raise", 3, 8, 12, 45),
      ]),
      day("Full Body C", [
        ex("leg_press", "Leg Press", 3, 10, 15, 90),
        ex("incline_dumbbell_press", "Incline Dumbbell Press", 3, 8, 12, 90),
        ex("dumbbell_row", "Dumbbell Row", 3, 8, 12, 90),
        ex("cable_curl", "Cable Curl", 3, 10, 15, 60),
      ]),
    ],
  },
  {
    planName: "Bodyweight Only",
    structure: "Full Body A/B",
    explanation: "No equipment needed — 2 full-body sessions a week using only bodyweight movements.",
    days: [
      day("Full Body A", [
        ex("goblet_squat", "Goblet Squat", 3, 10, 15, 90),
        ex("dips_chest", "Dips", 3, 8, 12, 90),
        ex("inverted_row", "Inverted Row", 3, 8, 12, 90),
        ex("plank", "Plank", 3, 1, 1, 45),
      ]),
      day("Full Body B", [
        ex("bulgarian_split_squat", "Bulgarian Split Squat", 3, 8, 12, 90),
        ex("pull_up", "Pull-Up", 3, 5, 10, 90),
        ex("diamond_push_up", "Diamond Push-Up", 3, 8, 12, 90),
        ex("side_plank", "Side Plank", 3, 1, 1, 45),
      ]),
    ],
  },
];
