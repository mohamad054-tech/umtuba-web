/**
 * Stripe TEST operator readiness evidence pack — focused acceptance tests.
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / STRIPE_ACTIVATED=NO /
 * PROVIDER_GATES=OFF. No network. No secret echo. No SoT merge. No execution.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
} from "./index";
import {
  STRIPE_TEST_OPERATOR_READINESS_B2_PREFER_BRANCH,
  STRIPE_TEST_OPERATOR_READINESS_B2_PREFER_TIP,
  STRIPE_TEST_OPERATOR_READINESS_DEFAULT_SOT,
  STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_DIMENSIONS,
  STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_ACTIVATION_PERFORMED,
  STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_ENVIRONMENT,
  STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_EXECUTION_AUTHORIZED,
  STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_PROVIDER_EXECUTION_ENTRYPOINTS,
  STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_VERSION,
  STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_VERDICTS,
  buildStripeTestOperatorReadinessEvidencePackReport,
  getStripeTestOperatorReadinessDimensionFlags,
  isStripeTestOperatorReadinessEvidenceComplete,
} from "./stripeTestOperatorReadinessEvidencePack";

const PACK_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestOperatorReadinessEvidencePack.ts"
);

const MODULE_DIR = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution"
);

/** Distinct fake TEST credentials — must never appear in pack outputs. */
const FAKE_TEST_SECRET = "sk_test_OPREADY_HOST_FAKE_SECRET_9m2q";
const FAKE_TEST_PUBLISHABLE = "pk_test_OPREADY_HOST_FAKE_PUBLISHABLE_9m2q";
const FAKE_WEBHOOK = "whsec_OPREADY_HOST_FAKE_WEBHOOK_9m2q";
const FAKE_LIVE_SECRET = "sk_live_OPREADY_HOST_FAKE_LIVE_SECRET_9m2q";
const FAKE_LIVE_PUBLISHABLE = "pk_live_OPREADY_HOST_FAKE_PUBLISHABLE_9m2q";

const FORBIDDEN = [
  FAKE_TEST_SECRET,
  FAKE_TEST_PUBLISHABLE,
  FAKE_WEBHOOK,
  FAKE_LIVE_SECRET,
  FAKE_LIVE_PUBLISHABLE,
];

function assertNoSecretEcho(payload: unknown): void {
  const blob = JSON.stringify(payload);
  for (const s of FORBIDDEN) {
    expect(blob).not.toContain(s);
  }
  expect(blob).not.toContain("sk_test_");
  expect(blob).not.toContain("pk_test_");
  expect(blob).not.toContain("sk_live_");
  expect(blob).not.toContain("pk_live_");
  expect(blob).not.toContain("whsec_");
}

function assertOfflineCounters(payload: {
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGates: "OFF";
  activationPerformed: false;
  stripeExecutionAuthorized: false;
}): void {
  expect(payload.networkStripeCalls).toBe(0);
  expect(payload.moneyMovement).toBe(0);
  expect(payload.productionDbWrites).toBe(0);
  expect(payload.providerGates).toBe("OFF");
  expect(payload.activationPerformed).toBe(false);
  expect(payload.stripeExecutionAuthorized).toBe(false);
}

function allSotClosed() {
  return {
    commerceSotTipSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    controlPlanePresent: true,
    stateMachinePresent: true,
    dryRunPresent: true,
    envReadinessPresent: true,
    fixturePackPresent: true,
    operatorPacketPresent: true,
  };
}

function allOperatorCleared() {
  return {
    isolatedTestCredentialsInjected: true,
    testModeConfirmed: true,
    liveCredentialsAbsent: true,
    moneyFixturesAttested: true,
    controlledExecutionGoIssued: false,
  };
}

