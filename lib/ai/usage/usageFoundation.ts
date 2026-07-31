/**
 * AI Usage, Quotas & Billing Foundation V1 — server facade.
 * Preflight gate + post-execution recording + aggregation + view models.
 */

import { AiPlatformError } from "../contracts/errors";
import type { AiCapabilityMeteringBinding } from "./quotasBillingTypes";
import { defaultMeteringBinding } from "./policyFixtures";
import { estimateUsageCost } from "./costEstimation";
import { createDisabledUsageChargeIntent } from "./chargeIntent";
import {
  evaluateBudget,
  evaluateQuota,
  findActiveExemption,
  sumCountedCostMinor,
  sumCountedUnits,
  validateBudgetPolicy,
  validateQuotaPolicy,
} from "./quotaBudgetEvaluation";
import {
  AI_USAGE_POLICY_VERSION,
  AI_USAGE_UNIT_TYPES,
  type AiPreflightGateResult,
  type AiUsageActor,
  type AiUsageAggregationReport,
  type AiUsageAggregateBucket,
  type AiUsageEvent,
  type AiUsageEventStatus,
  type AiUsageFailureClass,
  type AiUsageSource,
  type AiUserUsageViewModel,
} from "./quotasBillingTypes";
import { redactUsageMetadata } from "./usageRedaction";
import {
  assertSelfOrAdmin,
  assertTenantScope,
  requireUsagePermission,
} from "./usagePermissions";
import {
  aiUsageFoundationStore,
  type AiUsageFoundationStore,
} from "./usageFoundationStore";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function bucketPush(
  map: Map<string, AiUsageAggregateBucket>,
  key: string,
  event: AiUsageEvent
): void {
  const cur = map.get(key) ?? {
    key,
    events: 0,
    success: 0,
    failure: 0,
    totalUnits: 0,
    estimatedCostMinor: 0,
  };
  cur.events += 1;
  if (event.success) cur.success += 1;
  else cur.failure += 1;
  cur.totalUnits += event.totalUnits;
  cur.estimatedCostMinor += event.estimatedCostMinor ?? 0;
  map.set(key, cur);
}

export type PreflightInput = {
  actor: AiUsageActor;
  capabilityId: string;
  metering: AiCapabilityMeteringBinding;
  tenantId: string;
  userId: string | null;
  providerId?: string | null;
  runtimeId?: string | null;
  requestedUnits?: number;
  correlationId?: string | null;
  nowIso?: string;
};

export type RecordUsageInput = {
  actor: AiUsageActor;
  metering: AiCapabilityMeteringBinding;
  requestId: string;
  invocationId?: string | null;
  idempotencyKey?: string;
  capabilityId: string;
  providerId?: string | null;
  runtimeId?: string | null;
  modelId?: string | null;
  tenantId: string;
  userId?: string | null;
  sessionId?: string | null;
  correlationId?: string | null;
  status: AiUsageEventStatus;
  inputUnits?: number;
  outputUnits?: number;
  totalUnits?: number;
  latencyMs?: number | null;
  retryCount?: number;
  source: AiUsageSource;
  auditEventId?: string | null;
  metadata?: Record<string, unknown>;
  nowIso?: string;
  /** When true, never counts toward production quota/budget. */
  contractTest?: boolean;
};

export class AiUsageQuotasBillingFoundation {
  constructor(private readonly store: AiUsageFoundationStore = aiUsageFoundationStore) {}

  reset(): void {
    this.store.reset();
  }

  validateUnitType(unitType: string): boolean {
    return (AI_USAGE_UNIT_TYPES as readonly string[]).includes(unitType);
  }

