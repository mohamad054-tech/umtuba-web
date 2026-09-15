import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertNoFakeAffiliateLinks } from "./affiliateFoundation";
import { assertProviderAttribution } from "./attribution";
import {
  LEARNING_PARTNER_PILOT_JSON_RELATIVE_PATH,
  assertLearningPartnerPilot,
  listLearningPartnerCourses,
  loadLearningPartnerPilot,
} from "./catalog";
import {
  LearningCertificateSafetyError,
  assertCatalogCertificateSafety,
  assertCertificateMetadataSafe,
  canShowAccreditationClaim,
  customerFacingAccreditationText,
} from "./certificateModel";
import { compareLearningTopic } from "./comparison";
import { assertCourseLocalization } from "./localization";
import {
  LEARNING_AFFILIATE_RECORDS,
  LEARNING_PROVIDER_FACTS,
} from "./providerFacts";
import { LEARNING_RANKING_WEIGHTS } from "./ranking";
import { filterLearningCourses, searchLearningCourses } from "./search";
import {
  LEARNING_DEPARTMENTS,
  learningDepartmentCount,
  learningSubcategoryCount,
} from "./taxonomy";
import type { LearningCertificateMetadata, LearningPartnerCourse } from "./types";

const ROOT = process.cwd();

function sampleCourse(
  overrides: Partial<LearningPartnerCourse> = {}
): LearningPartnerCourse {
  const base = listLearningPartnerCourses()[0];
  return {
    ...base,
    certificate: { ...base.certificate },
    pricing: { ...base.pricing, notes: { ...base.pricing.notes } },
    duration_notes: { ...base.duration_notes },
    source_attribution: { ...base.source_attribution },
    ...overrides,
  };
}

function unsafeCertificate(
  overrides: Partial<LearningCertificateMetadata> = {}
): LearningCertificateMetadata {
  return {
    certificate_available: true,
    certificate_type: "PROFESSIONAL",
    certificate_issuer: "Example",
    verification_available: true,
    academic_credit: false,
    accreditation_claim: true,
    accreditation_source: null,
    accreditation_verified: false,
    certificate_notes: { en: "Accredited program", ar: "برنامج معتمد" },
    ...overrides,
  };
}

describe("learning partner marketplace foundation", () => {
  it("keeps taxonomy counts stable", () => {
    expect(learningDepartmentCount()).toBe(16);
    expect(learningSubcategoryCount()).toBe(58);
    expect(LEARNING_DEPARTMENTS.map((row) => row.name_en)).toContain(
      "Artificial Intelligence"
    );
  });

  it("fails if accreditation is shown without evidence", () => {
    expect(canShowAccreditationClaim(unsafeCertificate())).toBe(false);
    expect(customerFacingAccreditationText(unsafeCertificate(), "en")).toBeNull();
    expect(() => assertCertificateMetadataSafe(unsafeCertificate())).toThrow(
      LearningCertificateSafetyError
    );
    expect(() =>
      assertCatalogCertificateSafety([
        sampleCourse({ certificate: unsafeCertificate() }),
      ])
    ).toThrow(/accreditation_claim requires accreditation_source/);

    const inferred = unsafeCertificate({
      accreditation_claim: false,
      accreditation_verified: false,
      accreditation_source: null,
      certificate_notes: {
        en: "Officially recognized because it is on Coursera",
        ar: "معترف به رسميا لأن الدورة على Coursera",
      },
    });
    expect(() => assertCertificateMetadataSafe(inferred)).toThrow(
      /accreditation language/
    );
  });

  it("requires provider attribution on every external course", () => {
    const missingUrl = sampleCourse({ original_course_url: "" });
    expect(() => assertProviderAttribution(missingUrl)).toThrow(
      /original_course_url/
    );
    const umtubaCreated = sampleCourse({
      umtuba_created: false,
      original_title: "",
    });
    expect(() => assertProviderAttribution(umtubaCreated)).toThrow(
      /original_title/
    );
  });

  it("rejects fabricated affiliate links while programs are pending", () => {
    expect(
      LEARNING_AFFILIATE_RECORDS.every(
        (row) =>
          row.affiliate_program_status === "PENDING" &&
          row.affiliate_tracking_url === null
      )
    ).toBe(true);
    expect(() =>
      assertNoFakeAffiliateLinks({
        affiliates: LEARNING_AFFILIATE_RECORDS,
        courses: [
          sampleCourse({
            affiliate_tracking_url: "https://app.impact.com/campaign/fake-id",
          }),
        ],
      })
    ).toThrow(/affiliate_tracking_url set before approval/);
  });

  it("searches and filters without inventing popularity", () => {
    const courses = listLearningPartnerCourses();
    const python = searchLearningCourses(courses, { query: "python" });
    expect(python.length).toBeGreaterThan(1);
    expect(python.some((row) => row.provider === "coursera")).toBe(true);
    expect(python.some((row) => row.provider === "edx")).toBe(true);
    expect(python.some((row) => row.provider === "udemy")).toBe(true);

    const professional = filterLearningCourses(courses, {
      professionalCertificate: true,
    });
    expect(
      professional.every((row) => row.certificate.certificate_type === "PROFESSIONAL")
    ).toBe(true);

    const beginner = filterLearningCourses(courses, {
      recommendation: "BEGINNER",
    });
    expect(beginner.every((row) => row.recommendation_labels.includes("BEGINNER"))).toBe(
      true
    );
    expect(
      courses.every((row) => !row.recommendation_labels.includes("MOST_POPULAR"))
    ).toBe(true);
  });

  it("compares Python offers across providers", () => {
    const comparison = compareLearningTopic(listLearningPartnerCourses(), "python");
    expect(comparison.providers).toEqual(
      expect.arrayContaining(["coursera", "edx", "udemy"])
    );
    expect(comparison.courses.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps localization fields and forbids invented accreditation copy", () => {
    for (const course of listLearningPartnerCourses()) {
      expect(course.title_en.trim()).not.toBe("");
      expect(course.title_ar.trim()).not.toBe("");
      expect(course.title_ar).not.toEqual(course.title_en);
      expect(() => assertCourseLocalization(course)).not.toThrow();
    }
  });

  it("loads the local pilot with safety gates and honest Skillshare gap", () => {
    const file = loadLearningPartnerPilot();
    expect(file.courses.length).toBeGreaterThan(0);
    expect(file.courses.length).toBeLessThanOrEqual(100);
    expect(file.courses.some((row) => row.provider === "skillshare")).toBe(false);
    expect(file.live_feed_imported).toBe(false);
    expect(file.affiliate_applications_submitted).toBe(false);
    expect(() => assertLearningPartnerPilot(file)).not.toThrow();
    expect(LEARNING_PROVIDER_FACTS.every((row) => row.last_verified_at)).toBe(true);
    expect(LEARNING_RANKING_WEIGHTS.affiliate_economics).toBeLessThan(
      LEARNING_RANKING_WEIGHTS.trusted_institution
    );
  });

  it("does not embed secrets or Impact tracking IDs in foundation files", () => {
    const files = [
      "lib/learning/partners/affiliateFoundation.ts",
      "lib/learning/partners/providerFacts.ts",
      LEARNING_PARTNER_PILOT_JSON_RELATIVE_PATH,
      "app/sandbox/learning/partners/page.tsx",
    ];
    const secretLike =
      /IMPACT_API|AFFILIATE_SECRET|irclickid=|campaign-promo-signup\/[A-Za-z0-9_-]{8,}/i;
    for (const file of files) {
      const src = readFileSync(join(ROOT, file), "utf8");
      expect(src).not.toMatch(secretLike);
    }
  });
});
