/**
 * Stripe TEST OPERATOR READINESS EVIDENCE PACK — post–B1/B2 checklist (ZERO-MONEY).
 *
 * Offline evidence checklist needed AFTER Central closes B1/B2. Records whether
 * each readiness dimension is READY on the Commerce SoT tip / host, and emits:
 * - MISSING_OPERATOR_INPUTS
 * - CENTRAL_DEPENDENCIES
 * - TEST_EXECUTION_PREREQUISITES
 *
 * THIS MODULE DOES NOT:
 * - integrate / merge packs onto Commerce SoT
 * - call Stripe / move money / write production DB
 * - enable provider gates or execution mode
 * - create credentials
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
import {
  REQUIRED_FIXTURE_FIELDS,
  REQUIRED_TEST_CONFIGURATION_NAMES,
} from "./stripeTestExternalPrerequisiteOperatorPacket";

export const STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_VERSION =
  "commerce-stripe-operator-readiness-evidence-pack-v1" as const;

export const STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_ENVIRONMENT =
  "isolated_stripe_operator_readiness_evidence_pack_v1_not_production" as const;

/** Structural non-capability: evidence pack never executes Stripe. */
export const STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_ACTIVATION_PERFORMED =
  false as const;

/** Structural non-capability: no provider execution entrypoints. */
export const STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_PROVIDER_EXECUTION_ENTRYPOINTS =
  [] as const;

/** Hard flag: this pack never authorizes Stripe execution. */
export const STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_EXECUTION_AUTHORIZED =
  false as const;

export const STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_DIMENSIONS = [
  "CONTROL_PLANE_READY",
  "STATE_MACHINE_READY",
  "DRY_RUN_READY",
  "ENV_READINESS_READY",
  "FIXTURE_READY",
  "OPERATOR_PACKET_READY",
  "CREDENTIAL_BOUNDARY_READY",
  "LIVE_MODE_PROTECTION_READY",
  "ROLLBACK_READY",
] as const;

export type StripeTestOperatorReadinessEvidenceDimension =
  (typeof STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_DIMENSIONS)[number];

export const STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_VERDICTS = [
  "OPERATOR_READINESS_EVIDENCE_COMPLETE_PENDING_EXECUTION_GO",
  "OPERATOR_READINESS_EVIDENCE_INCOMPLETE_WAITING_CENTRAL_OR_OPERATOR",
] as const;

export type StripeTestOperatorReadinessEvidenceVerdict =
  (typeof STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_VERDICTS)[number];

export type StripeTestOperatorReadinessDimensionStatus = {
  dimension: StripeTestOperatorReadinessEvidenceDimension;
  ready: boolean;
  codePackPresent: boolean;
  evidence: string;
  blockedBy: "NONE" | "CENTRAL" | "OPERATOR" | "HOST_ENV" | "COMPOSITE";
};

/**
 * SoT presence map — informational only.
 * Defaults encode verified Commerce SoT tip after git sync on 2026-08-10.
 */
export type StripeTestOperatorReadinessSotPresence = {
  commerceSotTipSha: string;
  controlPlanePresent: boolean;
  stateMachinePresent: boolean;
  dryRunPresent: boolean;
  envReadinessPresent: boolean;
  fixturePackPresent: boolean;
  operatorPacketPresent: boolean;
};

export type StripeTestOperatorReadinessWorkspacePresence = {
  controlPlaneModulePresent: boolean;
  stateMachineModulePresent: boolean;
  dryRunModulePresent: boolean;
  envReadinessModulePresent: boolean;
  fixturePackModulePresent: boolean;
  operatorPacketModulePresent: boolean;
};

export type StripeTestOperatorReadinessOperatorAttestations = {
  /** Isolated Stripe TEST credentials placed in local .env.local (never commit). */
  isolatedTestCredentialsInjected: boolean;
  /** Host confirmed TEST-only mode / TEST key prefixes (names-only; no values). */
  testModeConfirmed: boolean;
  /** LIVE credentials / LIVE mode / production exec ACK confirmed ABSENT. */
  liveCredentialsAbsent: boolean;
  /** Operator money-fixture attestations complete (B4 fields). */
  moneyFixturesAttested: boolean;
  /** Explicit written GO for controlled Stripe TEST execution (separate wave). */
  controlledExecutionGoIssued: boolean;
};

