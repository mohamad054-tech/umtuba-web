import { AI_FUNDAMENTALS_FOR_EVERYONE } from "./aiFundamentals";
import { DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS } from "./digitalSafety";
import { UMTUBA_PLATFORM_ESSENTIALS } from "./platformEssentials";
import type { UmtubaOriginalPilotCourse } from "./types";

export * from "./types";
export { UMTUBA_PLATFORM_ESSENTIALS } from "./platformEssentials";
export { DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS } from "./digitalSafety";
export { AI_FUNDAMENTALS_FOR_EVERYONE } from "./aiFundamentals";

export const UMTUBA_ORIGINAL_PILOT_COURSES: readonly UmtubaOriginalPilotCourse[] = [
  UMTUBA_PLATFORM_ESSENTIALS,
  DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS,
  AI_FUNDAMENTALS_FOR_EVERYONE,
];

export function listUmtubaOriginalPilotCourses(): readonly UmtubaOriginalPilotCourse[] {
  return UMTUBA_ORIGINAL_PILOT_COURSES;
}
