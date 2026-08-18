import { afterEach, describe, expect, it } from "vitest";
import {
  canAccessStoreDemoPreview,
  configuredDemoPreviewToken,
  DEMO_PREVIEW_PATH,
  demoPreviewCookieMatches,
  demoPreviewSessionCookieValue,
  demoPreviewTokenMatches,
  demoPreviewTokenQuery,
  evaluateStoreDemoPreviewAccess,
  safeDemoPreviewNext,
} from "./demoPreviewGate";

const originalToken = process.env.STORE_DEMO_PREVIEW_TOKEN;
const originalPreview = process.env.STORE_DEMO_PREVIEW;

afterEach(() => {
  if (originalToken === undefined) delete process.env.STORE_DEMO_PREVIEW_TOKEN;
  else process.env.STORE_DEMO_PREVIEW_TOKEN = originalToken;
  if (originalPreview === undefined) delete process.env.STORE_DEMO_PREVIEW;
  else process.env.STORE_DEMO_PREVIEW = originalPreview;
});

describe("store demo preview gate", () => {
  it("denies anonymous visitors even when they know the path or the legacy flag is on", () => {
    delete process.env.STORE_DEMO_PREVIEW_TOKEN;
    process.env.STORE_DEMO_PREVIEW = "1";
    expect(canAccessStoreDemoPreview({})).toBe(false);
    expect(canAccessStoreDemoPreview({ token: "anyone", cookieToken: "x" })).toBe(
      false
    );
    expect(evaluateStoreDemoPreviewAccess({}).reason).toBe("unauthorized");
  });

  it("allows a signed-in platform admin without STORE_DEMO_PREVIEW=1", () => {
    delete process.env.STORE_DEMO_PREVIEW;
    delete process.env.STORE_DEMO_PREVIEW_TOKEN;
    expect(
      evaluateStoreDemoPreviewAccess({ isPlatformAdmin: true })
    ).toEqual({ ok: true, reason: "admin", viaCookie: false });
    expect(canAccessStoreDemoPreview({ isPlatformAdmin: false })).toBe(false);
  });

  it("allows a matching long secret token and rejects wrong or short secrets", () => {
    process.env.STORE_DEMO_PREVIEW_TOKEN = "qa-private-preview-token";
    expect(configuredDemoPreviewToken()).toBe("qa-private-preview-token");
    expect(demoPreviewTokenMatches("qa-private-preview-token")).toBe(true);
    expect(demoPreviewTokenMatches("wrong-token-value-xx")).toBe(false);
    expect(canAccessStoreDemoPreview({ token: "qa-private-preview-token" })).toBe(
      true
    );
    expect(evaluateStoreDemoPreviewAccess({ token: "qa-private-preview-token" })).toEqual(
      { ok: true, reason: "token", viaCookie: false }
    );

    process.env.STORE_DEMO_PREVIEW_TOKEN = "short";
    expect(configuredDemoPreviewToken()).toBeNull();
    expect(demoPreviewTokenMatches("short")).toBe(false);
  });

  it("accepts the derived httpOnly session cookie without keeping the secret in the URL", () => {
    process.env.STORE_DEMO_PREVIEW_TOKEN = "qa-private-preview-token";
    const cookie = demoPreviewSessionCookieValue();
    expect(cookie).toMatch(/^[a-f0-9]{64}$/);
    expect(demoPreviewCookieMatches(cookie)).toBe(true);
    expect(demoPreviewCookieMatches("deadbeef")).toBe(false);
    expect(
      evaluateStoreDemoPreviewAccess({ cookieToken: cookie })
    ).toEqual({ ok: true, reason: "token", viaCookie: true });
    expect(
      demoPreviewTokenQuery(
        { ok: true, reason: "token", viaCookie: true },
        "qa-private-preview-token"
      )
    ).toBe("");
    expect(
      demoPreviewTokenQuery(
        { ok: true, reason: "token", viaCookie: false },
        "qa-private-preview-token"
      )
    ).toBe("demo_token=qa-private-preview-token");
  });

  it("keeps next= inside the private preview path and strips demo_token", () => {
    expect(safeDemoPreviewNext("/store/demo-preview?q=tote&demo_token=leak")).toBe(
      `${DEMO_PREVIEW_PATH}?q=tote`
    );
    expect(safeDemoPreviewNext("/store/demo-preview/umtuba-demo-canvas-tote")).toBe(
      "/store/demo-preview/umtuba-demo-canvas-tote"
    );
    expect(safeDemoPreviewNext("/store")).toBe(DEMO_PREVIEW_PATH);
    expect(safeDemoPreviewNext("https://evil.example/store/demo-preview")).toBe(
      DEMO_PREVIEW_PATH
    );
    expect(safeDemoPreviewNext("/store/demo-preview/enter")).toBe(DEMO_PREVIEW_PATH);
  });
});