describe("stripe TEST operator readiness evidence pack — structural", () => {
  it("exposes version/environment and zero activation capabilities", () => {
    expect(STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_VERSION).toBe(
      "commerce-stripe-operator-readiness-evidence-pack-v1"
    );
    expect(
      STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_ENVIRONMENT
    ).toContain("not_production");
    expect(
      STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_ACTIVATION_PERFORMED
    ).toBe(false);
    expect(
      STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_PROVIDER_EXECUTION_ENTRYPOINTS
    ).toEqual([]);
    expect(
      STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_PACK_EXECUTION_AUTHORIZED
    ).toBe(false);
    expect([...STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_DIMENSIONS]).toEqual([
      "CONTROL_PLANE_READY",
      "STATE_MACHINE_READY",
      "DRY_RUN_READY",
      "ENV_READINESS_READY",
      "FIXTURE_READY",
      "OPERATOR_PACKET_READY",
      "CREDENTIAL_BOUNDARY_READY",
      "LIVE_MODE_PROTECTION_READY",
      "ROLLBACK_READY",
    ]);
    expect([...STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_VERDICTS]).toEqual([
      "OPERATOR_READINESS_EVIDENCE_COMPLETE_PENDING_EXECUTION_GO",
      "OPERATOR_READINESS_EVIDENCE_INCOMPLETE_WAITING_CENTRAL_OR_OPERATOR",
    ]);
    expect(STRIPE_TEST_OPERATOR_READINESS_DEFAULT_SOT.commerceSotTipSha).toBe(
      "a08f0f0c994f353c263b3efb4d9f4f84a49a5e6b"
    );
    expect(STRIPE_TEST_OPERATOR_READINESS_B2_PREFER_TIP).toBe(
      "386b382975244b30ca635196e4da80be98d4fddd"
    );
    expect(STRIPE_TEST_OPERATOR_READINESS_B2_PREFER_BRANCH).toBe(
      "office/desktop-a2-stripe-test-fixture-env-readiness-v1"
    );
  });

  it("source forbids stripe/network/credential-creation side effects", () => {
    const src = readFileSync(PACK_SOURCE, "utf8");
    expect(src).not.toMatch(/stripe\.com/i);
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/createCredential/i);
    expect(src).toContain("STRIPE_CALLS=0");
    expect(src).toContain("MONEY_MOVEMENT=0");
    expect(src).toContain("DB_WRITES=0");
  });
});

describe("stripe TEST operator readiness evidence pack — tip defaults", () => {
  it("defaults encode B1 closed / B2 open on verified tip a08f0f0", () => {
    const report = buildStripeTestOperatorReadinessEvidencePackReport();
    assertOfflineCounters(report);
    assertNoSecretEcho(report);

    expect(report.commerceSotTipSha).toBe(
      "a08f0f0c994f353c263b3efb4d9f4f84a49a5e6b"
    );
    expect(report.B1_CLOSED).toBe("YES");
    expect(report.B2_CLOSED).toBe("NO");
    expect(report.B1_B2_CLOSED).toBe("NO");
    expect(report.CONTROL_PLANE_READY).toBe(true);
    expect(report.STATE_MACHINE_READY).toBe(true);
    expect(report.DRY_RUN_READY).toBe(true);
    expect(report.ENV_READINESS_READY).toBe(false);
    expect(report.FIXTURE_READY).toBe(false);
    expect(report.OPERATOR_PACKET_READY).toBe(true);
    expect(report.CREDENTIAL_BOUNDARY_READY).toBe(false);
    expect(report.LIVE_MODE_PROTECTION_READY).toBe(true);
    expect(report.ROLLBACK_READY).toBe(true);
    expect(report.verdict).toBe(
      "OPERATOR_READINESS_EVIDENCE_INCOMPLETE_WAITING_CENTRAL_OR_OPERATOR"
    );
    expect(isStripeTestOperatorReadinessEvidenceComplete()).toBe(false);

    expect(report.workspacePresence.stateMachineModulePresent).toBe(
      existsSync(path.join(MODULE_DIR, "stripeTestActivationStateMachine.ts"))
    );
    expect(report.workspacePresence.dryRunModulePresent).toBe(
      existsSync(
        path.join(MODULE_DIR, "stripeTestActivationDryRunOrchestration.ts")
      )
    );
    expect(report.workspacePresence.envReadinessModulePresent).toBe(
      existsSync(path.join(MODULE_DIR, "stripeTestFixtureEnvReadiness.ts"))
    );
  });

  it("emits MISSING_OPERATOR_INPUTS / CENTRAL_DEPENDENCIES / TEST_EXECUTION_PREREQUISITES", () => {
    const report = buildStripeTestOperatorReadinessEvidencePackReport({
      env: {
        STRIPE_MODE: "test",
        STRIPE_SECRET_KEY: FAKE_TEST_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_TEST_PUBLISHABLE,
        STRIPE_WEBHOOK_SECRET: FAKE_WEBHOOK,
      },
    });
    assertNoSecretEcho(report);
    assertOfflineCounters(report);

    const missingIds = report.MISSING_OPERATOR_INPUTS.map((m) => m.id);
    expect(missingIds).toContain("ISOLATED_TEST_CREDENTIALS");
    expect(missingIds).toContain("TEST_MODE_CONFIRMED");
    expect(missingIds).toContain("MONEY_FIXTURES_ATTESTED");
    expect(missingIds).toContain("CONTROLLED_EXECUTION_GO");
    expect(missingIds).toContain("POST_TEST_CLEANUP");

    const b2 = report.CENTRAL_DEPENDENCIES.find((d) => d.blocker === "B2");
    expect(b2?.status).toBe("OPEN");
    expect(b2?.preferTipFullSha).toBe(
      STRIPE_TEST_OPERATOR_READINESS_B2_PREFER_TIP
    );
    const b1 = report.CENTRAL_DEPENDENCIES.find((d) => d.blocker === "B1");
    expect(b1?.status).toBe("CLOSED");

    const prereq = report.TEST_EXECUTION_PREREQUISITES;
    expect(prereq.find((p) => p.id === "B1_CLOSED_ON_SOT")?.status).toBe(
      "SATISFIED"
    );
    expect(prereq.find((p) => p.id === "B2_CLOSED_ON_SOT")?.status).toBe(
      "PENDING"
    );
    expect(
      prereq.find((p) => p.id === "COORDINATOR_CONTROLLED_EXECUTION_GO")?.status
    ).toBe("PENDING");
    expect(report.providerGatesOff).toBe(true);
  });
});

