import { describe, expect, it } from "vitest";
import {
  DEMO_CONVERT_POINTS,
  DEMO_USER_A_ID,
  DEMO_USER_A_POINTS,
  LEGAL_CLASSIFICATION,
} from "./constants";
import { LAB_BANNER } from "./copy";
import { createDigitalAssetLab } from "./lab";
import { adminSandboxView, productUserPreview, userSandboxView } from "./views";

describe("E2E synthetic conversion lab", () => {
  it("seeds Demo User A with 1000 TEST UM POINTS", () => {
    const lab = createDigitalAssetLab();
    expect(lab.points.getBalance(DEMO_USER_A_ID).available).toBe(
      DEMO_USER_A_POINTS
    );
    expect(lab.wallet.view(DEMO_USER_A_ID).banner).toMatch(LAB_BANNER);
  });

  it("converts 100 only when isolated tests enable the flag", () => {
    const lab = createDigitalAssetLab();
    expect(lab.productFirewall().CONVERSION_ENABLED).toBe(false);
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    const result = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "e2e-100",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(result.code).toBe("SUCCESS");
    expect(lab.points.getBalance(DEMO_USER_A_ID).available).toBe(900);
    expect(lab.points.getBalance(DEMO_USER_A_ID).converted).toBe(100);
    expect(lab.wallet.view(DEMO_USER_A_ID).tokenBalanceDisplay).not.toBe("0");
    expect(lab.reconcile().ok).toBe(true);
    lab.conversion.setConversionEnabledForIsolatedTest(false);
    expect(lab.conversion.isConversionEnabled()).toBe(false);
  });

  it("exposes admin, user, history, and treasury sandbox views", () => {
    const lab = createDigitalAssetLab();
    const admin = adminSandboxView(lab);
    const user = userSandboxView(lab, DEMO_USER_A_ID);
    const product = productUserPreview(lab, DEMO_USER_A_ID);
    expect(admin.banner).toBe(LAB_BANNER);
    expect(admin.firewall.MAINNET_DEPLOYED).toBe(false);
    expect(admin.treasury.supplyPolicy).toBe("UNDECIDED");
    expect(user.history.length).toBeGreaterThan(0);
    expect(product.convertActionable).toBe(false);
    expect(product.legalClassification).toBe(LEGAL_CLASSIFICATION);
    expect(lab.localDeployReceipt().mainnet).toBe(false);
  });
});
