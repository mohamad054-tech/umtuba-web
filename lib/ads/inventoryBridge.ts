import type { SupabaseClient } from "@supabase/supabase-js";
import { ADS_DELIVERY_ENABLED } from "./constants";
import { ADS_ERRORS } from "./errors";
import {
  mapDomainCreativeTypeForPlacement,
  validateDeliverablePlacementCompatibility,
} from "./deliverableBindings";
import {
  ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
  buildCandidateInventory,
  type AdsCandidateInventory,
  type AdsCandidateMetadata,
} from "./platform/candidateInventory";
import {
  ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
  buildAdsCandidateSelectionInventory,
  isAdsCandidateSelectionCreativeType,
  type AdsCandidateSelectionCreativeType,
  type AdsCandidateSelectionInventory,
  type AdsSelectionCandidate,
} from "./platform/candidateSelection";
import { isCreativeCompatible } from "./platform/creativePlacementCompatibility";
import {
  getCanonicalPlacement,
} from "./platform/taxonomyMapper";
import type { AdsPlatformPlacementId } from "./platform/placementRegistry";
import type { AdsPlatformCreativeType } from "./platform/creativeContracts";
import type { CreativeType } from "./types";

type AnyClient = SupabaseClient;

/**
 * Ads Deliverable Binding & Inventory Bridge V1.
 *
 * Read-only adapter: persisted deliverables → platform inventory contracts.
 * Never enables production delivery/billing. Never claims decision authority.
 * Sole authoritative decision entrypoint remains `runAdsCanonicalStackV1`.
 */

export const ADS_INVENTORY_BRIDGE_CONTRACT_VERSION = "v1" as const;

export const ADS_INVENTORY_BRIDGE_AUTHORITY = {
  authoritativeDecisionPath: false,
  authoritativeProductionServing: false,
  productionAccepted: false,
  deliveryEnabled: false,
  billingEnabled: false,
  productionEnabled: false,
} as const;

export type AdsDeliverableBridgeRow = Readonly<{
  adId: string;
  adStatus: string;
  adSetId: string;
  adSetStatus: string;
  campaignId: string;
  campaignStatus: string;
  advertiserAccountId: string;
  advertiserStatus: string;
  creativeId: string;
  creativeStatus: string;
  creativeType: CreativeType;
  placements: readonly string[];
  countries: readonly string[];
  languages: readonly string[];
  devices: readonly string[];
  ageMin: number;
  startAt: string | null;
  endAt: string | null;
  dailyBudgetMinor: number | null;
  totalBudgetMinor: number | null;
  spentMinor: number;
  createdAt: string;
  updatedAt: string;
  revision: number;
}>;

export type AdsInventoryBridgeResult = Readonly<{
  contractVersion: typeof ADS_INVENTORY_BRIDGE_CONTRACT_VERSION;
  candidateInventory: AdsCandidateInventory;
  selectionInventory: AdsCandidateSelectionInventory;
  excludedCount: number;
  exclusionReasons: readonly string[];
  authoritativeDecisionPath: false;
  authoritativeProductionServing: false;
  productionAccepted: false;
  deliveryEnabled: false;
  billingEnabled: false;
  productionEnabled: false;
}>;

function freezeAuthority<T extends Record<string, unknown>>(
  value: T
): T & typeof ADS_INVENTORY_BRIDGE_AUTHORITY {
  return Object.freeze({
    ...value,
    ...ADS_INVENTORY_BRIDGE_AUTHORITY,
  });
}

function mapSelectionCreativeType(
  creativeType: CreativeType
): AdsCandidateSelectionCreativeType | null {
  const mapped = mapDomainCreativeTypeForPlacement(creativeType);
  if (mapped === "image" || mapped === "video") {
    return mapped;
  }
  // brand/native and others are not selection-eligible in V1.
  return null;
}

function mapPlatformCreativeType(
  creativeType: CreativeType
): AdsPlatformCreativeType | null {
  const mapped = mapDomainCreativeTypeForPlacement(creativeType);
  if (
    mapped === "image" ||
    mapped === "video" ||
    mapped === "brand" ||
    mapped === "carousel" ||
    mapped === "text"
  ) {
    return mapped;
  }
  return null;
}

