/**
 * In-memory Learning E2E surface for the three UMTUBA Originals.
 * Drafts stay out of the public catalog. Partner AI remains denied.
 */

import { evaluateAiTutorIngest } from "../../providers/rights";
import type { LearningNormalizedCourse, LearningProvider } from "../../providers/types";
import {
  evaluatePilotAiTutor,
  evaluatePilotCertificatePath,
  evaluatePilotCompletion,
  type PilotLearnerProgress,
} from "./assemble";
import { AI_FUNDAMENTALS_FOR_EVERYONE } from "./aiFundamentals";
import { DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS } from "./digitalSafety";
import { UMTUBA_PLATFORM_ESSENTIALS } from "./platformEssentials";
import type { PilotLesson, UmtubaOriginalPilotCourse } from "./types";

const PILOT_COURSES: readonly UmtubaOriginalPilotCourse[] = [
  UMTUBA_PLATFORM_ESSENTIALS,
  DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS,
  AI_FUNDAMENTALS_FOR_EVERYONE,
];
import type { UmtubaOriginalCourse } from "../types";

export type PilotCatalogQuery = {
  q?: string;
  category?: string | "all";
  level?: UmtubaOriginalPilotCourse["level"] | "all";
  includeDrafts?: boolean;
};

export type PilotCatalogCard = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  category: string;
  level: UmtubaOriginalPilotCourse["level"];
  publishState: UmtubaOriginalPilotCourse["publishState"];
  contentOwner: UmtubaOriginalPilotCourse["contentOwner"];
};

export function flattenPilotLessons(course: UmtubaOriginalPilotCourse): PilotLesson[] {
  return course.modules.flatMap((courseModule) => courseModule.lessons);
}

export function searchPilotCatalog(query: PilotCatalogQuery = {}): {
  items: PilotCatalogCard[];
  total: number;
  state: "ready" | "empty";
} {
  const includeDrafts = query.includeDrafts === true;
  const needle = (query.q ?? "").trim().toLowerCase();
  const items = PILOT_COURSES.filter((course) => {
    if (!includeDrafts && course.status === "draft") return false;
    if (query.category && query.category !== "all" && course.category !== query.category) {
      return false;
    }
    if (query.level && query.level !== "all" && course.level !== query.level) {
      return false;
    }
    if (!needle) return true;
    const hay = `${course.title} ${course.shortDescription} ${course.fullDescription} ${course.category}`;
    return hay.toLowerCase().includes(needle);
  }).map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription,
    category: course.category,
    level: course.level,
    publishState: course.publishState,
    contentOwner: course.contentOwner,
  }));
  return {
    items,
    total: items.length,
    state: items.length === 0 ? "empty" : "ready",
  };
}

export function getPilotCourseBySlug(
  slug: string,
  options: { allowDraft?: boolean } = {}
): UmtubaOriginalPilotCourse | null {
  const course = PILOT_COURSES.find((row) => row.slug === slug) ?? null;
  if (!course) return null;
  if (course.status === "draft" && options.allowDraft !== true) return null;
  return course;
}

export function getPilotLesson(
  course: UmtubaOriginalPilotCourse,
  lessonId: string
): PilotLesson | null {
  return flattenPilotLessons(course).find((lesson) => lesson.id === lessonId) ?? null;
}

export function getAdjacentLessons(
  course: UmtubaOriginalPilotCourse,
  lessonId: string
): { previous: PilotLesson | null; current: PilotLesson | null; next: PilotLesson | null } {
  const lessons = flattenPilotLessons(course);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) return { previous: null, current: null, next: null };
  return {
    previous: lessons[index - 1] ?? null,
    current: lessons[index] ?? null,
    next: lessons[index + 1] ?? null,
  };
}

export function evaluateDraftProtection(course: UmtubaOriginalPilotCourse): {
  publicCatalogVisible: boolean;
  reason: string;
} {
  if (course.status === "draft" || course.publishState === "DRAFT") {
    return {
      publicCatalogVisible: false,
      reason: "Draft UMTUBA originals are hidden from the public catalog until an explicit publish.",
    };
  }
  return { publicCatalogVisible: true, reason: "Published originals may appear in the public catalog." };
}

export function evaluateOwnedVersusPartnerAi(input: {
  ownedCourse: UmtubaOriginalPilotCourse;
  ownedOriginal: UmtubaOriginalCourse;
  partnerProvider: LearningProvider;
  partnerCourse: LearningNormalizedCourse;
}): {
  ownedContextReady: boolean;
  ownedIngestAllowed: boolean;
  partnerDenied: boolean;
} {
  const owned = evaluatePilotAiTutor({
    course: input.ownedCourse,
    original: input.ownedOriginal,
  });
  const partner = evaluateAiTutorIngest({
    provider: input.partnerProvider,
    course: input.partnerCourse,
  });
  return {
    ownedContextReady: owned.contextReady,
    ownedIngestAllowed: owned.ingestAllowed,
    partnerDenied: partner.allowed === false,
  };
}

export function evaluateLearningE2ePath(input: {
  course: UmtubaOriginalPilotCourse;
  original: UmtubaOriginalCourse;
  progress: PilotLearnerProgress;
}): {
  catalogHiddenWhileDraft: boolean;
  courseDetail: boolean;
  lesson: boolean;
  nextPrevious: boolean;
  progress: boolean;
  quiz: boolean;
  finalAssessment: boolean;
  completion: boolean;
  certificatePath: boolean;
  aiTutorPermission: boolean;
} {
  const first = flattenPilotLessons(input.course)[0];
  const adjacent = first ? getAdjacentLessons(input.course, first.id) : null;
  const completion = evaluatePilotCompletion({ course: input.course, progress: input.progress });
  const cert = evaluatePilotCertificatePath({
    course: input.course,
    original: input.original,
    progress: input.progress,
  });
  const ai = evaluatePilotAiTutor({ course: input.course, original: input.original });
  return {
    catalogHiddenWhileDraft: evaluateDraftProtection(input.course).publicCatalogVisible === false,
    courseDetail: getPilotCourseBySlug(input.course.slug, { allowDraft: true }) !== null,
    lesson: first != null,
    nextPrevious: Boolean(adjacent?.current && (adjacent.previous || adjacent.next)),
    progress: input.progress.courseId === input.course.id,
    quiz: input.course.modules.some((courseModule) =>
      courseModule.lessons.some((lesson) => lesson.kind === "quiz" && lesson.quiz.length > 0)
    ),
    finalAssessment: input.course.finalAssessment.length >= 8,
    completion: completion.complete,
    certificatePath: cert.ready,
    aiTutorPermission: input.course.aiTutorAllowed === true && ai.contextReady,
  };
}
