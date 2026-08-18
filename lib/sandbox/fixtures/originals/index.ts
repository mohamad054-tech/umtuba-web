import { ADAPTED_ORIGINALS } from "./adapt";
import type { SandboxCourse } from "../types";

export {
  ADAPTED_ORIGINALS,
  contentLessons,
  lessonExercises,
  moduleQuizzes,
} from "./adapt";

export const PLATFORM_ESSENTIALS = ADAPTED_ORIGINALS[0]!;
export const DIGITAL_SAFETY = ADAPTED_ORIGINALS[1]!;
export const AI_FUNDAMENTALS = ADAPTED_ORIGINALS[2]!;

export const UMTUBA_ORIGINAL_SANDBOX_COURSES: readonly SandboxCourse[] = ADAPTED_ORIGINALS;
