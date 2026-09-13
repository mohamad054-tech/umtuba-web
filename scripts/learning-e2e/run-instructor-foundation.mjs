#!/usr/bin/env node
/**
 * Learning Instructor Browser E2E Foundation V1 runner.
 *
 * Exit codes:
 *   0 — PASS, or SKIPPED_ENV (missing fixtures / base URL / credentials)
 *   1 — FAIL (browser journey assertion failed or unexpected error)
 *
 * Never prints passwords or other secret values.
 *
 * Usage:
 *   node scripts/learning-e2e/run-instructor-foundation.mjs
 *   npm run test:learning-e2e:instructor
 */

import { chromium } from "playwright";
import { resolveInstructorLearningE2eEnv } from "./env.mjs";
import { loginLearningE2eUser } from "./auth.mjs";
import {
  runInstructorAnonymousFailClosed,
  runInstructorAuthoringJourney,
} from "../../e2e/learning/instructor-authoring-journey.mjs";

async function main() {
  const resolved = resolveInstructorLearningE2eEnv();
  if (!resolved.ok) {
    console.log("SKIPPED_ENV");
    console.log(
      `Learning instructor browser E2E skipped — missing/invalid: ${resolved.missing.join(", ")}`
    );
    console.log(
      "Set LEARNING_E2E_BASE_URL, LEARNING_E2E_INSTRUCTOR_EMAIL|LEARNING_E2E_EMAIL, LEARNING_E2E_INSTRUCTOR_PASSWORD|LEARNING_E2E_PASSWORD, LEARNING_E2E_COURSE_ID, LEARNING_E2E_LESSON_ID to run."
    );
    console.log(
      "Optional: LEARNING_E2E_ACTIVITY_ID for assessment/assignment happy-path scenarios."
    );
    process.exit(0);
  }

  const { config } = resolved;
  console.log("LEARNING_INSTRUCTOR_BROWSER_E2E_FOUNDATION_V1 starting");
  console.log(`baseUrl=${config.baseUrl}`);
  console.log(`courseId=${config.courseId}`);
  console.log(`lessonId=${config.lessonId}`);
  console.log(
    `activityId=${config.activityId ?? "(unset — assessment/assignment happy paths blocked)"}`
  );
  // Never log email/password.

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await runInstructorAnonymousFailClosed(browser, config);
    console.log("scenario=anonymous_fail_closed PASS");

    await loginLearningE2eUser(page, config, "/learning/instructor");
    const result = await runInstructorAuthoringJourney(page, config);
    for (const name of result.ran) {
      console.log(`scenario=${name} PASS`);
    }
    for (const item of result.blocked) {
      console.log(
        `scenario=${item.scenario} IMPLEMENTED_BUT_ENV_BLOCKED reason=${item.reason}`
      );
    }
    console.log("LEARNING_INSTRUCTOR_BROWSER_E2E_FOUNDATION_V1 PASS");
    console.log(
      JSON.stringify({
        ran: result.ran.length + 1,
        blocked: result.blocked.length,
        blockedScenarios: result.blocked,
      })
    );
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("LEARNING_INSTRUCTOR_BROWSER_E2E_FOUNDATION_V1 FAIL");
    console.error(message);
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("LEARNING_INSTRUCTOR_BROWSER_E2E_FOUNDATION_V1 FAIL");
  console.error(message);
  process.exit(1);
});
