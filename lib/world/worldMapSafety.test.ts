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

  it("renders the same placeholder before mount to avoid hydration mismatch", () => {
    const section = read("app/world/components/WorldMapSection.tsx");
    expect(section).toContain("const [mounted, setMounted] = useState(false)");
    expect(section).toContain("const [nearViewport, setNearViewport] = useState(false)");
    expect(section).not.toMatch(
      /useState\(\s*\(\)\s*=>\s*typeof IntersectionObserver/
    );
    expect(section).toContain("loading: () => <MapPlaceholder />");
  });

  it("creates the map after the container has size and warns once on failure", () => {
    const map = read("app/world/components/WorldMap.tsx");
    expect(map).toContain('import "maplibre-gl/dist/maplibre-gl.css"');
    expect(map).toContain("hasLayoutSize");
    expect(map).toContain("ResizeObserver");
    expect(map).toContain("map.resize()");
    expect(map).toContain("toWorldMapCenter");
    expect(map).toContain("fitBounds");
    expect(map).toContain("webglcontextlost");
    expect(map).toContain("console.warn");
    expect(map).toContain('setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")');
  });
});
