/**
 * Seller Live Payout Orchestrator V1 (Slice S4).
 *
 * Sequences gate → trusted context → submit/fail/confirm booking helpers →
 * Manual Ops Live provider → durable execution rows.
 *
 * Does NOT: invent a second payout ledger state machine, post UEOS directly,
 * auto-confirm on execution create, auto-fail on uncertain provider outcomes,
 * or enable Stripe Connect / Wise / PayPal.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  confirmPayoutBooking,
  failPayoutBooking,
  loadTrustedPayoutBookingContext,
  rejectClientPayoutBookingMoneyFields,
  submitPayoutBooking,
  type PayoutBookingOpsInput,
  type PayoutBookingOpsResult,
  type TrustedPayoutBookingContext,
} from "../payoutBookingOpsHelpers";
import type { SellerLivePayoutDestination } from "./destinations";
import { listMyStorePayoutDestinations } from "./destinations";
import {
  parseSellerLivePayoutExecution,
  serviceInsertStorePayoutExecution,
  serviceUpdateStorePayoutExecution,
  type SellerLivePayoutExecution,
} from "./executions";
import { isSellerLivePayoutGateSatisfied } from "./gate";
import {
  assertSellerLivePayoutProviderAllowed,
  resolveSellerLivePayoutProviderPort,
  type SellerLivePayoutProviderPort,
} from "./providerPort";
import {
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  type SellerLivePayoutFailureCode,
  type SellerLivePayoutOrchestrationPhase,
  type SellerLivePayoutTransferResult,
} from "./types";

type AnyClient = SupabaseClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PENDING_CONFIRM_NOTE =
  "Provider attested succeeded; confirm booking failed — safe recovery required (do not auto-fail).";

export type SellerLivePayoutOrchestratorInput = {
  storeId: string;
  paymentAttemptId: string;
  destinationId: string;
  /**
   * Single orchestration idempotency key (8..120). Booking action keys are
   * derived as `${key}:submit|fail|confirm` (must stay <= 128).
   */
  orchestrationKey: string;
  /** Optional assertion only — never the money source of truth. */
  expectedCurrency?: string;
};

export type SellerLivePayoutAttestationDecision =
  | "succeeded"
  | "failed"
  | "uncertain";

export type SellerLivePayoutOrchestratorResult =
  | {
      ok: true;
      phase: SellerLivePayoutOrchestrationPhase;
      replayed: boolean;
      storeId: string;
      paymentAttemptId: string;
      captureEventId: string;
      trustedAmountMinor: number;
      currency: string;
      payoutState: string;
      orchestrationKey: string;
      execution: SellerLivePayoutExecution | null;
      providerRef: string | null;
      bookingEventKey: string | null;
      note: string;
    }
  | {
      ok: false;
      phase: "blocked" | "failed" | "terminal_completed";
      code: SellerLivePayoutFailureCode;
      message: string;
      replayed?: boolean;
      execution?: SellerLivePayoutExecution | null;
    };

