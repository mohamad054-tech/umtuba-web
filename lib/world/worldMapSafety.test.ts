import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translate } from "../i18n";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("world map safety", () => {
  it("does not request device location or use a Mapbox token", () => {
    const map = read("app/world/components/WorldMap.tsx");
    const section = read("app/world/components/WorldMapSection.tsx");
    const style = read("lib/world/mapStyle.ts");
    const combined = `${map}\n${section}\n${style}`;
    expect(combined).not.toMatch(/geolocation|GeolocateControl|getCurrentPosition/i);
    expect(combined).not.toMatch(/mapbox|access_token|MAPBOX|pk\./i);
    expect(style).toContain("tiles.openfreemap.org");
  });

  it("ships English and Arabic map labels", () => {
    expect(translate("en", "world.map.title")).toBe("Map");
    expect(translate("ar", "world.map.title")).toBe("الخريطة");
    expect(translate("ar", "world.map.unavailable")).toBe("تعذّر تحميل الخريطة.");
    expect(translate("fr", "world.map.title")).toBe("Map");
  });

  it("loads the map client-only and keeps the page usable if it fails", () => {
    const section = read("app/world/components/WorldMapSection.tsx");
    expect(section).toContain("ssr: false");
    expect(section).toContain("IntersectionObserver");
    expect(section).toContain("world.map.unavailable");
    expect(section).toContain("MapErrorBoundary");
  });
});
