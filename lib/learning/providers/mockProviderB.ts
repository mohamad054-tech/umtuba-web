/**
 * Mock provider B — Learning partner fixture for import QA.
 * Extends the V2 Learning provider stack. Synthetic courses only.
 */

import { emptyLearningRights, grantLearningRight } from "./rights";
import type { LearningProvider, LearningRawCourseRecord } from "./types";

const AT = "2026-08-18T12:00:00.000Z";

export const MOCK_PROVIDER_B_ID = "bbbb2222-2222-4222-8222-bbbbbbbbbbb1";

export function mockProviderB(): LearningProvider {
  let rights = emptyLearningRights(
    "bbbb2222-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    MOCK_PROVIDER_B_ID,
    AT
  );
  rights = grantLearningRight(rights, "METADATA_DISPLAY_ALLOWED", AT);
  rights = grantLearningRight(rights, "ENROLLMENT_ALLOWED", AT);
  return {
    id: MOCK_PROVIDER_B_ID,
    slug: "umtuba-mock-provider-b",
    displayName: "UMTUBA Mock Provider B",
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

const TITLES = [
  "Catalog Intake Hygiene",
  "Metadata-Only Listings",
  "Enrollment Routing Basics",
  "Progress Ownership Boundaries",
  "Language and Category Mapping",
  "Instructor Label Rules",
  "Takedown Without Audit Loss",
  "External URL Enrollment",
  "Difficulty Mapping",
  "Partner Label Surfaces",
];

export const MOCK_PROVIDER_B_COURSES: LearningRawCourseRecord[] = TITLES.map((title, index) => {
  const n = String(index + 1).padStart(2, "0");
  return {
    externalId: `mpb-course-${n}`,
    title: `UMTUBA Mock B: ${title}`,
    description: `Synthetic Mock Provider B course ${n} for rights-gated import QA. Not a real partner or university offering.`,
    language: index % 2 === 0 ? "en" : "ar",
    category: index % 3 === 0 ? "commerce-safety" : index % 3 === 1 ? "orientation" : "operations",
    difficulty: index < 6 ? "beginner" : "intermediate",
    priceMinor: 0,
    currency: "USD",
    enrollmentModel: "external",
    externalEnrollmentUrl: `https://learn.umtuba.invalid/mock/provider-b/${n}`,
    instructors: [
      {
        externalId: `mpb-instructor-${n}`,
        displayName: `UMTUBA Mock Instructor B${n}`,
        title: "Staff instructor (mock)",
      },
    ],
    lessonCount: 3 + (index % 4),
  };
});

export function mockNoHostingProvider(): LearningProvider {
  return mockProviderB();
}

export function mockNoCertificateRightsProvider(): LearningProvider {
  return mockProviderB();
}

export function mockAiUsageDeniedProvider(): LearningProvider {
  return mockProviderB();
}