export type SellerLivePayoutOrchestratorDeps = {
  env?: Record<string, string | undefined>;
  loadContext?: typeof loadTrustedPayoutBookingContext;
  submitBooking?: (
    supabase: AnyClient,
    input: PayoutBookingOpsInput
  ) => Promise<PayoutBookingOpsResult>;
  failBooking?: (
    supabase: AnyClient,
    input: PayoutBookingOpsInput
  ) => Promise<PayoutBookingOpsResult>;
  confirmBooking?: (
    supabase: AnyClient,
    input: PayoutBookingOpsInput
  ) => Promise<PayoutBookingOpsResult>;
  resolveProvider?: (
    providerId: string,
    env: Record<string, string | undefined>
  ) => SellerLivePayoutProviderPort | null;
  loadDestination?: (
    supabase: AnyClient,
    storeId: string,
    destinationId: string
  ) => Promise<
    | { ok: true; destination: SellerLivePayoutDestination }
    | { ok: false; message: string }
  >;
  findExecutionByOrchestrationKey?: (
    supabase: AnyClient,
    storeId: string,
    orchestrationKey: string
  ) => Promise<SellerLivePayoutExecution | null>;
  insertExecution?: typeof serviceInsertStorePayoutExecution;
  updateExecution?: typeof serviceUpdateStorePayoutExecution;
  createTransfer?: (
    port: SellerLivePayoutProviderPort,
    input: Parameters<SellerLivePayoutProviderPort["createTransfer"]>[0]
  ) => Promise<SellerLivePayoutTransferResult>;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function rejectClientLivePayoutOrchestratorMoneyFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  const bookingGuard = rejectClientPayoutBookingMoneyFields(input);
  if (!bookingGuard.ok) return bookingGuard;

  for (const key of Object.keys(input)) {
    if (
      key === "amountMinor" ||
      key === "amount_minor" ||
      key === "trustedAmountMinor" ||
      key === "trusted_amount_minor" ||
      key === "clientAmountMinor" ||
      /^(amount|total|balance|payout_sum)/i.test(key) ||
      /_minor$/i.test(key)
    ) {
      if (
        key === "storeId" ||
        key === "paymentAttemptId" ||
        key === "destinationId" ||
        key === "orchestrationKey" ||
        key === "expectedCurrency" ||
        key === "executionId"
      ) {
        continue;
      }
      return {
        ok: false,
        message:
          "Client must not supply money fields to the live payout orchestrator.",
      };
    }
  }
  return { ok: true };
}

export function validateOrchestrationKey(
  orchestrationKey: string | null | undefined
): { ok: true; orchestrationKey: string } | { ok: false; message: string } {
  if (!orchestrationKey || typeof orchestrationKey !== "string") {
    return { ok: false, message: "orchestrationKey is required." };
  }
  const key = orchestrationKey.trim();
  // Leave room for `:submit` / `:confirm` / `:fail` suffixes (max +8).
  if (key.length < 8 || key.length > 120) {
    return {
      ok: false,
      message: "orchestrationKey must be 8..120 characters.",
    };
  }
  return { ok: true, orchestrationKey: key };
}

export function buildLivePayoutBookingIdempotencyKey(
  orchestrationKey: string,
  action: "submit" | "fail" | "confirm"
): string {
  return `${orchestrationKey}:${action}`;
}

function blocked(
  code: SellerLivePayoutFailureCode,
  message: string,
  phase: "blocked" | "failed" | "terminal_completed" = "blocked"
): SellerLivePayoutOrchestratorResult {
  return { ok: false, phase, code, message };
}

async function defaultLoadDestination(
  supabase: AnyClient,
  storeId: string,
  destinationId: string
): Promise<
  | { ok: true; destination: SellerLivePayoutDestination }
  | { ok: false; message: string }
> {
  const listed = await listMyStorePayoutDestinations(supabase, storeId);
  if (!listed.ok) return listed;
  const destination = listed.destinations.find((d) => d.id === destinationId);
  if (!destination) {
    return { ok: false, message: "Destination not found for store." };
  }
  return { ok: true, destination };
}

async function defaultFindExecutionByOrchestrationKey(
  supabase: AnyClient,
  storeId: string,
  orchestrationKey: string
): Promise<SellerLivePayoutExecution | null> {
  const { data, error } = await supabase
    .from("store_payout_executions")
    .select("*")
    .eq("store_id", storeId)
    .eq("idempotency_key", orchestrationKey)
    .maybeSingle();
  if (error || !data) return null;
  return parseSellerLivePayoutExecution(data);
}

function validateDestinationForLivePayout(
  destination: SellerLivePayoutDestination,
  ctx: TrustedPayoutBookingContext
): { ok: true } | { ok: false; code: SellerLivePayoutFailureCode; message: string } {
  if (!destination.isActive) {
    return {
      ok: false,
      code: "destination_invalid",
      message: "Destination is not active.",
    };
  }
  if (destination.providerId !== SELLER_LIVE_PAYOUT_V1_PROVIDER_ID) {
    return {
      ok: false,
      code: "provider_forbidden",
      message: "Destination provider is not allowed for V1 live payouts.",
    };
  }
  if (destination.verificationState !== "verified") {
    return {
      ok: false,
      code: "account_unverified",
      message: "Destination must be verified before live payout.",
    };
  }
  if (destination.currency !== ctx.currency) {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "Destination currency does not match trusted capture currency.",
    };
  }
  if (destination.storeId !== ctx.storeId) {
    return {
      ok: false,
      code: "destination_invalid",
      message: "Destination does not belong to the trusted store.",
    };
  }
  return { ok: true };
}

