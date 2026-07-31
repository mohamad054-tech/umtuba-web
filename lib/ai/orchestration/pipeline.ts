/**
 * AI Service Orchestration Pipeline V1.
 * Stage order: preflight → policy → quota → routing → invocation → postprocessing → audit.
 * No live inference / network / provider execution.
 */

import { getCapabilityCatalogRegistry } from "../catalog";
import { aiPolicyEvaluationEngine } from "../policy";
import {
  aiUsageQuotasBillingFoundation,
  resolveMeteringOrDefault,
} from "../usage/usageFoundation";
import { aiPolicyRegistry } from "../policy";
import type { AiCapabilityMeteringBinding } from "../usage/quotasBillingTypes";
import { aiOrchestrationStore } from "./store";
import {
  AI_ORCHESTRATION_FOUNDATION_VERSION,
  AI_PIPELINE_STAGES,
  type AiOrchestrationPipelineResult,
  type AiOrchestrationRequest,
  type AiPipelineOutcome,
  type AiPipelineStageId,
  type AiPipelineStageResult,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function stageBase(
  stageId: AiPipelineStageId,
  nowIso: string
): AiPipelineStageResult {
  return {
    stageId,
    status: "running",
    startedAt: nowIso,
    finishedAt: null,
    summary: "",
    details: {},
    stopReason: null,
    policyId: null,
  };
}

function finishStage(
  stage: AiPipelineStageResult,
  patch: Partial<AiPipelineStageResult>,
  nowIso: string
): AiPipelineStageResult {
  return {
    ...stage,
    ...patch,
    finishedAt: nowIso,
  };
}

export type AiServiceOrchestratorDeps = {
  now?: () => string;
  recordToStore?: boolean;
};

/**
 * Request Orchestrator — runs the unified Shared AI pre-execution pipeline.
 */
export class AiServiceOrchestrator {
  constructor(private readonly deps: AiServiceOrchestratorDeps = {}) {}

  orchestrate(input: AiOrchestrationRequest): AiOrchestrationPipelineResult {
    const nowIso = input.nowIso ?? this.deps.now?.() ?? new Date().toISOString();
    const requestId = input.requestId?.trim() || newId("req");
    const orchestrationId = newId("orch");
    const stages: AiPipelineStageResult[] = [];
    const appliedPolicyIds: string[] = [];
    let outcome: AiPipelineOutcome = "accepted";
    let stopReason: string | null = null;
    let currentStage: AiPipelineStageId | null = null;
    let routingPlan: AiOrchestrationPipelineResult["routingPlan"] = null;
    let invocationPlan: AiOrchestrationPipelineResult["invocationPlan"] = null;
    let metering: AiCapabilityMeteringBinding = resolveMeteringOrDefault(null);

    const halt = (
      stage: AiPipelineStageResult,
      nextOutcome: AiPipelineOutcome,
      reason: string
    ): void => {
      stages.push(
        finishStage(
          stage,
          {
            status: input.cancelRequested ? "cancelled" : "failed",
            summary: reason,
            stopReason: reason,
          },
          nowIso
        )
      );
      outcome = input.cancelRequested ? "rejected" : nextOutcome;
      stopReason = reason;
      currentStage = stage.stageId;
      // Mark remaining stages skipped
      const idx = AI_PIPELINE_STAGES.indexOf(stage.stageId);
      for (const id of AI_PIPELINE_STAGES.slice(idx + 1)) {
        if (id === "audit") continue;
        stages.push(
          finishStage(
            stageBase(id, nowIso),
            {
              status: "skipped",
              summary: "Skipped due to earlier stop.",
              stopReason: reason,
            },
            nowIso
          )
        );
      }
    };

    // 1) Preflight — Capability Catalog
    currentStage = "preflight";
    let pre = stageBase("preflight", nowIso);
    if (input.cancelRequested) {
      halt(pre, "rejected", "Cancellation requested before preflight.");
    } else {
      try {
        const entry = getCapabilityCatalogRegistry().requireExecutable(
          input.capabilityId
        );
        metering = resolveMeteringOrDefault(entry.metering);
        const binding = aiPolicyRegistry.getBinding(input.capabilityId);
        if (binding?.meteringQuotaPolicyId) {
          metering = {
            ...metering,
            quotaPolicyId: binding.meteringQuotaPolicyId,
          };
        }
        if (binding?.meteringBudgetPolicyId) {
          metering = {
            ...metering,
            budgetPolicyId: binding.meteringBudgetPolicyId,
          };
        }
        if (binding) appliedPolicyIds.push(binding.policyId);
        stages.push(
          finishStage(
            pre,
            {
              status: "passed",
              summary: "Capability catalog accepted executable capability.",
              details: {
                capabilityId: entry.capabilityId,
                lifecycle: entry.lifecycle,
                executionSurface: entry.executionSurface,
              },
              policyId: binding?.policyId ?? null,
            },
            nowIso
          )
        );
      } catch (err) {
        halt(
          pre,
          "rejected",
          err instanceof Error ? err.message : "Preflight rejected."
        );
      }
    }

    // 2) Policy
    if (!stopReason) {
      currentStage = "policy";
      let st = stageBase("policy", nowIso);
      if (input.cancelRequested) {
        halt(st, "rejected", "Cancellation requested at policy stage.");
      } else {
        const decision = aiPolicyEvaluationEngine.evaluate({
          capabilityId: input.capabilityId,
          tenantId: input.tenantId,
          userId: input.userId,
          providerId: input.providerId,
          runtimeId: input.runtimeId ?? "shared_ai_gateway",
          modelId: input.modelId,
          isAdmin: input.isAdmin,
          approvalGranted: input.approvalGranted,
          adminOverride: input.adminOverride,
          nowIso,
        });
        for (const id of Object.values(decision.snapshot)) {
          if (id) appliedPolicyIds.push(id);
        }
        if (decision.bindingPolicyId) {
          appliedPolicyIds.push(decision.bindingPolicyId);
        }
        if (decision.decision === "requires_approval") {
          halt(
            {
              ...st,
              details: { decision: decision.decision },
              policyId: decision.bindingPolicyId,
            },
            "requires_approval",
            decision.violations[0]?.message ?? "Policy requires approval."
          );
        } else if (!decision.allowed) {
          halt(
            {
              ...st,
              details: { decision: decision.decision },
              policyId: decision.bindingPolicyId,
            },
            decision.decision === "requires_admin_override"
              ? "blocked"
              : "blocked",
            decision.violations.find((v) => v.severity === "blocking")?.message ??
              "Policy blocked the request."
          );
        } else {
          stages.push(
            finishStage(
              st,
              {
                status: "passed",
                summary: `Policy decision: ${decision.decision}`,
                details: {
                  decision: decision.decision,
                  warnings: decision.warnings.length,
                },
                policyId: decision.bindingPolicyId,
              },
              nowIso
            )
          );
        }
      }
    }

    // 3) Quota
    if (!stopReason) {
      currentStage = "quota";
      let st = stageBase("quota", nowIso);
      if (input.cancelRequested) {
        halt(st, "rejected", "Cancellation requested at quota stage.");
      } else if (!input.userId) {
        halt(st, "blocked", "Quota stage requires authenticated user.");
      } else {
        try {
          const gate = aiUsageQuotasBillingFoundation.preflight({
            actor: {
              userId: input.userId,
              tenantId: input.tenantId,
              permissions: ["usage_record", "usage_read_self"],
            },
            capabilityId: input.capabilityId,
            metering,
            tenantId: input.tenantId,
            userId: input.userId,
            providerId: input.providerId,
            runtimeId: input.runtimeId,
            correlationId: input.correlationId ?? requestId,
            nowIso,
          });
          appliedPolicyIds.push(metering.quotaPolicyId, metering.budgetPolicyId);
          if (!gate.allowed) {
            halt(
              {
                ...st,
                details: {
                  decision: gate.decision,
                  remaining: gate.remainingAllowance,
                },
                policyId: metering.quotaPolicyId,
              },
              "blocked",
              gate.denialReason ?? "Quota or budget blocked the request."
            );
          } else {
            stages.push(
              finishStage(
                st,
                {
                  status: "passed",
                  summary: `Quota gate: ${gate.decision}`,
                  details: {
                    decision: gate.decision,
                    remaining: gate.remainingAllowance,
                  },
                  policyId: metering.quotaPolicyId,
                },
                nowIso
              )
            );
          }
        } catch (err) {
          halt(
            st,
            "blocked",
            err instanceof Error ? err.message : "Quota stage failed."
          );
        }
      }
    }

    // 4) Routing (plan only — no provider calls)
    if (!stopReason) {
      currentStage = "routing";
      let st = stageBase("routing", nowIso);
      if (input.cancelRequested) {
        halt(st, "rejected", "Cancellation requested at routing stage.");
      } else if (input.forceRoutingFailure) {
        halt(st, "rejected", "Routing stage forced failure.");
      } else {
        const entry = getCapabilityCatalogRegistry().lookup(input.capabilityId);
        const providerId =
          input.providerId ??
          entry?.supportedProviders.find((p) => p === "stub") ??
          entry?.supportedProviders[0] ??
          null;
        const runtimeId =
          input.runtimeId ??
          entry?.supportedRuntimes[0] ??
          "shared_ai_gateway";
        if (!providerId) {
          halt(st, "rejected", "No routable provider hint from catalog.");
        } else {
          routingPlan = {
            providerId,
            runtimeId,
            modelId: input.modelId ?? null,
            routeSource: "catalog_hint",
          };
          stages.push(
            finishStage(
              st,
              {
                status: "passed",
                summary: "Routing plan resolved from catalog hints (no live call).",
                details: {
                  providerId,
                  runtimeId,
                  modelId: input.modelId ?? null,
                },
              },
              nowIso
            )
          );
        }
      }
    }

    // 5) Invocation (plan only — adapter boundary not executed)
    if (!stopReason) {
      currentStage = "invocation";
      let st = stageBase("invocation", nowIso);
      if (input.cancelRequested) {
        halt(st, "rejected", "Cancellation requested at invocation stage.");
      } else if (input.forceInvocationFailure) {
        halt(st, "rejected", "Invocation planning forced failure.");
      } else {
        invocationPlan = {
          planned: true,
          executableNow: false,
          adapterBoundary: "not_invoked",
          note: "Invocation Orchestration / Adapter Boundary not executed in Foundation V1.",
        };
        stages.push(
          finishStage(
            st,
            {
              status: "passed",
              summary: "Invocation plan ready; no inference executed.",
              details: {
                planned: true,
                adapterBoundary: "not_invoked",
              },
            },
            nowIso
          )
        );
      }
    }

    // 6) Post-processing
    if (!stopReason) {
      currentStage = "postprocessing";
      let st = stageBase("postprocessing", nowIso);
      if (input.cancelRequested) {
        halt(st, "rejected", "Cancellation requested at post-processing.");
      } else {
        stages.push(
          finishStage(
            st,
            {
              status: "passed",
              summary: "Post-processing normalized orchestration metadata.",
              details: {
                stageCount: stages.length + 1,
                hasRoutingPlan: Boolean(routingPlan),
                hasInvocationPlan: Boolean(invocationPlan),
              },
            },
            nowIso
          )
        );
      }
    }

    // 7) Audit (always runs)
    currentStage = "audit";
    const audit = stageBase("audit", nowIso);
    if (!stopReason) {
      outcome = "ready_for_execution";
      stopReason = null;
    }
    stages.push(
      finishStage(
        audit,
        {
          status: "passed",
          summary: "Audit stage recorded orchestration decision.",
          details: {
            outcome,
            appliedPolicies: appliedPolicyIds.length,
          },
        },
        nowIso
      )
    );

    const result: AiOrchestrationPipelineResult = {
      orchestrationId,
      requestId,
      capabilityId: input.capabilityId,
      tenantId: input.tenantId,
      userId: input.userId,
      outcome,
      currentStage: stopReason
        ? stages.find((s) => s.stopReason)?.stageId ?? currentStage
        : "audit",
      stopReason,
      appliedPolicyIds: [...new Set(appliedPolicyIds)],
      stages,
      routingPlan,
      invocationPlan,
      version: AI_ORCHESTRATION_FOUNDATION_VERSION,
      createdAt: nowIso,
      finishedAt: nowIso,
    };

    if (this.deps.recordToStore !== false) {
      aiOrchestrationStore.record(result);
    }
    return result;
  }
}

export const aiServiceOrchestrator = new AiServiceOrchestrator();

export function orchestrateAiServiceRequest(
  input: AiOrchestrationRequest
): AiOrchestrationPipelineResult {
  return aiServiceOrchestrator.orchestrate(input);
}

export function resetAiOrchestrationFoundation(): void {
  aiOrchestrationStore.reset();
}

/** Result builder helper for consumers / admin view models. */
export function buildOrchestrationResultView(
  result: AiOrchestrationPipelineResult
): {
  outcome: AiPipelineOutcome;
  currentStage: AiPipelineStageId | null;
  stopReason: string | null;
  stageSummaries: Array<{
    stageId: AiPipelineStageId;
    status: string;
    summary: string;
    policyId: string | null;
  }>;
  readyForExecution: boolean;
} {
  return {
    outcome: result.outcome,
    currentStage: result.currentStage,
    stopReason: result.stopReason,
    stageSummaries: result.stages.map((s) => ({
      stageId: s.stageId,
      status: s.status,
      summary: s.summary,
      policyId: s.policyId,
    })),
    readyForExecution: result.outcome === "ready_for_execution",
  };
}
