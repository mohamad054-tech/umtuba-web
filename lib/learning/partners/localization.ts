import type { LearningPartnerCourse, LocalizedText } from "./types";
import { containsUnsafeAccreditationLanguage } from "./certificateModel";

const FACTUAL_NAME_KEEP =
  /Coursera|edX|Skillshare|Udemy|Google|IBM|Meta|Harvard|Stanford|Yale|MIT|Michigan|Berkeley|DeepLearning\.AI|Andrew Ng|Dr\. Angela Yu|Jose Portilla|Colt Steele|Maximilian Schwarzmüller|Robert Shiller|University of|CS50/gi;

export class LearningLocalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningLocalizationError";
  }
}

export function localizedCourseTitle(
  course: LearningPartnerCourse,
  locale: "en" | "ar"
): string {
  return locale === "ar" ? course.title_ar : course.title_en;
}

export function localizedText(text: LocalizedText, locale: "en" | "ar"): string {
  return locale === "ar" ? text.ar : text.en;
}

export function assertCourseLocalization(course: LearningPartnerCourse): void {
  if (!course.title_en.trim() || !course.title_ar.trim()) {
    throw new LearningLocalizationError(`${course.id}: localized titles required`);
  }
  if (looksLikeKeywordSpam(course.title_en) || looksLikeKeywordSpam(course.title_ar)) {
    throw new LearningLocalizationError(`${course.id}: keyword-spam title`);
  }
  if (containsUnsafeAccreditationLanguage(course.certificate.certificate_notes)) {
    throw new LearningLocalizationError(
      `${course.id}: localization invented an accreditation claim`
    );
  }
  if (containsUnsafeAccreditationLanguage(course.pricing.notes)) {
    throw new LearningLocalizationError(
      `${course.id}: pricing notes invented an accreditation claim`
    );
  }
  if (inventedOutcomeLanguage(course)) {
    throw new LearningLocalizationError(
      `${course.id}: localization invented outcomes or jobs`
    );
  }
}

export function assertCatalogLocalization(
  courses: readonly LearningPartnerCourse[]
): void {
  for (const course of courses) {
    assertCourseLocalization(course);
  }
}

function looksLikeKeywordSpam(title: string): boolean {
  return /best\s+best|شراء|خصم حصري|!!!|>>>/.test(title);
}

function inventedOutcomeLanguage(course: LearningPartnerCourse): boolean {
  const blob = `${course.title_en} ${course.title_ar} ${course.certificate.certificate_notes.en} ${course.certificate.certificate_notes.ar}`;
  return /guaranteed job|وظيفة مضمونة|accredited degree|درجة معتمدة/.test(blob);
}

export function preserveFactualNames(source: string, localized: string): boolean {
  const names = source.match(FACTUAL_NAME_KEEP) ?? [];
  return names.every((name) => localized.includes(name) || source.includes(name));
}
