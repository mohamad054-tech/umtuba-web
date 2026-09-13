import { describe, expect, it } from "vitest";
import { matchWorldCityCenter } from "./resolveWorldCityCenter";

describe("matchWorldCityCenter", () => {
  const rows = [
    {
      city_name: "Lisbon",
      center_latitude: 38.7223,
      center_longitude: -9.1393,
    },
    {
      city_name: "Porto",
      center_latitude: 41.1579,
      center_longitude: -8.6291,
    },
  ];

  it("matches a city case-insensitively after trim", () => {
    expect(matchWorldCityCenter(rows, "  lisbon ")).toEqual({
      lat: 38.7223,
      lng: -9.1393,
    });
  });

  it("returns null when the typed city is not in world_cities", () => {
    expect(matchWorldCityCenter(rows, "Faro")).toBeNull();
  });
});
