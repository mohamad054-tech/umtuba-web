import type { LivingCity, LivingRoute } from "./types";

export const LIVING_CITIES: LivingCity[] = [
  {
    name: "Jerusalem",
    country: "Palestine",
    lat: 31.7683,
    lng: 35.2137,
    color: "#ffffff",
  },
  {
    name: "Amman",
    country: "Jordan",
    lat: 31.9539,
    lng: 35.9106,
    color: "#67e8f9",
  },
  {
    name: "Istanbul",
    country: "Türkiye",
    lat: 41.0082,
    lng: 28.9784,
    color: "#93c5fd",
  },
  {
    name: "Berlin",
    country: "Germany",
    lat: 52.52,
    lng: 13.405,
    color: "#34d399",
  },
  {
    name: "Dubai",
    country: "UAE",
    lat: 25.2048,
    lng: 55.2708,
    color: "#fbbf24",
  },
  {
    name: "New York",
    country: "USA",
    lat: 40.7128,
    lng: -74.006,
    color: "#a5b4fc",
  },
  {
    name: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lng: 139.6503,
    color: "#f9a8d4",
  },
];

const byName = Object.fromEntries(
  LIVING_CITIES.map((city) => [city.name, city])
) as Record<string, LivingCity>;

export const LIVING_ROUTES: LivingRoute[] = [
  {
    id: "jerusalem-amman",
    from: byName.Jerusalem,
    to: byName.Amman,
    color: "#67e8f9",
    duration: 9,
  },
  {
    id: "amman-istanbul",
    from: byName.Amman,
    to: byName.Istanbul,
    color: "#93c5fd",
    duration: 12,
  },
  {
    id: "istanbul-berlin",
    from: byName.Istanbul,
    to: byName.Berlin,
    color: "#34d399",
    duration: 14,
  },
  {
    id: "dubai-tokyo",
    from: byName.Dubai,
    to: byName.Tokyo,
    color: "#f9a8d4",
    duration: 18,
  },
  {
    id: "berlin-newyork",
    from: byName.Berlin,
    to: byName["New York"],
    color: "#a5b4fc",
    duration: 16,
  },
];

export const EARTH_RADIUS = 2;
export const MARKER_RADIUS = 2.04;
export const ROUTE_RADIUS = 2.05;
export const FLIGHT_RADIUS = 2.07;
export const CLOUD_RADIUS = 2.035;
export const TERMINATOR_RADIUS = 2.012;
