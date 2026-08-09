/**
 * Stripe TEST activation DRY-RUN orchestration — migration-independent ZERO-MONEY.
 *
 * Offline walk of the future controlled Stripe TEST activation lifecycle using
 * CURRENT activation state-machine + control-plane contracts.
 *
 * THIS MODULE DOES NOT ACTIVATE STRIPE.
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / PROVIDER_GATES=OFF.
 *
 * Phase walk (canonical dry-run phases):
 * PRECHECK → READY_FOR_TEST → ACTIVATION_REQUEST → ACTIVATION_VALIDATION →
 * TEST_ACTIVE_EXPECTED → DEACTIVATION → CLEANUP
 *
 * Each phase records: INPUTS, EXPECTED_STATE, BLOCKING_REASONS, EVIDENCE,
 * STOP_CONDITION, ROLLBACK_ACTION.
 */

import {
  buildStripeTestControlPlaneReport,
  type StripeTestControlPlaneReport,
} from "./stripeTestControlPlaneHardening";
import {
  STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED,
  STRIPE_TEST_ACTIVATION_PERFORMED,
  STRIPE_TEST_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS,
  applyStripeTestActivationTransition,
  type StripeTestActivationState,
  type StripeTestActivationTransitionResult,
} from "./stripeTestActivationStateMachine";
import { STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED } from "./stripeTestControlledTestPreActivationSafety";

export const STRIPE_TEST_ACTIVATION_DRY_RUN_ORCHESTRATION_VERSION =
  "commerce-stripe-test-activation-dry-run-orchestration-v1" as const;

export const STRIPE_TEST_ACTIVATION_DRY_RUN_ENVIRONMENT =
  "isolated_stripe_test_activation_dry_run_orchestration_v1_not_production" as const;

/** Structural non-capability: dry-run never performs activation. */
export const STRIPE_TEST_ACTIVATION_DRY_RUN_ACTIVATION_PERFORMED = false as const;

/** Structural non-capability: no provider execution entrypoints. */
export const STRIPE_TEST_ACTIVATION_DRY_RUN_PROVIDER_EXECUTION_ENTRYPOINTS =
  [] as const;

export const STRIPE_TEST_ACTIVATION_DRY_RUN_PHASES = [
  "PRECHECK",
  "READY_FOR_TEST",
  "ACTIVATION_REQUEST",
  "ACTIVATION_VALIDATION",
  "TEST_ACTIVE_EXPECTED",
  "DEACTIVATION",
  "CLEANUP",
] as const;

export type StripeTestActivationDryRunPhase =
  (typeof STRIPE_TEST_ACTIVATION_DRY_RUN_PHASES)[number];

export type StripeTestActivationDryRunPhaseRecord = {
  phase: StripeTestActivationDryRunPhase;
  inputs: {
    envKeysPresent: string[];
    smFrom: StripeTestActivationState;
    smEvent: string;
    /** Dry-run may simulate authorized graph; structural constants remain false. */
    operatorActivationAuthorizedSimulated: boolean;
  };
  expectedState: StripeTestActivationState;
  actualState: StripeTestActivationState;
  blockingReasons: string[];
  evidence: {
    transitionOk: boolean;
    idempotent: boolean;
    controlPlaneStatus: StripeTestControlPlaneReport["status"];
    precheckSucceeded: boolean;
    networkStripeCalls: 0;
    moneyMovement: 0;
    productionDbWrites: 0;
    providerGates: "OFF";
    activationPerformed: false;
  };
  stopCondition: string;
  rollbackAction: string;
  passed: boolean;
};

export type StripeTestActivationDryRunVerification = {
  invalidPrecheckBlocksActivation: boolean;
  missingCredentialBlocksActivation: boolean;
  liveModeBlocksTestActivation: boolean;
  invalidFixtureBlocksActivation: boolean;
  repeatedActivationDeterministic: boolean;
  failedTransitionFailClosed: boolean;
  deactivationPathDeterministic: boolean;
  noSecretValuesAppear: boolean;
  noNetworkProviderAction: boolean;
};

