import { learningSandboxHref, type LearningSandboxRoute } from "./routes";

export const FOCUS_E2E_STUDENT = "demo-student-01";
export const FOCUS_E2E_ORIGINAL = "umtuba-platform-essentials";
export const FOCUS_E2E_LESSON = "pe-m1-l1";
export const FOCUS_E2E_QUIZ = "pe-m1-q";
export const FOCUS_E2E_EXERCISE = "pe-ex-1";
export const FOCUS_E2E_PAID = "demo-partner-structured-thinking";
export const FOCUS_E2E_EXTERNAL = "demo-external-cloud-primer";
export const FOCUS_E2E_INSTRUCTOR = "demo-instructor-01";

export type ClickStep = {
  id: string;
  title: string;
  route: LearningSandboxRoute;
  href: string;
};

export function studentE2eClickPath(): ClickStep[] {
  const routes: LearningSandboxRoute[] = [
    { surface: "home" },
    { surface: "catalog" },
    { surface: "search" },
    { surface: "students" },
    { surface: "student", studentId: FOCUS_E2E_STUDENT },
    { surface: "studentDashboard", studentId: FOCUS_E2E_STUDENT },
    { surface: "course", slug: FOCUS_E2E_ORIGINAL },
    { surface: "enroll", slug: FOCUS_E2E_ORIGINAL },
    { surface: "lesson", slug: FOCUS_E2E_ORIGINAL, lessonId: FOCUS_E2E_LESSON },
    { surface: "quiz", slug: FOCUS_E2E_ORIGINAL, lessonId: FOCUS_E2E_QUIZ },
    { surface: "exercise", slug: FOCUS_E2E_ORIGINAL, exerciseId: FOCUS_E2E_EXERCISE },
    { surface: "assessment", slug: FOCUS_E2E_ORIGINAL },
    { surface: "tutor", slug: FOCUS_E2E_ORIGINAL, lessonId: FOCUS_E2E_LESSON },
    { surface: "certificate", slug: FOCUS_E2E_ORIGINAL },
    { surface: "course", slug: FOCUS_E2E_PAID },
    { surface: "pay", slug: FOCUS_E2E_PAID },
    { surface: "course", slug: FOCUS_E2E_EXTERNAL },
    { surface: "instructors" },
    { surface: "instructor", instructorId: FOCUS_E2E_INSTRUCTOR },
    { surface: "instructorDashboard", instructorId: FOCUS_E2E_INSTRUCTOR },
    { surface: "courseCreation", instructorId: FOCUS_E2E_INSTRUCTOR },
    { surface: "instructorAnalytics", instructorId: FOCUS_E2E_INSTRUCTOR },
    { surface: "instructorFinancial", instructorId: FOCUS_E2E_INSTRUCTOR },
    { surface: "admin" },
    { surface: "partners" },
    { surface: "enrollmentModels" },
  ];
  return routes.map((route, index) => ({
    id: `step-${String(index + 1).padStart(2, "0")}`,
    title: route.surface,
    route,
    href: learningSandboxHref(route),
  }));
}
