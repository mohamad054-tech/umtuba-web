/**
 * Stripe TEST dependency-chain INTEGRATION PROOF — focused acceptance tests.
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / STRIPE_ACTIVATED=NO /
 * PROVIDER_GATES=OFF. No network. No secret echo. No SoT merge.
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
  STRIPE_TEST_DEPENDENCY_CHAIN_CAPABILITY_KEYS,
  STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT,
  STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_ACTIVATION_PERFORMED,
  STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_ENVIRONMENT,
  STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_PROVIDER_EXECUTION_ENTRYPOINTS,
  STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_VERDICTS,
  STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_VERSION,
  STRIPE_TEST_DEPENDENCY_CHAIN_MISSING_DEPS_CATALOG,
  STRIPE_TEST_DEPENDENCY_CHAIN_NEXT_PRECHECK_BOUNDARY_ID,
  STRIPE_TEST_DEPENDENCY_CHAIN_ORDER,
  buildStripeTestDependencyChainIntegrationProofReport,
  getStripeTestDependencyChainCapabilityFlags,
  isStripeTestDependencyChainB1B2Closed,
} from "./stripeTestDependencyChainIntegrationProof";

const PROOF_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestDependencyChainIntegrationProof.ts"
);

const MODULE_DIR = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution"
);

/** Distinct fake TEST credentials — must never appear in proof outputs. */
const FAKE_TEST_SECRET = "sk_test_DEPCHAIN_HOST_FAKE_SECRET_4k8n";
const FAKE_TEST_PUBLISHABLE = "pk_test_DEPCHAIN_HOST_FAKE_PUBLISHABLE_4k8n";
const FAKE_WEBHOOK = "whsec_DEPCHAIN_HOST_FAKE_WEBHOOK_4k8n";
const FAKE_LIVE_SECRET = "sk_live_DEPCHAIN_HOST_FAKE_LIVE_SECRET_4k8n";
const FAKE_LIVE_PUBLISHABLE = "pk_live_DEPCHAIN_HOST_FAKE_PUBLISHABLE_4k8n";

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
}): void {
  expect(payload.networkStripeCalls).toBe(0);
  expect(payload.moneyMovement).toBe(0);
  expect(payload.productionDbWrites).toBe(0);
  expect(payload.providerGates).toBe("OFF");
  expect(payload.activationPerformed).toBe(false);
}

function allSotPresent() {
  return {
    commerceSotTipSha: "ffffffffffffffffffffffffffffffffffffffff",
    STATE_MACHINE_PRESENT: true,
    DRY_RUN_PRESENT: true,
    ENV_READINESS_PRESENT: true,
    CONTROL_PLANE_PRESENT: true,
    FIXTURE_PACK_PRESENT: true,
    OPERATOR_PACKET_PRESENT: true,
  };
}