  preflight(input: PreflightInput): AiPreflightGateResult {
    requireUsagePermission(input.actor, "usage_record");
    assertTenantScope(input.actor, input.tenantId);

    const nowIso = input.nowIso ?? new Date().toISOString();
    const requestedUnits = input.requestedUnits ?? 1;
    if (!input.capabilityId.trim()) {
      throw new AiPlatformError("invalid_input", "capabilityId required");
    }
    if (!input.tenantId.trim()) {
      throw new AiPlatformError("invalid_input", "tenantId required");
    }
    if (!Number.isFinite(requestedUnits) || requestedUnits <= 0) {
      throw new AiPlatformError("invalid_input", "requestedUnits invalid");
    }
    if (!this.validateUnitType(input.metering.usageUnitType)) {
      throw new AiPlatformError("configuration_invalid", "Invalid unit type");
    }

    const quotaPolicy = this.store.getQuotaPolicy(input.metering.quotaPolicyId);
    const budgetPolicy = this.store.getBudgetPolicy(
      input.metering.budgetPolicyId
    );
    const costPolicy = this.store.getCostPolicy(
      input.metering.estimationPolicyId
    );
    if (!quotaPolicy?.enabled) {
      throw new AiPlatformError(
        "configuration_invalid",
        "Required quota policy missing or disabled."
      );
    }
    if (!budgetPolicy?.enabled) {
      throw new AiPlatformError(
        "configuration_invalid",
        "Required budget policy missing or disabled."
      );
    }
    if (!costPolicy?.enabled) {
      throw new AiPlatformError(
        "configuration_invalid",
        "Required cost policy missing or disabled."
      );
    }
    const qErr = validateQuotaPolicy(quotaPolicy);
    const bErr = validateBudgetPolicy(budgetPolicy);
    if (qErr.length || bErr.length) {
      throw new AiPlatformError(
        "configuration_invalid",
        `Invalid policy: ${[...qErr, ...bErr].join(",")}`
      );
    }
    if (!input.userId && !quotaPolicy.allowAnonymous) {
      const denied: AiPreflightGateResult = {
        decision: "denied",
        allowed: false,
        quota: {
          currentUsage: 0,
          remaining: 0,
          softExceeded: false,
          hardExceeded: true,
          inGrace: false,
          resetAt: null,
          nextAvailableAt: null,
          appliedLimitKind: "anonymous",
          exemptionApplied: false,
        },
        budget: {
          currentSpendMinor: 0,
          remainingMinor: null,
          warning: false,
          hardStop: false,
          overagePolicy: budgetPolicy.overagePolicy,
          currency: budgetPolicy.currency,
        },
        remainingAllowance: 0,
        resetAt: null,
        denialReason: "Anonymous usage not allowed by quota policy.",
        warningReason: null,
        policyVersion: AI_USAGE_POLICY_VERSION,
        audit: {
          capabilityId: input.capabilityId,
          tenantId: input.tenantId,
          userId: input.userId,
          correlationId: input.correlationId ?? null,
          evaluatedAt: nowIso,
        },
      };
      this.store.recordPreflightDenial({
        at: nowIso,
        tenantId: input.tenantId,
        userId: input.userId,
        capabilityId: input.capabilityId,
        reason: denied.denialReason!,
        decision: "denied",
      });
      return denied;
    }

    const exemption = findActiveExemption(this.store.listExemptions(), {
      tenantId: input.tenantId,
      userId: input.userId,
      capabilityId: input.capabilityId,
      nowIso,
    });

    const events = this.store.listEvents(MAX_SAFE_EVENTS);
    const quota = evaluateQuota({
      policy: quotaPolicy,
      events,
      tenantId: input.tenantId,
      userId: input.userId,
      capabilityId: input.capabilityId,
      providerId: input.providerId,
      runtimeId: input.runtimeId,
      requestedUnits,
      nowIso,
      exemption,
    });

    const estimate = estimateUsageCost({
      policy: costPolicy,
      inputUnits: 0,
      outputUnits: 0,
      requestCount: requestedUnits,
    });

    const budget = evaluateBudget({
      policy: budgetPolicy,
      events,
      tenantId: input.tenantId,
      userId: input.userId,
      capabilityId: input.capabilityId,
      providerId: input.providerId,
      estimatedAdditionalMinor: input.metering.billable
        ? estimate.estimatedCostMinor
        : 0,
      nowIso,
    });

    let decision: AiPreflightGateResult["decision"] = "allowed";
    let denialReason: string | null = null;
    let warningReason: string | null = null;

    if (quota.hardExceeded) {
      decision = "denied";
      denialReason = `Hard quota exceeded (${quota.appliedLimitKind ?? "limit"}).`;
    } else if (budget.hardStop && budgetPolicy.overagePolicy === "deny") {
      decision = "denied";
      denialReason = "Budget hard stop reached.";
    } else if (quota.softExceeded || quota.inGrace || budget.warning) {
      decision = "allowed_with_warning";
      warningReason = quota.inGrace
        ? "Quota grace allowance in use."
        : quota.softExceeded
          ? "Soft quota threshold exceeded."
          : "Budget warning threshold reached.";
    }

    const result: AiPreflightGateResult = {
      decision,
      allowed: decision !== "denied",
      quota,
      budget,
      remainingAllowance: quota.remaining,
      resetAt: quota.resetAt,
      denialReason,
      warningReason,
      policyVersion: AI_USAGE_POLICY_VERSION,
      audit: {
        capabilityId: input.capabilityId,
        tenantId: input.tenantId,
        userId: input.userId,
        correlationId: input.correlationId ?? null,
        evaluatedAt: nowIso,
      },
    };

    if (decision === "denied" || decision === "allowed_with_warning") {
      this.store.recordPreflightDenial({
        at: nowIso,
        tenantId: input.tenantId,
        userId: input.userId,
        capabilityId: input.capabilityId,
        reason: denialReason ?? warningReason ?? decision,
        decision,
      });
    }
    return result;
  }

