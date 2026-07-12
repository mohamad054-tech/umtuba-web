export type {
  MotionActiveRun,
  MotionConcurrency,
  MotionEngineErrorCode,
  MotionEngineEvent,
  MotionEngineStatus,
  MotionPhaseDefinition,
  MotionPrimitiveIntent,
  MotionPrimitiveType,
  MotionProfile,
  MotionSubscriber,
  MotionTransitionDefinition,
  MotionTransitionResult,
  MotionTransitionResultStatus,
  ResolvedMotionPhase,
  ResolvedMotionTimeline,
  StartTransitionOptions,
} from "./types";

export { MotionEngineError } from "./types";

export {
  MOTION_PROFILES,
  getProfileConfig,
  isHeavyPrimitive,
  prefersReducedMotion,
  resolveMotionProfile,
} from "./profiles";

export { MOTION_PRIMITIVE_TYPES, createPrimitive } from "./primitives";

export { createMotionRegistry } from "./registry";
export type { MotionRegistry } from "./registry";

export { getFallbackTimeoutMs, resolveTimeline } from "./timeline";

export { createMotionRunner } from "./runner";
export type { MotionRunner, MotionRunnerOptions } from "./runner";
