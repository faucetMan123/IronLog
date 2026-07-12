import type { MentorAnswers, MentorPlan } from "./types";

let lastAnswers: MentorAnswers | null = null;
let lastPlan: MentorPlan | null = null;

export function setMentorResult(answers: MentorAnswers, plan: MentorPlan): void {
  lastAnswers = answers;
  lastPlan = plan;
}
export function getMentorAnswers(): MentorAnswers | null {
  return lastAnswers;
}
export function getMentorPlan(): MentorPlan | null {
  return lastPlan;
}
export function clearMentorResult(): void {
  lastAnswers = null;
  lastPlan = null;
}
