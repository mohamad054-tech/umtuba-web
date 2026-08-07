/**
 * Admin readiness scaffolding — status/contracts for first-time execute prep.
 * Production/live remains OFF by default (execution mode off).
 */

import {
  buildStripePaymentConfigReadinessReport,
  evaluateStripeLiveCaptureConfigForTests,
} from "../stripeConfig";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID,
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION,
  partialRefundProviderMoneyOwnership,
} from "./capability";
import {
  evaluatePartialRefundProviderMoneyExecutionMode,
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  readPartialRefundProviderMoneyExecutionMode,
} from "./executionMode";
import {
  buildPartialRefundProviderMoneyGateReadinessReport,
  evaluatePartialRefundProviderMoneyGate,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
} from "./gate";
import { assertPartialRefundProviderMoneyExecutionGates } from "./orchestrator";
import { PROVIDER_MONEY_NON_EVENTS } from "./types";

export type PartialRefundProviderMoneyReadinessReport = {
  capability: typeof PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID;
  version: typeof PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION;
  ownership: ReturnType<typeof partialRefundProviderMoneyOwnership>;
  dedicatedGateEnvName: typeof PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV;
  executionModeEnvName: typeof PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV;
  dedicatedGate: ReturnType<
    typeof buildPartialRefundProviderMoneyGateReadinessReport
  >;
  executionMode: string;
  executionModeAllowed: boolean;
  stripeConfig: ReturnType<typeof buildStripePaymentConfigReadinessReport>;
  bothGatesSatisfied: boolean;
  firstTimeSubmitAllowed: boolean;
  /** True only when dedicated + stripe + execution-mode all pass. */
  liveMoneyClickableFlowEnabled: boolean;
  providerInvocationAllowed: boolean;
  note: string;
} & typeof PROVIDER_MONEY_NON_EVENTS;

/**
 * Redacted readiness for admin diagnostics.
 */
export function buildPartialRefundProviderMoneyReadinessReport(
  env: Record<string, string | undefined> = process.env
): PartialRefundProviderMoneyReadinessReport {
  const dedicatedGate = buildPartialRefundProviderMoneyGateReadinessReport(env);
  const stripeConfig = buildStripePaymentConfigReadinessReport(env);
  const gates = assertPartialRefundProviderMoneyExecutionGates(env);
  const dedicatedOk = evaluatePartialRefundProviderMoneyGate(env).ok;
  const stripeOk = evaluateStripeLiveCaptureConfigForTests(env).ok;
  const modeEval = evaluatePartialRefundProviderMoneyExecutionMode(env);
  const executionMode = readPartialRefundProviderMoneyExecutionMode(env);

  return {
    capability: PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_ID,
    version: PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_VERSION,
    ownership: partialRefundProviderMoneyOwnership(),
    dedicatedGateEnvName: PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
    executionModeEnvName: PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
    dedicatedGate,
    executionMode,
    executionModeAllowed: modeEval.ok,
    stripeConfig,
    bothGatesSatisfied: dedicatedOk && stripeOk,
    firstTimeSubmitAllowed: gates.ok,
    liveMoneyClickableFlowEnabled: gates.ok,
    providerInvocationAllowed: gates.ok,
    note:
      "P3: first-time execute is structurally wired but fail-closed. Default execution mode=off; production remains disabled without explicit production mode + ACK.",
    ...PROVIDER_MONEY_NON_EVENTS,
  };
}

/**
 * Fail-closed guard for admin first-time execute action.
 * Requires dedicated gate + Stripe config + execution-mode allowlist.
 */
export function assertAdminProviderMoneyExecuteAllowed(
  env: Record<string, string | undefined> = process.env
):
  | { ok: true }
  | { ok: false; code: string; message: string } {
  return assertPartialRefundProviderMoneyExecutionGates(env);
}
