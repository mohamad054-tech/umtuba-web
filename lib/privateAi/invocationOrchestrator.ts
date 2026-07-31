import { applyAdapterBoundary } from "./adapterBoundary";
import {
  normalizeAdapterError,
  redactSecretLikeText,
} from "./adapterErrors";
import { lookupAdapterById } from "./adapterRegistry";
import { createPrivateAiAuditEntry } from "./audit";
import { CONTRACT_TEST_ADAPTER_ID } from "./contractTestAdapter";
import {
  assertTransitionInvocationLifecycle,
  isActiveInvocationLifecycle,
  isTerminalInvocationLifecycle,
} from "./invocationLifecycle";
import { hasPermission } from "./permissions";
import type {
  AdapterFailureClass,
  ExecutionPlanRecord,
  InferenceInvocationRecord,
  InferenceRequestRecord,
  InvocationLifecycle,
  OrchestrationNormalizedResult,
  PersistedPrivateAiState,
  PrivateAiAuditTrailEntry,
} from "./types";

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_COOLDOWN_MS = 5_000;

export type OrchestrateInvocationInput = {
  planId: string;
  actorRole?: string;
  actorId?: string | null;
  idempotencyKey?: string | null;
  allowContractTest?: boolean;
  /** Opt-in fixture invoke for contract-test adapter only. */
  invokeContractTest?: boolean;
  maxAttempts?: number;
  retryCooldownMs?: number;
  /** Pure timeout simulation: treat now as past timeoutAt before invoke. */
  forceTimeoutBefore?: boolean;
  /** Request cancellation before/during orchestration. */
  cancelRequested?: boolean;
  cancelReason?: string | null;
  cancelSource?: "requester" | "admin" | "system";
  now?: string;
};

export type OrchestrateInvocationResult = {
  state: PersistedPrivateAiState;
  invocation: InferenceInvocationRecord;
  reused: boolean;
  auditEntries: PrivateAiAuditTrailEntry[];
};

function audit(
  action: string,
  inv: InferenceInvocationRecord,
  detail: Record<string, unknown>,
  now: string,
  actorId?: string | null,
  actorRole?: string | null
): PrivateAiAuditTrailEntry {
  return createPrivateAiAuditEntry({
    action,
    actorId: actorId ?? inv.requester.actorId,
    actorRole: actorRole ?? inv.requester.role,
    modelId: inv.modelId,
    reason: String(detail.reason ?? action),
    detail: {
      invocationId: inv.invocationId,
      requestId: inv.requestId,
      executionPlanId: inv.executionPlanId,
      attempt: inv.attemptNumber,
      correlationId: inv.correlationId,
      adapterId: inv.adapterId,
      runtimeId: inv.runtimeId,
      providerId: inv.providerId,
      ...detail,
    },
    now,
  });
}

function transition(
  inv: InferenceInvocationRecord,
  to: InvocationLifecycle,
  now: string
): InferenceInvocationRecord {
  assertTransitionInvocationLifecycle(inv.lifecycle, to);
  return {
    ...inv,
    lifecycle: to,
    active: isActiveInvocationLifecycle(to),
    finishedAt: isTerminalInvocationLifecycle(to) ? now : inv.finishedAt,
    updatedAt: now,
  };
}

function mayCreate(
  state: PersistedPrivateAiState,
  role: string,
  modelId: string
): boolean {
  return (
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: modelId,
      role,
      action: "invocation_create",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "invocation_create",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "inference_execute",
    })
  );
}

function mayContractTest(
  state: PersistedPrivateAiState,
  role: string
): boolean {
  return (
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "invocation_contract_test",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "inference_execute",
    })
  );
}

function mayCancel(
  state: PersistedPrivateAiState,
  role: string
): boolean {
  return (
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "invocation_cancel",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "inference_execute",
    })
  );
}

function mayRetry(
  state: PersistedPrivateAiState,
  role: string
): boolean {
  return (
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "invocation_retry",
    }) ||
    hasPermission(state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "inference_execute",
    })
  );
}

function findByIdempotency(
  state: PersistedPrivateAiState,
  key: string,
  tenantId: string
): InferenceInvocationRecord | null {
  return (
    (state.inferenceInvocations ?? []).find(
      (i) => i.idempotencyKey === key && i.tenantId === tenantId
    ) ?? null
  );
}

