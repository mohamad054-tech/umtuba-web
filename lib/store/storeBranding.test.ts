import { describe, expect, it } from "vitest";
import { isSafeStoreBrandingUrl } from "./storeBranding";

describe("isSafeStoreBrandingUrl", () => {
  it("accepts http(s) URLs", () => {
    expect(isSafeStoreBrandingUrl("https://cdn.example.com/logo.png")).toBe(
      true
    );
    expect(isSafeStoreBrandingUrl("http://cdn.example.com/cover.jpg")).toBe(
      true
    );
  });

  it("rejects storage keys, scripts, and empty values", () => {
    expect(isSafeStoreBrandingUrl("stores/abc/logo.png")).toBe(false);
    expect(isSafeStoreBrandingUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeStoreBrandingUrl("")).toBe(false);
    expect(isSafeStoreBrandingUrl(null)).toBe(false);
  });
});
