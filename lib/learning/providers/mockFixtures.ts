/**
 * Synthetic Learning providers/courses. No real partner courses or instructors.
 */

import { emptyLearningRights, grantLearningRight } from "./rights";
import type { LearningProvider, LearningRawCourseRecord } from "./types";

const AT = "2026-08-18T08:00:00.000Z";

export const MOCK_LEARNING_PROVIDER_IDS = {
  partner: "44444444-4444-4444-8444-444444444444",
  external: "55555555-5555-4555-8555-555555555555",
  original: "66666666-6666-4666-8666-666666666666",
} as const;

export function mockPartnerLearningProvider(): LearningProvider {
  let rights = emptyLearningRights(
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    MOCK_LEARNING_PROVIDER_IDS.partner,
    AT
  );
  rights = grantLearningRight(rights, "METADATA_DISPLAY_ALLOWED", AT);
  rights = grantLearningRight(rights, "ENROLLMENT_ALLOWED", AT);
  return {
    id: MOCK_LEARNING_PROVIDER_IDS.partner,
    slug: "umtuba-mock-learning-partner",
    displayName: "UMTUBA Mock Learning Partner",
    providerType: "PARTNER",
    status: "ENABLED",
    dataClass: "MOCK_DATA",
    sourceType: "MOCK_PROVIDER",
    rights,
    progressOwnership: "PROVIDER",
    certificateOwnership: "PROVIDER",
    createdAt: AT,
    updatedAt: AT,
    disabledAt: null,
    removedAt: null,
  };
}

export function mockExternalLearningProvider(): LearningProvider {
  let rights = emptyLearningRights(
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
    MOCK_LEARNING_PROVIDER_IDS.external,
    AT
  );
  rights = grantLearningRight(rights, "METADATA_DISPLAY_ALLOWED", AT);
  rights = grantLearningRight(rights, "ENROLLMENT_ALLOWED", AT);
  return {
    id: MOCK_LEARNING_PROVIDER_IDS.external,
    slug: "umtuba-mock-learning-external",
    displayName: "UMTUBA Mock External Catalog",
    providerType: "EXTERNAL",
    status: "ENABLED",
    dataClass: "MOCK_DATA",
    sourceType: "EXTERNAL",
    rights,
    progressOwnership: "PROVIDER",
    certificateOwnership: "NONE",
    createdAt: AT,
    updatedAt: AT,
    disabledAt: null,
    removedAt: null,
  };
}

export function mockUmtubaOriginalProvider(): LearningProvider {
  let rights = emptyLearningRights(
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3",
    MOCK_LEARNING_PROVIDER_IDS.original,
    AT
  );
  rights = grantLearningRight(rights, "METADATA_DISPLAY_ALLOWED", AT);
  rights = grantLearningRight(rights, "CONTENT_HOSTING_ALLOWED", AT);
  rights = grantLearningRight(rights, "VIDEO_HOSTING_ALLOWED", AT);
  rights = grantLearningRight(rights, "ENROLLMENT_ALLOWED", AT);
  rights = grantLearningRight(rights, "AI_USAGE_ALLOWED", AT);
  rights = grantLearningRight(rights, "CERTIFICATE_INTEGRATION_ALLOWED", AT);
  return {
    id: MOCK_LEARNING_PROVIDER_IDS.original,
    slug: "umtuba-originals",
    displayName: "UMTUBA Originals",
    providerType: "UMTUBA_ORIGINAL",
    status: "ENABLED",
    dataClass: "MOCK_DATA",
    sourceType: "UMTUBA_ORIGINAL",
    rights,
    progressOwnership: "UMTUBA",
    certificateOwnership: "UMTUBA",
    createdAt: AT,
    updatedAt: AT,
    disabledAt: null,
    removedAt: null,
  };
}

export const MOCK_PARTNER_COURSES: LearningRawCourseRecord[] = [
  {
    externalId: "mock-partner-course-01",
    title: "UMTUBA Mock Partner: Catalog Safety Basics",
    description: "Synthetic partner course for rights and enrollment routing QA.",
    language: "en",
    category: "commerce-safety",
    difficulty: "beginner",
    priceMinor: 0,
    currency: "USD",
    enrollmentModel: "external",
    externalEnrollmentUrl: "https://learn.umtuba.invalid/mock/partner/catalog-safety",
    instructors: [
      {
        externalId: "mock-instructor-a",
        displayName: "UMTUBA Mock Instructor A",
        title: "Staff instructor (mock)",
      },
    ],
    lessonCount: 4,
  },
];

export const MOCK_EXTERNAL_COURSES: LearningRawCourseRecord[] = [
  {
    externalId: "mock-external-course-01",
    title: "UMTUBA Mock External: Metadata Only",
    description: "Synthetic external listing. Content is not hosted on UMTUBA.",
    language: "ar",
    category: "orientation",
    difficulty: "beginner",
    enrollmentModel: "external",
    externalEnrollmentUrl: "https://learn.umtuba.invalid/mock/external/metadata-only",
    instructors: [{ externalId: "mock-instructor-b", displayName: "UMTUBA Mock Instructor B" }],
    lessonCount: 2,
  },
];
