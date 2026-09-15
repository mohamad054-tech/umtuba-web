import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clientIpFromHeaders,
  consumeActionRateLimit,
  resetActionRateLimitsForTests,
  resolveActionRateLimitActor,
} from "./actionRateLimit";

afterEach(() => {
  resetActionRateLimitsForTests();
});

describe("actionRateLimit", () => {
  it("allows up to the limit then denies inside the window", () => {
    const now = 1_000_000;
    expect(consumeActionRateLimit("view:u:1", 2, 60_000, now).ok).toBe(true);
    expect(consumeActionRateLimit("view:u:1", 2, 60_000, now + 10).ok).toBe(
      true
    );
    const denied = consumeActionRateLimit("view:u:1", 2, 60_000, now + 20);
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("resets after the window", () => {
    const now = 2_000_000;
    expect(consumeActionRateLimit("share:ip:1", 1, 1_000, now).ok).toBe(true);
    expect(consumeActionRateLimit("share:ip:1", 1, 1_000, now + 10).ok).toBe(
      false
    );
    expect(consumeActionRateLimit("share:ip:1", 1, 1_000, now + 1_001).ok).toBe(
      true
    );
  });

  it("prefers user id over IP", () => {
    expect(resolveActionRateLimitActor("abc", "9.9.9.9")).toBe("u:abc");
    expect(resolveActionRateLimitActor(null, "9.9.9.9")).toBe("ip:9.9.9.9");
    expect(resolveActionRateLimitActor(null, null)).toBe("ip:unknown");
  });

  it("uses only validated X-Real-IP and ignores spoofed hop headers", () => {
    expect(
      clientIpFromHeaders({
        get(name) {
          if (name === "x-real-ip") return "203.0.113.10";
          if (name === "cf-connecting-ip") return "1.1.1.1";
          if (name === "x-forwarded-for") return "8.8.8.8, 9.9.9.9";
          return null;
        },
      })
    ).toBe("203.0.113.10");
    expect(
      clientIpFromHeaders({
        get(name) {
          if (name === "x-real-ip") return "2001:db8::1";
          if (name === "cf-connecting-ip") return "1.1.1.1";
          return null;
        },
      })
    ).toBe("2001:db8::1");
    expect(
      clientIpFromHeaders({
        get(name) {
          if (name === "cf-connecting-ip") return "1.1.1.1";
          if (name === "x-forwarded-for") return "8.8.8.8";
          return null;
        },
      })
    ).toBeNull();
    expect(
      clientIpFromHeaders({
        get(name) {
          return name === "x-real-ip" ? "not-an-ip" : null;
        },
      })
    ).toBeNull();
  });

  it("referral attribution hashes IP from the shared X-Real-IP helper", () => {
    const action = readFileSync(
      join(process.cwd(), "app/actions/referral.ts"),
      "utf8"
    );
    expect(action).toMatch(/clientIpFromHeaders/);
    expect(action).not.toMatch(/x-forwarded-for/);
    expect(action).not.toMatch(/x-real-ip/);
  });
});