function findActiveForPlan(
  state: PersistedPrivateAiState,
  planId: string
): InferenceInvocationRecord | null {
  return (
    (state.inferenceInvocations ?? []).find(
      (i) => i.executionPlanId === planId && i.active
    ) ?? null
  );
}

function normalizeFromBoundary(input: {
  inv: InferenceInvocationRecord;
  outputStatus: OrchestrationNormalizedResult["outputStatus"];
  finishReason: string | null;
  retryable: boolean;
  failureClass: OrchestrationNormalizedResult["failureClass"];
  safeUserMessage: string | null;
  adminDiagnostic: string | null;
  usage?: OrchestrationNormalizedResult["usage"];
  latencyMs?: number | null;
  structuredValid?: boolean | null;
  fixtureOnly: boolean;
}): OrchestrationNormalizedResult {
  return {
    invocationStatus: input.inv.lifecycle,
    outputStatus: input.outputStatus,
    finishReason: input.finishReason,
    usage: input.usage ?? null,
    latencyMs: input.latencyMs ?? null,
    structuredOutputValid: input.structuredValid ?? null,
    retryable: input.retryable,
    failureClass: input.failureClass,
    safeUserMessage: input.safeUserMessage
      ? redactSecretLikeText(input.safeUserMessage)
      : null,
    adminDiagnostic: input.adminDiagnostic
      ? redactSecretLikeText(input.adminDiagnostic)
      : null,
    adapterId: input.inv.adapterId,
    providerId: input.inv.providerId,
    runtimeId: input.inv.runtimeId,
    modelId: input.inv.modelId,
    attemptCount: input.inv.attemptNumber,
    fixtureOnly: input.fixtureOnly,
  };
}

function replaceInvocation(
  state: PersistedPrivateAiState,
  inv: InferenceInvocationRecord,
  audits: PrivateAiAuditTrailEntry[],
  now: string
): PersistedPrivateAiState {
  const list = state.inferenceInvocations ?? [];
  const exists = list.some((i) => i.invocationId === inv.invocationId);
  return {
    ...state,
    schemaVersion: 9,
    inferenceInvocations: exists
      ? list.map((i) => (i.invocationId === inv.invocationId ? inv : i))
      : [...list, inv],
    auditTrail: [...state.auditTrail, ...audits],
    updatedAt: now,
  };
}

/**
 * Orchestrate an invocation attempt from an existing execution plan.
 * Production adapters are never executed. Contract-test fixture is opt-in only.
 * No network, timers, workers, or provider SDKs.
 */
