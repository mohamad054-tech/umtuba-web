import { getProfileConfig, isHeavyPrimitive } from "./profiles";
import { MotionEngineError } from "./types";
import type {
  MotionProfile,
  MotionTransitionDefinition,
  ResolvedMotionTimeline,
} from "./types";

export function resolveTimeline(
  definition: MotionTransitionDefinition,
  profile: MotionProfile
): ResolvedMotionTimeline {
  if (!definition.id.trim()) {
    throw new MotionEngineError(
      "INVALID_DEFINITION",
      "Transition definition requires a non-empty id."
    );
  }

  if (!definition.phases.length) {
    throw new MotionEngineError(
      "INVALID_DEFINITION",
      `Transition "${definition.id}" must declare at least one phase.`,
      definition.id
    );
  }

  const config = getProfileConfig(profile);
  const isReduced = profile === "reduced";

  const phases = definition.phases
    .filter((phase) => !(isReduced && phase.skipInReduced))
    .map((phase) => {
      if (!phase.id.trim()) {
        throw new MotionEngineError(
          "INVALID_DEFINITION",
          `Transition "${definition.id}" has a phase with an empty id.`,
          definition.id
        );
      }

      if (!Number.isFinite(phase.durationMs) || phase.durationMs < 0) {
        throw new MotionEngineError(
          "INVALID_DEFINITION",
          `Phase "${phase.id}" in "${definition.id}" has an invalid duration.`,
          definition.id
        );
      }

      if (
        phase.reducedDurationMs !== undefined &&
        (!Number.isFinite(phase.reducedDurationMs) || phase.reducedDurationMs < 0)
      ) {
        throw new MotionEngineError(
          "INVALID_DEFINITION",
          `Phase "${phase.id}" in "${definition.id}" has an invalid reducedDurationMs.`,
          definition.id
        );
      }

      const primitives = (phase.primitives ?? []).filter((primitive) => {
        if (!config.stripHeavyPrimitives) {
          return true;
        }

        return !isHeavyPrimitive(primitive.type);
      });

      const durationMs =
        isReduced && phase.reducedDurationMs !== undefined
          ? phase.reducedDurationMs
          : Math.max(0, Math.round(phase.durationMs * config.durationScale));

      return {
        id: phase.id,
        durationMs,
        primitives,
      };
    });

  if (!phases.length) {
    throw new MotionEngineError(
      "INVALID_DEFINITION",
      `Transition "${definition.id}" has no phases left after profile resolution.`,
      definition.id
    );
  }

  const totalDurationMs = phases.reduce(
    (sum, phase) => sum + phase.durationMs,
    0
  );

  return {
    transitionId: definition.id,
    profile,
    phases,
    totalDurationMs,
  };
}

export function getFallbackTimeoutMs(timeline: ResolvedMotionTimeline) {
  return timeline.totalDurationMs + 400;
}
