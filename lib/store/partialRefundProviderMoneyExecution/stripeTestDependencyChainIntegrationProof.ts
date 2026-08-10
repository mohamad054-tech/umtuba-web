/**
 * Stripe TEST dependency-chain INTEGRATION PROOF — migration-independent ZERO-MONEY.
 *
 * Offline proof that records which Stripe TEST dependency packs are PRESENT on
 * the authoritative Commerce SoT tip vs still waiting on Central integration.
 *
 * THIS MODULE DOES NOT:
 * - integrate / merge packs onto Commerce SoT
 * - call Stripe / move money / write production DB
 * - enable provider gates or execution mode
 * - authorize controlled Stripe TEST execution
 *
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / PROVIDER_GATES=OFF.
 * Secrets never appear in reports (names / booleans / reason codes only).
 */

import { existsSync } from "node:fs";
import path from "node:path";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
  readPartialRefundProviderMoneyExecutionMode,
} from "./executionMode";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  evaluatePartialRefundProviderMoneyGate,
} from "./gate";

export const STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_VERSION =
  "commerce-stripe-test-dependency-chain-integration-proof-v1" as const;

export const STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_ENVIRONMENT =
  "isolated_stripe_test_dependency_chain_integration_proof_v1_not_production" as const;

/** Structural non-capability: proof never executes Stripe. */
export const STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_ACTIVATION_PERFORMED =
  false as const;

/** Structural non-capability: no provider execution entrypoints. */
export const STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_PROVIDER_EXECUTION_ENTRYPOINTS =
  [] as const;

export const STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_VERDICTS = [
  "B1_B2_CLOSED_NEXT_PRECHECK_BOUNDARY_READY",
  "B1_B2_OPEN_WAITING_CENTRAL_INTEGRATION",
] as const;

export type StripeTestDependencyChainIntegrationProofVerdict =
  (typeof STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_VERDICTS)[number];

export const STRIPE_TEST_DEPENDENCY_CHAIN_CAPABILITY_KEYS = [
  "STATE_MACHINE_PRESENT",
  "DRY_RUN_PRESENT",
  "ENV_READINESS_PRESENT",
  "CONTROL_PLANE_PRESENT",
  "FIXTURE_PACK_PRESENT",
  "OPERATOR_PACKET_PRESENT",
] as const;

export type StripeTestDependencyChainCapabilityKey =
  (typeof STRIPE_TEST_DEPENDENCY_CHAIN_CAPABILITY_KEYS)[number];

export type StripeTestDependencyChainCapabilityFlags = {
  STATE_MACHINE_PRESENT: boolean;
  DRY_RUN_PRESENT: boolean;
  ENV_READINESS_PRESENT: boolean;
  CONTROL_PLANE_PRESENT: boolean;
  FIXTURE_PACK_PRESENT: boolean;
  OPERATOR_PACKET_PRESENT: boolean;
};

export type StripeTestDependencyChainMissingDep = {
  blocker: "B1" | "B2";
  capability: StripeTestDependencyChainCapabilityKey;
  commitFullSha: string;
  commitShortSha: string;
  branch: string;
  subject: string;
  dependencyOrder: number;
  note: string;
};

/**
 * Explicit SoT ancestry / presence map — informational only.
 * Defaults encode verified Commerce SoT tip after git sync on 2026-08-10.
 */
export type StripeTestDependencyChainSotIntegration = {
  commerceSotTipSha: string;
  STATE_MACHINE_PRESENT: boolean;
  DRY_RUN_PRESENT: boolean;
  ENV_READINESS_PRESENT: boolean;
  CONTROL_PLANE_PRESENT: boolean;
  FIXTURE_PACK_PRESENT: boolean;
  OPERATOR_PACKET_PRESENT: boolean;
};