export type StripeTestOperatorReadinessEvidencePackInput = {
  env?: Record<string, string | undefined>;
  sotPresence?: Partial<StripeTestOperatorReadinessSotPresence>;
  operatorAttestations?: Partial<StripeTestOperatorReadinessOperatorAttestations>;
  workspaceRoot?: string;
};

export type StripeTestOperatorReadinessMissingOperatorInput = {
  id: string;
  category: "CREDENTIALS" | "FIXTURES" | "EXECUTION_GO" | "CLEANUP";
  required: true;
  detail: string;
};

export type StripeTestOperatorReadinessCentralDependency = {
  blocker: "B1" | "B2";
  status: "CLOSED" | "OPEN";
  preferTipFullSha: string | null;
  preferBranch: string | null;
  detail: string;
};

export type StripeTestOperatorReadinessTestExecutionPrerequisite = {
  order: number;
  id: string;
  status: "SATISFIED" | "PENDING";
  owner: "CENTRAL" | "OPERATOR" | "COORDINATOR" | "DESKTOP_OFFLINE";
  detail: string;
};

export type StripeTestOperatorReadinessEvidencePackReport = {
  version: typeof STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_VERSION;
  environment: typeof STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_ENVIRONMENT;
  verdict: StripeTestOperatorReadinessEvidenceVerdict;
  commerceSotTipSha: string;
  /** Exact nine dimension statuses. */
  dimensions: StripeTestOperatorReadinessDimensionStatus[];
  CONTROL_PLANE_READY: boolean;
  STATE_MACHINE_READY: boolean;
  DRY_RUN_READY: boolean;
  ENV_READINESS_READY: boolean;
  FIXTURE_READY: boolean;
  OPERATOR_PACKET_READY: boolean;
  CREDENTIAL_BOUNDARY_READY: boolean;
  LIVE_MODE_PROTECTION_READY: boolean;
  ROLLBACK_READY: boolean;
  /** YES only when STATE_MACHINE + DRY_RUN + ENV_READINESS code packs PRESENT. */
  B1_B2_CLOSED: "YES" | "NO";
  B1_CLOSED: "YES" | "NO";
  B2_CLOSED: "YES" | "NO";
  allEvidenceDimensionsReady: boolean;
  sotPresence: StripeTestOperatorReadinessSotPresence;
  workspacePresence: StripeTestOperatorReadinessWorkspacePresence;
  MISSING_OPERATOR_INPUTS: StripeTestOperatorReadinessMissingOperatorInput[];
  CENTRAL_DEPENDENCIES: StripeTestOperatorReadinessCentralDependency[];
  TEST_EXECUTION_PREREQUISITES: StripeTestOperatorReadinessTestExecutionPrerequisite[];
  requiredTestConfigurationNames: readonly string[];
  requiredFixtureFields: readonly string[];
  providerGatesOff: boolean;
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGates: "OFF";
  activationPerformed: false;
  stripeActivated: "NO";
  stripeExecutionAuthorized: false;
  note: string;
};

type EnvSource = Record<string, string | undefined>;

const MODULE_DIR = "lib/store/partialRefundProviderMoneyExecution";

const WORKSPACE_MARKERS = {
  controlPlane: "stripeTestControlPlaneHardening.ts",
  stateMachine: "stripeTestActivationStateMachine.ts",
  dryRun: "stripeTestActivationDryRunOrchestration.ts",
  envReadiness: "stripeTestFixtureEnvReadiness.ts",
  fixturePack: "stripeTestFixturePack.ts",
  operatorPacket: "stripeTestExternalPrerequisiteOperatorPacket.ts",
} as const;

/**
 * Verified Commerce SoT tip FULL SHA after remote prune-sync on 2026-08-10.
 * Tip advanced past 26020a2 via Central B1 closeout integrate.
 */
