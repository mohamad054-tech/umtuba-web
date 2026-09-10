import type {
  LearningCourseLevel,
  LearningPartnerCourse,
  LearningPartnerProviderId,
  LearningPriceModel,
  LearningRecommendationLabel,
} from "./types";
import { rankLearningCourses } from "./ranking";

export type LearningSearchFilters = {
  query?: string;
  provider?: LearningPartnerProviderId | "ALL";
  department?: string | "ALL";
  subcategory?: string;
  level?: LearningCourseLevel | "ALL";
  language?: "en" | "ar" | "ALL";
  price?: "FREE" | "PAID" | "ALL";
  certificate?: boolean;
  professionalCertificate?: boolean;
  universityProvider?: boolean;
  academicCredit?: boolean;
  duration?: string;
  minRating?: number;
  recommendation?: LearningRecommendationLabel | "ALL";
};

export function filterLearningCourses(
  courses: readonly LearningPartnerCourse[],
  filters: LearningSearchFilters = {}
): LearningPartnerCourse[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return courses.filter((course) => {
    if (filters.provider && filters.provider !== "ALL" && course.provider !== filters.provider) {
      return false;
    }
    if (
      filters.department &&
      filters.department !== "ALL" &&
      course.department !== filters.department
    ) {
      return false;
    }
    if (filters.subcategory && course.subcategory !== filters.subcategory) {
      return false;
    }
    if (filters.level && filters.level !== "ALL" && course.level !== filters.level) {
      return false;
    }
    if (filters.language && filters.language !== "ALL") {
      const languageHit =
        course.language === filters.language ||
        course.language === "mixed" ||
        course.languages_available.includes(filters.language);
      if (!languageHit) return false;
    }
    if (filters.price && filters.price !== "ALL") {
      if (filters.price === "FREE" && !isFreeOrFreemium(course.pricing.model)) {
        return false;
      }
      if (filters.price === "PAID" && isFreeOnly(course.pricing.model)) {
        return false;
      }
    }
    if (filters.certificate && !course.certificate.certificate_available) {
      return false;
    }
    if (
      filters.professionalCertificate &&
      course.certificate.certificate_type !== "PROFESSIONAL"
    ) {
      return false;
    }
    if (
      filters.universityProvider &&
      course.certificate.certificate_type !== "UNIVERSITY_PROVIDER"
    ) {
      return false;
    }
    if (filters.academicCredit && course.certificate.academic_credit !== true) {
      return false;
    }
    if (filters.minRating != null) {
      if (course.rating.value == null || course.rating.value < filters.minRating) {
        return false;
      }
    }
    if (
      filters.recommendation &&
      filters.recommendation !== "ALL" &&
      !course.recommendation_labels.includes(filters.recommendation)
    ) {
      return false;
    }
    if (query && !courseMatchesQuery(course, query)) {
      return false;
    }
    return true;
  });
}

export function searchLearningCourses(
  courses: readonly LearningPartnerCourse[],
  filters: LearningSearchFilters = {},
  locale: "en" | "ar" = "en"
): LearningPartnerCourse[] {
  const filtered = filterLearningCourses(courses, filters);
  return rankLearningCourses(filtered, {
    query: filters.query,
    preferredLanguage: locale,
  });
}

export function parseLearningSearchParams(
  params: Record<string, string | undefined>
): LearningSearchFilters {
  const provider = params.provider;
  const level = params.level;
  const language = params.lang;
  const price = params.price;
  const recommendation = params.rec;
  return {
    query: params.q?.trim() || undefined,
    provider: isProvider(provider) ? provider : "ALL",
    department: params.dept?.trim() || "ALL",
    subcategory: params.sub?.trim() || undefined,
    level: isLevel(level) ? level : "ALL",
    language: language === "en" || language === "ar" ? language : "ALL",
    price: price === "FREE" || price === "PAID" ? price : "ALL",
    certificate: params.cert === "1",
    professionalCertificate: params.pro === "1",
    universityProvider: params.uni === "1",
    academicCredit: params.credit === "1",
    minRating: params.rating ? Number(params.rating) : undefined,
    recommendation: isRecommendation(recommendation) ? recommendation : "ALL",
  };
}

function courseMatchesQuery(course: LearningPartnerCourse, query: string): boolean {
  const haystack = [
    course.original_title,
    course.title_en,
    course.title_ar,
    course.institution ?? "",
    course.instructor ?? "",
    course.provider,
    course.source_platform,
    course.department,
    course.subcategory,
  ]
    .join(" ")
    .toLowerCase();
  return query.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

function isFreeOrFreemium(model: LearningPriceModel): boolean {
  return model === "FREE" || model === "FREEMIUM";
}

function isFreeOnly(model: LearningPriceModel): boolean {
  return model === "FREE";
}

function isProvider(value?: string): value is LearningPartnerProviderId {
  return value === "coursera" || value === "edx" || value === "skillshare" || value === "udemy";
}

function isLevel(value?: string): value is LearningCourseLevel {
  return (
    value === "BEGINNER" ||
    value === "INTERMEDIATE" ||
    value === "ADVANCED" ||
    value === "MIXED" ||
    value === "UNKNOWN"
  );
}

function isRecommendation(
  value?: string
): value is LearningRecommendationLabel {
  return (
    value === "BEGINNER" ||
    value === "CAREER_FOCUSED" ||
    value === "BEST_VALUE" ||
    value === "MOST_POPULAR"
  );
}
