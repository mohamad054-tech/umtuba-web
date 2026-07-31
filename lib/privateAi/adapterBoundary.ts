import {
  failureClassFromNegotiationReasons,
  normalizeAdapterError,
} from "./adapterErrors";
import { resolveAdapterForNegotiation } from "./adapterRegistry";
import { createPrivateAiAuditEntry } from "./audit";
import {
  CONTRACT_TEST_ADAPTER_ID,
  CONTRACT_TEST_FIXTURE_TEXT,
} from "./contractTestAdapter";
import {
  buildExecutionInputEnvelope,
  buildFixtureOutputEnvelope,
  buildNotExecutedOutputEnvelope,
  validateExecutionInputEnvelope,
} from "./executionEnvelopes";
import { hasPermission } from "./permissions";
import type {
  AdapterResolutionResult,
  ExecutionContext,
  ExecutionInputEnvelope,
  ExecutionOutputEnvelope,
  InferenceRequestRecord,
  PersistedPrivateAiState,
  PrivateAiAuditTrailEntry,
} from "./types";

export type AdapterBoundaryResult = {
  resolution: AdapterResolutionResult;
  inputEnvelope: ExecutionInputEnvelope | null;
  outputEnvelope: ExecutionOutputEnvelope | null;
  auditEntries: PrivateAiAuditTrailEntry[];
  normalizedFailure: ReturnType<typeof normalizeAdapterError> | null;
};

function runtimeKindForProvider(
  providerId: string
): "external" | "private" | "local" | "contract_test" {
  if (providerId === "contract-test") return "contract_test";
  if (providerId.startsWith("umtuba-local")) return "local";
  if (providerId.startsWith("umtuba-private")) return "private";
  return "external";
}

/**
 * Resolve adapter + build envelopes after an execution plan context exists.
 * Never performs live provider I/O. Contract-test invoke is opt-in only.
 */
