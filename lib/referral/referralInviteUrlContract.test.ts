import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildInviteAbsoluteUrl, buildInvitePath } from "./config";

describe("referral invite absolute URL siteUrl contract", () => {
  it("prefers explicit origin over site URL fallback", () => {
    expect(buildInviteAbsoluteUrl("ABC123XY", "https://preview.example")).toBe(
      "https://preview.example/invite/ABC123XY"
    );
  });

  it("uses getSiteUrl (NEXT_PUBLIC_SITE_URL) when origin is absent", () => {
    const env = {
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://app.example.test",
    };
    expect(buildInviteAbsoluteUrl("ABC123XY", null, env)).toBe(
      "https://app.example.test/invite/ABC123XY"
    );
    expect(buildInvitePath("ABC123XY")).toBe("/invite/ABC123XY");
  });

  it("does not hardcode a distinct apex outside siteUrl resolution", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/referral/config.ts"),
      "utf8"
    );
    expect(src).toMatch(/getSiteUrl/);
    expect(src).not.toMatch(/return `https:\/\/umtuba\.com\$\{path\}`/);
  });
});