function mapBookingFailure(
  result: Extract<PayoutBookingOpsResult, { ok: false }>
): SellerLivePayoutOrchestratorResult {
  if (result.code === "terminal_completed") {
    return blocked(
      "terminal_completed",
      result.message,
      "terminal_completed"
    );
  }
  if (result.code === "client_money_rejected") {
    return blocked("invalid_amount", result.message);
  }
  if (result.code === "inconsistent_ledger") {
    return blocked("idempotency_conflict", result.message);
  }
  if (result.code === "currency_mismatch") {
    return blocked("currency_mismatch", result.message);
  }
  return blocked("booking_failed", result.message, "failed");
}

function successResult(args: {
  phase: SellerLivePayoutOrchestrationPhase;
  replayed: boolean;
  ctx: TrustedPayoutBookingContext;
  orchestrationKey: string;
  execution: SellerLivePayoutExecution | null;
  providerRef: string | null;
  bookingEventKey: string | null;
  payoutState?: string;
  note: string;
}): SellerLivePayoutOrchestratorResult {
  return {
    ok: true,
    phase: args.phase,
    replayed: args.replayed,
    storeId: args.ctx.storeId,
    paymentAttemptId: args.ctx.paymentAttemptId,
    captureEventId: args.ctx.captureEventId,
    trustedAmountMinor: args.ctx.amountMinor,
    currency: args.ctx.currency,
    payoutState: args.payoutState ?? args.ctx.payoutState,
    orchestrationKey: args.orchestrationKey,
    execution: args.execution,
    providerRef: args.providerRef,
    bookingEventKey: args.bookingEventKey,
    note: args.note,
  };
}

/**
 * Eligible → submit booking → Manual Ops createTransfer → awaiting_attestation.
 * Never confirms merely because an execution row was created.
 */
