import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveCjLaunchPreviewLocale } from "./resolvePreviewLocale";

const listing = readFileSync(
  join(process.cwd(), "app/sandbox/store/cj-launch/page.tsx"),
  "utf8"
);
const pdp = readFileSync(
  join(process.cwd(), "app/sandbox/store/cj-launch/[slug]/page.tsx"),
  "utf8"
);

describe("resolveCjLaunchPreviewLocale", () => {
  it("uses Arabic request locale without requiring ?dir=rtl", () => {
    expect(
      resolveCjLaunchPreviewLocale({ requestLocale: "ar", dirParam: undefined })
    ).toEqual({ locale: "ar", direction: "rtl", rtlOverride: false });
  });

  it("uses English request locale for cleaned English copy and LTR", () => {
    expect(
      resolveCjLaunchPreviewLocale({ requestLocale: "en", dirParam: null })
    ).toEqual({ locale: "en", direction: "ltr", rtlOverride: false });
  });

  it("keeps ?dir=rtl as an explicit Arabic/RTL override", () => {
    expect(
      resolveCjLaunchPreviewLocale({ requestLocale: "en", dirParam: "rtl" })
    ).toEqual({ locale: "ar", direction: "rtl", rtlOverride: true });
  });

  it("does not treat other dir values as an override", () => {
    expect(
      resolveCjLaunchPreviewLocale({ requestLocale: "en", dirParam: "ltr" })
    ).toEqual({ locale: "en", direction: "ltr", rtlOverride: false });
  });

  it("maps non-Arabic request locales to English store copy", () => {
    expect(
      resolveCjLaunchPreviewLocale({ requestLocale: "fr", dirParam: undefined })
    ).toEqual({ locale: "en", direction: "ltr", rtlOverride: false });
  });

  it("binds listing and PDP to request locale with dir=rtl override only", () => {
    for (const src of [listing, pdp]) {
      expect(src).toMatch(/resolveRequestLocale/);
      expect(src).toMatch(/resolveCjLaunchPreviewLocale/);
      expect(src).not.toMatch(/locale:\s*AppLocale\s*=\s*rtl\s*\?\s*"ar"\s*:\s*"en"/);
    }
  });

  it("passes preview locale into StoreShell so chrome follows ar and ?dir=rtl", () => {
    expect(listing).toMatch(/locale=\{locale\}/);
    expect(pdp).toMatch(/locale=\{locale\}/);
    expect(listing).toMatch(/store\.preview\.heading/);
    expect(pdp).toMatch(/store\.preview\.backToStore/);
  });
});

