import type {
  LearningCertificateType,
  LearningPartnerCourse,
  LearningPartnerProviderId,
} from "./types";
import { getLearningAffiliateRecord } from "./providerFacts";

/**
 * Ranking is not commission-only. Affiliate economics is the smallest weight.
 */
export const LEARNING_RANKING_WEIGHTS = {
  trusted_institution: 0.2,
  certificate_quality: 0.18,
  learner_value: 0.16,
  rating_quality: 0.12,
  relevance: 0.14,
  language: 0.08,
  price: 0.08,
  affiliate_economics: 0.04,
} as const;

const CERTIFICATE_QUALITY_SCORE: Record<LearningCertificateType, number> = {
  DEGREE_OR_FORMAL_QUALIFICATION: 1,
  ACADEMIC_CREDIT: 0.9,
  UNIVERSITY_PROVIDER: 0.78,
  PROFESSIONAL: 0.7,
  VERIFIED: 0.58,
  COMPLETION: 0.4,
  UNKNOWN: 0.15,
  NONE: 0.05,
};

const INSTITUTION_HINTS =
  /university|universit|harvard|stanford|mit|yale|michigan|berkeley|oxford|cambridge|google|ibm|meta|deepLearning/i;

export type LearningRankContext = {
  query?: string;
  preferredLanguage?: "en" | "ar";
};

export function rankLearningCourses(
  courses: readonly LearningPartnerCourse[],
  context: LearningRankContext = {}
): LearningPartnerCourse[] {
  return [...courses].sort((a, b) => {
    const scoreB = scoreLearningCourse(b, context);
    const scoreA = scoreLearningCourse(a, context);
    return scoreB - scoreA;
  });
}

export function scoreLearningCourse(
  course: LearningPartnerCourse,
  context: LearningRankContext = {}
): number {
  const weights = LEARNING_RANKING_WEIGHTS;
  return (
    weights.trusted_institution * trustedInstitutionScore(course) +
    weights.certificate_quality *
      CERTIFICATE_QUALITY_SCORE[course.certificate.certificate_type] +
    weights.learner_value * learnerValueScore(course) +
    weights.rating_quality * ratingScore(course) +
    weights.relevance * relevanceScore(course, context.query) +
    weights.language * languageScore(course, context.preferredLanguage) +
    weights.price * priceScore(course) +
    weights.affiliate_economics * affiliateEconomicsScore(course.provider)
  );
}

function trustedInstitutionScore(course: LearningPartnerCourse): number {
  const blob = `${course.institution ?? ""} ${course.certificate.certificate_issuer ?? ""}`;
  if (INSTITUTION_HINTS.test(blob)) return 0.92;
  if (course.provider === "coursera" || course.provider === "edx") return 0.55;
  return 0.35;
}

function learnerValueScore(course: LearningPartnerCourse): number {
  let score = 0.4;
  if (course.certificate.certificate_available) score += 0.2;
  if (course.career_focused) score += 0.2;
  if (course.pricing.model === "FREE" || course.pricing.model === "FREEMIUM") {
    score += 0.15;
  }
  return Math.min(1, score);
}

function ratingScore(course: LearningPartnerCourse): number {
  if (course.rating.value == null) return 0.35;
  return Math.min(1, Math.max(0, course.rating.value / course.rating.scale));
}

function relevanceScore(
  course: LearningPartnerCourse,
  query?: string
): number {
  if (!query?.trim()) return 0.5;
  const needle = query.trim().toLowerCase();
  const haystack = [
    course.original_title,
    course.title_en,
    course.title_ar,
    course.institution ?? "",
    course.instructor ?? "",
    course.department,
    course.subcategory,
  ]
    .join(" ")
    .toLowerCase();
  if (haystack.includes(needle)) return 1;
  const tokens = needle.split(/\s+/).filter(Boolean);
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return tokens.length === 0 ? 0.5 : hits / tokens.length;
}

function languageScore(
  course: LearningPartnerCourse,
  preferred?: "en" | "ar"
): number {
  if (!preferred) return 0.5;
  if (course.language === preferred || course.language === "mixed") return 1;
  if (course.languages_available.includes(preferred)) return 0.85;
  return 0.35;
}

function priceScore(course: LearningPartnerCourse): number {
  if (course.pricing.model === "FREE") return 1;
  if (course.pricing.model === "FREEMIUM") return 0.8;
  if (course.pricing.model === "SUBSCRIPTION") return 0.55;
  if (course.pricing.model === "PAID") return 0.4;
  return 0.3;
}

function affiliateEconomicsScore(provider: LearningPartnerProviderId): number {
  const affiliate = getLearningAffiliateRecord(provider);
  if (affiliate.affiliate_program_status !== "APPROVED") return 0;
  if (affiliate.commission_model.kind === "PERCENT_RANGE") return 0.7;
  if (affiliate.commission_model.kind === "REVENUE_SHARE_CAP") return 0.55;
  if (affiliate.commission_model.kind === "PERCENT") return 0.45;
  return 0.2;
}