export function orchestrateInvocation(
  state: PersistedPrivateAiState,
  input: OrchestrateInvocationInput
): OrchestrateInvocationResult {
  const now = input.now ?? new Date().toISOString();
  const audits: PrivateAiAuditTrailEntry[] = [];
  const plan = (state.executionPlans ?? []).find(
    (p) => p.planId === input.planId
  );
  if (!plan || !plan.context) {
    throw new Error(`Execution plan missing or incomplete: ${input.planId}`);
  }
  const request = (state.inferenceRequests ?? []).find(
    (r) => r.requestId === plan.requestId
  );
  if (!request) {
    throw new Error(`Inference request missing for plan ${input.planId}`);
  }

  const role = input.actorRole ?? request.requester.role;
  const tenantId = request.requester.tenantId;
  const idemKey = input.idempotencyKey ?? null;

  if (idemKey) {
    const existing = findByIdempotency(state, idemKey, tenantId);
    if (existing) {
      const a = audit(
        "duplicate_invocation_reused",
        existing,
        { reason: "idempotency_hit" },
        now,
        input.actorId,
        role
      );
      audits.push(a);
      const withAudit = {
        ...existing,
        auditEventIds: [...existing.auditEventIds, a.id],
        updatedAt: now,
      };
      return {
        state: replaceInvocation(state, withAudit, audits, now),
        invocation: withAudit,
        reused: true,
        auditEntries: audits,
      };
    }
  }

  const active = findActiveForPlan(state, plan.planId);
  if (active) {
    const a = audit(
      "duplicate_invocation_reused",
      active,
      { reason: "active_attempt_exists" },
      now,
      input.actorId,
      role
    );
    audits.push(a);
    const withAudit = {
      ...active,
      auditEventIds: [...active.auditEventIds, a.id],
      updatedAt: now,
    };
    return {
      state: replaceInvocation(state, withAudit, audits, now),
      invocation: withAudit,
      reused: true,
      auditEntries: audits,
    };
  }

  if (!mayCreate(state, role, plan.context.modelId)) {
    throw new Error("Permission denied: invocation_create");
  }

  const maxAttempts = input.maxAttempts ?? request.retry.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const timeoutAt =
    plan.context.timeout.hardDeadlineAt ??
    new Date(
      Date.parse(now) + (plan.context.timeout.timeoutMs || 30_000)
    ).toISOString();

  let inv: InferenceInvocationRecord = {
    invocationId: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    requestId: plan.requestId,
    executionPlanId: plan.planId,
    adapterId: plan.adapterResolution?.adapterId ?? null,
    providerId: plan.context.providerId,
    runtimeId: plan.context.runtimeId,
    modelId: plan.context.modelId,
    capabilityId: plan.context.capabilityId,
    attemptNumber: 1,
    maxAttempts,
    lifecycle: "created",
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    timeout: {
      timeoutAt,
      timedOut: false,
      phase: "none",
      classification: "none",
    },
    cancellation: {
      requested: false,
      accepted: null,
      rejected: false,
      reason: null,
      actorId: null,
      source: null,
      requestedAt: null,
      resolvedAt: null,
    },
    retry: {
      eligible: false,
      reason: null,
      nextRetryAt: null,
      cooldownUntil: null,
      scheduled: false,
    },
    correlationId: plan.context.correlationId,
    tenantId,
    requester: request.requester,
    idempotencyKey: idemKey,
    inputEnvelope: plan.inputEnvelope,
    outputEnvelope: plan.outputEnvelope,
    normalizedResult: null,
    auditEventIds: [],
    active: true,
    notes: "Invocation orchestration V1 — no live inference.",
    updatedAt: now,
  };

  const createdAudit = audit(
    "invocation_created",
    inv,
    { reason: "created" },
    now,
    input.actorId,
    role
  );
  audits.push(createdAudit);
  inv = {
    ...inv,
    auditEventIds: [...inv.auditEventIds, createdAudit.id],
  };

  inv = transition(inv, "validating", now);
  const validatedAudit = audit(
    "invocation_validated",
    inv,
    { reason: "preconditions" },
    now,
    input.actorId,
    role
  );
  audits.push(validatedAudit);
  inv = {
    ...inv,
    auditEventIds: [...inv.auditEventIds, validatedAudit.id],
  };

  // Permission / plan guard
  if (plan.status === "blocked" || !plan.adapterResolution?.ok) {
    inv = transition(inv, "blocked", now);
    inv = {
      ...inv,
      normalizedResult: normalizeFromBoundary({
        inv,
        outputStatus: "blocked",
        finishReason: "adapter_or_plan_blocked",
        retryable: false,
        failureClass: plan.adapterResolution?.failureClass ?? "orchestration_blocked",
        safeUserMessage: "Invocation blocked before adapter invoke.",
        adminDiagnostic: plan.guardErrors.join(",") || "plan_blocked",
        fixtureOnly: false,
      }),
      notes: "Blocked — fail-closed; no provider call.",
    };
    const a = audit(
      "invocation_failed",
      inv,
      { reason: "blocked_preconditions" },
      now,
      input.actorId,
      role
    );
    audits.push(a);
    inv = { ...inv, auditEventIds: [...inv.auditEventIds, a.id] };
    return {
      state: replaceInvocation(state, inv, audits, now),
      invocation: inv,
      reused: false,
      auditEntries: audits,
    };
  }

  // Cancellation before invoke
  if (input.cancelRequested || plan.context.cancellation.cancelRequested) {
    if (!mayCancel(state, role)) {
      inv = {
        ...inv,
        cancellation: {
          ...inv.cancellation,
          requested: true,
          rejected: true,
          accepted: false,
          reason: "permission_denied",
          actorId: input.actorId ?? null,
          source: input.cancelSource ?? "requester",
          requestedAt: now,
          resolvedAt: now,
        },
      };
    } else {
      const adapter = inv.adapterId
        ? lookupAdapterById(state, inv.adapterId)
        : null;
      if (adapter && !adapter.supportsCancellation) {
        inv = {
          ...inv,
          cancellation: {
            ...inv.cancellation,
            requested: true,
            rejected: true,
            accepted: false,
            reason: "adapter_cancellation_unsupported",
            actorId: input.actorId ?? null,
            source: input.cancelSource ?? "requester",
            requestedAt: now,
            resolvedAt: now,
          },
        };
        const a = audit(
          "cancellation_requested",
          inv,
          { reason: "rejected_unsupported" },
          now,
          input.actorId,
          role
        );
        audits.push(a);
        inv = { ...inv, auditEventIds: [...inv.auditEventIds, a.id] };
      } else {
        inv = {
          ...inv,
          cancellation: {
            requested: true,
            accepted: true,
            rejected: false,
            reason: input.cancelReason ?? "cancelled_before_invocation",
            actorId: input.actorId ?? null,
            source: input.cancelSource ?? "requester",
            requestedAt: now,
            resolvedAt: now,
          },
        };
        const reqAudit = audit(
          "cancellation_requested",
          inv,
          { reason: inv.cancellation.reason },
          now,
          input.actorId,
          role
        );
        audits.push(reqAudit);
        inv = transition(inv, "cancelled", now);
        inv = {
          ...inv,
          auditEventIds: [...inv.auditEventIds, reqAudit.id],
          normalizedResult: normalizeFromBoundary({
            inv,
            outputStatus: "blocked",
            finishReason: "cancelled_before_invocation",
            retryable: false,
            failureClass: "cancellation_before_execution" as AdapterFailureClass,
            safeUserMessage: "Invocation was cancelled.",
            adminDiagnostic: inv.cancellation.reason,
            fixtureOnly: false,
          }),
        };
        const done = audit(
          "invocation_cancelled",
          inv,
          { reason: "cancelled_before_invocation" },
          now,
          input.actorId,
          role
        );
        audits.push(done);
        inv = { ...inv, auditEventIds: [...inv.auditEventIds, done.id] };
        return {
          state: replaceInvocation(state, inv, audits, now),
          invocation: inv,
          reused: false,
          auditEntries: audits,
        };
      }
    }
  }

  // Timeout before invocation (pure / contractual)
  const pastTimeout =
    input.forceTimeoutBefore === true ||
    (inv.timeout.timeoutAt != null &&
      Date.parse(now) >= Date.parse(inv.timeout.timeoutAt));
  if (pastTimeout) {
    inv = {
      ...inv,
      timeout: {
        timeoutAt: inv.timeout.timeoutAt,
        timedOut: true,
        phase: "before_invocation",
        classification: "timeout_before_invocation",
      },
    };
    inv = transition(inv, "timed_out", now);
    inv = {
      ...inv,
      normalizedResult: normalizeFromBoundary({
        inv,
        outputStatus: "blocked",
        finishReason: "timeout_before_invocation",
        retryable: true,
        failureClass: "timeout_before_execution",
        safeUserMessage: "Invocation timed out before adapter invoke.",
        adminDiagnostic: "timeout_before_invocation",
        fixtureOnly: false,
      }),
      retry: {
        eligible: inv.attemptNumber < inv.maxAttempts,
        reason: "timeout_before_invocation",
        nextRetryAt: null,
        cooldownUntil: null,
        scheduled: false,
      },
    };
    const a = audit(
      "invocation_timed_out",
      inv,
      { reason: "timeout_before_invocation" },
      now,
      input.actorId,
      role
    );
    audits.push(a);
    inv = { ...inv, auditEventIds: [...inv.auditEventIds, a.id] };

    if (inv.retry.eligible && mayRetry(state, role)) {
      const cooldownMs = input.retryCooldownMs ?? DEFAULT_RETRY_COOLDOWN_MS;
      const cooldownUntil = new Date(Date.parse(now) + cooldownMs).toISOString();
      inv = transition(inv, "retry_scheduled", now);
      inv = {
        ...inv,
        active: true,
        finishedAt: null,
        retry: {
          eligible: true,
          reason: "timeout_before_invocation",
          nextRetryAt: cooldownUntil,
          cooldownUntil,
          scheduled: true,
        },
      };
      const r = audit(
        "retry_scheduled",
        inv,
        { reason: "timeout_retry", nextRetryAt: cooldownUntil },
        now,
        input.actorId,
        role
      );
      audits.push(r);
      inv = { ...inv, auditEventIds: [...inv.auditEventIds, r.id] };
    } else if (!inv.retry.eligible) {
      inv = transition(inv, "exhausted", now);
      const e = audit(
        "invocation_exhausted",
        inv,
        { reason: "max_attempts_or_non_retryable" },
        now,
        input.actorId,
        role
      );
      audits.push(e);
      inv = { ...inv, auditEventIds: [...inv.auditEventIds, e.id] };
    }

    return {
      state: replaceInvocation(state, inv, audits, now),
      invocation: inv,
      reused: false,
      auditEntries: audits,
    };
  }

  inv = transition(inv, "ready", now);
  inv = {
    ...inv,
    adapterId: plan.adapterResolution?.adapterId ?? inv.adapterId,
    inputEnvelope: plan.inputEnvelope,
  };

  const adapter = inv.adapterId
    ? lookupAdapterById(state, inv.adapterId)
    : null;
  const isContractTest = adapter?.adapterId === CONTRACT_TEST_ADAPTER_ID;
  const wantFixture =
    input.invokeContractTest === true &&
    input.allowContractTest === true &&
    isContractTest;

  if (wantFixture && !mayContractTest(state, role)) {
    inv = transition(inv, "blocked", now);
    inv = {
      ...inv,
      normalizedResult: normalizeFromBoundary({
        inv,
        outputStatus: "blocked",
        finishReason: "permission_denied_contract_test",
        retryable: false,
        failureClass: "provider_auth_failed",
        safeUserMessage: "Contract-test invocation not permitted.",
        adminDiagnostic: "missing invocation_contract_test",
        fixtureOnly: true,
      }),
    };
    return {
      state: replaceInvocation(state, inv, audits, now),
      invocation: inv,
      reused: false,
      auditEntries: audits,
    };
  }

  // Production adapters: resolve envelopes only — never execute
  if (!wantFixture) {
    inv = transition(inv, "invoking", now);
    inv = { ...inv, startedAt: now };
    const startAudit = audit(
      "invocation_started",
      inv,
      { reason: "non_executable_boundary" },
      now,
      input.actorId,
      role
    );
    audits.push(startAudit);
    const reqAudit = audit(
      "adapter_invocation_requested",
      inv,
      {
        reason: "production_adapter_non_executable",
        executed: false,
      },
      now,
      input.actorId,
      role
    );
    audits.push(reqAudit);
    inv = transition(inv, "blocked", now);
    inv = {
      ...inv,
      auditEventIds: [
        ...inv.auditEventIds,
        startAudit.id,
        reqAudit.id,
      ],
      outputEnvelope: plan.outputEnvelope,
      normalizedResult: normalizeFromBoundary({
        inv,
        outputStatus: plan.outputEnvelope?.status ?? "not_executed",
        finishReason: "production_adapter_non_executable",
        retryable: false,
        failureClass: "orchestration_blocked",
        safeUserMessage:
          "Adapter resolved; live invocation is not enabled in V1.",
        adminDiagnostic:
          "Orchestration stopped before provider SDK — non-executable.",
        fixtureOnly: false,
      }),
      notes:
        "Production adapter non-executable in Invocation Orchestration V1.",
    };
    const failAudit = audit(
      "invocation_failed",
      inv,
      { reason: "production_adapter_non_executable" },
      now,
      input.actorId,
      role
    );
    audits.push(failAudit);
    inv = {
      ...inv,
      auditEventIds: [...inv.auditEventIds, failAudit.id],
      normalizedResult: {
        ...inv.normalizedResult!,
        invocationStatus: inv.lifecycle,
      },
    };
    return {
      state: replaceInvocation(state, inv, audits, now),
      invocation: inv,
      reused: false,
      auditEntries: audits,
    };
  }

  // Contract-test fixture path
  inv = transition(inv, "invoking", now);
  inv = { ...inv, startedAt: now };
  const startAudit = audit(
    "invocation_started",
    inv,
    { reason: "contract_test" },
    now,
    input.actorId,
    role
  );
  audits.push(startAudit);
  const reqAudit = audit(
    "adapter_invocation_requested",
    inv,
    { reason: "contract_test_fixture", network: false },
    now,
    input.actorId,
    role
  );
  audits.push(reqAudit);

  inv = transition(inv, "awaiting_result", now);
  const boundary = applyAdapterBoundary({
    state,
    planId: plan.planId,
    request,
    context: plan.context,
    allowContractTest: true,
    invokeContractTest: true,
    now,
  });
  audits.push(...boundary.auditEntries);

  inv = {
    ...inv,
    adapterId: boundary.resolution.adapterId ?? inv.adapterId,
    inputEnvelope: boundary.inputEnvelope,
    outputEnvelope: boundary.outputEnvelope,
    auditEventIds: [
      ...inv.auditEventIds,
      startAudit.id,
      reqAudit.id,
      ...boundary.auditEntries.map((e) => e.id),
    ],
  };

  const recv = audit(
    "adapter_result_received",
    inv,
    {
      reason: boundary.outputEnvelope?.status ?? "none",
      ok: boundary.resolution.ok,
    },
    now,
    input.actorId,
    role
  );
  audits.push(recv);
  inv = { ...inv, auditEventIds: [...inv.auditEventIds, recv.id] };

  if (
    boundary.resolution.ok &&
    boundary.outputEnvelope?.status === "fixture_ok"
  ) {
    inv = transition(inv, "succeeded", now);
    inv = {
      ...inv,
      normalizedResult: normalizeFromBoundary({
        inv,
        outputStatus: "fixture_ok",
        finishReason: boundary.outputEnvelope.finishReason,
        retryable: false,
        failureClass: null,
        safeUserMessage: "Contract-test invocation succeeded.",
        adminDiagnostic: "fixture_ok",
        usage: boundary.outputEnvelope.usage,
        latencyMs: boundary.outputEnvelope.latencyMs,
        structuredValid: boundary.outputEnvelope.output.structuredValid,
        fixtureOnly: true,
      }),
    };
    const ok = audit(
      "invocation_succeeded",
      inv,
      { reason: "fixture_ok" },
      now,
      input.actorId,
      role
    );
    audits.push(ok);
    inv = {
      ...inv,
      auditEventIds: [...inv.auditEventIds, ok.id],
      normalizedResult: {
        ...inv.normalizedResult!,
        invocationStatus: "succeeded",
      },
    };
    return {
      state: replaceInvocation(state, inv, audits, now),
      invocation: inv,
      reused: false,
      auditEntries: audits,
    };
  }

  // Failed / malformed / structured invalid
  const failure =
    boundary.normalizedFailure ??
    boundary.outputEnvelope?.failure ??
    normalizeAdapterError({
      class: "malformed_provider_response",
      adminDiagnostic: "missing_or_invalid_fixture_result",
    });

  inv = transition(inv, "failed", now);
  inv = {
    ...inv,
    retry: {
      eligible: failure.retryable && inv.attemptNumber < inv.maxAttempts,
      reason: failure.class,
      nextRetryAt: null,
      cooldownUntil: null,
      scheduled: false,
    },
    normalizedResult: normalizeFromBoundary({
      inv,
      outputStatus: boundary.outputEnvelope?.status ?? "fixture_error",
      finishReason: failure.class,
      retryable: failure.retryable,
      failureClass: failure.class,
      safeUserMessage: failure.safeMessage,
      adminDiagnostic: failure.adminDiagnostic,
      fixtureOnly: true,
    }),
  };
  const failAudit = audit(
    "invocation_failed",
    inv,
    { reason: failure.class, retryable: failure.retryable },
    now,
    input.actorId,
    role
  );
  audits.push(failAudit);
  inv = { ...inv, auditEventIds: [...inv.auditEventIds, failAudit.id] };

  if (!inv.retry.eligible) {
    inv = transition(inv, "exhausted", now);
    const e = audit(
      "invocation_exhausted",
      inv,
      { reason: failure.retryable ? "max_attempts" : "non_retryable" },
      now,
      input.actorId,
      role
    );
    audits.push(e);
    inv = {
      ...inv,
      auditEventIds: [...inv.auditEventIds, e.id],
      normalizedResult: {
        ...inv.normalizedResult!,
        invocationStatus: "exhausted",
      },
    };
  }

  return {
    state: replaceInvocation(state, inv, audits, now),
    invocation: inv,
    reused: false,
    auditEntries: audits,
  };
}

