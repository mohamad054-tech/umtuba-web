import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Learning Instructor Browser E2E Foundation V1 — harness contracts", () => {
  it("keeps instructor foundation files present", () => {
    for (const rel of [
      "e2e/learning/instructor-authoring-journey.mjs",
      "scripts/learning-e2e/run-instructor-foundation.mjs",
      "scripts/learning-e2e/env.mjs",
      "scripts/learning-e2e/auth.mjs",
      "docs/learning/implementation/LEARNING_INSTRUCTOR_BROWSER_E2E_FOUNDATION_V1.md",
    ]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("distinguishes SKIPPED_ENV from FAIL and never hardcodes credentials", () => {
    const runner = read("scripts/learning-e2e/run-instructor-foundation.mjs");
    const env = read("scripts/learning-e2e/env.mjs");
    const auth = read("scripts/learning-e2e/auth.mjs");
    const journey = read("e2e/learning/instructor-authoring-journey.mjs");
    const pkg = read("package.json");

    expect(pkg).toMatch(/"test:learning-e2e:instructor"/);
    expect(runner).toMatch(/SKIPPED_ENV/);
    expect(runner).toMatch(/process\.exit\(0\)/);
    expect(runner).toMatch(/LEARNING_INSTRUCTOR_BROWSER_E2E_FOUNDATION_V1 FAIL/);
    expect(runner).toMatch(/IMPLEMENTED_BUT_ENV_BLOCKED/);
    expect(env).toMatch(/resolveInstructorLearningE2eEnv/);
    expect(env).toMatch(/LEARNING_E2E_INSTRUCTOR_EMAIL/);
    expect(env).toMatch(/LEARNING_E2E_ACTIVITY_ID/);
    expect(auth).toMatch(/login\?next=/);
    expect(auth).not.toMatch(/password\s*=\s*["'][^"']+["']/i);
    expect(runner).not.toMatch(/password\s*=\s*["'][^"']+["']/i);
    expect(journey).not.toMatch(/password\s*=\s*["'][^"']+["']/i);
    expect(journey).toMatch(/learning-instructor-dashboard/);
    expect(journey).toMatch(/learning-instructor-course-tree/);
    expect(journey).toMatch(/learning-instructor-lesson-blocks/);
    expect(journey).toMatch(/learning-instructor-review-queue/);
    expect(journey).toMatch(/runInstructorAnonymousFailClosed/);
    expect(journey).toMatch(/Commerce\/money/);
  });

  it("wires instructor testids used by the browser journey", () => {
    const shell = read("app/components/learning/LearningShell.tsx");
    const dash = read("app/learning/instructor/page.tsx");
    const course = read(
      "app/learning/instructor/courses/[courseId]/page.tsx"
    );
    const lesson = read(
      "app/learning/instructor/courses/[courseId]/lessons/[lessonId]/page.tsx"
    );
    const review = read("app/learning/instructor/review/page.tsx");
    const questions = read(
      "app/learning/instructor/courses/[courseId]/activities/[activityId]/questions/page.tsx"
    );
    const assignment = read(
      "app/learning/instructor/courses/[courseId]/activities/[activityId]/assignment/page.tsx"
    );

    expect(shell).toMatch(/testId\?: string/);
    expect(shell).toMatch(/data-testid=\{testId\}/);
    expect(dash).toMatch(/testId="learning-instructor-dashboard"/);
    expect(dash).toMatch(/data-testid="learning-instructor-dashboard-nav"/);
    expect(dash).toMatch(/data-testid="learning-instructor-nav-review"/);
    expect(course).toMatch(/testId="learning-instructor-course-tree"/);
    expect(course).toMatch(/testId="learning-instructor-course-unavailable"/);
    expect(lesson).toMatch(/testId="learning-instructor-lesson-blocks"/);
    expect(lesson).toMatch(/data-testid="learning-instructor-block-type"/);
    expect(review).toMatch(/testId="learning-instructor-review-queue"/);
    expect(questions).toMatch(
      /testId="learning-instructor-assessment-questions"/
    );
    expect(assignment).toMatch(
      /learning-instructor-assignment-author/
    );
  });

  it("does not mutate remote/production and avoids save assertions", () => {
    const journey = read("e2e/learning/instructor-authoring-journey.mjs");
    const runner = read("scripts/learning-e2e/run-instructor-foundation.mjs");
    expect(journey).not.toMatch(/createContentBlockAction/);
    expect(journey).not.toMatch(/Publish Course/);
    expect(journey).not.toMatch(/SUPABASE_SERVICE_ROLE/);
    expect(runner).not.toMatch(/provision-fixtures/);
    expect(runner).not.toMatch(/ALLOW_PROD/);
  });

  it("keeps learner foundation runner intact", () => {
    expect(existsSync(join(ROOT, "e2e/learning/learner-access-journey.mjs"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, "scripts/learning-e2e/run-foundation.mjs"))).toBe(
      true
    );
    const pkg = read("package.json");
    expect(pkg).toMatch(/"test:learning-e2e":/);
    expect(pkg).toMatch(/"test:learning-e2e:instructor":/);
  });
});