export async function orchestrateSellerLivePayoutSubmit(
  supabase: AnyClient,
  input: SellerLivePayoutOrchestratorInput,
  deps: SellerLivePayoutOrchestratorDeps = {}
): Promise<SellerLivePayoutOrchestratorResult> {
  const env = deps.env ?? process.env;
  const moneyGuard = rejectClientLivePayoutOrchestratorMoneyFields(
    input as unknown as Record<string, unknown>
  );
  if (!moneyGuard.ok) {
    return blocked("invalid_amount", moneyGuard.message);
  }

  if (!isUuid(input.storeId) || !isUuid(input.paymentAttemptId)) {
    return blocked(
      "provider_rejected",
      "storeId and paymentAttemptId must be valid UUIDs."
    );
  }
  if (!isUuid(input.destinationId)) {
    return blocked("destination_invalid", "destinationId must be a valid UUID.");
  }

  const key = validateOrchestrationKey(input.orchestrationKey);
  if (!key.ok) {
    return blocked("duplicate_request", key.message);
  }

  if (!isSellerLivePayoutGateSatisfied(env)) {
    return blocked(
      "gate_incomplete",
      "Seller live payouts are unavailable until the live payout gate is satisfied."
    );
  }

  let providerPort: SellerLivePayoutProviderPort | null = null;
  try {
    assertSellerLivePayoutProviderAllowed(SELLER_LIVE_PAYOUT_V1_PROVIDER_ID);
    const resolve =
      deps.resolveProvider ?? resolveSellerLivePayoutProviderPort;
    providerPort = resolve(SELLER_LIVE_PAYOUT_V1_PROVIDER_ID, env);
  } catch {
    return blocked(
      "provider_forbidden",
      "Live payout provider is forbidden or not allowed for V1."
    );
  }
  if (!providerPort) {
    return blocked(
      "provider_disabled",
      "Manual Ops Live provider is unavailable (gate or resolve failed)."
    );
  }

  const loadContext = deps.loadContext ?? loadTrustedPayoutBookingContext;
  const loaded = await loadContext(supabase, {
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
  });
  if (!loaded.ok) {
    return blocked("booking_failed", loaded.message, "failed");
  }
  const ctx = loaded.context;

  if (
    input.expectedCurrency &&
    input.expectedCurrency.trim().toUpperCase() !== ctx.currency
  ) {
    return blocked(
      "currency_mismatch",
      "expectedCurrency does not match trusted capture currency."
    );
  }

  const loadDestination = deps.loadDestination ?? defaultLoadDestination;
  const destRes = await loadDestination(
    supabase,
    input.storeId,
    input.destinationId
  );
  if (!destRes.ok) {
    return blocked("destination_invalid", destRes.message);
  }
  const destGate = validateDestinationForLivePayout(destRes.destination, ctx);
  if (!destGate.ok) {
    return blocked(destGate.code, destGate.message);
  }

  const findExecution =
    deps.findExecutionByOrchestrationKey ??
    defaultFindExecutionByOrchestrationKey;
  const existing = await findExecution(
    supabase,
    input.storeId,
    key.orchestrationKey
  );

  // COMPLETED is terminal for new submits; identical completed orchestration may replay.
  if (ctx.payoutState === "COMPLETED") {
    if (
      existing &&
      existing.status === "succeeded" &&
      existing.captureEventId === ctx.captureEventId &&
      existing.destinationId === input.destinationId &&
      existing.trustedAmountMinor === ctx.amountMinor &&
      existing.currency === ctx.currency
    ) {
      return successResult({
        phase: "completed",
        replayed: true,
        ctx,
        orchestrationKey: key.orchestrationKey,
        execution: existing,
        providerRef: existing.providerRef,
        bookingEventKey: buildLivePayoutBookingIdempotencyKey(
          key.orchestrationKey,
          "confirm"
        ),
        payoutState: "COMPLETED",
        note: "Idempotent replay of completed live payout orchestration.",
      });
    }
    return blocked(
      "terminal_completed",
      "Payout is already COMPLETED and cannot be re-submitted.",
      "terminal_completed"
    );
  }

  if (existing) {
    if (
      existing.captureEventId !== ctx.captureEventId ||
      existing.destinationId !== input.destinationId ||
      existing.trustedAmountMinor !== ctx.amountMinor ||
      existing.currency !== ctx.currency
    ) {
      return blocked(
        "idempotency_conflict",
        "Orchestration key conflicts with an existing execution.",
        "failed"
      );
    }
    if (
      existing.status === "uncertain" &&
      (existing.note ?? "").includes("confirm booking failed")
    ) {
      return successResult({
        phase: "succeeded_pending_confirm",
        replayed: true,
        ctx,
        orchestrationKey: key.orchestrationKey,
        execution: existing,
        providerRef: existing.providerRef,
        bookingEventKey: buildLivePayoutBookingIdempotencyKey(
          key.orchestrationKey,
          "confirm"
        ),
        payoutState: ctx.payoutState,
        note: PENDING_CONFIRM_NOTE,
      });
    }
    if (existing.status === "failed") {
      return successResult({
        phase: "failed",
        replayed: true,
        ctx,
        orchestrationKey: key.orchestrationKey,
        execution: existing,
        providerRef: existing.providerRef,
        bookingEventKey: buildLivePayoutBookingIdempotencyKey(
          key.orchestrationKey,
          "fail"
        ),
        note: "Idempotent replay of failed live payout orchestration.",
      });
    }
    if (existing.status === "uncertain") {
      return successResult({
        phase: "uncertain",
        replayed: true,
        ctx,
        orchestrationKey: key.orchestrationKey,
        execution: existing,
        providerRef: existing.providerRef,
        bookingEventKey: buildLivePayoutBookingIdempotencyKey(
          key.orchestrationKey,
          "submit"
        ),
        note: "Idempotent replay of uncertain live payout orchestration.",
      });
    }
    // awaiting_attestation / planned / provider_submitted / succeeded (non-COMPLETED ledger)
    return successResult({
      phase: "awaiting_attestation",
      replayed: true,
      ctx,
      orchestrationKey: key.orchestrationKey,
      execution: existing,
      providerRef: existing.providerRef,
      bookingEventKey: buildLivePayoutBookingIdempotencyKey(
        key.orchestrationKey,
        "submit"
      ),
      payoutState: ctx.payoutState === "NONE" ? "IN_TRANSIT" : ctx.payoutState,
      note: "Idempotent replay — provider execution was not duplicated.",
    });
  }

  const submitBooking = deps.submitBooking ?? submitPayoutBooking;
  const submitKey = buildLivePayoutBookingIdempotencyKey(
    key.orchestrationKey,
    "submit"
  );
  const submitted = await submitBooking(supabase, {
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
    idempotencyKey: submitKey,
    expectedCurrency: input.expectedCurrency,
  });
  if (!submitted.ok) {
    return mapBookingFailure(submitted);
  }

  const insertExecution =
    deps.insertExecution ?? serviceInsertStorePayoutExecution;
  const inserted = await insertExecution(supabase, {
    storeId: ctx.storeId,
    captureEventId: ctx.captureEventId,
    destinationId: input.destinationId,
    providerId: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
    trustedAmountMinor: ctx.amountMinor,
    currency: ctx.currency,
    idempotencyKey: key.orchestrationKey,
    status: "awaiting_attestation",
    note: "Live payout reserved; awaiting Manual Ops attestation.",
  });
  if (!inserted.ok) {
    // Booking already reserved — fail closed back to payable.
    const failBooking = deps.failBooking ?? failPayoutBooking;
    await failBooking(supabase, {
      storeId: input.storeId,
      paymentAttemptId: input.paymentAttemptId,
      idempotencyKey: buildLivePayoutBookingIdempotencyKey(
        key.orchestrationKey,
        "fail"
      ),
    });
    return blocked(
      "booking_failed",
      inserted.message,
      "failed"
    );
  }

  const createTransfer =
    deps.createTransfer ??
    ((port, transferInput) => port.createTransfer(transferInput));
  const transfer = await createTransfer(providerPort, {
    storeId: ctx.storeId,
    captureEventId: ctx.captureEventId,
    executionId: inserted.execution.id,
    amountMinor: ctx.amountMinor,
    currency: ctx.currency,
    idempotencyKey: key.orchestrationKey,
    destinationId: input.destinationId,
  });

  const updateExecution =
    deps.updateExecution ?? serviceUpdateStorePayoutExecution;

  if (transfer.status === "failed") {
    const failBooking = deps.failBooking ?? failPayoutBooking;
    const failedBooking = await failBooking(supabase, {
      storeId: input.storeId,
      paymentAttemptId: input.paymentAttemptId,
      idempotencyKey: buildLivePayoutBookingIdempotencyKey(
        key.orchestrationKey,
        "fail"
      ),
    });
    const updated = await updateExecution(supabase, {
      executionId: inserted.execution.id,
      fromStatus: inserted.execution.status,
      status: "failed",
      providerRef: transfer.providerRef,
      failureCode: transfer.failureCode ?? "provider_rejected",
      failureMessageSafe: transfer.note,
      note: transfer.note,
    });
    return successResult({
      phase: "failed",
      replayed: false,
      ctx,
      orchestrationKey: key.orchestrationKey,
      execution: updated.ok ? updated.execution : inserted.execution,
      providerRef: transfer.providerRef,
      bookingEventKey: failedBooking.ok
        ? failedBooking.eventKey
        : buildLivePayoutBookingIdempotencyKey(key.orchestrationKey, "fail"),
      payoutState: failedBooking.ok ? failedBooking.payoutState : "NONE",
      note: transfer.note || "Known provider failure — payout booking failed closed.",
    });
  }

  if (transfer.status === "uncertain") {
    // DO NOT auto-fail booking when provider outcome is unknown.
    const updated = await updateExecution(supabase, {
      executionId: inserted.execution.id,
      fromStatus: inserted.execution.status,
      status: "uncertain",
      providerRef: transfer.providerRef,
      failureCode: transfer.failureCode ?? "execution_uncertain",
      failureMessageSafe: transfer.note,
      note: transfer.note,
    });
    return successResult({
      phase: "uncertain",
      replayed: false,
      ctx,
      orchestrationKey: key.orchestrationKey,
      execution: updated.ok ? updated.execution : inserted.execution,
      providerRef: transfer.providerRef,
      bookingEventKey: submitted.eventKey,
      payoutState: submitted.payoutState,
      note:
        transfer.note ||
        "Provider outcome uncertain — booking left IN_TRANSIT; no auto-fail.",
    });
  }

  // pending (Manual Ops) or unexpected succeeded-on-create → still awaiting attestation.
  // Never confirm merely because execution/transfer was created.
  const updated = await updateExecution(supabase, {
    executionId: inserted.execution.id,
    fromStatus: inserted.execution.status,
    status: "awaiting_attestation",
    providerRef: transfer.providerRef,
    failureCode: transfer.failureCode ?? "attestation_required",
    note:
      transfer.note ||
      "Awaiting Manual Ops attestation. No bank transfer confirmed.",
  });

  return successResult({
    phase: "awaiting_attestation",
    replayed: inserted.replayed,
    ctx,
    orchestrationKey: key.orchestrationKey,
    execution: updated.ok ? updated.execution : inserted.execution,
    providerRef: transfer.providerRef,
    bookingEventKey: submitted.eventKey,
    payoutState: submitted.payoutState,
    note:
      "Payout submitted to IN_TRANSIT; execution awaiting attestation. Confirm requires attestation.",
  });
}

