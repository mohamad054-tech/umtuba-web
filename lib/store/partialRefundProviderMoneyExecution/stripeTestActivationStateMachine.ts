/**
 * Stripe TEST activation state-machine safety — migration-independent ZERO-MONEY.
 *
 * Explicit deterministic lifecycle for future controlled Stripe TEST activation.
 * THIS MODULE DOES NOT ACTIVATE STRIPE. It only models fail-closed transitions.
 *
 * Candidate states (canonical):
 * DISABLED → PRECHECK_BLOCKED | READY_FOR_TEST → TEST_ACTIVATING →
 * TEST_ACTIVE | TEST_FAILED → TEST_DEACTIVATED → DISABLED
 *
 * Hard guarantees:
 * - STRIPE_CALLS = 0 / MONEY_MOVEMENT = 0 / PRODUCTION_DB_WRITES = 0
 * - PROVIDER_GATES = OFF unless a separate operator activation is authorized
 *   (structural authorization constant is always false here)
 * - Cannot enter TEST_ACTIVE without precheck success
 * - LIVE cannot enter TEST activation
 * - Missing credentials / invalid fixtures → PRECHECK_BLOCKED
 * - Repeated activation / deactivation transitions are deterministic + idempotent
 * - Failure cannot silently become active
 * - Secrets never appear in logs, errors, or result payloads
 */

import {
  STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED,
} from "./stripeTestControlledTestPreActivationSafety";
import {
  buildStripeTestControlPlaneReport,
  type StripeTestControlPlaneReport,
} from "./stripeTestControlPlaneHardening";

export const STRIPE_TEST_ACTIVATION_STATE_MACHINE_VERSION =
  "commerce-stripe-test-activation-state-machine-safety-v1" as const;

export const STRIPE_TEST_ACTIVATION_STATE_MACHINE_ENVIRONMENT =
  "isolated_stripe_test_activation_state_machine_safety_v1_not_production" as const;

/** Structural non-capability: this module never performs activation. */
export const STRIPE_TEST_ACTIVATION_PERFORMED = false as const;

/**
 * Structural non-capability: operator activation authorization is always false here.
 * A separate coordinator GO is required outside this module.
 */
export const STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED = false as const;

/** Structural non-capability: no provider execution entrypoints. */
export const STRIPE_TEST_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS =
  [] as const;

export const STRIPE_TEST_ACTIVATION_STATES = [
  "DISABLED",
  "PRECHECK_BLOCKED",
  "READY_FOR_TEST",
  "TEST_ACTIVATING",
  "TEST_ACTIVE",
  "TEST_FAILED",
  "TEST_DEACTIVATED",
] as const;

export type StripeTestActivationState =
  (typeof STRIPE_TEST_ACTIVATION_STATES)[number];

export const STRIPE_TEST_ACTIVATION_EVENTS = [
  "EVALUATE_PRECHECK",
  "BEGIN_ACTIVATION",
  "MARK_ACTIVATION_SUCCEEDED",
  "MARK_ACTIVATION_FAILED",
  "DEACTIVATE",
  "RESET",
] as const;

export type StripeTestActivationEvent =
  (typeof STRIPE_TEST_ACTIVATION_EVENTS)[number];

export type StripeTestActivationTransitionResult = {
  ok: boolean;
  from: StripeTestActivationState;
  to: StripeTestActivationState;
  event: StripeTestActivationEvent;
  /** True when from === to and the event is a recognized no-op / retry. */
  idempotent: boolean;
  reasonCodes: string[];
  precheckSucceeded: boolean;
  controlPlaneStatus: StripeTestControlPlaneReport["status"];
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGates: "OFF";
  activationPerformed: false;
  operatorActivationAuthorized: boolean;
  note: string;
};

export type StripeTestActivationStateMachineReport = {
  version: typeof STRIPE_TEST_ACTIVATION_STATE_MACHINE_VERSION;
  environment: typeof STRIPE_TEST_ACTIVATION_STATE_MACHINE_ENVIRONMENT;
  /** Derived lifecycle state after EVALUATE_PRECHECK from DISABLED. */
  state: StripeTestActivationState;
  states: typeof STRIPE_TEST_ACTIVATION_STATES;
  controlPlaneStatus: StripeTestControlPlaneReport["status"];
  precheckSucceeded: boolean;
  canEnterTestActivating: boolean;
  canEnterTestActive: boolean;
  reasonCodes: string[];
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGates: "OFF";
  activationPerformed: false;
  operatorActivationAuthorized: false;
  providerExecutionStartCapable: false;
  note: string;
};

