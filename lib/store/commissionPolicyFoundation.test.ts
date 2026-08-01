import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMMISSION_POLICY_FOUNDATION_ID,
  calculateCommissionSplit,
  commissionDoesNotAlterSettlementAmount,
  commissionDoesNotEnablePayoutExecution,
  merchandiseNetBasisMinor,
  rejectClientCommissionPercentages,
  resolveAndCalculateCommission,
  selectCommissionPolicy,
  validateCommissionPolicyContract,
  type CommissionPolicyContract,
} from "./commissionPolicyFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260884_store_commission_policy_foundation_v1.sql";
const DOC = "docs/store/implementation/COMMISSION_POLICY_FOUNDATION_V1.md";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function policy(
  overrides: Partial<CommissionPolicyContract> = {}
): CommissionPolicyContract {
  return {
    policyCode: "store.default.commission",
    version: 1,
    status: "active",
    currency: "USD",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    basisKind: "merchandise_net",
    lines: [
      { role: "platform", bps: 1000 },
      { role: "seller", bps: 8500 },
      { role: "supplier", bps: 500 },
      { role: "affiliate", bps: 0 },
      { role: "partner", bps: 0 },
    ],
    description: "Test policy",
    ...overrides,
  };
}

describe("Commission Policy Foundation V1 — files", () => {
  it("ships migration and documentation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(COMMISSION_POLICY_FOUNDATION_ID).toBe(
      "commerce.revenue.commission_policy_foundation_v1"
    );
  });
});

