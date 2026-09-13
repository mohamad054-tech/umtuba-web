import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_PUBLIC_PREVIEW_RPCS,
  LEARNING_PUBLIC_ROUTES,
} from "./publicCatalog";
import {
  LEARNING_AI_TUTOR_RPCS,
  ensureMyAiTutorActiveThread,
  archiveMyAiTutorThread,
  resumeMyAiTutorThread,
} from "./aiTutorFoundation";
import {
  loadCollaborationWorkspaceSpine,
} from "./collaborationWorkspaceSpine";
import { loadCollaborationWorkspaceAttachments } from "./collaborationWorkspaceAttachments";
import { loadCollaborationWorkspaceTimeline } from "./collaborationWorkspaceTimeline";
import {
  createLearningDiscussionThread,
  getLearningCourseCommunityFeed,
} from "./communityFoundation";
import {
  completeMyLearningLesson,
  loadCourseOutline,
  loadLessonDelivery,
} from "./learnerDelivery";
import { loadMyAssignment } from "./assignmentsCoursework";
import { loadMyProject } from "./projectsFoundation";
import { startAssessmentAttempt } from "./assessmentAttemptFoundation";
import { saveAssessmentAnswer } from "./assessmentAnswerPersistence";
import { submitAssessmentAttempt } from "./assessmentSubmissionFoundation";
import { requestLearningLiveJoin } from "./liveCalendarFoundation";
import {
  ALL_CREATABLE_TYPES,
  CREATABLE_BLOCK_FIXTURES,
} from "./contentBlockSmokeFixtures";
import {
  LEARNING_SMOKE_ENV,
  LEARNING_SMOKE_NAMESPACE,
  LEARNING_SMOKE_PATHS,
  buildLocalStructuralGateResults,
  learningSmokeCredentialsPresent,
  summarizeSmokeGate,
} from "./learningProductionSmokeGate";

const ROOT = process.cwd();

const HARNESS_FILES = [
  "scripts/learning-e2e/config.example.sql",
  "scripts/learning-e2e/seed-learning-sandbox.sql",
  "scripts/learning-e2e/verify-learning-sandbox.sql",
  "scripts/learning-e2e/cleanup-learning-sandbox.sql",
  "scripts/learning-e2e/run-access-checks.sql",
  "scripts/learning-smoke/run-gate.mjs",
  "scripts/learning-smoke/verify-public-catalog.sql",
  "docs/learning/operations/LEARNING_REMOTE_SMOKE_E2E_GATE_V1.md",
  "e2e/learning/playwright.config.ts",
  "e2e/learning/smoke/public-catalog.spec.ts",
  "e2e/learning/smoke/learner-critical-path.spec.ts",
  "app/learning/catalog/page.tsx",
  "app/learning/courses/[courseId]/workspace/page.tsx",
  "lib/learning/collaborationWorkspaceSpine.ts",
  "lib/learning/collaborationWorkspaceAttachments.ts",
  "lib/learning/collaborationWorkspaceTimeline.ts",
] as const;

describe("learning production smoke gate registry", () => {
  it("ships namespace + 11 critical paths", () => {
    expect(LEARNING_SMOKE_NAMESPACE).toBe("UMTUBA_LEARNING_E2E_20260803");
    expect(LEARNING_SMOKE_PATHS).toHaveLength(11);
    expect(LEARNING_SMOKE_ENV.learnerEmail).toMatch(/LEARNING_E2E/);
  });

  it("keeps credential gate closed without LEARNING_E2E=1", () => {
    expect(
      learningSmokeCredentialsPresent({
        LEARNING_E2E: "0",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk",
        LEARNING_E2E_LEARNER_EMAIL: "e2e@example.com",
        LEARNING_E2E_LEARNER_PASSWORD: "x",
      })
    ).toBe(false);
    expect(
      learningSmokeCredentialsPresent({
        LEARNING_E2E: "1",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk",
        LEARNING_E2E_LEARNER_EMAIL: "e2e@example.com",
        LEARNING_E2E_LEARNER_PASSWORD: "x",
      })
    ).toBe(true);
  });

  it("requires harness files for structural workspace/catalog readiness", () => {
    for (const rel of HARNESS_FILES) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("exposes critical-path adapters used by RPC/browser smoke", () => {
    expect(LEARNING_PUBLIC_ROUTES.catalog).toBe("/learning/catalog");
    expect(LEARNING_PUBLIC_PREVIEW_RPCS.get).toMatch(/preview/);
    expect(typeof loadCourseOutline).toBe("function");
    expect(typeof loadLessonDelivery).toBe("function");
    expect(typeof completeMyLearningLesson).toBe("function");
    expect(typeof startAssessmentAttempt).toBe("function");
    expect(typeof saveAssessmentAnswer).toBe("function");
    expect(typeof submitAssessmentAttempt).toBe("function");
    expect(typeof loadMyAssignment).toBe("function");
    expect(typeof loadMyProject).toBe("function");
    expect(typeof ensureMyAiTutorActiveThread).toBe("function");
    expect(typeof resumeMyAiTutorThread).toBe("function");
    expect(typeof archiveMyAiTutorThread).toBe("function");
    expect(LEARNING_AI_TUTOR_RPCS.ensureActiveThread).toMatch(/ensure/);
    expect(typeof getLearningCourseCommunityFeed).toBe("function");
    expect(typeof createLearningDiscussionThread).toBe("function");
    expect(typeof loadCollaborationWorkspaceSpine).toBe("function");
    expect(typeof loadCollaborationWorkspaceAttachments).toBe("function");
    expect(typeof loadCollaborationWorkspaceTimeline).toBe("function");
    expect(typeof requestLearningLiveJoin).toBe("function");
  });

  it("builds local structural matrix without FAIL when unit smokes pass", () => {
    const results = buildLocalStructuralGateResults({
      contentBlocksPass: ALL_CREATABLE_TYPES.every(
        (t) => CREATABLE_BLOCK_FIXTURES[t] != null
      ),
      liveFailClosedPass: true,
      publicCatalogStructuralPass: true,
      harnessFilesPresent: HARNESS_FILES.every((rel) =>
        existsSync(join(ROOT, rel))
      ),
    });
    const summary = summarizeSmokeGate(results);
    expect(summary.hardFail).toBe(false);
    expect(summary.failCount).toBe(0);
    expect(summary.passCount).toBeGreaterThanOrEqual(3);
    expect(summary.skipCount).toBeGreaterThanOrEqual(6);
    const byPath = Object.fromEntries(results.map((r) => [r.path, r.verdict]));
    expect(byPath.content_blocks).toBe("PASS");
    expect(byPath.live_fail_closed).toBe("PASS");
    expect(byPath.enrollment_access).toBe("SKIPPED_NO_CREDENTIALS");
  });
});
