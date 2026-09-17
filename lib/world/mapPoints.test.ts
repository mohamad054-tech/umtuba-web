import { describe, expect, it } from "vitest";
import {
  collectWorldMapPoints,
  toWorldMapPoint,
  worldMapHref,
} from "./mapPoints";

describe("world map points", () => {
  it("keeps only already-loaded points with valid coordinates", () => {
    const place = toWorldMapPoint({
      id: "p1",
      kind: "place",
      name: "Cafe",
      category: "cafe",
      slug: "cafe",
      latitude: 31.7683,
      longitude: 35.2137,
    });
    const city = toWorldMapPoint({
      id: "c1",
      kind: "city",
      name: "Jerusalem",
      category: "city",
      slug: "jerusalem",
      latitude: 31.7683,
      longitude: 35.2137,
    });
    expect(
      collectWorldMapPoints([
        place,
        city,
        toWorldMapPoint({
          id: "bad",
          kind: "place",
          name: "No coords",
          category: "other",
          slug: "no-coords",
          latitude: null,
          longitude: null,
        }),
        place,
      ])
    ).toEqual([place, city]);
  });

  it("links markers to existing World pages", () => {
    expect(
      worldMapHref({
        id: "p1",
        kind: "place",
        name: "Cafe",
        category: "cafe",
        slug: "old-city-cafe",
        latitude: 1,
        longitude: 2,
      })
    ).toBe("/world/place/old-city-cafe");
    expect(
      worldMapHref({
        id: "c1",
        kind: "city",
        name: "Amman",
        category: "city",
        slug: "amman",
        latitude: 1,
        longitude: 2,
      })
    ).toBe("/world/city/amman");
  });
});
