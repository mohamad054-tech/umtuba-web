import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ADS_DELIVERY_ENABLED } from "./constants";
import { AD_PLACEMENTS, CREATIVE_TYPES } from "./constants";
import {
  ADS_DELIVERABLE_BINDING_IMAGE_ONLY_PLACEMENTS,
  ADS_DELIVERABLE_BINDING_SUPPORTED_PLACEMENTS,
  countValidDeliverableBindings,
  evaluateCampaignActivationReadiness,
  isDeliverableBindingPlacementFormatCompatible,
  mapBindDeliverableCompatibilityError,
  mapCreativeTypeForDeliverableBinding,
  mapDeliverable,
  validateDeliverablePlacementCompatibility,
} from "./deliverableBindings";
import { isCreativeCompatible } from "./platform/creativePlacementCompatibility";
import {
  ADS_INVENTORY_BRIDGE_AUTHORITY,
  assertAdsInventoryBridgeNonAuthoritative,
  mapDeliverableRowsToInventoryBridge,
  type AdsDeliverableBridgeRow,
} from "./inventoryBridge";
import * as platform from "./platform";
import { canActivateCampaign } from "./statusTransitions";
import type { AdCampaign, AdCreative, AdDeliverable, AdSet } from "./types";

const INDEX_SOURCE = readFileSync(path.join(__dirname, "index.ts"), "utf8");
const BRIDGE_SOURCE = readFileSync(
  path.join(__dirname, "inventoryBridge.ts"),
  "utf8"
);
const BINDING_SOURCE = readFileSync(
  path.join(__dirname, "deliverableBindings.ts"),
  "utf8"
);

const NOW = "2026-07-23T12:00:00.000Z";

function baseRow(
  overrides: Partial<AdsDeliverableBridgeRow> = {}
): AdsDeliverableBridgeRow {
  return {
    adId: "ad-1",
    adStatus: "approved",
    adSetId: "adset-1",
    adSetStatus: "approved",
    campaignId: "campaign-1",
    campaignStatus: "approved",
    advertiserAccountId: "advertiser-1",
    advertiserStatus: "approved",
    creativeId: "creative-1",
    creativeStatus: "approved",
    creativeType: "video",
    placements: ["watch_feed"],
    countries: ["US"],
    languages: ["en"],
    devices: ["mobile"],
    ageMin: 18,
    startAt: "2026-07-01T00:00:00.000Z",
    endAt: "2026-08-01T00:00:00.000Z",
    dailyBudgetMinor: 10_000,
    totalBudgetMinor: 100_000,
    spentMinor: 0,
    createdAt: NOW,
    updatedAt: NOW,
    revision: 1,
    ...overrides,
  };
}

