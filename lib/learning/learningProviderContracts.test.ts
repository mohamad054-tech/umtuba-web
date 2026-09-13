import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_ENROLLMENT_MODES,
  LEARNING_LEGAL_COMPANY_STATUS,
  LEARNING_LIVE_DISABLED_MESSAGE,
  LEARNING_ORIGIN_LABELS,
  LEARNING_PAYMENT_OWNERS,
  LEARNING_PROVIDER_KINDS,
  LEARNING_RIGHTS_DENIED_MESSAGE,
  LEARNING_RIGHTS_FLAGS,
  assertLearningLiveIntegrationAllowed,
  createDeniedLearningRights,
  createMockLearningProviderAdapter,
  isLearningAiUsageAllowed,
  isLearningProviderKind,
  isLearningRightAllowed,
  learningOriginLabel,
  normalizeLearningRights,
} from "./learningProviderContracts";

const ROOT = process.cwd();
const NAMED_PROVIDER_RE =
  /shein|temu|aliexpress|alibaba|trendyol|amazon|ebay|dhgate|coursera|udemy|skillshare|khan.?academy/i;

describe("learning provider contracts", () => {
  it("labels Original / Partner / External and defaults every right to DENY", () => {
    expect([...LEARNING_PROVIDER_KINDS]).toEqual([
      "UMTUBA_ORIGINAL",
      "PARTNER",
      "EXTERNAL",
    ]);
    expect(LEARNING_ORIGIN_LABELS).toEqual({
      UMTUBA_ORIGINAL: "Original",
      PARTNER: "Partner",
      EXTERNAL: "External",
    });
    expect(learningOriginLabel("UMTUBA_ORIGINAL")).toBe("Original");
    expect(learningOriginLabel("PARTNER")).toBe("Partner");
    expect(learningOriginLabel("EXTERNAL")).toBe("External");
    expect([...LEARNING_RIGHTS_FLAGS]).toEqual([
      "METADATA_DISPLAY_ALLOWED",
      "CONTENT_HOSTING_ALLOWED",
      "VIDEO_HOSTING_ALLOWED",
      "AI_USAGE_ALLOWED",
      "CERTIFICATE_INTEGRATION_ALLOWED",
    ]);
    expect(createDeniedLearningRights().AI_USAGE_ALLOWED).toBe(false);
    expect(LEARNING_ENROLLMENT_MODES[0]).toBe("DISABLED");
    expect(LEARNING_PAYMENT_OWNERS[0]).toBe("UNKNOWN");
  });

  it("never infers AI_USAGE_ALLOWED and treats unknown flags as DENY", () => {
    expect(isLearningAiUsageAllowed(undefined)).toBe(false);
    expect(isLearningAiUsageAllowed(normalizeLearningRights({}))).toBe(false);
    expect(
      isLearningAiUsageAllowed(
        normalizeLearningRights({
          METADATA_DISPLAY_ALLOWED: true,
          CONTENT_HOSTING_ALLOWED: true,
          VIDEO_HOSTING_ALLOWED: true,
        })
      )
    ).toBe(false);
    expect(
      isLearningAiUsageAllowed(
        normalizeLearningRights({ AI_USAGE_ALLOWED: true })
      )
    ).toBe(true);
    expect(
      isLearningRightAllowed(
        normalizeLearningRights({ METADATA_DISPLAY_ALLOWED: true }),
        "CERTIFICATE_INTEGRATION_ALLOWED"
      )
    ).toBe(false);
    expect(isLearningProviderKind("PARTNER")).toBe(true);
    expect(isLearningProviderKind("COURSERA")).toBe(false);
  });

  it("blocks live integration while company status is PENDING", () => {
    expect(LEARNING_LEGAL_COMPANY_STATUS).toBe("PENDING");
    expect(assertLearningLiveIntegrationAllowed()).toEqual({
      ok: false,
      reason: "LEGAL_COMPANY_PENDING",
      message: LEARNING_LIVE_DISABLED_MESSAGE,
    });
    expect(
      assertLearningLiveIntegrationAllowed({
        legalCompanyStatus: "READY",
        partnerPermissionGranted: true,
      }).ok
    ).toBe(true);
  });

  it("keeps the mock adapter empty, non-enrollable, and origin-labeled", () => {
    const denied = createMockLearningProviderAdapter({
      providerId: "mock-partner",
      displayName: "Mock partner",
      kind: "PARTNER",
    });
    expect(denied.descriptor.originLabel).toBe("Partner");
    expect(denied.descriptor.enrollmentMode).toBe("DISABLED");
    expect(denied.listCourses()).toEqual({
      ok: false,
      reason: "RIGHTS_DENIED",
      message: LEARNING_RIGHTS_DENIED_MESSAGE,
    });

    const metadataOnly = createMockLearningProviderAdapter({
      providerId: "mock-original",
      displayName: "Mock original",
      kind: "UMTUBA_ORIGINAL",
      rights: { METADATA_DISPLAY_ALLOWED: true },
      fixtures: [{ courseId: "mock:demo-course", title: "Demo course" }],
    });
    const listed = metadataOnly.listCourses();
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.courses[0]).toEqual({
      courseId: "mock:demo-course",
      title: "Demo course",
      originLabel: "Original",
      enrollable: false,
      metadataVisible: true,
      contentHosted: false,
      videoHosted: false,
    });

    const emptyExternal = createMockLearningProviderAdapter({
      providerId: "mock-external",
      displayName: "Mock external",
      kind: "EXTERNAL",
      rights: { METADATA_DISPLAY_ALLOWED: true },
    });
    expect(emptyExternal.descriptor.originLabel).toBe("External");
    expect(emptyExternal.listCourses()).toEqual({ ok: true, courses: [] });
  });

  it("does not hardcode named course platforms into the contract module", () => {
    const source = readFileSync(
      join(ROOT, "lib/learning/learningProviderContracts.ts"),
      "utf8"
    );
    expect(source).not.toMatch(NAMED_PROVIDER_RE);
  });
});
