import { describe, expect, it } from "vitest";
import {
  ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
  ADS_CANDIDATE_INVENTORY_MAX_CANDIDATES,
  ADS_CANDIDATE_INVENTORY_MAX_ID_LENGTH,
  buildCandidateInventory,
  candidateExists,
  createEmptyInventory,
  findCandidate,
  freezeCandidateInventory,
  inventorySummary,
  listCandidates,
  looksLikeAdsInventoryUrl,
  toCandidateReference,
  validateCandidateInventory,
  type AdsCandidateInventory,
  type AdsCandidateMetadata,
} from "./candidateInventory";

const GENERATED_AT = "2026-07-22T12:00:00.000Z";

function baseCandidate(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    candidateId: "candidate-1",
    campaignRef: "campaign-ref-1",
    adSetRef: "ad-set-ref-1",
    adRef: "ad-ref-1",
    creativeRef: "creative-ref-1",
    placement: "WATCH_FEED",
    creativeType: "video",
    eligibilitySnapshot: {
      snapshotRef: "eligibility-snapshot-1",
      revision: 1,
    },
    inventorySource: "catalog",
    revision: 1,
    timestamps: {
      createdAt: "2026-07-22T10:00:00.000Z",
      updatedAt: "2026-07-22T11:00:00.000Z",
    },
    ...overrides,
  };
}

function baseInventory(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    contractVersion: ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
    inventoryId: "inventory-1",
    revision: 1,
    generatedAt: GENERATED_AT,
    candidates: [baseCandidate()],
    ...overrides,
  };
}

