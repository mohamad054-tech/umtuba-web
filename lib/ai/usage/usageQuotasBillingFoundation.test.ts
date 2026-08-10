import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AiPlatformError } from "../contracts/errors";
import {
  createDisabledUsageChargeIntent,
  executeUsageChargeIntent,
  isRevenueBridgeAllowed,
} from "./chargeIntent";
import { estimateUsageCost, validateCostPolicy } from "./costEstimation";
import {
  defaultMeteringBinding,
  STRICT_QUOTA_POLICY_ID,
} from "./policyFixtures";
import {
  validateBudgetPolicy,
  validateQuotaPolicy,
} from "./quotaBudgetEvaluation";
import {
  assertNoPromptOrSecretFields,
  redactUsageMetadata,
} from "./usageRedaction";
import {
  adminUsageActor,
  assertSelfOrAdmin,
  requireUsagePermission,
} from "./usagePermissions";
import {
  AiUsageQuotasBillingFoundation,
  resetUsageQuotasBillingFoundation,
} from "./usageFoundation";
import { aiUsageFoundationStore } from "./usageFoundationStore";
import { AI_USAGE_UNIT_TYPES } from "./quotasBillingTypes";

const TENANT = "tenant_a";
const USER = "user_a";
const NOW = "2026-07-31T12:00:00.000Z";

function actor(perms = ["usage_record", "usage_read_self", "usage_read_admin"] as const) {
  return {
    userId: USER,
    tenantId: TENANT,
    permissions: [...perms],
  };
}

afterEach(() => {
  resetUsageQuotasBillingFoundation();
});

