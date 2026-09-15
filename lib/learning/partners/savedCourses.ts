export const LEARNING_SAVED_COURSES_STORAGE_KEY =
  "umtuba.learning.partners.saved.v1" as const;

export function parseSavedCourseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function toggleSavedCourseId(
  current: readonly string[],
  courseId: string
): string[] {
  if (current.includes(courseId)) {
    return current.filter((id) => id !== courseId);
  }
  return [...current, courseId];
}
