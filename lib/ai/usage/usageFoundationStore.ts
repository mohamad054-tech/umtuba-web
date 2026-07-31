/**
 * Process-local Source of Truth for Usage/Quotas/Billing Foundation V1.
 * Shared AI layer — not Private AI registry. No SQL migration in V1.
 */

import { AiPlatformError } from "../contracts/errors";
import {
  buildDefaultBudgetPolicies,
  buildDefaultCostPolicies,
  buildDefaultExemptions,
  buildDefaultQuotaPolicies,
} from "./policyFixtures";
import type {
  AiBudgetPolicy,
  AiCostEstimationPolicy,
  AiQuotaPolicy,
  AiUsageEvent,
  AiUsageExemption,
  AiUsageFoundationState,
} from "./quotasBillingTypes";
import { AI_USAGE_FOUNDATION_SCHEMA_VERSION } from "./quotasBillingTypes";

const MAX_EVENTS = 5000;

function emptyState(): AiUsageFoundationState {
  return {
    schemaVersion: AI_USAGE_FOUNDATION_SCHEMA_VERSION,
    usageEvents: [],
    quotaPolicies: buildDefaultQuotaPolicies(),
    budgetPolicies: buildDefaultBudgetPolicies(),
    costPolicies: buildDefaultCostPolicies(),
    exemptions: buildDefaultExemptions(),
    preflightDenials: [],
  };
}

/** Normalize older snapshots to current schema (backward compatible). */
export function normalizeUsageFoundationState(
  raw: Partial<AiUsageFoundationState> | null | undefined
): AiUsageFoundationState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const version = Number(raw.schemaVersion ?? 0);
  if (!Number.isFinite(version) || version < 1) {
    return {
      ...base,
      usageEvents: Array.isArray(raw.usageEvents) ? raw.usageEvents : [],
      preflightDenials: Array.isArray(raw.preflightDenials)
        ? raw.preflightDenials
        : [],
    };
  }
  return {
    schemaVersion: AI_USAGE_FOUNDATION_SCHEMA_VERSION,
    usageEvents: Array.isArray(raw.usageEvents) ? [...raw.usageEvents] : [],
    quotaPolicies:
      Array.isArray(raw.quotaPolicies) && raw.quotaPolicies.length > 0
        ? [...raw.quotaPolicies]
        : base.quotaPolicies,
    budgetPolicies:
      Array.isArray(raw.budgetPolicies) && raw.budgetPolicies.length > 0
        ? [...raw.budgetPolicies]
        : base.budgetPolicies,
    costPolicies:
      Array.isArray(raw.costPolicies) && raw.costPolicies.length > 0
        ? [...raw.costPolicies]
        : base.costPolicies,
    exemptions: Array.isArray(raw.exemptions)
      ? [...raw.exemptions]
      : base.exemptions,
    preflightDenials: Array.isArray(raw.preflightDenials)
      ? [...raw.preflightDenials]
      : [],
  };
}

export class AiUsageFoundationStore {
  private state: AiUsageFoundationState = emptyState();
  private byIdempotency = new Map<string, AiUsageEvent>();

  reset(): void {
    this.state = emptyState();
    this.byIdempotency.clear();
  }

  snapshot(): AiUsageFoundationState {
    return {
      ...this.state,
      usageEvents: [...this.state.usageEvents],
      quotaPolicies: [...this.state.quotaPolicies],
      budgetPolicies: [...this.state.budgetPolicies],
      costPolicies: [...this.state.costPolicies],
      exemptions: [...this.state.exemptions],
      preflightDenials: [...this.state.preflightDenials],
    };
  }

  load(raw: Partial<AiUsageFoundationState>): void {
    this.state = normalizeUsageFoundationState(raw);
    this.byIdempotency.clear();
    for (const event of this.state.usageEvents) {
      this.byIdempotency.set(
        `${event.tenantId}::${event.idempotencyKey}`,
        event
      );
    }
  }

  listEvents(limit = 100): AiUsageEvent[] {
    return this.state.usageEvents.slice(-limit);
  }

