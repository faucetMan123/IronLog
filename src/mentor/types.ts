export type MentorGoal = "muscle_gain" | "strength" | "general_fitness" | "fat_loss_support";
export type MentorExperience = "beginner" | "intermediate" | "advanced";
export type MentorDays = 2 | 3 | 4 | 5 | 6;
export type MentorEquipment = "full_gym" | "dumbbells" | "basic_home_gym" | "bodyweight";
export type MentorDuration = 30 | 45 | 60 | 75;
export type MentorLimitation = "none" | "avoid_exercises" | "avoid_body_areas";

export interface MentorAnswers {
  goal: MentorGoal;
  experience: MentorExperience;
  days: MentorDays;
  equipment: MentorEquipment;
  duration: MentorDuration;
  limitation: MentorLimitation;
  avoidExerciseIds: string[];
  avoidBodyAreas: string[]; // MuscleGroup values
}

export interface MentorPlanDayExercise {
  exerciseId: string;
  displayName: string;
  targetSets: number;
  minReps: number;
  maxReps: number;
  restSeconds: number;
}

export interface MentorPlanDay {
  name: string;
  exercises: MentorPlanDayExercise[];
}

export interface MentorPlan {
  planName: string;
  structure: string; // e.g. "Upper/Lower"
  explanation: string;
  days: MentorPlanDay[];
}
