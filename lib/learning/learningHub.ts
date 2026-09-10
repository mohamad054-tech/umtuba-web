import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "./publicCatalog";
import { LEARNING_TEACHER_ROUTES } from "./teacherPlatform";
import { LEARNING_COMPLETION_ROUTES } from "./completionFoundation";
import { LEARNING_LIVE_ROUTES } from "./liveCalendarFoundation";
import { learningPartnerHref } from "./partners/sandboxLinks";
import { REAL_COURSE_PAYMENT } from "./teacherEarnings";
import type { DemoCategoryId } from "./visualDemo";
import type { TranslationKey } from "../i18n/messages/types";

export type LearningHubSectionId =
  | "home"
  | "myLearning"
  | "discover"
  | "live"
  | "oneToOne"
  | "progress"
  | "teacher"
  | "marketplace"
  | "assessments";

export type LearningHubSection = {
  id: LearningHubSectionId;
  label: string;
  labelKey: TranslationKey;
  teacherOnly?: boolean;
  primary?: boolean;
};

export const LEARNING_HUB_QUERY = "hub" as const;
export const LEARNING_HUB_SURFACE_QUERY = "surface" as const;
export const LEARNING_HUB_CATEGORY_QUERY = "category" as const;

export const LEARNING_HUB_SECTION_ALIASES: Record<string, LearningHubSectionId> =
  {
    courses: "discover",
    library: "myLearning",
  };

export const LEARNING_HUB_SECTIONS: readonly LearningHubSection[] = [
  { id: "home", label: "Home", labelKey: "learning.hub.section.home", primary: true },
  {
    id: "myLearning",
    label: "My Learning",
    labelKey: "learning.hub.section.myLearning",
    primary: true,
  },
  {
    id: "discover",
    label: "Discover",
    labelKey: "learning.hub.section.discover",
    primary: true,
  },
  { id: "live", label: "Live", labelKey: "learning.hub.section.live", primary: true },
  {
    id: "oneToOne",
    label: "1-to-1",
    labelKey: "learning.hub.section.oneToOne",
    primary: true,
  },
  {
    id: "progress",
    label: "Progress",
    labelKey: "learning.hub.section.progress",
    primary: true,
  },
  {
    id: "teacher",
    label: "Teacher Center",
    labelKey: "learning.hub.teacherCenter",
    teacherOnly: true,
    primary: true,
  },
  {
    id: "marketplace",
    label: "Partner marketplace",
    labelKey: "learning.hub.section.marketplace",
    primary: false,
  },
  {
    id: "assessments",
    label: "Assessments",
    labelKey: "learning.hub.section.assessments",
    primary: false,
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

export function canonicalizeLearningHubSection(
  value: string | null | undefined
): LearningHubSectionId | null {
  if (typeof value !== "string" || !value) return null;
  const aliased = LEARNING_HUB_SECTION_ALIASES[value] ?? value;
  return isLearningHubSectionId(aliased) ? aliased : null;
}

export function parseLearningHubSection(
  value: string | string[] | null | undefined
): LearningHubSectionId {
  const raw = Array.isArray(value) ? value[0] : value;
  return canonicalizeLearningHubSection(raw) ?? "home";
}

export function resolveLearningHubSection(query: {
  hub?: string | string[] | null;
  surface?: string | string[] | null;
}): LearningHubSectionId {
  const hubRaw = Array.isArray(query.hub) ? query.hub[0] : query.hub;
  const surfaceRaw = Array.isArray(query.surface)
    ? query.surface[0]
    : query.surface;
  const fromHub = canonicalizeLearningHubSection(hubRaw);
  if (fromHub) return fromHub;
  if (surfaceRaw === "library") return "myLearning";
  return "home";
}

export function getVisibleLearningHubSections({
  isTeacher,
  primaryOnly = true,
}: {
  isTeacher: boolean;
  primaryOnly?: boolean;
}): LearningHubSection[] {
  return LEARNING_HUB_SECTIONS.filter((section) => {
    if (section.teacherOnly && !isTeacher) return false;
    if (primaryOnly && section.primary === false) return false;
    return true;
  }).map((section) => ({ ...section }));
}

export function getSecondaryLearningHubSections(): LearningHubSection[] {
  return LEARNING_HUB_SECTIONS.filter(
    (section) => section.primary === false && section.id === "marketplace"
  ).map((section) => ({ ...section }));
}

export function learningHubHref(
  section: LearningHubSectionId,
  extras?: { category?: DemoCategoryId | string }
): string {
  const params = new URLSearchParams();
  if (section !== "home") {
    params.set(LEARNING_HUB_QUERY, section);
  }
  if (extras?.category && section === "discover") {
    params.set(LEARNING_HUB_CATEGORY_QUERY, extras.category);
  }
  const suffix = params.toString();
  return suffix
    ? `${LEARNING_LEARNER_ROUTES.hub}?${suffix}`
    : LEARNING_LEARNER_ROUTES.hub;
}
