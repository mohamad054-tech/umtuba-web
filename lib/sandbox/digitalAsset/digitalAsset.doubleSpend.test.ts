import { describe, expect, it } from "vitest";
import {
  DEMO_CONVERT_POINTS,
  DEMO_USER_A_ID,
  DEMO_USER_A_POINTS,
} from "./constants";
import { createDigitalAssetLab } from "./lab";

describe("DOUBLE_SPEND_TESTS", () => {
  it("never leaves the same unit spendable as points and as a transferred token", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    const result = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "ds-1",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(result.code).toBe("SUCCESS");
    const balance = lab.points.getBalance(DEMO_USER_A_ID);
    expect(balance.available).toBe(DEMO_USER_A_POINTS - DEMO_CONVERT_POINTS);
    expect(balance.converted).toBe(DEMO_CONVERT_POINTS);
    expect(balance.locked).toBe(0);
    expect(lab.token.balanceOf(lab.wallet.addressFor(DEMO_USER_A_ID)) > BigInt(0)).toBe(
      true
    );
    expect(
      lab.spendAvailable(DEMO_USER_A_ID, DEMO_USER_A_POINTS, "spend-all")
    ).toBe(false);
    expect(
      lab.spendAvailable(
        DEMO_USER_A_ID,
        DEMO_USER_A_POINTS - DEMO_CONVERT_POINTS,
        "spend-remaining"
      )
    ).toBe(true);
    expect(lab.reconcile().ok).toBe(true);
  });

  it("rejects a second overlapping convert of already locked points", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    const first = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "ds-lock-1",
      pointsAmount: DEMO_USER_A_POINTS,
    });
    expect(first.code).toBe("SUCCESS");
    const second = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "ds-lock-2",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(second.code).toBe("INSUFFICIENT");
    expect(lab.points.getBalance(DEMO_USER_A_ID).available).toBe(0);
  });

  it("blocks concurrent conversion attempts for the same user", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    let concurrentCode = "";
    lab.conversion.runExclusiveForTest(DEMO_USER_A_ID, () => {
      concurrentCode = lab.convert({
        actorId: DEMO_USER_A_ID,
        userId: DEMO_USER_A_ID,
        requestId: "ds-concurrent",
        pointsAmount: DEMO_CONVERT_POINTS,
      }).code;
    });
    expect(concurrentCode).toBe("CONCURRENT");
    expect(lab.points.getBalance(DEMO_USER_A_ID).available).toBe(
      DEMO_USER_A_POINTS
    );
  });
});
