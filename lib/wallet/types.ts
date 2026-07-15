/**
 * Application-layer wallet / digital asset model.
 * UM Points is the first asset; designed so a future UMTUBA token can plug in
 * without rewriting UI. No blockchain or real conversion is implemented here.
 */

export type AssetId = "um_points" | "umtuba_token";

export type AssetKind = "points" | "token";

export type WalletAssetDefinition = {
  id: AssetId;
  kind: AssetKind;
  /** Short code shown in compact UI (e.g. UM). */
  symbol: string;
  /** Human-readable name (e.g. UM Points). */
  displayName: string;
  /** Accent hint for UI theming. */
  accent: "violet" | "cyan" | "amber";
  /** Deep link for the asset detail / rewards surface. */
  href: string;
  /** Decimal places for display (points = 0). */
  decimals: number;
  /**
   * Future: whether this asset may ever convert to another.
   * Conversion itself is not implemented.
   */
  conversionReady: boolean;
};

export type WalletBalanceStatus =
  | "loading"
  | "signed_out"
  | "ready"
  | "error";

export type WalletBalance = {
  assetId: AssetId;
  /** Integer minor units for points; future tokens may use scaled integers. */
  amount: number;
  updatedAt: string | null;
};

export type WalletBalanceState = {
  status: WalletBalanceStatus;
  balance: WalletBalance | null;
  errorMessage: string | null;
};

/** Future conversion API — intentionally unimplemented. */
export type ConversionQuoteRequest = {
  fromAssetId: AssetId;
  toAssetId: AssetId;
  amount: number;
};

export type ConversionQuote = {
  available: boolean;
  rate: number | null;
  estimatedOut: number | null;
  message: string;
};
