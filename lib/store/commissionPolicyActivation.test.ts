import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMMISSION_LAUNCH_CURRENCIES,
  COMMISSION_LAUNCH_LINES,
  COMMISSION_LAUNCH_POLICY_CODE,
  COMMISSION_POLICY_ACTIVATION_ID,
  COMMISSION_POLICY_ACTIVATION_MIGRATION,
  applyLaunchCommissionPolicySeed,
  assertLaunchCommissionLinesIntegrity,
  buildLaunchCommissionPolicy,
  commissionActivationCompatibility,
  findConflictingActiveCommissionPolicies,
  isCommissionLaunchCurrency,
  resolveLaunchAwareCommission,
} from "./commissionPolicyActivation";
import {
  COMMISSION_POLICY_BPS_SCALE,
  type CommissionPolicyContract,
} from "./commissionPolicyFoundation";

const ROOT = process.cwd();
const MIGRATION = `supabase/migrations/${COMMISSION_POLICY_ACTIVATION_MIGRATION}`;
const FOUNDATION_MIG =
  "supabase/migrations/20260884_store_commission_policy_foundation_v1.sql";
const UEOS_MIG = "supabase/migrations/20260822_ueos_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function existingActive(
  currency: string,
  overrides: Partial<CommissionPolicyContract> = {}
): CommissionPolicyContract {
  return {
    policyCode: "store.operator.custom",
    version: 1,
    status: "active",
    currency,
    effectiveFrom: "2025-01-01T00:00:00.000Z",
    effectiveTo: null,
    basisKind: "merchandise_net",
    lines: [
      { role: "platform", bps: 500 },
      { role: "seller", bps: 9500 },
    ],
    description: "Pre-existing operator policy",
    ...overrides,
  };
}

describe("Commission Policy Activation V1 — files", () => {
  it("ships migration after foundation and documents capability", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, FOUNDATION_MIG))).toBe(true);
    expect(COMMISSION_POLICY_ACTIVATION_ID).toBe(
      "commerce.revenue.commission_policy_activation_v1"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(/store_commission_activate_launch_policy_v1/);
    expect(sql).toMatch(/active_policy_already_present/);
    expect(sql).toMatch(/store_commission_assert_no_conflicting_active/);
    expect(sql).toMatch(/store\.launch\.commission\.v1/);
  });

  it("seeds only UEOS fiat_minor currencies — no invented codes", () => {
    const ueos = read(UEOS_MIG);
    for (const c of COMMISSION_LAUNCH_CURRENCIES) {
      expect(ueos).toMatch(new RegExp(`\\('${c}',\\s*'fiat_minor'`));
      expect(isCommissionLaunchCurrency(c)).toBe(true);
    }
    expect(isCommissionLaunchCurrency("ZAR")).toBe(false);
    expect(isCommissionLaunchCurrency("UM_POINTS")).toBe(false);
  });
});

