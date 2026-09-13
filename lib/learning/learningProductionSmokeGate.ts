/**
 * Learning Production Smoke & E2E Gate V1 — path registry + credential policy.
 * Capability: learning.ops.production_smoke_e2e_gate_v1
 */

export const LEARNING_SMOKE_NAMESPACE = "UMTUBA_LEARNING_E2E_20260803";

export const LEARNING_SMOKE_PATHS = [
  "catalog_preview",
  "enrollment_access",
  "course_lesson",
  "content_blocks",
  "progress",
  "assessment",
  "assignment_project",
  "ai_tutor",
  "community",
  "workspace",
  "live_fail_closed",
] as const;

export type LearningSmokePath = (typeof LEARNING_SMOKE_PATHS)[number];

export type LearningSmokeVerdict =
  | "PASS"
  | "FAIL"
  | "SKIPPED_NO_CREDENTIALS"
  | "SKIPPED_NO_BASE_URL"
  | "SKIPPED_UNSAFE"
  | "STRUCTURAL_PASS";

export type LearningSmokePathResult = {
  path: LearningSmokePath;
  verdict: LearningSmokeVerdict;
  detail: string;
};

/** Env names for opt-in remote / Playwright authenticated smoke (never commit values). */
export const LEARNING_SMOKE_ENV = {
  enabled: "LEARNING_E2E",
  baseUrl: "PLAYWRIGHT_BASE_URL",
  supabaseUrl: "NEXT_PUBLIC_SUPABASE_URL",
  supabaseAnon: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  learnerEmail: "LEARNING_E2E_LEARNER_EMAIL",
  learnerPassword: "LEARNING_E2E_LEARNER_PASSWORD",
  outsiderEmail: "LEARNING_E2E_OUTSIDER_EMAIL",
  outsiderPassword: "LEARNING_E2E_OUTSIDER_PASSWORD",
  instructorEmail: "LEARNING_E2E_INSTRUCTOR_EMAIL",
  instructorPassword: "LEARNING_E2E_INSTRUCTOR_PASSWORD",
  sandboxCourseId: "LEARNING_E2E_COURSE_ID",
  sandboxLessonId: "LEARNING_E2E_LESSON_ID",
  sandboxActivityId: "LEARNING_E2E_ACTIVITY_ID",
} as const;

export function learningSmokeCredentialsPresent(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const flag = (env[LEARNING_SMOKE_ENV.enabled] ?? "").trim();
  if (flag !== "1" && flag.toLowerCase() !== "true") return false;
  return Boolean(
    (env[LEARNING_SMOKE_ENV.supabaseUrl] ?? "").trim() &&
      (env[LEARNING_SMOKE_ENV.supabaseAnon] ?? "").trim() &&
      (env[LEARNING_SMOKE_ENV.learnerEmail] ?? "").trim() &&
      (env[LEARNING_SMOKE_ENV.learnerPassword] ?? "").trim()
  );
}

export function learningSmokeBaseUrl(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const raw = (env[LEARNING_SMOKE_ENV.baseUrl] ?? "").trim();
  return raw || null;
}

/**
 * Default local-gate matrix when only vitest structural/unit smoke ran.
 * Authenticated remote paths stay SKIPPED_NO_CREDENTIALS until operators
 * provision dedicated e2e Auth users + config.local.sql.
 */
export function buildLocalStructuralGateResults(opts: {
  contentBlocksPass: boolean;
  liveFailClosedPass: boolean;
  publicCatalogStructuralPass: boolean;
  harnessFilesPresent: boolean;
}): LearningSmokePathResult[] {
  const harness = opts.harnessFilesPresent
    ? "STRUCTURAL_PASS"
    : ("FAIL" as const);
  const blocks = opts.contentBlocksPass ? "PASS" : ("FAIL" as const);
  const live = opts.liveFailClosedPass ? "PASS" : ("FAIL" as const);
  const catalog = opts.publicCatalogStructuralPass
    ? "STRUCTURAL_PASS"
    : ("FAIL" as const);

  return [
    {
      path: "catalog_preview",
      verdict: catalog,
      detail:
        "Public catalog helpers + routes present; remote published slugs verified read-only when linked SQL used",
    },
    {
      path: "enrollment_access",
      verdict: "SKIPPED_NO_CREDENTIALS",
      detail:
        "Requires LEARNING_E2E=1 + dedicated learner/outsider Auth users (no prod learner mutation)",
    },
    {
      path: "course_lesson",
      verdict: "SKIPPED_NO_CREDENTIALS",
      detail: "Browser/RPC entitled outline+lesson needs sandbox learner JWT",
    },
    {
      path: "content_blocks",
      verdict: blocks,
      detail: "All 13 creatable types + unsafe fallbacks covered via renderToStaticMarkup",
    },
    {
      path: "progress",
      verdict: "SKIPPED_NO_CREDENTIALS",
      detail: "complete_learning_lesson mutation reserved for sandbox enrollment only",
    },
    {
      path: "assessment",
      verdict: "SKIPPED_NO_CREDENTIALS",
      detail: "start/save/submit reserved for sandbox activity + e2e learner",
    },
    {
      path: "assignment_project",
      verdict: "SKIPPED_NO_CREDENTIALS",
      detail: "Isolated submission only after seed-learning-sandbox.sql + config.local",
    },
    {
      path: "ai_tutor",
      verdict: "SKIPPED_NO_CREDENTIALS",
      detail: "ensure/append/resume/archive need sandbox course+lesson + e2e learner",
    },
    {
      path: "community",
      verdict: "SKIPPED_NO_CREDENTIALS",
      detail: "Discussion create reserved for sandbox course; cleanup script scoped to NS",
    },
    {
      path: "workspace",
      verdict: harness === "STRUCTURAL_PASS" ? "STRUCTURAL_PASS" : "FAIL",
      detail:
        "Spine/attachments/timeline modules + /workspace route present; entitled load needs learner",
    },
    {
      path: "live_fail_closed",
      verdict: live,
      detail: "Unit-proven: gate deny + LiveKit unset → token null + blocker",
    },
  ];
}

export function summarizeSmokeGate(results: LearningSmokePathResult[]): {
  hardFail: boolean;
  passCount: number;
  skipCount: number;
  failCount: number;
  launchReadyDeltaNote: string;
} {
  const failCount = results.filter((r) => r.verdict === "FAIL").length;
  const passCount = results.filter(
    (r) => r.verdict === "PASS" || r.verdict === "STRUCTURAL_PASS"
  ).length;
  const skipCount = results.filter((r) =>
    r.verdict.startsWith("SKIPPED_")
  ).length;
  return {
    hardFail: failCount > 0,
    passCount,
    skipCount,
    failCount,
    launchReadyDeltaNote:
      failCount > 0
        ? "Launch readiness unchanged/down — fix FAIL paths before re-score"
        : skipCount > 0
          ? "Harness landed; authenticated paths still credential-gated — launch readiness modest lift only"
          : "Full credentialed smoke green — launch readiness can rise materially",
  };
}