describe("AI Usage, Quotas & Billing Foundation V1", () => {
  it("creates usage events with unit types", () => {
    const f = new AiUsageQuotasBillingFoundation();
    for (const unitType of AI_USAGE_UNIT_TYPES) {
      expect(f.validateUnitType(unitType)).toBe(true);
    }
    const metering = { ...defaultMeteringBinding(), usageUnitType: "token" as const };
    const { event } = f.recordUsage({
      actor: actor(),
      metering,
      requestId: "r1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      source: "shared_ai_service",
      inputUnits: 10,
      outputUnits: 5,
      nowIso: NOW,
    });
    expect(event.usageEventId).toBeTruthy();
    expect(event.unitType).toBe("token");
    expect(event.totalUnits).toBe(1);
  });

  it("validates quota and budget policies", () => {
    const quota = aiUsageFoundationStore.getQuotaPolicy("quota.default.v1")!;
    const budget = aiUsageFoundationStore.getBudgetPolicy("budget.default.v1")!;
    expect(validateQuotaPolicy(quota)).toEqual([]);
    expect(validateBudgetPolicy(budget)).toEqual([]);
    expect(
      validateQuotaPolicy({ ...quota, softLimit: 10, hardLimit: 5 })
    ).toContain("soft_above_hard");
    expect(
      validateBudgetPolicy({
        ...budget,
        warningThresholdRatio: 0.9,
        hardStopThresholdRatio: 0.5,
      })
    ).toContain("warning_above_hard_stop");
  });

  it("preflight allows, warns, and denies with soft/hard/grace", () => {
    const f = new AiUsageQuotasBillingFoundation();
    const metering = defaultMeteringBinding({
      quotaPolicyId: STRICT_QUOTA_POLICY_ID,
    });
    const base = {
      actor: actor(),
      capabilityId: "platform.translation_suggest",
      metering,
      tenantId: TENANT,
      userId: USER,
      nowIso: NOW,
    };
    expect(f.preflight(base).decision).toBe("allowed");

    f.recordUsage({
      ...base,
      requestId: "u1",
      status: "success",
      source: "shared_ai_service",
    });
    f.recordUsage({
      ...base,
      requestId: "u2",
      status: "success",
      source: "shared_ai_service",
    });
    const warn = f.preflight(base);
    expect(["allowed_with_warning", "allowed"]).toContain(warn.decision);
    expect(warn.quota.softExceeded || warn.decision === "allowed_with_warning").toBe(
      true
    );

    f.recordUsage({
      ...base,
      requestId: "u3",
      status: "success",
      source: "shared_ai_service",
    });
    // hard 3 + grace 1 => 4th may be grace, 5th denied
    const graceOrWarn = f.preflight(base);
    expect(graceOrWarn.allowed).toBe(true);
    expect(graceOrWarn.quota.inGrace || graceOrWarn.quota.softExceeded).toBe(
      true
    );
    f.recordUsage({
      ...base,
      requestId: "u4",
      status: "success",
      source: "shared_ai_service",
    });
    const denied = f.preflight(base);
    expect(denied.decision).toBe("denied");
    expect(denied.denialReason).toMatch(/Hard quota/i);
    expect(denied.quota.resetAt).toBeTruthy();
  });

  it("enforces user, tenant, capability, provider/runtime quotas", () => {
    const f = new AiUsageQuotasBillingFoundation();
    const metering = defaultMeteringBinding({
      quotaPolicyId: STRICT_QUOTA_POLICY_ID,
    });
    for (let i = 0; i < 5; i++) {
      f.recordUsage({
        actor: actor(),
        metering,
        requestId: `t${i}`,
        capabilityId: "c1",
        tenantId: TENANT,
        userId: USER,
        providerId: "stub",
        runtimeId: "shared_ai_gateway",
        status: "success",
        source: "shared_ai_service",
        nowIso: NOW,
      });
    }
    const gate = f.preflight({
      actor: actor(),
      capabilityId: "c1",
      metering,
      tenantId: TENANT,
      userId: USER,
      providerId: "stub",
      runtimeId: "shared_ai_gateway",
      nowIso: NOW,
    });
    expect(gate.allowed).toBe(false);
  });

  it("budget warning and hard stop", () => {
    const f = new AiUsageQuotasBillingFoundation();
    aiUsageFoundationStore.upsertBudgetPolicy({
      policyId: "budget.tiny.v1",
      version: "v1",
      displayName: "tiny",
      currency: "USD",
      scopes: { daily: 10, monthly: 10, user: 10, tenant: 10 },
      warningThresholdRatio: 0.5,
      hardStopThresholdRatio: 1,
      overagePolicy: "deny",
      sponsorshipMeta: { sponsorId: null, note: null },
      promotionalAllowanceMinor: 0,
      enabled: true,
    });
    const metering = {
      ...defaultMeteringBinding(),
      budgetPolicyId: "budget.tiny.v1",
    };
    // fixed request cost 5 → two successes approach/stop
    f.recordUsage({
      actor: actor(),
      metering,
      requestId: "b1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      source: "shared_ai_service",
      nowIso: NOW,
    });
    const warn = f.preflight({
      actor: actor(),
      capabilityId: "platform.translation_suggest",
      metering,
      tenantId: TENANT,
      userId: USER,
      nowIso: NOW,
    });
    expect(warn.budget.warning || warn.decision !== "denied").toBe(true);
    f.recordUsage({
      actor: actor(),
      metering,
      requestId: "b2",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      source: "shared_ai_service",
      nowIso: NOW,
    });
    const stop = f.preflight({
      actor: actor(),
      capabilityId: "platform.translation_suggest",
      metering,
      tenantId: TENANT,
      userId: USER,
      nowIso: NOW,
    });
    expect(stop.decision).toBe("denied");
    expect(stop.denialReason).toMatch(/Budget hard stop/i);
  });

  it("estimates cost with price version from local fixtures", () => {
    const policy = aiUsageFoundationStore.getCostPolicy(
      "cost.fixture.default.v1"
    )!;
    expect(validateCostPolicy(policy)).toEqual([]);
    const est = estimateUsageCost({
      policy,
      inputUnits: 2,
      outputUnits: 3,
      requestCount: 1,
    });
    expect(est.pricingSource).toBe("local_fixture");
    expect(est.priceVersion).toBe("fixture-price-v1");
    expect(est.estimatedCostMinor).toBe(2 * 1 + 3 * 2 + 5);
  });

  it("applies failure and retry charging policies; rejected has no cost", () => {
    const f = new AiUsageQuotasBillingFoundation();
    const metering = defaultMeteringBinding();
    const rejected = f.recordUsage({
      actor: actor(),
      metering,
      requestId: "rej1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "rejected",
      source: "shared_ai_service",
      nowIso: NOW,
    }).event;
    expect(rejected.countedTowardQuota).toBe(false);
    expect(rejected.estimatedCostMinor).toBe(0);

    const partial = f.recordUsage({
      actor: actor(),
      metering: { ...metering, failureChargingPolicy: "partial_units_only" },
      requestId: "fail1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "failed",
      inputUnits: 1,
      outputUnits: 0,
      source: "shared_ai_service",
      nowIso: NOW,
    }).event;
    expect(partial.countedTowardQuota).toBe(true);
    expect(partial.failureClass).toBe("post_execution_failure");

    const retrySkip = f.recordUsage({
      actor: actor(),
      metering: { ...metering, retryChargingPolicy: "never_charge_retries" },
      requestId: "retry1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      retryCount: 2,
      source: "shared_ai_service",
      nowIso: NOW,
    }).event;
    expect(retrySkip.countedTowardQuota).toBe(false);
  });

  it("idempotent recording prevents double counting", () => {
    const f = new AiUsageQuotasBillingFoundation();
    const metering = defaultMeteringBinding();
    const a = f.recordUsage({
      actor: actor(),
      metering,
      requestId: "idem1",
      idempotencyKey: "k1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      source: "shared_ai_service",
      nowIso: NOW,
    });
    const b = f.recordUsage({
      actor: actor(),
      metering,
      requestId: "idem1",
      idempotencyKey: "k1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      source: "shared_ai_service",
      nowIso: NOW,
    });
    expect(b.duplicate).toBe(true);
    expect(b.event.usageEventId).toBe(a.event.usageEventId);
    expect(f.listRecentEvents(adminUsageActor(USER, TENANT), 100)).toHaveLength(
      1
    );
  });

  it("enforces tenant isolation and permissions", () => {
    const f = new AiUsageQuotasBillingFoundation();
    expect(() =>
      requireUsagePermission(
        { userId: USER, tenantId: TENANT, permissions: [] },
        "usage_record"
      )
    ).toThrow(AiPlatformError);

    f.recordUsage({
      actor: actor(),
      metering: defaultMeteringBinding(),
      requestId: "iso1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      source: "shared_ai_service",
      nowIso: NOW,
    });
    expect(() =>
      f.buildUserViewModel({
        actor: {
          userId: "other",
          tenantId: "other_tenant",
          permissions: ["usage_read_self"],
        },
        tenantId: TENANT,
        userId: USER,
        nowIso: NOW,
      })
    ).toThrow(/Tenant isolation|Cannot read/i);

    expect(() =>
      assertSelfOrAdmin(
        { userId: "other", tenantId: TENANT, permissions: ["usage_read_self"] },
        USER
      )
    ).toThrow(/Cannot read/);
  });

  it("builds user-facing view model and aggregations", () => {
    const f = new AiUsageQuotasBillingFoundation();
    f.recordUsage({
      actor: actor(),
      metering: defaultMeteringBinding(),
      requestId: "vm1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      source: "shared_ai_service",
      nowIso: NOW,
    });
    const vm = f.buildUserViewModel({
      actor: actor(),
      tenantId: TENANT,
      userId: USER,
      nowIso: NOW,
    });
    expect(vm.todayUnits).toBeGreaterThanOrEqual(1);
    expect(vm.resetAt).toBeTruthy();
    const agg = f.aggregate(adminUsageActor(USER, TENANT));
    expect(agg.byCapability[0]?.key).toBe("platform.translation_suggest");
    expect(agg.byTenant[0]?.key).toBe(TENANT);
    expect(agg.byUser[0]?.key).toBe(USER);
    expect(agg.totals.events).toBe(1);
  });

  it("redacts prompts/secrets and keeps audit linkage", () => {
    const meta = redactUsageMetadata({
      prompt: "secret prompt",
      apiKey: "sk-abcdefghijklmnop",
      safeFlag: true,
      note: "ok",
    });
    expect(meta.prompt).toBeUndefined();
    expect(meta.apiKey).toBeUndefined();
    expect(meta.safeFlag).toBe(true);
    expect(assertNoPromptOrSecretFields({ prompt: "x" }).length).toBe(1);

    const f = new AiUsageQuotasBillingFoundation();
    const { event } = f.recordUsage({
      actor: actor(),
      metering: defaultMeteringBinding(),
      requestId: "aud1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      source: "shared_ai_service",
      auditEventId: "audit_123",
      correlationId: "corr_123",
      metadata: { prompt: "nope", path: "safe" },
      nowIso: NOW,
    });
    expect(event.auditEventId).toBe("audit_123");
    expect(event.correlationId).toBe("corr_123");
    expect(event.metadata.prompt).toBeUndefined();
  });

  it("keeps charge intent disabled and non-executable", () => {
    const intent = createDisabledUsageChargeIntent({
      usageEventId: "ue1",
      tenantId: TENANT,
      estimatedCostMinor: 5,
      currency: "USD",
    });
    expect(intent.executable).toBe(false);
    expect(intent.revenueBridgeEnabled).toBe(false);
    expect(isRevenueBridgeAllowed()).toBe(false);
    expect(() => executeUsageChargeIntent(intent)).toThrow(/non-executable/i);
  });

  it("uses default metering binding without Capability Catalog", () => {
    const metering = defaultMeteringBinding();
    expect(metering.quotaPolicyId).toBeTruthy();
    expect(metering.budgetPolicyId).toBeTruthy();
    expect(metering.estimationPolicyId).toBeTruthy();
    expect(metering.usageUnitType).toBe("request");
  });

  it("contract-test source does not count as production usage", () => {
    const f = new AiUsageQuotasBillingFoundation();
    const { event } = f.recordUsage({
      actor: actor(),
      metering: defaultMeteringBinding(),
      requestId: "ct1",
      capabilityId: "platform.translation_suggest",
      tenantId: TENANT,
      userId: USER,
      status: "success",
      source: "contract_test",
      contractTest: true,
      nowIso: NOW,
    });
    expect(event.countedTowardQuota).toBe(false);
    expect(event.countedTowardBudget).toBe(false);
    expect(event.failureClass).toBe("contract_test");
  });

  it("architecture guard: no client usage mutation / stripe / revenue bridge", () => {
    const root = join(process.cwd());
    const foundation = readFileSync(
      join(root, "lib/ai/usage/usageFoundation.ts"),
      "utf8"
    );
    const charge = readFileSync(
      join(root, "lib/ai/usage/chargeIntent.ts"),
      "utf8"
    );
    const adminPage = readFileSync(
      join(root, "app/admin/ai/usage/page.tsx"),
      "utf8"
    );
    expect(foundation).not.toMatch(/stripe/i);
    expect(foundation).not.toMatch(/commerceRevenueBridge/);
    expect(foundation).not.toMatch(/wallet/i);
    expect(charge).toMatch(/disabled_non_executable/);
    expect(charge).toMatch(/revenueBridgeEnabled: false/);
    expect(adminPage).toMatch(/assertPlatformAdminDb/);
    expect(adminPage).not.toMatch(/"use client"/);
    // Client components must not import the foundation store mutators.
    expect(adminPage).not.toMatch(/recordUsage\(/);
  });

  it("fail-closed when required policy is missing", () => {
    const f = new AiUsageQuotasBillingFoundation();
    expect(() =>
      f.preflight({
        actor: actor(),
        capabilityId: "platform.translation_suggest",
        metering: {
          ...defaultMeteringBinding(),
          quotaPolicyId: "missing.policy",
        },
        tenantId: TENANT,
        userId: USER,
        nowIso: NOW,
      })
    ).toThrow(/quota policy missing/i);
  });
});
