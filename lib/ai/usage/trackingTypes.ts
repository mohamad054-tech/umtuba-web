/**
 * AI Core Usage & Cost Tracking Foundation V1 — contracts.
 * In-memory only. No DB. Not for UI exposure.
 */

export type AiUsageExecutionStatus = "completed" | "failed" | "blocked";

export type AiUsageCostStatus =
  | "provider_reported"
  | "estimated"
  | "unavailable"
  | "zero";

/**
 * Unified usage record for Shared AI Core.
 * Server-side only — do not send raw records to clients.
 */
export type AiUsageTrackingRecord = {
  requestId: string;
  capabilityId: string;
  providerId: string | null;
  modelId: string | null;
  executionStatus: AiUsageExecutionStatus;
  executionTimeMs: number;
  estimatedInputTokens: number | null;
  estimatedOutputTokens: number | null;
  estimatedCostMinor: number | null;
  costCurrency: string | null;
  costStatus: AiUsageCostStatus;
  timestamp: string;
  /** Internal attribution — never expose to UI. */
  userId: string | null;
  workspaceId: string | null;
};

export type AiUsageTrackingInput = {
  requestId: string;
  capabilityId: string;
  providerId?: string | null;
  modelId?: string | null;
  executionStatus: AiUsageExecutionStatus;
  executionTimeMs: number;
  estimatedInputTokens?: number | null;
  estimatedOutputTokens?: number | null;
  /** When known from provider; Cost Tracker may refine. */
  estimatedCostMinor?: number | null;
  costCurrency?: string | null;
  costStatus?: AiUsageCostStatus;
  timestamp?: string;
  userId?: string | null;
  workspaceId?: string | null;
  /** Optional model rates for Cost Tracker estimation (USD per 1M tokens). */
  inputCostPer1M?: number | null;
  outputCostPer1M?: number | null;
};

/**
 * Reserved extension points — noop in V1.
 */
export type AiUsageTrackingExtensionHooks = {
  onBilling?: (record: AiUsageTrackingRecord) => void;
  onQuota?: (record: AiUsageTrackingRecord) => void;
  onDashboard?: (record: AiUsageTrackingRecord) => void;
  onAnalytics?: (record: AiUsageTrackingRecord) => void;
  onTenantAccounting?: (record: AiUsageTrackingRecord) => void;
};

export function createNoopUsageTrackingExtensionHooks(): AiUsageTrackingExtensionHooks {
  return {
    onBilling: () => undefined,
    onQuota: () => undefined,
    onDashboard: () => undefined,
    onAnalytics: () => undefined,
    onTenantAccounting: () => undefined,
  };
}

/**
 * Safe aggregate for admin/diagnostics — no user/provider secrets.
 * Still not a client contract.
 */
export type AiUsagePublicAggregate = {
  requests: number;
  completed: number;
  failed: number;
  blocked: number;
  totalEstimatedInputTokens: number;
  totalEstimatedOutputTokens: number;
  totalEstimatedCostMinor: number;
  costUnavailableRequests: number;
};