export function applyAdapterBoundary(input: {
  state: PersistedPrivateAiState;
  planId: string;
  request: InferenceRequestRecord;
  context: ExecutionContext;
  allowContractTest?: boolean;
  invokeContractTest?: boolean;
  now?: string;
}): AdapterBoundaryResult {
  const now = input.now ?? new Date().toISOString();
  const auditEntries: PrivateAiAuditTrailEntry[] = [];

  const role = input.request.requester.role;
  const mayResolve =
    hasPermission(input.state.permissions, {
      scope: "model",
      resourceId: input.context.modelId,
      role,
      action: "inference_execute",
    }) ||
    hasPermission(input.state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "inference_execute",
    }) ||
    hasPermission(input.state.permissions, {
      scope: "capability",
      resourceId: input.context.capabilityId,
      role,
      action: "inference_execute",
    }) ||
    hasPermission(input.state.permissions, {
      scope: "model",
      resourceId: "*",
      role,
      action: "runtime_operate",
    });

  if (!mayResolve) {
    const failure = normalizeAdapterError({
      class: "provider_auth_failed",
      code: "permission_missing_adapter_resolve",
      adminDiagnostic: "missing inference_execute for adapter resolution",
    });
    const audit = createPrivateAiAuditEntry({
      action: "adapter_resolution_denied",
      actorId: input.request.requester.actorId,
      actorRole: input.request.requester.role,
      modelId: input.context.modelId,
      reason: failure.code,
      detail: {
        requestId: input.request.requestId,
        planId: input.planId,
        failureClass: failure.class,
      },
      now,
    });
    auditEntries.push(audit);
    return {
      resolution: {
        ok: false,
        adapterId: null,
        providerId: input.context.providerId,
        negotiation: {
          ok: false,
          selectedAdapterId: null,
          rejected: [],
          reasons: ["permission_missing_adapter_resolve"],
          evaluatedAt: now,
        },
        failureClass: failure.class,
        retryable: false,
        auditEventId: audit.id,
        notes: "Adapter resolution denied — fail-closed.",
      },
      inputEnvelope: null,
      outputEnvelope: null,
      auditEntries,
      normalizedFailure: failure,
    };
  }

  const { negotiation, adapter } = resolveAdapterForNegotiation(input.state, {
    providerId: input.context.providerId,
    capabilityId: input.context.capabilityId,
    modelId: input.context.modelId,
    runtimeKind: runtimeKindForProvider(input.context.providerId),
    requireStreaming: input.request.streaming.enabled,
    requireStructuredOutput:
      input.request.structuredOutput.mode !== "none" ||
      input.request.structuredOutput.validateOutput,
    requireCancellation: true,
    requireTimeout: true,
    allowContractTest: input.allowContractTest === true,
    now,
  });

  if (!negotiation.ok || !adapter) {
    const failureClass = failureClassFromNegotiationReasons(
      negotiation.reasons.length
        ? negotiation.reasons
        : negotiation.rejected.flatMap((r) => r.reasons)
    );
    const failure = normalizeAdapterError({
      class: failureClass,
      adminDiagnostic: negotiation.rejected
        .map((r) => `${r.adapterId}:${r.reasons.join("|")}`)
        .join("; ")
        .slice(0, 400),
    });
    const audit = createPrivateAiAuditEntry({
      action: "adapter_resolution_failed",
      actorId: input.request.requester.actorId,
      actorRole: input.request.requester.role,
      modelId: input.context.modelId,
      reason: failure.class,
      detail: {
        requestId: input.request.requestId,
        planId: input.planId,
        rejected: negotiation.rejected,
        correlationId: input.context.correlationId,
      },
      now,
    });
    auditEntries.push(audit);
    return {
      resolution: {
        ok: false,
        adapterId: null,
        providerId: input.context.providerId,
        negotiation,
        failureClass: failure.class,
        retryable: failure.retryable,
        auditEventId: audit.id,
        notes: "No eligible adapter — fail-closed; no provider call.",
      },
      inputEnvelope: null,
      outputEnvelope: buildNotExecutedOutputEnvelope({
        planId: input.planId,
        request: input.request,
        context: input.context,
        adapterId: null,
        notes: "Adapter resolution failed — boundary stop.",
        now,
      }),
      auditEntries,
      normalizedFailure: failure,
    };
  }

  const inputEnvelope = buildExecutionInputEnvelope({
    planId: input.planId,
    request: input.request,
    context: input.context,
    adapter,
  });
  const envelopeCheck = validateExecutionInputEnvelope(inputEnvelope);
  if (!envelopeCheck.ok) {
    const failure = normalizeAdapterError({
      class: "invalid_execution_input",
      adminDiagnostic: envelopeCheck.errors.join(","),
    });
    const audit = createPrivateAiAuditEntry({
      action: "adapter_envelope_invalid",
      actorId: input.request.requester.actorId,
      actorRole: input.request.requester.role,
      modelId: input.context.modelId,
      reason: failure.class,
      detail: {
        requestId: input.request.requestId,
        planId: input.planId,
        errors: envelopeCheck.errors,
      },
      now,
    });
    auditEntries.push(audit);
    return {
      resolution: {
        ok: false,
        adapterId: adapter.adapterId,
        providerId: adapter.providerId,
        negotiation,
        failureClass: failure.class,
        retryable: false,
        auditEventId: audit.id,
        notes: "Input envelope invalid — fail-closed.",
      },
      inputEnvelope,
      outputEnvelope: null,
      auditEntries,
      normalizedFailure: failure,
    };
  }

  const resolveAudit = createPrivateAiAuditEntry({
    action: "adapter_resolved",
    actorId: input.request.requester.actorId,
    actorRole: input.request.requester.role,
    modelId: input.context.modelId,
    reason: "adapter_boundary",
    detail: {
      requestId: input.request.requestId,
      planId: input.planId,
      adapterId: adapter.adapterId,
      providerId: adapter.providerId,
      correlationId: input.context.correlationId,
      rejected: negotiation.rejected,
    },
    now,
  });
  auditEntries.push(resolveAudit);

  let outputEnvelope: ExecutionOutputEnvelope | null = null;

  if (
    input.invokeContractTest === true &&
    adapter.adapterId === CONTRACT_TEST_ADAPTER_ID
  ) {
    const runAudit = createPrivateAiAuditEntry({
      action: "adapter_contract_test_invoked",
      actorId: input.request.requester.actorId,
      actorRole: input.request.requester.role,
      modelId: input.context.modelId,
      reason: "fixture_only",
      detail: {
        requestId: input.request.requestId,
        planId: input.planId,
        adapterId: adapter.adapterId,
        network: false,
        inference: false,
      },
      now,
    });
    auditEntries.push(runAudit);
    outputEnvelope = buildFixtureOutputEnvelope({
      planId: input.planId,
      request: input.request,
      context: input.context,
      adapter,
      fixtureText: CONTRACT_TEST_FIXTURE_TEXT,
      latencyMs: 1,
      auditEventId: runAudit.id,
      now,
    });
  } else {
    outputEnvelope = buildNotExecutedOutputEnvelope({
      planId: input.planId,
      request: input.request,
      context: input.context,
      adapterId: adapter.adapterId,
      now,
    });
    outputEnvelope = {
      ...outputEnvelope,
      auditEventId: resolveAudit.id,
    };
  }

  return {
    resolution: {
      ok: true,
      adapterId: adapter.adapterId,
      providerId: adapter.providerId,
      negotiation,
      failureClass: null,
      retryable: false,
      auditEventId: resolveAudit.id,
      notes: "Adapter resolved — envelopes built; no live provider invoke.",
    },
    inputEnvelope,
    outputEnvelope,
    auditEntries,
    normalizedFailure: null,
  };
}