  recordUsage(input: RecordUsageInput): {
    event: AiUsageEvent;
    duplicate: boolean;
    chargeIntent: ReturnType<typeof createDisabledUsageChargeIntent> | null;
  } {
    requireUsagePermission(input.actor, "usage_record");
    assertTenantScope(input.actor, input.tenantId);

    if (!input.requestId.trim()) {
      throw new AiPlatformError("invalid_input", "requestId required");
    }
    const nowIso = input.nowIso ?? new Date().toISOString();
    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      `${input.tenantId}:${input.requestId}:${input.status}`;

    const existing = this.store.getByIdempotency(
      input.tenantId,
      idempotencyKey
    );
    if (existing) {
      return { event: existing, duplicate: true, chargeIntent: null };
    }

    const costPolicy = this.store.getCostPolicy(
      input.metering.estimationPolicyId
    );
    if (!costPolicy) {
      throw new AiPlatformError(
        "configuration_invalid",
        "Cost policy missing for recording."
      );
    }

    const failureClass = classifyFailure(input.status, input.contractTest);
    const charging = resolveCharging(input, failureClass);
    const inputUnits = input.inputUnits ?? 0;
    const outputUnits = input.outputUnits ?? 0;
    const totalUnits =
      input.totalUnits ??
      (input.metering.meteringMode === "per_request"
        ? charging.countUnits
          ? 1
          : 0
        : inputUnits + outputUnits);

    const estimate = estimateUsageCost({
      policy: costPolicy,
      inputUnits: charging.countCost ? inputUnits : 0,
      outputUnits: charging.countCost ? outputUnits : 0,
      requestCount: charging.countCost ? 1 : 0,
    });

    const event: AiUsageEvent = {
      usageEventId: newId("ue"),
      requestId: input.requestId.trim(),
      invocationId: input.invocationId ?? null,
      idempotencyKey,
      capabilityId: input.capabilityId,
      providerId: input.providerId ?? null,
      runtimeId: input.runtimeId ?? null,
      modelId: input.modelId ?? null,
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      correlationId: input.correlationId ?? null,
      status: input.status,
      occurredAt: nowIso,
      inputUnits,
      outputUnits,
      totalUnits,
      unitType: input.metering.usageUnitType,
      estimatedCostMinor: charging.countCost ? estimate.estimatedCostMinor : 0,
      currency: estimate.currency,
      costTier: charging.countCost ? estimate.costTier : "zero",
      latency: {
        totalMs: input.latencyMs ?? null,
        providerMs: null,
        queueMs: null,
      },
      retryCount: input.retryCount ?? 0,
      failureClass,
      success: input.status === "success",
      billable: input.metering.billable && charging.countCost,
      countedTowardQuota: charging.countUnits && !input.contractTest,
      countedTowardBudget:
        input.metering.billable && charging.countCost && !input.contractTest,
      source: input.contractTest ? "contract_test" : input.source,
      auditEventId: input.auditEventId ?? null,
      policyVersion: AI_USAGE_POLICY_VERSION,
      priceVersion: estimate.priceVersion,
      metadata: redactUsageMetadata(input.metadata),
    };

    const stored = this.store.recordEvent(event);
    const chargeIntent =
      stored.event.billable && stored.event.estimatedCostMinor != null
        ? createDisabledUsageChargeIntent({
            usageEventId: stored.event.usageEventId,
            tenantId: stored.event.tenantId,
            estimatedCostMinor: stored.event.estimatedCostMinor,
            currency: stored.event.currency ?? "USD",
            nowIso,
          })
        : null;

    return { event: stored.event, duplicate: stored.duplicate, chargeIntent };
  }

