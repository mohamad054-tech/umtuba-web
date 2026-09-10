import type { LearningHomeSurface } from "./productization";
import type { DemoCategoryId, DemoCourse } from "./visualDemo";
import { demoHref, demoLesson } from "./visualDemo";
import {
  LEARNING_HUB_DEEP_LINKS,
  learningHubHref,
} from "./learningHub";
import type { OneToOneBooking, OneToOneHubData } from "./oneToOne";

export const LEARNING_HOME_RECOMMENDED_LIMIT = 6;
export const LEARNING_HOME_LIVE_LIMIT = 2;
export const LEARNING_HOME_PARTNER_LIMIT = 3;

export type LearningDashboardSnapshot = {
  courseCount: number;
  progressPercent: number | null;
  certificateCount: number;
  nextSessionLabel: "oneToOne" | "live" | "empty";
  nextSessionHref: string;
  coursesHref: string;
  progressHref: string;
  certificatesHref: string;
};

export type LearningDueAction = {
  href: string;
  courseTitleAvailable: true;
  course: DemoCourse;
  demoLabeled: boolean;
};

export function polishLearningDisplayName(name: string): string {
  return name
    .replace(/\s*-Demo$/i, "")
    .replace(/\s*-ديمو$/u, "")
    .trim();
}

export function isLearningDemoSource(
  source: LearningHomeSurface["source"]
): boolean {
  return source === "demo_fallback";
}

export function selectRecommendedCourses(
  home: LearningHomeSurface,
  limit = LEARNING_HOME_RECOMMENDED_LIMIT
): DemoCourse[] {
  const enrolled = new Set(home.enrollments.map((row) => row.course.id));
  const preferred = home.courses.filter(
    (course) =>
      !enrolled.has(course.id) &&
      (course.category === "ai" ||
        course.category === "uiux" ||
        course.isFree ||
        course.isTrending)
  );
  const rest = home.courses.filter(
    (course) => !enrolled.has(course.id) && !preferred.includes(course)
  );
  return [...preferred, ...rest].slice(0, limit);
}

export function selectSnapshot(
  home: LearningHomeSurface,
  oneToOne: OneToOneHubData
): LearningDashboardSnapshot {
  const active = home.enrollments.filter(
    (row) => row.enrollment.status === "in_progress"
  );
  const done = home.enrollments.filter(
    (row) => row.enrollment.status === "completed"
  );
  const progressPercent =
    home.continueItem?.enrollment.percent ??
    (active.length > 0
      ? Math.round(
          active.reduce((sum, row) => sum + row.enrollment.percent, 0) /
            active.length
        )
      : done.length > 0
        ? 100
        : null);

  const nextBooking = selectNextOneToOneBooking(oneToOne);
  const liveCourse = home.enrollments[0]?.course ?? null;

  if (nextBooking) {
    return {
      courseCount: home.enrollments.length,
      progressPercent,
      certificateCount: done.length,
      nextSessionLabel: "oneToOne",
      nextSessionHref: learningHubHref("oneToOne"),
      coursesHref: learningHubHref("myLearning"),
      progressHref: learningHubHref("progress"),
      certificatesHref: LEARNING_HUB_DEEP_LINKS.transcript,
    };
  }

  return {
    courseCount: home.enrollments.length,
    progressPercent,
    certificateCount: done.length,
    nextSessionLabel: liveCourse ? "live" : "empty",
    nextSessionHref: liveCourse
      ? LEARNING_HUB_DEEP_LINKS.liveSchedule(liveCourse.id)
      : learningHubHref("live"),
    coursesHref: learningHubHref("myLearning"),
    progressHref: learningHubHref("progress"),
    certificatesHref: LEARNING_HUB_DEEP_LINKS.transcript,
  };
}

export function selectNextOneToOneBooking(
  oneToOne: OneToOneHubData
): OneToOneBooking | null {
  const upcoming = oneToOne.bookings
    .filter(
      (row) => row.status === "requested" || row.status === "confirmed"
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return upcoming[0] ?? null;
}

export function selectUpcomingLiveCourses(
  home: LearningHomeSurface,
  limit = LEARNING_HOME_LIVE_LIMIT
): DemoCourse[] {
  return home.enrollments.map((row) => row.course).slice(0, limit);
}

export function selectDueLearningAction(
  home: LearningHomeSurface
): LearningDueAction | null {
  if (home.source !== "demo_fallback") {
    return null;
  }
  const resume = home.continueItem;
  if (!resume) return null;
  for (const chapter of resume.course.chapters) {
    for (const lesson of chapter.lessons) {
      if (lesson.type === "quiz" && !lesson.completed) {
        return {
          href: demoHref().lesson(lesson.id),
          courseTitleAvailable: true,
          course: resume.course,
          demoLabeled: true,
        };
      }
    }
  }
  const current = demoLesson(resume.enrollment.continueLessonId);
  if (!current) return null;
  return {
    href: demoHref().lesson(current.lesson.id),
    courseTitleAvailable: true,
    course: resume.course,
    demoLabeled: true,
  };
}

export function parseDiscoverCategory(
  value: string | string[] | null | undefined
): DemoCategoryId | "all" {
  const raw = Array.isArray(value) ? value[0] : value;
  const allowed: DemoCategoryId[] = [
    "ai",
    "mobile",
    "uiux",
    "photography",
    "languages",
    "business",
    "mathematics",
    "marketing",
    "programming",
  ];
  return raw && allowed.includes(raw as DemoCategoryId)
    ? (raw as DemoCategoryId)
    : "all";
}
