import { describe, expect, it } from "vitest";
import {
  getPrimaryWalletAsset,
  quoteAssetConversion,
  WALLET_ASSETS,
} from "./assets";
import { formatWalletAmount, formatWalletAmountExact } from "./formatBalance";
import { mapUmPointsBalanceRow } from "./adapters/umPoints";

describe("wallet assets", () => {
  it("exposes UM Points as the primary header asset", () => {
    const primary = getPrimaryWalletAsset();
    expect(primary.id).toBe("um_points");
    expect(primary.symbol).toBe("UM");
    expect(primary.displayName).toBe("UM Points");
    expect(primary.href).toBe("/rewards");
    expect(primary.conversionReady).toBe(false);
  });

  it("keeps a future token slot without enabling conversion", () => {
    expect(WALLET_ASSETS.umtuba_token.kind).toBe("token");
    expect(WALLET_ASSETS.umtuba_token.conversionReady).toBe(false);
    expect(
      quoteAssetConversion({
        fromAssetId: "um_points",
        toAssetId: "umtuba_token",
        amount: 100,
      }).available
    ).toBe(false);
  });
});

describe("formatWalletAmount", () => {
  it("formats compact amounts for the mobile pill", () => {
    expect(formatWalletAmount(0)).toBe("0");
    expect(formatWalletAmount(999)).toBe("999");
    expect(formatWalletAmount(1200)).toBe("1.2K");
    expect(formatWalletAmount(15_000)).toBe("15K");
    expect(formatWalletAmount(2_500_000)).toBe("2.5M");
  });

  it("formats exact amounts for accessibility labels", () => {
    expect(formatWalletAmountExact(1250)).toBe("1,250");
  });
});

describe("um points adapter", () => {
  it("maps ledger balance rows into the generic wallet model", () => {
    expect(
      mapUmPointsBalanceRow({ balance: 42, updated_at: "2026-07-15T12:00:00Z" })
    ).toEqual({
      assetId: "um_points",
      amount: 42,
      updatedAt: "2026-07-15T12:00:00Z",
    });
  });

  it("defaults missing balance to zero", () => {
    expect(mapUmPointsBalanceRow({}).amount).toBe(0);
  });
});
