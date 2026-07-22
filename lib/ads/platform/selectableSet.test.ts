import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENGINE_CONTRACT_VERSION } from "./deliveryContracts";
import type { AdsCandidateEligibilityDecision } from "./eligibilityRules";
import {
  ADS_SELECTABLE_SET_ALLOWED_FIELDS,
  ADS_SELECTABLE_SET_CONTRACT_VERSION,
  buildAdsSelectableSet,
  createEmptyAdsSelectableSet,
  validateAdsSelectableSet,
  validatePilotSelectionBoundary,
  validateSelectableSetSelectionConsistency,
  type AdsSelectableCompatibilityDecision,
} from "./selectableSet";

const SOURCE_PATH = path.join(__dirname, "selectableSet.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function eligibilityDecision(
  overrides: Partial<AdsCandidateEligibilityDecision> & {
    candidateId: string;
    eligible: boolean;
  }
): AdsCandidateEligibilityDecision {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    candidateId: overrides.candidateId,
    eligible: overrides.eligible,
    exclusionReason:
      overrides.exclusionReason !== undefined
        ? overrides.exclusionReason
        : overrides.eligible
          ? null
          : "delivery_disabled",
    productionEnabled: false,
    matchedRule:
      overrides.matchedRule !== undefined
        ? overrides.matchedRule
        : overrides.eligible
          ? null
          : "delivery_disabled",
  };
}

function compatibilityDecision(
  overrides: AdsSelectableCompatibilityDecision
): AdsSelectableCompatibilityDecision {
  return Object.freeze({ ...overrides });
}