describe("stripe TEST operator readiness evidence pack — closed-path + fail-closed", () => {
  it("marks evidence complete only when B1∧B2 closed and all dimensions READY", () => {
    const report = buildStripeTestOperatorReadinessEvidencePackReport({
      sotPresence: allSotClosed(),
      operatorAttestations: allOperatorCleared(),
    });
    assertOfflineCounters(report);
    assertNoSecretEcho(report);
    expect(report.B1_B2_CLOSED).toBe("YES");
    expect(report.allEvidenceDimensionsReady).toBe(true);
    expect(report.verdict).toBe(
      "OPERATOR_READINESS_EVIDENCE_COMPLETE_PENDING_EXECUTION_GO"
    );
    expect(
      isStripeTestOperatorReadinessEvidenceComplete({
        sotPresence: allSotClosed(),
        operatorAttestations: allOperatorCleared(),
      })
    ).toBe(true);
    expect(report.stripeExecutionAuthorized).toBe(false);
    expect(report.MISSING_OPERATOR_INPUTS.map((m) => m.id)).toContain(
      "CONTROLLED_EXECUTION_GO"
    );
    expect(report.MISSING_OPERATOR_INPUTS.map((m) => m.id)).toContain(
      "POST_TEST_CLEANUP"
    );

    const flags = getStripeTestOperatorReadinessDimensionFlags({
      sotPresence: allSotClosed(),
      operatorAttestations: allOperatorCleared(),
    });
    for (const key of STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_DIMENSIONS) {
      expect(flags[key]).toBe(true);
    }
  });

  it("fails closed when provider gates are enabled", () => {
    const report = buildStripeTestOperatorReadinessEvidencePackReport({
      sotPresence: allSotClosed(),
      operatorAttestations: allOperatorCleared(),
      env: {
        [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "1",
        [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]: "ACK",
        [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "provider",
        [PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]: "PROD",
      },
    });
    assertNoSecretEcho(report);
    expect(report.providerGatesOff).toBe(false);
    expect(report.CREDENTIAL_BOUNDARY_READY).toBe(false);
    expect(report.LIVE_MODE_PROTECTION_READY).toBe(false);
    expect(report.verdict).toBe(
      "OPERATOR_READINESS_EVIDENCE_INCOMPLETE_WAITING_CENTRAL_OR_OPERATOR"
    );
    expect(
      report.TEST_EXECUTION_PREREQUISITES.find(
        (p) => p.id === "PROVIDER_GATES_REMAIN_OFF"
      )?.status
    ).toBe("PENDING");
  });

  it("nine dimensions always present in report", () => {
    const report = buildStripeTestOperatorReadinessEvidencePackReport();
    expect(report.dimensions).toHaveLength(9);
    expect(report.dimensions.map((d) => d.dimension)).toEqual([
      ...STRIPE_TEST_OPERATOR_READINESS_EVIDENCE_DIMENSIONS,
    ]);
  });
});