  aggregate(actor: AiUsageActor, tenantId?: string): AiUsageAggregationReport {
    requireUsagePermission(actor, "usage_read_admin");
    const events = this.store
      .listEvents(MAX_SAFE_EVENTS)
      .filter((e) => (tenantId ? e.tenantId === tenantId : true));

    const byUser = new Map<string, AiUsageAggregateBucket>();
    const byTenant = new Map<string, AiUsageAggregateBucket>();
    const byCapability = new Map<string, AiUsageAggregateBucket>();
    const byProvider = new Map<string, AiUsageAggregateBucket>();
    const byModel = new Map<string, AiUsageAggregateBucket>();
    const byRuntime = new Map<string, AiUsageAggregateBucket>();
    const byDay = new Map<string, AiUsageAggregateBucket>();
    const byMonth = new Map<string, AiUsageAggregateBucket>();

    let hardLimitDenials = 0;
    for (const e of events) {
      bucketPush(byUser, e.userId ?? "system", e);
      bucketPush(byTenant, e.tenantId, e);
      bucketPush(byCapability, e.capabilityId, e);
      bucketPush(byProvider, e.providerId ?? "unknown", e);
      bucketPush(byModel, e.modelId ?? "unknown", e);
      bucketPush(byRuntime, e.runtimeId ?? "unknown", e);
      bucketPush(byDay, dayKey(e.occurredAt), e);
      bucketPush(byMonth, monthKey(e.occurredAt), e);
    }
    hardLimitDenials = this.store
      .listPreflightDenials(1000)
      .filter((d) => d.decision === "denied").length;

    const totals = {
      events: events.length,
      success: events.filter((e) => e.success).length,
      failure: events.filter((e) => !e.success).length,
      totalUnits: events.reduce((a, e) => a + e.totalUnits, 0),
      estimatedCostMinor: events.reduce(
        (a, e) => a + (e.estimatedCostMinor ?? 0),
        0
      ),
      hardLimitDenials,
      warnings: this.store
        .listPreflightDenials(1000)
        .filter((d) => d.decision === "allowed_with_warning").length,
    };

    return {
      byUser: [...byUser.values()].sort((a, b) => b.totalUnits - a.totalUnits),
      byTenant: [...byTenant.values()].sort(
        (a, b) => b.totalUnits - a.totalUnits
      ),
      byCapability: [...byCapability.values()].sort(
        (a, b) => b.totalUnits - a.totalUnits
      ),
      byProvider: [...byProvider.values()],
      byModel: [...byModel.values()],
      byRuntime: [...byRuntime.values()],
      byDay: [...byDay.values()],
      byMonth: [...byMonth.values()],
      totals,
    };
  }

