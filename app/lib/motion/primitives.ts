import type { MotionPrimitiveIntent, MotionPrimitiveType } from "./types";

export const MOTION_PRIMITIVE_TYPES: MotionPrimitiveType[] = [
  "fade",
  "zoom",
  "blur",
  "shared-element",
  "portal",
  "camera",
  "morph",
];

export function createPrimitive(
  type: MotionPrimitiveType,
  options?: Omit<MotionPrimitiveIntent, "type">
): MotionPrimitiveIntent {
  return {
    type,
    intensity: options?.intensity ?? 1,
    options: options?.options,
  };
}
