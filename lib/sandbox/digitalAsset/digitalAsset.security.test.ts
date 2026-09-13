import { describe, expect, it } from "vitest";
import {
  DEMO_CONVERT_POINTS,
  DEMO_USER_A_ID,
  DEMO_USER_A_POINTS,
  ROLE_MINTER,
  SANDBOX_ADMIN_ID,
  SANDBOX_MINTER_ID,
} from "./constants";
import { syntheticCompliance } from "./compliance";
import { createDigitalAssetLab } from "./lab";

describe("SECURITY_TESTS", () => {
  it("keeps conversion DISABLED by default", () => {
    const lab = createDigitalAssetLab();
    const result = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "sec-disabled",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(result.code).toBe("DISABLED");
    expect(lab.points.getBalance(DEMO_USER_A_ID).available).toBe(
      DEMO_USER_A_POINTS
    );
    expect(lab.token.totalSupply()).toBe(BigInt(0));
  });

  it("rejects UNAUTHORIZED_MINT from a user role", () => {
    const lab = createDigitalAssetLab();
    const to = lab.wallet.addressFor(DEMO_USER_A_ID);
    expect(lab.token.mint(DEMO_USER_A_ID, to, BigInt(1))).toBe(false);
    expect(lab.token.totalSupply()).toBe(BigInt(0));
    expect(lab.audit.filterByAction("token.mint.denied").length).toBeGreaterThan(
      0
    );
  });

  it("refunds when the minter role is revoked mid-conversion", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    expect(lab.access.revoke(SANDBOX_ADMIN_ID, SANDBOX_MINTER_ID, ROLE_MINTER)).toBe(
      true
    );
    const result = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "sec-unauth",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(result.code).toBe("UNAUTHORIZED_MINT");
    expect(lab.points.getBalance(DEMO_USER_A_ID).available).toBe(
      DEMO_USER_A_POINTS
    );
    expect(lab.token.totalSupply()).toBe(BigInt(0));
  });

  it("rejects PAUSED conversion", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    expect(lab.token.pause(SANDBOX_ADMIN_ID)).toBe(true);
    const result = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "sec-paused",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(result.code).toBe("PAUSED");
  });

  it("rejects a non-admin pause", () => {
    const lab = createDigitalAssetLab();
    expect(lab.token.pause(DEMO_USER_A_ID)).toBe(false);
    expect(lab.token.isPaused()).toBe(false);
  });

  it("holds conversion on synthetic compliance without collecting real KYC", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    lab.conversion.setComplianceProfile(
      syntheticCompliance(DEMO_USER_A_ID, { kyc: "SYNTHETIC_HOLD" })
    );
    const result = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "sec-kyc",
      pointsAmount: DEMO_CONVERT_POINTS,
    });
    expect(result.code).toBe("COMPLIANCE_HOLD");
    expect(result.message).toMatch(/No real KYC/);
  });

  it("rejects INSUFFICIENT amounts", () => {
    const lab = createDigitalAssetLab();
    lab.conversion.setConversionEnabledForIsolatedTest(true);
    const result = lab.convert({
      actorId: DEMO_USER_A_ID,
      userId: DEMO_USER_A_ID,
      requestId: "sec-low",
      pointsAmount: DEMO_USER_A_POINTS + 1,
    });
    expect(result.code).toBe("INSUFFICIENT");
  });
});