export type StripeTestActivationDryRunReport = {
  version: typeof STRIPE_TEST_ACTIVATION_DRY_RUN_ORCHESTRATION_VERSION;
  environment: typeof STRIPE_TEST_ACTIVATION_DRY_RUN_ENVIRONMENT;
  phases: StripeTestActivationDryRunPhaseRecord[];
  happyPathPassed: boolean;
  verifications: StripeTestActivationDryRunVerification;
  allVerificationsPassed: boolean;
  waitingForStateMachineIntegration: boolean;
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGates: "OFF";
  activationPerformed: false;
  stripeActivated: "NO";
  operatorActivationAuthorized: false;
  providerExecutionStartCapable: false;
  note: string;
};

type EnvSource = Record<string, string | undefined>;

const TRACKED_ENV_KEYS = [
  "STRIPE_MODE",
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "APP_ORIGIN",
  "NEXT_PUBLIC_SITE_URL",
] as const;

function presentEnvKeys(source: EnvSource): string[] {
  return TRACKED_ENV_KEYS.filter((k) => {
    const v = source[k];
    return typeof v === "string" && v.trim().length > 0;
  });
}

function assertStructuralAuthFalse(): void {
  if (
    STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED !== false ||
    STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED !== false ||
    STRIPE_TEST_ACTIVATION_PERFORMED !== false ||
    STRIPE_TEST_ACTIVATION_DRY_RUN_ACTIVATION_PERFORMED !== false
  ) {
    throw new Error(
      "stripe_test_activation_dry_run_structural_authorization_must_remain_false"
    );
  }
}

function phaseRecord(args: {
  phase: StripeTestActivationDryRunPhase;
  source: EnvSource;
  smFrom: StripeTestActivationState;
  smEvent: string;
  operatorSimulated: boolean;
  expectedState: StripeTestActivationState;
  transition: StripeTestActivationTransitionResult;
  controlPlane: StripeTestControlPlaneReport;
  stopCondition: string;
  rollbackAction: string;
  extraBlocking?: string[];
}): StripeTestActivationDryRunPhaseRecord {
  const blockingReasons = [
    ...args.transition.reasonCodes,
    ...(args.extraBlocking ?? []),
  ];
  const uniqueReasons = [...new Set(blockingReasons)];
  const passed = args.transition.to === args.expectedState;

  return {
    phase: args.phase,
    inputs: {
      envKeysPresent: presentEnvKeys(args.source),
      smFrom: args.smFrom,
      smEvent: args.smEvent,
      operatorActivationAuthorizedSimulated: args.operatorSimulated,
    },
    expectedState: args.expectedState,
    actualState: args.transition.to,
    blockingReasons: uniqueReasons,
    evidence: {
      transitionOk: args.transition.ok,
      idempotent: args.transition.idempotent,
      controlPlaneStatus: args.controlPlane.status,
      precheckSucceeded: args.transition.precheckSucceeded,
      networkStripeCalls: 0,
      moneyMovement: 0,
      productionDbWrites: 0,
      providerGates: "OFF",
      activationPerformed: false,
    },
    stopCondition: args.stopCondition,
    rollbackAction: args.rollbackAction,
    passed,
  };
}

/**
 * Happy-path offline dry-run of the activation lifecycle against SM contracts.
 * Uses operatorActivationAuthorized=true ONLY as a simulation override for the
 * authorized transition graph. Structural constants remain false; no Stripe
 * network, no money, no DB writes, no gate enablement.
 */