export function scheduleInvocationRetry(
  state: PersistedPrivateAiState,
  input: {
    invocationId: string;
    actorRole?: string;
    actorId?: string | null;
    now?: string;
    cooldownMs?: number;
  }
): OrchestrateInvocationResult {
  const now = input.now ?? new Date().toISOString();
  const current = (state.inferenceInvocations ?? []).find(
    (i) => i.invocationId === input.invocationId
  );
  if (!current) throw new Error(`Unknown invocation: ${input.invocationId}`);
  const role = input.actorRole ?? current.requester.role;
  if (!mayRetry(state, role)) {
    throw new Error("Permission denied: invocation_retry");
  }
  if (
    current.lifecycle !== "failed" &&
    current.lifecycle !== "timed_out" &&
    current.lifecycle !== "retry_scheduled"
  ) {
    throw new Error(`Cannot schedule retry from ${current.lifecycle}`);
  }
  if (current.attemptNumber >= current.maxAttempts) {
    let inv = current;
    const audits: PrivateAiAuditTrailEntry[] = [];
    if (inv.lifecycle !== "exhausted") {
      inv = transition(inv, "exhausted", now);
    }
    const e = audit(
      "invocation_exhausted",
      inv,
      { reason: "max_attempts" },
      now,
      input.actorId,
      role
    );
    audits.push(e);
    inv = { ...inv, auditEventIds: [...inv.auditEventIds, e.id], active: false };
    return {
      state: replaceInvocation(state, inv, audits, now),
      invocation: inv,
      reused: false,
      auditEntries: audits,
    };
  }

  if (
    current.retry.cooldownUntil &&
    Date.parse(now) < Date.parse(current.retry.cooldownUntil)
  ) {
    throw new Error("Retry suppressed: cooldown active");
  }
  if (!current.retry.eligible && current.lifecycle !== "retry_scheduled") {
    throw new Error("Retry not eligible for this failure");
  }

  const cooldownMs = input.cooldownMs ?? DEFAULT_RETRY_COOLDOWN_MS;
  const cooldownUntil = new Date(Date.parse(now) + cooldownMs).toISOString();
  let inv = current;
  if (inv.lifecycle !== "retry_scheduled") {
    inv = transition(inv, "retry_scheduled", now);
  }
  inv = {
    ...inv,
    active: true,
    finishedAt: null,
    attemptNumber: inv.attemptNumber + 1,
    retry: {
      eligible: true,
      reason: inv.retry.reason ?? "manual_retry",
      nextRetryAt: cooldownUntil,
      cooldownUntil,
      scheduled: true,
    },
    updatedAt: now,
  };
  // Move to ready for next orchestration cycle (metadata only — no worker)
  inv = transition(inv, "ready", now);
  const a = audit(
    "retry_scheduled",
    inv,
    { reason: "manual_or_policy_retry", attempt: inv.attemptNumber },
    now,
    input.actorId,
    role
  );
  inv = { ...inv, auditEventIds: [...inv.auditEventIds, a.id] };
  return {
    state: replaceInvocation(state, inv, [a], now),
    invocation: inv,
    reused: false,
    auditEntries: [a],
  };
}