export type StripeTestDependencyChainWorkspacePresence = {
  stateMachineModulePresent: boolean;
  dryRunModulePresent: boolean;
  envReadinessModulePresent: boolean;
  controlPlaneModulePresent: boolean;
  fixturePackModulePresent: boolean;
  operatorPacketModulePresent: boolean;
};

export type StripeTestDependencyChainIntegrationProofInput = {
  /** Host env under audit (defaults empty — never reads secret bodies into output). */
  env?: Record<string, string | undefined>;
  /**
   * Override SoT presence map. Defaults = verified tip gaps/presence.
   * Never used to call remotes or perform merges.
   */
  sotIntegration?: Partial<StripeTestDependencyChainSotIntegration>;
  /**
   * Optional workspace root for local module probes.
   * Defaults to process.cwd().
   */
  workspaceRoot?: string;
};

export type StripeTestDependencyChainNextPrecheckBoundary = {
  boundaryId: string;
  ready: boolean;
  blockedReason: string | null;
  requiredBeforeBoundary: string[];
  note: string;
};

export type StripeTestDependencyChainIntegrationProofReport = {
  version: typeof STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_VERSION;
  environment: typeof STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_ENVIRONMENT;
  verdict: StripeTestDependencyChainIntegrationProofVerdict;
  /** Exact six capability flags — PRESENT means on Commerce SoT tip. */
  STATE_MACHINE_PRESENT: boolean;
  DRY_RUN_PRESENT: boolean;
  ENV_READINESS_PRESENT: boolean;
  CONTROL_PLANE_PRESENT: boolean;
  FIXTURE_PACK_PRESENT: boolean;
  OPERATOR_PACKET_PRESENT: boolean;
  /** YES only when STATE_MACHINE + DRY_RUN + ENV_READINESS are all PRESENT on tip. */
  B1_B2_CLOSED: "YES" | "NO";
  B1_PRESENT: boolean;
  B2_PRESENT: boolean;
  sotIntegration: StripeTestDependencyChainSotIntegration;
  workspacePresence: StripeTestDependencyChainWorkspacePresence;
  missingDeps: StripeTestDependencyChainMissingDep[];
  dependencyOrder: string[];
  nextPrecheckBoundary: StripeTestDependencyChainNextPrecheckBoundary;
  providerGatesOff: boolean;
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGates: "OFF";
  activationPerformed: false;
  stripeActivated: "NO";
  note: string;
};

type EnvSource = Record<string, string | undefined>;

const MODULE_DIR = "lib/store/partialRefundProviderMoneyExecution";

const WORKSPACE_MARKERS = {
  stateMachine: "stripeTestActivationStateMachine.ts",
  dryRun: "stripeTestActivationDryRunOrchestration.ts",
  envReadiness: "stripeTestFixtureEnvReadiness.ts",
  controlPlane: "stripeTestControlPlaneHardening.ts",
  fixturePack: "stripeTestFixturePack.ts",
  operatorPacket: "stripeTestExternalPrerequisiteOperatorPacket.ts",
} as const;

/**
 * Verified Commerce SoT tip FULL SHA after remote prune-sync on 2026-08-10.
 * Do not assume stale tips without a fresh remote sync.
 */
export const STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT: StripeTestDependencyChainSotIntegration =
  {
    commerceSotTipSha:
      "26020a2692235d72d491ae1ae6984dc4574eb185",
    STATE_MACHINE_PRESENT: false,
    DRY_RUN_PRESENT: false,
    ENV_READINESS_PRESENT: false,
    CONTROL_PLANE_PRESENT: true,
    FIXTURE_PACK_PRESENT: true,
    OPERATOR_PACKET_PRESENT: true,
  };

/**
 * Central dependency order for B1 then B2 (historical proven tips).
 * Prefer integrating B1 tip `f0511c3` (includes SM + regression + dry-run),
 * then B2 tip `386b382` (env-readiness whitespace-closed tip).
 */
