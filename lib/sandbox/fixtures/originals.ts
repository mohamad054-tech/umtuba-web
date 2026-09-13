import type { UmtubaOriginalCourse } from "./types";
import { AI_FUNDAMENTALS } from "./originalsAi";
import { PLATFORM_ESSENTIALS } from "./originalsPlatform";
import { DIGITAL_SAFETY } from "./originalsSafety";

export { AI_FUNDAMENTALS } from "./originalsAi";
export { PLATFORM_ESSENTIALS } from "./originalsPlatform";
export { DIGITAL_SAFETY } from "./originalsSafety";

export const UMTUBA_ORIGINAL_SANDBOX_COURSES: readonly UmtubaOriginalCourse[] = [
  PLATFORM_ESSENTIALS,
  DIGITAL_SAFETY,
  AI_FUNDAMENTALS,
];

export function originalLessonCount(course: UmtubaOriginalCourse): number {
  return course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
}