type EnvSource = Record<string, string | undefined>;

export type StripeTestActivationTransitionInput = {
  from: StripeTestActivationState;
  event: StripeTestActivationEvent;
  /** Env snapshot for control-plane precheck (never mutated). */
  source?: EnvSource;
  /**
   * Optional override for tests of the transition graph only.
   * Production callers must omit this — structural constant remains false.
   * Even when true, LIVE / failed precheck still cannot reach TEST_ACTIVE.
   */
  operatorActivationAuthorized?: boolean;
};

function uniqueCodes(codes: string[]): string[] {
  return [...new Set(codes)];
}

function controlPlanePrecheck(source: EnvSource): {
  report: StripeTestControlPlaneReport;
  precheckSucceeded: boolean;
  liveBlocked: boolean;
} {
  const report = buildStripeTestControlPlaneReport(source);
  // LIVE blocked only when LIVE is actually selected / live key prefixes present.
  // Missing STRIPE_MODE is a precheck failure, not a LIVE activation path.
  const liveBlocked =
    report.answers.liveDisabled === false ||
    report.reasons.includes("live_not_disabled");
  return {
    report,
    precheckSucceeded: report.status === "READY",
    liveBlocked,
  };
}

function result(args: {
  ok: boolean;
  from: StripeTestActivationState;
  to: StripeTestActivationState;
  event: StripeTestActivationEvent;
  idempotent?: boolean;
  reasonCodes?: string[];
  precheckSucceeded: boolean;
  controlPlaneStatus: StripeTestControlPlaneReport["status"];
  operatorActivationAuthorized: boolean;
  note: string;
}): StripeTestActivationTransitionResult {
  return {
    ok: args.ok,
    from: args.from,
    to: args.to,
    event: args.event,
    idempotent: args.idempotent ?? args.from === args.to,
    reasonCodes: uniqueCodes(args.reasonCodes ?? []),
    precheckSucceeded: args.precheckSucceeded,
    controlPlaneStatus: args.controlPlaneStatus,
    networkStripeCalls: 0,
    moneyMovement: 0,
    productionDbWrites: 0,
    providerGates: "OFF",
    activationPerformed: false,
    operatorActivationAuthorized: args.operatorActivationAuthorized,
    note: args.note,
  };
}

/**
 * Allowed raw edges (guards applied in applyStripeTestActivationTransition).
 * Idempotent self-edges are handled explicitly for activation/deactivation retries.
 */
export const STRIPE_TEST_ACTIVATION_TRANSITION_EDGES: Readonly<
  Record<StripeTestActivationState, readonly StripeTestActivationState[]>
> = {
  DISABLED: ["DISABLED", "PRECHECK_BLOCKED", "READY_FOR_TEST"],
  PRECHECK_BLOCKED: ["PRECHECK_BLOCKED", "READY_FOR_TEST", "DISABLED"],
  READY_FOR_TEST: [
    "READY_FOR_TEST",
    "PRECHECK_BLOCKED",
    "TEST_ACTIVATING",
    "DISABLED",
  ],
  TEST_ACTIVATING: [
    "TEST_ACTIVATING",
    "TEST_ACTIVE",
    "TEST_FAILED",
    "TEST_DEACTIVATED",
  ],
  TEST_ACTIVE: ["TEST_ACTIVE", "TEST_DEACTIVATED"],
  TEST_FAILED: ["TEST_FAILED", "TEST_DEACTIVATED", "DISABLED"],
  TEST_DEACTIVATED: ["TEST_DEACTIVATED", "DISABLED"],
};

export function canTransitionStripeTestActivationState(
  from: StripeTestActivationState,
  to: StripeTestActivationState
): boolean {
  if (from === to) return true;
  return (
    STRIPE_TEST_ACTIVATION_TRANSITION_EDGES[from]?.includes(to) ?? false
  );
}

/**
 * Pure fail-closed transition. Never enables gates, never calls Stripe,
 * never writes DB, never returns secret values.
 */