  getByIdempotency(
    tenantId: string,
    idempotencyKey: string
  ): AiUsageEvent | null {
    return this.byIdempotency.get(`${tenantId}::${idempotencyKey}`) ?? null;
  }

  recordEvent(event: AiUsageEvent): { event: AiUsageEvent; duplicate: boolean } {
    const key = `${event.tenantId}::${event.idempotencyKey}`;
    const existing = this.byIdempotency.get(key);
    if (existing) {
      return { event: existing, duplicate: true };
    }
    this.state.usageEvents.push(event);
    this.byIdempotency.set(key, event);
    if (this.state.usageEvents.length > MAX_EVENTS) {
      const dropped = this.state.usageEvents.shift();
      if (dropped) {
        this.byIdempotency.delete(
          `${dropped.tenantId}::${dropped.idempotencyKey}`
        );
      }
    }
    return { event, duplicate: false };
  }

  getQuotaPolicy(policyId: string): AiQuotaPolicy | null {
    return (
      this.state.quotaPolicies.find((p) => p.policyId === policyId) ?? null
    );
  }

  getBudgetPolicy(policyId: string): AiBudgetPolicy | null {
    return (
      this.state.budgetPolicies.find((p) => p.policyId === policyId) ?? null
    );
  }

  getCostPolicy(policyId: string): AiCostEstimationPolicy | null {
    return this.state.costPolicies.find((p) => p.policyId === policyId) ?? null;
  }

  listQuotaPolicies(): AiQuotaPolicy[] {
    return [...this.state.quotaPolicies];
  }

  listBudgetPolicies(): AiBudgetPolicy[] {
    return [...this.state.budgetPolicies];
  }

  listCostPolicies(): AiCostEstimationPolicy[] {
    return [...this.state.costPolicies];
  }

  listExemptions(): AiUsageExemption[] {
    return [...this.state.exemptions];
  }

  upsertQuotaPolicy(policy: AiQuotaPolicy): void {
    if (!policy.policyId.trim()) {
      throw new AiPlatformError("invalid_input", "quota policyId required");
    }
    const idx = this.state.quotaPolicies.findIndex(
      (p) => p.policyId === policy.policyId
    );
    if (idx >= 0) this.state.quotaPolicies[idx] = policy;
    else this.state.quotaPolicies.push(policy);
  }

  upsertBudgetPolicy(policy: AiBudgetPolicy): void {
    if (!policy.policyId.trim()) {
      throw new AiPlatformError("invalid_input", "budget policyId required");
    }
    const idx = this.state.budgetPolicies.findIndex(
      (p) => p.policyId === policy.policyId
    );
    if (idx >= 0) this.state.budgetPolicies[idx] = policy;
    else this.state.budgetPolicies.push(policy);
  }

  upsertCostPolicy(policy: AiCostEstimationPolicy): void {
    if (!policy.policyId.trim()) {
      throw new AiPlatformError("invalid_input", "cost policyId required");
    }
    if (policy.pricingSource !== "local_fixture") {
      throw new AiPlatformError(
        "invalid_input",
        "Only local_fixture pricing is allowed in V1."
      );
    }
    const idx = this.state.costPolicies.findIndex(
      (p) => p.policyId === policy.policyId
    );
    if (idx >= 0) this.state.costPolicies[idx] = policy;
    else this.state.costPolicies.push(policy);
  }

  upsertExemption(exemption: AiUsageExemption): void {
    const idx = this.state.exemptions.findIndex(
      (e) => e.exemptionId === exemption.exemptionId
    );
    if (idx >= 0) this.state.exemptions[idx] = exemption;
    else this.state.exemptions.push(exemption);
  }

  recordPreflightDenial(entry: {
    at: string;
    tenantId: string;
    userId: string | null;
    capabilityId: string;
    reason: string;
    decision: "allowed" | "denied" | "allowed_with_warning";
  }): void {
    this.state.preflightDenials.push(entry);
    if (this.state.preflightDenials.length > 1000) {
      this.state.preflightDenials.shift();
    }
  }

  listPreflightDenials(limit = 50) {
    return this.state.preflightDenials.slice(-limit);
  }
}

export const aiUsageFoundationStore = new AiUsageFoundationStore();