export function requestInvocationCancellation(
  state: PersistedPrivateAiState,
  input: {
    invocationId: string;
    reason?: string;
    actorRole?: string;
    actorId?: string | null;
    source?: "requester" | "admin" | "system";
    now?: string;
  }
): OrchestrateInvocationResult {
  const now = input.now ?? new Date().toISOString();
  const current = (state.inferenceInvocations ?? []).find(
    (i) => i.invocationId === input.invocationId
  );
  if (!current) throw new Error(`Unknown invocation: ${input.invocationId}`);
  const role = input.actorRole ?? current.requester.role;
  if (!mayCancel(state, role)) {
    throw new Error("Permission denied: invocation_cancel");
  }
  if (isTerminalInvocationLifecycle(current.lifecycle)) {
    throw new Error(`Cannot cancel terminal invocation ${current.lifecycle}`);
  }

  let inv: InferenceInvocationRecord = {
    ...current,
    cancellation: {
      requested: true,
      accepted: true,
      rejected: false,
      reason: input.reason ?? "admin_cancel",
      actorId: input.actorId ?? null,
      source: input.source ?? "admin",
      requestedAt: now,
      resolvedAt: now,
    },
  };
  const reqAudit = audit(
    "cancellation_requested",
    inv,
    { reason: inv.cancellation.reason },
    now,
    input.actorId,
    role
  );
  inv = transition(inv, "cancelled", now);
  inv = {
    ...inv,
    auditEventIds: [...inv.auditEventIds, reqAudit.id],
    normalizedResult: normalizeFromBoundary({
      inv,
      outputStatus: "blocked",
      finishReason: "cancelled",
      retryable: false,
      failureClass: "cancellation_before_execution",
      safeUserMessage: "Invocation was cancelled.",
      adminDiagnostic: inv.cancellation.reason,
      fixtureOnly: Boolean(inv.normalizedResult?.fixtureOnly),
    }),
  };
  const done = audit(
    "invocation_cancelled",
    inv,
    { reason: inv.cancellation.reason },
    now,
    input.actorId,
    role
  );
  inv = { ...inv, auditEventIds: [...inv.auditEventIds, done.id] };
  return {
    state: replaceInvocation(state, inv, [reqAudit, done], now),
    invocation: inv,
    reused: false,
    auditEntries: [reqAudit, done],
  };
}

