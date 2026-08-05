import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/**
 * Production smoke inventory for Learning on the tutor lesson-binding tip.
 * Does not enable product flags and does not touch migrations.
 */
describe("Learning Production Smoke & E2E Gate V1", () => {
  it("keeps critical learning foundation modules present", () => {
    for (const rel of [
      "lib/learning/programsFoundation.ts",
      "lib/learning/coursesFoundation.ts",
      "lib/learning/lessonsFoundation.ts",
      "lib/learning/progressFoundation.ts",
      "lib/learning/learnerDelivery.ts",
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
