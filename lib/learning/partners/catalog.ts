import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertNoFakeAffiliateLinks } from "./affiliateFoundation";
import { assertCatalogAttribution } from "./attribution";
import { assertCatalogCertificateSafety } from "./certificateModel";
import { assertCatalogLocalization } from "./localization";
import { LEARNING_AFFILIATE_RECORDS } from "./providerFacts";
import { findLearningDepartment, findLearningSubcategory } from "./taxonomy";
import type {
  LearningPartnerCourse,
  LearningPartnerPilotFile,
  LearningPathFoundation,
} from "./types";
import {
  LEARNING_CERTIFICATE_TYPES,
  LEARNING_COURSE_LEVELS,
  LEARNING_PARTNER_PROVIDER_IDS,
  LEARNING_PRICE_MODELS,
  LEARNING_RECOMMENDATION_LABELS,
} from "./types";

export const LEARNING_PARTNER_PILOT_JSON_RELATIVE_PATH =
  "data/umtuba-learning-partner-pilot-v1.json" as const;

export const LEARNING_PARTNER_TASK_ID =
  "UMTUBA_LEARNING_PARTNER_MARKETPLACE_FOUNDATION_V1" as const;

let cached: LearningPartnerPilotFile | null = null;

export function learningPartnerPilotPath(rootDir = process.cwd()): string {
  return join(rootDir, LEARNING_PARTNER_PILOT_JSON_RELATIVE_PATH);
}

export function loadLearningPartnerPilot(
  rootDir = process.cwd()
): LearningPartnerPilotFile {
  if (cached && rootDir === process.cwd()) return cached;
  const raw = JSON.parse(readFileSync(learningPartnerPilotPath(rootDir), "utf8"));
  const file = parseLearningPartnerPilot(raw);
  assertLearningPartnerPilot(file);
  if (rootDir === process.cwd()) cached = file;
  return file;
}

export function listLearningPartnerCourses(
  rootDir = process.cwd()
): LearningPartnerCourse[] {
  return [...loadLearningPartnerPilot(rootDir).courses];
}

export function getLearningPartnerCourse(
  slug: string,
  rootDir = process.cwd()
): LearningPartnerCourse | null {
  return (
    loadLearningPartnerPilot(rootDir).courses.find((course) => course.slug === slug) ??
    null
  );
}

export function listLearningPaths(
  rootDir = process.cwd()
): LearningPathFoundation[] {
  return [...loadLearningPartnerPilot(rootDir).learning_paths];
}

export function assertLearningPartnerPilot(file: LearningPartnerPilotFile): void {
  if (file.task_id !== LEARNING_PARTNER_TASK_ID) {
    throw new Error("Pilot file task_id mismatch");
  }
  if (file.live_feed_imported !== false) {
    throw new Error("Live feed import is forbidden in this foundation");
  }
  if (file.affiliate_applications_submitted !== false) {
    throw new Error("Affiliate applications must not be marked submitted");
  }
  if (file.umtuba_hosts_partner_content !== false) {
    throw new Error("UMTUBA must not host partner content");
  }
  if (file.umtuba_issues_partner_certificates !== false) {
    throw new Error("UMTUBA must not issue partner certificates");
  }
  if (file.courses.length > 100) {
    throw new Error("Local pilot may not exceed 100 course records");
  }

  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const course of file.courses) {
    if (ids.has(course.id) || slugs.has(course.slug)) {
      throw new Error(`Duplicate course id/slug: ${course.id}`);
    }
    ids.add(course.id);
    slugs.add(course.slug);
    if (!findLearningDepartment(course.department)) {
      throw new Error(`${course.id}: unknown department ${course.department}`);
    }
    if (!findLearningSubcategory(course.department, course.subcategory)) {
      throw new Error(`${course.id}: unknown subcategory ${course.subcategory}`);
    }
    if (course.record_kind !== "COURSE") {
      throw new Error(`${course.id}: record_kind must be COURSE`);
    }
    if (course.recommendation_labels.includes("MOST_POPULAR")) {
      throw new Error(
        `${course.id}: MOST_POPULAR requires a documented popularity signal`
      );
    }
  }

  for (const path of file.learning_paths) {
    if (path.official_combined_certificate !== false) {
      throw new Error(`${path.id}: combined certificates are not allowed`);
    }
    for (const courseId of path.course_ids) {
      if (!ids.has(courseId)) {
        throw new Error(`${path.id}: unknown course ${courseId}`);
      }
    }
  }

  assertCatalogAttribution(file.courses);
  assertCatalogCertificateSafety(file.courses);
  assertCatalogLocalization(file.courses);
  assertNoFakeAffiliateLinks({
    affiliates: LEARNING_AFFILIATE_RECORDS,
    courses: file.courses,
  });
}

