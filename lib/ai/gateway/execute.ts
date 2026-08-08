import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAiPlatformConfig, type AiPlatformConfig } from "../config";
import {
  assertCapabilityAllowed,
  buildTrustedContext,
  estimateContextChars,
} from "../context/envelope";
import { AiPlatformError, failResult, sanitizeAiErrorMessage } from "../contracts/errors";
import {
  evaluateProductDraftSuggestion,
  recordEvaluation,
} from "../evaluations/hooks";
import {
  completeRun,
  createRun,
  failRun,
  updateRunStatus,
} from "../runs/lifecycle";
import { resolvePrompt, validateStructuredAgainstPrompt } from "../prompts/registry";
import { createProviderFoundation } from "../providers/foundation";
import { createRoutingPolicyEngine } from "../routing/policyEngine";
import {
  assertRateLimit,
  runPostExecutionPolicy,
  runPreExecutionPolicy,
} from "../safety/hooks";
import {
  assertSessionWorkspace,
  attachRunToSession,
  getAiSessionForUser,
} from "../sessions/session";
import { appendTraceEvent } from "../tracing/events";
import type {
  AiGatewayRequest,
  AiGatewaySuccess,
  AiResult,
  AiToolCallSummary,
  AiUsageRecord,
} from "../contracts/types";
import { buildUsageRecord } from "../usage/accounting";
import { recordUsageAfterExecution } from "../usage/trackingFoundation";
import { invokeTool } from "../tools/registry";

export type AiGatewayDeps = {
  config?: AiPlatformConfig;
  supabase?: SupabaseClient | null;
  /** Server-resolved permissions for tools. */
  permissions?: string[];
  /** Whether the authenticated user may use the capability. */
  capabilityEligible?: boolean;
};

function ensureToolsInstalled(): void {
  // Tools are installed from productDraftAssistant / bootstrap.
}

