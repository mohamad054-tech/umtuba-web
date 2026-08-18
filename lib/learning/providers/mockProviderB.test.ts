import { describe, expect, it } from "vitest";
import { importLearningCourses } from "./importContract";
import { MOCK_PROVIDER_B_COURSES, mockProviderB } from "./mockProviderB";
import { createLearningProviderRegistry, registerLearningProvider } from "./registry";
import {
  evaluateAiTutorIngest,
  evaluateCertificateIssuance,
  evaluateContentHosting,
  evaluateLearningRight,
} from "./rights";
import { learningSurfaceLabel } from "./runtimeGates";

describe("Mock provider B import", () => {
  it("imports 10 mock courses and labels them Partner after the rights gate", () => {
    const provider = mockProviderB();
    expect(registerLearningProvider(createLearningProviderRegistry(), provider).ok).toBe(true);
    expect(MOCK_PROVIDER_B_COURSES).toHaveLength(10);

    const run = importLearningCourses({
      runId: "mock-b-import",
      provider,
      records: MOCK_PROVIDER_B_COURSES,
      at: "2026-08-18T12:00:00.000Z",
    });
    expect(run.rejected).toEqual([]);
    expect(run.accepted).toHaveLength(10);
    expect(run.accepted.every((course) => course.label === "Partner")).toBe(true);
    expect(run.accepted.every((course) => course.dataClass === "MOCK_DATA")).toBe(true);
    expect(run.accepted.every((course) => course.hostedOnUmtuba === false)).toBe(true);
    expect(learningSurfaceLabel(run.accepted[0]).label).toBe("Partner");
  });
});

describe("Learning negative rights", () => {
  it("denies NO_HOSTING_RIGHTS, AI_USAGE_ALLOWED=false, and NO_CERTIFICATE_RIGHTS", () => {
    const provider = mockProviderB();
    const run = importLearningCourses({
      runId: "neg-learn",
      provider,
      records: MOCK_PROVIDER_B_COURSES.slice(0, 1),
      at: "2026-08-18T12:00:00.000Z",
    });
    const course = run.accepted[0];

    const hosting = evaluateContentHosting({ provider, course });
    expect(hosting.allowed).toBe(false);
    if (!hosting.allowed) expect(hosting.right).toBe("CONTENT_HOSTING_ALLOWED");

    expect(evaluateLearningRight(provider, "AI_USAGE_ALLOWED").allowed).toBe(false);
    const ai = evaluateAiTutorIngest({ provider, course });
    expect(ai.allowed).toBe(false);
    if (!ai.allowed) expect(ai.right).toBe("AI_USAGE_ALLOWED");

    const cert = evaluateCertificateIssuance({ provider, course });
    expect(cert.allowed).toBe(false);
    if (!cert.allowed) expect(cert.right).toBe("CERTIFICATE_INTEGRATION_ALLOWED");
  });
});
