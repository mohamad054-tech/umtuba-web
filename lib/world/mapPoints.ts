import { isValidCoordinatePair } from "./directions";

export type WorldMapPointKind = "place" | "city";

export type WorldMapPoint = {
  id: string;
  kind: WorldMapPointKind;
  name: string;
  category: string;
  slug: string;
  latitude: number;
  longitude: number;
};

export type WorldMapCenter = {
  latitude: number;
  longitude: number;
};

export function coerceMapCoordinate(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

export function toWorldMapCenter(
  input?: { latitude?: unknown; longitude?: unknown } | null
): WorldMapCenter | null {
  if (!input) return null;
  const latitude = coerceMapCoordinate(input.latitude);
  const longitude = coerceMapCoordinate(input.longitude);
  if (!isValidCoordinatePair(latitude, longitude)) return null;
  return { latitude, longitude };
}

export function toWorldMapPoint(input: {
  id: string;
  kind: WorldMapPointKind;
  name: string;
  category: string;
  slug: string;
  latitude: unknown;
  longitude: unknown;
}): WorldMapPoint | null {
  const latitude = coerceMapCoordinate(input.latitude);
  const longitude = coerceMapCoordinate(input.longitude);
  if (!input.id || !input.slug || !input.name) return null;
  if (!isValidCoordinatePair(latitude, longitude)) return null;
  return {
    id: input.id,
    kind: input.kind,
    name: input.name,
    category: input.category,
    slug: input.slug,
    latitude,
    longitude,
  };
}

export function collectWorldMapPoints(
  points: Array<WorldMapPoint | null | undefined>
): WorldMapPoint[] {
  const seen = new Set<string>();
  const out: WorldMapPoint[] = [];
  for (const point of points) {
    if (!point) continue;
    const key = `${point.kind}:${point.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(point);
  }
  return out;
}

export function worldMapHref(point: WorldMapPoint): string {
  const slug = encodeURIComponent(point.slug);
  return point.kind === "city" ? `/world/city/${slug}` : `/world/place/${slug}`;
}
