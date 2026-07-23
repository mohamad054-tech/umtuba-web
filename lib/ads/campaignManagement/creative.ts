import { freezeCampaignManagementAuthority } from "./authority";

/**
 * Creative foundation contracts for Campaign Management V1.
 * Validation only — no delivery or rendering.
 */

export const ADS_CAMPAIGN_CREATIVE_CONTRACT_VERSION = "v1" as const;

/** Future-facing creative types (foundation-local; not served). */
export const ADS_CAMPAIGN_CREATIVE_TYPES = [
  "image",
  "video",
  "carousel",
  "interactive",
] as const;

export type AdsCampaignCreativeType =
  (typeof ADS_CAMPAIGN_CREATIVE_TYPES)[number];

export type AdsCampaignCreativeContract = Readonly<{
  contractVersion: typeof ADS_CAMPAIGN_CREATIVE_CONTRACT_VERSION;
  creativeRef: string;
  creativeType: AdsCampaignCreativeType;
  headline: string;
  bodyText: string | null;
  mediaReference: string;
  thumbnailReference: string | null;
  destinationReference: string;
  productionEnabled: false;
  deliveryEnabled: false;
  billingEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  rendersToUsers: false;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const REF_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

export function parseAdsCampaignCreativeContract(
  input: unknown
):
  | { ok: true; creative: AdsCampaignCreativeContract }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Creative contract must be an object.",
      issues: Object.freeze(["Creative contract must be an object."]),
    };
  }
  const issues: string[] = [];
  if (
    input.contractVersion != null &&
    input.contractVersion !== ADS_CAMPAIGN_CREATIVE_CONTRACT_VERSION
  ) {
    issues.push(
      `contractVersion must be "${ADS_CAMPAIGN_CREATIVE_CONTRACT_VERSION}".`
    );
  }
  if (typeof input.creativeRef !== "string" || !REF_RE.test(input.creativeRef.trim())) {
    issues.push("creativeRef must be 1–128 chars of [A-Za-z0-9_.:-].");
  }
  if (
    typeof input.creativeType !== "string" ||
    !(ADS_CAMPAIGN_CREATIVE_TYPES as readonly string[]).includes(input.creativeType)
  ) {
    issues.push(
      "creativeType must be one of: image, video, carousel, interactive."
    );
  }
  if (
    typeof input.headline !== "string" ||
    input.headline.trim().length < 1 ||
    input.headline.trim().length > 120
  ) {
    issues.push("headline must be 1–120 characters.");
  }
  let bodyText: string | null = null;
  if (input.bodyText != null && input.bodyText !== "") {
    if (
      typeof input.bodyText !== "string" ||
      input.bodyText.trim().length > 2000
    ) {
      issues.push("bodyText must be a string up to 2000 characters when set.");
    } else {
      bodyText = input.bodyText.trim();
    }
  }
  if (
    typeof input.mediaReference !== "string" ||
    !REF_RE.test(input.mediaReference.trim())
  ) {
    issues.push("mediaReference must be an opaque reference.");
  }
  let thumbnailReference: string | null = null;
  if (input.thumbnailReference != null && input.thumbnailReference !== "") {
    if (
      typeof input.thumbnailReference !== "string" ||
      !REF_RE.test(input.thumbnailReference.trim())
    ) {
      issues.push("thumbnailReference must be an opaque reference when set.");
    } else {
      thumbnailReference = input.thumbnailReference.trim();
    }
  }
  if (
    typeof input.destinationReference !== "string" ||
    !REF_RE.test(input.destinationReference.trim())
  ) {
    issues.push("destinationReference must be an opaque reference.");
  }

  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid creative contract.",
      issues: Object.freeze(issues),
    };
  }

  return {
    ok: true,
    creative: freezeCampaignManagementAuthority({
      contractVersion: ADS_CAMPAIGN_CREATIVE_CONTRACT_VERSION,
      creativeRef: String(input.creativeRef).trim(),
      creativeType: input.creativeType as AdsCampaignCreativeType,
      headline: String(input.headline).trim(),
      bodyText,
      mediaReference: String(input.mediaReference).trim(),
      thumbnailReference,
      destinationReference: String(input.destinationReference).trim(),
      rendersToUsers: false as const,
    }),
  };
}