  buildUserViewModel(input: {
    actor: AiUsageActor;
    tenantId: string;
    userId: string;
    metering?: AiCapabilityMeteringBinding;
    nowIso?: string;
  }): AiUserUsageViewModel {
    assertTenantScope(input.actor, input.tenantId);
    assertSelfOrAdmin(input.actor, input.userId);
    const metering = input.metering ?? defaultMeteringBinding();
    const nowIso = input.nowIso ?? new Date().toISOString();
    const quotaPolicy = this.store.getQuotaPolicy(metering.quotaPolicyId);
    const events = this.store
      .listEvents(MAX_SAFE_EVENTS)
      .filter((e) => e.tenantId === input.tenantId);

    const todayUnits = sumCountedUnits(
      events,
      (e) =>
        e.userId === input.userId &&
        e.occurredAt.slice(0, 10) === nowIso.slice(0, 10)
    );
    const monthUnits = sumCountedUnits(
      events,
      (e) =>
        e.userId === input.userId &&
        e.occurredAt.slice(0, 7) === nowIso.slice(0, 7)
    );
    const estimatedSpendMinorToday = sumCountedCostMinor(
      events,
      (e) =>
        e.userId === input.userId &&
        e.occurredAt.slice(0, 10) === nowIso.slice(0, 10)
    );
    const estimatedSpendMinorMonth = sumCountedCostMinor(
      events,
      (e) =>
        e.userId === input.userId &&
        e.occurredAt.slice(0, 7) === nowIso.slice(0, 7)
    );

    const dailyLimit = quotaPolicy?.limits.user_daily ?? null;
    const monthlyLimit = quotaPolicy?.limits.user_monthly ?? null;
    const remainingToday =
      dailyLimit == null ? null : Math.max(0, dailyLimit - todayUnits);
    const remainingMonth =
      monthlyLimit == null ? null : Math.max(0, monthlyLimit - monthUnits);

    const warnings: string[] = [];
    if (
      quotaPolicy?.softLimit != null &&
      todayUnits >= quotaPolicy.softLimit
    ) {
      warnings.push("Soft daily quota threshold reached.");
    }
    let denialReason: string | null = null;
    if (dailyLimit != null && todayUnits >= dailyLimit) {
      denialReason = "Daily user quota exhausted.";
    }

    return {
      tenantId: input.tenantId,
      userId: input.userId,
      todayUnits,
      monthUnits,
      remainingToday,
      remainingMonth,
      resetAt: quotaPolicy
        ? evaluateQuota({
            policy: quotaPolicy,
            events,
            tenantId: input.tenantId,
            userId: input.userId,
            capabilityId: "*",
            requestedUnits: 0,
            nowIso,
            exemption: null,
          }).resetAt
        : null,
      warnings,
      denialReason,
      currency: "USD",
      estimatedSpendMinorToday,
      estimatedSpendMinorMonth,
      policyVersion: AI_USAGE_POLICY_VERSION,
    };
  }

  listRecentEvents(actor: AiUsageActor, limit = 50): AiUsageEvent[] {
    requireUsagePermission(actor, "usage_read_admin");
    return this.store.listEvents(limit);
  }
}

const MAX_SAFE_EVENTS = 5000;

function classifyFailure(
  status: AiUsageEventStatus,
  contractTest?: boolean
): AiUsageFailureClass {
  if (contractTest) return "contract_test";
  switch (status) {
    case "success":
      return "none";
    case "rejected":
      return "pre_execution_reject";
    case "blocked":
      return "blocked";
    case "cancelled":
      return "cancelled";
    case "timed_out":
      return "timed_out";
    case "failed":
      return "post_execution_failure";
    default:
      return "post_execution_failure";
  }
}

function resolveCharging(
  input: RecordUsageInput,
  failureClass: AiUsageFailureClass
): { countUnits: boolean; countCost: boolean } {
  if (input.contractTest) return { countUnits: false, countCost: false };
  if (failureClass === "pre_execution_reject") {
    return { countUnits: false, countCost: false };
  }
  if (input.retryCount && input.retryCount > 0) {
    if (input.metering.retryChargingPolicy === "never_charge_retries") {
      return { countUnits: false, countCost: false };
    }
    if (input.metering.retryChargingPolicy === "charge_final_only") {
      // Caller should only record final attempt; if retryCount>0 still count final.
    }
  }
  if (input.status === "failed" || input.status === "timed_out") {
    if (input.metering.failureChargingPolicy === "never") {
      return { countUnits: false, countCost: false };
    }
    if (input.metering.failureChargingPolicy === "partial_units_only") {
      return { countUnits: true, countCost: true };
    }
    if (input.metering.failureChargingPolicy === "fixed_request_only") {
      return { countUnits: true, countCost: true };
    }
  }
  if (input.status === "blocked" || input.status === "cancelled") {
    return { countUnits: false, countCost: false };
  }
  return { countUnits: true, countCost: input.metering.billable };
}

export const aiUsageQuotasBillingFoundation =
  new AiUsageQuotasBillingFoundation();

export function resetUsageQuotasBillingFoundation(): void {
  aiUsageQuotasBillingFoundation.reset();
}

export function resolveMeteringOrDefault(
  metering?: AiCapabilityMeteringBinding | null
): AiCapabilityMeteringBinding {
  return metering ?? defaultMeteringBinding();
}