export function applyStripeTestActivationTransition(
  input: StripeTestActivationTransitionInput
): StripeTestActivationTransitionResult {
  const source = input.source ?? {};
  const { report, precheckSucceeded, liveBlocked } =
    controlPlanePrecheck(source);

  // Prefer explicit override only when provided (unit tests of authorized graph).
  // Production callers omit the override; structural constants remain false.
  // Even with override=true, LIVE / failed precheck still cannot reach TEST_ACTIVE.
  if (
    STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED !== false ||
    STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED !== false
  ) {
    throw new Error(
      "stripe_test_activation_structural_authorization_must_remain_false"
    );
  }
  const operatorAuthorized = input.operatorActivationAuthorized === true;

  const from = input.from;
  const event = input.event;
  const baseNote =
    "Stripe TEST activation state machine only. Never activates provider, never enables gates, never calls Stripe, never writes production DB, never returns secret values.";

  switch (event) {
    case "EVALUATE_PRECHECK": {
      if (
        from === "TEST_ACTIVATING" ||
        from === "TEST_ACTIVE" ||
        from === "TEST_FAILED" ||
        from === "TEST_DEACTIVATED"
      ) {
        // Precheck re-evaluation does not silently promote/demote active paths.
        return result({
          ok: false,
          from,
          to: from,
          event,
          idempotent: true,
          reasonCodes: ["precheck_reevaluate_not_applicable_in_activation_path"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      const to: StripeTestActivationState = precheckSucceeded
        ? "READY_FOR_TEST"
        : "PRECHECK_BLOCKED";
      return result({
        ok: true,
        from,
        to,
        event,
        idempotent: from === to,
        reasonCodes: precheckSucceeded ? [] : [...report.reasons],
        precheckSucceeded,
        controlPlaneStatus: report.status,
        operatorActivationAuthorized: operatorAuthorized,
        note: baseNote,
      });
    }

    case "BEGIN_ACTIVATION": {
      // Idempotent if already activating/active.
      if (from === "TEST_ACTIVATING" || from === "TEST_ACTIVE") {
        return result({
          ok: true,
          from,
          to: from,
          event,
          idempotent: true,
          reasonCodes: ["activation_begin_idempotent"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      if (liveBlocked) {
        return result({
          ok: false,
          from,
          to: "PRECHECK_BLOCKED",
          event,
          reasonCodes: [
            "live_cannot_enter_test_activation",
            ...report.reasons,
          ],
          precheckSucceeded: false,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      if (!precheckSucceeded) {
        return result({
          ok: false,
          from,
          to: "PRECHECK_BLOCKED",
          event,
          reasonCodes: [
            "cannot_begin_activation_without_precheck_success",
            ...report.reasons,
          ],
          precheckSucceeded: false,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      if (from !== "READY_FOR_TEST") {
        return result({
          ok: false,
          from,
          to: from,
          event,
          reasonCodes: ["begin_activation_requires_ready_for_test"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      if (!operatorAuthorized) {
        // Fail-closed: stay READY_FOR_TEST; do not enter activating/active.
        return result({
          ok: false,
          from,
          to: "READY_FOR_TEST",
          event,
          idempotent: true,
          reasonCodes: ["operator_activation_not_authorized"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: false,
          note: baseNote,
        });
      }

      return result({
        ok: true,
        from,
        to: "TEST_ACTIVATING",
        event,
        reasonCodes: [],
        precheckSucceeded,
        controlPlaneStatus: report.status,
        operatorActivationAuthorized: operatorAuthorized,
        note: baseNote,
      });
    }

    case "MARK_ACTIVATION_SUCCEEDED": {
      if (from === "TEST_ACTIVE") {
        return result({
          ok: true,
          from,
          to: "TEST_ACTIVE",
          event,
          idempotent: true,
          reasonCodes: ["activation_succeeded_idempotent"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      if (from !== "TEST_ACTIVATING") {
        return result({
          ok: false,
          from,
          to: from,
          event,
          reasonCodes: ["activation_succeeded_requires_test_activating"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      // Fail-closed: never silently become active without auth + precheck.
      if (!operatorAuthorized || !precheckSucceeded || liveBlocked) {
        return result({
          ok: false,
          from,
          to: "TEST_FAILED",
          event,
          reasonCodes: uniqueCodes([
            ...(operatorAuthorized
              ? []
              : ["operator_activation_not_authorized"]),
            ...(precheckSucceeded
              ? []
              : ["cannot_enter_test_active_without_precheck_success"]),
            ...(liveBlocked ? ["live_cannot_enter_test_activation"] : []),
            "failure_cannot_silently_become_active",
          ]),
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      return result({
        ok: true,
        from,
        to: "TEST_ACTIVE",
        event,
        reasonCodes: [],
        precheckSucceeded,
        controlPlaneStatus: report.status,
        operatorActivationAuthorized: operatorAuthorized,
        note: baseNote,
      });
    }

    case "MARK_ACTIVATION_FAILED": {
      if (from === "TEST_FAILED") {
        return result({
          ok: true,
          from,
          to: "TEST_FAILED",
          event,
          idempotent: true,
          reasonCodes: ["activation_failed_idempotent"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      if (from !== "TEST_ACTIVATING" && from !== "TEST_ACTIVE") {
        return result({
          ok: false,
          from,
          to: from,
          event,
          reasonCodes: ["activation_failed_requires_activating_or_active"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      return result({
        ok: true,
        from,
        to: "TEST_FAILED",
        event,
        reasonCodes: ["activation_marked_failed"],
        precheckSucceeded,
        controlPlaneStatus: report.status,
        operatorActivationAuthorized: operatorAuthorized,
        note: baseNote,
      });
    }

    case "DEACTIVATE": {
      if (from === "TEST_DEACTIVATED") {
        return result({
          ok: true,
          from,
          to: "TEST_DEACTIVATED",
          event,
          idempotent: true,
          reasonCodes: ["deactivation_idempotent"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      if (
        from !== "TEST_ACTIVATING" &&
        from !== "TEST_ACTIVE" &&
        from !== "TEST_FAILED"
      ) {
        return result({
          ok: false,
          from,
          to: from,
          event,
          reasonCodes: ["deactivation_requires_activation_path_state"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      return result({
        ok: true,
        from,
        to: "TEST_DEACTIVATED",
        event,
        reasonCodes: [],
        precheckSucceeded,
        controlPlaneStatus: report.status,
        operatorActivationAuthorized: operatorAuthorized,
        note: baseNote,
      });
    }

    case "RESET": {
      if (
        from !== "TEST_DEACTIVATED" &&
        from !== "TEST_FAILED" &&
        from !== "PRECHECK_BLOCKED" &&
        from !== "READY_FOR_TEST" &&
        from !== "DISABLED"
      ) {
        return result({
          ok: false,
          from,
          to: from,
          event,
          reasonCodes: ["reset_not_allowed_from_active_or_activating"],
          precheckSucceeded,
          controlPlaneStatus: report.status,
          operatorActivationAuthorized: operatorAuthorized,
          note: baseNote,
        });
      }

      return result({
        ok: true,
        from,
        to: "DISABLED",
        event,
        idempotent: from === "DISABLED",
        reasonCodes: [],
        precheckSucceeded,
        controlPlaneStatus: report.status,
        operatorActivationAuthorized: operatorAuthorized,
        note: baseNote,
      });
    }

    default: {
      const _exhaustive: never = event;
      return result({
        ok: false,
        from,
        to: from,
        event: _exhaustive,
        reasonCodes: ["unknown_event"],
        precheckSucceeded,
        controlPlaneStatus: report.status,
        operatorActivationAuthorized: operatorAuthorized,
        note: baseNote,
      });
    }
  }
}

/**
 * Build the offline activation state-machine report.
 * Starts from DISABLED, applies EVALUATE_PRECHECK once (deterministic).
 * Never mutates process.env. Never enables gates/modes. Never calls Stripe.
 */
export function buildStripeTestActivationStateMachineReport(
  source: EnvSource = process.env
): StripeTestActivationStateMachineReport {
  const evaluated = applyStripeTestActivationTransition({
    from: "DISABLED",
    event: "EVALUATE_PRECHECK",
    source,
    operatorActivationAuthorized: STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED,
  });

  const canEnterTestActivating = false; // structural: operator auth always false
  const canEnterTestActive = false;

  return {
    version: STRIPE_TEST_ACTIVATION_STATE_MACHINE_VERSION,
    environment: STRIPE_TEST_ACTIVATION_STATE_MACHINE_ENVIRONMENT,
    state: evaluated.to,
    states: STRIPE_TEST_ACTIVATION_STATES,
    controlPlaneStatus: evaluated.controlPlaneStatus,
    precheckSucceeded: evaluated.precheckSucceeded,
    canEnterTestActivating,
    canEnterTestActive,
    reasonCodes: evaluated.reasonCodes,
    networkStripeCalls: 0,
    moneyMovement: 0,
    productionDbWrites: 0,
    providerGates: "OFF",
    activationPerformed: false,
    operatorActivationAuthorized: false,
    providerExecutionStartCapable: false,
    note: evaluated.note,
  };
}

/** Convenience: derived state after precheck evaluation from DISABLED. */
export function resolveStripeTestActivationState(
  source: EnvSource = process.env
): StripeTestActivationState {
  return buildStripeTestActivationStateMachineReport(source).state;
}

/**
 * True only when derived state is READY_FOR_TEST.
 * Still does not authorize or perform activation.
 */
export function isStripeTestActivationReadyForTest(
  source: EnvSource = process.env
): boolean {
  return resolveStripeTestActivationState(source) === "READY_FOR_TEST";
}
