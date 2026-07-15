import { describe, expect, it } from "vitest";
import {
  buildApproximateGeo,
  normalizeCountryCode,
  sanitizeApproximateCity,
} from "./approximateLocation";

describe("approximate location privacy", () => {
  it("normalizes ISO country codes only", () => {
    expect(normalizeCountryCode("tr")).toBe("TR");
    expect(normalizeCountryCode("USA")).toBeNull();
    expect(normalizeCountryCode("")).toBeNull();
  });

  it("rejects coordinate-like city strings", () => {
    expect(sanitizeApproximateCity("31.5, 34.4")).toBeNull();
    expect(sanitizeApproximateCity("Jerusalem")).toBe("Jerusalem");
  });

  it("builds approximate geo without coordinates", () => {
    const geo = buildApproximateGeo({
      countryCode: "de",
      city: "Berlin",
    });
    expect(geo.countryCode).toBe("DE");
    expect(geo.countryName).toBe("Germany");
    expect(geo.city).toBe("Berlin");
    expect(JSON.stringify(geo)).not.toMatch(/lat|lng|longitude|latitude/i);
  });
});