export async function executeAiGateway(
  authenticatedUserId: string | null,
  request: AiGatewayRequest,
  deps: AiGatewayDeps = {}
): Promise<AiResult<AiGatewaySuccess>> {
  const started = Date.now();
  const config = deps.config ?? loadAiPlatformConfig();
  ensureToolsInstalled();

  if (!authenticatedUserId) {
    return failResult("unauthenticated", "Authentication required.");
  }

  let runId: string | null = null;
  let traceId = request.context.traceId ?? cryptoRandom();

  try {
    if (request._test?.forceStub) {
      // keep going with stub config override below
    } else if (config.mode === "disabled") {
      return failResult(
        "no_provider_configured",
        "AI platform is not configured."
      );
    }

    const effectiveConfig =
      request._test?.forceStub
        ? loadAiPlatformConfig({
            ...config,
            mode: "stub",
            allowStub: true,
          })
        : config;

    assertRateLimit({
      userId: authenticatedUserId,
      capabilityId: String(request.capabilityId),
      limitPerMinute: effectiveConfig.rateLimitPerMinute,
      nowMs: request._test?.nowMs,
      bypass: request._test?.bypassRateLimit,
    });

    const prompt = resolvePrompt({
      promptId: request.promptId,
      version: request.promptVersion,
    });

    if (prompt.capabilityId !== request.capabilityId) {
      throw new AiPlatformError(
        "invalid_input",
        "Prompt does not match capability."
      );
    }

    const context = buildTrustedContext({
      userId: authenticatedUserId,
      productDomain: request.context.productDomain,
      surface: request.context.surface,
      dataClassification: request.context.dataClassification,
      allowedCapabilities:
        request.context.allowedCapabilities ?? [String(request.capabilityId)],
      allowedToolIds:
        request.allowedToolIds ??
        request.context.allowedToolIds ??
        prompt.allowedTools,
      workspaceId: request.context.workspaceId,
      storeId: request.context.storeId,
      courseId: request.context.courseId,
      projectId: request.context.projectId,
      role: request.context.role,
      locale: request.context.locale,
      timezone: request.context.timezone,
      sessionId: request.sessionId ?? request.context.sessionId,
      conversationId: request.context.conversationId,
      resourceRefs: request.context.resourceRefs,
      traceId,
    });
    traceId = context.traceId;
    assertCapabilityAllowed(context, String(request.capabilityId));

    if (context.sessionId) {
      const session = getAiSessionForUser(context.sessionId, authenticatedUserId);
      assertSessionWorkspace(session, context.workspaceId ?? context.storeId);
    }

    const run = createRun({
      traceId,
      userId: authenticatedUserId,
      capabilityId: String(request.capabilityId),
      promptId: prompt.promptId,
      promptVersion: prompt.version,
      sessionId: context.sessionId,
      dataClassification: context.dataClassification,
    });
    runId = run.id;

    await appendTraceEvent({
      runId,
      traceId,
      type: "gateway_receipt",
      summary: "Gateway accepted request",
      detail: {
        capabilityId: request.capabilityId,
        promptId: prompt.promptId,
      },
      dataClassification: context.dataClassification,
    });

    updateRunStatus(runId, "validated");
    await appendTraceEvent({
      runId,
      traceId,
      type: "prompt_resolution",
      summary: `Resolved prompt ${prompt.promptId}@${prompt.version}`,
      detail: { version: prompt.version, status: prompt.status },
      dataClassification: context.dataClassification,
    });

    const safetyPre = runPreExecutionPolicy({
      request,
      prompt,
      config: effectiveConfig,
      userId: authenticatedUserId,
      eligible: deps.capabilityEligible !== false,
    });

    const foundation = createProviderFoundation(effectiveConfig);
    const routingPolicy = createRoutingPolicyEngine(foundation);

    const contextChars = estimateContextChars([
      prompt.systemInstructions,
      request.userInput,
      JSON.stringify(request.context.resourceRefs ?? []),
    ]);
    if (contextChars > effectiveConfig.maxContextChars) {
      throw new AiPlatformError("context_too_large", "Context exceeds limit.");
    }

    const route = routingPolicy.resolve({
      capabilityId: String(request.capabilityId),
      requiredModality: "text",
      requiresStructuredOutput: request.outputMode === "structured_json",
      requiresTools: (request.allowedToolIds ?? []).length > 0 && false,
      estimatedContextTokens: Math.ceil(contextChars / 4),
      dataClassification: context.dataClassification,
      requiredCapabilityClass:
        request.outputMode === "structured_json" ? "structured" : undefined,
      preferredModel:
        request.preferredProviderHint && request.preferredModelHint
          ? {
              providerId: request.preferredProviderHint,
              modelId: request.preferredModelHint,
            }
          : undefined,
      allowFallback: true,
      routingHints: {
        preferCost: "economy",
        preferLatency: "standard",
      },
    });

    updateRunStatus(runId, "routed", {
      providerId: route.providerId,
      modelId: route.modelId,
    });
    await appendTraceEvent({
      runId,
      traceId,
      type: "route_decision",
      summary: `Routed to ${route.providerId}/${route.modelId}`,
      detail: { ...route },
      dataClassification: context.dataClassification,
    });
    if (route.fallbackUsed) {
      await appendTraceEvent({
        runId,
        traceId,
        type: "provider_fallback",
        summary: "Fallback model selected",
        detail: { ...route },
        dataClassification: context.dataClassification,
      });
    }

    const toolCalls: AiToolCallSummary[] = [];
    const toolAllowlist = context.allowedToolIds.filter((id) =>
      prompt.allowedTools.includes(id)
    );
    const permissions = deps.permissions ?? [];

    // Optional read-only tool enrichment (bounded).
    for (const toolId of toolAllowlist.slice(0, 2)) {
      if (
        toolId !== "read_product_draft" &&
        toolId !== "read_seller_store_summary" &&
        toolId !== "read_user_profile_preferences"
      ) {
        continue;
      }
      updateRunStatus(runId, "tool_executing");
      await appendTraceEvent({
        runId,
        traceId,
        type: "tool_call_request",
        summary: `Tool request ${toolId}`,
        detail: { toolId },
        dataClassification: context.dataClassification,
      });
      try {
        const args: Record<string, unknown> = {};
        if (toolId === "read_product_draft") {
          const productRef = context.resourceRefs?.find(
            (r) => r.type === "product"
          );
          if (!productRef) continue;
          args.productId = productRef.id;
        }
        if (toolId === "read_seller_store_summary") {
          if (!context.storeId) continue;
          args.storeId = context.storeId;
        }
        await appendTraceEvent({
          runId,
          traceId,
          type: "tool_call_authorization",
          summary: `Authorized tool ${toolId}`,
          detail: { toolId },
          dataClassification: context.dataClassification,
        });
        const result = await invokeTool({
          toolId,
          args,
          userId: authenticatedUserId,
          storeId: context.storeId,
          permissions,
          allowlist: toolAllowlist,
        });
        if (!result.ok) {
          throw new AiPlatformError("tool_failure", result.message);
        }
        toolCalls.push({ toolId, authorized: true, success: true });
        await appendTraceEvent({
          runId,
          traceId,
          type: "tool_result",
          summary: `Tool ok ${toolId}`,
          detail: { toolId, keys: Object.keys(result.data) },
          dataClassification: context.dataClassification,
        });
        request = {
          ...request,
          userInput: `${request.userInput}\n\nTrusted tool context (${toolId}): ${JSON.stringify(result.data)}`,
        };
      } catch (error) {
        const message =
          error instanceof AiPlatformError
            ? error.message
            : "Tool failed";
        toolCalls.push({
          toolId,
          authorized: false,
          success: false,
          message,
        });
        await appendTraceEvent({
          runId,
          traceId,
          type: "tool_result",
          summary: `Tool failed ${toolId}`,
          detail: { toolId, message },
          dataClassification: context.dataClassification,
        });
      }
    }

    updateRunStatus(runId, "executing");
    const adapter = foundation.requireAdapter(route.providerId);
    const model = foundation.requireEnabledModel(
      route.providerId,
      route.modelId
    );
    await appendTraceEvent({
      runId,
      traceId,
      type: "provider_attempt",
      summary: `Provider attempt ${route.providerId}`,
      detail: { modelId: route.modelId },
      dataClassification: context.dataClassification,
    });

    const providerResult = await adapter.execute({
      providerId: route.providerId,
      modelId: route.modelId,
      messages: [
        { role: "system", content: prompt.systemInstructions },
        { role: "user", content: request.userInput },
      ],
      structured: request.outputMode === "structured_json",
      timeoutMs: model.defaultTimeoutMs ?? effectiveConfig.defaultTimeoutMs,
      userId: authenticatedUserId,
      runId,
      capabilityId: String(request.capabilityId),
      workspaceId: context.workspaceId ?? context.storeId ?? null,
    });

    let structured = providerResult.structured;
    let text = providerResult.text;
    if (request.outputMode === "structured_json") {
      const validated = validateStructuredAgainstPrompt(
        prompt,
        structured ?? (text ? safeJson(text) : null)
      );
      if (!validated.ok) {
        throw new AiPlatformError(
          "invalid_structured_output",
          validated.message
        );
      }
      structured = validated.data;
      text = null;
    }

    const safetyPost = runPostExecutionPolicy({
      prompt,
      text,
      structured,
    });

    const tracked = recordUsageAfterExecution({
      requestId: runId,
      capabilityId: String(request.capabilityId),
      providerId: route.providerId,
      modelId: route.modelId,
      executionStatus: "completed",
      executionTimeMs: Date.now() - started,
      estimatedInputTokens: providerResult.usage.inputTokens,
      estimatedOutputTokens: providerResult.usage.outputTokens,
      estimatedCostMinor: providerResult.usage.costMinor,
      costCurrency: providerResult.usage.costCurrency,
      costStatus:
        providerResult.usage.costStatus === "provider_reported" ||
        providerResult.usage.costStatus === "estimated" ||
        providerResult.usage.costStatus === "unavailable"
          ? providerResult.usage.costStatus
          : "estimated",
      userId: authenticatedUserId,
      workspaceId: context.workspaceId ?? context.storeId ?? null,
    });

    const usage: AiUsageRecord = buildUsageRecord({
      partial: {
        inputTokens: tracked.estimatedInputTokens,
        outputTokens: tracked.estimatedOutputTokens,
        cachedTokens: providerResult.usage.cachedTokens,
        audioUnits: providerResult.usage.audioUnits,
        imageUnits: providerResult.usage.imageUnits,
        costMinor: tracked.estimatedCostMinor,
        costCurrency: tracked.costCurrency,
        costStatus:
          tracked.costStatus === "zero"
            ? "estimated"
            : tracked.costStatus === "unavailable"
              ? "unavailable"
              : tracked.costStatus,
        modelId: route.modelId,
        providerId: route.providerId,
      },
      capabilityId: String(request.capabilityId),
      userId: authenticatedUserId,
      workspaceId: context.workspaceId ?? context.storeId ?? null,
      runId,
    });

    completeRun({
      runId,
      providerId: route.providerId,
      modelId: route.modelId,
      usage,
      safety: safetyPost,
      toolCalls,
    });
    if (context.sessionId) {
      attachRunToSession(context.sessionId, runId);
    }

    if (prompt.promptId === "commerce.product_draft_assistant" && structured) {
      const evalResult = evaluateProductDraftSuggestion(structured);
      recordEvaluation({
        runId,
        promptId: prompt.promptId,
        promptVersion: prompt.version,
        modelId: route.modelId,
        capabilityId: String(request.capabilityId),
        runOutcome: "completed",
        schemaValid: evalResult.schemaValid,
        toolSuccess:
          toolCalls.length === 0
            ? null
            : toolCalls.every((t) => t.success),
        latencyMs: Date.now() - started,
        safetyOutcome: "allowed",
        userFeedback: null,
        testCaseId: "product_draft_reference",
        score: evalResult.score,
      });
    }

    await appendTraceEvent({
      runId,
      traceId,
      type: "completion",
      summary: "Run completed",
      detail: { latencyMs: Date.now() - started },
      dataClassification: context.dataClassification,
    });

    void safetyPre;

    return {
      ok: true,
      data: {
        runId,
        traceId,
        status: "completed",
        outputMode: request.outputMode,
        text,
        structured,
        providerId: route.providerId,
        modelId: route.modelId,
        promptId: prompt.promptId,
        promptVersion: prompt.version,
        route,
        usage,
        safety: safetyPost,
        toolCalls,
        latencyMs: Date.now() - started,
      },
    };
  } catch (error) {
    const code =
      error instanceof AiPlatformError ? error.code : "provider_error";
    const message = sanitizeAiErrorMessage(
      error instanceof Error ? error.message : "AI gateway failure"
    );
    if (runId) {
      const status =
        code === "safety_block" || code === "permission_denied"
          ? "blocked"
          : "failed";
      failRun({ runId, status, code, message });
      try {
        recordUsageAfterExecution({
          requestId: runId,
          capabilityId: String(request.capabilityId),
          providerId: null,
          modelId: null,
          executionStatus: status === "blocked" ? "blocked" : "failed",
          executionTimeMs: Date.now() - started,
          estimatedInputTokens: null,
          estimatedOutputTokens: null,
          estimatedCostMinor: null,
          costStatus: "unavailable",
          userId: authenticatedUserId,
          workspaceId:
            request.context.workspaceId ?? request.context.storeId ?? null,
        });
      } catch {
        // Tracking must not mask the original failure.
      }
      await appendTraceEvent({
        runId,
        traceId,
        type: code === "safety_block" ? "safety_block" : "failure",
        summary: message,
        detail: { code },
        dataClassification: request.context.dataClassification,
      });
    }
    return failResult(code, message);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cryptoRandom(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
