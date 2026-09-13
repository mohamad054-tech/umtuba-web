import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONVERSION_ENABLED,
  DEPOSITS_ENABLED,
  MAINNET_DEPLOYED,
  PRODUCTION_CONNECTED,
  PRODUCTION_ENABLED,
  TOKEN_NAME,
  TOKEN_PRICE,
  TOKEN_SUPPLY,
  TOKEN_SYMBOL,
  TRADING_ENABLED,
  WITHDRAWALS_ENABLED,
} from "./constants";
import { createDigitalAssetLab } from "./lab";
import { productUserPreview } from "./views";

const ROOT = join(__dirname);

function listTs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      listTs(abs, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      acc.push(abs);
    }
  }
  return acc;
}

describe("digital-asset lab firewall", () => {
  it("keeps production-hard defaults off", () => {
    expect(PRODUCTION_ENABLED).toBe(false);
    expect(CONVERSION_ENABLED).toBe(false);
    expect(DEPOSITS_ENABLED).toBe(false);
    expect(WITHDRAWALS_ENABLED).toBe(false);
    expect(TRADING_ENABLED).toBe(false);
    expect(MAINNET_DEPLOYED).toBe(false);
    expect(PRODUCTION_CONNECTED).toBe(false);
    expect(TOKEN_NAME).toBe("TEST_PLACEHOLDER");
    expect(TOKEN_SYMBOL).toBe("TEST_PLACEHOLDER");
    expect(TOKEN_SUPPLY).toBe("UNDECIDED");
    expect(TOKEN_PRICE).toBe("UNDECIDED");
  });

  it("does not import production rewards or um_points writers", () => {
    for (const file of listTs(ROOT)) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/award_um_points/);
      expect(src, file).not.toMatch(/from ["'].*lib\/rewards/);
      expect(src, file).not.toMatch(/from ["'].*lib\/supabase\/rewards/);
      expect(src, file).not.toMatch(/from\(["']um_points_ledger["']\)/);
      expect(src, file).not.toMatch(/from\(["']um_point_balances["']\)/);
    }
  });

  it("product user preview never exposes an actionable convert", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    const preview = productUserPreview(lab, "demo-user-a");
    expect(preview.convertActionable).toBe(false);
    expect(preview.convertLabel).toMatch(/not available|disabled/i);
    expect(preview.notice).toMatch(/TEST \/ SANDBOX \/ NO REAL VALUE/);
    expect(lab.productFirewall().CONVERSION_ENABLED).toBe(false);
  });
});
