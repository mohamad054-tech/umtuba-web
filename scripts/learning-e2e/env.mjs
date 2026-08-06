/**
 * Learning browser E2E env gate.
 * Never logs secret values. Missing required env → SKIPPED_ENV (not FAIL).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const LEARNING_E2E_REQUIRED = [
  "LEARNING_E2E_BASE_URL",
  "LEARNING_E2E_EMAIL",
  "LEARNING_E2E_PASSWORD",
  "LEARNING_E2E_COURSE_ID",
  "LEARNING_E2E_LESSON_ID",
  "LEARNING_E2E_LOCKED_LESSON_ID",
];

export function loadDotEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readTrimmed(name) {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * @returns {{ ok: true, config: object } | { ok: false, reason: "SKIPPED_ENV", missing: string[] }}
 */
export function resolveLearningE2eEnv() {
  loadDotEnvLocal();
  const missing = [];
  const config = {};

  for (const key of LEARNING_E2E_REQUIRED) {
    const value = readTrimmed(key);
    if (!value) missing.push(key);
    else config[key] = value;
  }

  if (missing.length > 0) {
    return { ok: false, reason: "SKIPPED_ENV", missing };
  }

  if (!/^https?:\/\//i.test(config.LEARNING_E2E_BASE_URL)) {
    return {
      ok: false,
      reason: "SKIPPED_ENV",
      missing: ["LEARNING_E2E_BASE_URL (must be http(s) URL)"],
    };
  }

  for (const idKey of [
    "LEARNING_E2E_COURSE_ID",
    "LEARNING_E2E_LESSON_ID",
    "LEARNING_E2E_LOCKED_LESSON_ID",
  ]) {
    if (!UUID_RE.test(config[idKey])) {
      return {
        ok: false,
        reason: "SKIPPED_ENV",
        missing: [`${idKey} (must be UUID)`],
      };
    }
  }

  if (config.LEARNING_E2E_LESSON_ID === config.LEARNING_E2E_LOCKED_LESSON_ID) {
    return {
      ok: false,
      reason: "SKIPPED_ENV",
      missing: [
        "LEARNING_E2E_LESSON_ID / LEARNING_E2E_LOCKED_LESSON_ID (must differ)",
      ],
    };
  }

  return {
    ok: true,
    config: {
      baseUrl: config.LEARNING_E2E_BASE_URL.replace(/\/$/, ""),
      email: config.LEARNING_E2E_EMAIL,
      password: config.LEARNING_E2E_PASSWORD,
      courseId: config.LEARNING_E2E_COURSE_ID,
      lessonId: config.LEARNING_E2E_LESSON_ID,
      lockedLessonId: config.LEARNING_E2E_LOCKED_LESSON_ID,
    },
  };
}