export const STRIPE_TEST_DEPENDENCY_CHAIN_MISSING_DEPS_CATALOG: StripeTestDependencyChainMissingDep[] =
  [
    {
      blocker: "B1",
      capability: "STATE_MACHINE_PRESENT",
      commitFullSha: "03b45a19a311ac9e148d1d029d39d50da6e86b03",
      commitShortSha: "03b45a1",
      branch:
        "office/desktop-a2-stripe-test-activation-state-machine-safety-v1",
      subject:
        "feat(commerce): add Stripe TEST activation state machine safety v1",
      dependencyOrder: 1,
      note: "SM safety foundation — ancestor of regression + dry-run tips",
    },
    {
      blocker: "B1",
      capability: "STATE_MACHINE_PRESENT",
      commitFullSha: "1ad060c7336fddc0b46af370f12f604cc60aa413",
      commitShortSha: "1ad060c",
      branch:
        "office/desktop-a2-stripe-test-activation-state-machine-regression-invariants-v1",
      subject:
        "test(commerce): add Stripe TEST activation SM regression invariants",
      dependencyOrder: 2,
      note: "SM regression invariants — consumes 03b45a1",
    },
    {
      blocker: "B1",
      capability: "DRY_RUN_PRESENT",
      commitFullSha: "f0511c3c34ec29650141cda33a5e758a77e082dc",
      commitShortSha: "f0511c3",
      branch:
        "office/desktop-a2-stripe-test-activation-dry-run-orchestration-v1",
      subject:
        "test(commerce): add Stripe TEST activation dry-run orchestration v1",
      dependencyOrder: 3,
      note: "B1 tip — prefer this branch/tip for Central integrate (includes SM+regression)",
    },
    {
      blocker: "B2",
      capability: "ENV_READINESS_PRESENT",
      commitFullSha: "06a015ef779d6463bde9b3901246e2219758a788",
      commitShortSha: "06a015e",
      branch: "office/desktop-a2-stripe-test-fixture-env-readiness-v1",
      subject:
        "test(commerce): add Stripe TEST fixture env readiness probe",
      dependencyOrder: 4,
      note: "Env-readiness module commit — ancestor of whitespace tip 386b382",
    },
    {
      blocker: "B2",
      capability: "ENV_READINESS_PRESENT",
      commitFullSha: "386b382975244b30ca635196e4da80be98d4fddd",
      commitShortSha: "386b382",
      branch: "office/desktop-a2-stripe-test-fixture-env-readiness-v1",
      subject:
        "fix(commerce): strip trailing whitespace in Stripe TEST readiness runbook",
      dependencyOrder: 5,
      note: "B2 tip — prefer this branch/tip for Central integrate after B1",
    },
  ];

export const STRIPE_TEST_DEPENDENCY_CHAIN_ORDER: string[] = [
  "1) Central integrate B1 tip f0511c3 (office/desktop-a2-stripe-test-activation-dry-run-orchestration-v1) — includes 03b45a1 + 1ad060c + dry-run",
  "2) Central integrate B2 tip 386b382 (office/desktop-a2-stripe-test-fixture-env-readiness-v1) — includes 06a015e env-readiness",
  "3) Re-run COMMERCE_STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_V1 offline → expect B1_B2_CLOSED=YES",
  "4) Next precheck boundary: COMMERCE_STRIPE_TEST_POST_B1_B2_INTEGRATION_PRECHECK_AND_OPERATOR_GATE_V1 (credentials + money fixtures still operator-owned)",
];

/** Next boundary id prepared when B1+B2 close. */
export const STRIPE_TEST_DEPENDENCY_CHAIN_NEXT_PRECHECK_BOUNDARY_ID =
  "COMMERCE_STRIPE_TEST_POST_B1_B2_INTEGRATION_PRECHECK_AND_OPERATOR_GATE_V1" as const;

