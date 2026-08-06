import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Learning E2E fixture provisioning contracts", () => {
  it("keeps provisioner entrypoints present", () => {
    for (const rel of [
      "scripts/learning-e2e/provision-env.mjs",
      "scripts/learning-e2e/provision-fixtures.mjs",
      "scripts/learning-e2e/provision-and-run.mjs",
      "docs/learning/implementation/LEARNING_E2E_FIXTURE_PROVISIONING_AND_LIVE_RUN_V1.md",
    ]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("fail-closes missing env and refuses prod without explicit allow", () => {
    const env = read("scripts/learning-e2e/provision-env.mjs");
    const provision = read("scripts/learning-e2e/provision-fixtures.mjs");
    expect(env).toMatch(/BLOCKED_ENV|BLOCKED_PROD/);
    expect(env).toMatch(/LEARNING_E2E_ALLOW_PROD/);
    expect(env).toMatch(/classifyLearningE2eEnv/);
    expect(provision).toMatch(/UMTUBA_LEARNING_E2E_V1/);
    expect(provision).toMatch(/Never prints passwords|never print|Never log/i);
    expect(provision).not.toMatch(/password\s*:\s*["'][^"']+["']/i);
    expect(provision).toMatch(/createUser|updateUserById/);
    expect(provision).toMatch(/set_learning_lesson_point_cost/);
    expect(provision).toMatch(/create_learning_enrollment/);
  });
});
