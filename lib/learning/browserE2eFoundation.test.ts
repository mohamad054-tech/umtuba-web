import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Learning Browser E2E Foundation V1 — harness contracts", () => {
  it("keeps foundation files present", () => {
    for (const rel of [
      "e2e/learning/learner-access-journey.mjs",
      "scripts/learning-e2e/env.mjs",
      "scripts/learning-e2e/auth.mjs",
      "scripts/learning-e2e/run-foundation.mjs",
      "docs/learning/implementation/LEARNING_BROWSER_E2E_FOUNDATION_V1.md",
    ]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("distinguishes SKIPPED_ENV from FAIL and never hardcodes credentials", () => {
    const runner = read("scripts/learning-e2e/run-foundation.mjs");
    const env = read("scripts/learning-e2e/env.mjs");
    const auth = read("scripts/learning-e2e/auth.mjs");
    const journey = read("e2e/learning/learner-access-journey.mjs");

    expect(runner).toMatch(/SKIPPED_ENV/);
    expect(runner).toMatch(/process\.exit\(0\)/);
    expect(runner).toMatch(/LEARNING_BROWSER_E2E_FOUNDATION_V1 FAIL/);
    expect(env).toMatch(/LEARNING_E2E_BASE_URL/);
    expect(env).toMatch(/LEARNING_E2E_LOCKED_LESSON_ID/);
    expect(auth).toMatch(/login\?next=/);
    expect(auth).toMatch(/input\[name="email"\]/);
    expect(auth).not.toMatch(/password\s*=\s*["'][^"']+["']/i);
    expect(runner).not.toMatch(/password\s*=\s*["'][^"']+["']/i);
    expect(journey).toMatch(/learning-hub/);
    expect(journey).toMatch(/learning-lesson-content/);
    expect(journey).toMatch(/learning-lesson-locked/);
    expect(journey).toMatch(/learning-lesson-nav-prev|learning-hub-resume/);
  });

  it("wires minimal Learning testids used by the journey", () => {
    const hub = read("app/components/learning/LearningHub.tsx");
    const outline = read("app/components/learning/CourseOutline.tsx");
    const viewer = read("app/components/learning/LessonViewer.tsx");
    expect(hub).toMatch(/data-testid="learning-hub"/);
    expect(hub).toMatch(/data-testid="learning-hub-resume"/);
    expect(outline).toMatch(/data-testid="learning-course-outline"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-viewer"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-content"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-locked"/);
    expect(viewer).toMatch(/data-testid="learning-lesson-nav"/);
  });
});