function resolveSot(
  partial?: Partial<StripeTestDependencyChainSotIntegration>
): StripeTestDependencyChainSotIntegration {
  return {
    ...STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT,
    ...partial,
  };
}

function probeWorkspace(workspaceRoot: string): StripeTestDependencyChainWorkspacePresence {
  const dir = path.join(workspaceRoot, MODULE_DIR);
  return {
    stateMachineModulePresent: existsSync(
      path.join(dir, WORKSPACE_MARKERS.stateMachine)
    ),
    dryRunModulePresent: existsSync(path.join(dir, WORKSPACE_MARKERS.dryRun)),
    envReadinessModulePresent: existsSync(
      path.join(dir, WORKSPACE_MARKERS.envReadiness)
    ),
    controlPlaneModulePresent: existsSync(
      path.join(dir, WORKSPACE_MARKERS.controlPlane)
    ),
    fixturePackModulePresent: existsSync(
      path.join(dir, WORKSPACE_MARKERS.fixturePack)
    ),
    operatorPacketModulePresent: existsSync(
      path.join(dir, WORKSPACE_MARKERS.operatorPacket)
    ),
  };
}

function providerGatesAreOff(env: EnvSource): boolean {
  const gate = evaluatePartialRefundProviderMoneyGate(env);
  const mode = readPartialRefundProviderMoneyExecutionMode(env);
  const prodAck = env[PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV];
  const prodAckPresent =
    typeof prodAck === "string" && prodAck.trim().length > 0;
  return (
    gate.providerMoneyEnabled !== true &&
    mode === "off" &&
    !prodAckPresent &&
    !env[PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV] &&
    !env[PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV] &&
    !env[PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]
  );
}

function selectMissingDeps(
  sot: StripeTestDependencyChainSotIntegration
): StripeTestDependencyChainMissingDep[] {
  return STRIPE_TEST_DEPENDENCY_CHAIN_MISSING_DEPS_CATALOG.filter((dep) => {
    if (dep.blocker === "B1") {
      return !(sot.STATE_MACHINE_PRESENT && sot.DRY_RUN_PRESENT);
    }
    return !sot.ENV_READINESS_PRESENT;
  });
}

function buildNextBoundary(
  b1B2Closed: boolean
): StripeTestDependencyChainNextPrecheckBoundary {
  if (b1B2Closed) {
    return {
      boundaryId: STRIPE_TEST_DEPENDENCY_CHAIN_NEXT_PRECHECK_BOUNDARY_ID,
      ready: true,
      blockedReason: null,
      requiredBeforeBoundary: [
        "Operator B3: isolated Stripe TEST credentials in local .env.local only (never commit)",
        "Operator B4: controlled TEST money fixture attestations per operator packet",
        "PROVIDER_GATES remain OFF until separate controlled-execution GO",
      ],
      note: "B1_B2_CLOSED=YES — Central dependency chain closed; next offline precheck/operator gate boundary is prepared (still no Stripe execution).",
    };
  }
  return {
    boundaryId: STRIPE_TEST_DEPENDENCY_CHAIN_NEXT_PRECHECK_BOUNDARY_ID,
    ready: false,
    blockedReason: "B1_B2_OPEN_WAITING_CENTRAL_INTEGRATION",
    requiredBeforeBoundary: [
      "Central integrate B1 tip f0511c3 onto Commerce SoT",
      "Central integrate B2 tip 386b382 onto Commerce SoT",
      "Re-prove this dependency-chain pack offline with B1_B2_CLOSED=YES",
    ],
    note: "Next precheck boundary is prepared as a contract id only — not ready until B1+B2 land on SoT.",
  };
}

/**
 * Build offline dependency-chain integration proof report.
 * Never calls Stripe. Never writes DB. Never merges SoT.
 */