/**
 * Resolve post-attestation / provider terminal outcomes against booking helpers.
 * - succeeded → confirm booking → completed (or succeeded_pending_confirm)
 * - failed → fail booking → failed
 * - uncertain → mark uncertain; DO NOT fail booking
 */
export async function orchestrateSellerLivePayoutResolveAttestation(
  supabase: AnyClient,
  input: SellerLivePayoutOrchestratorInput & {
    executionId: string;
    decision: SellerLivePayoutAttestationDecision;
    attestationRef?: string | null;
  },
  deps: SellerLivePayoutOrchestratorDeps = {}
): Promise<SellerLivePayoutOrchestratorResult> {
  const env = deps.env ?? process.env;
  const moneyGuard = rejectClientLivePayoutOrchestratorMoneyFields(
    input as unknown as Record<string, unknown>
  );
  if (!moneyGuard.ok) {
    return blocked("invalid_amount", moneyGuard.message);
  }

  if (!isSellerLivePayoutGateSatisfied(env)) {
    return blocked(
      "gate_incomplete",
      "Seller live payouts are unavailable until the live payout gate is satisfied."
    );
  }

  const key = validateOrchestrationKey(input.orchestrationKey);
  if (!key.ok) {
    return blocked("duplicate_request", key.message);
  }
  if (!isUuid(input.executionId)) {
    return blocked("provider_rejected", "executionId must be a valid UUID.");
  }

  try {
    assertSellerLivePayoutProviderAllowed(SELLER_LIVE_PAYOUT_V1_PROVIDER_ID);
  } catch {
    return blocked(
      "provider_forbidden",
      "Live payout provider is forbidden or not allowed for V1."
    );
  }

  const loadContext = deps.loadContext ?? loadTrustedPayoutBookingContext;
  const loaded = await loadContext(supabase, {
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
  });
  if (!loaded.ok) {
    return blocked("booking_failed", loaded.message, "failed");
  }
  const ctx = loaded.context;

  if (ctx.payoutState === "COMPLETED") {
    return blocked(
      "terminal_completed",
      "Payout is already COMPLETED and cannot be re-resolved.",
      "terminal_completed"
    );
  }

  const findExecution =
    deps.findExecutionByOrchestrationKey ??
    defaultFindExecutionByOrchestrationKey;
  const existing = await findExecution(
    supabase,
    input.storeId,
    key.orchestrationKey
  );
  if (!existing || existing.id !== input.executionId) {
    return blocked(
      "provider_rejected",
      "Execution not found for orchestration key.",
      "failed"
    );
  }

  const updateExecution =
    deps.updateExecution ?? serviceUpdateStorePayoutExecution;

  if (input.decision === "uncertain") {
    const updated = await updateExecution(supabase, {
      executionId: existing.id,
      fromStatus: existing.status,
      status: "uncertain",
      failureCode: "execution_uncertain",
      note: "Provider/ops outcome uncertain — booking not auto-failed.",
    });
    return successResult({
      phase: "uncertain",
      replayed: false,
      ctx,
      orchestrationKey: key.orchestrationKey,
      execution: updated.ok ? updated.execution : existing,
      providerRef: existing.providerRef,
      bookingEventKey: buildLivePayoutBookingIdempotencyKey(
        key.orchestrationKey,
        "submit"
      ),
      payoutState: ctx.payoutState,
      note: "Uncertain outcome preserved; failPayoutBooking was not called.",
    });
  }

  if (input.decision === "failed") {
    const failBooking = deps.failBooking ?? failPayoutBooking;
    const failedBooking = await failBooking(supabase, {
      storeId: input.storeId,
      paymentAttemptId: input.paymentAttemptId,
      idempotencyKey: buildLivePayoutBookingIdempotencyKey(
        key.orchestrationKey,
        "fail"
      ),
    });
    if (!failedBooking.ok && failedBooking.code !== "terminal_completed") {
      // Still mark execution failed; surface booking error.
      await updateExecution(supabase, {
        executionId: existing.id,
        fromStatus: existing.status,
        status: "failed",
        failureCode: "provider_rejected",
        note: failedBooking.message,
      });
      return mapBookingFailure(failedBooking);
    }
    const updated = await updateExecution(supabase, {
      executionId: existing.id,
      fromStatus: existing.status,
      status: "failed",
      failureCode: "provider_rejected",
      note: "Attestation/provider marked failed; payout booking released.",
    });
    return successResult({
      phase: "failed",
      replayed: failedBooking.ok ? failedBooking.replayed : false,
      ctx,
      orchestrationKey: key.orchestrationKey,
      execution: updated.ok ? updated.execution : existing,
      providerRef: existing.providerRef,
      bookingEventKey: failedBooking.ok
        ? failedBooking.eventKey
        : buildLivePayoutBookingIdempotencyKey(key.orchestrationKey, "fail"),
      payoutState: failedBooking.ok ? failedBooking.payoutState : "NONE",
      note: "Known failure — failPayoutBooking applied.",
    });
  }

  // decision === succeeded → confirm booking. Never treat create alone as success.
  const confirmBooking = deps.confirmBooking ?? confirmPayoutBooking;
  const confirmed = await confirmBooking(supabase, {
    storeId: input.storeId,
    paymentAttemptId: input.paymentAttemptId,
    idempotencyKey: buildLivePayoutBookingIdempotencyKey(
      key.orchestrationKey,
      "confirm"
    ),
  });

  if (!confirmed.ok) {
    // Provider succeeded but confirm failed — safe recovery; DO NOT auto-fail.
    const updated = await updateExecution(supabase, {
      executionId: existing.id,
      fromStatus: existing.status,
      status: "uncertain",
      failureCode: "confirm_pending",
      failureMessageSafe: PENDING_CONFIRM_NOTE,
      note: PENDING_CONFIRM_NOTE,
      providerRef: existing.providerRef,
    });
    return successResult({
      phase: "succeeded_pending_confirm",
      replayed: false,
      ctx,
      orchestrationKey: key.orchestrationKey,
      execution: updated.ok ? updated.execution : existing,
      providerRef: existing.providerRef,
      bookingEventKey: buildLivePayoutBookingIdempotencyKey(
        key.orchestrationKey,
        "confirm"
      ),
      payoutState: ctx.payoutState,
      note: PENDING_CONFIRM_NOTE,
    });
  }

  const updated = await updateExecution(supabase, {
    executionId: existing.id,
    fromStatus: existing.status,
    status: "succeeded",
    failureCode: null,
    note: input.attestationRef
      ? `Attested and confirmed (${input.attestationRef}).`
      : "Attested and confirmPayoutBooking completed.",
  });

  return successResult({
    phase: "completed",
    replayed: confirmed.replayed,
    ctx,
    orchestrationKey: key.orchestrationKey,
    execution: updated.ok ? updated.execution : existing,
    providerRef: existing.providerRef,
    bookingEventKey: confirmed.eventKey,
    payoutState: confirmed.payoutState,
    note: "Attestation succeeded and payout booking confirmed to COMPLETED.",
  });
}
