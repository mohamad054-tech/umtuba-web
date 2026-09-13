/**
 * Pre-company learning provider contracts.
 *
 * Origin kinds (Original / Partner / External), DENY-by-default rights,
 * and a mock adapter only. Does not import partner courses, host partner
 * video, or enable AI usage unless an explicit grant is passed in.
 */

export const LEARNING_PROVIDER_KINDS = [
  "UMTUBA_ORIGINAL",
  "PARTNER",
  "EXTERNAL",
] as const;
export type LearningProviderKind = (typeof LEARNING_PROVIDER_KINDS)[number];

export const LEARNING_ORIGIN_LABELS = {
  UMTUBA_ORIGINAL: "Original",
  PARTNER: "Partner",
  EXTERNAL: "External",
} as const;
export type LearningOriginLabel =
  (typeof LEARNING_ORIGIN_LABELS)[LearningProviderKind];

export const LEARNING_RIGHTS_FLAGS = [
  "METADATA_DISPLAY_ALLOWED",
  "CONTENT_HOSTING_ALLOWED",
  "VIDEO_HOSTING_ALLOWED",
  "AI_USAGE_ALLOWED",
  "CERTIFICATE_INTEGRATION_ALLOWED",
] as const;
export type LearningRightsFlag = (typeof LEARNING_RIGHTS_FLAGS)[number];

export const LEARNING_ENROLLMENT_MODES = [
  "DISABLED",
  "UMTUBA_ENROLLMENT",
  "PROVIDER_REDIRECT",
  "METADATA_ONLY",
] as const;
export type LearningEnrollmentMode = (typeof LEARNING_ENROLLMENT_MODES)[number];

export const LEARNING_PAYMENT_OWNERS = [
  "UNKNOWN",
  "UMTUBA",
  "PROVIDER",
] as const;
export type LearningPaymentOwner = (typeof LEARNING_PAYMENT_OWNERS)[number];

export type LearningProviderRights = Record<LearningRightsFlag, boolean>;

export type LearningProviderDescriptor = {
  providerId: string;
  displayName: string;
  kind: LearningProviderKind;
  originLabel: LearningOriginLabel;
  rights: LearningProviderRights;
  enrollmentMode: LearningEnrollmentMode;
  paymentOwner: LearningPaymentOwner;
  liveIntegrationEnabled: boolean;
};

export type LearningCoursePreview = {
  courseId: string;
  title: string;
  originLabel: LearningOriginLabel;
  enrollable: false;
  metadataVisible: boolean;
  contentHosted: boolean;
  videoHosted: boolean;
};

export type LearningProviderListResult =
  | { ok: true; courses: readonly LearningCoursePreview[] }
  | { ok: false; reason: "RIGHTS_DENIED" | "LIVE_DISABLED"; message: string };

export type LearningProviderAdapter = {
  descriptor: LearningProviderDescriptor;
  listCourses(): LearningProviderListResult;
};

export const LEARNING_LEGAL_COMPANY_STATUS = "PENDING" as const;

export const LEARNING_RIGHTS_DENIED_MESSAGE =
  "This learning right is denied until an explicit grant exists.";

export const LEARNING_LIVE_DISABLED_MESSAGE =
  "Live learning providers stay disabled until a legal company and partner permission exist.";

export const LEARNING_AI_USAGE_DENIED_MESSAGE =
  "AI usage on learning content is denied unless an explicit grant exists.";

export function createDeniedLearningRights(): LearningProviderRights {
  return {
    METADATA_DISPLAY_ALLOWED: false,
    CONTENT_HOSTING_ALLOWED: false,
    VIDEO_HOSTING_ALLOWED: false,
    AI_USAGE_ALLOWED: false,
    CERTIFICATE_INTEGRATION_ALLOWED: false,
  };
}

/**
 * Missing / unknown flags stay false. AI_USAGE_ALLOWED is never inferred.
 */
