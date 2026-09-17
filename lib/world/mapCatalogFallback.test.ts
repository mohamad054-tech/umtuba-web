import { describe, expect, it } from "vitest";
import {
  catalogDiscoveryBootstrap,
  catalogWorldCities,
  catalogWorldCityProfile,
} from "./mapCatalogFallback";

describe("world map catalog fallback", () => {
  it("exposes Buenos Aires as numeric city-center coordinates", () => {
    const city = catalogWorldCities().find((row) => row.slug === "buenos-aires");
    expect(city).toMatchObject({
      slug: "buenos-aires",
      city_name: "Buenos Aires",
    });
    expect(typeof city?.center_latitude).toBe("number");
    expect(typeof city?.center_longitude).toBe("number");
    expect(city?.center_latitude).toBe(-34.6039);
    expect(city?.center_longitude).toBe(-58.3814);

    const profile = catalogWorldCityProfile("buenos-aires");
    expect(profile?.centerLatitude).toBe(-34.6039);
    expect(profile?.centerLongitude).toBe(-58.3814);
    expect(Number.isFinite(profile?.centerLatitude)).toBe(true);
  });

  it("keeps discovery hold flags off when using catalog cities", () => {
    const bootstrap = catalogDiscoveryBootstrap();
    expect(bootstrap.databaseReady).toBe(false);
    expect(bootstrap.flags.worldDiscoveryEnabled).toBe(false);
    expect(bootstrap.cities.length).toBeGreaterThan(0);
  });
});
