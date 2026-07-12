import { describe, expect, it } from "vitest";
import { GLOBE_CITIES } from "./handoffArrival";
import {
  EARTH_Y_ROTATION,
  applyEarthYRotation,
  latLngToVector3,
  latLngToWorldVector3,
} from "./globeCoordinates";

/** Legacy JourneyGlobe mapping (theta = lng, no +180) — for mismatch proof. */
function legacyLatLngToVector3(lat: number, lng: number, radius: number) {
  const latitude = (lat * Math.PI) / 180;
  const longitude = (lng * Math.PI) / 180;
  return {
    x: -radius * Math.cos(latitude) * Math.cos(longitude),
    y: radius * Math.sin(latitude),
    z: radius * Math.cos(latitude) * Math.sin(longitude),
  };
}

describe("globeCoordinates", () => {
  it("keeps Jerusalem / Amman / Istanbul / Berlin at expected lat/lng", () => {
    expect(GLOBE_CITIES[0]).toMatchObject({
      name: "Jerusalem",
      lat: 31.7683,
      lng: 35.2137,
    });
    expect(GLOBE_CITIES[1]).toMatchObject({
      name: "Amman",
      lat: 31.9539,
      lng: 35.9106,
    });
    expect(GLOBE_CITIES[2]).toMatchObject({
      name: "Istanbul",
      lat: 41.0082,
      lng: 28.9784,
    });
    expect(GLOBE_CITIES[3]).toMatchObject({
      name: "Berlin",
      lat: 52.52,
      lng: 13.405,
    });
  });

  it("uses the same vector for a city marker and a route endpoint", () => {
    const radius = 2.04;

    for (const city of GLOBE_CITIES) {
      const marker = latLngToVector3(city.lat, city.lng, radius);
      const routeEndpoint = latLngToVector3(city.lat, city.lng, radius);
      expect(marker.distanceTo(routeEndpoint)).toBe(0);
    }
  });

  it("differs from the legacy no-+180 mapping (ocean misplacement)", () => {
    const jerusalem = GLOBE_CITIES[0];
    const fixed = latLngToVector3(jerusalem.lat, jerusalem.lng, 2);
    const legacy = legacyLatLngToVector3(jerusalem.lat, jerusalem.lng, 2);
    const distance = Math.hypot(
      fixed.x - legacy.x,
      fixed.y - legacy.y,
      fixed.z - legacy.z
    );
    expect(distance).toBeGreaterThan(1.5);
  });

  it("places Levant cities near each other and far from Berlin", () => {
    const radius = 2;
    const jerusalem = latLngToVector3(
      GLOBE_CITIES[0].lat,
      GLOBE_CITIES[0].lng,
      radius
    );
    const amman = latLngToVector3(
      GLOBE_CITIES[1].lat,
      GLOBE_CITIES[1].lng,
      radius
    );
    const berlin = latLngToVector3(
      GLOBE_CITIES[3].lat,
      GLOBE_CITIES[3].lng,
      radius
    );

    expect(jerusalem.distanceTo(amman)).toBeLessThan(0.08);
    expect(jerusalem.distanceTo(berlin)).toBeGreaterThan(0.5);
  });

  it("maps camera world targets through Earth Y rotation", () => {
    const local = latLngToVector3(31.7683, 35.2137, 6);
    const world = latLngToWorldVector3(31.7683, 35.2137, 6);
    const expected = applyEarthYRotation(local);

    expect(world.distanceTo(expected)).toBeLessThan(1e-9);
    expect(EARTH_Y_ROTATION).toBe(-0.55);
    expect(world.distanceTo(local)).toBeGreaterThan(0.01);
  });
});
