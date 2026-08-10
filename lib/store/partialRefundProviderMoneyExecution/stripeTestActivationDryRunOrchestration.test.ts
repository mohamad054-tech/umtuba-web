/**
 * Stripe TEST activation DRY-RUN orchestration — focused acceptance tests.
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / STRIPE_ACTIVATED=NO /
 * PROVIDER_GATES=OFF. No network. No secret echo. No real activation.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STRIPE_TEST_ACTIVATION_DRY_RUN_ACTIVATION_PERFORMED,
  STRIPE_TEST_ACTIVATION_DRY_RUN_ENVIRONMENT,
  STRIPE_TEST_ACTIVATION_DRY_RUN_ORCHESTRATION_VERSION,
  STRIPE_TEST_ACTIVATION_DRY_RUN_PHASES,
  STRIPE_TEST_ACTIVATION_DRY_RUN_PROVIDER_EXECUTION_ENTRYPOINTS,
  buildStripeTestActivationDryRunReport,
  isStripeTestActivationDryRunReady,
  runStripeTestActivationDryRunHappyPath,
  verifyStripeTestActivationDryRunGuards,
} from "./stripeTestActivationDryRunOrchestration";

const DRY_RUN_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestActivationDryRunOrchestration.ts"
);

/** Distinct fake TEST credentials — must never appear in dry-run outputs. */
const FAKE_TEST_SECRET = "sk_test_DRY_RUN_FAKE_SECRET_VALUE_9q2w";
const FAKE_TEST_PUBLISHABLE =
  "pk_test_DRY_RUN_FAKE_PUBLISHABLE_VALUE_9q2w";
const FAKE_WEBHOOK = "whsec_DRY_RUN_FAKE_WEBHOOK_VALUE_9q2w";
const FAKE_LIVE_SECRET = "sk_live_DRY_RUN_FAKE_LIVE_SECRET_VALUE_9q2w";
const FAKE_LIVE_PUBLISHABLE =
  "pk_live_DRY_RUN_FAKE_PUBLISHABLE_VALUE_9q2w";

const FORBIDDEN = [
  FAKE_TEST_SECRET,
  FAKE_TEST_PUBLISHABLE,
  FAKE_WEBHOOK,
  FAKE_LIVE_SECRET,
  FAKE_LIVE_PUBLISHABLE,
];

function readyEnv(
  extra: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: FAKE_TEST_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_TEST_PUBLISHABLE,
    STRIPE_WEBHOOK_SECRET: FAKE_WEBHOOK,
    NEXT_PUBLIC_APP_URL: "https://example.test",
    ...extra,
  };
}

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

describe("stripe TEST activation dry-run — structural non-capabilities", () => {
  it("exposes version/environment and zero activation capabilities", () => {
    expect(STRIPE_TEST_ACTIVATION_DRY_RUN_ORCHESTRATION_VERSION).toBe(
      "commerce-stripe-test-activation-dry-run-orchestration-v1"
    );
    expect(STRIPE_TEST_ACTIVATION_DRY_RUN_ENVIRONMENT).toContain(
      "not_production"
    );
    expect(STRIPE_TEST_ACTIVATION_DRY_RUN_ACTIVATION_PERFORMED).toBe(false);
    expect(STRIPE_TEST_ACTIVATION_DRY_RUN_PROVIDER_EXECUTION_ENTRYPOINTS).toEqual(
      []
    );
    expect([...STRIPE_TEST_ACTIVATION_DRY_RUN_PHASES]).toEqual([
      "PRECHECK",
      "READY_FOR_TEST",
      "ACTIVATION_REQUEST",
      "ACTIVATION_VALIDATION",
      "TEST_ACTIVE_EXPECTED",
      "DEACTIVATION",
      "CLEANUP",
    ]);
  });

  it("source contains no Stripe network / fetch / axios calls", () => {
    const src = readFileSync(DRY_RUN_SOURCE, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/\baxios\b/);
    expect(src).not.toMatch(/stripe\.com/i);
    expect(src).not.toMatch(/new\s+Stripe\b/);
    expect(src).toContain("THIS MODULE DOES NOT ACTIVATE STRIPE");
  });
});

