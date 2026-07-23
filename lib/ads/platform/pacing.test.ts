import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { AdsBudgetSnapshot } from "./budget";
import {
  ADS_BUDGET_PACING_REJECTION_REASONS,
  ADS_PACING_CONTRACT_VERSION,
  ADS_PACING_ELIGIBLE_STATES,
  ADS_PACING_REJECTION_REASONS,
  ADS_PACING_STATES,
  evaluateAdsBudgetPacing,
  evaluateAdsPacing,
  parseAdsBudgetPacingInput,
  parseAdsPacingSnapshot,
  validateAdsBudgetPacingEvaluationResult,
  validateAdsPacingEvaluationResult,
  validateAdsPacingSnapshot,
  type AdsBudgetPacingEvaluationResult,
  type AdsPacingEvaluationResult,
  type AdsPacingSnapshot,
  type AdsPacingWindow,
} from "./pacing";

const SOURCE_PATH = path.join(__dirname, "pacing.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function window(
  overrides: Partial<AdsPacingWindow> = {}
): AdsPacingWindow {
  return Object.freeze({
    windowId: overrides.windowId ?? "win-1",
    targetDeliveryFraction: overrides.targetDeliveryFraction ?? 0.5,
    actualDeliveryFraction: overrides.actualDeliveryFraction ?? 0.4,
  });
}

function pacing(
  overrides: {
    candidateId?: string;
    pacingState?: AdsPacingSnapshot["pacingState"];
    pacingWindow?: Partial<AdsPacingWindow>;
  } = {}
): AdsPacingSnapshot {
  return Object.freeze({
    candidateId: overrides.candidateId ?? "cand-1",
    pacingState: overrides.pacingState ?? "on_pace",
    pacingWindow: window(overrides.pacingWindow),
  });
}

function budget(
  overrides: Partial<AdsBudgetSnapshot> = {}
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

function expectPacingKillSwitchesOff(result: AdsPacingEvaluationResult): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
}

function expectCombinedKillSwitchesOff(
  result: AdsBudgetPacingEvaluationResult
): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
}