describe("Ads Candidate Inventory Foundation V1", () => {
  it("accepts a valid inventory", () => {
    const result = validateCandidateInventory(baseInventory());
    expect(result).toEqual({ valid: true });
  });

  it("accepts an empty inventory", () => {
    const empty = createEmptyInventory({
      inventoryId: "inventory-empty-1",
      revision: 2,
      generatedAt: GENERATED_AT,
    });
    expect(validateCandidateInventory(empty)).toEqual({ valid: true });
    expect(empty.candidates).toEqual([]);
    expect(empty.contractVersion).toBe(ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION);
  });

  it("builds an immutable inventory deterministically", () => {
    const input = baseInventory({
      candidates: [
        baseCandidate({ candidateId: "c-a" }),
        baseCandidate({
          candidateId: "c-b",
          campaignRef: "campaign-ref-2",
          adSetRef: "ad-set-ref-2",
          adRef: "ad-ref-2",
          creativeRef: "creative-ref-2",
          placement: "DISCOVER_FEED",
          creativeType: "image",
          inventorySource: "manual",
        }),
      ],
    });

    const first = buildCandidateInventory(input);
    const second = buildCandidateInventory(input);

    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) {
      return;
    }

    expect(first.inventory).toEqual(second.inventory);
    expect(Object.isFrozen(first.inventory)).toBe(true);
    expect(Object.isFrozen(first.inventory.candidates)).toBe(true);
    expect(Object.isFrozen(first.inventory.candidates[0])).toBe(true);
    expect(
      Object.isFrozen(first.inventory.candidates[0].eligibilitySnapshot)
    ).toBe(true);
    expect(Object.isFrozen(first.inventory.candidates[0].timestamps)).toBe(
      true
    );
  });

  it("freezeCandidateInventory returns a deep-frozen snapshot", () => {
    const built = buildCandidateInventory(baseInventory());
    expect(built.valid).toBe(true);
    if (!built.valid) {
      return;
    }

    const frozen = freezeCandidateInventory(built.inventory);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.candidates)).toBe(true);
    expect(frozen).toEqual(built.inventory);
  });

  it("rejects duplicate candidate IDs (fail closed)", () => {
    const result = validateCandidateInventory(
      baseInventory({
        candidates: [
          baseCandidate({ candidateId: "dup" }),
          baseCandidate({
            candidateId: "dup",
            campaignRef: "campaign-ref-2",
            adSetRef: "ad-set-ref-2",
            adRef: "ad-ref-2",
            creativeRef: "creative-ref-2",
          }),
        ],
      })
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes('duplicate candidateId "dup"')
        )
      ).toBe(true);
    }
  });

  it("rejects duplicate candidate references (fail closed)", () => {
    const result = validateCandidateInventory(
      baseInventory({
        candidates: [
          baseCandidate({ candidateId: "c-1" }),
          baseCandidate({ candidateId: "c-2" }),
        ],
      })
    );

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes("duplicate candidate references")
        )
      ).toBe(true);
    }
  });

  it("rejects malformed candidates (fail closed)", () => {
    const result = validateCandidateInventory(
      baseInventory({
        candidates: ["not-an-object"],
      })
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes("candidates[0] must be an object")
        )
      ).toBe(true);
    }
  });

  it("rejects unsupported placements (fail closed)", () => {
    const result = validateCandidateInventory(
      baseInventory({
        candidates: [baseCandidate({ placement: "NOT_A_PLACEMENT" })],
      })
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("placement"))
      ).toBe(true);
    }
  });

  it("rejects unsupported creative types (fail closed)", () => {
    const result = validateCandidateInventory(
      baseInventory({
        candidates: [baseCandidate({ creativeType: "story" })],
      })
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("creativeType"))
      ).toBe(true);
    }
  });

  it("rejects malformed eligibility snapshots (fail closed)", () => {
    const missingRef = validateCandidateInventory(
      baseInventory({
        candidates: [
          baseCandidate({
            eligibilitySnapshot: { revision: 1 },
          }),
        ],
      })
    );
    expect(missingRef.valid).toBe(false);

    const unknownField = validateCandidateInventory(
      baseInventory({
        candidates: [
          baseCandidate({
            eligibilitySnapshot: {
              snapshotRef: "snap-1",
              revision: 1,
              eligible: true,
            },
          }),
        ],
      })
    );
    expect(unknownField.valid).toBe(false);
    if (!unknownField.valid) {
      expect(
        unknownField.issues.some((issue) =>
          issue.includes('unknown field "eligible"')
        )
      ).toBe(true);
    }
  });

  it("rejects invalid revisions (fail closed)", () => {
    const zeroRevision = validateCandidateInventory(
      baseInventory({ revision: 0 })
    );
    expect(zeroRevision.valid).toBe(false);

    const candidateRevision = validateCandidateInventory(
      baseInventory({
        candidates: [baseCandidate({ revision: 1.5 })],
      })
    );
    expect(candidateRevision.valid).toBe(false);

    const snapshotRevision = validateCandidateInventory(
      baseInventory({
        candidates: [
          baseCandidate({
            eligibilitySnapshot: {
              snapshotRef: "snap-1",
              revision: -1,
            },
          }),
        ],
      })
    );
    expect(snapshotRevision.valid).toBe(false);
  });

  it("rejects invalid timestamps (fail closed)", () => {
    const badGeneratedAt = validateCandidateInventory(
      baseInventory({ generatedAt: "not-a-timestamp" })
    );
    expect(badGeneratedAt.valid).toBe(false);

    const badCreatedAt = validateCandidateInventory(
      baseInventory({
        candidates: [
          baseCandidate({
            timestamps: {
              createdAt: "nope",
              updatedAt: GENERATED_AT,
            },
          }),
        ],
      })
    );
    expect(badCreatedAt.valid).toBe(false);

    const updatedBeforeCreated = validateCandidateInventory(
      baseInventory({
        candidates: [
          baseCandidate({
            timestamps: {
              createdAt: "2026-07-22T12:00:00.000Z",
              updatedAt: "2026-07-22T11:00:00.000Z",
            },
          }),
        ],
      })
    );
    expect(updatedBeforeCreated.valid).toBe(false);
  });

  it("rejects unknown and prohibited fields (fail closed)", () => {
    const unknownTopLevel = validateCandidateInventory(
      baseInventory({ rankingScore: 10 })
    );
    expect(unknownTopLevel.valid).toBe(false);
    if (!unknownTopLevel.valid) {
      expect(
        unknownTopLevel.issues.some((issue) =>
          issue.includes('unknown field "rankingScore"')
        )
      ).toBe(true);
    }

    const prohibited = validateCandidateInventory(
      baseInventory({
        candidates: [baseCandidate({ budget: 100 })],
      })
    );
    expect(prohibited.valid).toBe(false);
    if (!prohibited.valid) {
      expect(
        prohibited.issues.some((issue) =>
          issue.includes('prohibited field "budget"')
        )
      ).toBe(true);
    }
  });

  it("rejects URL-like references (fail closed)", () => {
    expect(looksLikeAdsInventoryUrl("https://cdn.example/creative")).toBe(true);

    const result = validateCandidateInventory(
      baseInventory({
        candidates: [
          baseCandidate({
            creativeRef: "https://cdn.example/creative",
          }),
        ],
      })
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.issues.some((issue) =>
          issue.includes("must be an opaque reference, not a URL")
        )
      ).toBe(true);
    }
  });

  it("rejects oversized inventories and ids (fail closed)", () => {
    const tooLongId = validateCandidateInventory(
      baseInventory({
        inventoryId: "x".repeat(ADS_CANDIDATE_INVENTORY_MAX_ID_LENGTH + 1),
      })
    );
    expect(tooLongId.valid).toBe(false);

    const tooMany = validateCandidateInventory(
      baseInventory({
        candidates: Array.from(
          { length: ADS_CANDIDATE_INVENTORY_MAX_CANDIDATES + 1 },
          (_, index) =>
            baseCandidate({
              candidateId: `candidate-${index}`,
              campaignRef: `campaign-ref-${index}`,
              adSetRef: `ad-set-ref-${index}`,
              adRef: `ad-ref-${index}`,
              creativeRef: `creative-ref-${index}`,
            })
        ),
      })
    );
    expect(tooMany.valid).toBe(false);
  });

  it("buildCandidateInventory fails closed on invalid input", () => {
    const outcome = buildCandidateInventory(null);
    expect(outcome.valid).toBe(false);
    if (!outcome.valid) {
      expect(outcome.issues.length).toBeGreaterThan(0);
    }
  });

  it("exposes helper APIs without business logic", () => {
    const built = buildCandidateInventory(
      baseInventory({
        candidates: [
          baseCandidate({ candidateId: "c-1" }),
          baseCandidate({
            candidateId: "c-2",
            campaignRef: "campaign-ref-2",
            adSetRef: "ad-set-ref-2",
            adRef: "ad-ref-2",
            creativeRef: "creative-ref-2",
            placement: "STORE_HOME",
            creativeType: "store_promotion",
            inventorySource: "import",
          }),
        ],
      })
    );
    expect(built.valid).toBe(true);
    if (!built.valid) {
      return;
    }

    const inventory: AdsCandidateInventory = built.inventory;
    const listed = listCandidates(inventory);
    expect(listed).toHaveLength(2);
    expect(listed[0].candidateId).toBe("c-1");
    expect(listed[1].candidateId).toBe("c-2");

    const found = findCandidate(inventory, "c-2");
    expect(found?.placement).toBe("STORE_HOME");
    expect(findCandidate(inventory, "missing")).toBeUndefined();

    expect(candidateExists(inventory, "c-1")).toBe(true);
    expect(candidateExists(inventory, "missing")).toBe(false);

    const summary = inventorySummary(inventory);
    expect(summary).toEqual({
      contractVersion: ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
      inventoryId: "inventory-1",
      revision: 1,
      candidateCount: 2,
      placementCounts: {
        WATCH_FEED: 1,
        STORE_HOME: 1,
      },
      creativeTypeCounts: {
        video: 1,
        store_promotion: 1,
      },
      inventorySourceCounts: {
        catalog: 1,
        import: 1,
      },
    });
    expect(Object.isFrozen(summary)).toBe(true);

    const reference = toCandidateReference(
      listed[0] as AdsCandidateMetadata
    );
    expect(reference).toEqual({
      candidateId: "c-1",
      campaignRef: "campaign-ref-1",
      adSetRef: "ad-set-ref-1",
      adRef: "ad-ref-1",
      creativeRef: "creative-ref-1",
    });
    expect(Object.isFrozen(reference)).toBe(true);
  });

  it("createEmptyInventory helper summary is zeroed", () => {
    const empty = createEmptyInventory();
    expect(inventorySummary(empty).candidateCount).toBe(0);
    expect(listCandidates(empty)).toEqual([]);
    expect(candidateExists(empty, "anything")).toBe(false);
  });
});