describe("stripe TEST activation dry-run — happy path phases", () => {
  it("walks PRECHECK → … → CLEANUP with expected SM states", () => {
    const { phases, finalState, passed } =
      runStripeTestActivationDryRunHappyPath(readyEnv());

    expect(passed).toBe(true);
    expect(finalState).toBe("DISABLED");
    expect(phases.map((p) => p.phase)).toEqual([
      ...STRIPE_TEST_ACTIVATION_DRY_RUN_PHASES,
    ]);

    const byPhase = Object.fromEntries(phases.map((p) => [p.phase, p]));
    expect(byPhase.PRECHECK.expectedState).toBe("READY_FOR_TEST");
    expect(byPhase.PRECHECK.actualState).toBe("READY_FOR_TEST");
    expect(byPhase.PRECHECK.passed).toBe(true);
    expect(byPhase.PRECHECK.blockingReasons).toEqual([]);
    expect(byPhase.PRECHECK.stopCondition.length).toBeGreaterThan(0);
    expect(byPhase.PRECHECK.rollbackAction.length).toBeGreaterThan(0);

    expect(byPhase.READY_FOR_TEST.actualState).toBe("READY_FOR_TEST");
    expect(byPhase.ACTIVATION_REQUEST.actualState).toBe("TEST_ACTIVATING");
    expect(byPhase.ACTIVATION_VALIDATION.actualState).toBe("TEST_ACTIVATING");
    expect(byPhase.ACTIVATION_VALIDATION.evidence.idempotent).toBe(true);
    expect(byPhase.TEST_ACTIVE_EXPECTED.actualState).toBe("TEST_ACTIVE");
    expect(byPhase.DEACTIVATION.actualState).toBe("TEST_DEACTIVATED");
    expect(byPhase.CLEANUP.actualState).toBe("DISABLED");

    for (const phase of phases) {
      assertOfflineCounters(phase.evidence);
      expect(phase.inputs.envKeysPresent).toContain("STRIPE_MODE");
      expect(phase.inputs.envKeysPresent).toContain("STRIPE_SECRET_KEY");
      // names only — never values
      expect(phase.inputs.envKeysPresent.every((k) => !k.includes("sk_"))).toBe(
        true
      );
    }
    assertNoSecretEcho(phases);
  });

  it("records phase fields required by orchestration contract", () => {
    const { phases } = runStripeTestActivationDryRunHappyPath(readyEnv());
    for (const phase of phases) {
      expect(phase).toHaveProperty("inputs");
      expect(phase).toHaveProperty("expectedState");
      expect(phase).toHaveProperty("blockingReasons");
      expect(phase).toHaveProperty("evidence");
      expect(phase).toHaveProperty("stopCondition");
      expect(phase).toHaveProperty("rollbackAction");
    }
  });
});

describe("stripe TEST activation dry-run — verification matrix", () => {
  it("proves all required guard verifications", () => {
    const verifications = verifyStripeTestActivationDryRunGuards({
      readySource: readyEnv(),
      missingCredentialSource: {
        STRIPE_MODE: "test",
        STRIPE_SECRET_KEY: FAKE_TEST_SECRET,
        // missing publishable / webhook / app url
      },
      liveSource: readyEnv({
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
      }),
      invalidPrecheckSource: readyEnv({
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
      }),
      forbiddenSecretValues: FORBIDDEN,
    });

    expect(verifications.invalidPrecheckBlocksActivation).toBe(true);
    expect(verifications.missingCredentialBlocksActivation).toBe(true);
    expect(verifications.liveModeBlocksTestActivation).toBe(true);
    expect(verifications.invalidFixtureBlocksActivation).toBe(true);
    expect(verifications.repeatedActivationDeterministic).toBe(true);
    expect(verifications.failedTransitionFailClosed).toBe(true);
    expect(verifications.deactivationPathDeterministic).toBe(true);
    expect(verifications.noSecretValuesAppear).toBe(true);
    expect(verifications.noNetworkProviderAction).toBe(true);
    assertNoSecretEcho(verifications);
  });
});

describe("stripe TEST activation dry-run — full report", () => {
  it("builds ready report with WAITING_FOR_STATE_MACHINE_INTEGRATION flag", () => {
    const report = buildStripeTestActivationDryRunReport({
      readySource: readyEnv(),
      missingCredentialSource: {
        STRIPE_MODE: "test",
      },
      liveSource: readyEnv({
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
      }),
      invalidPrecheckSource: readyEnv({
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
      }),
      forbiddenSecretValues: FORBIDDEN,
      waitingForStateMachineIntegration: true,
    });

    expect(report.happyPathPassed).toBe(true);
    expect(report.allVerificationsPassed).toBe(true);
    expect(isStripeTestActivationDryRunReady(report)).toBe(true);
    expect(report.waitingForStateMachineIntegration).toBe(true);
    expect(report.stripeActivated).toBe("NO");
    expect(report.operatorActivationAuthorized).toBe(false);
    expect(report.providerExecutionStartCapable).toBe(false);
    assertOfflineCounters(report);
    assertNoSecretEcho(report);
  });

  it("blocks happy path when credentials missing (PRECHECK_BLOCKED)", () => {
    const { phases, passed } = runStripeTestActivationDryRunHappyPath({
      STRIPE_MODE: "test",
    });
    expect(passed).toBe(false);
    expect(phases[0]?.phase).toBe("PRECHECK");
    expect(phases[0]?.expectedState).toBe("READY_FOR_TEST");
    expect(phases[0]?.actualState).toBe("PRECHECK_BLOCKED");
    expect(phases[0]?.passed).toBe(false);
    expect(phases[0]?.blockingReasons.length).toBeGreaterThan(0);
    expect(phases.some((p) => !p.passed)).toBe(true);
    assertNoSecretEcho(phases);
  });
});
