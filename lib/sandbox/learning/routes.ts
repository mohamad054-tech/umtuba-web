/**
 * Executable Learning slices under /sandbox/business-preview.
 * Production /learning is never rewritten by these routes.
 */

export const LEARNING_SANDBOX_STATE_COOKIE = "umtuba_learning_sandbox_v2";

export type LearningSandboxRoute =
  | { surface: "home" }
  | { surface: "catalog" }
  | { surface: "search" }
  | { surface: "students" }
  | { surface: "student"; studentId: string }
  | { surface: "studentDashboard"; studentId: string }
  | { surface: "course"; slug: string }
  | { surface: "lesson"; slug: string; lessonId: string }
  | { surface: "quiz"; slug: string; lessonId: string }
  | { surface: "exercise"; slug: string; exerciseId: string }
  | { surface: "assessment"; slug: string }
  | { surface: "tutor"; slug: string; lessonId?: string }
  | { surface: "certificate"; slug: string }
  | { surface: "enroll"; slug: string }
  | { surface: "pay"; slug: string }
  | { surface: "instructors" }
  | { surface: "instructor"; instructorId: string }
  | { surface: "instructorDashboard"; instructorId: string }
  | { surface: "courseCreation"; instructorId: string }
  | { surface: "instructorAnalytics"; instructorId: string }
  | { surface: "instructorFinancial"; instructorId: string }
  | { surface: "admin" }
  | { surface: "partners" }
  | { surface: "enrollmentModels" };

const ID = /^[a-z0-9][a-z0-9-]{1,80}$/;

function id(value: string | undefined): string | null {
  return value && ID.test(value) ? value : null;
}

export function parseLearningSandboxRoute(
  segments: string[] | undefined
): LearningSandboxRoute | null {
  if (!segments || segments[0] !== "learning") return null;
  const rest = segments.slice(1);

  if (rest.length === 0) return { surface: "home" };
  if (rest.length === 1 && rest[0] === "catalog") return { surface: "catalog" };
  if (rest.length === 1 && rest[0] === "search") return { surface: "search" };
  if (rest.length === 1 && (rest[0] === "student" || rest[0] === "students")) {
    return { surface: "students" };
  }
  if (rest.length === 1 && (rest[0] === "instructor" || rest[0] === "instructors")) {
    return { surface: "instructors" };
  }
  if (rest.length === 1 && rest[0] === "admin") return { surface: "admin" };
  if (rest.length === 1 && rest[0] === "partners") return { surface: "partners" };
  if (rest.length === 1 && rest[0] === "enrollment-models") {
    return { surface: "enrollmentModels" };
  }

  if (rest[0] === "students") {
    const studentId = id(rest[1]);
    if (!studentId) return null;
    if (rest.length === 2) return { surface: "student", studentId };
    if (rest.length === 3 && rest[2] === "dashboard") {
      return { surface: "studentDashboard", studentId };
    }
    return null;
  }

  if (rest[0] === "instructors") {
    const instructorId = id(rest[1]);
    if (!instructorId) return null;
    if (rest.length === 2) return { surface: "instructor", instructorId };
    if (rest.length === 3 && rest[2] === "dashboard") {
      return { surface: "instructorDashboard", instructorId };
    }
    if (rest.length === 3 && rest[2] === "create") {
      return { surface: "courseCreation", instructorId };
    }
    if (rest.length === 3 && rest[2] === "analytics") {
      return { surface: "instructorAnalytics", instructorId };
    }
    if (rest.length === 3 && rest[2] === "financial") {
      return { surface: "instructorFinancial", instructorId };
    }
    return null;
  }

  if (rest[0] === "courses") {
    const slug = id(rest[1]);
    if (!slug) return null;
    if (rest.length === 2) return { surface: "course", slug };
    if (rest.length === 3 && rest[2] === "assessment") return { surface: "assessment", slug };
    if (rest.length === 3 && rest[2] === "certificate") return { surface: "certificate", slug };
    if (rest.length === 3 && rest[2] === "enroll") return { surface: "enroll", slug };
    if (rest.length === 3 && rest[2] === "pay") return { surface: "pay", slug };
    if (rest.length === 3 && rest[2] === "tutor") return { surface: "tutor", slug };
    if (rest.length === 4 && rest[2] === "lessons") {
      const lessonId = id(rest[3]);
      return lessonId ? { surface: "lesson", slug, lessonId } : null;
    }
    if (rest.length === 4 && rest[2] === "quiz") {
      const lessonId = id(rest[3]);
      return lessonId ? { surface: "quiz", slug, lessonId } : null;
    }
    if (rest.length === 4 && rest[2] === "exercise") {
      const exerciseId = id(rest[3]);
      return exerciseId ? { surface: "exercise", slug, exerciseId } : null;
    }
    if (rest.length === 4 && rest[2] === "tutor") {
      const lessonId = id(rest[3]);
      return lessonId ? { surface: "tutor", slug, lessonId } : null;
    }
    return null;
  }

  return null;
}

export function learningSandboxHref(route: LearningSandboxRoute): string {
  const base = "/sandbox/business-preview/learning";
  switch (route.surface) {
    case "home":
      return base;
    case "catalog":
      return `${base}/catalog`;
    case "search":
      return `${base}/search`;
    case "students":
      return `${base}/students`;
    case "student":
      return `${base}/students/${route.studentId}`;
    case "studentDashboard":
      return `${base}/students/${route.studentId}/dashboard`;
    case "course":
      return `${base}/courses/${route.slug}`;
    case "lesson":
      return `${base}/courses/${route.slug}/lessons/${route.lessonId}`;
    case "quiz":
      return `${base}/courses/${route.slug}/quiz/${route.lessonId}`;
    case "exercise":
      return `${base}/courses/${route.slug}/exercise/${route.exerciseId}`;
    case "assessment":
      return `${base}/courses/${route.slug}/assessment`;
    case "tutor":
      return route.lessonId
        ? `${base}/courses/${route.slug}/tutor/${route.lessonId}`
        : `${base}/courses/${route.slug}/tutor`;
    case "certificate":
      return `${base}/courses/${route.slug}/certificate`;
    case "enroll":
      return `${base}/courses/${route.slug}/enroll`;
    case "pay":
      return `${base}/courses/${route.slug}/pay`;
    case "instructors":
      return `${base}/instructors`;
    case "instructor":
      return `${base}/instructors/${route.instructorId}`;
    case "instructorDashboard":
      return `${base}/instructors/${route.instructorId}/dashboard`;
    case "courseCreation":
      return `${base}/instructors/${route.instructorId}/create`;
    case "instructorAnalytics":
      return `${base}/instructors/${route.instructorId}/analytics`;
    case "instructorFinancial":
      return `${base}/instructors/${route.instructorId}/financial`;
    case "admin":
      return `${base}/admin`;
    case "partners":
      return `${base}/partners`;
    case "enrollmentModels":
      return `${base}/enrollment-models`;
  }
}

export function routeFromSection(section: string): LearningSandboxRoute | null {
  return parseLearningSandboxRoute(section.split("/"));
}