function campaign(overrides: Partial<AdCampaign> = {}): AdCampaign {
  return {
    id: "campaign-1",
    advertiserAccountId: "advertiser-1",
    name: "Campaign",
    objective: "awareness",
    status: "approved",
    startAt: "2026-07-01T00:00:00.000Z",
    endAt: "2026-08-01T00:00:00.000Z",
    dailyBudgetMinor: 1000,
    totalBudgetMinor: 5000,
    currencyCode: "USD",
    spentMinor: 0,
    createdBy: "user-1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe("Ads Deliverable Binding & Inventory Bridge V1", () => {
  it("accepts compatible placement/format pairs and rejects mismatches", () => {
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["watch_feed"],
        creativeType: "video",
      }).ok
    ).toBe(true);
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["watch_feed"],
        creativeType: "native",
      }).ok
    ).toBe(false);
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["not_a_placement"],
        creativeType: "video",
      }).ok
    ).toBe(false);
  });

  it("maps deliverable rows deterministically into candidate + selection inventory", () => {
    const first = mapDeliverableRowsToInventoryBridge({
      rows: [baseRow()],
      sourceId: "src-1",
      revision: 1,
      currentTimestamp: NOW,
    });
    const second = mapDeliverableRowsToInventoryBridge({
      rows: [baseRow()],
      sourceId: "src-1",
      revision: 1,
      currentTimestamp: NOW,
    });
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(first.result).toEqual(second.result);
    expect(first.result.selectionInventory.candidates).toHaveLength(1);
    expect(first.result.candidateInventory.candidates).toHaveLength(1);
    expect(first.result.selectionInventory.candidates[0]?.placementId).toBe(
      "WATCH_FEED"
    );
    expect(first.result.candidateInventory.candidates[0]?.adRef).toBe("ad-1");
    expect(first.result.productionAccepted).toBe(false);
    expect(first.result.authoritativeDecisionPath).toBe(false);
    expect(first.result.deliveryEnabled).toBe(false);
    expect(first.result.billingEnabled).toBe(false);
  });

  it("excludes invalid rows (unapproved, exhausted budget, bad schedule)", () => {
    const mapped = mapDeliverableRowsToInventoryBridge({
      rows: [
        baseRow({ adId: "bad-creative", creativeStatus: "draft" }),
        baseRow({
          adId: "bad-budget",
          totalBudgetMinor: 100,
          spentMinor: 100,
        }),
        baseRow({
          adId: "bad-schedule",
          endAt: "2026-07-01T00:00:00.000Z",
        }),
        baseRow({ adId: "ok" }),
      ],
      sourceId: "src-2",
      revision: 1,
      currentTimestamp: NOW,
    });
    expect(mapped.valid).toBe(true);
    if (!mapped.valid) return;
    expect(mapped.result.selectionInventory.candidates).toHaveLength(1);
    expect(mapped.result.selectionInventory.candidates[0]?.adRef).toBe("ok");
    expect(mapped.result.excludedCount).toBeGreaterThanOrEqual(3);
  });

  it("blocks activation without a valid binding and allows readiness when bound", () => {
    const adSets: AdSet[] = [
      {
        id: "adset-1",
        campaignId: "campaign-1",
        name: "Set",
        status: "approved",
        targeting: {
          countries: ["US"],
          regions: [],
          cities: [],
          languages: ["en"],
          ageMin: 18,
          ageMax: 65,
          gender: "all",
          interests: [],
          userSegments: [],
          placements: ["watch_feed"],
          devices: [],
          excludeCountries: [],
          excludeRegions: [],
          excludeCities: [],
          excludeInterests: [],
          excludeUserSegments: [],
          frequencyCap: null,
        },
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    const creatives: AdCreative[] = [
      {
        id: "creative-1",
        advertiserAccountId: "advertiser-1",
        campaignId: "campaign-1",
        adSetId: "adset-1",
        creativeType: "video",
        headline: "Hello",
        bodyText: null,
        callToAction: "learn_more",
        destinationUrl: "https://example.com",
        mediaPath: "advertiser-1/user-1/file",
        thumbnailPath: null,
        status: "approved",
        moderationNotes: null,
        createdBy: "user-1",
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];
    const unbound = evaluateCampaignActivationReadiness({
      advertiserStatus: "approved",
      campaign: campaign(),
      adSets,
      creatives,
      bindings: [],
    });
    expect(unbound.ok).toBe(false);

    const bindings: AdDeliverable[] = [
      mapDeliverable({
        id: "ad-1",
        ad_set_id: "adset-1",
        creative_id: "creative-1",
        name: "Bound",
        status: "approved",
        delivery_priority: 100,
        created_at: NOW,
        updated_at: NOW,
      }),
    ];
    expect(countValidDeliverableBindings(bindings)).toBe(1);
    const bound = evaluateCampaignActivationReadiness({
      advertiserStatus: "approved",
      campaign: campaign(),
      adSets,
      creatives,
      bindings,
    });
    expect(bound.ok).toBe(true);
    expect(
      canActivateCampaign({
        advertiserStatus: "approved",
        campaignStatus: "approved",
        hasApprovedCreative: true,
        hasValidDeliverableBinding: true,
        hasEligibleAdSet: true,
        hasValidBudget: true,
        hasValidDates: true,
      }).ok
    ).toBe(true);
  });

  it("keeps activation domain-only with delivery/billing kill switches closed", () => {
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    expect(ADS_INVENTORY_BRIDGE_AUTHORITY.deliveryEnabled).toBe(false);
    expect(ADS_INVENTORY_BRIDGE_AUTHORITY.billingEnabled).toBe(false);
    expect(ADS_INVENTORY_BRIDGE_AUTHORITY.productionAccepted).toBe(false);
    expect(ADS_INVENTORY_BRIDGE_AUTHORITY.authoritativeDecisionPath).toBe(
      false
    );
  });

  it("never claims production acceptance on bridge results", () => {
    const mapped = mapDeliverableRowsToInventoryBridge({
      rows: [baseRow()],
      sourceId: "src-auth",
      revision: 1,
      currentTimestamp: NOW,
    });
    expect(mapped.valid).toBe(true);
    if (!mapped.valid) return;
    expect(assertAdsInventoryBridgeNonAuthoritative(mapped.result).ok).toBe(
      true
    );
    expect(
      assertAdsInventoryBridgeNonAuthoritative({
        ...mapped.result,
        productionAccepted: true,
      }).ok
    ).toBe(false);
  });

  it("keeps runAdsCanonicalStackV1 as sole authoritative decision entrypoint", () => {
    expect(typeof platform.runAdsCanonicalStackV1).toBe("function");
    expect(INDEX_SOURCE).toMatch(/deliverableBindings/);
    expect(INDEX_SOURCE).toMatch(/inventoryBridge/);
    expect(BRIDGE_SOURCE).toMatch(/runAdsCanonicalStackV1/);
    expect(BRIDGE_SOURCE).not.toMatch(/authoritativeDecisionPath:\s*true/);
    expect(BINDING_SOURCE).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(BRIDGE_SOURCE).not.toMatch(/Math\.random|Date\.now/);
  });

  it("feeds selection inventory into canonical stack without opening production gates", () => {
    const mapped = mapDeliverableRowsToInventoryBridge({
      rows: [baseRow()],
      sourceId: "src-stack",
      revision: 1,
      currentTimestamp: NOW,
    });
    expect(mapped.valid).toBe(true);
    if (!mapped.valid) return;

    const candidate = mapped.result.selectionInventory.candidates[0];
    expect(candidate).toBeTruthy();
    if (!candidate) return;

    const outcome = platform.runAdsCanonicalStackV1({
      inventory: mapped.result.selectionInventory,
      selectionContext: {
        placement: { placementId: candidate.placementId },
        countryCode: "US",
        languageCode: "en-US",
        platform: "web",
        deviceClass: "mobile",
        viewerAgeGatePassed: true,
        selectionRequestId: "selection-req-bridge-1",
        evaluatedAt: NOW,
      },
      rankingSignals: [
        {
          candidateId: candidate.candidateId,
          placementCompatible: true,
          creativeCompatible: true,
          policyEligible: true,
          deliveryEligible: true,
          qualityScore: 0.9,
          relevanceScore: 0.8,
          freshnessScore: 0.7,
        },
      ],
      budgetSnapshots: [
        {
          candidateId: candidate.candidateId,
          dailyBudgetMinor: 10_000,
          lifetimeBudgetMinor: 100_000,
          remainingBudgetMinor: 5_000,
        },
      ],
      pacingSnapshots: [
        {
          candidateId: candidate.candidateId,
          pacingState: "on_pace",
          pacingWindow: {
            windowId: "window-1",
            targetDeliveryFraction: 0.5,
            actualDeliveryFraction: 0.4,
          },
        },
      ],
      frequencySnapshots: [
        {
          candidateId: candidate.candidateId,
          campaignId: candidate.campaignRef,
          userExposureCount: 0,
          dailyExposureCount: 0,
          campaignExposureCount: 0,
          dailyCap: 10,
          lifetimeCap: 100,
          campaignCap: 50,
        },
      ],
      invalidTrafficSignals: {
        trustLevel: "trusted",
        reportingHandleValid: true,
        duplicateEvent: false,
        impossibleSequence: false,
        suspiciousImpression: false,
        suspiciousClick: false,
      },
      pricing: {
        pricingModel: "cpm",
        unitPriceMinor: 5_000,
        currency: "USD",
        quantity: 1,
      },
      creativeDescriptor: {
        creativeReference: candidate.creativeRef,
        creativeType: candidate.creativeType,
        mediaReference: "media-ref-1",
        thumbnailReference: "thumb-ref-1",
        clickDestinationReference: "destination-ref-1",
      },
      impressionHandle: "imp-handle-1",
      clickHandle: "clk-handle-1",
      disclosureLabel: "Sponsored",
      cacheHints: {
        cacheable: false,
        maxAgeSeconds: null,
        cacheKey: null,
      },
      expiresAt: "2026-07-23T13:00:00.000Z",
      currentTimestamp: NOW,
      eventType: "impression",
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.authoritativeDecisionPath).toBe(true);
    expect(outcome.result.productionAccepted).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.billingEnabled).toBe(false);
    expect(mapped.result.authoritativeDecisionPath).toBe(false);
  });

  it("idempotently maps duplicate deliverable ids without fabricating authority", () => {
    const mapped = mapDeliverableRowsToInventoryBridge({
      rows: [baseRow(), baseRow()],
      sourceId: "src-dup",
      revision: 1,
      currentTimestamp: NOW,
    });
    expect(mapped.valid).toBe(true);
    if (!mapped.valid) return;
    expect(mapped.result.selectionInventory.candidates).toHaveLength(1);
    expect(mapped.result.exclusionReasons.some((r) => r.includes("duplicate"))).toBe(
      true
    );
  });

  it("bindDeliverable rejects cross-owner and unapproved creatives via mocked client", async () => {
    const { bindDeliverable } = await import("./deliverableBindings");

    function mockClient(creativeOverrides: Record<string, unknown> = {}) {
      return {
        from: vi.fn((table: string) => {
          const api = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            single: vi.fn(),
          };
          if (table === "ad_campaigns") {
            api.maybeSingle.mockResolvedValue({
              data: {
                id: "campaign-1",
                advertiser_account_id: "advertiser-1",
                status: "approved",
              },
              error: null,
            });
          } else if (table === "ad_sets") {
            api.maybeSingle.mockResolvedValue({
              data: {
                id: "adset-1",
                campaign_id: "campaign-1",
                status: "approved",
                placements: ["watch_feed"],
              },
              error: null,
            });
          } else if (table === "ad_creatives") {
            api.maybeSingle.mockResolvedValue({
              data: {
                id: "creative-1",
                advertiser_account_id: "advertiser-OTHER",
                campaign_id: "campaign-1",
                ad_set_id: null,
                creative_type: "video",
                headline: "Hi",
                body_text: null,
                call_to_action: "learn_more",
                destination_url: "https://example.com",
                media_path: "a/b/c",
                thumbnail_path: null,
                status: "approved",
                moderation_notes: null,
                created_by: "user-1",
                created_at: NOW,
                updated_at: NOW,
                ...creativeOverrides,
              },
              error: null,
            });
          }
          return api;
        }),
        rpc: vi.fn(),
      };
    }

    const crossOwner = await bindDeliverable(mockClient() as never, {
      campaignId: "campaign-1",
      adSetId: "adset-1",
      creativeId: "creative-1",
    });
    expect(crossOwner.ok).toBe(false);
    if (crossOwner.ok) return;
    expect(crossOwner.message).toMatch(/does not belong/i);

    const unapproved = await bindDeliverable(
      mockClient({
        advertiser_account_id: "advertiser-1",
        status: "pending_review",
      }) as never,
      {
        campaignId: "campaign-1",
        adSetId: "adset-1",
        creativeId: "creative-1",
      }
    );
    expect(unapproved.ok).toBe(false);
    if (unapproved.ok) return;
    expect(unapproved.message).toMatch(/approved creatives/i);
  });

  it("bindDeliverable calls authoritative RPC and maps unique races idempotently", async () => {
    const { bindDeliverable } = await import("./deliverableBindings");
    const bindingRow = {
      id: "ad-1",
      ad_set_id: "adset-1",
      creative_id: "creative-1",
      name: "Bound",
      status: "approved",
      delivery_priority: 100,
      created_at: NOW,
      updated_at: NOW,
    };

    const rpc = vi.fn().mockResolvedValue({
      data: { created: true, binding: bindingRow },
      error: null,
    });

    const supabase = {
      from: vi.fn((table: string) => {
        const api = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(),
          insert: vi.fn().mockReturnThis(),
        };
        if (table === "ad_campaigns") {
          api.maybeSingle.mockResolvedValue({
            data: {
              id: "campaign-1",
              advertiser_account_id: "advertiser-1",
              status: "approved",
            },
            error: null,
          });
        } else if (table === "ad_sets") {
          api.maybeSingle.mockResolvedValue({
            data: {
              id: "adset-1",
              campaign_id: "campaign-1",
              status: "approved",
              placements: ["watch_feed"],
            },
            error: null,
          });
        } else if (table === "ad_creatives") {
          api.maybeSingle.mockResolvedValue({
            data: {
              id: "creative-1",
              advertiser_account_id: "advertiser-1",
              campaign_id: "campaign-1",
              ad_set_id: null,
              creative_type: "video",
              headline: "Hi",
              body_text: null,
              call_to_action: "learn_more",
              destination_url: "https://example.com",
              media_path: "a/b/c",
              thumbnail_path: null,
              status: "approved",
              moderation_notes: null,
              created_by: "user-1",
              created_at: NOW,
              updated_at: NOW,
            },
            error: null,
          });
        } else if (table === "ads") {
          api.maybeSingle.mockResolvedValue({
            data: bindingRow,
            error: null,
          });
        }
        return api;
      }),
      rpc,
    };

    const created = await bindDeliverable(supabase as never, {
      campaignId: "campaign-1",
      adSetId: "adset-1",
      creativeId: "creative-1",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.created).toBe(true);
    expect(created.binding.id).toBe("ad-1");
    expect(rpc).toHaveBeenCalledWith("bind_ad_deliverable", {
      p_campaign_id: "campaign-1",
      p_ad_set_id: "adset-1",
      p_creative_id: "creative-1",
      p_name: expect.any(String),
    });
    expect(BINDING_SOURCE).toMatch(/bind_ad_deliverable/);
    expect(BINDING_SOURCE).not.toMatch(/\.from\("ads"\)\s*\n\s*\.insert/);

    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    const raced = await bindDeliverable(supabase as never, {
      campaignId: "campaign-1",
      adSetId: "adset-1",
      creativeId: "creative-1",
    });
    expect(raced.ok).toBe(true);
    if (!raced.ok) return;
    expect(raced.created).toBe(false);
    expect(raced.binding.id).toBe("ad-1");
  });
});

