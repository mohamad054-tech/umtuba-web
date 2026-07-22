import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
  type AdsCandidateMetadata,
} from "./candidateInventory";
import {
  ADS_RENDER_MATERIAL_ALLOWED_FIELDS,
  ADS_SERVE_BOUNDARY_CONTRACT_VERSION,
  ADS_SERVE_BOUNDARY_INPUT_ALLOWED_FIELDS,
  ADS_SERVE_BOUNDARY_REJECTION_REASONS,
  ADS_SERVE_BOUNDARY_RESULT_ALLOWED_FIELDS,
  createEmptyAdsServeBoundaryResult,
  emitAdsRenderDescriptor,
  validateAdsRenderMaterial,
  validateAdsServeBoundaryResult,
  type AdsRenderMaterial,
} from "./serveBoundary";

const SOURCE_PATH = path.join(__dirname, "serveBoundary.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

const NOW = "2026-07-22T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const EXPIRES = "2026-07-22T13:00:00.000Z";
const GENERATED_AT = "2026-07-22T11:00:00.000Z";

function inventoryCandidate(
  overrides: Partial<AdsCandidateMetadata> &
    Pick<AdsCandidateMetadata, "candidateId">
): AdsCandidateMetadata {
  const id = overrides.candidateId;
  return Object.freeze({
    candidateId: id,
    campaignRef: overrides.campaignRef ?? `campaign-ref-${id}`,
    adSetRef: overrides.adSetRef ?? `ad-set-ref-${id}`,
    adRef: overrides.adRef ?? `ad-ref-${id}`,
    creativeRef: overrides.creativeRef ?? `creative-ref-${id}`,
    placement: overrides.placement ?? "WATCH_FEED",
    creativeType: overrides.creativeType ?? "video",
    eligibilitySnapshot: overrides.eligibilitySnapshot ?? {
      snapshotRef: `eligibility-snapshot-${id}`,
      revision: 1,
    },
    inventorySource: overrides.inventorySource ?? "catalog",
    revision: overrides.revision ?? 1,
    timestamps: overrides.timestamps ?? {
      createdAt: "2026-07-22T10:00:00.000Z",
      updatedAt: "2026-07-22T10:30:00.000Z",
    },
  });
}

function baseInventory(
  candidates: AdsCandidateMetadata[] = [
    inventoryCandidate({ candidateId: "candidate-1" }),
  ]
) {
  return Object.freeze({
    contractVersion: ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
    inventoryId: "inventory-1",
    revision: 1,
    generatedAt: GENERATED_AT,
    candidates: Object.freeze(candidates),
  });
}

function renderMaterialFor(
  candidateId: string,
  overrides: Partial<AdsRenderMaterial> = {}
): AdsRenderMaterial {
  return Object.freeze({
    candidateId,
    creativeReference: overrides.creativeReference ?? `creative-ref-${candidateId}`,
    mediaReference: overrides.mediaReference ?? `media-ref-${candidateId}`,
    thumbnailReference:
      overrides.thumbnailReference === undefined
        ? null
        : overrides.thumbnailReference,
    clickDestinationReference:
      overrides.clickDestinationReference ?? `destination-ref-${candidateId}`,
    impressionHandle: overrides.impressionHandle ?? `imp-${candidateId}`,
    clickHandle: overrides.clickHandle ?? `clk-${candidateId}`,
    ...(overrides.trackingReferences !== undefined
      ? { trackingReferences: overrides.trackingReferences }
      : {}),
    disclosureLabel: overrides.disclosureLabel ?? "Sponsored",
    cacheHints: overrides.cacheHints ?? {
      cacheable: false,
      maxAgeSeconds: null,
      cacheKey: null,
    },
    expiresAt: overrides.expiresAt ?? EXPIRES,
  });
}

function emitBase(
  overrides: {
    selectedCandidateId?: string | null;
    selectableCandidates?: readonly { candidateId: string }[];
    inventory?: ReturnType<typeof baseInventory>;
    renderMaterial?: AdsRenderMaterial | null;
    currentTimestamp?: string;
  } = {}
) {
  const selected =
    overrides.selectedCandidateId === undefined
      ? "candidate-1"
      : overrides.selectedCandidateId;
  return emitAdsRenderDescriptor({
    selectedCandidateId: selected,
    inventory: overrides.inventory ?? baseInventory(),
    selectableCandidates:
      overrides.selectableCandidates ??
      (selected === null ? [] : [{ candidateId: selected }]),
    renderMaterial:
      overrides.renderMaterial === undefined
        ? selected === null
          ? null
          : renderMaterialFor(selected)
        : overrides.renderMaterial,
    currentTimestamp: overrides.currentTimestamp ?? NOW,
  });
}

describe("Ads Serve Boundary V1 — Render Descriptor Emission", () => {
  it("exposes contract version and allowed fields", () => {
    expect(ADS_SERVE_BOUNDARY_CONTRACT_VERSION).toBe("v1");
    expect(ADS_SERVE_BOUNDARY_RESULT_ALLOWED_FIELDS).toContain(
      "renderDescriptor"
    );
    expect(ADS_SERVE_BOUNDARY_RESULT_ALLOWED_FIELDS).toContain(
      "rejectionReason"
    );
    expect(ADS_SERVE_BOUNDARY_INPUT_ALLOWED_FIELDS).toContain("renderMaterial");
    expect(ADS_RENDER_MATERIAL_ALLOWED_FIELDS).toContain("mediaReference");
    expect(ADS_SERVE_BOUNDARY_REJECTION_REASONS).toContain("empty_selection");
  });

  it("returns null descriptor when no candidate is selected", () => {
    const outcome = emitBase({
      selectedCandidateId: null,
      selectableCandidates: [],
      renderMaterial: null,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result).toEqual(createEmptyAdsServeBoundaryResult());
    expect(outcome.result.renderDescriptor).toBeNull();
    expect(outcome.result.rejectionReason).toBe("empty_selection");
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
  });

  it("rejects selected candidate outside the selectable set", () => {
    const outcome = emitBase({
      selectedCandidateId: "candidate-1",
      selectableCandidates: [{ candidateId: "other" }],
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.includes("outside the selectable set")
      )
    ).toBe(true);
  });

  it("rejects selected candidate missing from inventory", () => {
    const outcome = emitBase({
      selectedCandidateId: "ghost",
      selectableCandidates: [{ candidateId: "ghost" }],
      inventory: baseInventory([
        inventoryCandidate({ candidateId: "candidate-1" }),
      ]),
      renderMaterial: renderMaterialFor("ghost"),
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) => issue.includes("missing from inventory"))
    ).toBe(true);
  });

  it("emits a descriptor for a valid selected candidate + render material", () => {
    const outcome = emitBase();
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.rejectionReason).toBeNull();
    expect(outcome.result.selectedCandidateId).toBe("candidate-1");
    expect(outcome.result.renderDescriptor).not.toBeNull();
    expect(outcome.result.renderDescriptor?.placementId).toBe("WATCH_FEED");
    expect(outcome.result.renderDescriptor?.creativeType).toBe("video");
    expect(outcome.result.renderDescriptor?.creativeReference).toBe(
      "creative-ref-candidate-1"
    );
    expect(outcome.result.renderDescriptor?.mediaReference).toBe(
      "media-ref-candidate-1"
    );
    expect(outcome.result.renderDescriptor?.clickDestinationReference).toBe(
      "destination-ref-candidate-1"
    );
    expect(outcome.result.renderDescriptor?.thumbnailReference).toBeNull();
    expect(outcome.result.renderDescriptor?.disclosure).toEqual({
      label: "Sponsored",
      mustDisplay: true,
    });
    expect(outcome.result.renderDescriptor?.reportingHandles).toEqual({
      impressionHandle: "imp-candidate-1",
      clickHandle: "clk-candidate-1",
    });
    expect(outcome.result.renderDescriptor?.trackingReferences).toEqual({
      campaignId: "campaign-ref-candidate-1",
      adSetId: "ad-set-ref-candidate-1",
      adId: "ad-ref-candidate-1",
      creativeId: "creative-ref-candidate-1",
    });
    expect(outcome.result.renderDescriptor?.expiresAt).toBe(EXPIRES);
    expect(outcome.result.renderDescriptor?.productionEnabled).toBe(false);
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
  });

  it("returns null descriptor when selected but render material is missing", () => {
    const outcome = emitBase({ renderMaterial: null });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.renderDescriptor).toBeNull();
    expect(outcome.result.rejectionReason).toBe("missing_render_material");
  });

  it("rejects incompatible creative placement", () => {
    const outcome = emitBase({
      inventory: baseInventory([
        inventoryCandidate({
          candidateId: "candidate-1",
          placement: "WATCH_FEED",
          creativeType: "game_promotion",
        }),
      ]),
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.includes("Incompatible creative and placement")
      )
    ).toBe(true);
  });

  it("rejects missing media reference", () => {
    const outcome = emitAdsRenderDescriptor({
      selectedCandidateId: "candidate-1",
      selectableCandidates: [{ candidateId: "candidate-1" }],
      inventory: baseInventory(),
      renderMaterial: {
        ...renderMaterialFor("candidate-1"),
        mediaReference: "",
      },
      currentTimestamp: NOW,
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) => issue.includes("mediaReference"))
    ).toBe(true);
  });

  it("rejects missing destination reference", () => {
    const outcome = emitAdsRenderDescriptor({
      selectedCandidateId: "candidate-1",
      selectableCandidates: [{ candidateId: "candidate-1" }],
      inventory: baseInventory(),
      renderMaterial: {
        ...renderMaterialFor("candidate-1"),
        clickDestinationReference: "   ",
      },
      currentTimestamp: NOW,
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.includes("clickDestinationReference")
      )
    ).toBe(true);
  });

  it("rejects duplicate reporting handles", () => {
    const outcome = emitBase({
      renderMaterial: renderMaterialFor("candidate-1", {
        impressionHandle: "same-handle",
        clickHandle: "same-handle",
      }),
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) => issue.includes("must be distinct"))
    ).toBe(true);
  });

  it("rejects URL-like references", () => {
    const outcome = emitBase({
      renderMaterial: renderMaterialFor("candidate-1", {
        mediaReference: "https://cdn.example.com/video.mp4",
      }),
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(outcome.issues.some((issue) => issue.includes("not a URL"))).toBe(
      true
    );
  });

  it("rejects invalid expiration", () => {
    const outcome = emitBase({
      renderMaterial: renderMaterialFor("candidate-1", {
        expiresAt: "2026-07-22T11:00:00.000Z",
      }),
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.toLowerCase().includes("expired")
      )
    ).toBe(true);
  });

  it("rejects descriptor validation failure (bad cache hints)", () => {
    const outcome = emitAdsRenderDescriptor({
      selectedCandidateId: "candidate-1",
      selectableCandidates: [{ candidateId: "candidate-1" }],
      inventory: baseInventory(),
      renderMaterial: {
        ...renderMaterialFor("candidate-1"),
        cacheHints: {
          cacheable: true,
          maxAgeSeconds: null,
          cacheKey: null,
        },
      },
      currentTimestamp: NOW,
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) => issue.includes("cacheHints"))
    ).toBe(true);
  });

  it("never falls back to another candidate when material mismatches", () => {
    const inventory = baseInventory([
      inventoryCandidate({ candidateId: "first" }),
      inventoryCandidate({ candidateId: "second" }),
    ]);
    const outcome = emitAdsRenderDescriptor({
      selectedCandidateId: "first",
      selectableCandidates: [
        { candidateId: "first" },
        { candidateId: "second" },
      ],
      inventory,
      renderMaterial: renderMaterialFor("second"),
      currentTimestamp: NOW,
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) => issue.includes("no fallback"))
    ).toBe(true);
  });

  it("rejects creative reference mismatch against inventory", () => {
    const outcome = emitBase({
      renderMaterial: renderMaterialFor("candidate-1", {
        creativeReference: "wrong-creative",
      }),
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.includes("does not match inventory creativeRef")
      )
    ).toBe(true);
  });

  it("produces deterministic frozen output without mutating inputs", () => {
    const material = renderMaterialFor("candidate-1");
    const inventory = baseInventory();
    const selectableCandidates = Object.freeze([{ candidateId: "candidate-1" }]);
    const input = {
      selectedCandidateId: "candidate-1",
      inventory,
      selectableCandidates,
      renderMaterial: material,
      currentTimestamp: NOW,
    };
    const snapshot = structuredClone(input);
    const first = emitAdsRenderDescriptor(input);
    const second = emitAdsRenderDescriptor(input);
    expect(first.valid && second.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(first.result).toEqual(second.result);
    expect(Object.isFrozen(first.result)).toBe(true);
    expect(Object.isFrozen(first.result.renderDescriptor)).toBe(true);
    expect(input).toEqual(snapshot);
  });

  it("keeps productionEnabled and deliveryEnabled false", () => {
    const empty = createEmptyAdsServeBoundaryResult();
    expect(empty.productionEnabled).toBe(false);
    expect(empty.deliveryEnabled).toBe(false);

    const emitted = emitBase();
    expect(emitted.valid).toBe(true);
    if (!emitted.valid) return;
    expect(emitted.result.productionEnabled).toBe(false);
    expect(emitted.result.deliveryEnabled).toBe(false);
    expect(emitted.result.renderDescriptor?.productionEnabled).toBe(false);
  });

  it("validateAdsRenderMaterial and result validators fail closed", () => {
    expect(validateAdsRenderMaterial(null)).toEqual({ valid: true });
    expect(validateAdsRenderMaterial({}).valid).toBe(false);
    expect(
      validateAdsServeBoundaryResult(createEmptyAdsServeBoundaryResult())
    ).toEqual({ valid: true });
    expect(validateAdsServeBoundaryResult(null).valid).toBe(false);
    expect(
      validateAdsServeBoundaryResult({
        ...createEmptyAdsServeBoundaryResult(),
        productionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsServeBoundaryResult({
        ...createEmptyAdsServeBoundaryResult(),
        deliveryEnabled: true,
      }).valid
    ).toBe(false);
  });

  it("rejects unknown fields and malformed timestamps", () => {
    expect(emitAdsRenderDescriptor(null).valid).toBe(false);
    expect(
      emitAdsRenderDescriptor({
        selectedCandidateId: "candidate-1",
        inventory: baseInventory(),
        selectableCandidates: [{ candidateId: "candidate-1" }],
        renderMaterial: renderMaterialFor("candidate-1"),
        currentTimestamp: NOW,
        extra: true,
      }).valid
    ).toBe(false);
    expect(
      emitAdsRenderDescriptor({
        selectedCandidateId: "candidate-1",
        inventory: baseInventory(),
        selectableCandidates: [{ candidateId: "candidate-1" }],
        renderMaterial: renderMaterialFor("candidate-1"),
        currentTimestamp: "not-a-date",
      }).valid
    ).toBe(false);
  });

  it("has no product wiring, database, storage, network, or signed URL logic", () => {
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
      /\brankCandidates\b|\brunAuction\b|\bpacing\b|\bbilling\b|signedUrl|signed_url/i
    );
    expect(SOURCE).not.toMatch(/media:\$\{|imp:\$\{|clk:\$\{|destination:\$\{/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/emitAdsRenderDescriptor/);
    expect(SOURCE).toMatch(/buildAdsRenderDescriptor/);
    expect(SOURCE).toMatch(/validateCreativePlacementCompatibility/);
  });
});
