import { describe, expect, it } from "vitest";
import {
  DEMO_CONVERT_POINTS,
  DEMO_USER_A_ID,
} from "./constants";
import { createDigitalAssetLab } from "./lab";

describe("RECONCILIATION_TESTS", () => {
  it("passes after a successful synthetic conversion", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    expect(
      lab.convert({
        actorId: DEMO_USER_A_ID,
        userId: DEMO_USER_A_ID,
        requestId: "rec-ok",
        pointsAmount: DEMO_CONVERT_POINTS,
      }).code
    ).toBe("SUCCESS");
    const result = lab.reconcile();
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("passes after chain failure refund", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    lab.chain.setFailureMode("always");
    expect(
      lab.convert({
        actorId: DEMO_USER_A_ID,
        userId: DEMO_USER_A_ID,
        requestId: "rec-fail",
        pointsAmount: DEMO_CONVERT_POINTS,
      }).code
    ).toBe("CHAIN_FAILURE");
    expect(lab.reconcile().ok).toBe(true);
  });

  it("detects a forged extra token without burned points", () => {
    const lab = createDigitalAssetLab();
    lab.token.mint(
      "sandbox-minter",
      lab.wallet.addressFor(DEMO_USER_A_ID),
      BigInt(1)
    );
    const result = lab.reconcile();
    expect(result.ok).toBe(false);
    expect(result.issues.join(" ")).toMatch(/token\/points split/);
  });
});