describe("Ads deliverable binding database authority contracts", () => {
  const AUTHORITY_MIGRATION =
    "supabase/migrations/20260842_ads_deliverable_binding_database_authority_v1.sql";
  const ROOT = path.join(__dirname, "..", "..");
  const sql = readFileSync(path.join(ROOT, AUTHORITY_MIGRATION), "utf8");

  it("enforces uniqueness and concurrent idempotent bind authority in SQL", () => {
    expect(sql).toMatch(/unique \(ad_set_id, creative_id\)/i);
    expect(sql).toMatch(/ads_ad_set_id_creative_id_key/);
    expect(sql).toMatch(/when unique_violation/i);
    expect(sql).toMatch(
      /create or replace function public\.bind_ad_deliverable/i
    );
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = public/i);
  });

  it("rejects cross-advertiser, unapproved, and mismatched ownership in bind RPC", () => {
    expect(sql).toMatch(
      /Creative does not belong to this advertiser account/
    );
    expect(sql).toMatch(/Only approved creatives can be bound/);
    expect(sql).toMatch(/Creative is bound to a different campaign/);
    expect(sql).toMatch(/Creative is bound to a different ad set/);
    expect(sql).toMatch(/Ad set does not belong to this campaign/);
    expect(sql).toMatch(/cr\.status is distinct from 'approved'/);
    expect(sql).toMatch(
      /cr\.advertiser_account_id is distinct from camp\.advertiser_account_id/
    );
  });

  it("revokes insecure direct authenticated writes on public.ads", () => {
    expect(sql).toMatch(
      /drop policy if exists "Managers write ads" on public\.ads/i
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.ads from authenticated/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.bind_ad_deliverable/i
    );
  });

  it("hardens activate_ad_campaign against direct RPC bypass of readiness rules", () => {
    expect(sql).toMatch(
      /At least one eligible ad set is required/
    );
    expect(sql).toMatch(
      /At least one valid deliverable binding is required/
    );
    expect(sql).toMatch(/At least one approved creative is required/);
    expect(sql).toMatch(/Advertiser account must be approved/);
    expect(sql).toMatch(/Campaign budget is incomplete/);
    expect(sql).toMatch(/Campaign schedule is invalid/);
    expect(sql).toMatch(/valid_bindings < 1/);
    expect(sql).toMatch(/eligible_ad_sets < 1/);
    expect(sql).toMatch(
      /cr\.advertiser_account_id = camp\.advertiser_account_id/
    );
  });

  it("keeps production delivery and billing closed", () => {
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    expect(sql).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(sql).toMatch(/Does NOT enable live delivery or billing/i);
    expect(sql).not.toMatch(/billing_enabled\s*=\s*true/i);
  });

  it("enforces placement/format compatibility inside bind_ad_deliverable SQL", () => {
    expect(sql).toMatch(
      /ads_deliverable_binding_placement_supported/
    );
    expect(sql).toMatch(/ads_deliverable_binding_selection_format/);
    expect(sql).toMatch(/ads_deliverable_binding_format_compatible/);
    expect(sql).toMatch(/aset\.placements/);
    expect(sql).toMatch(/cr\.creative_type/);
    expect(sql).toMatch(/foreach placement in array aset\.placements/i);
    expect(sql).toMatch(
      /Creative format is not selection-eligible for diagnostic inventory/
    );
    expect(sql).toMatch(
      /Creative format is incompatible with placement/
    );
    expect(sql).toMatch(/Unsupported placement/);
    expect(sql).toContain("'search_results'");
    expect(sql).toContain("'store_catalog'");
    expect(sql).toMatch(
      /p_placement in \('search_results', 'store_catalog'\)/
    );
    expect(sql).toMatch(/when 'story' then 'image'/);
    expect(sql).toMatch(/else null/);
    // Helpers are not granted to authenticated (RPC-only authority).
    expect(sql).toMatch(
      /revoke all on function public\.ads_deliverable_binding_format_compatible/
    );
  });
});

