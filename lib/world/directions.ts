export type DirectionsDestination =
  | { latitude: number; longitude: number; label?: string | null }
  | { destinationText: string };

const MAX_DESTINATION_TEXT = 300;

export function isValidCoordinatePair(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function sanitizeDirectionsText(value: string): string | null {
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || text.length > MAX_DESTINATION_TEXT) return null;
  if (/[\u0000-\u001f\u007f]/.test(text)) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(text)) return null;
  return text;
}

/**
 * Google Maps universal URL: opens the installed app when the OS supports it,
 * otherwise falls back to the browser. No API key or embedded Maps SDK.
 */
export function buildExternalDirectionsUrl(
  destination: DirectionsDestination
): string | null {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");

  if ("latitude" in destination) {
    if (
      !isValidCoordinatePair(destination.latitude, destination.longitude)
    ) {
      return null;
    }
    url.searchParams.set(
      "destination",
      `${destination.latitude},${destination.longitude}`
    );
    const label = destination.label
      ? sanitizeDirectionsText(destination.label)
      : null;
    if (label) url.searchParams.set("destination_place_name", label);
    return url.toString();
  }

  const text = sanitizeDirectionsText(destination.destinationText);
  if (!text) return null;
  url.searchParams.set("destination", text);
  return url.toString();
}