export const STRIPE_TEST_OPERATOR_READINESS_DEFAULT_SOT: StripeTestOperatorReadinessSotPresence =
  {
    commerceSotTipSha:
      "a08f0f0c994f353c263b3efb4d9f4f84a49a5e6b",
    controlPlanePresent: true,
    stateMachinePresent: true,
    dryRunPresent: true,
    envReadinessPresent: false,
    fixturePackPresent: true,
    operatorPacketPresent: true,
  };

export const STRIPE_TEST_OPERATOR_READINESS_DEFAULT_ATTESTATIONS: StripeTestOperatorReadinessOperatorAttestations =
  {
    isolatedTestCredentialsInjected: false,
    testModeConfirmed: false,
    liveCredentialsAbsent: true,
    moneyFixturesAttested: false,
    controlledExecutionGoIssued: false,
  };

/** Prefer B2 tip still outstanding after B1 tree closeout. */
export const STRIPE_TEST_OPERATOR_READINESS_B2_PREFER_TIP =
  "386b382975244b30ca635196e4da80be98d4fddd" as const;

export const STRIPE_TEST_OPERATOR_READINESS_B2_PREFER_BRANCH =
  "office/desktop-a2-stripe-test-fixture-env-readiness-v1" as const;

function resolveSot(
  partial?: Partial<StripeTestOperatorReadinessSotPresence>
): StripeTestOperatorReadinessSotPresence {
  return {
    ...STRIPE_TEST_OPERATOR_READINESS_DEFAULT_SOT,
    ...partial,
  };
}

function resolveAttestations(
  partial?: Partial<StripeTestOperatorReadinessOperatorAttestations>
): StripeTestOperatorReadinessOperatorAttestations {
  return {
    ...STRIPE_TEST_OPERATOR_READINESS_DEFAULT_ATTESTATIONS,
    ...partial,
  };
}

