import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("Learning premium surface wiring", () => {
  it("catalog uses searchable/filterable browser", () => {
    const page = read("app/learning/catalog/page.tsx");
    const browser = read("app/components/learning/CatalogBrowser.tsx");
    expect(page).toMatch(/CatalogBrowser/);
    expect(browser).toMatch(/role="search"/);
    expect(browser).toMatch(/type="search"/);
    expect(browser).toMatch(/learning\.catalog\.allLevels/);
    expect(browser).toMatch(/learning\.catalog\.clearFilters/);
    expect(browser).toMatch(/learning\.catalog\.skills/);
    expect(browser).toMatch(/md:flex/);
  });

  it("hub and progress surfaces wire progress bars", () => {
    const hub = read("app/components/learning/LearningHub.tsx");
    const summary = read("app/components/learning/ProgressSummary.tsx");
    expect(hub).toMatch(/LearningProgressBar/);
    expect(hub).toMatch(/learning\.hub\.continueLearning/);
    expect(summary).toMatch(/LearningProgressBar/);
    expect(summary).toMatch(/role|LearningStatusBadge/);
  });

  it("hub exposes catalog discovery and empty-state next action", () => {
    const hub = read("app/components/learning/LearningHub.tsx");
    expect(hub).toMatch(/LEARNING_PUBLIC_ROUTES/);
    expect(hub).toMatch(/learning\.hub\.browseCatalog/);
    expect(hub).toMatch(/learning\.hub\.transcript/);
    expect(hub).toMatch(/learning\.hub\.nothingEnrolledTitle/);
    expect(hub).toMatch(/learning\.hub\.startLearning/);
  });

  it("course outline has a continue CTA and highlights the next lesson", () => {
    const outline = read("app/components/learning/CourseOutline.tsx");
    expect(outline).toMatch(/pickOutlineContinueLesson/);
    expect(outline).toMatch(/learning\.outline\.startLesson/);
    expect(outline).toMatch(/learning\.outline\.continue/);
    expect(outline).toMatch(/aria-current/);
    expect(outline).toMatch(/min-h-11/);
  });

  it("lesson is content-first and keeps lesson nav RTL-safe", () => {
    const lesson = read("app/components/learning/LessonViewer.tsx");
    const contentIdx = lesson.indexOf("learning.lesson.content");
    const objectivesIdx = lesson.indexOf("learning.lesson.objectives");
    expect(contentIdx).toBeGreaterThan(-1);
    expect(objectivesIdx).toBeGreaterThan(contentIdx);
    expect(lesson).toMatch(/learning\.lesson\.askAiTutor/);
    expect(lesson).toMatch(/rtl:rotate-180/);
    expect(lesson).toMatch(/learning\.lesson\.markComplete/);
    expect(lesson).toMatch(/min-h-11/);
  });

  it("progress page uses section names instead of truncated UUIDs", () => {
    const progress = read(
      "app/learning/courses/[courseId]/progress/page.tsx"
    );
    expect(progress).toMatch(/loadCourseOutline/);
    expect(progress).toMatch(/sectionNames/);
    expect(progress).not.toMatch(/slice\(0,\s*8\)/);
    expect(progress).toMatch(/Resume learning|Continue watching/);
  });

  it("quiz and certificate empties keep an obvious next action", () => {
    const attempt = read("app/components/learning/AttemptPlayer.tsx");
    const assessment = read(
      "app/learning/activities/[activityId]/assessment/page.tsx"
    );
    const transcript = read("app/learning/transcript/page.tsx");
    expect(attempt).toMatch(/Submit attempt/);
    expect(attempt).toMatch(/min-h-11/);
    expect(assessment).toMatch(/Start assessment attempt/);
    expect(assessment).toMatch(/min-h-11/);
    expect(transcript).toMatch(/Continue learning/);
    expect(transcript).toMatch(/Certificate issued/);
  });

  it("AI Tutor presents human labels instead of raw kinds", () => {
    const tutor = read("app/learning/lessons/[lessonId]/ai-tutor/page.tsx");
    expect(tutor).toMatch(/Ask a question/);
    expect(tutor).toMatch(/Explain again/);
    expect(tutor).toMatch(/tutorRoleLabel/);
    expect(tutor).toMatch(/min-h-11/);
  });
});

describe("Learning world-class viewport and a11y contracts", () => {
  const VIEWPORTS = [360, 390, 430, 768, 1024, 1440] as const;

  it("locks mobile-first gutters and 44px primary targets", () => {
    const files = [
      "app/components/learning/LearningHub.tsx",
      "app/components/learning/CatalogBrowser.tsx",
      "app/components/learning/CourseOutline.tsx",
      "app/components/learning/LessonViewer.tsx",
      "app/components/learning/ds/LearningContainer.tsx",
    ];
    for (const rel of files) {
      const src = read(rel);
      expect(src).toMatch(/min-h-11|px-4/);
    }
    const container = read(
      "app/components/learning/ds/LearningContainer.tsx"
    );
    expect(container).toMatch(/px-4/);
    expect(container).toMatch(/md:px-6/);
    expect(VIEWPORTS.length).toBe(6);
  });

  it("catalog filters stack on small screens and split from sm+", () => {
    const browser = read("app/components/learning/CatalogBrowser.tsx");
    expect(browser).toMatch(/sm:grid-cols-2/);
    expect(browser).toMatch(/md:flex/);
    expect(browser).toMatch(/md:w-44/);
  });

  it("loading chrome stays full-bleed outside the content column", () => {
    const loading = read("app/learning/loading.tsx");
    const navIdx = loading.indexOf("<AppTopNav");
    const columnIdx = loading.indexOf("max-w-2xl");
    expect(navIdx).toBeGreaterThan(-1);
    expect(columnIdx).toBeGreaterThan(navIdx);
    expect(loading).toMatch(/aria-busy="true"/);
  });

  it("shell and lesson chevrons flip in RTL", () => {
    const shell = read("app/components/learning/LearningShell.tsx");
    const lesson = read("app/components/learning/LessonViewer.tsx");
    expect(shell).toMatch(/rtl:rotate-180/);
    expect(lesson).toMatch(/rtl:rotate-180/);
    expect(shell).toMatch(/watch-focus-ring/);
  });
});