function isCampaignInventoryEligible(status: string): boolean {
  return status === "approved" || status === "active" || status === "paused";
}

function isAdSetInventoryEligible(status: string): boolean {
  return (
    status === "draft" ||
    status === "approved" ||
    status === "active" ||
    status === "paused" ||
    status === "pending_review"
  );
}

function scheduleAllows(
  startAt: string | null,
  endAt: string | null,
  currentTimestamp: string
): boolean {
  if (startAt && startAt > currentTimestamp) return false;
  if (endAt && endAt <= currentTimestamp) return false;
  if (startAt && endAt && endAt <= startAt) return false;
  return true;
}

function budgetAllows(
  totalBudgetMinor: number | null,
  spentMinor: number
): boolean {
  if (totalBudgetMinor == null) return true;
  return spentMinor < totalBudgetMinor;
}

/**
 * Pure deterministic mapper from deliverable bridge rows → inventory contracts.
 */
export function mapDeliverableRowsToInventoryBridge(input: {
  rows: readonly AdsDeliverableBridgeRow[];
  sourceId: string;
  revision: number;
  currentTimestamp: string;
}):
  | { valid: true; result: AdsInventoryBridgeResult }
  | { valid: false; issues: readonly string[] } {
  const exclusionReasons: string[] = [];
  const selectionCandidates: AdsSelectionCandidate[] = [];
  const metadataCandidates: AdsCandidateMetadata[] = [];
  const seenCandidateIds = new Set<string>();

  const sorted = [...input.rows].sort((a, b) => {
    if (a.adId !== b.adId) return a.adId.localeCompare(b.adId);
    return a.creativeId.localeCompare(b.creativeId);
  });

  for (const row of sorted) {
    if (row.advertiserStatus !== "approved") {
      exclusionReasons.push(`${row.adId}:advertiser_not_approved`);
      continue;
    }
    if (!isCampaignInventoryEligible(row.campaignStatus)) {
      exclusionReasons.push(`${row.adId}:campaign_ineligible`);
      continue;
    }
    if (!isAdSetInventoryEligible(row.adSetStatus)) {
      exclusionReasons.push(`${row.adId}:ad_set_ineligible`);
      continue;
    }
    if (row.adStatus !== "approved" && row.adStatus !== "active") {
      exclusionReasons.push(`${row.adId}:binding_ineligible`);
      continue;
    }
    if (row.creativeStatus !== "approved") {
      exclusionReasons.push(`${row.adId}:creative_not_approved`);
      continue;
    }
    if (!scheduleAllows(row.startAt, row.endAt, input.currentTimestamp)) {
      exclusionReasons.push(`${row.adId}:schedule_invalid`);
      continue;
    }
    if (!budgetAllows(row.totalBudgetMinor, row.spentMinor)) {
      exclusionReasons.push(`${row.adId}:budget_exhausted`);
      continue;
    }

    const placementCheck = validateDeliverablePlacementCompatibility({
      placements: row.placements,
      creativeType: row.creativeType,
    });
    if (!placementCheck.ok) {
      exclusionReasons.push(`${row.adId}:placement_incompatible`);
      continue;
    }

    const selectionCreative = mapSelectionCreativeType(row.creativeType);
    const platformCreative = mapPlatformCreativeType(row.creativeType);
    if (!selectionCreative || !platformCreative) {
      exclusionReasons.push(`${row.adId}:creative_type_unsupported`);
      continue;
    }
    if (!isAdsCandidateSelectionCreativeType(selectionCreative)) {
      exclusionReasons.push(`${row.adId}:creative_type_unsupported`);
      continue;
    }

    for (const domainPlacement of placementCheck.placements) {
      let placementId: AdsPlatformPlacementId;
      try {
        placementId = getCanonicalPlacement(
          domainPlacement
        ) as AdsPlatformPlacementId;
      } catch {
        exclusionReasons.push(`${row.adId}:placement_unmapped:${domainPlacement}`);
        continue;
      }
      if (!isCreativeCompatible(domainPlacement, platformCreative)) {
        exclusionReasons.push(
          `${row.adId}:placement_format_mismatch:${domainPlacement}`
        );
        continue;
      }

      const candidateId = `${row.adId}:${placementId}`;
      if (seenCandidateIds.has(candidateId)) {
        exclusionReasons.push(`${candidateId}:duplicate_candidate`);
        continue;
      }
      seenCandidateIds.add(candidateId);

      const requiresAgeGate = row.ageMin < 18;
      selectionCandidates.push(
        Object.freeze({
          candidateId,
          creativeRef: row.creativeId,
          creativeType: selectionCreative,
          placementId,
          campaignRef: row.campaignId,
          advertiserRef: row.advertiserAccountId,
          adSetRef: row.adSetId,
          adRef: row.adId,
          eligibility: Object.freeze({
            campaignActive:
              row.campaignStatus === "active" ||
              row.campaignStatus === "approved" ||
              row.campaignStatus === "paused",
            creativeActive: true,
            policyAllowed: true,
            requiresAgeGate,
            targetedCountryCodes: Object.freeze([...row.countries]),
            targetedLanguageCodes: Object.freeze([...row.languages]),
            targetedPlatforms: Object.freeze([
              "web",
              "ios",
              "android",
            ] as const),
            targetedDeviceClasses: Object.freeze(
              row.devices.length > 0
                ? row.devices.filter(
                    (device): device is "mobile" | "tablet" | "desktop" =>
                      device === "mobile" ||
                      device === "tablet" ||
                      device === "desktop"
                  )
                : (["mobile", "tablet", "desktop"] as const)
            ),
          }),
        })
      );

      metadataCandidates.push(
        Object.freeze({
          candidateId,
          campaignRef: row.campaignId,
          adSetRef: row.adSetId,
          adRef: row.adId,
          creativeRef: row.creativeId,
          placement: placementId,
          creativeType: platformCreative,
          eligibilitySnapshot: Object.freeze({
            snapshotRef: `elig:${row.adId}:${placementId}`,
            revision: Math.max(1, input.revision),
          }),
          inventorySource: "catalog",
          revision: Math.max(1, row.revision),
          timestamps: Object.freeze({
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }),
        })
      );
    }
  }

  const candidateInventoryOutcome = buildCandidateInventory({
    contractVersion: ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
    inventoryId: input.sourceId,
    revision: Math.max(1, input.revision),
    generatedAt: input.currentTimestamp,
    candidates: metadataCandidates,
  });
  if (!candidateInventoryOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([...candidateInventoryOutcome.issues]),
    };
  }

  const selectionInventoryOutcome = buildAdsCandidateSelectionInventory({
    contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
    sourceId: input.sourceId,
    revision: Math.max(1, input.revision),
    candidates: selectionCandidates,
  });
  if (!selectionInventoryOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([...selectionInventoryOutcome.issues]),
    };
  }

  return {
    valid: true,
    result: freezeAuthority({
      contractVersion: ADS_INVENTORY_BRIDGE_CONTRACT_VERSION,
      candidateInventory: candidateInventoryOutcome.inventory,
      selectionInventory: selectionInventoryOutcome.inventory,
      excludedCount: exclusionReasons.length,
      exclusionReasons: Object.freeze([...exclusionReasons]),
    }),
  };
}

