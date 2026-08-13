import { describe, expect, it } from "vitest";
import { getSafeRedirectPath } from "./redirect";

describe("getSafeRedirectPath", () => {
  it("defaults to /profile (UAF-08) when next is missing", () => {
    expect(getSafeRedirectPath(null)).toBe("/profile");
    expect(getSafeRedirectPath(undefined)).toBe("/profile");
    expect(getSafeRedirectPath("")).toBe("/profile");
    expect(getSafeRedirectPath("   ")).toBe("/profile");
  });

  it("preserves explicit safe relative paths and deep links", () => {
    expect(getSafeRedirectPath("/discover")).toBe("/discover");
    expect(getSafeRedirectPath("/discover?post=42")).toBe("/discover?post=42");
    expect(getSafeRedirectPath("/messages?conversation=1")).toBe(
      "/messages?conversation=1"
    );
    expect(getSafeRedirectPath("/live/abc-123")).toBe("/live/abc-123");
    expect(getSafeRedirectPath("/profile")).toBe("/profile");
  });

  it("rejects open redirects and falls back", () => {
    expect(getSafeRedirectPath("//evil.example", "/profile")).toBe("/profile");
    expect(getSafeRedirectPath("https://evil.example", "/profile")).toBe(
      "/profile"
    );
    expect(getSafeRedirectPath("/\\evil", "/profile")).toBe("/profile");
    expect(getSafeRedirectPath("/%2f%2fevil.example", "/profile")).toBe(
      "/profile"
    );
    expect(getSafeRedirectPath("/@evil", "/profile")).toBe("/profile");
    expect(getSafeRedirectPath(null, "/login")).toBe("/login");
  });

  it("allows @ in query/hash but not in path", () => {
    expect(
      getSafeRedirectPath(
        "/messages?creatorName=@handle",
        "/profile"
      )
    ).toBe("/messages?creatorName=@handle");
    expect(
      getSafeRedirectPath("/messages?creatorName=@handle", "/discover")
    ).toBe("/messages?creatorName=@handle");
  });
});
