import type { LearningPartnerCourse } from "./types";
import { LEARNING_PARTNER_PROVIDER_IDS } from "./types";

export class LearningAttributionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningAttributionError";
  }
}

const REQUIRED_HTTP_PREFIX = /^https:\/\//i;

export function assertProviderAttribution(course: LearningPartnerCourse): void {
  if (course.umtuba_created !== false) {
    throw new LearningAttributionError(
      `${course.id}: external courses cannot be marked UMTUBA-created`
    );
  }
  if (!course.original_title.trim()) {
    throw new LearningAttributionError(`${course.id}: original_title is required`);
  }
  if (!LEARNING_PARTNER_PROVIDER_IDS.includes(course.provider)) {
    throw new LearningAttributionError(`${course.id}: provider is required`);
  }
  if (course.source_platform !== course.provider) {
    throw new LearningAttributionError(
      `${course.id}: source_platform must match provider`
    );
  }
  if (!REQUIRED_HTTP_PREFIX.test(course.original_course_url)) {
    throw new LearningAttributionError(
      `${course.id}: original_course_url must be an https URL`
    );
  }
  if (!REQUIRED_HTTP_PREFIX.test(course.source_citation_url)) {
    throw new LearningAttributionError(
      `${course.id}: source_citation_url must be an https URL`
    );
  }
  if (!course.source_attribution.en.trim() || !course.source_attribution.ar.trim()) {
    throw new LearningAttributionError(
      `${course.id}: source attribution is required in English and Arabic`
    );
  }
  if (!hostMatchesProvider(course.original_course_url, course.provider)) {
    throw new LearningAttributionError(
      `${course.id}: original_course_url host does not match ${course.provider}`
    );
  }
}

export function assertCatalogAttribution(
  courses: readonly LearningPartnerCourse[]
): void {
  for (const course of courses) {
    assertProviderAttribution(course);
  }
}

export function hostMatchesProvider(
  url: string,
  provider: LearningPartnerCourse["provider"]
): boolean {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  switch (provider) {
    case "coursera":
      return host === "www.coursera.org" || host === "coursera.org";
    case "edx":
      return host === "www.edx.org" || host === "edx.org";
    case "skillshare":
      return host === "www.skillshare.com" || host === "skillshare.com";
    case "udemy":
      return host === "www.udemy.com" || host === "udemy.com";
  }
}
