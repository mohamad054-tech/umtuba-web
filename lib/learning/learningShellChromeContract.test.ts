import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("LearningShell platform chrome contract", () => {
  it("keeps AppTopNav full-bleed (not nested inside max-w-2xl)", () => {
    const shellSrc = read("app/components/learning/LearningShell.tsx");
    const navIdx = shellSrc.indexOf("<AppTopNav");
    const constrainIdx = shellSrc.indexOf('className="mx-auto max-w-2xl');
    expect(navIdx).toBeGreaterThan(-1);
    expect(constrainIdx).toBeGreaterThan(-1);
    expect(navIdx).toBeLessThan(constrainIdx);
  });

  it("keeps a single document H1 via AppTopNav (hub/lesson/course/attempt use h2)", () => {
    const hub = read("app/components/learning/LearningHub.tsx");
    const lesson = read("app/components/learning/LessonViewer.tsx");
    const course = read("app/components/learning/CourseOutline.tsx");
    const attempt = read("app/components/learning/AttemptPlayer.tsx");

    expect(hub).toMatch(/<h2[^>]*>\s*Continue learning\s*<\/h2>/);
    expect(hub).not.toMatch(/<h1\b/);
    expect(lesson).toMatch(/<h2 className="mt-1 text-3xl/);
    expect(lesson).not.toMatch(/<h1\b/);
    expect(course).toMatch(/<h2 className="mt-1 text-3xl/);
    expect(course).not.toMatch(/<h1\b/);
    expect(attempt).toMatch(/<h2 className="mt-1 text-3xl/);
    expect(attempt).not.toMatch(/<h1\b/);
  });

  it("demotes LearningShell page intros to h2 (no nested document H1)", () => {
    const pages = [
      "app/learning/catalog/[courseSlug]/page.tsx",
      "app/learning/activities/[activityId]/page.tsx",
      "app/learning/activities/[activityId]/assessment/page.tsx",
      "app/learning/activities/[activityId]/assessment-attempts/[attemptId]/page.tsx",
    ];
    for (const rel of pages) {
      const src = read(rel);
      expect(src.includes("<h1"), `${rel} must not declare <h1>`).toBe(false);
      expect(src.includes("<h2"), `${rel} must use <h2>`).toBe(true);
    }
  });
});
