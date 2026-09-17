export const DEFAULT_MAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

export const OPENFREEMAP_TILE_ORIGIN = "https://tiles.openfreemap.org";

export function resolveMapStyleUrl(
  raw: string | undefined = process.env.NEXT_PUBLIC_MAP_STYLE_URL
): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return DEFAULT_MAP_STYLE_URL;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return DEFAULT_MAP_STYLE_URL;
    }
    return parsed.toString();
  } catch {
    return DEFAULT_MAP_STYLE_URL;
  }
}

export function mapStyleOrigin(
  raw: string | undefined = process.env.NEXT_PUBLIC_MAP_STYLE_URL
): string {
  try {
    return new URL(resolveMapStyleUrl(raw)).origin;
  } catch {
    return OPENFREEMAP_TILE_ORIGIN;
  }
}
