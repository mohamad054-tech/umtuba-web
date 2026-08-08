/**
 * Dual-read OBSERVE activation-safety gate + sanitized preflight model V1.
 *
 * JSON remains authoritative. Observe stays OFF by default.
 * Preferred safe composition: shadow_dual_write + observe nest.
 * Never enables DB-primary. Never performs remote writes.
 */

import {
  TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV,
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  isDualReadObserveEnabled,
  resolveTranslationStudioPersistenceMode,
  type PersistenceModeResolution,
} from "./mode";
import {
  getDualReadObservationBreaker,
  type DualReadObservationBreakerSnapshot,
} from "./dualReadObservationBreaker";

export type DualReadObserveCompositionKind =
  | "json_only"
  | "shadow_dual_write"
  | "dual_read_without_shadow"
  | "unsupported"
  | "invalid";

export type DualReadObserveBlockerCode =
  | "observe_flag_off"
  | "json_only_observe_unsafe"
  | "dual_read_mode_without_shadow_unsafe"
  | "db_primary_unsupported"
  | "invalid_persistence_mode"
  | "read_transport_missing"
  | "breaker_open"
  | "baseline_parity_unproven";

export type DualReadObserveBaselineParityStatus =
  | "unproven"
  | "unknown"
  | "assumed_pending_operator_proof";

export type DualReadObserveReadinessReport = {
  schemaVersion: 1;
  persistenceMode: string | null;
  persistenceModeKind: PersistenceModeResolution["kind"];
  composition: DualReadObserveCompositionKind;
  jsonAuthoritative: true;
  shadowAvailable: boolean;
  readTransportAvailable: boolean;
  observeFlagRequested: boolean;
  observeFlagEnvName: typeof TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV;
  modeEnvName: typeof TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV;
  baselineParity: DualReadObserveBaselineParityStatus;
  breaker: DualReadObservationBreakerSnapshot;
  /** True only when composition + flags are safe for a later operator activation GO. */
  activationSafe: boolean;
  /** Automatic page scheduling may run (still requires transport at call site). */
  mayScheduleAutomaticObserve: boolean;
  preferredComposition: "shadow_dual_write+observe";
  blockers: DualReadObserveBlockerCode[];
  notes: string[];
  providerCalls: 0;
  remoteWrites: 0;
};

export type BuildDualReadObserveReadinessInput = {
  env?: Record<string, string | undefined>;
  /** Whether a DB read transport is currently available (request-scoped or injected). */
  readTransportAvailable?: boolean;
  /** Inject breaker snapshot (defaults to process-local breaker). */
  breaker?: DualReadObservationBreakerSnapshot;
  /**
   * Operator-attested baseline/shadow parity proof.
   * Default unproven — never invents remote readiness.
   */
  baselineParityProven?: boolean;
};

function compositionFromResolution(
  resolution: PersistenceModeResolution
): DualReadObserveCompositionKind {
  if (resolution.kind === "unsupported") return "unsupported";
  if (resolution.kind === "invalid") return "invalid";
  if (resolution.mode === "shadow_dual_write") return "shadow_dual_write";
  if (resolution.mode === "dual_read") return "dual_read_without_shadow";
  return "json_only";
}

/**
 * Build sanitized dual-read observe readiness / preflight report.
 * Never reads secrets. Never writes remotely.
 */
