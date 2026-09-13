import { describe, expect, it } from "vitest";
import {
  discoverLocationFromOrigin,
  formatDiscoverLocationLabel,
  isMissingOriginColumnError,
  localizedIsoCountryName,
  originWriteFields,
  sanitizePostOrigin,
} from "./postOrigin";

describe("post origin sanitizer", () => {
  it("keeps a known ISO-2 country and trims city", () => {
    expect(
      sanitizePostOrigin({ countryCode: "pt", city: "  Lisbon  " })
    ).toEqual({ countryCode: "PT", city: "Lisbon" });
  });

  it("drops city when the country is missing or unknown", () => {
    expect(sanitizePostOrigin({ countryCode: "", city: "Lisbon" })).toEqual({
      countryCode: null,
      city: null,
    });
    expect(sanitizePostOrigin({ countryCode: "ZZ", city: "Nowhere" })).toEqual({
      countryCode: null,
      city: null,
    });
  });

  it("never writes country-centroid coordinates", () => {
    const write = originWriteFields(
      { countryCode: "PT", city: "Porto" },
      null
    );
    expect(write).toEqual({
      origin_country_code: "PT",
      origin_city: "Porto",
      origin_lat: null,
      origin_lng: null,
    });
  });

  it("maps stored origin to a display location and formats labels", () => {
    const location = discoverLocationFromOrigin({
      origin_country_code: "ch",
      origin_city: "Geneva",
    });
    expect(location).toEqual({
      city: "Geneva",
      country: "Switzerland",
      countryCode: "CH",
    });
    expect(formatDiscoverLocationLabel(location)).toBe("Geneva, Switzerland");
    expect(
      formatDiscoverLocationLabel(
        discoverLocationFromOrigin({ origin_country_code: "CL", origin_city: "" })
      )
    ).toBe("Chile");
    expect(discoverLocationFromOrigin({})).toBeNull();
    expect(formatDiscoverLocationLabel(null)).toBe("");
  });

  it("detects missing origin columns without treating other errors as missing", () => {
    expect(
      isMissingOriginColumnError({
        code: "PGRST204",
        message: "Could not find the 'origin_country_code' column of 'posts'",
      })
    ).toBe(true);
    expect(
      isMissingOriginColumnError({ message: "permission denied for table posts" })
    ).toBe(false);
  });

  it("uses English ISO names when Intl has no region display", () => {
    expect(localizedIsoCountryName("en", "PT")).toBe("Portugal");
    expect(localizedIsoCountryName("en", "ZZ")).toBe("");
  });
});