describe("Ads deliverable binding placement/format matrix alignment", () => {
  it("allows compatible image and video bindings (RPC matrix parity)", () => {
    expect(
      isDeliverableBindingPlacementFormatCompatible("watch_feed", "image")
    ).toBe(true);
    expect(
      isDeliverableBindingPlacementFormatCompatible("watch_feed", "video")
    ).toBe(true);
    expect(
      isDeliverableBindingPlacementFormatCompatible("discover_feed", "image")
    ).toBe(true);
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["watch_feed"],
        creativeType: "image",
      }).ok
    ).toBe(true);
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["watch_feed"],
        creativeType: "video",
      }).ok
    ).toBe(true);
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["watch_feed"],
        creativeType: "story",
      }).ok
    ).toBe(true);
  });

  it("rejects incompatible image/video combinations fail-closed", () => {
    expect(
      isDeliverableBindingPlacementFormatCompatible("search_results", "video")
    ).toBe(false);
    expect(
      isDeliverableBindingPlacementFormatCompatible("store_catalog", "video")
    ).toBe(false);
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["search_results"],
        creativeType: "video",
      }).ok
    ).toBe(false);
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["store_catalog"],
        creativeType: "video",
      }).ok
    ).toBe(false);
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["search_results"],
        creativeType: "image",
      }).ok
    ).toBe(true);
  });

  it("rejects unsupported placements and unknown creative formats", () => {
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["not_a_real_placement"],
        creativeType: "image",
      }).ok
    ).toBe(false);
    expect(mapCreativeTypeForDeliverableBinding("native")).toBeNull();
    expect(mapCreativeTypeForDeliverableBinding("carousel" as never)).toBeNull();
    expect(
      validateDeliverablePlacementCompatibility({
        placements: ["watch_feed"],
        creativeType: "native",
      }).ok
    ).toBe(false);
  });

  it("keeps app matrix aligned with platform gate and SQL image-only list", () => {
    expect([...ADS_DELIVERABLE_BINDING_SUPPORTED_PLACEMENTS]).toEqual([
      ...AD_PLACEMENTS,
    ]);
    expect([...ADS_DELIVERABLE_BINDING_IMAGE_ONLY_PLACEMENTS]).toEqual([
      "search_results",
      "store_catalog",
    ]);

    for (const placement of ADS_DELIVERABLE_BINDING_SUPPORTED_PLACEMENTS) {
      for (const format of ["image", "video"] as const) {
        const matrix = isDeliverableBindingPlacementFormatCompatible(
          placement,
          format
        );
        const platform = isCreativeCompatible(placement, format);
        expect(matrix).toBe(platform);
      }
    }

    for (const creativeType of CREATIVE_TYPES) {
      const selection = mapCreativeTypeForDeliverableBinding(creativeType);
      for (const placement of ADS_DELIVERABLE_BINDING_SUPPORTED_PLACEMENTS) {
        const app = validateDeliverablePlacementCompatibility({
          placements: [placement],
          creativeType,
        });
        if (!selection) {
          expect(app.ok).toBe(false);
          continue;
        }
        expect(app.ok).toBe(
          isDeliverableBindingPlacementFormatCompatible(placement, selection)
        );
      }
    }

    const AUTHORITY_MIGRATION =
      "supabase/migrations/20260842_ads_deliverable_binding_database_authority_v1.sql";
    const ROOT = path.join(__dirname, "..", "..");
    const sql = readFileSync(path.join(ROOT, AUTHORITY_MIGRATION), "utf8");
    for (const placement of ADS_DELIVERABLE_BINDING_SUPPORTED_PLACEMENTS) {
      expect(sql).toContain(`'${placement}'`);
    }
    for (const placement of ADS_DELIVERABLE_BINDING_IMAGE_ONLY_PLACEMENTS) {
      expect(sql).toContain(`'${placement}'`);
    }
  });

  it("maps SQL compatibility rejections to deterministic user-facing errors", () => {
    expect(
      mapBindDeliverableCompatibilityError(
        'Creative format is incompatible with placement "search_results"'
      )
    ).toBe('Creative format is incompatible with placement "search_results".');
    expect(
      mapBindDeliverableCompatibilityError(
        'Unsupported placement "weird_place"'
      )
    ).toBe('Unsupported placement "weird_place".');
    expect(
      mapBindDeliverableCompatibilityError(
        "Creative format is not selection-eligible for diagnostic inventory"
      )
    ).toBe(
      "Creative format is not selection-eligible for diagnostic inventory."
    );
    expect(ADS_DELIVERY_ENABLED).toBe(false);
  });
});
