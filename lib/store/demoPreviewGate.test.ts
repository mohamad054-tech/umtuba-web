import { afterEach, describe, expect, it } from "vitest";
import {
  canAccessStoreDemoPreview,
  evaluateStoreDemoPreviewAccess,
} from "./demoPreviewGate";

const originalPreview = process.env.STORE_DEMO_PREVIEW;
const originalToken = process.env.STORE_DEMO_PREVIEW_TOKEN;

afterEach(() => {
  process.env.STORE_DEMO_PREVIEW = originalPreview;
  process.env.STORE_DEMO_PREVIEW_TOKEN = originalToken;
});

describe("store demo preview gate", () => {
  it("stays off by default so ordinary production users never see demo inventory", () => {
    delete process.env.STORE_DEMO_PREVIEW;
    expect(
      canAccessStoreDemoPreview({
        isPlatformAdmin: true,
        token: "x",
        nodeEnv: "production",
      })
    ).toBe(false);
    expect(evaluateStoreDemoPreviewAccess({ nodeEnv: "production" }).reason).toBe(
      "disabled"
    );
  });

  it("allows platform admin only when the env flag is on", () => {
    process.env.STORE_DEMO_PREVIEW = "1";
    expect(
      canAccessStoreDemoPreview({ isPlatformAdmin: true, nodeEnv: "production" })
    ).toBe(true);
    expect(
      canAccessStoreDemoPreview({ isPlatformAdmin: false, nodeEnv: "production" })
    ).toBe(false);
  });

  it("allows a matching token when the env flag is on", () => {
    process.env.STORE_DEMO_PREVIEW = "1";
    process.env.STORE_DEMO_PREVIEW_TOKEN = "qa-secret";
    expect(
      canAccessStoreDemoPreview({ token: "qa-secret", nodeEnv: "production" })
    ).toBe(true);
    expect(
      canAccessStoreDemoPreview({ token: "wrong", nodeEnv: "production" })
    ).toBe(false);
  });

  it("allows local non-production when the env flag is on without a token", () => {
    process.env.STORE_DEMO_PREVIEW = "1";
    delete process.env.STORE_DEMO_PREVIEW_TOKEN;
    expect(canAccessStoreDemoPreview({ nodeEnv: "test" })).toBe(true);
  });
});
