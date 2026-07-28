import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./redirect";

describe("getSafeRedirectPath", () => {
  it("defaults to /discover (Home alias) when next is missing", () => {
    // Clarity V1: keep Discover as default — equals Home after forever redirect.
    expect(getSafeRedirectPath(null)).toBe("/discover");
    expect(getSafeRedirectPath(undefined)).toBe("/discover");
    expect(getSafeRedirectPath("")).toBe("/discover");
    expect(getSafeRedirectPath("   ")).toBe("/discover");
  });

  it("allows same-origin relative paths and preserves query", () => {
    expect(getSafeRedirectPath("/discover")).toBe("/discover");
    expect(getSafeRedirectPath("/messages?conversation=1")).toBe(
      "/messages?conversation=1"
    );
    expect(getSafeRedirectPath("/live/abc-123")).toBe("/live/abc-123");
  });

  it("rejects open-redirect patterns", () => {
    expect(getSafeRedirectPath("//evil.example", "/discover")).toBe("/discover");
    expect(getSafeRedirectPath("https://evil.example", "/discover")).toBe(
      "/discover"
    );
    expect(getSafeRedirectPath("/\\evil", "/discover")).toBe("/discover");
    expect(getSafeRedirectPath("/%2f%2fevil.example", "/discover")).toBe(
      "/discover"
    );
    expect(getSafeRedirectPath("/@evil", "/discover")).toBe("/discover");
    expect(getSafeRedirectPath(null, "/login")).toBe("/login");
  });

  it("allows @ inside query values used by DM deep links", () => {
    expect(
      getSafeRedirectPath(
        "/messages?creatorId=abc&creatorName=%40handle",
        "/discover"
      )
    ).toBe("/messages?creatorId=abc&creatorName=@handle");
    expect(
      getSafeRedirectPath("/messages?creatorName=@handle", "/discover")
    ).toBe("/messages?creatorName=@handle");
  });
});
