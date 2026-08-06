#!/usr/bin/env node
/**
 * Learning Browser E2E Foundation V1 runner.
 *
 * Exit codes:
 *   0 — PASS, or SKIPPED_ENV (missing fixtures / base URL / credentials)
 *   1 — FAIL (browser journey assertion failed or unexpected error)
 *
 * Never prints passwords or other secret values.
 *
 * Usage:
 *   node scripts/learning-e2e/run-foundation.mjs
 */

import { chromium } from "playwright";
import { resolveLearningE2eEnv } from "./env.mjs";
import { loginLearningE2eUser } from "./auth.mjs";
import { runLearnerAccessJourney } from "../../e2e/learning/learner-access-journey.mjs";

async function main() {
  const resolved = resolveLearningE2eEnv();
  if (!resolved.ok) {
    console.log("SKIPPED_ENV");
    console.log(
      `Learning browser E2E skipped — missing/invalid: ${resolved.missing.join(", ")}`
    );
    console.log(
      "Set LEARNING_E2E_BASE_URL, LEARNING_E2E_EMAIL, LEARNING_E2E_PASSWORD, LEARNING_E2E_COURSE_ID, LEARNING_E2E_LESSON_ID, LEARNING_E2E_LOCKED_LESSON_ID to run."
    );
    process.exit(0);
  }

  const { config } = resolved;
  console.log("LEARNING_BROWSER_E2E_FOUNDATION_V1 starting");
  console.log(`baseUrl=${config.baseUrl}`);
  console.log(`courseId=${config.courseId}`);
  console.log(`lessonId=${config.lessonId}`);
  console.log(`lockedLessonId=${config.lockedLessonId}`);
  // Never log email/password.

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await loginLearningE2eUser(page, config);
    await runLearnerAccessJourney(page, config);
    console.log("LEARNING_BROWSER_E2E_FOUNDATION_V1 PASS");
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("LEARNING_BROWSER_E2E_FOUNDATION_V1 FAIL");
    console.error(message);
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("LEARNING_BROWSER_E2E_FOUNDATION_V1 FAIL");
  console.error(message);
  process.exit(1);
});
