export const ADS_PLATFORM_CREATIVE_TYPES = [
  "video",
  "image",
  "carousel",
  "text",
  "live_promotion",
  "store_promotion",
  "learning_promotion",
  "game_promotion",
  "brand",
] as const;

export type AdsPlatformCreativeType =
  (typeof ADS_PLATFORM_CREATIVE_TYPES)[number];

export type CreativeContractBase<
  TType extends AdsPlatformCreativeType,
> = Readonly<{
  type: TType;
  contractVersion: 1;
  label: string;
}>;

export type VideoCreativeContract = CreativeContractBase<"video"> &
  Readonly<{
    assetReference: string;
    posterReference?: string;
  }>;

export type ImageCreativeContract = CreativeContractBase<"image"> &
  Readonly<{
    assetReference: string;
    altText: string;
  }>;

export type CarouselCreativeCard = Readonly<{
  cardId: string;
  assetReference: string;
  headline: string;
}>;

export type CarouselCreativeContract = CreativeContractBase<"carousel"> &
  Readonly<{
    cards: readonly CarouselCreativeCard[];
  }>;

export type TextCreativeContract = CreativeContractBase<"text"> &
  Readonly<{
    headline: string;
    body?: string;
  }>;

export type LivePromotionCreativeContract =
  CreativeContractBase<"live_promotion"> &
    Readonly<{
      liveReference: string;
      headline: string;
    }>;

export type StorePromotionCreativeContract =
  CreativeContractBase<"store_promotion"> &
    Readonly<{
      productReference: string;
      headline: string;
    }>;

export type LearningPromotionCreativeContract =
  CreativeContractBase<"learning_promotion"> &
    Readonly<{
      learningReference: string;
      headline: string;
    }>;

export type GamePromotionCreativeContract =
  CreativeContractBase<"game_promotion"> &
    Readonly<{
      gameReference: string;
      headline: string;
    }>;

export type BrandCreativeContract = CreativeContractBase<"brand"> &
  Readonly<{
    brandReference: string;
    headline: string;
    assetReference?: string;
  }>;

export type AdsPlatformCreativeContract =
  | VideoCreativeContract
  | ImageCreativeContract
  | CarouselCreativeContract
  | TextCreativeContract
  | LivePromotionCreativeContract
  | StorePromotionCreativeContract
  | LearningPromotionCreativeContract
  | GamePromotionCreativeContract
  | BrandCreativeContract;

export type ContractValidationResult =
  | Readonly<{ valid: true }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateCreativeContract(
  value: unknown
): ContractValidationResult {
  if (!isRecord(value)) {
    return { valid: false, issues: ["Creative contract must be an object."] };
  }

  const issues: string[] = [];
  if (value.contractVersion !== 1) {
    issues.push("Creative contractVersion must be 1.");
  }
  if (
    typeof value.type !== "string" ||
    !(ADS_PLATFORM_CREATIVE_TYPES as readonly string[]).includes(value.type)
  ) {
    issues.push("Creative type is not supported.");
  }
  if (!isNonEmptyString(value.label)) {
    issues.push("Creative label is required.");
  }

  switch (value.type) {
    case "video":
      if (!isNonEmptyString(value.assetReference)) {
        issues.push("Video assetReference is required.");
      }
      break;
    case "image":
      if (!isNonEmptyString(value.assetReference)) {
        issues.push("Image assetReference is required.");
      }
      if (!isNonEmptyString(value.altText)) {
        issues.push("Image altText is required.");
      }
      break;
    case "carousel":
      if (!Array.isArray(value.cards) || value.cards.length === 0) {
        issues.push("Carousel requires at least one card.");
      } else if (
        value.cards.some(
          (card) =>
            !isRecord(card) ||
            !isNonEmptyString(card.cardId) ||
            !isNonEmptyString(card.assetReference) ||
            !isNonEmptyString(card.headline)
        )
      ) {
        issues.push("Every carousel card must be complete.");
      }
      break;
    case "text":
      if (!isNonEmptyString(value.headline)) {
        issues.push("Text headline is required.");
      }
      break;
    case "live_promotion":
      if (!isNonEmptyString(value.liveReference)) {
        issues.push("Live reference is required.");
      }
      if (!isNonEmptyString(value.headline)) {
        issues.push("Live promotion headline is required.");
      }
      break;
    case "store_promotion":
      if (!isNonEmptyString(value.productReference)) {
        issues.push("Product reference is required.");
      }
      if (!isNonEmptyString(value.headline)) {
        issues.push("Store promotion headline is required.");
      }
      break;
    case "learning_promotion":
      if (!isNonEmptyString(value.learningReference)) {
        issues.push("Learning reference is required.");
      }
      if (!isNonEmptyString(value.headline)) {
        issues.push("Learning promotion headline is required.");
      }
      break;
    case "game_promotion":
      if (!isNonEmptyString(value.gameReference)) {
        issues.push("Game reference is required.");
      }
      if (!isNonEmptyString(value.headline)) {
        issues.push("Game promotion headline is required.");
      }
      break;
    case "brand":
      if (!isNonEmptyString(value.brandReference)) {
        issues.push("Brand reference is required.");
      }
      if (!isNonEmptyString(value.headline)) {
        issues.push("Brand headline is required.");
      }
      break;
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}