describe("Ads Post-Gate Selectable Set & Pilot Selection Boundary V1", () => {
  it("exposes contract version and allowed fields", () => {
    expect(ADS_SELECTABLE_SET_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_SELECTABLE_SET_ALLOWED_FIELDS]).toEqual([
      "contractVersion",
      "evaluatedCandidateCount",
      "selectableCandidates",
      "selectedCandidateId",
      "productionEnabled",
    ]);
  });

  it("builds selectable set as eligibility ∩ compatibility", () => {
    const outcome = buildAdsSelectableSet({
      eligibilityResults: [
        eligibilityDecision({ candidateId: "a", eligible: true }),
        eligibilityDecision({ candidateId: "b", eligible: true }),
        eligibilityDecision({ candidateId: "c", eligible: false }),
      ],
      compatibilityResults: [
        compatibilityDecision({ candidateId: "a", compatible: true }),
        compatibilityDecision({ candidateId: "b", compatible: false }),
        compatibilityDecision({ candidateId: "c", compatible: true }),
      ],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.selectableSet.evaluatedCandidateCount).toBe(3);
    expect(
      outcome.selectableSet.selectableCandidates.map((c) => c.candidateId)
    ).toEqual(["a"]);
    expect(outcome.selectableSet.selectedCandidateId).toBeNull();
    expect(outcome.selectableSet.productionEnabled).toBe(false);
  });

  it("excludes compatibility-rejected candidates from the selectable set", () => {
    const outcome = buildAdsSelectableSet({
      eligibilityResults: [
        eligibilityDecision({ candidateId: "eligible-incompatible", eligible: true }),
      ],
      compatibilityResults: [
        compatibilityDecision({
          candidateId: "eligible-incompatible",
          compatible: false,
        }),
      ],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.selectableSet.selectableCandidates).toEqual([]);
  });

  it("excludes eligibility-rejected candidates even when compatible", () => {
    const outcome = buildAdsSelectableSet({
      eligibilityResults: [
        eligibilityDecision({ candidateId: "ineligible", eligible: false }),
      ],
      compatibilityResults: [
        compatibilityDecision({ candidateId: "ineligible", compatible: true }),
      ],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.selectableSet.selectableCandidates).toEqual([]);
  });

  it("preserves evaluation order for multiple selectable candidates", () => {
    const outcome = buildAdsSelectableSet({
      eligibilityResults: [
        eligibilityDecision({ candidateId: "z", eligible: true }),
        eligibilityDecision({ candidateId: "y", eligible: false }),
        eligibilityDecision({ candidateId: "x", eligible: true }),
      ],
      compatibilityResults: [
        compatibilityDecision({ candidateId: "z", compatible: true }),
        compatibilityDecision({ candidateId: "y", compatible: true }),
        compatibilityDecision({ candidateId: "x", compatible: true }),
      ],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(
      outcome.selectableSet.selectableCandidates.map((c) => c.candidateId)
    ).toEqual(["z", "x"]);
  });

  it("rejects duplicate eligibility or compatibility ids (fail closed)", () => {
    const duplicateEligibility = buildAdsSelectableSet({
      eligibilityResults: [
        eligibilityDecision({ candidateId: "dup", eligible: true }),
        eligibilityDecision({ candidateId: "dup", eligible: true }),
      ],
      compatibilityResults: [
        compatibilityDecision({ candidateId: "dup", compatible: true }),
        compatibilityDecision({ candidateId: "dup", compatible: true }),
      ],
    });
    expect(duplicateEligibility.valid).toBe(false);
    if (duplicateEligibility.valid) return;
    expect(
      duplicateEligibility.issues.some((issue) =>
        issue.includes("duplicate candidateId")
      )
    ).toBe(true);
  });

  it("rejects misaligned eligibility/compatibility ids (fail closed)", () => {
    const outcome = buildAdsSelectableSet({
      eligibilityResults: [
        eligibilityDecision({ candidateId: "a", eligible: true }),
      ],
      compatibilityResults: [
        compatibilityDecision({ candidateId: "b", compatible: true }),
      ],
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) => issue.includes("inconsistent"))
    ).toBe(true);
  });

  it("rejects inconsistent counts (fail closed)", () => {
    const outcome = buildAdsSelectableSet({
      eligibilityResults: [
        eligibilityDecision({ candidateId: "a", eligible: true }),
        eligibilityDecision({ candidateId: "b", eligible: true }),
      ],
      compatibilityResults: [
        compatibilityDecision({ candidateId: "a", compatible: true }),
      ],
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.includes("length is inconsistent")
      )
    ).toBe(true);
  });

  it("rejects malformed boundary input (fail closed)", () => {
    expect(buildAdsSelectableSet(null as never).valid).toBe(false);
    expect(
      buildAdsSelectableSet({
        eligibilityResults: "nope" as never,
        compatibilityResults: [],
      }).valid
    ).toBe(false);
    expect(
      buildAdsSelectableSet({
        eligibilityResults: [
          { candidateId: "a" } as AdsCandidateEligibilityDecision,
        ],
        compatibilityResults: [
          compatibilityDecision({ candidateId: "a", compatible: true }),
        ],
      }).valid
    ).toBe(false);
  });

  it("produces deterministic and immutable output", () => {
    const input = {
      eligibilityResults: [
        eligibilityDecision({ candidateId: "a", eligible: true }),
        eligibilityDecision({ candidateId: "b", eligible: true }),
      ],
      compatibilityResults: [
        compatibilityDecision({ candidateId: "a", compatible: true }),
        compatibilityDecision({ candidateId: "b", compatible: false }),
      ],
    };

    const first = buildAdsSelectableSet(input);
    const second = buildAdsSelectableSet(input);
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) return;

    expect(first.selectableSet).toEqual(second.selectableSet);
    expect(Object.isFrozen(first.selectableSet)).toBe(true);
    expect(Object.isFrozen(first.selectableSet.selectableCandidates)).toBe(
      true
    );
    expect(Object.isFrozen(first.selectableSet.selectableCandidates[0])).toBe(
      true
    );
  });

  it("keeps selectedCandidateId null and productionEnabled false", () => {
    const empty = createEmptyAdsSelectableSet(0);
    expect(empty.selectedCandidateId).toBeNull();
    expect(empty.productionEnabled).toBe(false);
    expect(validateAdsSelectableSet(empty)).toEqual({ valid: true });

    const built = buildAdsSelectableSet({
      eligibilityResults: [
        eligibilityDecision({ candidateId: "a", eligible: true }),
      ],
      compatibilityResults: [
        compatibilityDecision({ candidateId: "a", compatible: true }),
      ],
    });
    expect(built.valid).toBe(true);
    if (!built.valid) return;
    expect(built.selectableSet.selectedCandidateId).toBeNull();
    expect(built.selectableSet.productionEnabled).toBe(false);
  });

  it("validateAdsSelectableSet rejects unknown fields and non-null selection", () => {
    expect(validateAdsSelectableSet(null).valid).toBe(false);
    expect(
      validateAdsSelectableSet({
        ...createEmptyAdsSelectableSet(0),
        selectedCandidateId: "a",
      }).valid
    ).toBe(false);
    expect(
      validateAdsSelectableSet({
        ...createEmptyAdsSelectableSet(0),
        productionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsSelectableSet({
        ...createEmptyAdsSelectableSet(0),
        extra: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsSelectableSet({
        ...createEmptyAdsSelectableSet(1),
        selectableCandidates: [
          { candidateId: "a" },
          { candidateId: "a" },
        ],
      }).valid
    ).toBe(false);
  });

  it("validatePilotSelectionBoundary fails closed for non-null selection", () => {
    const set = createEmptyAdsSelectableSet(1);
    expect(validatePilotSelectionBoundary(set, null)).toEqual({ valid: true });
    expect(validatePilotSelectionBoundary(set, "outside").valid).toBe(false);
    expect(validatePilotSelectionBoundary(set, 42).valid).toBe(false);
  });

  it("validateSelectableSetSelectionConsistency enforces matching eligible ids", () => {
    const built = buildAdsSelectableSet({
      eligibilityResults: [
        eligibilityDecision({ candidateId: "a", eligible: true }),
        eligibilityDecision({ candidateId: "b", eligible: true }),
      ],
      compatibilityResults: [
        compatibilityDecision({ candidateId: "a", compatible: true }),
        compatibilityDecision({ candidateId: "b", compatible: false }),
      ],
    });
    expect(built.valid).toBe(true);
    if (!built.valid) return;

    expect(
      validateSelectableSetSelectionConsistency(built.selectableSet, ["a"])
    ).toEqual({ valid: true });
    expect(
      validateSelectableSetSelectionConsistency(built.selectableSet, [
        "a",
        "b",
      ]).valid
    ).toBe(false);
    expect(
      validateSelectableSetSelectionConsistency(built.selectableSet, [
        "b",
      ]).valid
    ).toBe(false);
  });

  it("has no ranking, delivery, DB, or product imports", () => {
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|live|store|world|messenger|games|learning|search|notifications)(\/|["'])/i
    );
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*supabase[^"']*["']|require\(["'][^"']*supabase|createClient\s*\(/i
    );
    expect(SOURCE).not.toMatch(/\bfetch\s*\(|\baxios\b/);
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(SOURCE).not.toMatch(
      /\brankCandidates\b|\brunAuction\b|\bpacing\b|\bbilling\b/i
    );
    expect(SOURCE).toMatch(/selectedCandidateId: null/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
  });
});
