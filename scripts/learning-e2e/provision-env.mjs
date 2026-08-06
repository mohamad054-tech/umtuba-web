/**
 * Learning E2E fixture environment classification + fail-closed gates.
 * Never logs secret values.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const FIXTURE_NS = "UMTUBA_LEARNING_E2E_V1";
export const FIXTURE_SPACE_SLUG = "umtuba-learning-e2e-v1-space";
export const FIXTURE_PROGRAM_SLUG = "umtuba-learning-e2e-v1-program";
export const FIXTURE_COURSE_SLUG = "umtuba-learning-e2e-v1-course";
export const FIXTURE_SECTION_SLUG = "umtuba-learning-e2e-v1-section";
export const FIXTURE_LESSON_OPEN_SLUG = "umtuba-learning-e2e-v1-lesson-open";
export const FIXTURE_LESSON_LOCKED_SLUG = "umtuba-learning-e2e-v1-lesson-locked";

const PROD_HOST_RE =
  /(^|\.)umtuba\.com$/i;

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
 * Classify runtime target. Prefer explicit LEARNING_E2E_ENV.
 * @returns {"local"|"test"|"prod"|"unknown"}
 */
export function classifyLearningE2eEnv(baseUrl) {
  const explicit = readTrimmed("LEARNING_E2E_ENV").toLowerCase();
  if (explicit === "local" || explicit === "test" || explicit === "prod") {
    return explicit;
  }
  if (!baseUrl) return "unknown";
  let host = "";
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return "unknown";
  }
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return "local";
  }
  if (PROD_HOST_RE.test(host)) return "prod";
  return "test";
}

/**
 * Resolve provisioner config. Fail closed — never invent credentials.
 * @returns {{ ok: true, config: object } | { ok: false, code: string, missing: string[] }}
 */
export function resolveProvisionEnv() {
  loadDotEnvLocal();
  const missing = [];

  const baseUrl = readTrimmed("LEARNING_E2E_BASE_URL").replace(/\/$/, "");
  const email = readTrimmed("LEARNING_E2E_EMAIL");
  const password = readTrimmed("LEARNING_E2E_PASSWORD");
  const instructorEmail =
    readTrimmed("LEARNING_E2E_INSTRUCTOR_EMAIL") || email;
  const instructorPassword =
    readTrimmed("LEARNING_E2E_INSTRUCTOR_PASSWORD") || password;
  const supabaseUrl =
    readTrimmed("LEARNING_E2E_SUPABASE_URL") ||
    readTrimmed("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey =
    readTrimmed("LEARNING_E2E_SUPABASE_SERVICE_ROLE_KEY") ||
    readTrimmed("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey =
    readTrimmed("LEARNING_E2E_SUPABASE_ANON_KEY") ||
    readTrimmed("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    readTrimmed("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!baseUrl) missing.push("LEARNING_E2E_BASE_URL");
  else if (!/^https?:\/\//i.test(baseUrl)) {
    missing.push("LEARNING_E2E_BASE_URL (must be http(s) URL)");
  }
  if (!email) missing.push("LEARNING_E2E_EMAIL");
  if (!password) missing.push("LEARNING_E2E_PASSWORD");
  if (!supabaseUrl) {
    missing.push("LEARNING_E2E_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!serviceRoleKey) {
    missing.push(
      "LEARNING_E2E_SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  if (!anonKey) {
    missing.push(
      "LEARNING_E2E_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    );
  }

  if (missing.length > 0) {
    return { ok: false, code: "BLOCKED_ENV", missing };
  }

  const envClass = classifyLearningE2eEnv(baseUrl);
  const allowProd = readTrimmed("LEARNING_E2E_ALLOW_PROD") === "1";
  if (envClass === "prod" && !allowProd) {
    return {
      ok: false,
      code: "BLOCKED_PROD",
      missing: [
        "LEARNING_E2E_ALLOW_PROD=1 required for production mutation (refused)",
      ],
    };
  }
  if (envClass === "unknown") {
    return {
      ok: false,
      code: "BLOCKED_ENV",
      missing: ["LEARNING_E2E_ENV must be local|test|prod when host is ambiguous"],
    };
  }

  return {
    ok: true,
    config: {
      baseUrl,
      email,
      password,
      instructorEmail,
      instructorPassword,
      supabaseUrl: supabaseUrl.replace(/\/$/, ""),
      serviceRoleKey,
      anonKey,
      envClass,
      ns: FIXTURE_NS,
    },
  };
}