export function normalizeLearningRights(
  grants: Partial<LearningProviderRights> | null | undefined
): LearningProviderRights {
  const denied = createDeniedLearningRights();
  if (!grants) return denied;
  return {
    METADATA_DISPLAY_ALLOWED: grants.METADATA_DISPLAY_ALLOWED === true,
    CONTENT_HOSTING_ALLOWED: grants.CONTENT_HOSTING_ALLOWED === true,
    VIDEO_HOSTING_ALLOWED: grants.VIDEO_HOSTING_ALLOWED === true,
    AI_USAGE_ALLOWED: grants.AI_USAGE_ALLOWED === true,
    CERTIFICATE_INTEGRATION_ALLOWED:
      grants.CERTIFICATE_INTEGRATION_ALLOWED === true,
  };
}

export function isLearningRightAllowed(
  rights: LearningProviderRights | null | undefined,
  flag: LearningRightsFlag
): boolean {
  if (!rights) return false;
  return rights[flag] === true;
}

export function isLearningAiUsageAllowed(
  rights: LearningProviderRights | null | undefined
): boolean {
  return isLearningRightAllowed(rights, "AI_USAGE_ALLOWED");
}

export function isLearningProviderKind(
  value: unknown
): value is LearningProviderKind {
  return (
    typeof value === "string" &&
    (LEARNING_PROVIDER_KINDS as readonly string[]).includes(value)
  );
}

export function learningOriginLabel(
  kind: LearningProviderKind
): LearningOriginLabel {
  return LEARNING_ORIGIN_LABELS[kind];
}

export function assertLearningLiveIntegrationAllowed(input?: {
  legalCompanyStatus?: string;
  partnerPermissionGranted?: boolean;
}): { ok: true } | { ok: false; reason: string; message: string } {
  const company = input?.legalCompanyStatus ?? LEARNING_LEGAL_COMPANY_STATUS;
  if (company !== "READY") {
    return {
      ok: false,
      reason: "LEGAL_COMPANY_PENDING",
      message: LEARNING_LIVE_DISABLED_MESSAGE,
    };
  }
  if (input?.partnerPermissionGranted !== true) {
    return {
      ok: false,
      reason: "PARTNER_PERMISSION_REQUIRED",
      message: LEARNING_LIVE_DISABLED_MESSAGE,
    };
  }
  return { ok: true };
}

export type MockLearningCourseFixture = {
  courseId: string;
  title: string;
};

export function createMockLearningProviderAdapter(input: {
  providerId: string;
  displayName: string;
  kind: LearningProviderKind;
  rights?: Partial<LearningProviderRights>;
  enrollmentMode?: LearningEnrollmentMode;
  paymentOwner?: LearningPaymentOwner;
  fixtures?: readonly MockLearningCourseFixture[];
}): LearningProviderAdapter {
  const rights = normalizeLearningRights(input.rights);
  const originLabel = learningOriginLabel(input.kind);
  const descriptor: LearningProviderDescriptor = {
    providerId: input.providerId.trim(),
    displayName: input.displayName.trim(),
    kind: input.kind,
    originLabel,
    rights,
    enrollmentMode: input.enrollmentMode ?? "DISABLED",
    paymentOwner: input.paymentOwner ?? "UNKNOWN",
    liveIntegrationEnabled: false,
  };

  return {
    descriptor,
    listCourses(): LearningProviderListResult {
      if (descriptor.liveIntegrationEnabled) {
        return {
          ok: false,
          reason: "LIVE_DISABLED",
          message: LEARNING_LIVE_DISABLED_MESSAGE,
        };
      }
      if (!isLearningRightAllowed(rights, "METADATA_DISPLAY_ALLOWED")) {
        return {
          ok: false,
          reason: "RIGHTS_DENIED",
          message: LEARNING_RIGHTS_DENIED_MESSAGE,
        };
      }
      const fixtures = input.fixtures ?? [];
      const contentHosted = isLearningRightAllowed(
        rights,
        "CONTENT_HOSTING_ALLOWED"
      );
      const videoHosted = isLearningRightAllowed(
        rights,
        "VIDEO_HOSTING_ALLOWED"
      );
      return {
        ok: true,
        courses: fixtures.map((fixture) => ({
          courseId: fixture.courseId,
          title: fixture.title,
          originLabel,
          enrollable: false,
          metadataVisible: true,
          contentHosted,
          videoHosted,
        })),
      };
    },
  };
}