export function buildStripeTestDependencyChainIntegrationProofReport(
  input: StripeTestDependencyChainIntegrationProofInput = {}
): StripeTestDependencyChainIntegrationProofReport {
  const env = input.env ?? {};
  const sot = resolveSot(input.sotIntegration);
  const workspaceRoot = input.workspaceRoot ?? process.cwd();
  const workspacePresence = probeWorkspace(workspaceRoot);

  const STATE_MACHINE_PRESENT = sot.STATE_MACHINE_PRESENT;
  const DRY_RUN_PRESENT = sot.DRY_RUN_PRESENT;
  const ENV_READINESS_PRESENT = sot.ENV_READINESS_PRESENT;
  const CONTROL_PLANE_PRESENT = sot.CONTROL_PLANE_PRESENT;
  const FIXTURE_PACK_PRESENT = sot.FIXTURE_PACK_PRESENT;
  const OPERATOR_PACKET_PRESENT = sot.OPERATOR_PACKET_PRESENT;

  const B1_PRESENT = STATE_MACHINE_PRESENT && DRY_RUN_PRESENT;
  const B2_PRESENT = ENV_READINESS_PRESENT;
  const closed = B1_PRESENT && B2_PRESENT;
  const B1_B2_CLOSED: "YES" | "NO" = closed ? "YES" : "NO";
  const missingDeps = selectMissingDeps(sot);
  const providerGatesOff = providerGatesAreOff(env);

  const verdict: StripeTestDependencyChainIntegrationProofVerdict = closed
    ? "B1_B2_CLOSED_NEXT_PRECHECK_BOUNDARY_READY"
    : "B1_B2_OPEN_WAITING_CENTRAL_INTEGRATION";

  return {
    version: STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_VERSION,
    environment: STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_ENVIRONMENT,
    verdict,
    STATE_MACHINE_PRESENT,
    DRY_RUN_PRESENT,
    ENV_READINESS_PRESENT,
    CONTROL_PLANE_PRESENT,
    FIXTURE_PACK_PRESENT,
    OPERATOR_PACKET_PRESENT,
    B1_B2_CLOSED,
    B1_PRESENT,
    B2_PRESENT,
    sotIntegration: sot,
    workspacePresence,
    missingDeps,
    dependencyOrder: [...STRIPE_TEST_DEPENDENCY_CHAIN_ORDER],
    nextPrecheckBoundary: buildNextBoundary(closed),
    providerGatesOff,
    networkStripeCalls: 0,
    moneyMovement: 0,
    productionDbWrites: 0,
    providerGates: "OFF",
    activationPerformed: false,
    stripeActivated: "NO",
    note: closed
      ? "B1 and B2 packs are PRESENT on Commerce SoT tip. Next precheck boundary is ready (still offline; no Stripe execution)."
      : "B1 and/or B2 packs are ABSENT from Commerce SoT tip. Central must integrate missing tips in dependency order before controlled Stripe TEST execution precheck.",
  };
}

export function isStripeTestDependencyChainB1B2Closed(
  input: StripeTestDependencyChainIntegrationProofInput = {}
): boolean {
  return (
    buildStripeTestDependencyChainIntegrationProofReport(input).B1_B2_CLOSED ===
    "YES"
  );
}

export function getStripeTestDependencyChainCapabilityFlags(
  input: StripeTestDependencyChainIntegrationProofInput = {}
): StripeTestDependencyChainCapabilityFlags {
  const report = buildStripeTestDependencyChainIntegrationProofReport(input);
  return {
    STATE_MACHINE_PRESENT: report.STATE_MACHINE_PRESENT,
    DRY_RUN_PRESENT: report.DRY_RUN_PRESENT,
    ENV_READINESS_PRESENT: report.ENV_READINESS_PRESENT,
    CONTROL_PLANE_PRESENT: report.CONTROL_PLANE_PRESENT,
    FIXTURE_PACK_PRESENT: report.FIXTURE_PACK_PRESENT,
    OPERATOR_PACKET_PRESENT: report.OPERATOR_PACKET_PRESENT,
  };
}
