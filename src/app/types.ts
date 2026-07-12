export interface SetEntry {
  weight: string;
  reps: string;
}

export interface WorkoutEntry {
  exerciseName: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  templateId: string;
  templateName: string;
  date: string; // ISO 8601
  entries: WorkoutEntry[];
}

export interface TemplateExercise {
  id: string;
  name: string;
  sets: number | string;
  reps: string;
}

export interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
}

export interface AppSettings {
  pullupBodyweight: string;
}

export interface AppMeta {
  lastManualBackupAt: string;
  lastSnapshotAt: string;
  lastMirrorAt: string;
  persistentGranted: boolean | null;
  persistentCheckedAt: string;
  protectionStartedAt: string;
}

export interface AppData {
  templates: Template[];
  workouts: Workout[];
  settings: AppSettings;
  meta: AppMeta;
}

export type TabId =
  | "home"
  | "startWorkout"
  | "session"
  | "sheet"
  | "prs"
  | "charts"
  | "export"
  | "plans"
  | "planDetail"
  | "onboarding"
  | "mentorQuestionnaire"
  | "mentorPreview"
  | "starterPlanPicker"
  | "privacy";

export interface NavHistoryState {
  tab: TabId;
  mode?: ProgressMode;
  params?: Record<string, string>;
}

export type ProgressMode = "workout" | "exercise" | null;

export interface Snapshot {
  id: string;
  createdAt: string;
  reason: string;
  data: AppData;
}

export interface MirrorRecord {
  createdAt: string;
  reason: string;
  data: AppData;
}