/**
 * Asserts bridge artifacts never claim production / decision authority.
 */
export function assertAdsInventoryBridgeNonAuthoritative(
  result: unknown
): { ok: true } | { ok: false; issues: readonly string[] } {
  if (typeof result !== "object" || result === null) {
    return { ok: false, issues: Object.freeze(["Bridge result must be an object."]) };
  }
  const row = result as Record<string, unknown>;
  const issues: string[] = [];
  if (row.authoritativeDecisionPath === true) {
    issues.push("authoritativeDecisionPath must not be true on bridge results.");
  }
  if (row.authoritativeProductionServing === true) {
    issues.push(
      "authoritativeProductionServing must not be true on bridge results."
    );
  }
  if (row.productionAccepted === true) {
    issues.push("productionAccepted must not be true on bridge results.");
  }
  if (row.deliveryEnabled === true) {
    issues.push("deliveryEnabled must remain false.");
  }
  if ((ADS_DELIVERY_ENABLED as boolean) === true) {
    issues.push("ADS_DELIVERY_ENABLED must remain false.");
  }
  if (row.billingEnabled === true) {
    issues.push("billingEnabled must remain false.");
  }
  return issues.length === 0
    ? { ok: true }
    : { ok: false, issues: Object.freeze(issues) };
}

/**
 * Loads eligible persisted deliverables for one advertiser and maps inventories.
 * Read-only. Fail closed. Does not call the canonical stack.
 */
