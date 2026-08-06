import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * Production smoke inventory for Learning on the current Learning SoT tip.
 * Additive gate only: verifies critical foundations remain present.
 * Does not enable product flags and does not touch migrations.
 */
describe("Learning Production Smoke & E2E Gate onto SoT V1", () => {
  it("keeps critical learning foundation modules present", () => {
    for (const rel of [
      // Catalog / structure
      "lib/learning/programsFoundation.ts",
      "lib/learning/coursesFoundation.ts",
      "lib/learning/lessonsFoundation.ts",
      // Enrollment + progress
      "lib/learning/enrollmentsFoundation.ts",
      "lib/learning/progressFoundation.ts",
      // Lesson delivery + resume-accessible target validation
      "lib/learning/learnerDelivery.ts",
      // Lesson engine access composition (incl. accessible-set compose)
      "lib/learning/lessonEngineFoundation.ts",
      // Unlock fail-closed
      "lib/learning/lessonUnlockFoundation.ts",
      // Assessments + completion (already present on SoT)
      "lib/learning/assessmentDelivery.ts",
      "lib/learning/completionFoundation.ts",
    ]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("keeps access / unlock / composite coverage artifacts present", () => {
    for (const rel of [
      "lib/learning/lessonContentAccess.test.ts",
      "lib/learning/lessonEngineFoundation.test.ts",
      "lib/learning/learnerDelivery.test.ts",
      "lib/learning/lessonUnlockFoundation.test.ts",
      "docs/learning/implementation/LESSON_ENGINE_COMPOSITE_ACCESS_FIX_V1.md",
    ]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("keeps browser e2e foundation entrypoints present", () => {
    for (const rel of [
      "e2e/learning/learner-access-journey.mjs",
      "scripts/learning-e2e/run-foundation.mjs",
      "docs/learning/implementation/LEARNING_BROWSER_E2E_FOUNDATION_V1.md",
    ]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("keeps gate documentation in docs/learning", () => {
    expect(
      existsSync(
        join(
          ROOT,
          "docs/learning/implementation/LEARNING_PRODUCTION_SMOKE_E2E_GATE_V1.md"
        )
      )
    ).toBe(true);
  });
});
