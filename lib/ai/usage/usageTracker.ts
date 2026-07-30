/**
 * Independent Usage Tracker — in-memory Foundation (no DB).
 */

import { AiPlatformError } from "../contracts/errors";
import type {
  AiUsagePublicAggregate,
  AiUsageTrackingRecord,
} from "./trackingTypes";

const MAX = 2000;

export class AiUsageTracker {
  private readonly records: AiUsageTrackingRecord[] = [];
  private readonly byRequestId = new Map<string, AiUsageTrackingRecord>();

  reset(): void {
    this.records.length = 0;
    this.byRequestId.clear();
  }

  /**
   * Idempotent by requestId — re-recording the same id is rejected (fail-closed).
   */
  record(record: AiUsageTrackingRecord): AiUsageTrackingRecord {
    const requestId = record.requestId.trim();
    if (!requestId) {
      throw new AiPlatformError("invalid_input", "requestId is required.");
    }
    if (!record.capabilityId.trim()) {
      throw new AiPlatformError("invalid_input", "capabilityId is required.");
    }
    if (this.byRequestId.has(requestId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Usage already recorded for request: ${requestId}`
      );
    }
    if (
      !Number.isFinite(record.executionTimeMs) ||
      record.executionTimeMs < 0
    ) {
      throw new AiPlatformError(
        "invalid_input",
        "executionTimeMs must be a non-negative finite number."
      );
    }

    const stored: AiUsageTrackingRecord = {
      ...record,
      requestId,
      capabilityId: record.capabilityId.trim(),
    };
    this.records.push(stored);
    this.byRequestId.set(requestId, stored);
    if (this.records.length > MAX) {
      const dropped = this.records.shift();
      if (dropped) this.byRequestId.delete(dropped.requestId);
    }
    return stored;
  }

  get(requestId: string): AiUsageTrackingRecord | null {
    return this.byRequestId.get(requestId) ?? null;
  }

  has(requestId: string): boolean {
    return this.byRequestId.has(requestId);
  }

  listRecent(limit = 50): AiUsageTrackingRecord[] {
    return this.records.slice(-limit);
  }

  aggregate(limit = 200): AiUsagePublicAggregate {
    const slice = this.records.slice(-limit);
    let completed = 0;
    let failed = 0;
    let blocked = 0;
    let totalEstimatedInputTokens = 0;
    let totalEstimatedOutputTokens = 0;
    let totalEstimatedCostMinor = 0;
    let costUnavailableRequests = 0;
    for (const row of slice) {
      if (row.executionStatus === "completed") completed += 1;
      else if (row.executionStatus === "failed") failed += 1;
      else blocked += 1;
      totalEstimatedInputTokens += row.estimatedInputTokens ?? 0;
      totalEstimatedOutputTokens += row.estimatedOutputTokens ?? 0;
      if (row.costStatus === "unavailable" || row.estimatedCostMinor == null) {
        costUnavailableRequests += 1;
      } else {
        totalEstimatedCostMinor += row.estimatedCostMinor;
      }
    }
    return {
      requests: slice.length,
      completed,
      failed,
      blocked,
      totalEstimatedInputTokens,
      totalEstimatedOutputTokens,
      totalEstimatedCostMinor,
      costUnavailableRequests,
    };
  }
}

/** Process-local singleton for Shared AI Core. */
export const aiUsageTracker = new AiUsageTracker();