describe("Ads Pacing Foundation V1", () => {
  it("exposes contract version, states, and rejection reasons", () => {
    expect(ADS_PACING_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_PACING_STATES]).toEqual([
      "on_pace",
      "behind",
      "ahead",
      "throttled",
      "paused",
    ]);
    expect([...ADS_PACING_ELIGIBLE_STATES]).toEqual([
      "on_pace",
      "behind",
      "ahead",
    ]);
    expect([...ADS_PACING_REJECTION_REASONS]).toEqual([
      "pacing_paused",
      "pacing_throttled",
      "pacing_window_exhausted",
      "pacing_ahead_of_plan",
    ]);
    expect([...ADS_BUDGET_PACING_REJECTION_REASONS]).toEqual([
      "no_budget_configured",
      "remaining_exceeds_daily_budget",
      "remaining_exceeds_lifetime_budget",
      "remaining_budget_exhausted",
      "pacing_paused",
      "pacing_throttled",
      "pacing_window_exhausted",
      "pacing_ahead_of_plan",
    ]);
  });

  it("removes elapsedFraction from the eligibility contract", () => {
    expect(SOURCE).toMatch(/elapsedFraction.*out of scope/i);
    expect(SOURCE).not.toMatch(/elapsedFraction: number/);
    expect(
      parseAdsPacingSnapshot({
        ...pacing(),
        pacingWindow: {
          ...window(),
          elapsedFraction: 0.5,
        },
      } as unknown).valid
    ).toBe(false);
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

  it("marks on_pace snapshots eligible with diagnostics", () => {
    const outcome = evaluateAdsPacing(pacing());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.pacingEligible).toBe(true);
    expect(outcome.result.rejectionReason).toBeNull();
    expect(outcome.result.diagnostics.stateEligible).toBe(true);
    expect(outcome.result.diagnostics.windowEligible).toBe(true);
    expect(outcome.result.diagnostics.pacingState).toBe("on_pace");
    expectPacingKillSwitchesOff(outcome.result);
    expect(validateAdsPacingEvaluationResult(outcome.result).valid).toBe(true);
  });

  it("treats actual === target as eligible (exact boundary)", () => {
    const outcome = evaluateAdsPacing(
      pacing({
        pacingState: "on_pace",
        pacingWindow: {
          targetDeliveryFraction: 0.5,
          actualDeliveryFraction: 0.5,
        },
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.pacingEligible).toBe(true);
    expect(outcome.result.rejectionReason).toBeNull();
    expect(outcome.result.diagnostics.windowEligible).toBe(true);
  });

  it("treats actual just below target as eligible (behind plan)", () => {
    const outcome = evaluateAdsPacing(
      pacing({
        pacingState: "behind",
        pacingWindow: {
          targetDeliveryFraction: 0.5,
          actualDeliveryFraction: 0.499999,
        },
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.pacingEligible).toBe(true);
    expect(outcome.result.diagnostics.windowEligible).toBe(true);
  });

  it("treats actual just above target as ahead_of_plan", () => {
    const outcome = evaluateAdsPacing(
      pacing({
        pacingState: "ahead",
        pacingWindow: {
          targetDeliveryFraction: 0.5,
          actualDeliveryFraction: 0.500001,
        },
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.pacingEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("pacing_ahead_of_plan");
    expect(outcome.result.diagnostics.windowEligible).toBe(false);
  });

  it("handles exact 0 and 1 fraction boundaries", () => {
    const atZero = evaluateAdsPacing(
      pacing({
        pacingWindow: {
          targetDeliveryFraction: 0,
          actualDeliveryFraction: 0,
        },
      })
    );
    expect(atZero.valid).toBe(true);
    if (!atZero.valid) return;
    // actual >= 1 is exhausted; actual === 0 with target === 0 is eligible
    expect(atZero.result.pacingEligible).toBe(true);

    const atOne = evaluateAdsPacing(
      pacing({
        pacingWindow: {
          targetDeliveryFraction: 1,
          actualDeliveryFraction: 1,
        },
      })
    );
    expect(atOne.valid).toBe(true);
    if (!atOne.valid) return;
    expect(atOne.result.pacingEligible).toBe(false);
    expect(atOne.result.rejectionReason).toBe("pacing_window_exhausted");
  });

  it("allows behind and ahead states when window is within plan", () => {
    for (const pacingState of ["behind", "ahead"] as const) {
      const outcome = evaluateAdsPacing(
        pacing({
          pacingState,
          pacingWindow: {
            targetDeliveryFraction: 0.6,
            actualDeliveryFraction: 0.5,
          },
        })
      );
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.result.pacingEligible).toBe(true);
    }
  });

  it("rejects paused and throttled states", () => {
    const paused = evaluateAdsPacing(pacing({ pacingState: "paused" }));
    expect(paused.valid).toBe(true);
    if (!paused.valid) return;
    expect(paused.result.rejectionReason).toBe("pacing_paused");

    const throttled = evaluateAdsPacing(pacing({ pacingState: "throttled" }));
    expect(throttled.valid).toBe(true);
    if (!throttled.valid) return;
    expect(throttled.result.rejectionReason).toBe("pacing_throttled");
  });

  it("fail-closes on unknown fields and invalid fractions", () => {
    expect(
      validateAdsPacingSnapshot({
        ...pacing(),
        auctionBid: 1,
      } as unknown).valid
    ).toBe(false);

    for (const actualDeliveryFraction of [
      -0.1,
      1.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      expect(
        parseAdsPacingSnapshot(
          pacing({ pacingWindow: { actualDeliveryFraction } })
        ).valid
      ).toBe(false);
    }

    for (const targetDeliveryFraction of [
      -0.01,
      1.01,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(
        parseAdsPacingSnapshot(
          pacing({ pacingWindow: { targetDeliveryFraction } })
        ).valid
      ).toBe(false);
    }

    expect(
      parseAdsPacingSnapshot(pacing({ pacingState: "unknown" as never })).valid
    ).toBe(false);
  });

  it("is deterministic and does not mutate frozen input", () => {
    const input = pacing();
    Object.freeze(input);
    Object.freeze(input.pacingWindow);

    const first = evaluateAdsPacing(input);
    const second = evaluateAdsPacing(input);
    expect(first).toEqual(second);
    expect(input.pacingWindow.actualDeliveryFraction).toBe(0.4);

    if (!first.valid) return;
    expect(Object.isFrozen(first.result)).toBe(true);
    expect(Object.isFrozen(first.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(first.result.diagnostics.pacingWindow)).toBe(true);
  });
});

describe("Ads Budget + Pacing combined evaluation V1", () => {
  it("both pass → deliveryEligible true", () => {
    const outcome = evaluateAdsBudgetPacing({
      budget: budget(),
      pacing: pacing(),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.budgetEligible).toBe(true);
    expect(outcome.result.pacingEligible).toBe(true);
    expect(outcome.result.deliveryEligible).toBe(true);
    expect(outcome.result.rejectionReason).toBeNull();
    expectCombinedKillSwitchesOff(outcome.result);
    expect(
      validateAdsBudgetPacingEvaluationResult(outcome.result).valid
    ).toBe(true);
  });

  it("budget fail + pacing pass → deliveryEligible false with budget reason", () => {
    const outcome = evaluateAdsBudgetPacing({
      budget: budget({ remainingBudgetMinor: 0 }),
      pacing: pacing({ pacingState: "on_pace" }),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.budgetEligible).toBe(false);
    expect(outcome.result.pacingEligible).toBe(true);
    expect(outcome.result.deliveryEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("remaining_budget_exhausted");
    expectCombinedKillSwitchesOff(outcome.result);
  });

  it("budget pass + pacing fail → deliveryEligible false with pacing reason", () => {
    const outcome = evaluateAdsBudgetPacing({
      budget: budget(),
      pacing: pacing({ pacingState: "throttled" }),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.budgetEligible).toBe(true);
    expect(outcome.result.pacingEligible).toBe(false);
    expect(outcome.result.deliveryEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("pacing_throttled");
    expectCombinedKillSwitchesOff(outcome.result);
  });

  it("both fail → stable budget-first rejection", () => {
    const outcome = evaluateAdsBudgetPacing({
      budget: budget({ remainingBudgetMinor: 0 }),
      pacing: pacing({ pacingState: "paused" }),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.budgetEligible).toBe(false);
    expect(outcome.result.pacingEligible).toBe(false);
    expect(outcome.result.deliveryEligible).toBe(false);
    expect(outcome.result.rejectionReason).toBe("remaining_budget_exhausted");
    expectCombinedKillSwitchesOff(outcome.result);
  });

  it("fail-closes on empty and malformed combined input", () => {
    expect(evaluateAdsBudgetPacing(null).valid).toBe(false);
    expect(evaluateAdsBudgetPacing(undefined).valid).toBe(false);
    expect(evaluateAdsBudgetPacing({}).valid).toBe(false);
    expect(evaluateAdsBudgetPacing([]).valid).toBe(false);

    expect(
      parseAdsBudgetPacingInput({
        budget: budget({ candidateId: "a" }),
        pacing: pacing({ candidateId: "b" }),
      }).valid
    ).toBe(false);

    expect(
      parseAdsBudgetPacingInput({
        budget: budget(),
        pacing: pacing(),
        bid: 1,
      }).valid
    ).toBe(false);

    expect(
      parseAdsBudgetPacingInput({
        budget: budget({
          dailyBudgetMinor: 500,
          lifetimeBudgetMinor: 100,
        }),
        pacing: pacing(),
      }).valid
    ).toBe(false);
  });

  it("keeps kill switches false on every combined path", () => {
    const paths = [
      { budget: budget(), pacing: pacing() },
      {
        budget: budget({ remainingBudgetMinor: 0 }),
        pacing: pacing(),
      },
      {
        budget: budget(),
        pacing: pacing({ pacingState: "paused" }),
      },
      {
        budget: budget({ remainingBudgetMinor: 0 }),
        pacing: pacing({ pacingState: "throttled" }),
      },
    ];

    for (const input of paths) {
      const outcome = evaluateAdsBudgetPacing(input);
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) continue;
      expectCombinedKillSwitchesOff(outcome.result);
      expect(outcome.result.diagnostics.budget.productionEnabled).toBe(false);
      expect(outcome.result.diagnostics.budget.deliveryEnabled).toBe(false);
      expect(outcome.result.diagnostics.budget.executionEnabled).toBe(false);
      expect(outcome.result.diagnostics.pacing.productionEnabled).toBe(false);
      expect(outcome.result.diagnostics.pacing.deliveryEnabled).toBe(false);
      expect(outcome.result.diagnostics.pacing.executionEnabled).toBe(false);
    }
  });
});