export function runStripeTestActivationDryRunHappyPath(
  source: EnvSource = {}
): {
  phases: StripeTestActivationDryRunPhaseRecord[];
  finalState: StripeTestActivationState;
  passed: boolean;
} {
  assertStructuralAuthFalse();
  const controlPlane = buildStripeTestControlPlaneReport(source);
  const phases: StripeTestActivationDryRunPhaseRecord[] = [];
  const simAuth = true;

  // PRECHECK: DISABLED → EVALUATE_PRECHECK → READY_FOR_TEST (when CP READY)
  const precheck = applyStripeTestActivationTransition({
    from: "DISABLED",
    event: "EVALUATE_PRECHECK",
    source,
    operatorActivationAuthorized: simAuth,
  });
  phases.push(
    phaseRecord({
      phase: "PRECHECK",
      source,
      smFrom: "DISABLED",
      smEvent: "EVALUATE_PRECHECK",
      operatorSimulated: simAuth,
      // Happy-path dry-run requires READY_FOR_TEST. Blocked precheck fails the walk.
      expectedState: "READY_FOR_TEST",
      transition: precheck,
      controlPlane,
      stopCondition:
        "Stop if precheck does not reach READY_FOR_TEST (control plane NOT_READY).",
      rollbackAction: "RESET to DISABLED; do not begin activation.",
    })
  );

  const precheckReady =
    precheck.to === "READY_FOR_TEST" && controlPlane.status === "READY";

  // READY_FOR_TEST: confirm hold at ready (idempotent re-evaluate)
  const ready = applyStripeTestActivationTransition({
    from: precheckReady ? "READY_FOR_TEST" : precheck.to,
    event: "EVALUATE_PRECHECK",
    source,
    operatorActivationAuthorized: simAuth,
  });
  phases.push(
    phaseRecord({
      phase: "READY_FOR_TEST",
      source,
      smFrom: precheckReady ? "READY_FOR_TEST" : precheck.to,
      smEvent: "EVALUATE_PRECHECK",
      operatorSimulated: simAuth,
      expectedState: "READY_FOR_TEST",
      transition: ready,
      controlPlane,
      stopCondition:
        "Stop if READY_FOR_TEST cannot be held / re-evaluated deterministically.",
      rollbackAction: "RESET to DISABLED; keep PROVIDER_GATES=OFF.",
      extraBlocking: precheckReady
        ? []
        : ["happy_path_stopped_precheck_not_ready"],
    })
  );

  // ACTIVATION_REQUEST: READY_FOR_TEST → BEGIN_ACTIVATION → TEST_ACTIVATING
  const begin = applyStripeTestActivationTransition({
    from: "READY_FOR_TEST",
    event: "BEGIN_ACTIVATION",
    source,
    operatorActivationAuthorized: simAuth,
  });
  phases.push(
    phaseRecord({
      phase: "ACTIVATION_REQUEST",
      source,
      smFrom: "READY_FOR_TEST",
      smEvent: "BEGIN_ACTIVATION",
      operatorSimulated: simAuth,
      expectedState: "TEST_ACTIVATING",
      transition: begin,
      controlPlane,
      stopCondition:
        "Stop if BEGIN_ACTIVATION does not enter TEST_ACTIVATING under simulated auth + READY CP.",
      rollbackAction: "DEACTIVATE or RESET; never mark succeeded from blocked path.",
      extraBlocking: precheckReady
        ? []
        : ["happy_path_stopped_precheck_not_ready"],
    })
  );

  // ACTIVATION_VALIDATION: still activating; succeeded mark next
  // (validation phase = confirm still TEST_ACTIVATING before success mark)
  const validateHold = applyStripeTestActivationTransition({
    from: "TEST_ACTIVATING",
    event: "BEGIN_ACTIVATION",
    source,
    operatorActivationAuthorized: simAuth,
  });
  phases.push(
    phaseRecord({
      phase: "ACTIVATION_VALIDATION",
      source,
      smFrom: "TEST_ACTIVATING",
      smEvent: "BEGIN_ACTIVATION",
      operatorSimulated: simAuth,
      expectedState: "TEST_ACTIVATING",
      transition: validateHold,
      controlPlane,
      stopCondition:
        "Stop if activating state is not idempotently held during validation.",
      rollbackAction: "MARK_ACTIVATION_FAILED then DEACTIVATE; keep gates OFF.",
      extraBlocking: [
        ...(validateHold.idempotent ? [] : ["activation_validation_not_idempotent"]),
        ...(precheckReady ? [] : ["happy_path_stopped_precheck_not_ready"]),
      ],
    })
  );

  // TEST_ACTIVE_EXPECTED: TEST_ACTIVATING → MARK_ACTIVATION_SUCCEEDED → TEST_ACTIVE
  const succeeded = applyStripeTestActivationTransition({
    from: "TEST_ACTIVATING",
    event: "MARK_ACTIVATION_SUCCEEDED",
    source,
    operatorActivationAuthorized: simAuth,
  });
  phases.push(
    phaseRecord({
      phase: "TEST_ACTIVE_EXPECTED",
      source,
      smFrom: "TEST_ACTIVATING",
      smEvent: "MARK_ACTIVATION_SUCCEEDED",
      operatorSimulated: simAuth,
      expectedState: "TEST_ACTIVE",
      transition: succeeded,
      controlPlane,
      stopCondition:
        "Stop if simulated authorized success does not reach TEST_ACTIVE when CP READY.",
      rollbackAction: "DEACTIVATE immediately; RESET to DISABLED.",
      extraBlocking: precheckReady
        ? []
        : ["happy_path_stopped_precheck_not_ready"],
    })
  );

  // DEACTIVATION: TEST_ACTIVE → DEACTIVATE → TEST_DEACTIVATED
  const deactivate = applyStripeTestActivationTransition({
    from: "TEST_ACTIVE",
    event: "DEACTIVATE",
    source,
    operatorActivationAuthorized: simAuth,
  });
  phases.push(
    phaseRecord({
      phase: "DEACTIVATION",
      source,
      smFrom: "TEST_ACTIVE",
      smEvent: "DEACTIVATE",
      operatorSimulated: simAuth,
      expectedState: "TEST_DEACTIVATED",
      transition: deactivate,
      controlPlane,
      stopCondition: "Stop if deactivation is non-deterministic or fails.",
      rollbackAction: "Retry DEACTIVATE (idempotent); do not re-activate.",
      extraBlocking: precheckReady
        ? []
        : ["happy_path_stopped_precheck_not_ready"],
    })
  );

  // CLEANUP: TEST_DEACTIVATED → RESET → DISABLED
  const cleanup = applyStripeTestActivationTransition({
    from: "TEST_DEACTIVATED",
    event: "RESET",
    source,
    operatorActivationAuthorized: simAuth,
  });
  phases.push(
    phaseRecord({
      phase: "CLEANUP",
      source,
      smFrom: "TEST_DEACTIVATED",
      smEvent: "RESET",
      operatorSimulated: simAuth,
      expectedState: "DISABLED",
      transition: cleanup,
      controlPlane,
      stopCondition: "Stop if cleanup does not return to DISABLED.",
      rollbackAction: "Force RESET from TEST_DEACTIVATED; leave gates OFF.",
      extraBlocking: precheckReady
        ? []
        : ["happy_path_stopped_precheck_not_ready"],
    })
  );

  // Phase.passed is expected-state match only; happy-path also requires READY CP.
  const phaseStatesMatch = phases.every((p) => p.passed);
  return {
    phases,
    finalState: cleanup.to,
    passed:
      precheckReady &&
      phaseStatesMatch &&
      begin.to === "TEST_ACTIVATING" &&
      succeeded.to === "TEST_ACTIVE" &&
      cleanup.to === "DISABLED",
  };
}