export function buildDualReadObserveReadinessReport(
  input: BuildDualReadObserveReadinessInput = {}
): DualReadObserveReadinessReport {
  const env = input.env ?? process.env;
  const resolution = resolveTranslationStudioPersistenceMode(env);
  const composition = compositionFromResolution(resolution);
  const observeFlagRequested = isDualReadObserveEnabled(env);
  const shadowAvailable = composition === "shadow_dual_write";
  const readTransportAvailable = Boolean(input.readTransportAvailable);
  const breaker = input.breaker ?? getDualReadObservationBreaker();
  const baselineParity: DualReadObserveBaselineParityStatus =
    input.baselineParityProven === true
      ? "assumed_pending_operator_proof"
      : "unproven";

  const blockers: DualReadObserveBlockerCode[] = [];
  const notes: string[] = [];

  if (!observeFlagRequested) {
    blockers.push("observe_flag_off");
    notes.push("Observe flag off — automatic observe remains inactive (default).");
  }

  if (composition === "json_only") {
    blockers.push("json_only_observe_unsafe");
    notes.push(
      "JSON-only composition is unsafe for observe activation (no shadow mirror)."
    );
  }

  if (composition === "dual_read_without_shadow") {
    blockers.push("dual_read_mode_without_shadow_unsafe");
    notes.push(
      "Mode dual_read alone compares without shadow writes — not preferred for activation."
    );
  }

  if (composition === "unsupported") {
    blockers.push("db_primary_unsupported");
    notes.push("db_primary_json_fallback remains unsupported; fail closed to JSON.");
  }

  if (composition === "invalid") {
    blockers.push("invalid_persistence_mode");
    notes.push("Invalid persistence mode — fail closed to JSON; observe inactive.");
  }

  if (!readTransportAvailable) {
    blockers.push("read_transport_missing");
    notes.push("No DB read transport available for observe compare.");
  }

  if (breaker.state === "OPEN") {
    blockers.push("breaker_open");
    notes.push(
      `Observation breaker OPEN (${breaker.reason ?? "unknown"}) — auto observe skipped until explicit reset.`
    );
  }

  if (baselineParity === "unproven") {
    blockers.push("baseline_parity_unproven");
    notes.push(
      "Baseline/shadow parity not operator-proven in this report (default unproven)."
    );
  }

  const compositionSafe = shadowAvailable;
  const activationSafe =
    compositionSafe &&
    observeFlagRequested &&
    readTransportAvailable &&
    breaker.state === "CLOSED" &&
    input.baselineParityProven === true;

  const mayScheduleAutomaticObserve =
    compositionSafe &&
    observeFlagRequested &&
    breaker.state === "CLOSED";

  return {
    schemaVersion: 1,
    persistenceMode:
      resolution.kind === "executable"
        ? resolution.mode
        : resolution.kind === "unsupported"
          ? resolution.mode
          : null,
    persistenceModeKind: resolution.kind,
    composition,
    jsonAuthoritative: true,
    shadowAvailable,
    readTransportAvailable,
    observeFlagRequested,
    observeFlagEnvName: TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV,
    modeEnvName: TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
    baselineParity,
    breaker: { ...breaker },
    activationSafe,
    mayScheduleAutomaticObserve,
    preferredComposition: "shadow_dual_write+observe",
    blockers,
    notes,
    providerCalls: 0,
    remoteWrites: 0,
  };
}

/**
 * Gate for automatic admin-page observe scheduling.
 * Fail closed unless preferred safe composition + observe flag + breaker closed.
 */
export function evaluateDualReadObserveScheduleGate(
  input: BuildDualReadObserveReadinessInput = {}
): {
  maySchedule: boolean;
  reason: DualReadObserveBlockerCode | "ok";
  report: DualReadObserveReadinessReport;
} {
  const report = buildDualReadObserveReadinessReport(input);
  if (!report.observeFlagRequested) {
    return { maySchedule: false, reason: "observe_flag_off", report };
  }
  if (report.composition === "json_only") {
    return { maySchedule: false, reason: "json_only_observe_unsafe", report };
  }
  if (report.composition === "dual_read_without_shadow") {
    return {
      maySchedule: false,
      reason: "dual_read_mode_without_shadow_unsafe",
      report,
    };
  }
  if (report.composition === "unsupported") {
    return { maySchedule: false, reason: "db_primary_unsupported", report };
  }
  if (report.composition === "invalid") {
    return { maySchedule: false, reason: "invalid_persistence_mode", report };
  }
  if (report.breaker.state === "OPEN") {
    return { maySchedule: false, reason: "breaker_open", report };
  }
  if (!report.shadowAvailable) {
    return { maySchedule: false, reason: "json_only_observe_unsafe", report };
  }
  return { maySchedule: true, reason: "ok", report };
}

/**
 * Whether factory may nest dual-read observe over the selected implementation.
 * Prefer shadow_dual_write. Refuse silent nest over plain JSON-only.
 * Mode dual_read alone remains executable for explicit mode (handled separately).
 * Tests may force nest via enableDualRead=true.
 */
export function mayNestDualReadObserveOverImplementation(input: {
  implementation: "json" | "shadow_dual_write" | "dual_read";
  forceEnableDualRead?: boolean;
}): { allowed: boolean; reason: DualReadObserveBlockerCode | "ok" | "forced" } {
  if (input.forceEnableDualRead === true) {
    return { allowed: true, reason: "forced" };
  }
  if (input.implementation === "shadow_dual_write") {
    return { allowed: true, reason: "ok" };
  }
  if (input.implementation === "json") {
    return { allowed: false, reason: "json_only_observe_unsafe" };
  }
  // dual_read mode path is handled by mode branch; nest-over-json refused here
  return { allowed: false, reason: "dual_read_mode_without_shadow_unsafe" };
}

/** Rollback instructions (sanitized; no secrets). */
export const DUAL_READ_OBSERVE_ROLLBACK_STEPS = [
  `Unset ${TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV} (or set to 0/false)`,
  `Optionally set ${TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV}=json`,
  "Restart the Node process (clears process-local breaker) OR explicitly reset breaker via admin action",
  "JSON file store remains authoritative and unchanged",
] as const;