function probeWorkspace(
  workspaceRoot: string
): StripeTestOperatorReadinessWorkspacePresence {
  const dir = path.join(workspaceRoot, MODULE_DIR);
  return {
    controlPlaneModulePresent: existsSync(
      path.join(dir, WORKSPACE_MARKERS.controlPlane)
    ),
    stateMachineModulePresent: existsSync(
      path.join(dir, WORKSPACE_MARKERS.stateMachine)
    ),
    dryRunModulePresent: existsSync(path.join(dir, WORKSPACE_MARKERS.dryRun)),
    envReadinessModulePresent: existsSync(
      path.join(dir, WORKSPACE_MARKERS.envReadiness)
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

function dim(
  dimension: StripeTestOperatorReadinessEvidenceDimension,
  ready: boolean,
  codePackPresent: boolean,
  evidence: string,
  blockedBy: StripeTestOperatorReadinessDimensionStatus["blockedBy"]
): StripeTestOperatorReadinessDimensionStatus {
  return { dimension, ready, codePackPresent, evidence, blockedBy };
}

function buildMissingOperatorInputs(
  attestations: StripeTestOperatorReadinessOperatorAttestations
): StripeTestOperatorReadinessMissingOperatorInput[] {
  const missing: StripeTestOperatorReadinessMissingOperatorInput[] = [];
  if (!attestations.isolatedTestCredentialsInjected) {
    missing.push({
      id: "ISOLATED_TEST_CREDENTIALS",
      category: "CREDENTIALS",
      required: true,
      detail:
        "Place isolated Stripe TEST credentials in local .env.local only (names: STRIPE_MODE, STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_APP_URL). Never commit secrets.",
    });
  }
  if (!attestations.testModeConfirmed) {
    missing.push({
      id: "TEST_MODE_CONFIRMED",
      category: "CREDENTIALS",
      required: true,
      detail:
        "Confirm STRIPE_MODE=test and TEST-only key prefixes on the isolated host (presence/prefix labels only; never echo values).",
    });
  }
  if (!attestations.liveCredentialsAbsent) {
    missing.push({
      id: "LIVE_CREDENTIALS_ABSENT",
      category: "CREDENTIALS",
      required: true,
      detail:
        "Confirm LIVE mode / LIVE key prefixes / production exec ACK are ABSENT before any controlled TEST window.",
    });
  }
  if (!attestations.moneyFixturesAttested) {
    missing.push({
      id: "MONEY_FIXTURES_ATTESTED",
      category: "FIXTURES",
      required: true,
      detail:
        "Attest B4 money fixtures: captured TEST PaymentIntent ready, matching payment/capture facts, committed partial-refund ledger, zero provider-execution rows, isolated Supabase or explicit money-fixture GO. Booleans only in reports.",
    });
  }
  if (!attestations.controlledExecutionGoIssued) {
    missing.push({
      id: "CONTROLLED_EXECUTION_GO",
      category: "EXECUTION_GO",
      required: true,
      detail:
        "Separate coordinator GO required for ONE controlled Stripe TEST execution AFTER all evidence dimensions READY. This pack never issues that GO.",
    });
  }
  missing.push({
    id: "POST_TEST_CLEANUP",
    category: "CLEANUP",
    required: true,
    detail:
      "After any future controlled window: remove/rotate local TEST credentials, keep PROVIDER_GATES=OFF, redact secrets from artifacts, do not retry without a new GO.",
  });
  return missing;
}

function buildCentralDependencies(
  sot: StripeTestOperatorReadinessSotPresence
): StripeTestOperatorReadinessCentralDependency[] {
  const b1Closed = sot.stateMachinePresent && sot.dryRunPresent;
  const b2Closed = sot.envReadinessPresent;
  return [
    {
      blocker: "B1",
      status: b1Closed ? "CLOSED" : "OPEN",
      preferTipFullSha: b1Closed
        ? sot.commerceSotTipSha
        : "f0511c3c34ec29650141cda33a5e758a77e082dc",
      preferBranch: b1Closed
        ? null
        : "office/desktop-a2-stripe-test-activation-dry-run-orchestration-v1",
      detail: b1Closed
        ? "B1 CLOSED on Commerce SoT tip tree (activation SM + dry-run modules PRESENT)."
        : "B1 OPEN — Central must integrate SM + dry-run onto Commerce SoT tip.",
    },
    {
      blocker: "B2",
      status: b2Closed ? "CLOSED" : "OPEN",
      preferTipFullSha: b2Closed
        ? null
        : STRIPE_TEST_OPERATOR_READINESS_B2_PREFER_TIP,
      preferBranch: b2Closed
        ? null
        : STRIPE_TEST_OPERATOR_READINESS_B2_PREFER_BRANCH,
      detail: b2Closed
        ? "B2 CLOSED — stripeTestFixtureEnvReadiness present on Commerce SoT tip."
        : "B2 OPEN — integrate prefer tip 386b382 (office/desktop-a2-stripe-test-fixture-env-readiness-v1) onto Commerce SoT after B1.",
    },
  ];
}

function buildTestExecutionPrerequisites(args: {
  b1Closed: boolean;
  b2Closed: boolean;
  allEvidenceReady: boolean;
  attestations: StripeTestOperatorReadinessOperatorAttestations;
  providerGatesOff: boolean;
}): StripeTestOperatorReadinessTestExecutionPrerequisite[] {
  const { b1Closed, b2Closed, allEvidenceReady, attestations, providerGatesOff } =
    args;
  return [
    {
      order: 1,
      id: "B1_CLOSED_ON_SOT",
      status: b1Closed ? "SATISFIED" : "PENDING",
      owner: "CENTRAL",
      detail: "Activation state machine + dry-run present on Commerce SoT tip.",
    },
    {
      order: 2,
      id: "B2_CLOSED_ON_SOT",
      status: b2Closed ? "SATISFIED" : "PENDING",
      owner: "CENTRAL",
      detail: "Fixture env-readiness pack present on Commerce SoT tip.",
    },
    {
      order: 3,
      id: "OFFLINE_POST_B1_B2_REVALIDATION",
      status: b1Closed && b2Closed ? "SATISFIED" : "PENDING",
      owner: "DESKTOP_OFFLINE",
      detail:
        "Re-run offline dependency-chain / post–B1/B2 revalidation packs with B1_B2_CLOSED=YES (no Stripe calls).",
    },
    {
      order: 4,
      id: "OPERATOR_B3_CREDENTIALS",
      status:
        attestations.isolatedTestCredentialsInjected &&
        attestations.testModeConfirmed &&
        attestations.liveCredentialsAbsent
          ? "SATISFIED"
          : "PENDING",
      owner: "OPERATOR",
      detail:
        "Isolated TEST credentials injected + TEST mode confirmed + LIVE absent (.env.local only).",
    },
    {
      order: 5,
      id: "OPERATOR_B4_MONEY_FIXTURES",
      status: attestations.moneyFixturesAttested ? "SATISFIED" : "PENDING",
      owner: "OPERATOR",
      detail:
        "Money-fixture attestations complete per operator packet REQUIRED_FIXTURE_FIELDS.",
    },
    {
      order: 6,
      id: "ALL_EVIDENCE_DIMENSIONS_READY",
      status: allEvidenceReady ? "SATISFIED" : "PENDING",
      owner: "DESKTOP_OFFLINE",
      detail:
        "Nine operator-readiness evidence dimensions all READY (still offline).",
    },
    {
      order: 7,
      id: "PROVIDER_GATES_REMAIN_OFF",
      status: providerGatesOff ? "SATISFIED" : "PENDING",
      owner: "OPERATOR",
      detail:
        "Provider-money gate env + ACK + execution mode remain OFF until separate GO.",
    },
    {
      order: 8,
      id: "COORDINATOR_CONTROLLED_EXECUTION_GO",
      status: attestations.controlledExecutionGoIssued
        ? "SATISFIED"
        : "PENDING",
      owner: "COORDINATOR",
      detail:
        "Explicit separate GO for ONE controlled Stripe TEST execution. This evidence pack never authorizes execution.",
    },
  ];
}

/**
 * Build offline operator-readiness evidence pack report.
 * Never calls Stripe. Never writes DB. Never merges SoT. Never creates credentials.
 */
export function buildStripeTestOperatorReadinessEvidencePackReport(
  input: StripeTestOperatorReadinessEvidencePackInput = {}
): StripeTestOperatorReadinessEvidencePackReport {
  const env = input.env ?? {};
  const sot = resolveSot(input.sotPresence);
  const attestations = resolveAttestations(input.operatorAttestations);
  const workspaceRoot = input.workspaceRoot ?? process.cwd();
  const workspacePresence = probeWorkspace(workspaceRoot);
  const providerGatesOff = providerGatesAreOff(env);

  const b1Closed = sot.stateMachinePresent && sot.dryRunPresent;
  const b2Closed = sot.envReadinessPresent;
  const B1_CLOSED: "YES" | "NO" = b1Closed ? "YES" : "NO";
  const B2_CLOSED: "YES" | "NO" = b2Closed ? "YES" : "NO";
  const B1_B2_CLOSED: "YES" | "NO" =
    b1Closed && b2Closed ? "YES" : "NO";

  const CONTROL_PLANE_READY = sot.controlPlanePresent;
  const STATE_MACHINE_READY = sot.stateMachinePresent;
  const DRY_RUN_READY = sot.dryRunPresent;
  const ENV_READINESS_READY = sot.envReadinessPresent;
  const FIXTURE_READY =
    sot.fixturePackPresent && attestations.moneyFixturesAttested;
  const OPERATOR_PACKET_READY = sot.operatorPacketPresent;
  const CREDENTIAL_BOUNDARY_READY =
    sot.operatorPacketPresent &&
    attestations.isolatedTestCredentialsInjected &&
    attestations.testModeConfirmed &&
    attestations.liveCredentialsAbsent &&
    providerGatesOff;
  const LIVE_MODE_PROTECTION_READY =
    sot.controlPlanePresent &&
    sot.stateMachinePresent &&
    sot.operatorPacketPresent &&
    attestations.liveCredentialsAbsent &&
    providerGatesOff;
  const ROLLBACK_READY = sot.stateMachinePresent && sot.dryRunPresent;

  const dimensions: StripeTestOperatorReadinessDimensionStatus[] = [
    dim(
      "CONTROL_PLANE_READY",
      CONTROL_PLANE_READY,
      sot.controlPlanePresent,
      CONTROL_PLANE_READY
        ? "stripeTestControlPlaneHardening present on Commerce SoT tip."
        : "Control-plane hardening ABSENT from Commerce SoT tip.",
      CONTROL_PLANE_READY ? "NONE" : "CENTRAL"
    ),
    dim(
      "STATE_MACHINE_READY",
      STATE_MACHINE_READY,
      sot.stateMachinePresent,
      STATE_MACHINE_READY
        ? "stripeTestActivationStateMachine present on Commerce SoT tip (B1)."
        : "Activation state machine ABSENT from Commerce SoT tip.",
      STATE_MACHINE_READY ? "NONE" : "CENTRAL"
    ),
    dim(
      "DRY_RUN_READY",
      DRY_RUN_READY,
      sot.dryRunPresent,
      DRY_RUN_READY
        ? "stripeTestActivationDryRunOrchestration present on Commerce SoT tip (B1)."
        : "Dry-run orchestration ABSENT from Commerce SoT tip.",
      DRY_RUN_READY ? "NONE" : "CENTRAL"
    ),
    dim(
      "ENV_READINESS_READY",
      ENV_READINESS_READY,
      sot.envReadinessPresent,
      ENV_READINESS_READY
        ? "stripeTestFixtureEnvReadiness present on Commerce SoT tip (B2)."
        : "Env-readiness pack ABSENT — Central must integrate B2 tip 386b382.",
      ENV_READINESS_READY ? "NONE" : "CENTRAL"
    ),
    dim(
      "FIXTURE_READY",
      FIXTURE_READY,
      sot.fixturePackPresent,
      FIXTURE_READY
        ? "Fixture code pack present AND operator money fixtures attested."
        : sot.fixturePackPresent
          ? "Fixture code pack present; operator money-fixture attestations still MISSING."
          : "Fixture code pack ABSENT from Commerce SoT tip.",
      FIXTURE_READY
        ? "NONE"
        : sot.fixturePackPresent
          ? "OPERATOR"
          : "COMPOSITE"
    ),
    dim(
      "OPERATOR_PACKET_READY",
      OPERATOR_PACKET_READY,
      sot.operatorPacketPresent,
      OPERATOR_PACKET_READY
        ? "External-prerequisite operator packet present on Commerce SoT tip."
        : "Operator packet ABSENT from Commerce SoT tip.",
      OPERATOR_PACKET_READY ? "NONE" : "CENTRAL"
    ),
    dim(
      "CREDENTIAL_BOUNDARY_READY",
      CREDENTIAL_BOUNDARY_READY,
      sot.operatorPacketPresent,
      CREDENTIAL_BOUNDARY_READY
        ? "Operator packet boundary + isolated TEST credentials + TEST mode + LIVE absent + gates OFF."
        : "Credential boundary incomplete — inject TEST-only credentials locally; keep gates OFF; never commit secrets.",
      CREDENTIAL_BOUNDARY_READY ? "NONE" : "OPERATOR"
    ),
    dim(
      "LIVE_MODE_PROTECTION_READY",
      LIVE_MODE_PROTECTION_READY,
      sot.controlPlanePresent && sot.stateMachinePresent,
      LIVE_MODE_PROTECTION_READY
        ? "LIVE rejection contracts present (control plane + SM + operator packet) and LIVE absent + gates OFF."
        : "LIVE-mode protection incomplete (missing code packs, LIVE present, or gates not OFF).",
      LIVE_MODE_PROTECTION_READY
        ? "NONE"
        : !sot.controlPlanePresent || !sot.stateMachinePresent
          ? "CENTRAL"
          : "HOST_ENV"
    ),
    dim(
      "ROLLBACK_READY",
      ROLLBACK_READY,
      sot.stateMachinePresent && sot.dryRunPresent,
      ROLLBACK_READY
        ? "SM + dry-run expose DEACTIVATE/RESET fail-closed rollback paths (offline proven on tip)."
        : "Rollback paths unavailable until SM + dry-run are on Commerce SoT tip.",
      ROLLBACK_READY ? "NONE" : "CENTRAL"
    ),
  ];

  const allEvidenceDimensionsReady = dimensions.every((d) => d.ready);
  const MISSING_OPERATOR_INPUTS = buildMissingOperatorInputs(attestations);
  const CENTRAL_DEPENDENCIES = buildCentralDependencies(sot);
  const TEST_EXECUTION_PREREQUISITES = buildTestExecutionPrerequisites({
    b1Closed,
    b2Closed,
    allEvidenceReady: allEvidenceDimensionsReady,
    attestations,
    providerGatesOff,
  });

  const verdict: StripeTestOperatorReadinessEvidenceVerdict =
    allEvidenceDimensionsReady && B1_B2_CLOSED === "YES"
      ? "OPERATOR_READINESS_EVIDENCE_COMPLETE_PENDING_EXECUTION_GO"
      : "OPERATOR_READINESS_EVIDENCE_INCOMPLETE_WAITING_CENTRAL_OR_OPERATOR";

  return {
    version: STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_VERSION,
    environment: STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_ENVIRONMENT,
    verdict,
    commerceSotTipSha: sot.commerceSotTipSha,
    dimensions,
    CONTROL_PLANE_READY,
    STATE_MACHINE_READY,
    DRY_RUN_READY,
    ENV_READINESS_READY,
    FIXTURE_READY,
    OPERATOR_PACKET_READY,
    CREDENTIAL_BOUNDARY_READY,
    LIVE_MODE_PROTECTION_READY,
    ROLLBACK_READY,
    B1_B2_CLOSED,
    B1_CLOSED,
    B2_CLOSED,
    allEvidenceDimensionsReady,
    sotPresence: sot,
    workspacePresence,
    MISSING_OPERATOR_INPUTS,
    CENTRAL_DEPENDENCIES,
    TEST_EXECUTION_PREREQUISITES,
    requiredTestConfigurationNames: [...REQUIRED_TEST_CONFIGURATION_NAMES],
    requiredFixtureFields: [...REQUIRED_FIXTURE_FIELDS],
    providerGatesOff,
    networkStripeCalls: 0,
    moneyMovement: 0,
    productionDbWrites: 0,
    providerGates: "OFF",
    activationPerformed: false,
    stripeActivated: "NO",
    stripeExecutionAuthorized: false,
    note:
      B1_B2_CLOSED === "YES" && allEvidenceDimensionsReady
        ? "All nine evidence dimensions READY and B1∧B2 closed. Still PENDING separate coordinator controlled-execution GO. This pack does not authorize Stripe execution."
        : "Evidence incomplete: Central and/or operator inputs still outstanding. Do not execute Stripe. Re-run after B2 integrate + operator B3/B4 clearance.",
  };
}

export function isStripeTestOperatorReadinessEvidenceComplete(
  input: StripeTestOperatorReadinessEvidencePackInput = {}
): boolean {
  const report = buildStripeTestOperatorReadinessEvidencePackReport(input);
  return (
    report.verdict ===
      "OPERATOR_READINESS_EVIDENCE_COMPLETE_PENDING_EXECUTION_GO" &&
    report.allEvidenceDimensionsReady &&
    report.B1_B2_CLOSED === "YES"
  );
}

export function getStripeTestOperatorReadinessDimensionFlags(
  input: StripeTestOperatorReadinessEvidencePackInput = {}
): Record<StripeTestOperatorReadinessEvidenceDimension, boolean> {
  const report = buildStripeTestOperatorReadinessEvidencePackReport(input);
  return {
    CONTROL_PLANE_READY: report.CONTROL_PLANE_READY,
    STATE_MACHINE_READY: report.STATE_MACHINE_READY,
    DRY_RUN_READY: report.DRY_RUN_READY,
    ENV_READINESS_READY: report.ENV_READINESS_READY,
    FIXTURE_READY: report.FIXTURE_READY,
    OPERATOR_PACKET_READY: report.OPERATOR_PACKET_READY,
    CREDENTIAL_BOUNDARY_READY: report.CREDENTIAL_BOUNDARY_READY,
    LIVE_MODE_PROTECTION_READY: report.LIVE_MODE_PROTECTION_READY,
    ROLLBACK_READY: report.ROLLBACK_READY,
  };
}
