import { describe, expect, it } from "vitest";
import { importLearningCourses } from "./importContract";
import { MOCK_PARTNER_COURSES, mockPartnerLearningProvider } from "./mockFixtures";
import { createLearningProviderRegistry, registerLearningProvider } from "./registry";
import {
  learningSurfaceLabel,
  recheckAiTutorIngest,
  recheckCertificateIssuance,
  recheckLearningEnrollment,
  recheckLearningPlayback,
} from "./runtimeGates";

describe("Mock Learning E2E", () => {
  it("runs mock provider → import → rights → label → enrollment → AI/cert gates", () => {
    const registry = createLearningProviderRegistry();
    const provider = mockPartnerLearningProvider();
    expect(registerLearningProvider(registry, provider).ok).toBe(true);

    const imported = importLearningCourses({
      runId: "e2e-learn",
      provider,
      records: MOCK_PARTNER_COURSES,
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(imported.rejected).toEqual([]);
    const course = imported.accepted[0];
    expect(course.provenance.providerId).toBe(provider.id);
    expect(learningSurfaceLabel(course)).toEqual({
      label: "Partner",
      mockNotice: "UMTUBA Mock Learning — not a real partner course",
    });

    const playback = recheckLearningPlayback({ provider, course });
    expect(playback.hosting.allowed).toBe(false);
    expect(playback.playableOnUmtuba).toBe(false);

    const enrollment = recheckLearningEnrollment({ provider, course });
    expect(enrollment.route).toBe("EXTERNAL_ENROLL_URL");

    expect(recheckAiTutorIngest({ provider, course }).allowed).toBe(false);
    expect(recheckCertificateIssuance({ provider, course }).allowed).toBe(false);
  });
});
