import { describe, expect, it } from "vitest";
import { SANDBOX_ADMIN_ID, SANDBOX_MINTER_ID } from "./constants";
import { createDigitalAssetLab } from "./lab";

describe("local ERC-20 reference token", () => {
  it("implements EIP-20 transfer / approve / transferFrom", () => {
    const lab = createDigitalAssetLab();
    const a = lab.wallet.addressFor("demo-user-a");
    const b = lab.wallet.addressFor("demo-user-b");
    expect(lab.token.mint(SANDBOX_MINTER_ID, a, BigInt(100))).toBe(true);
    expect(lab.token.transfer(a, b, BigInt(40))).toBe(true);
    expect(lab.token.balanceOf(a)).toBe(BigInt(60));
    expect(lab.token.balanceOf(b)).toBe(BigInt(40));
    expect(lab.token.approve(a, b, BigInt(10))).toBe(true);
    expect(lab.token.transferFrom(b, a, b, BigInt(10))).toBe(true);
    expect(lab.token.balanceOf(a)).toBe(BigInt(50));
    expect(lab.token.allowance(a, b)).toBe(BigInt(0));
    expect(lab.token.totalSupply()).toBe(BigInt(100));
  });

  it("pauses transfers and mint", () => {
    const lab = createDigitalAssetLab();
    const a = lab.wallet.addressFor("demo-user-a");
    expect(lab.token.pause(SANDBOX_ADMIN_ID)).toBe(true);
    expect(lab.token.mint(SANDBOX_MINTER_ID, a, BigInt(1))).toBe(false);
    expect(lab.token.unpause(SANDBOX_ADMIN_ID)).toBe(true);
    expect(lab.token.mint(SANDBOX_MINTER_ID, a, BigInt(1))).toBe(true);
  });

  it("uses TEST_PLACEHOLDER name and symbol", () => {
    const lab = createDigitalAssetLab();
    expect(lab.token.name).toBe("TEST_PLACEHOLDER");
    expect(lab.token.symbol).toBe("TEST_PLACEHOLDER");
  });
});
