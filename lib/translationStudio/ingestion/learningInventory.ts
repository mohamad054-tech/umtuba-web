/**
 * Learning platform UI inventory for Translation Studio.
 * Excludes course lesson bodies, videos, audio, and DB content titles.
 */

export const LEARNING_AREA_NAMESPACES = [
  "learning.shared",
  "learning.programs",
  "learning.courses",
  "learning.sections",
  "learning.lessons",
  "learning.activities",
  "learning.assessments",
  "learning.assignments",
  "learning.instructor",
  "learning.learner",
  "learning.progress",
  "learning.completion",
  "learning.certificates",
  "learning.discussions",
  "learning.live",
  "learning.calendar",
  "learning.notifications",
  "learning.dashboards",
] as const;

export type LearningAreaNamespace = (typeof LEARNING_AREA_NAMESPACES)[number];

export const LEARNING_SURFACES = [
  "programs",
  "courses",
  "sections",
  "lessons",
  "activities",
  "assessments",
  "assignments",
  "instructor",
  "learner",
  "progress",
  "completion",
  "certificates",
  "discussions",
  "live_sessions",
  "calendar",
  "notifications",
  "instructor_dashboard",
  "learner_dashboard",
  "shared_learning_ui",
] as const;

export function isLearningCatalogKey(key: string): boolean {
  return key.startsWith("learning.");
}

/** learning.programs.title → learning.programs */
export function learningNamespaceOfKey(key: string): string {
  const parts = key.split(".");
  if (parts[0] === "learning" && parts.length >= 3) {
    return `learning.${parts[1]}`;
  }
  return parts[0] === "learning" ? "learning.shared" : "learning.shared";
}

export function stableLearningKeyId(key: string): string {
  return `key_learning_${key.replace(/\./g, "__")}`;
}

export function stableLearningValueId(key: string, language: string): string {
  return `val_learning_${key.replace(/\./g, "__")}_${language}`;
}

export function stableLearningNamespaceId(namespace: string): string {
  return `ns_${namespace.replace(/\./g, "_")}`;
}
