import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "./publicCatalog";
import { LEARNING_TEACHER_ROUTES } from "./teacherPlatform";
import { LEARNING_COMPLETION_ROUTES } from "./completionFoundation";
import { LEARNING_LIVE_ROUTES } from "./liveCalendarFoundation";
import { learningPartnerHref } from "./partners/sandboxLinks";
import { REAL_COURSE_PAYMENT } from "./teacherEarnings";
import type { TranslationKey } from "../i18n/messages/types";

export type LearningHubSectionId =
  | "home"
  | "courses"
  | "progress"
  | "live"
  | "assessments"
  | "oneToOne"
  | "teacher"
  | "marketplace";

export type LearningHubSection = {
  id: LearningHubSectionId;
  label: string;
  labelKey: TranslationKey;
  teacherOnly?: boolean;
};

export const LEARNING_HUB_QUERY = "hub" as const;
export const LEARNING_HUB_SURFACE_QUERY = "surface" as const;

export const LEARNING_HUB_SECTIONS: readonly LearningHubSection[] = [
  { id: "home", label: "Overview", labelKey: "learning.hub.section.home" },
  {
    id: "courses",
    label: "Courses & lessons",
    labelKey: "learning.hub.section.courses",
  },
  { id: "progress", label: "Progress", labelKey: "learning.hub.section.progress" },
  { id: "live", label: "Live", labelKey: "learning.hub.section.live" },
  {
    id: "assessments",
    label: "Assessments",
    labelKey: "learning.hub.section.assessments",
  },
  { id: "oneToOne", label: "1-to-1", labelKey: "learning.hub.section.oneToOne" },
  {
    id: "teacher",
    label: "Teacher",
    labelKey: "learning.hub.section.teacher",
    teacherOnly: true,
  },
  {
    id: "marketplace",
    label: "Partner marketplace",
    labelKey: "learning.hub.section.marketplace",
  },
] as const;

export const LEARNING_HUB_DEEP_LINKS = {
  home: LEARNING_LEARNER_ROUTES.hub,
  catalog: LEARNING_PUBLIC_ROUTES.catalog,
  course: LEARNING_LEARNER_ROUTES.course,
  lesson: LEARNING_LEARNER_ROUTES.lesson,
  activity: LEARNING_LEARNER_ROUTES.activity,
  assessment: LEARNING_LEARNER_ROUTES.assessment,
  attempt: LEARNING_LEARNER_ROUTES.attempt,
  progress: LEARNING_LEARNER_ROUTES.progress,
  transcript: LEARNING_COMPLETION_ROUTES.transcript,
  liveSchedule: LEARNING_LIVE_ROUTES.learnerSchedule,
  liveCalendar: LEARNING_LIVE_ROUTES.learnerCalendar,
  instructor: "/learning/instructor",
  teacherCenter: LEARNING_TEACHER_ROUTES.center,
  becomeTeacher: LEARNING_TEACHER_ROUTES.become,
  marketplace: learningPartnerHref({}),
} as const;

export function isLearningHubPaymentEnabled(): boolean {
  return REAL_COURSE_PAYMENT;
}

export function isLearningHubSectionId(
  value: string | null | undefined
): value is LearningHubSectionId {
  return (
    typeof value === "string" &&
    LEARNING_HUB_SECTIONS.some((section) => section.id === value)
  );
}

export function parseLearningHubSection(
  value: string | string[] | null | undefined
): LearningHubSectionId {
  const raw = Array.isArray(value) ? value[0] : value;
  return isLearningHubSectionId(raw) ? raw : "home";
}

export function getVisibleLearningHubSections({
  isTeacher,
}: {
  isTeacher: boolean;
}): LearningHubSection[] {
  return LEARNING_HUB_SECTIONS.filter(
    (section) => !section.teacherOnly || isTeacher
  ).map((section) => ({ ...section }));
}

export function learningHubHref(
  section: LearningHubSectionId,
  extras?: { surface?: "discover" | "library" }
): string {
  const params = new URLSearchParams();
  if (section !== "home") {
    params.set(LEARNING_HUB_QUERY, section);
  }
  if (extras?.surface === "library") {
    params.set(LEARNING_HUB_SURFACE_QUERY, "library");
  }
  const suffix = params.toString();
  return suffix ? `${LEARNING_LEARNER_ROUTES.hub}?${suffix}` : LEARNING_LEARNER_ROUTES.hub;
}