describe("Commission Policy Activation V1 — seed behavior", () => {
  it("seeds empty registry for all launch currencies", () => {
    const linesOk = assertLaunchCommissionLinesIntegrity();
    expect(linesOk.ok).toBe(true);
    const sum = COMMISSION_LAUNCH_LINES.reduce((a, l) => a + l.bps, 0);
    expect(sum).toBe(COMMISSION_POLICY_BPS_SCALE);

    const result = applyLaunchCommissionPolicySeed([]);
    expect(result.inserted).toEqual([...COMMISSION_LAUNCH_CURRENCIES]);
    expect(result.skipped).toEqual([]);
    expect(result.policies).toHaveLength(COMMISSION_LAUNCH_CURRENCIES.length);
    expect(
      result.policies.every((p) => p.policyCode === COMMISSION_LAUNCH_POLICY_CODE)
    ).toBe(true);
  });

  it("is idempotent — re-apply does not duplicate", () => {
    const first = applyLaunchCommissionPolicySeed([]);
    const second = applyLaunchCommissionPolicySeed(first.policies);
    expect(second.inserted).toEqual([]);
    expect(second.skipped).toHaveLength(COMMISSION_LAUNCH_CURRENCIES.length);
    expect(second.policies).toHaveLength(first.policies.length);
    expect(
      second.skipped.every((s) => s.reason === "active_policy_already_present")
    ).toBe(true);
  });

  it("does not overwrite a pre-existing active policy", () => {
    const existing = [existingActive("USD")];
    const result = applyLaunchCommissionPolicySeed(existing);
    expect(result.inserted).not.toContain("USD");
    expect(
      result.skipped.some(
        (s) => s.currency === "USD" && s.reason === "active_policy_already_present"
      )
    ).toBe(true);
    const usd = result.policies.filter((p) => p.currency === "USD");
    expect(usd).toHaveLength(1);
    expect(usd[0]?.policyCode).toBe("store.operator.custom");
    expect(usd[0]?.lines.find((l) => l.role === "platform")?.bps).toBe(500);
  });

  it("selects policy by currency correctly after seed", () => {
    const { policies } = applyLaunchCommissionPolicySeed([]);
    const usd = resolveLaunchAwareCommission({
      policies,
      currency: "USD",
      basisMinor: 10000,
    });
    expect(usd.ok).toBe(true);
    if (usd.ok) {
      expect(usd.currency).toBe("USD");
      expect(usd.policyCode).toBe(COMMISSION_LAUNCH_POLICY_CODE);
    }

    const eur = resolveLaunchAwareCommission({
      policies,
      currency: "EUR",
      basisMinor: 10000,
    });
    expect(eur.ok).toBe(true);
    if (eur.ok) {
      expect(eur.currency).toBe("EUR");
    }
  });

  it("missing policy remains fail-closed for unsupported currencies", () => {
    const { policies } = applyLaunchCommissionPolicySeed([]);
    const zar = resolveLaunchAwareCommission({
      policies,
      currency: "ZAR",
      basisMinor: 10000,
    });
    expect(zar.ok).toBe(false);
    if (!zar.ok) {
      expect(zar.code).toBe("missing_policy");
    }
  });
});

describe("Commission Policy Activation V1 — split allocation", () => {
  it("commission split totals conserve basis with seller/supplier/platform", () => {
    const policy = buildLaunchCommissionPolicy("USD");
    const calc = resolveLaunchAwareCommission({
      policies: [policy],
      currency: "USD",
      basisMinor: 1000,
    });
    expect(calc.ok).toBe(true);
    if (!calc.ok) return;
    expect(calc.platformCommissionMinor).toBe(100);
    expect(calc.sellerAmountMinor).toBe(850);
    expect(calc.supplierAmountMinor).toBe(50);
    expect(
      calc.platformCommissionMinor +
        calc.sellerAmountMinor +
        calc.supplierAmountMinor +
        calc.affiliateAmountMinor +
        calc.partnerAmountMinor
    ).toBe(1000);
  });

  it("detects conflicting active policy codes per currency", () => {
    const conflicts = findConflictingActiveCommissionPolicies([
      buildLaunchCommissionPolicy("USD"),
      existingActive("USD"),
    ]);
    expect(conflicts).toEqual([
      {
        currency: "USD",
        policyCodes: ["store.launch.commission.v1", "store.operator.custom"],
      },
    ]);
    expect(
      findConflictingActiveCommissionPolicies([
        buildLaunchCommissionPolicy("USD"),
        buildLaunchCommissionPolicy("EUR"),
      ])
    ).toEqual([]);
  });

  it("compatibility — no Stripe / payout rails / settlement mutation", () => {
    const c = commissionActivationCompatibility();
    expect(c.inventsStripe).toBe(false);
    expect(c.inventsPayoutRails).toBe(false);
    expect(c.altersSettlementCaptureAmount).toBe(false);
  });
});

describe("Commission Policy Activation V1 — SQL contract", () => {
  it("migration SQL rejects non-UEOS currencies and skips existing actives", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/ueos_assets/);
    expect(sql).toMatch(/fiat_minor/);
    expect(sql).toMatch(/lifecycle_status = 'active'/);
    expect(sql).toMatch(/platform_bps,\s*\n\s*seller_bps,\s*\n\s*supplier_bps/);
    expect(sql).toMatch(/1000/);
    expect(sql).toMatch(/8500/);
    expect(sql).toMatch(/500/);
    for (const c of COMMISSION_LAUNCH_CURRENCIES) {
      expect(sql).toMatch(
        new RegExp(`store_commission_activate_launch_policy_v1\\('${c}'\\)`)
      );
    }
  });
});
