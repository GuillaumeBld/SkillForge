export type Persona = "student" | "career_changer" | "advisor";

export interface AnalyticsEventPayload {
  eventName: string;
  persona?: Persona;
  contextPage?: string;
  anonymousId?: string;
  userId?: string;
  optOutStatus?: boolean;
  [key: string]: unknown;
}

export type AnalyticsEmitter = (payload: AnalyticsEventPayload) => void;

const noop: AnalyticsEmitter = () => undefined;

let emitter: AnalyticsEmitter = noop;

export const registerAnalyticsEmitter = (fn: AnalyticsEmitter) => {
  emitter = fn;
};

export const trackEvent = (payload: AnalyticsEventPayload) => {
  if (!payload.eventName) {
    throw new Error("eventName is required for analytics payloads");
  }
  emitter({
    optOutStatus: false,
    ...payload,
    eventName: payload.eventName
  });
};

export const ANALYTICS_EVENTS = {
  sessionStarted: "session_started",
  onboardingStepViewed: "onboarding_step_viewed",
  onboardingCompleted: "student_onboarding_completed",
  taskCompletionLogged: "task_completion_logged",
  careerMatchViewed: "career_match_viewed",
  advisorNoteAdded: "advisor_note_added",
  cohortAssessmentAssigned: "cohort_assessment_assigned",
  partnerImportUploaded: "partner_import_uploaded"
} as const;