describe("Commission Policy Foundation V1 — calculation", () => {
  it("commission calculation conserves basis with remainder to seller", () => {
    const calc = calculateCommissionSplit({
      policy: policy(),
      basisMinor: 1000,
      currency: "USD",
    });
    expect(calc.ok).toBe(true);
    if (!calc.ok) return;
    expect(calc.platformCommissionMinor).toBe(100);
    expect(calc.supplierAmountMinor).toBe(50);
    expect(calc.sellerAmountMinor).toBe(850);
    expect(
      calc.platformCommissionMinor +
        calc.sellerAmountMinor +
        calc.supplierAmountMinor +
        calc.affiliateAmountMinor +
        calc.partnerAmountMinor
    ).toBe(1000);
    expect(calc.calculationFingerprint).toContain("policyCode=");
  });

  it("multiple active policies for one currency fail closed", () => {
    const selected = selectCommissionPolicy({
      currency: "USD",
      at: "2026-06-01T00:00:00.000Z",
      policies: [
        policy({ version: 1, lines: [{ role: "platform", bps: 500 }, { role: "seller", bps: 9500 }] }),
        policy({ version: 2, lines: [{ role: "platform", bps: 1000 }, { role: "seller", bps: 9000 }] }),
      ],
    });
    expect(selected.ok).toBe(false);
    if (!selected.ok) {
      expect(selected.code).toBe("ambiguous_policy");
    }
  });

  it("currency separation fails closed across currencies", () => {
    const selected = selectCommissionPolicy({
      currency: "ZAR",
      at: "2026-06-01T00:00:00.000Z",
      policies: [policy({ currency: "USD" })],
    });
    expect(selected.ok).toBe(false);
    if (!selected.ok) {
      expect(selected.code).toBe("missing_policy");
    }

    const mismatch = calculateCommissionSplit({
      policy: policy({ currency: "USD" }),
      basisMinor: 100,
      currency: "EUR",
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) {
      expect(mismatch.code).toBe("currency_mismatch");
    }
  });

  it("effective date selection uses superseded historical windows", () => {
    const policies = [
      policy({
        version: 1,
        status: "superseded",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: "2026-04-01T00:00:00.000Z",
      }),
      policy({
        version: 2,
        status: "active",
        effectiveFrom: "2026-04-01T00:00:00.000Z",
        effectiveTo: null,
      }),
    ];
    const early = selectCommissionPolicy({
      policies,
      currency: "USD",
      at: "2026-02-01T00:00:00.000Z",
    });
    expect(early.ok && early.policy.version).toBe(1);
    const late = selectCommissionPolicy({
      policies,
      currency: "USD",
      at: "2026-05-01T00:00:00.000Z",
    });
    expect(late.ok && late.policy.version).toBe(2);
    const before = selectCommissionPolicy({
      policies,
      currency: "USD",
      at: "2025-12-01T00:00:00.000Z",
    });
    expect(before.ok).toBe(false);
  });

  it("invalid policy fails closed", () => {
    const badSum = validateCommissionPolicyContract(
      policy({
        lines: [
          { role: "platform", bps: 1000 },
          { role: "seller", bps: 1000 },
        ],
      })
    );
    expect(badSum.ok).toBe(false);

    const missingSeller = validateCommissionPolicyContract(
      policy({
        lines: [
          { role: "platform", bps: 5000 },
          { role: "affiliate", bps: 5000 },
        ],
      })
    );
    expect(missingSeller.ok).toBe(false);

    const draftIgnored = selectCommissionPolicy({
      currency: "USD",
      at: "2026-06-01T00:00:00.000Z",
      policies: [policy({ status: "draft" })],
    });
    expect(draftIgnored.ok).toBe(false);
  });

  it("missing policy fails closed", () => {
    const missing = resolveAndCalculateCommission({
      policies: [],
      currency: "USD",
      at: "2026-06-01T00:00:00.000Z",
      basisMinor: 1000,
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.code).toBe("missing_policy");
    }
  });

  it("rejects client-supplied percentages", () => {
    expect(rejectClientCommissionPercentages({ platform_percent: 10 }).ok).toBe(
      false
    );
    expect(
      rejectClientCommissionPercentages({
        currency: "USD",
        basisMinor: 100,
      }).ok
    ).toBe(true);
  });

  it("settlement and payout compatibility guarantees", () => {
    const calc = calculateCommissionSplit({
      policy: policy(),
      basisMinor: 1000,
      currency: "USD",
    });
    expect(calc.ok).toBe(true);
    if (calc.ok) {
      expect(
        commissionDoesNotAlterSettlementAmount({
          captureAmountMinor: 1200,
          commission: calc,
        })
      ).toBe(true);
    }
    expect(commissionDoesNotEnablePayoutExecution()).toBe(false);
    expect(merchandiseNetBasisMinor({ subtotalMinor: 1000, discountTotalMinor: 100 })).toBe(
      900
    );
  });

  it("supports affiliate/partner lines without inventing payouts", () => {
    const calc = calculateCommissionSplit({
      policy: policy({
        lines: [
          { role: "platform", bps: 800 },
          { role: "seller", bps: 8000 },
          { role: "supplier", bps: 700 },
          { role: "affiliate", bps: 300 },
          { role: "partner", bps: 200 },
        ],
      }),
      basisMinor: 10000,
      currency: "USD",
    });
    expect(calc.ok).toBe(true);
    if (!calc.ok) return;
    expect(calc.affiliateAmountMinor).toBe(300);
    expect(calc.partnerAmountMinor).toBe(200);
    expect(
      calc.platformCommissionMinor +
        calc.sellerAmountMinor +
        calc.supplierAmountMinor +
        calc.affiliateAmountMinor +
        calc.partnerAmountMinor
    ).toBe(10000);
  });
});

describe("Commission Policy Foundation V1 — migration contracts", () => {
  const sql = read(MIGRATION);

  it("creates versioned currency-isolated registry without active seed", () => {
    expect(sql).toMatch(/create table if not exists public\.store_commission_policies/);
    expect(sql).toMatch(/platform_bps/);
    expect(sql).toMatch(/seller_bps/);
    expect(sql).toMatch(/supplier_bps/);
    expect(sql).toMatch(/affiliate_bps/);
    expect(sql).toMatch(/partner_bps/);
    expect(sql).toMatch(/= 10000/);
    expect(sql).toMatch(/No active policy seed/i);
    expect(sql).not.toMatch(/insert into public\.store_commission_policies/i);
  });

  it("exposes service-role resolve + compute; revokes authenticated", () => {
    expect(sql).toMatch(/resolve_store_commission_policy/);
    expect(sql).toMatch(/compute_store_commission_split/);
    expect(sql).toMatch(
      /grant execute on function public\.resolve_store_commission_policy\(text, timestamptz\)\s+to service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.resolve_store_commission_policy\(text, timestamptz\)\s+from public, anon, authenticated/i
    );
    expect(sql).toMatch(/Does NOT:[\s\S]*Dashboard\/Admin UI/);
  });

  it("documents capability and non-breaking boundaries", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/commerce\.revenue\.commission_policy_foundation_v1/);
    expect(doc).toMatch(/20260884/);
    expect(doc).toMatch(/platform/);
    expect(doc).toMatch(/seller/);
    expect(doc).toMatch(/supplier/);
    expect(doc).toMatch(/affiliate/);
    expect(doc).toMatch(/Settlement/i);
    expect(doc).toMatch(/fail closed/i);
    expect(doc).toMatch(/Dashboard/i);
  });
});