describe("stripe TEST dependency-chain integration proof — structural", () => {
  it("exposes version/environment and zero activation capabilities", () => {
    expect(STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_VERSION).toBe(
      "commerce-stripe-test-dependency-chain-integration-proof-v1"
    );
    expect(
      STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_ENVIRONMENT
    ).toContain("not_production");
    expect(
      STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_ACTIVATION_PERFORMED
    ).toBe(false);
    expect(
      STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_PROVIDER_EXECUTION_ENTRYPOINTS
    ).toEqual([]);
    expect([
      ...STRIPE_TEST_DEPENDENCY_CHAIN_INTEGRATION_PROOF_VERDICTS,
    ]).toEqual([
      "B1_B2_CLOSED_NEXT_PRECHECK_BOUNDARY_READY",
      "B1_B2_OPEN_WAITING_CENTRAL_INTEGRATION",
    ]);
    expect([...STRIPE_TEST_DEPENDENCY_CHAIN_CAPABILITY_KEYS]).toEqual([
      "STATE_MACHINE_PRESENT",
      "DRY_RUN_PRESENT",
      "ENV_READINESS_PRESENT",
      "CONTROL_PLANE_PRESENT",
      "FIXTURE_PACK_PRESENT",
      "OPERATOR_PACKET_PRESENT",
    ]);
    expect(STRIPE_TEST_DEPENDENCY_CHAIN_NEXT_PRECHECK_BOUNDARY_ID).toBe(
      "COMMERCE_STRIPE_TEST_POST_B1_B2_INTEGRATION_PRECHECK_AND_OPERATOR_GATE_V1"
    );
  });

  it("source contains no Stripe network / fetch / axios / merge", () => {
    const src = readFileSync(PROOF_SOURCE, "utf8");
    expect(src).not.toMatch(/(?<![\w-])fetch\s*\(/);
    expect(src).not.toMatch(/\baxios\b/);
    expect(src).not.toMatch(/stripe\.com/i);
    expect(src).not.toMatch(/new\s+Stripe\b/);
    expect(src).not.toMatch(/\bgit\s+merge\b/);
    expect(src).toContain("THIS MODULE DOES NOT");
    expect(src).toContain("integrate / merge packs onto Commerce SoT");
  });

  it("defaults encode verified Commerce SoT tip integration gaps", () => {
    expect(
      STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT.commerceSotTipSha
    ).toBe("26020a2692235d72d491ae1ae6984dc4574eb185");
    expect(STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT.STATE_MACHINE_PRESENT).toBe(
      false
    );
    expect(STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT.DRY_RUN_PRESENT).toBe(
      false
    );
    expect(STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT.ENV_READINESS_PRESENT).toBe(
      false
    );
    expect(STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT.CONTROL_PLANE_PRESENT).toBe(
      true
    );
    expect(STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT.FIXTURE_PACK_PRESENT).toBe(
      true
    );
    expect(
      STRIPE_TEST_DEPENDENCY_CHAIN_DEFAULT_SOT.OPERATOR_PACKET_PRESENT
    ).toBe(true);
  });
});

describe("stripe TEST dependency-chain integration proof — current tip defaults", () => {
  it("returns exact PRESENT flags and B1_B2_CLOSED=NO with missing deps", () => {
    const report = buildStripeTestDependencyChainIntegrationProofReport({
      env: {},
    });

    expect(report.STATE_MACHINE_PRESENT).toBe(false);
    expect(report.DRY_RUN_PRESENT).toBe(false);
    expect(report.ENV_READINESS_PRESENT).toBe(false);
    expect(report.CONTROL_PLANE_PRESENT).toBe(true);
    expect(report.FIXTURE_PACK_PRESENT).toBe(true);
    expect(report.OPERATOR_PACKET_PRESENT).toBe(true);

    expect(report.B1_PRESENT).toBe(false);
    expect(report.B2_PRESENT).toBe(false);
    expect(report.B1_B2_CLOSED).toBe("NO");
    expect(isStripeTestDependencyChainB1B2Closed({ env: {} })).toBe(false);
    expect(report.verdict).toBe("B1_B2_OPEN_WAITING_CENTRAL_INTEGRATION");

    expect(report.missingDeps.map((d) => d.commitShortSha)).toEqual([
      "03b45a1",
      "1ad060c",
      "f0511c3",
      "06a015e",
      "386b382",
    ]);
    expect(report.missingDeps[2]?.branch).toBe(
      "office/desktop-a2-stripe-test-activation-dry-run-orchestration-v1"
    );
    expect(report.missingDeps[4]?.branch).toBe(
      "office/desktop-a2-stripe-test-fixture-env-readiness-v1"
    );
    expect(report.dependencyOrder).toEqual([
      ...STRIPE_TEST_DEPENDENCY_CHAIN_ORDER,
    ]);
    expect(report.nextPrecheckBoundary.ready).toBe(false);
    expect(report.nextPrecheckBoundary.boundaryId).toBe(
      STRIPE_TEST_DEPENDENCY_CHAIN_NEXT_PRECHECK_BOUNDARY_ID
    );
    expect(report.providerGatesOff).toBe(true);
    assertOfflineCounters(report);
    assertNoSecretEcho(report);
  });

  it("workspace probe matches tip filesystem (SM/dry-run/env absent; CP/fixture/packet present)", () => {
    const report = buildStripeTestDependencyChainIntegrationProofReport({
      env: {},
    });
    expect(existsSync(path.join(MODULE_DIR, "stripeTestControlPlaneHardening.ts"))).toBe(
      true
    );
    expect(existsSync(path.join(MODULE_DIR, "stripeTestFixturePack.ts"))).toBe(
      true
    );
    expect(
      existsSync(
        path.join(MODULE_DIR, "stripeTestExternalPrerequisiteOperatorPacket.ts")
      )
    ).toBe(true);
    expect(
      existsSync(path.join(MODULE_DIR, "stripeTestActivationStateMachine.ts"))
    ).toBe(false);
    expect(
      existsSync(
        path.join(MODULE_DIR, "stripeTestActivationDryRunOrchestration.ts")
      )
    ).toBe(false);
    expect(
      existsSync(path.join(MODULE_DIR, "stripeTestFixtureEnvReadiness.ts"))
    ).toBe(false);

    expect(report.workspacePresence.controlPlaneModulePresent).toBe(true);
    expect(report.workspacePresence.fixturePackModulePresent).toBe(true);
    expect(report.workspacePresence.operatorPacketModulePresent).toBe(true);
    expect(report.workspacePresence.stateMachineModulePresent).toBe(false);
    expect(report.workspacePresence.dryRunModulePresent).toBe(false);
    expect(report.workspacePresence.envReadinessModulePresent).toBe(false);
  });

  it("capability helper returns exact six flags", () => {
    const flags = getStripeTestDependencyChainCapabilityFlags({ env: {} });
    expect(flags).toEqual({
      STATE_MACHINE_PRESENT: false,
      DRY_RUN_PRESENT: false,
      ENV_READINESS_PRESENT: false,
      CONTROL_PLANE_PRESENT: true,
      FIXTURE_PACK_PRESENT: true,
      OPERATOR_PACKET_PRESENT: true,
    });
  });
});

describe("stripe TEST dependency-chain integration proof — closed path + gates", () => {
  it("returns B1_B2_CLOSED=YES and prepares next precheck boundary when all packs present", () => {
    const report = buildStripeTestDependencyChainIntegrationProofReport({
      env: {},
      sotIntegration: allSotPresent(),
    });
    expect(report.B1_B2_CLOSED).toBe("YES");
    expect(report.B1_PRESENT).toBe(true);
    expect(report.B2_PRESENT).toBe(true);
    expect(report.verdict).toBe("B1_B2_CLOSED_NEXT_PRECHECK_BOUNDARY_READY");
    expect(report.missingDeps).toEqual([]);
    expect(report.nextPrecheckBoundary.ready).toBe(true);
    expect(report.nextPrecheckBoundary.blockedReason).toBeNull();
    expect(report.nextPrecheckBoundary.requiredBeforeBoundary.length).toBeGreaterThan(
      0
    );
    expect(isStripeTestDependencyChainB1B2Closed({
      env: {},
      sotIntegration: allSotPresent(),
    })).toBe(true);
    assertOfflineCounters(report);
  });

  it("keeps B1 open when only env-readiness is present", () => {
    const report = buildStripeTestDependencyChainIntegrationProofReport({
      env: {},
      sotIntegration: {
        ENV_READINESS_PRESENT: true,
      },
    });
    expect(report.B2_PRESENT).toBe(true);
    expect(report.B1_PRESENT).toBe(false);
    expect(report.B1_B2_CLOSED).toBe("NO");
    expect(report.missingDeps.every((d) => d.blocker === "B1")).toBe(true);
    expect(report.missingDeps.map((d) => d.commitShortSha)).toEqual([
      "03b45a1",
      "1ad060c",
      "f0511c3",
    ]);
  });

  it("flags provider gates not off when gate/mode envs are set", () => {
    const report = buildStripeTestDependencyChainIntegrationProofReport({
      env: {
        [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "1",
        [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]: "ack",
        [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "test",
        [PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]: "ack",
        STRIPE_SECRET_KEY: FAKE_TEST_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_TEST_PUBLISHABLE,
        STRIPE_WEBHOOK_SECRET: FAKE_WEBHOOK,
        STRIPE_MODE: "test",
      },
    });
    expect(report.providerGatesOff).toBe(false);
    expect(report.providerGates).toBe("OFF");
    assertNoSecretEcho(report);
  });
});

describe("stripe TEST dependency-chain integration proof — catalog integrity", () => {
  it("catalog dependencyOrder is strictly increasing 1..5", () => {
    const orders = STRIPE_TEST_DEPENDENCY_CHAIN_MISSING_DEPS_CATALOG.map(
      (d) => d.dependencyOrder
    );
    expect(orders).toEqual([1, 2, 3, 4, 5]);
    expect(STRIPE_TEST_DEPENDENCY_CHAIN_ORDER.length).toBe(4);
  });
});
