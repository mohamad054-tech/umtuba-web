import { describe, expect, it } from "vitest";
import {
  ISO_COUNTRY_CENTERS,
  isoCountryDisplayName,
  markerRadiusForViewCount,
  resolveGlobeReachMarkers,
} from "./isoCountryCenters";

describe("isoCountryCenters", () => {
  it("covers PT, CH, and CL with names not equal to the code", () => {
    expect(ISO_COUNTRY_CENTERS.PT.name).toBe("Portugal");
    expect(ISO_COUNTRY_CENTERS.CH.name).toBe("Switzerland");
    expect(ISO_COUNTRY_CENTERS.CL.name).toBe("Chile");
    expect(isoCountryDisplayName("pt")).toBe("Portugal");
    expect(isoCountryDisplayName("CH")).toBe("Switzerland");
    expect(isoCountryDisplayName("cl")).toBe("Chile");
  });

  it("never trusts a database country_name that equals the code", () => {
    const markers = resolveGlobeReachMarkers([
      { countryCode: "PT", viewCount: 4, isTrending: false },
      { countryCode: "CH", viewCount: 2, isTrending: false },
      { countryCode: "CL", viewCount: 1, isTrending: true },
    ]);
    expect(markers.map((m) => m.displayName)).toEqual([
      "Portugal",
      "Switzerland",
      "Chile",
    ]);
    expect(markers.every((m) => m.displayName !== m.countryCode)).toBe(true);
  });

  it("omits unknown codes instead of inventing coordinates", () => {
    const markers = resolveGlobeReachMarkers([
      { countryCode: "ZZ", viewCount: 9 },
      { countryCode: "DE", viewCount: 3 },
    ]);
    expect(markers).toHaveLength(1);
    expect(markers[0]?.countryCode).toBe("DE");
    expect(markers[0]?.displayName).toBe("Germany");
  });

  it("sizes markers by view_count without capping the country list", () => {
    const countries = Array.from({ length: 20 }, (_, index) => ({
      countryCode: "US",
      viewCount: index + 1,
    }));
    const markers = resolveGlobeReachMarkers(countries);
    expect(markers).toHaveLength(20);
    expect(markers[19]!.radius).toBeGreaterThan(markers[0]!.radius);
    expect(markerRadiusForViewCount(1, 100)).toBeLessThan(
      markerRadiusForViewCount(100, 100)
    );
  });

  it("includes a lat/lng pair for every catalog entry", () => {
    for (const [code, center] of Object.entries(ISO_COUNTRY_CENTERS)) {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(center.name.trim().length).toBeGreaterThan(1);
      expect(center.name).not.toBe(code);
      expect(Number.isFinite(center.lat)).toBe(true);
      expect(Number.isFinite(center.lng)).toBe(true);
    }
  });
});