export async function loadAdsInventoryBridgeForAdvertiser(
  supabase: AnyClient,
  input: {
    advertiserAccountId: string;
    currentTimestamp: string;
    sourceId?: string;
    revision?: number;
  }
): Promise<
  | { ok: true; result: AdsInventoryBridgeResult }
  | { ok: false; message: string; issues?: readonly string[] }
> {
  const { data: advertiser, error: advertiserErr } = await supabase
    .from("advertiser_accounts")
    .select("id, status")
    .eq("id", input.advertiserAccountId)
    .maybeSingle();
  if (advertiserErr || !advertiser) {
    return { ok: false, message: ADS_ERRORS.accountNotFound };
  }

  const { data: campaigns, error: campaignErr } = await supabase
    .from("ad_campaigns")
    .select(
      "id, status, start_at, end_at, daily_budget_minor, total_budget_minor, spent_minor, advertiser_account_id, updated_at"
    )
    .eq("advertiser_account_id", input.advertiserAccountId);
  if (campaignErr) {
    console.error("loadAdsInventoryBridgeForAdvertiser campaigns", campaignErr);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  const campaignRows = campaigns ?? [];
  if (campaignRows.length === 0) {
    const empty = mapDeliverableRowsToInventoryBridge({
      rows: [],
      sourceId: input.sourceId ?? `advertiser:${input.advertiserAccountId}`,
      revision: input.revision ?? 1,
      currentTimestamp: input.currentTimestamp,
    });
    if (!empty.valid) {
      return { ok: false, message: ADS_ERRORS.loadFailed, issues: empty.issues };
    }
    return { ok: true, result: empty.result };
  }

  const campaignIds = campaignRows.map((row) => String(row.id));
  const campaignById = new Map(
    campaignRows.map((row) => [String(row.id), row] as const)
  );

  const { data: adSets, error: adSetErr } = await supabase
    .from("ad_sets")
    .select(
      "id, campaign_id, status, placements, countries, languages, devices, age_min, updated_at"
    )
    .in("campaign_id", campaignIds);
  if (adSetErr) {
    console.error("loadAdsInventoryBridgeForAdvertiser adSets", adSetErr);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  const adSetRows = adSets ?? [];
  const adSetIds = adSetRows.map((row) => String(row.id));
  const adSetById = new Map(
    adSetRows.map((row) => [String(row.id), row] as const)
  );

  if (adSetIds.length === 0) {
    const empty = mapDeliverableRowsToInventoryBridge({
      rows: [],
      sourceId: input.sourceId ?? `advertiser:${input.advertiserAccountId}`,
      revision: input.revision ?? 1,
      currentTimestamp: input.currentTimestamp,
    });
    if (!empty.valid) {
      return { ok: false, message: ADS_ERRORS.loadFailed, issues: empty.issues };
    }
    return { ok: true, result: empty.result };
  }

  const { data: ads, error: adsErr } = await supabase
    .from("ads")
    .select("id, ad_set_id, creative_id, status, created_at, updated_at")
    .in("ad_set_id", adSetIds);
  if (adsErr) {
    console.error("loadAdsInventoryBridgeForAdvertiser ads", adsErr);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  const adRows = ads ?? [];
  if (adRows.length === 0) {
    const empty = mapDeliverableRowsToInventoryBridge({
      rows: [],
      sourceId: input.sourceId ?? `advertiser:${input.advertiserAccountId}`,
      revision: input.revision ?? 1,
      currentTimestamp: input.currentTimestamp,
    });
    if (!empty.valid) {
      return { ok: false, message: ADS_ERRORS.loadFailed, issues: empty.issues };
    }
    return { ok: true, result: empty.result };
  }

  const creativeIds = [
    ...new Set(adRows.map((row) => String(row.creative_id))),
  ];
  const { data: creatives, error: creativeErr } = await supabase
    .from("ad_creatives")
    .select(
      "id, status, creative_type, advertiser_account_id, campaign_id, updated_at"
    )
    .in("id", creativeIds);
  if (creativeErr) {
    console.error("loadAdsInventoryBridgeForAdvertiser creatives", creativeErr);
    return { ok: false, message: ADS_ERRORS.loadFailed };
  }
  const creativeById = new Map(
    (creatives ?? []).map((row) => [String(row.id), row] as const)
  );

  const bridgeRows: AdsDeliverableBridgeRow[] = [];
  for (const ad of adRows) {
    const adSet = adSetById.get(String(ad.ad_set_id));
    if (!adSet) continue;
    const campaign = campaignById.get(String(adSet.campaign_id));
    if (!campaign) continue;
    const creative = creativeById.get(String(ad.creative_id));
    if (!creative) continue;
    if (
      String(creative.advertiser_account_id) !== input.advertiserAccountId ||
      String(campaign.advertiser_account_id) !== input.advertiserAccountId
    ) {
      continue;
    }

    bridgeRows.push(
      Object.freeze({
        adId: String(ad.id),
        adStatus: String(ad.status),
        adSetId: String(adSet.id),
        adSetStatus: String(adSet.status),
        campaignId: String(campaign.id),
        campaignStatus: String(campaign.status),
        advertiserAccountId: input.advertiserAccountId,
        advertiserStatus: String(advertiser.status),
        creativeId: String(creative.id),
        creativeStatus: String(creative.status),
        creativeType: creative.creative_type as CreativeType,
        placements: Object.freeze(
          Array.isArray(adSet.placements) ? [...(adSet.placements as string[])] : []
        ),
        countries: Object.freeze(
          Array.isArray(adSet.countries) ? [...(adSet.countries as string[])] : []
        ),
        languages: Object.freeze(
          Array.isArray(adSet.languages) ? [...(adSet.languages as string[])] : []
        ),
        devices: Object.freeze(
          Array.isArray(adSet.devices) ? [...(adSet.devices as string[])] : []
        ),
        ageMin: Number(adSet.age_min ?? 13),
        startAt: (campaign.start_at as string | null) ?? null,
        endAt: (campaign.end_at as string | null) ?? null,
        dailyBudgetMinor:
          campaign.daily_budget_minor == null
            ? null
            : Number(campaign.daily_budget_minor),
        totalBudgetMinor:
          campaign.total_budget_minor == null
            ? null
            : Number(campaign.total_budget_minor),
        spentMinor: Number(campaign.spent_minor ?? 0),
        createdAt: String(ad.created_at),
        updatedAt: String(ad.updated_at),
        revision: 1,
      })
    );
  }

  const mapped = mapDeliverableRowsToInventoryBridge({
    rows: bridgeRows,
    sourceId: input.sourceId ?? `advertiser:${input.advertiserAccountId}`,
    revision: input.revision ?? 1,
    currentTimestamp: input.currentTimestamp,
  });
  if (!mapped.valid) {
    return { ok: false, message: ADS_ERRORS.loadFailed, issues: mapped.issues };
  }
  const authority = assertAdsInventoryBridgeNonAuthoritative(mapped.result);
  if (!authority.ok) {
    return { ok: false, message: ADS_ERRORS.loadFailed, issues: authority.issues };
  }
  return { ok: true, result: mapped.result };
}
