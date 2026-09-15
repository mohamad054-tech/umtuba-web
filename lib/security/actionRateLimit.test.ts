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

  it("prefers user id over IP and reads the first forwarded hop", () => {
    expect(resolveActionRateLimitActor("abc", "9.9.9.9")).toBe("u:abc");
    expect(resolveActionRateLimitActor(null, "9.9.9.9")).toBe("ip:9.9.9.9");
    expect(
      clientIpFromHeaders({
        get(name) {
          return name === "x-forwarded-for" ? "1.1.1.1, 2.2.2.2" : null;
        },
      })
    ).toBe("1.1.1.1");
  });
});
