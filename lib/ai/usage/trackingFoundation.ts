/**
 * Usage & Cost Tracking Foundation — facade used after AI execution.
 * Bridges new trackers with legacy AiUsageRecord accounting (compat).
 */

import type { AiUsageRecord } from "../contracts/types";
import { buildUsageRecord, recordUsage } from "./accounting";
import { aiCostTracker } from "./costTracker";
import { aiUsageTracker } from "./usageTracker";
import {
  createNoopUsageTrackingExtensionHooks,
  type AiUsageTrackingExtensionHooks,
  type AiUsageTrackingInput,
  type AiUsageTrackingRecord,
} from "./trackingTypes";

let hooks: AiUsageTrackingExtensionHooks =
  createNoopUsageTrackingExtensionHooks();

export function setUsageTrackingExtensionHooks(
  next: AiUsageTrackingExtensionHooks
): void {
  hooks = {
    ...createNoopUsageTrackingExtensionHooks(),
    ...next,
  };
}

export function resetUsageTrackingFoundation(): void {
  aiUsageTracker.reset();
  hooks = createNoopUsageTrackingExtensionHooks();
}

function invokeExtensions(record: AiUsageTrackingRecord): void {
  hooks.onBilling?.(record);
  hooks.onQuota?.(record);
  hooks.onDashboard?.(record);
  hooks.onAnalytics?.(record);
  hooks.onTenantAccounting?.(record);
}

/**
 * Record usage + cost after execution only.
 * Idempotent per requestId (fail-closed on duplicate).
 * Also mirrors into legacy in-memory accounting for diagnostics.
 */
export function recordUsageAfterExecution(
  input: AiUsageTrackingInput
): AiUsageTrackingRecord {
  const cost = aiCostTracker.estimate({
    estimatedInputTokens: input.estimatedInputTokens,
    estimatedOutputTokens: input.estimatedOutputTokens,
    reportedCostMinor: input.estimatedCostMinor,
    costCurrency: input.costCurrency,
    costStatus: input.costStatus,
    inputCostPer1M: input.inputCostPer1M,
    outputCostPer1M: input.outputCostPer1M,
  });

  const record: AiUsageTrackingRecord = {
    requestId: input.requestId,
    capabilityId: input.capabilityId,
    providerId: input.providerId ?? null,
    modelId: input.modelId ?? null,
    executionStatus: input.executionStatus,
    executionTimeMs: input.executionTimeMs,
    estimatedInputTokens: input.estimatedInputTokens ?? null,
    estimatedOutputTokens: input.estimatedOutputTokens ?? null,
    estimatedCostMinor: cost.estimatedCostMinor,
    costCurrency: cost.costCurrency,
    costStatus: cost.costStatus,
    timestamp: input.timestamp ?? new Date().toISOString(),
    userId: input.userId ?? null,
    workspaceId: input.workspaceId ?? null,
  };

  const stored = aiUsageTracker.record(record);
  invokeExtensions(stored);

  // Legacy mirror — keeps admin diagnostics / run lifecycle working.
  if (stored.userId && stored.executionStatus === "completed") {
    const legacy: AiUsageRecord = buildUsageRecord({
      partial: {
        inputTokens: stored.estimatedInputTokens,
        outputTokens: stored.estimatedOutputTokens,
        cachedTokens: null,
        audioUnits: null,
        imageUnits: null,
        costMinor: stored.estimatedCostMinor,
        costCurrency: stored.costCurrency,
        costStatus:
          stored.costStatus === "zero"
            ? "estimated"
            : stored.costStatus === "unavailable"
              ? "unavailable"
              : stored.costStatus,
        modelId: stored.modelId ?? "unknown",
        providerId: stored.providerId ?? "unknown",
      },
      capabilityId: stored.capabilityId,
      userId: stored.userId,
      workspaceId: stored.workspaceId,
      runId: stored.requestId,
    });
    recordUsage(legacy);
  }

  return stored;
}

/**
 * Record from aiService after a capability returns.
 * Skips if this requestId was already tracked (e.g. by gateway).
 */
export function recordAiServiceUsageAfterExecution(
  input: AiUsageTrackingInput
): AiUsageTrackingRecord | null {
  if (aiUsageTracker.has(input.requestId)) {
    return aiUsageTracker.get(input.requestId);
  }
  return recordUsageAfterExecution(input);
}

export function listTrackedUsage(limit = 50): AiUsageTrackingRecord[] {
  return aiUsageTracker.listRecent(limit);
}

export { aiUsageTracker, aiCostTracker };
