import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FLAG_KEYS = [
  "NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW",
  "NEXT_PUBLIC_VERCEL_ENV",
  "VERCEL_ENV",
  "NODE_ENV",
] as const;

function loadFlags() {
  return import("./homeCircularArcFlags");
}

describe("Home Circular Arc Preview Foundation V1", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps product unlock fail-closed", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const mod = await loadFlags();
    expect(mod.HOME_CIRCULAR_ARC_FOUNDATION_ENABLED).toBe(false);
    expect(mod.HOME_CIRCULAR_ARC_FOUNDATION_MODE).toBe("fail-closed");
  });

  it("enables preview in local development by default", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW", "");
    const mod = await loadFlags();
    expect(mod.isHomeCircularArcPreviewActive()).toBe(true);
    expect(mod.shouldMountHomeCircularArc()).toBe(true);
  });

  it("never mounts on production Vercel even with preview env=1", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW", "1");
    const mod = await loadFlags();
    expect(mod.isHomeCircularArcPreviewActive()).toBe(false);
    expect(mod.shouldMountHomeCircularArc()).toBe(false);
  });

  it("stays off for production Node builds without preview host", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW", "");
    const mod = await loadFlags();
    expect(mod.isHomeCircularArcPreviewActive()).toBe(false);
    expect(mod.shouldMountHomeCircularArc()).toBe(false);
  });

  it("allows Vercel Preview only with explicit NEXT_PUBLIC flag", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW", "1");
    const mod = await loadFlags();
    expect(mod.isHomeCircularArcPreviewActive()).toBe(true);
    expect(mod.shouldMountHomeCircularArc()).toBe(true);
  });

  it("forces preview off when NEXT_PUBLIC flag is 0", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW", "0");
    const mod = await loadFlags();
    expect(mod.isHomeCircularArcPreviewActive()).toBe(false);
    expect(mod.shouldMountHomeCircularArc()).toBe(false);
  });

  it("keeps DiscoverShell free of Arc; left rail lives in DiscoverVideoCard", () => {
    const shell = readFileSync(
      join(process.cwd(), "app/discover/components/DiscoverShell.tsx"),
      "utf8"
    );
    expect(shell).toMatch(/HomeSectionCircles/);
    expect(shell).toMatch(/<HomeSectionCircles \/>/);
    expect(shell).not.toMatch(/HomeCircularArc/);
    expect(shell).not.toMatch(/shouldMountHomeCircularArc/);

    const experience = readFileSync(
      join(process.cwd(), "app/discover/DiscoverExperience.tsx"),
      "utf8"
    );
    expect(experience).not.toMatch(/HomeCircularArc/);
    expect(experience).not.toMatch(/data-home-arc-rail/);

    const card = readFileSync(
      join(process.cwd(), "app/discover/components/DiscoverVideoCard.tsx"),
      "utf8"
    );
    expect(card).toMatch(/shouldMountHomeCircularArc/);
    expect(card).toMatch(/data-home-arc-rail="left-action"/);
    expect(card).toMatch(/HomeCircularArc/);
    expect(card).toMatch(/DiscoverActionRail/);
    expect(card).toMatch(/watch-rail-btn|HomeCircularArc/);
  });
});

// Silence unused in case of tree-shake confusion in some runners.
void FLAG_KEYS;
