/**
 * In-memory Flag Evaluator Foundation (UM Core P14).
 *
 * Pure deterministic catalog-backed evaluation over the P8 flag registry.
 * FLAG EVALUATION IS NOT FLAG REGISTRATION.
 * FLAG EVALUATION IS NOT CAPABILITY AUTHORIZATION.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§14)
 */

import { UmFlagEvaluationCode } from "./evaluatorCodes";
import type {
  UmFlagEvaluationRequest,
  UmFlagEvaluationResult,
  UmFlagEvaluator,
  UmFlagEvaluatorDeps,
  UmFlagRegistry,
} from "./types";

/**
 * Evaluate one flag against the current P8 catalog.
 * Context fields are accepted but ignored in P14 (default-only policy).
 */
function evaluateOne(
  flags: UmFlagRegistry,
  request: UmFlagEvaluationRequest,
): UmFlagEvaluationResult {
  const record = flags.get(request.flagId);
  if (!record) {
    return {
      flagId: request.flagId,
      enabled: false,
      reasonCode: UmFlagEvaluationCode.UNKNOWN,
      source: "unknown",
    };
  }

  if (record.defaultState === "on") {
    return {
      flagId: request.flagId,
      enabled: true,
      reasonCode: UmFlagEvaluationCode.DEFAULT_ON,
      source: "default",
    };
  }

  return {
    flagId: request.flagId,
    enabled: false,
    reasonCode: UmFlagEvaluationCode.DEFAULT_OFF,
    source: "default",
  };
}

/**
 * Create a pure in-memory flag evaluator over an existing P8 catalog.
 * Does not mutate the registry, apply overrides, or authorize capabilities.
 */
export function createInMemoryFlagEvaluator(
  deps: UmFlagEvaluatorDeps,
): UmFlagEvaluator {
  const { flags } = deps;

  return {
    evaluate(request) {
      return evaluateOne(flags, request);
    },

    evaluateBatch(requests) {
      return requests.map((request) => evaluateOne(flags, request));
    },
  };
}
