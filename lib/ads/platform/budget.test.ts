import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_BUDGET_CONTRACT_VERSION,
  ADS_BUDGET_MAX_MINOR,
  ADS_BUDGET_REJECTION_REASONS,
  evaluateAdsBudget,
  parseAdsBudgetSnapshot,
  validateAdsBudgetEvaluationResult,
  validateAdsBudgetSnapshot,
  type AdsBudgetEvaluationResult,
  type AdsBudgetSnapshot,
} from "./budget";

const SOURCE_PATH = path.join(__dirname, "budget.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function snapshot(
  overrides: Partial<AdsBudgetSnapshot> & { candidateId?: string } = {}
): AdsBudgetSnapshot {
  return Object.freeze({
    candidateId: overrides.candidateId ?? "cand-1",
    dailyBudgetMinor:
      overrides.dailyBudgetMinor === undefined
        ? 10_000
        : overrides.dailyBudgetMinor,
    lifetimeBudgetMinor:
      overrides.lifetimeBudgetMinor === undefined
        ? 100_000
        : overrides.lifetimeBudgetMinor,
    remainingBudgetMinor: overrides.remainingBudgetMinor ?? 5_000,
  });
}

function expectKillSwitchesOff(result: AdsBudgetEvaluationResult): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
}

describe("Ads Budget Foundation V1", () => {
  it("exposes contract version and runtime-aligned rejection order", () => {
    expect(ADS_BUDGET_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_BUDGET_REJECTION_REASONS]).toEqual([
      "no_budget_configured",
      "remaining_exceeds_daily_budget",
      "remaining_exceeds_lifetime_budget",
      "remaining_budget_exhausted",
    ]);
    expect(ADS_BUDGET_MAX_MINOR).toBe(1_000_000_000_000);
    expect(SOURCE).toMatch(/single `remainingBudgetMinor`/);
    expect(SOURCE).not.toMatch(/daily_budget_exhausted|lifetime_budget_exhausted/);
  });

  it("has no spending, billing, ledger, payments, randomness, or product imports", () => {
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(/\bstripe\b|\bpaypal\b|\bledger\b/i);
    expect(SOURCE).not.toMatch(/from ["'][^"']*supabase[^"']*["']/i);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|learning|store|world|messages|live)\//i
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
  });

  it("marks eligible budgets with diagnostics and metadata", () => {
    const outcome = evaluateAdsBudget(snapshot());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.budgetEligible).toBe(true);
    expect(outcome.result.rejectionReason).toBeNull();
    expect(outcome.result.diagnostics.dailyConstraintActive).toBe(true);
    expect(outcome.result.diagnostics.lifetimeConstraintActive).toBe(true);
    expect(outcome.result.diagnostics.remainingBudgetMinor).toBe(5_000);
    expect(outcome.result.metadata.contractVersion).toBe(
      ADS_BUDGET_CONTRACT_VERSION
    );
    expectKillSwitchesOff(outcome.result);
    expect(validateAdsBudgetEvaluationResult(outcome.result).valid).toBe(true);
  });

  it("allows daily-only or lifetime-only constraints", () => {
    const dailyOnly = evaluateAdsBudget(
      snapshot({ lifetimeBudgetMinor: null, remainingBudgetMinor: 1 })
    );
    expect(dailyOnly.valid).toBe(true);
    if (!dailyOnly.valid) return;
    expect(dailyOnly.result.budgetEligible).toBe(true);

    const lifetimeOnly = evaluateAdsBudget(
      snapshot({ dailyBudgetMinor: null, remainingBudgetMinor: 1 })
    );
    expect(lifetimeOnly.valid).toBe(true);
    if (!lifetimeOnly.valid) return;
    expect(lifetimeOnly.result.budgetEligible).toBe(true);
  });

  it("rejects zero daily budget as invalid (must be null or positive)", () => {
    const parsed = parseAdsBudgetSnapshot(snapshot({ dailyBudgetMinor: 0 }));
    expect(parsed.valid).toBe(false);
    if (parsed.valid) return;
    expect(
      parsed.issues.some((issue) => issue.includes("dailyBudgetMinor"))
    ).toBe(true);
  });

  it("rejects zero lifetime budget as invalid (must be null or positive)", () => {
    const parsed = parseAdsBudgetSnapshot(snapshot({ lifetimeBudgetMinor: 0 }));
    expect(parsed.valid).toBe(false);
    if (parsed.valid) return;
    expect(
      parsed.issues.some((issue) => issue.includes("lifetimeBudgetMinor"))
    ).toBe(true);
  });

  it("rejects zero remaining budget as exhausted", () => {
    const outcome = evaluateAdsBudget(snapshot({ remainingBudgetMinor: 0 }));
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.budgetEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("remaining_budget_exhausted");
    expectKillSwitchesOff(outcome.result);
  });

  it("rejects remaining exceeding daily limit", () => {
    const outcome = evaluateAdsBudget(
      snapshot({
        dailyBudgetMinor: 100,
        lifetimeBudgetMinor: 10_000,
        remainingBudgetMinor: 101,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.rejectionReason).toBe(
      "remaining_exceeds_daily_budget"
    );
  });

  it("rejects remaining exceeding lifetime limit", () => {
    const outcome = evaluateAdsBudget(
      snapshot({
        dailyBudgetMinor: null,
        lifetimeBudgetMinor: 100,
        remainingBudgetMinor: 101,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.rejectionReason).toBe(
      "remaining_exceeds_lifetime_budget"
    );
  });

  it("fail-closes when lifetime is lower than daily", () => {
    const parsed = parseAdsBudgetSnapshot(
      snapshot({
        dailyBudgetMinor: 500,
        lifetimeBudgetMinor: 100,
        remainingBudgetMinor: 50,
      })
    );
    expect(parsed.valid).toBe(false);
    if (parsed.valid) return;
    expect(
      parsed.issues.some((issue) =>
        issue.includes("lifetimeBudgetMinor must be greater than or equal")
      )
    ).toBe(true);
  });

  it("rejects when no budget is configured", () => {
    const outcome = evaluateAdsBudget(
      snapshot({
        dailyBudgetMinor: null,
        lifetimeBudgetMinor: null,
        remainingBudgetMinor: 100,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.rejectionReason).toBe("no_budget_configured");
  });

  it("fail-closes on negative / fractional / NaN / Infinity amounts", () => {
    for (const remainingBudgetMinor of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(
        parseAdsBudgetSnapshot(snapshot({ remainingBudgetMinor })).valid
      ).toBe(false);
    }

    for (const dailyBudgetMinor of [
      -5,
      1.25,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(
        parseAdsBudgetSnapshot(snapshot({ dailyBudgetMinor })).valid
      ).toBe(false);
    }

    for (const lifetimeBudgetMinor of [
      -5,
      2.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(
        parseAdsBudgetSnapshot(snapshot({ lifetimeBudgetMinor })).valid
      ).toBe(false);
    }
  });

  it("fail-closes on empty, malformed, and unknown-field input", () => {
    expect(evaluateAdsBudget(null).valid).toBe(false);
    expect(evaluateAdsBudget(undefined).valid).toBe(false);
    expect(evaluateAdsBudget([]).valid).toBe(false);
    expect(evaluateAdsBudget("cand-1").valid).toBe(false);
    expect(evaluateAdsBudget({}).valid).toBe(false);

    expect(
      validateAdsBudgetSnapshot({
        ...snapshot(),
        spend: 1,
      } as unknown).valid
    ).toBe(false);

    expect(
      parseAdsBudgetSnapshot({ ...snapshot(), candidateId: "" }).valid
    ).toBe(false);
  });

  it("uses deterministic first-match rejection order", () => {
    // exceeds daily beats exhausted (remaining > daily implies remaining > 0)
    const exceedsDaily = evaluateAdsBudget(
      snapshot({
        dailyBudgetMinor: 50,
        lifetimeBudgetMinor: 10_000,
        remainingBudgetMinor: 51,
      })
    );
    expect(exceedsDaily.valid).toBe(true);
    if (!exceedsDaily.valid) return;
    expect(exceedsDaily.result.rejectionReason).toBe(
      "remaining_exceeds_daily_budget"
    );

    // exceeds lifetime when daily inactive
    const exceedsLifetime = evaluateAdsBudget(
      snapshot({
        dailyBudgetMinor: null,
        lifetimeBudgetMinor: 50,
        remainingBudgetMinor: 51,
      })
    );
    expect(exceedsLifetime.valid).toBe(true);
    if (!exceedsLifetime.valid) return;
    expect(exceedsLifetime.result.rejectionReason).toBe(
      "remaining_exceeds_lifetime_budget"
    );

    // exhausted only when remaining is zero and caps are consistent
    const exhausted = evaluateAdsBudget(
      snapshot({
        dailyBudgetMinor: 50,
        lifetimeBudgetMinor: 100,
        remainingBudgetMinor: 0,
      })
    );
    expect(exhausted.valid).toBe(true);
    if (!exhausted.valid) return;
    expect(exhausted.result.rejectionReason).toBe(
      "remaining_budget_exhausted"
    );
  });

  it("is deterministic and does not mutate frozen input", () => {
    const input = snapshot({ remainingBudgetMinor: 42 });
    Object.freeze(input);

    const first = evaluateAdsBudget(input);
    const second = evaluateAdsBudget(input);
    expect(first).toEqual(second);
    expect(input.remainingBudgetMinor).toBe(42);

    if (!first.valid) return;
    expect(Object.isFrozen(first.result)).toBe(true);
    expect(Object.isFrozen(first.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(first.result.metadata)).toBe(true);
  });

  it("keeps kill switches false on all outcomes", () => {
    const cases = [
      snapshot(),
      snapshot({ remainingBudgetMinor: 0 }),
      snapshot({ dailyBudgetMinor: null, lifetimeBudgetMinor: null }),
    ];
    for (const input of cases) {
      const outcome = evaluateAdsBudget(input);
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) continue;
      expectKillSwitchesOff(outcome.result);
    }
  });
});
