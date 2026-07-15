import type {
  AssetId,
  ConversionQuote,
  ConversionQuoteRequest,
  WalletAssetDefinition,
} from "./types";

export const WALLET_ASSETS: Record<AssetId, WalletAssetDefinition> = {
  um_points: {
    id: "um_points",
    kind: "points",
    symbol: "UM",
    displayName: "UM Points",
    accent: "violet",
    href: "/rewards",
    decimals: 0,
    conversionReady: false,
  },
  /**
   * Placeholder for a future UMTUBA digital token.
   * Not awarded or displayed until product enables it.
   */
  umtuba_token: {
    id: "umtuba_token",
    kind: "token",
    symbol: "UMT",
    displayName: "UMTUBA Token",
    accent: "cyan",
    href: "/rewards",
    decimals: 6,
    conversionReady: false,
  },
};

/** Primary header wallet asset (today: UM Points). */
export const PRIMARY_WALLET_ASSET_ID: AssetId = "um_points";

export function getWalletAsset(id: AssetId): WalletAssetDefinition {
  return WALLET_ASSETS[id];
}

export function getPrimaryWalletAsset(): WalletAssetDefinition {
  return WALLET_ASSETS[PRIMARY_WALLET_ASSET_ID];
}

/**
 * Conversion interface for a future token era.
 * Always returns unavailable — do not imply real monetary value.
 */
export function quoteAssetConversion(
  request: ConversionQuoteRequest
): ConversionQuote {
  void request;
  return {
    available: false,
    rate: null,
    estimatedOut: null,
    message: "Asset conversion is not available yet.",
  };
}
