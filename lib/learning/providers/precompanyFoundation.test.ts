import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRECOMPANY_FOUNDATION_MIGRATION } from "../../partners/types";
import { importLearningCourses } from "./importContract";
import {
  MOCK_EXTERNAL_COURSES,
  MOCK_PARTNER_COURSES,
  mockExternalLearningProvider,
  mockPartnerLearningProvider,
  mockUmtubaOriginalProvider,
} from "./mockFixtures";
import {
  createLearningProviderRegistry,
  disableLearningProvider,
  registerLearningProvider,
} from "./registry";
import {
  evaluateAiTutorIngest,
  evaluateCertificateIssuance,
  evaluateContentHosting,
  evaluateEnrollmentRoute,
  evaluateLearningRight,
} from "./rights";
import { LEARNING_PROVIDER_RIGHTS, LEARNING_PROVIDER_TYPES } from "./types";

const ROOT = process.cwd();
const MIGRATION = `supabase/migrations/${PRECOMPANY_FOUNDATION_MIGRATION}`;

describe("Learning provider foundation V2 — contracts", () => {
  it("exposes provider types and deny-by-default rights", () => {
    expect([...LEARNING_PROVIDER_TYPES]).toEqual(["UMTUBA_ORIGINAL", "PARTNER", "EXTERNAL"]);
    expect([...LEARNING_PROVIDER_RIGHTS]).toEqual([
      "METADATA_DISPLAY_ALLOWED",
      "CONTENT_HOSTING_ALLOWED",
      "VIDEO_HOSTING_ALLOWED",
      "ENROLLMENT_ALLOWED",
      "PAYMENT_ALLOWED",
      "AI_USAGE_ALLOWED",
      "CERTIFICATE_INTEGRATION_ALLOWED",
    ]);
  });

  it("ships learning provider tables without plaintext secrets", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = readFileSync(join(ROOT, MIGRATION), "utf8");
    expect(sql).toMatch(/create table if not exists public\.learning_content_providers/);
    expect(sql).toMatch(/AI_USAGE_ALLOWED/);
    expect(sql).toMatch(/CERTIFICATE_INTEGRATION_ALLOWED/);
    expect(sql).not.toMatch(/partner_api_key|client_secret/i);
  });
});

describe("Learning course import", () => {
  it("maps mock partner courses with provenance and labels", () => {
    const provider = mockPartnerLearningProvider();
    const run = importLearningCourses({
      runId: "learn-import-1",
      provider,
      records: MOCK_PARTNER_COURSES,
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(run.rejected).toEqual([]);
    expect(run.accepted).toHaveLength(1);
    const course = run.accepted[0];
    expect(course.label).toBe("Partner");
    expect(course.providerId).toBe(provider.id);
    expect(course.language).toBe("en");
    expect(course.instructors[0]?.displayName).toMatch(/Mock Instructor/);
    expect(course.hostedOnUmtuba).toBe(false);
  });

  it("rejects fabricated external instructors", () => {
    const run = importLearningCourses({
      runId: "learn-bad-instructor",
      provider: mockPartnerLearningProvider(),
      records: [
        {
          externalId: "bad-1",
          title: "UMTUBA Mock Course",
          instructors: [{ externalId: "x", displayName: "Coursera Staff" }],
        },
      ],
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(run.accepted).toHaveLength(0);
    expect(run.rejected[0]?.code).toBe("INVALID_INSTRUCTOR");
  });
});

describe("Learning rights deny", () => {
  it("denies hosting, AI ingest, and UMTUBA-issued partner certificates by default", () => {
    const provider = mockPartnerLearningProvider();
    const run = importLearningCourses({
      runId: "learn-deny",
      provider,
      records: MOCK_PARTNER_COURSES,
      at: "2026-08-18T08:00:00.000Z",
    });
    const course = run.accepted[0];
    expect(evaluateContentHosting({ provider, course }).allowed).toBe(false);
    expect(evaluateAiTutorIngest({ provider, course }).allowed).toBe(false);
    expect(evaluateCertificateIssuance({ provider, course }).allowed).toBe(false);
    expect(evaluateLearningRight(provider, "AI_USAGE_ALLOWED").allowed).toBe(false);
  });

  it("routes external enrollment after rights recheck", () => {
    const provider = mockExternalLearningProvider();
    const run = importLearningCourses({
      runId: "learn-ext",
      provider,
      records: MOCK_EXTERNAL_COURSES,
      at: "2026-08-18T08:00:00.000Z",
    });
    const route = evaluateEnrollmentRoute({ provider, course: run.accepted[0] });
    expect(route.route).toBe("EXTERNAL_ENROLL_URL");
    expect(run.accepted[0].label).toBe("External");
  });

  it("allows AI and certificates only for UMTUBA originals with grants", () => {
    const provider = mockUmtubaOriginalProvider();
    expect(registerLearningProvider(createLearningProviderRegistry(), provider).ok).toBe(true);
    const run = importLearningCourses({
      runId: "learn-orig",
      provider,
      records: [
        {
          externalId: "original-1",
          title: "UMTUBA Original: Commerce Rights",
          instructors: [{ externalId: "umtuba-staff", displayName: "UMTUBA Staff Author" }],
          lessonCount: 3,
        },
      ],
      at: "2026-08-18T08:00:00.000Z",
    });
    const course = run.accepted[0];
    expect(course.label).toBe("Original");
    expect(evaluateAiTutorIngest({ provider, course }).allowed).toBe(true);
    expect(evaluateCertificateIssuance({ provider, course }).allowed).toBe(true);
    const disabled = disableLearningProvider(provider, "2026-08-18T11:00:00.000Z");
    expect(evaluateLearningRight(disabled, "ENROLLMENT_ALLOWED").allowed).toBe(false);
  });
});
