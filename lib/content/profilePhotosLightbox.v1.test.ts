import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  nextIndex,
  prevIndex,
} from "../../app/profile/lib/profilePhotosLightbox";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Photos Lightbox V1 — index helpers", () => {
  it("wraps next/prev for multi-item lists", () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(prevIndex(0, 3)).toBe(2);
    expect(prevIndex(2, 3)).toBe(1);
  });

  it("keeps a single-item list on the same index when wrapping", () => {
    expect(nextIndex(0, 1)).toBe(0);
    expect(prevIndex(0, 1)).toBe(0);
  });

  it("fail-closes empty lists and invalid current indexes", () => {
    expect(nextIndex(0, 0)).toBe(-1);
    expect(prevIndex(0, 0)).toBe(-1);
    expect(nextIndex(-1, 3)).toBe(-1);
    expect(prevIndex(3, 3)).toBe(-1);
    expect(nextIndex(1.5, 3)).toBe(-1);
    expect(prevIndex(0, -1)).toBe(-1);
  });
});

describe("Photos Lightbox V1 — wiring & a11y contract", () => {
  it("ships lightbox + panel wiring with required close/nav surfaces", () => {
    const helpers = read("app/profile/lib/profilePhotosLightbox.ts");
    const lightbox = read("app/profile/components/ProfilePhotosLightbox.tsx");
    const panel = read("app/profile/components/ProfilePhotosPanel.tsx");

    expect(helpers).toMatch(/export function nextIndex/);
    expect(helpers).toMatch(/export function prevIndex/);
    expect(lightbox).toMatch(/useDialogA11y/);
    expect(lightbox).toMatch(/role="dialog"/);
    expect(lightbox).toMatch(/aria-modal="true"/);
    expect(lightbox).toMatch(/ArrowLeft|ArrowRight/);
    expect(lightbox).toMatch(/t\("profile.lightboxClose"\)/);
    expect(lightbox).toMatch(/t\("profile.lightboxPrev"\)/);
    expect(lightbox).toMatch(/t\("profile.lightboxNext"\)/);
    expect(lightbox).toMatch(/document\.body\.style\.overflow/);
    expect(lightbox).toMatch(/t\("profile.lightboxPlaceholder"\)/);
    expect(lightbox).toMatch(/min-h-\[44px\]/);
    expect(lightbox).toMatch(/motion-reduce/);
    expect(lightbox).toMatch(/createPortal/);
    expect(panel).toMatch(/ProfilePhotosLightbox/);
    expect(panel).toMatch(/setOpenIndex/);
    expect(panel).toMatch(/t\("profile.openPhoto"/);
    expect(panel).toMatch(/"use client"/);
    expect(
      existsSync(join(ROOT, "app/profile/components/ProfilePhotosLightbox.tsx"))
    ).toBe(true);
  });

  it("does not add backend, migration, upload, or owner management", () => {
    const lightbox = read("app/profile/components/ProfilePhotosLightbox.tsx");
    const panel = read("app/profile/components/ProfilePhotosPanel.tsx");
    const helpers = read("app/profile/lib/profilePhotosLightbox.ts");
    const combined = `${lightbox}\n${panel}\n${helpers}`;

    expect(combined).not.toMatch(/supabase\/migrations|\.insert\(|upload|owner manage|checkout/i);
    expect(combined).not.toMatch(/DiscoverExperience|HomeFeed|shouldMountHomeCircularArc/);
    expect(combined).not.toMatch(/ProfileShell|ProfileTabs|ProfileHeader/);
  });

  it("keeps Creator Space shell/tabs/header files free of lightbox wiring", () => {
    const shell = read("app/profile/components/ProfileShell.tsx");
    const tabs = read("app/profile/components/ProfileTabs.tsx");
    const header = read("app/profile/components/ProfileHeader.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");

    expect(shell).not.toMatch(/ProfilePhotosLightbox|openIndex/);
    expect(tabs).not.toMatch(/ProfilePhotosLightbox|openIndex/);
    expect(header).not.toMatch(/ProfilePhotosLightbox|openIndex/);
    expect(experience).not.toMatch(/ProfilePhotosLightbox/);
    expect(experience).toMatch(/ProfilePhotosPanel/);
  });
});
