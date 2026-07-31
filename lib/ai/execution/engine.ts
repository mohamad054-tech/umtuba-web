/**
 * Unified Capability Execution Engine V1.
 * Single entry for Shared AI capability pre-execution chain.
 * Does not call Gemini/OpenAI/Local LLM or perform live inference.
 */

import { orchestrateAiServiceRequest } from "../orchestration";
import { aiUnifiedExecutionStore } from "./store";
import {
  AI_UNIFIED_EXECUTION_VERSION,
  type AiUnifiedCapabilityExecutionResult,
  type AiUnifiedContext,
  type AiUnifiedError,
  type AiUnifiedErrorCode,
  type AiUnifiedExecutionState,
  type AiUnifiedRequest,
  type AiUnifiedResultKind,
  type AiUnifiedTraceEvent,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapOutcomeToResult(
  outcome: string
): AiUnifiedResultKind {
  switch (outcome) {
    case "ready_for_execution":
      return "ready_for_execution";
    case "requires_approval":
      return "requires_approval";
    case "blocked":
      return "blocked";
    case "rejected":
      return "rejected";
    case "accepted":
      return "success";
    default:
      return "rejected";
  }
}

function mapOutcomeToState(
  outcome: string,
  stopStage: string | null
): AiUnifiedExecutionState {
  if (outcome === "ready_for_execution") return "execution_ready";
  if (outcome === "requires_approval") return "blocked";
  if (outcome === "blocked") {
    if (stopStage === "quota") return "blocked";
    if (stopStage === "policy") return "blocked";
    return "blocked";
  }
  if (outcome === "rejected") {
    if (stopStage === "preflight") return "rejected";
    return "rejected";
  }
  return "rejected";
}

function errorFor(
  code: AiUnifiedErrorCode,
  message: string,
  stage: AiUnifiedExecutionState | null,
  retryable = false
): AiUnifiedError {
  return { code, message, stage, retryable };
}

export type UnifiedExecutionEngineDeps = {
  now?: () => string;
  recordToStore?: boolean;
};

/**
 * Canonical Unified Capability Execution entry.
 * All Shared AI capability requests should pass through this engine
 * before any domain runner / gateway dispatch.
 */
export class AiUnifiedCapabilityExecutionEngine {
  constructor(private readonly deps: UnifiedExecutionEngineDeps = {}) {}

  execute(input: AiUnifiedRequest): AiUnifiedCapabilityExecutionResult {
    const started = Date.now();
    const nowIso = input.nowIso ?? this.deps.now?.() ?? new Date().toISOString();
    const requestId = input.requestId?.trim() || newId("ureq");
    const executionId = newId("uex");
    const trace: AiUnifiedTraceEvent[] = [];

    const push = (state: AiUnifiedExecutionState, summary: string) => {
      trace.push({ at: nowIso, state, summary });
    };

    push("received", "Unified request received.");

    const context: AiUnifiedContext = {
      requestId,
      executionId,
      tenantId: input.tenantId,
      userId: input.userId,
      capabilityId: input.capabilityId,
      correlationId: input.correlationId ?? null,
      surface: input.surface ?? null,
      productDomain: input.productDomain ?? null,
      receivedAt: nowIso,
    };

    if (!input.capabilityId?.trim()) {
      return this.finalize({
        executionId,
        requestId,
        context,
        state: "rejected",
        result: "rejected",
        error: errorFor(
          "invalid_request",
          "capabilityId is required.",
          "rejected"
        ),
        orchestration: null,
        routing: null,
        adapter: {
          boundary: "blocked",
          note: "Skipped — invalid request.",
        },
        invocation: {
          status: "blocked",
          note: "Skipped — invalid request.",
        },
        appliedPolicyIds: [],
        stopReason: "capabilityId is required.",
        trace,
        started,
        nowIso,
      });
    }

    if (!input.tenantId?.trim()) {
      return this.finalize({
        executionId,
        requestId,
        context,
        state: "rejected",
        result: "rejected",
        error: errorFor("invalid_request", "tenantId is required.", "rejected"),
        orchestration: null,
        routing: null,
        adapter: {
          boundary: "blocked",
          note: "Skipped — invalid request.",
        },
        invocation: {
          status: "blocked",
          note: "Skipped — invalid request.",
        },
        appliedPolicyIds: [],
        stopReason: "tenantId is required.",
        trace,
        started,
        nowIso,
      });
    }

    push("validated", "Unified request/context validated.");

    const orchestration = orchestrateAiServiceRequest({
      requestId,
      capabilityId: input.capabilityId,
      tenantId: input.tenantId,
      userId: input.userId,
      providerId: input.providerId,
      runtimeId: input.runtimeId ?? "shared_ai_gateway",
      modelId: input.modelId,
      correlationId: input.correlationId ?? requestId,
      cancelRequested: input.cancelRequested,
      approvalGranted: input.approvalGranted,
      adminOverride: input.adminOverride,
      isAdmin: input.isAdmin,
      nowIso,
    });

    // Derive intermediate states from orchestration stage outcomes.
    const stageMap = new Map(
      orchestration.stages.map((s) => [s.stageId, s] as const)
    );
    if (stageMap.get("policy")?.status === "passed") {
      push("policy_checked", "Policy stage passed via orchestration.");
    }
    if (stageMap.get("quota")?.status === "passed") {
      push("quota_checked", "Quota stage passed via orchestration.");
    }
    if (stageMap.get("routing")?.status === "passed") {
      push("routed", "Routing plan resolved via orchestration.");
    }
    if (stageMap.get("invocation")?.status === "passed") {
      push("invocation_ready", "Invocation plan ready (not executed).");
    }

    const resultKind = mapOutcomeToResult(orchestration.outcome);
    const state = mapOutcomeToState(
      orchestration.outcome,
      orchestration.currentStage
    );

    if (resultKind === "ready_for_execution") {
      push("execution_ready", "Unified pipeline ready for execution (no inference).");
    } else if (resultKind === "blocked" || resultKind === "requires_approval") {
      push("blocked", orchestration.stopReason ?? "Pipeline blocked.");
    } else {
      push("rejected", orchestration.stopReason ?? "Pipeline rejected.");
    }

    const adapter =
      resultKind === "ready_for_execution"
        ? {
            boundary: "ready" as const,
            note: "Adapter Boundary acknowledged; no provider adapter invoked.",
          }
        : {
            boundary: "blocked" as const,
            note: "Adapter Boundary not entered due to pipeline stop.",
          };

    const invocation =
      resultKind === "ready_for_execution"
        ? {
            status: "ready" as const,
            note: "Invocation Orchestration planned; no live invocation.",
          }
        : {
            status: "blocked" as const,
            note: "Invocation not entered due to pipeline stop.",
          };

    let error: AiUnifiedError | null = null;
    if (resultKind !== "ready_for_execution" && resultKind !== "success") {
      const code: AiUnifiedErrorCode =
        resultKind === "requires_approval"
          ? "policy_denied"
          : orchestration.currentStage === "quota"
            ? "quota_denied"
            : orchestration.currentStage === "policy"
              ? "policy_denied"
              : orchestration.currentStage === "routing"
                ? "routing_failed"
                : orchestration.currentStage === "preflight"
                  ? "capability_unknown"
                  : input.cancelRequested
                    ? "cancelled"
                    : "pipeline_rejected";
      error = errorFor(
        code,
        orchestration.stopReason ?? `Unified execution ${resultKind}.`,
        state,
        false
      );
    }

    return this.finalize({
      executionId,
      requestId,
      context,
      state,
      result: resultKind,
      error,
      orchestration,
      routing: orchestration.routingPlan
        ? {
            providerId: orchestration.routingPlan.providerId,
            runtimeId: orchestration.routingPlan.runtimeId,
            modelId: orchestration.routingPlan.modelId,
          }
        : null,
      adapter,
      invocation,
      appliedPolicyIds: orchestration.appliedPolicyIds,
      stopReason: orchestration.stopReason,
      trace,
      started,
      nowIso,
    });
  }

  private finalize(input: {
    executionId: string;
    requestId: string;
    context: AiUnifiedContext;
    state: AiUnifiedExecutionState;
    result: AiUnifiedResultKind;
    error: AiUnifiedError | null;
    orchestration: AiUnifiedCapabilityExecutionResult["orchestration"];
    routing: AiUnifiedCapabilityExecutionResult["routing"];
    adapter: AiUnifiedCapabilityExecutionResult["adapter"];
    invocation: AiUnifiedCapabilityExecutionResult["invocation"];
    appliedPolicyIds: string[];
    stopReason: string | null;
    trace: AiUnifiedTraceEvent[];
    started: number;
    nowIso: string;
  }): AiUnifiedCapabilityExecutionResult {
    const stages = input.orchestration?.stages ?? [];
    const metrics = {
      totalStages: stages.length,
      passedStages: stages.filter((s) => s.status === "passed").length,
      failedStages: stages.filter((s) => s.status === "failed").length,
      skippedStages: stages.filter((s) => s.status === "skipped").length,
      durationMs: Math.max(0, Date.now() - input.started),
      policyCount: input.appliedPolicyIds.length,
    };

    const audit = {
      auditId: newId("uaud"),
      executionId: input.executionId,
      requestId: input.requestId,
      capabilityId: input.context.capabilityId,
      tenantId: input.context.tenantId,
      userId: input.context.userId,
      result: input.result,
      state: input.state,
      stopReason: input.stopReason,
      appliedPolicyIds: input.appliedPolicyIds,
      createdAt: input.nowIso,
    };

    const result: AiUnifiedCapabilityExecutionResult = {
      executionId: input.executionId,
      requestId: input.requestId,
      context: input.context,
      state: input.state,
      result: input.result,
      error: input.error,
      orchestration: input.orchestration,
      routing: input.routing,
      adapter: input.adapter,
      invocation: input.invocation,
      audit,
      metrics,
      trace: input.trace,
      version: AI_UNIFIED_EXECUTION_VERSION,
      createdAt: input.context.receivedAt,
      finishedAt: input.nowIso,
    };

    if (this.deps.recordToStore !== false) {
      aiUnifiedExecutionStore.record(result);
    }
    return result;
  }
}

export const aiUnifiedCapabilityExecutionEngine =
  new AiUnifiedCapabilityExecutionEngine();

/**
 * Single Shared AI capability entry for unified pre-execution.
 */
export function executeUnifiedCapability(
  input: AiUnifiedRequest
): AiUnifiedCapabilityExecutionResult {
  return aiUnifiedCapabilityExecutionEngine.execute(input);
}

export function resetUnifiedCapabilityExecution(): void {
  aiUnifiedExecutionStore.reset();
}

export function isUnifiedExecutionReady(
  result: AiUnifiedCapabilityExecutionResult
): boolean {
  return (
    result.result === "ready_for_execution" || result.result === "success"
  );
}
