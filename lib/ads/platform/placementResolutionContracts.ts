import {
  ADS_PLATFORM_CREATIVE_TYPES,
  type AdsPlatformCreativeType,
  type ContractValidationResult,
} from "./creativeContracts";
import {
  ADS_PLATFORM_PRODUCTS,
  getAdsPlacement,
  isAdsPlacementId,
  isCreativeTypeSupportedByPlacement,
  type AdsPlatformPlacementId,
  type AdsPlatformProduct,
} from "./placementRegistry";

export const ADS_PLACEMENT_RESOLUTION_CONTRACT_VERSION = 1 as const;

export type PlacementResolutionContext = Readonly<{
  owningProduct: AdsPlatformProduct;
  locale?: string;
  countryCode?: string;
  deviceClass?: string;
}>;

export type PlacementResolutionRequest = Readonly<{
  contractVersion: typeof ADS_PLACEMENT_RESOLUTION_CONTRACT_VERSION;
  requestId: string;
  placementId: AdsPlatformPlacementId;
  context: PlacementResolutionContext;
  acceptedCreativeTypes?: readonly AdsPlatformCreativeType[];
}>;

export type CreativePlaceholderContract = Readonly<{
  creativeType: AdsPlatformCreativeType;
  creativeReference: null;
  eligibility: "not_evaluated";
}>;

export type PlacementResolutionResponse =
  | Readonly<{
      contractVersion: typeof ADS_PLACEMENT_RESOLUTION_CONTRACT_VERSION;
      requestId: string;
      placementId: AdsPlatformPlacementId;
      status: "unavailable";
      reason:
        | "placement_disabled"
        | "unsupported_creative_type"
        | "contract_rejected";
      productionVisible: false;
    }>
  | Readonly<{
      contractVersion: typeof ADS_PLACEMENT_RESOLUTION_CONTRACT_VERSION;
      requestId: string;
      placementId: AdsPlatformPlacementId;
      status: "placeholder";
      creative: CreativePlaceholderContract;
      productionVisible: false;
    }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validatePlacementResolutionRequest(
  value: unknown
): ContractValidationResult {
  if (!isRecord(value)) {
    return { valid: false, issues: ["Resolution request must be an object."] };
  }

  const issues: string[] = [];
  if (value.contractVersion !== ADS_PLACEMENT_RESOLUTION_CONTRACT_VERSION) {
    issues.push("Resolution contractVersion must be 1.");
  }
  if (!isNonEmptyString(value.requestId)) {
    issues.push("Resolution requestId is required.");
  }
  if (
    typeof value.placementId !== "string" ||
    !isAdsPlacementId(value.placementId)
  ) {
    issues.push("Resolution placementId is not registered.");
  }
  if (!isRecord(value.context)) {
    issues.push("Resolution context is required.");
  } else if (
    typeof value.context.owningProduct !== "string" ||
    !(ADS_PLATFORM_PRODUCTS as readonly string[]).includes(
      value.context.owningProduct
    )
  ) {
    issues.push("Resolution context owningProduct is invalid.");
  } else if (
    typeof value.placementId === "string" &&
    isAdsPlacementId(value.placementId) &&
    getAdsPlacement(value.placementId).owningProduct !==
      value.context.owningProduct
  ) {
    issues.push("Resolution product does not own the requested placement.");
  }

  if (value.acceptedCreativeTypes !== undefined) {
    if (
      !Array.isArray(value.acceptedCreativeTypes) ||
      value.acceptedCreativeTypes.length === 0
    ) {
      issues.push("acceptedCreativeTypes must be a non-empty array when set.");
    } else {
      const acceptedTypes = value.acceptedCreativeTypes;
      if (
        acceptedTypes.some(
          (type) =>
            typeof type !== "string" ||
            !(ADS_PLATFORM_CREATIVE_TYPES as readonly string[]).includes(type)
        )
      ) {
        issues.push("acceptedCreativeTypes contains an unsupported type.");
      } else {
        const supportedAcceptedTypes =
          acceptedTypes as readonly AdsPlatformCreativeType[];
        if (
          typeof value.placementId === "string" &&
          isAdsPlacementId(value.placementId)
        ) {
          const placementId = value.placementId;
          if (
            !supportedAcceptedTypes.some((type) =>
              isCreativeTypeSupportedByPlacement(placementId, type)
            )
          ) {
            issues.push(
              "No accepted creative type is compatible with the placement."
            );
          }
        }
      }
    }
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}