function assertNoSecretEcho(
  payload: unknown,
  forbidden: string[]
): boolean {
  const blob = JSON.stringify(payload);
  return forbidden.every((s) => s.length === 0 || !blob.includes(s));
}

/**
 * Offline verification matrix for dry-run orchestration.
 * Never calls Stripe. Never writes DB. Never enables gates.
 */
export function verifyStripeTestActivationDryRunGuards(args: {
  readySource: EnvSource;
  missingCredentialSource: EnvSource;
  liveSource: EnvSource;
  invalidPrecheckSource: EnvSource;
  /** Optional fake secret values that must never appear in outputs. */
  forbiddenSecretValues?: string[];
}): StripeTestActivationDryRunVerification {
  assertStructuralAuthFalse();
  const forbidden = args.forbiddenSecretValues ?? [];

  // (1) invalid precheck blocks activation
  const invalidBegin = applyStripeTestActivationTransition({
    from: "READY_FOR_TEST",
    event: "BEGIN_ACTIVATION",
    source: args.invalidPrecheckSource,
    operatorActivationAuthorized: true,
  });
  const invalidPrecheckBlocksActivation =
    invalidBegin.to !== "TEST_ACTIVATING" &&
    invalidBegin.to !== "TEST_ACTIVE" &&
    invalidBegin.ok === false;

  // (2) missing credential blocks activation
  const missingBegin = applyStripeTestActivationTransition({
    from: "READY_FOR_TEST",
    event: "BEGIN_ACTIVATION",
    source: args.missingCredentialSource,
    operatorActivationAuthorized: true,
  });
  const missingCredentialBlocksActivation =
    missingBegin.to !== "TEST_ACTIVATING" &&
    missingBegin.to !== "TEST_ACTIVE" &&
    missingBegin.ok === false;

  // (3) LIVE mode blocks TEST activation
  const liveBegin = applyStripeTestActivationTransition({
    from: "READY_FOR_TEST",
    event: "BEGIN_ACTIVATION",
    source: args.liveSource,
    operatorActivationAuthorized: true,
  });
  const liveSucceeded = applyStripeTestActivationTransition({
    from: "TEST_ACTIVATING",
    event: "MARK_ACTIVATION_SUCCEEDED",
    source: args.liveSource,
    operatorActivationAuthorized: true,
  });
  const liveModeBlocksTestActivation =
    liveBegin.to !== "TEST_ACTIVE" &&
    liveSucceeded.to !== "TEST_ACTIVE" &&
    (liveBegin.reasonCodes.includes("live_cannot_enter_test_activation") ||
      liveBegin.to === "PRECHECK_BLOCKED" ||
      liveSucceeded.reasonCodes.includes("live_cannot_enter_test_activation") ||
      liveSucceeded.to === "TEST_FAILED");

  // (4) invalid fixture blocks activation — control plane NOT_READY + begin blocked
  // (same as invalid precheck source when fixtures/gates break readiness)
  const invalidCp = buildStripeTestControlPlaneReport(args.invalidPrecheckSource);
  const invalidFixtureBlocksActivation =
    invalidCp.status === "NOT_READY" && invalidPrecheckBlocksActivation;

  // (5) repeated activation deterministic
  const a1 = applyStripeTestActivationTransition({
    from: "READY_FOR_TEST",
    event: "BEGIN_ACTIVATION",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const a2 = applyStripeTestActivationTransition({
    from: "READY_FOR_TEST",
    event: "BEGIN_ACTIVATION",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const active1 = applyStripeTestActivationTransition({
    from: "TEST_ACTIVATING",
    event: "MARK_ACTIVATION_SUCCEEDED",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const active2 = applyStripeTestActivationTransition({
    from: "TEST_ACTIVATING",
    event: "MARK_ACTIVATION_SUCCEEDED",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const idem = applyStripeTestActivationTransition({
    from: "TEST_ACTIVE",
    event: "BEGIN_ACTIVATION",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const repeatedActivationDeterministic =
    a1.to === a2.to &&
    a1.ok === a2.ok &&
    active1.to === active2.to &&
    active1.to === "TEST_ACTIVE" &&
    idem.to === "TEST_ACTIVE" &&
    idem.idempotent === true;

  // (6) failed transition stays fail-closed
  const failed = applyStripeTestActivationTransition({
    from: "TEST_ACTIVATING",
    event: "MARK_ACTIVATION_FAILED",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const sneak = applyStripeTestActivationTransition({
    from: "TEST_FAILED",
    event: "MARK_ACTIVATION_SUCCEEDED",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const failedTransitionFailClosed =
    failed.to === "TEST_FAILED" &&
    sneak.to === "TEST_FAILED" &&
    sneak.ok === false;

  // (7) deactivation path deterministic
  const d1 = applyStripeTestActivationTransition({
    from: "TEST_ACTIVE",
    event: "DEACTIVATE",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const d2 = applyStripeTestActivationTransition({
    from: "TEST_ACTIVE",
    event: "DEACTIVATE",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const dIdem = applyStripeTestActivationTransition({
    from: "TEST_DEACTIVATED",
    event: "DEACTIVATE",
    source: args.readySource,
    operatorActivationAuthorized: true,
  });
  const deactivationPathDeterministic =
    d1.to === "TEST_DEACTIVATED" &&
    d2.to === "TEST_DEACTIVATED" &&
    d1.to === d2.to &&
    dIdem.to === "TEST_DEACTIVATED" &&
    dIdem.idempotent === true;

  // (8)(9) secrets + network/provider action
  const happy = runStripeTestActivationDryRunHappyPath(args.readySource);
  const samplePayloads = [
    happy,
    invalidBegin,
    missingBegin,
    liveBegin,
    liveSucceeded,
    a1,
    active1,
    failed,
    sneak,
    d1,
  ];
  const noSecretValuesAppear = samplePayloads.every((p) =>
    assertNoSecretEcho(p, forbidden)
  );
  const noNetworkProviderAction = samplePayloads.every((p) => {
    if ("networkStripeCalls" in p && typeof p === "object" && p !== null) {
      const r = p as {
        networkStripeCalls?: number;
        moneyMovement?: number;
        productionDbWrites?: number;
        providerGates?: string;
        activationPerformed?: boolean;
      };
      if (typeof r.networkStripeCalls === "number") {
        return (
          r.networkStripeCalls === 0 &&
          r.moneyMovement === 0 &&
          r.productionDbWrites === 0 &&
          r.providerGates === "OFF" &&
          r.activationPerformed === false
        );
      }
    }
    if ("phases" in (p as object)) {
      const reportLike = p as {
        phases: StripeTestActivationDryRunPhaseRecord[];
      };
      return reportLike.phases.every(
        (ph) =>
          ph.evidence.networkStripeCalls === 0 &&
          ph.evidence.moneyMovement === 0 &&
          ph.evidence.productionDbWrites === 0 &&
          ph.evidence.providerGates === "OFF" &&
          ph.evidence.activationPerformed === false
      );
    }
    return true;
  });

  return {
    invalidPrecheckBlocksActivation,
    missingCredentialBlocksActivation,
    liveModeBlocksTestActivation,
    invalidFixtureBlocksActivation,
    repeatedActivationDeterministic,
    failedTransitionFailClosed,
    deactivationPathDeterministic,
    noSecretValuesAppear,
    noNetworkProviderAction,
  };
}

/**
 * Full offline dry-run report: happy-path phases + verification matrix.
 * waitingForStateMachineIntegration is informational for SoT-tip coverage.
 */
export function buildStripeTestActivationDryRunReport(args: {
  readySource: EnvSource;
  missingCredentialSource: EnvSource;
  liveSource: EnvSource;
  invalidPrecheckSource: EnvSource;
  forbiddenSecretValues?: string[];
  /**
   * Set true when SM tip is not yet ancestor of Commerce SoT tip.
   * Dry-run still completes against available SM contracts.
   */
  waitingForStateMachineIntegration?: boolean;
}): StripeTestActivationDryRunReport {
  assertStructuralAuthFalse();
  if (STRIPE_TEST_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS.length !== 0) {
    throw new Error("stripe_test_activation_sm_must_expose_zero_entrypoints");
  }

  const happy = runStripeTestActivationDryRunHappyPath(args.readySource);
  const verifications = verifyStripeTestActivationDryRunGuards({
    readySource: args.readySource,
    missingCredentialSource: args.missingCredentialSource,
    liveSource: args.liveSource,
    invalidPrecheckSource: args.invalidPrecheckSource,
    forbiddenSecretValues: args.forbiddenSecretValues,
  });

  const allVerificationsPassed = Object.values(verifications).every(Boolean);

  return {
    version: STRIPE_TEST_ACTIVATION_DRY_RUN_ORCHESTRATION_VERSION,
    environment: STRIPE_TEST_ACTIVATION_DRY_RUN_ENVIRONMENT,
    phases: happy.phases,
    happyPathPassed: happy.passed,
    verifications,
    allVerificationsPassed,
    waitingForStateMachineIntegration:
      args.waitingForStateMachineIntegration === true,
    networkStripeCalls: 0,
    moneyMovement: 0,
    productionDbWrites: 0,
    providerGates: "OFF",
    activationPerformed: false,
    stripeActivated: "NO",
    operatorActivationAuthorized: false,
    providerExecutionStartCapable: false,
    note: "Offline dry-run orchestration only. Never activates Stripe, never enables gates, never calls network, never writes production DB, never returns secret values.",
  };
}

/** True when happy-path + all guard verifications pass. */
export function isStripeTestActivationDryRunReady(
  report: StripeTestActivationDryRunReport
): boolean {
  return report.happyPathPassed && report.allVerificationsPassed;
}