export function markInvocationTimedOut(
  state: PersistedPrivateAiState,
  input: {
    invocationId: string;
    phase?: "before_invocation" | "awaiting_result";
    actorRole?: string;
    actorId?: string | null;
    now?: string;
  }
): OrchestrateInvocationResult {
  const now = input.now ?? new Date().toISOString();
  const current = (state.inferenceInvocations ?? []).find(
    (i) => i.invocationId === input.invocationId
  );
  if (!current) throw new Error(`Unknown invocation: ${input.invocationId}`);
  if (isTerminalInvocationLifecycle(current.lifecycle)) {
    throw new Error(`Cannot time out terminal invocation ${current.lifecycle}`);
  }
  const phase = input.phase ?? "awaiting_result";
  let inv: InferenceInvocationRecord = {
    ...current,
    timeout: {
      timeoutAt: current.timeout.timeoutAt,
      timedOut: true,
      phase,
      classification:
        phase === "before_invocation"
          ? "timeout_before_invocation"
          : "timeout_awaiting_result",
    },
  };
  inv = transition(inv, "timed_out", now);
  inv = {
    ...inv,
    retry: {
      eligible: inv.attemptNumber < inv.maxAttempts,
      reason: inv.timeout.classification,
      nextRetryAt: null,
      cooldownUntil: null,
      scheduled: false,
    },
    normalizedResult: normalizeFromBoundary({
      inv,
      outputStatus: "blocked",
      finishReason: inv.timeout.classification,
      retryable: true,
      failureClass: "timeout_before_execution",
      safeUserMessage: "Invocation timed out.",
      adminDiagnostic: inv.timeout.classification,
      fixtureOnly: false,
    }),
  };
  const a = audit(
    "invocation_timed_out",
    inv,
    { reason: inv.timeout.classification },
    now,
    input.actorId,
    input.actorRole
  );
  inv = { ...inv, auditEventIds: [...inv.auditEventIds, a.id] };
  return {
    state: replaceInvocation(state, inv, [a], now),
    invocation: inv,
    reused: false,
    auditEntries: [a],
  };
}

/** Helper for tests: run dispatch plan then orchestrate. */
export function requirePlanAndRequest(
  state: PersistedPrivateAiState,
  planId: string
): { plan: ExecutionPlanRecord; request: InferenceRequestRecord } {
  const plan = (state.executionPlans ?? []).find((p) => p.planId === planId);
  if (!plan) throw new Error("plan missing");
  const request = (state.inferenceRequests ?? []).find(
    (r) => r.requestId === plan.requestId
  );
  if (!request) throw new Error("request missing");
  return { plan, request };
}
