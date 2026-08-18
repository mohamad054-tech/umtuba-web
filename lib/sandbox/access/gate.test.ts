import { afterEach, describe, expect, it } from "vitest";
import {
  canAccessBusinessSandbox,
  evaluateSandboxAccess,
  safeSandboxNext,
  sandboxCookieMatches,
  sandboxSessionCookieValue,
  sandboxTokenMatches,
} from "./gate";

const PREV_TOKEN = process.env.SANDBOX_BUSINESS_PREVIEW_TOKEN;
const PREV_DEMO = process.env.STORE_DEMO_PREVIEW;

afterEach(() => {
  if (PREV_TOKEN === undefined) delete process.env.SANDBOX_BUSINESS_PREVIEW_TOKEN;
  else process.env.SANDBOX_BUSINESS_PREVIEW_TOKEN = PREV_TOKEN;
  if (PREV_DEMO === undefined) delete process.env.STORE_DEMO_PREVIEW;
  else process.env.STORE_DEMO_PREVIEW = PREV_DEMO;
});

describe("business sandbox access gate", () => {
  it("denies anonymous access even when STORE_DEMO_PREVIEW=1", () => {
    process.env.STORE_DEMO_PREVIEW = "1";
    delete process.env.SANDBOX_BUSINESS_PREVIEW_TOKEN;
    expect(evaluateSandboxAccess({}).ok).toBe(false);
    expect(evaluateSandboxAccess({}).reason).toBe("unauthorized");
  });

  it("does not treat non-production NODE_ENV as a grant", () => {
    delete process.env.SANDBOX_BUSINESS_PREVIEW_TOKEN;
    expect(canAccessBusinessSandbox({ token: "short" })).toBe(false);
  });

  it("allows platform admin without a token", () => {
    expect(evaluateSandboxAccess({ isPlatformAdmin: true })).toEqual({
      ok: true,
      reason: "admin",
      viaCookie: false,
    });
  });

  it("allows a long configured token and hashed cookie", () => {
    process.env.SANDBOX_BUSINESS_PREVIEW_TOKEN = "sandbox-token-16chars";
    expect(sandboxTokenMatches("sandbox-token-16chars")).toBe(true);
    expect(sandboxTokenMatches("wrong-token-16chars!")).toBe(false);
    const cookie = sandboxSessionCookieValue();
    expect(cookie).toMatch(/^[a-f0-9]{64}$/);
    expect(sandboxCookieMatches(cookie)).toBe(true);
    expect(evaluateSandboxAccess({ token: "sandbox-token-16chars" }).reason).toBe(
      "token"
    );
  });

  it("rejects short tokens as unconfigured", () => {
    process.env.SANDBOX_BUSINESS_PREVIEW_TOKEN = "too-short";
    expect(sandboxTokenMatches("too-short")).toBe(false);
  });

  it("keeps next-path open-redirect safe", () => {
    expect(safeSandboxNext("https://evil.example/x")).toBe(
      "/sandbox/business-preview"
    );
    expect(safeSandboxNext("//evil.example")).toBe("/sandbox/business-preview");
    expect(safeSandboxNext("/store")).toBe("/sandbox/business-preview");
    expect(safeSandboxNext("/sandbox/business-preview/store/cart")).toBe(
      "/sandbox/business-preview/store/cart"
    );
    expect(
      safeSandboxNext("/sandbox/business-preview?sandbox_token=leak")
    ).toBe("/sandbox/business-preview");
  });
});
