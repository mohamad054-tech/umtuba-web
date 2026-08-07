/**
 * In-memory Capability Asserter Foundation (UM Core P15).
 *
 * Pure deterministic capability availability over P5 catalog + P14 evaluator.
 * CAPABILITY ASSERTION IS NOT USER AUTHORIZATION.
 * CAPABILITY ASSERTION IS NOT FLAG EVALUATION.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§4 / §14)
 */

import type { UmFlagEvaluator } from "../flag/types";
import type { UmCapabilityId, UmSideEffectClass } from "../identity/types";
import { UmCapabilityAssertionCode } from "./asserterCodes";
import type {
  UmCapabilityAsserter,
  UmCapabilityAsserterDeps,
  UmCapabilityAssertionResult,
  UmCapabilityRecord,
  UmCapabilityRegistry,
} from "./types";

/** Mirrors P2 elevated side-effect admission (defensive ungated check only). */
const ELEVATED_SIDE_EFFECTS: ReadonlySet<UmSideEffectClass> = new Set([
  "money",
  "ai",
  "admin",
]);

function isElevated(record: UmCapabilityRecord): boolean {
  return record.sideEffectClasses.some((effect) =>
    ELEVATED_SIDE_EFFECTS.has(effect),
  );
}

function assertOne(
  capabilities: UmCapabilityRegistry,
  flags: UmFlagEvaluator,
  capabilityId: UmCapabilityId,
): UmCapabilityAssertionResult {
  const record = capabilities.get(capabilityId);
  if (!record) {
    return {
      capabilityId,
      enabled: false,
      reasonCode: UmCapabilityAssertionCode.UNKNOWN,
    };
  }

  const flagId = record.flagId;
  if (!flagId) {
    if (isElevated(record)) {
      return {
        capabilityId,
        enabled: false,
        reasonCode: UmCapabilityAssertionCode.ELEVATED_UNGATED,
        stability: record.stability,
      };
    }
    return {
      capabilityId,
      enabled: true,
      reasonCode: UmCapabilityAssertionCode.CATALOG_ENABLED,
      stability: record.stability,
    };
  }

  const evaluation = flags.evaluate({ flagId });
  if (evaluation.source === "unknown") {
    return {
      capabilityId,
      enabled: false,
      reasonCode: UmCapabilityAssertionCode.FLAG_UNRESOLVED,
      flagId,
      stability: record.stability,
    };
  }

  if (evaluation.enabled) {
    return {
      capabilityId,
      enabled: true,
      reasonCode: UmCapabilityAssertionCode.FLAG_ENABLED,
      flagId,
      stability: record.stability,
    };
  }

  return {
    capabilityId,
    enabled: false,
    reasonCode: UmCapabilityAssertionCode.FLAG_DISABLED,
    flagId,
    stability: record.stability,
  };
}

/**
 * Create a pure in-memory capability asserter over P5 + P14.
 * Does not mutate registries, evaluate auth/RBAC, or implement SDK.
 */
export function createInMemoryCapabilityAsserter(
  deps: UmCapabilityAsserterDeps,
): UmCapabilityAsserter {
  const { capabilities, flags } = deps;

  return {
    assertEnabled(capabilityId) {
      return assertOne(capabilities, flags, capabilityId);
    },
  };
}
