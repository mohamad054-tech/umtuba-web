import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_SELECTABLE_SET_CONTRACT_VERSION,
  type AdsSelectableSet,
} from "./selectableSet";
import {
  ADS_PILOT_SELECTOR_CONTRACT_VERSION,
  ADS_PILOT_SELECTOR_STRATEGY,
  createEmptyAdsPilotSelectorResult,
  resolvePilotSelectionTraceOutcome,
  runAdsPilotSelector,
  validateAdsPilotSelectionConsistency,
  validateAdsPilotSelectorResult,
} from "./pilotSelector";

const SOURCE_PATH = path.join(__dirname, "pilotSelector.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function selectableSet(
  candidateIds: readonly string[],
  evaluatedCandidateCount = candidateIds.length
): AdsSelectableSet {
  return Object.freeze({
    contractVersion: ADS_SELECTABLE_SET_CONTRACT_VERSION,
    evaluatedCandidateCount,
    selectableCandidates: Object.freeze(
      candidateIds.map((candidateId) => Object.freeze({ candidateId }))
    ),
    selectedCandidateId: null,
    productionEnabled: false as const,
  });
}

describe("Ads Deterministic Pilot Selector V1", () => {
  it("exposes contract version and first_selectable strategy", () => {
    expect(ADS_PILOT_SELECTOR_CONTRACT_VERSION).toBe("v1");
    expect(ADS_PILOT_SELECTOR_STRATEGY).toBe("first_selectable");
  });

  it("returns null selection for an empty selectable set", () => {
    const outcome = runAdsPilotSelector({
      selectableSet: selectableSet([]),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result).toEqual(createEmptyAdsPilotSelectorResult());
    expect(outcome.result.selectedCandidateId).toBeNull();
    expect(outcome.result.selectionReason).toBe("empty_selectable_set");
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
  });

  it("selects the sole selectable candidate", () => {
    const outcome = runAdsPilotSelector({
      selectableSet: selectableSet(["only-one"]),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.selectedCandidateId).toBe("only-one");
    expect(outcome.result.selectionReason).toBe("first_selectable");
    expect(outcome.result.selectableCandidateCount).toBe(1);
  });

  it("selects the first candidate when multiple are selectable", () => {
    const outcome = runAdsPilotSelector({
      selectableSet: selectableSet(["first", "second", "third"]),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.selectedCandidateId).toBe("first");
    expect(outcome.result.selectableCandidateCount).toBe(3);
  });

  it("never selects candidates absent from the selectable set", () => {
    const outcome = runAdsPilotSelector({
      selectableSet: selectableSet(["a"]),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.selectedCandidateId).toBe("a");
    expect(outcome.result.selectedCandidateId).not.toBe("eligibility-only");
    expect(outcome.result.selectedCandidateId).not.toBe("compatibility-only");
  });

  it("preserves selectable order as the sole determinant", () => {
    const forward = runAdsPilotSelector({
      selectableSet: selectableSet(["z", "a"]),
    });
    const reverse = runAdsPilotSelector({
      selectableSet: selectableSet(["a", "z"]),
    });
    expect(forward.valid && reverse.valid).toBe(true);
    if (!forward.valid || !reverse.valid) return;
    expect(forward.result.selectedCandidateId).toBe("z");
    expect(reverse.result.selectedCandidateId).toBe("a");
  });

  it("rejects duplicate selectable candidate ids (fail closed)", () => {
    const malformed = {
      contractVersion: ADS_SELECTABLE_SET_CONTRACT_VERSION,
      evaluatedCandidateCount: 2,
      selectableCandidates: [
        { candidateId: "dup" },
        { candidateId: "dup" },
      ],
      selectedCandidateId: null,
      productionEnabled: false,
    };
    const outcome = runAdsPilotSelector({ selectableSet: malformed });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) => issue.includes("duplicate"))
    ).toBe(true);
  });

  it("rejects unsupported strategy and malformed results", () => {
    expect(
      validateAdsPilotSelectorResult({
        ...createEmptyAdsPilotSelectorResult(),
        selectionStrategy: "random",
      }).valid
    ).toBe(false);
    expect(
      validateAdsPilotSelectorResult({
        ...createEmptyAdsPilotSelectorResult(),
        selectorVersion: "v0",
      }).valid
    ).toBe(false);
    expect(
      validateAdsPilotSelectorResult({
        ...createEmptyAdsPilotSelectorResult(),
        productionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsPilotSelectorResult({
        ...createEmptyAdsPilotSelectorResult(),
        deliveryEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsPilotSelectorResult({
        ...createEmptyAdsPilotSelectorResult(),
        extra: true,
      }).valid
    ).toBe(false);
  });

  it("rejects selected candidate outside the selectable set", () => {
    const set = selectableSet(["a"]);
    const forged = {
      ...createEmptyAdsPilotSelectorResult(),
      selectableCandidateCount: 1,
      selectedCandidateId: "outside",
      selectionReason: "first_selectable" as const,
    };
    const consistency = validateAdsPilotSelectionConsistency(forged, set, {
      eligibleCandidateIds: ["a"],
      rejectedCandidateIds: [],
    });
    expect(consistency.valid).toBe(false);
    if (consistency.valid) return;
    expect(
      consistency.issues.some((issue) =>
        issue.includes("outside the selectable set")
      )
    ).toBe(true);
  });

  it("rejects selected candidate present in rejected list", () => {
    const set = selectableSet(["a"]);
    const result = {
      ...createEmptyAdsPilotSelectorResult(),
      selectableCandidateCount: 1,
      selectedCandidateId: "a",
      selectionReason: "first_selectable" as const,
    };
    const consistency = validateAdsPilotSelectionConsistency(result, set, {
      eligibleCandidateIds: ["a"],
      rejectedCandidateIds: ["a"],
    });
    expect(consistency.valid).toBe(false);
    if (consistency.valid) return;
    expect(
      consistency.issues.some((issue) =>
        issue.includes("must not appear in rejectedCandidates")
      )
    ).toBe(true);
  });

  it("rejects selection summary mismatch", () => {
    const set = selectableSet(["a", "b"]);
    const outcome = runAdsPilotSelector({ selectableSet: set });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(
      validateAdsPilotSelectionConsistency(outcome.result, set, {
        eligibleCandidateIds: ["b", "a"],
        rejectedCandidateIds: [],
      }).valid
    ).toBe(false);
    expect(
      validateAdsPilotSelectionConsistency(outcome.result, set, {
        eligibleCandidateIds: ["a"],
        rejectedCandidateIds: [],
      }).valid
    ).toBe(false);
  });

  it("produces deterministic frozen output without mutating input", () => {
    const set = selectableSet(["a", "b"]);
    const input = { selectableSet: set };
    const snapshot = structuredClone(input);
    const first = runAdsPilotSelector(input);
    const second = runAdsPilotSelector(input);
    expect(first.valid && second.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(first.result).toEqual(second.result);
    expect(Object.isFrozen(first.result)).toBe(true);
    expect(input).toEqual(snapshot);
  });

  it("keeps productionEnabled and deliveryEnabled false", () => {
    const empty = createEmptyAdsPilotSelectorResult();
    const selected = runAdsPilotSelector({
      selectableSet: selectableSet(["a"]),
    });
    expect(empty.productionEnabled).toBe(false);
    expect(empty.deliveryEnabled).toBe(false);
    expect(selected.valid).toBe(true);
    if (!selected.valid) return;
    expect(selected.result.productionEnabled).toBe(false);
    expect(selected.result.deliveryEnabled).toBe(false);
  });

  it("resolves privacy-safe selection trace outcomes", () => {
    expect(
      resolvePilotSelectionTraceOutcome({
        candidateId: "a",
        selectedCandidateId: "a",
        selectableCandidateIds: ["a", "b"],
      })
    ).toBe("selected_first_selectable");
    expect(
      resolvePilotSelectionTraceOutcome({
        candidateId: "b",
        selectedCandidateId: "a",
        selectableCandidateIds: ["a", "b"],
      })
    ).toBe("not_selected_earlier_selectable");
    expect(
      resolvePilotSelectionTraceOutcome({
        candidateId: "rejected",
        selectedCandidateId: "a",
        selectableCandidateIds: ["a", "b"],
      })
    ).toBe("not_selectable_earlier_gate");
  });

  it("rejects unknown input fields and non-set inputs", () => {
    expect(runAdsPilotSelector(null).valid).toBe(false);
    expect(
      runAdsPilotSelector({
        selectableSet: selectableSet(["a"]),
        inventory: [],
      }).valid
    ).toBe(false);
    expect(
      runAdsPilotSelector({
        selectableSet: selectableSet(["a"]),
        eligibilityStates: [],
      }).valid
    ).toBe(false);
  });

  it("has no ranking, randomization, DB, network, or product imports", () => {
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
      /\brankCandidates\b|\brunAuction\b|\bpacing\b|\bbilling\b|\bscore\b/i
    );
    expect(SOURCE).toMatch(/first_selectable/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
  });
});
