import { describe, expect, it } from "vitest";
import {
  DEMO_CONVERT_POINTS,
  DEMO_USER_A_ID,
  DEMO_USER_A_POINTS,
} from "./constants";
import { createDigitalAssetLab } from "./lab";

describe("IDEMPOTENCY_TESTS", () => {
  it("returns DUPLICATE for a completed requestId without minting twice", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    const first = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "idem-1",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    const second = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "idem-1",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(first.code).toBe("SUCCESS");
    expect(second.code).toBe("DUPLICATE");
    expect(lab.points.getBalance(DEMO_USER_A_ID).converted).toBe(
      DEMO_CONVERT_POINTS
    );
    expect(lab.points.getBalance(DEMO_USER_A_ID).available).toBe(
      DEMO_USER_A_POINTS - DEMO_CONVERT_POINTS
    );
    expect(lab.token.totalSupply() > BigInt(0)).toBe(true);
    expect(lab.reconcile().ok).toBe(true);
  });

  it("returns RETRY while a request is in flight", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    lab.conversion.putInFlightForTest({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "idem-retry",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    const replay = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "idem-retry",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(replay.code).toBe("RETRY");
    expect(lab.points.getBalance(DEMO_USER_A_ID).available).toBe(
      DEMO_USER_A_POINTS
    );
  });

  it("retries a CHAIN_FAILURE with the same requestId exactly once on success", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    lab.chain.setFailureMode("next_mint");
    const failed = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "idem-fail",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(failed.code).toBe("CHAIN_FAILURE");
    expect(lab.points.getBalance(DEMO_USER_A_ID).available).toBe(
      DEMO_USER_A_POINTS
    );
    expect(lab.points.getBalance(DEMO_USER_A_ID).locked).toBe(0);
    const retried = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "idem-fail",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(retried.code).toBe("SUCCESS");
    expect(lab.points.getBalance(DEMO_USER_A_ID).converted).toBe(
      DEMO_CONVERT_POINTS
    );
    expect(lab.reconcile().ok).toBe(true);
  });
});