function parseLearningPartnerPilot(raw: unknown): LearningPartnerPilotFile {
  if (!isRecord(raw)) throw new Error("Pilot file must be an object");
  if (raw.task_id !== LEARNING_PARTNER_TASK_ID) {
    throw new Error("Pilot file task_id mismatch");
  }
  if (!Array.isArray(raw.courses) || !Array.isArray(raw.learning_paths)) {
    throw new Error("Pilot file missing courses or learning_paths");
  }
  return {
    task_id: LEARNING_PARTNER_TASK_ID,
    generated_at: String(raw.generated_at ?? ""),
    catalog_mode: "LOCAL_QA_SAMPLE",
    live_feed_imported: false,
    affiliate_applications_submitted: false,
    umtuba_hosts_partner_content: false,
    umtuba_issues_partner_certificates: false,
    sample_honesty_notes: String(raw.sample_honesty_notes ?? ""),
    providers: LEARNING_PARTNER_PROVIDER_IDS.slice(),
    courses: raw.courses.map((row, index) => parseCourse(row, index)),
    learning_paths: raw.learning_paths.map((row, index) =>
      parsePath(row, index)
    ),
  };
}

function parseCourse(raw: unknown, index: number): LearningPartnerCourse {
  if (!isRecord(raw)) throw new Error(`Course ${index} is not an object`);
  const provider = requireOneOf(
    raw.provider,
    LEARNING_PARTNER_PROVIDER_IDS,
    `Course ${index}: invalid provider`
  );
  const level = requireOneOf(
    raw.level,
    LEARNING_COURSE_LEVELS,
    `Course ${index}: invalid level`
  );
  const certificate = isRecord(raw.certificate) ? raw.certificate : {};
  const pricing = isRecord(raw.pricing) ? raw.pricing : {};
  const rating = isRecord(raw.rating) ? raw.rating : {};
  const certType = requireOneOf(
    certificate.certificate_type,
    LEARNING_CERTIFICATE_TYPES,
    `Course ${index}: invalid certificate_type`
  );
  const priceModel = requireOneOf(
    pricing.model,
    LEARNING_PRICE_MODELS,
    `Course ${index}: invalid pricing.model`
  );

  return {
    id: String(raw.id ?? ""),
    slug: String(raw.slug ?? ""),
    original_title: String(raw.original_title ?? ""),
    title_en: String(raw.title_en ?? ""),
    title_ar: String(raw.title_ar ?? ""),
    provider,
    institution: raw.institution == null ? null : String(raw.institution),
    instructor: raw.instructor == null ? null : String(raw.instructor),
    source_platform: provider,
    original_course_url: String(raw.original_course_url ?? ""),
    affiliate_tracking_url:
      raw.affiliate_tracking_url == null
        ? null
        : String(raw.affiliate_tracking_url),
    department: String(raw.department ?? ""),
    subcategory: String(raw.subcategory ?? ""),
    level,
    duration_notes: localized(raw.duration_notes),
    language:
      raw.language === "ar" || raw.language === "mixed" || raw.language === "unknown"
        ? raw.language
        : "en",
    languages_available: Array.isArray(raw.languages_available)
      ? raw.languages_available.map(String)
      : ["en"],
    pricing: {
      model: priceModel,
      amount: typeof pricing.amount === "number" ? pricing.amount : null,
      currency: pricing.currency == null ? null : String(pricing.currency),
      notes: localized(pricing.notes),
    },
    rating: {
      value: typeof rating.value === "number" ? rating.value : null,
      scale: typeof rating.scale === "number" ? rating.scale : 5,
      source: rating.source == null ? null : String(rating.source),
    },
    image_url: raw.image_url == null ? null : String(raw.image_url),
    certificate: {
      certificate_available: certificate.certificate_available === true,
      certificate_type: certType,
      certificate_issuer:
        certificate.certificate_issuer == null
          ? null
          : String(certificate.certificate_issuer),
      verification_available:
        typeof certificate.verification_available === "boolean"
          ? certificate.verification_available
          : null,
      academic_credit:
        typeof certificate.academic_credit === "boolean"
          ? certificate.academic_credit
          : null,
      accreditation_claim: certificate.accreditation_claim === true,
      accreditation_source:
        certificate.accreditation_source == null
          ? null
          : String(certificate.accreditation_source),
      accreditation_verified: certificate.accreditation_verified === true,
      certificate_notes: localized(certificate.certificate_notes),
    },
    recommendation_labels: Array.isArray(raw.recommendation_labels)
      ? raw.recommendation_labels.filter((label): label is typeof LEARNING_RECOMMENDATION_LABELS[number] =>
          LEARNING_RECOMMENDATION_LABELS.includes(
            label as typeof LEARNING_RECOMMENDATION_LABELS[number]
          )
        )
      : [],
    career_focused: raw.career_focused === true,
    source_attribution: localized(raw.source_attribution),
    source_citation_url: String(raw.source_citation_url ?? ""),
    facts_last_verified_at: String(raw.facts_last_verified_at ?? ""),
    umtuba_created: false,
    record_kind: "COURSE",
  };
}

function parsePath(raw: unknown, index: number): LearningPathFoundation {
  if (!isRecord(raw)) throw new Error(`Path ${index} is not an object`);
  return {
    id: String(raw.id ?? ""),
    title: localized(raw.title),
    summary: localized(raw.summary),
    course_ids: Array.isArray(raw.course_ids) ? raw.course_ids.map(String) : [],
    official_combined_certificate: false,
  };
}

function localized(raw: unknown): { en: string; ar: string } {
  if (!isRecord(raw)) return { en: "", ar: "" };
  return { en: String(raw.en ?? ""), ar: String(raw.ar ?? "") };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function requireOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  message: string
): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(message);
  }
  return value as T;
}
