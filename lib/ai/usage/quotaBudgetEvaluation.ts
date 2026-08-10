/**
 * Pure quota / budget evaluation — no cron, scheduler, or workers.
 */

import type {
  AiBudgetEvaluationState,
  AiBudgetPolicy,
  AiQuotaEvaluationState,
  AiQuotaLimitKind,
  AiQuotaPolicy,
  AiUsageEvent,
  AiUsageExemption,
} from "./quotasBillingTypes";

function utcDayStart(iso: string): string {
  const d = new Date(iso);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  ).toISOString();
}

function utcMonthStart(iso: string): string {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function nextUtcDay(iso: string): string {
  const d = new Date(utcDayStart(iso));
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

function inWindow(
  eventAt: string,
  nowIso: string,
  resetPolicy: AiQuotaPolicy["resetPolicy"]
): boolean {
  if (resetPolicy === "none") return true;
  if (resetPolicy === "calendar_day_utc") {
    return eventAt >= utcDayStart(nowIso);
  }
  if (resetPolicy === "calendar_month_utc") {
    return eventAt >= utcMonthStart(nowIso);
  }
  if (resetPolicy === "rolling_24h") {
    return Date.parse(eventAt) >= Date.parse(nowIso) - 24 * 60 * 60 * 1000;
  }
  if (resetPolicy === "rolling_30d") {
    return Date.parse(eventAt) >= Date.parse(nowIso) - 30 * 24 * 60 * 60 * 1000;
  }
  return true;
}

export function findActiveExemption(
  exemptions: AiUsageExemption[],
  input: {
    tenantId: string;
    userId: string | null;
    capabilityId: string;
    nowIso: string;
  }
): AiUsageExemption | null {
  for (const ex of exemptions) {
    if (!ex.enabled) continue;
    if (ex.expiresAt && Date.parse(ex.expiresAt) < Date.parse(input.nowIso)) {
      continue;
    }
    if (ex.tenantId && ex.tenantId !== input.tenantId) continue;
    if (ex.userId && ex.userId !== input.userId) continue;
    if (ex.capabilityId && ex.capabilityId !== input.capabilityId) continue;
    return ex;
  }
  return null;
}

export function sumCountedUnits(
  events: AiUsageEvent[],
  predicate: (e: AiUsageEvent) => boolean
): number {
  let total = 0;
  for (const e of events) {
    if (!e.countedTowardQuota) continue;
    if (!predicate(e)) continue;
    total += e.totalUnits;
  }
  return total;
}

export function sumCountedCostMinor(
  events: AiUsageEvent[],
  predicate: (e: AiUsageEvent) => boolean
): number {
  let total = 0;
  for (const e of events) {
    if (!e.countedTowardBudget) continue;
    if (!predicate(e)) continue;
    total += e.estimatedCostMinor ?? 0;
  }
  return total;
}

export function evaluateQuota(input: {
  policy: AiQuotaPolicy;
  events: AiUsageEvent[];
  tenantId: string;
  userId: string | null;
  capabilityId: string;
  providerId?: string | null;
  runtimeId?: string | null;
  requestedUnits: number;
  nowIso: string;
  exemption: AiUsageExemption | null;
}): AiQuotaEvaluationState {
  const { policy, events, tenantId, userId, capabilityId, nowIso } = input;
  const windowed = events.filter(
    (e) =>
      e.tenantId === tenantId &&
      inWindow(e.occurredAt, nowIso, policy.resetPolicy)
  );

  const checks: Array<{ kind: AiQuotaLimitKind; limit: number; usage: number }> =
    [];

  const userDaily = policy.limits.user_daily;
  if (userDaily != null && userId) {
    checks.push({
      kind: "user_daily",
      limit: userDaily,
      usage: sumCountedUnits(
        windowed,
        (e) => e.userId === userId && inWindow(e.occurredAt, nowIso, "calendar_day_utc")
      ),
    });
  }
  const userMonthly = policy.limits.user_monthly;
  if (userMonthly != null && userId) {
    checks.push({
      kind: "user_monthly",
      limit: userMonthly,
      usage: sumCountedUnits(
        events.filter((e) => e.tenantId === tenantId),
        (e) =>
          e.userId === userId &&
          inWindow(e.occurredAt, nowIso, "calendar_month_utc")
      ),
    });
  }
  const tenantDaily = policy.limits.tenant_daily;
  if (tenantDaily != null) {
    checks.push({
      kind: "tenant_daily",
      limit: tenantDaily,
      usage: sumCountedUnits(
        windowed,
        (e) => inWindow(e.occurredAt, nowIso, "calendar_day_utc")
      ),
    });
  }
  const tenantMonthly = policy.limits.tenant_monthly;
  if (tenantMonthly != null) {
    checks.push({
      kind: "tenant_monthly",
      limit: tenantMonthly,
      usage: sumCountedUnits(
        events.filter((e) => e.tenantId === tenantId),
        (e) => inWindow(e.occurredAt, nowIso, "calendar_month_utc")
      ),
    });
  }
  const capabilityLimit = policy.limits.capability;
  if (capabilityLimit != null) {
    checks.push({
      kind: "capability",
      limit: capabilityLimit,
      usage: sumCountedUnits(windowed, (e) => e.capabilityId === capabilityId),
    });
  }
  if (policy.limits.provider != null && input.providerId) {
    checks.push({
      kind: "provider",
      limit: policy.limits.provider,
      usage: sumCountedUnits(
        windowed,
        (e) => e.providerId === input.providerId
      ),
    });
  }
  if (policy.limits.runtime != null && input.runtimeId) {
    checks.push({
      kind: "runtime",
      limit: policy.limits.runtime,
      usage: sumCountedUnits(
        windowed,
        (e) => e.runtimeId === input.runtimeId
      ),
    });
  }
  if (!userId && policy.limits.anonymous != null) {
    checks.push({
      kind: "anonymous",
      limit: policy.limits.anonymous,
      usage: sumCountedUnits(windowed, (e) => e.userId == null),
    });
  }

  const soft = policy.softLimit;
  const hard = policy.hardLimit ?? soft ?? null;
  const grace = policy.graceAllowance ?? 0;

  let currentUsage = 0;
  let appliedLimitKind: AiQuotaLimitKind | null = null;
  let remaining: number | null = null;
  let hardExceeded = false;
  let softExceeded = false;
  let inGrace = false;

  for (const check of checks) {
    const projected = check.usage + input.requestedUnits;
    const rem = check.limit - check.usage;
    if (remaining == null || rem < remaining) {
      remaining = rem;
      currentUsage = check.usage;
      appliedLimitKind = check.kind;
    }
    if (projected > check.limit + grace) {
      hardExceeded = true;
      currentUsage = check.usage;
      appliedLimitKind = check.kind;
      remaining = check.limit - check.usage;
    } else if (projected > check.limit) {
      inGrace = true;
      currentUsage = check.usage;
      appliedLimitKind = check.kind;
      remaining = check.limit - check.usage;
    }
  }

  if (hard != null && currentUsage + input.requestedUnits > hard + grace) {
    hardExceeded = true;
  } else if (hard != null && currentUsage + input.requestedUnits > hard) {
    inGrace = true;
  }
  if (soft != null && currentUsage + input.requestedUnits > soft) {
    softExceeded = true;
  }

  if (input.exemption) {
    hardExceeded = false;
    inGrace = false;
  }

  const resetAt =
    policy.resetPolicy === "calendar_day_utc" ||
    policy.resetPolicy === "rolling_24h"
      ? nextUtcDay(nowIso)
      : policy.resetPolicy === "calendar_month_utc"
        ? new Date(
            Date.UTC(
              new Date(nowIso).getUTCFullYear(),
              new Date(nowIso).getUTCMonth() + 1,
              1
            )
          ).toISOString()
        : null;

  return {
    currentUsage,
    remaining,
    softExceeded,
    hardExceeded,
    inGrace,
    resetAt,
    nextAvailableAt: hardExceeded ? resetAt : null,
    appliedLimitKind,
    exemptionApplied: Boolean(input.exemption),
  };
}

export function evaluateBudget(input: {
  policy: AiBudgetPolicy;
  events: AiUsageEvent[];
  tenantId: string;
  userId: string | null;
  capabilityId: string;
  providerId?: string | null;
  estimatedAdditionalMinor: number;
  nowIso: string;
}): AiBudgetEvaluationState {
  const { policy, events, tenantId, userId, capabilityId, nowIso } = input;
  const tenantEvents = events.filter((e) => e.tenantId === tenantId);
  const dayEvents = tenantEvents.filter((e) =>
    inWindow(e.occurredAt, nowIso, "calendar_day_utc")
  );
  const monthEvents = tenantEvents.filter((e) =>
    inWindow(e.occurredAt, nowIso, "calendar_month_utc")
  );

  const candidates: Array<{ limit: number; spend: number }> = [];
  if (policy.scopes.user != null && userId) {
    candidates.push({
      limit: policy.scopes.user + policy.promotionalAllowanceMinor,
      spend: sumCountedCostMinor(monthEvents, (e) => e.userId === userId),
    });
  }
  if (policy.scopes.tenant != null) {
    candidates.push({
      limit: policy.scopes.tenant + policy.promotionalAllowanceMinor,
      spend: sumCountedCostMinor(monthEvents, () => true),
    });
  }
  if (policy.scopes.capability != null) {
    candidates.push({
      limit: policy.scopes.capability,
      spend: sumCountedCostMinor(
        monthEvents,
        (e) => e.capabilityId === capabilityId
      ),
    });
  }
  if (policy.scopes.provider != null && input.providerId) {
    candidates.push({
      limit: policy.scopes.provider,
      spend: sumCountedCostMinor(
        monthEvents,
        (e) => e.providerId === input.providerId
      ),
    });
  }
  if (policy.scopes.daily != null) {
    candidates.push({
      limit: policy.scopes.daily,
      spend: sumCountedCostMinor(dayEvents, () => true),
    });
  }
  if (policy.scopes.monthly != null) {
    candidates.push({
      limit: policy.scopes.monthly,
      spend: sumCountedCostMinor(monthEvents, () => true),
    });
  }

  let currentSpendMinor = 0;
  let remainingMinor: number | null = null;
  let warning = false;
  let hardStop = false;

  for (const c of candidates) {
    const projected = c.spend + input.estimatedAdditionalMinor;
    const rem = c.limit - c.spend;
    if (remainingMinor == null || rem < remainingMinor) {
      remainingMinor = rem;
      currentSpendMinor = c.spend;
    }
    if (projected > c.limit * policy.hardStopThresholdRatio) {
      hardStop = true;
      currentSpendMinor = c.spend;
      remainingMinor = rem;
    } else if (projected > c.limit * policy.warningThresholdRatio) {
      warning = true;
    }
  }

  if (hardStop && policy.overagePolicy === "allow_with_warning") {
    hardStop = false;
    warning = true;
  }
  if (hardStop && policy.overagePolicy === "record_only") {
    hardStop = false;
  }

  return {
    currentSpendMinor,
    remainingMinor,
    warning,
    hardStop,
    overagePolicy: policy.overagePolicy,
    currency: policy.currency,
  };
}

export function validateQuotaPolicy(policy: AiQuotaPolicy): string[] {
  const errors: string[] = [];
  if (!policy.policyId.trim()) errors.push("policyId_required");
  if (!policy.enabled && policy.hardLimit == null) {
    /* disabled policies may be incomplete */
  }
  if (policy.softLimit != null && policy.hardLimit != null) {
    if (policy.softLimit > policy.hardLimit) errors.push("soft_above_hard");
  }
  if (policy.graceAllowance < 0) errors.push("negative_grace");
  return errors;
}

export function validateBudgetPolicy(policy: AiBudgetPolicy): string[] {
  const errors: string[] = [];
  if (!policy.policyId.trim()) errors.push("policyId_required");
  if (!policy.currency.trim()) errors.push("currency_required");
  if (
    policy.warningThresholdRatio < 0 ||
    policy.warningThresholdRatio > 1 ||
    policy.hardStopThresholdRatio < 0 ||
    policy.hardStopThresholdRatio > 1
  ) {
    errors.push("invalid_threshold_ratio");
  }
  if (policy.warningThresholdRatio > policy.hardStopThresholdRatio) {
    errors.push("warning_above_hard_stop");
  }
  if (policy.promotionalAllowanceMinor < 0) {
    errors.push("negative_promo");
  }
  return errors;
}
