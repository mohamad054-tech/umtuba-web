/**
 * Production gating for unfinished / experimental surfaces.
 *
 * Policy (Phase A4 + B5):
 * - Labs & prototypes (`/feed`, city prototype UI, `/journey-pro`):
 *   unavailable in production (`notFound()` or prepared empty state).
 * - Watch: stays public; demo videos + unfinished side panels never ship in production.
 * - Live collaboration mock items / entry: never shown in production.
 * - Messenger fake presence chrome: never in production.
 *   In development, off by default — set NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS=1 to show.
 *   Attachment/voice controls are removed from the composer (not previewed).
 *
 * Watch/Live development previews stay on by default unless
 * NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS=0.
 */

export type SurfaceGateId =
  | "feed"
  | "city"
  | "journeyPro"
  | "watchDemoFallback"
  | "watchPrototypePanels"
  | "liveCollabMocks"
  | "liveCollabEntry"
  | "messengerPreviewChrome";

function readPreviewFlag(
  source: Record<string, string | undefined> = process.env
): boolean | null {
  const raw = (source.NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS || "").trim();
  if (!raw) return null;
  if (raw === "1" || raw.toLowerCase() === "true") return true;
  if (raw === "0" || raw.toLowerCase() === "false") return false;
  return null;
}

export function isProductionRuntime(
  source: Record<string, string | undefined> = process.env
): boolean {
  return (source.NODE_ENV || "").trim() === "production";
}

/** Route-level labs/prototypes → notFound() / prepared empty in production. */
export function isExperimentalRouteAvailable(
  source: Record<string, string | undefined> = process.env
): boolean {
  return !isProductionRuntime(source);
}

function allowDevPreview(
  source: Record<string, string | undefined> = process.env
): boolean {
  if (isProductionRuntime(source)) {
    return false;
  }
  const flag = readPreviewFlag(source);
  if (flag === false) return false;
  return true;
}

/** Demo video fallback for /watch — never in production. */
export function allowWatchDemoFallback(
  source: Record<string, string | undefined> = process.env
): boolean {
  return allowDevPreview(source);
}

/** Related / Explore city / AI / UConnect watch panels — never in production. */
export function allowWatchPrototypePanels(
  source: Record<string, string | undefined> = process.env
): boolean {
  return allowDevPreview(source);
}

/** Seeded mock collaboration files in live rooms — never in production. */
export function allowLiveCollabMocks(
  source: Record<string, string | undefined> = process.env
): boolean {
  return allowDevPreview(source);
}

/** Host control that opens the collaboration panel — never in production. */
export function allowLiveCollabEntry(
  source: Record<string, string | undefined> = process.env
): boolean {
  return allowLiveCollabMocks(source);
}

/**
 * Fake Messenger presence chrome (online dots / “Online” labels).
 * Never in production. Off by default in development — opt in with
 * NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS=1.
 */
export function allowMessengerPreviewChrome(
  source: Record<string, string | undefined> = process.env
): boolean {
  if (isProductionRuntime(source)) {
    return false;
  }
  return readPreviewFlag(source) === true;
}

export function isSurfaceAllowed(
  id: SurfaceGateId,
  source: Record<string, string | undefined> = process.env
): boolean {
  switch (id) {
    case "feed":
    case "city":
    case "journeyPro":
      return isExperimentalRouteAvailable(source);
    case "watchDemoFallback":
      return allowWatchDemoFallback(source);
    case "watchPrototypePanels":
      return allowWatchPrototypePanels(source);
    case "liveCollabMocks":
      return allowLiveCollabMocks(source);
    case "liveCollabEntry":
      return allowLiveCollabEntry(source);
    case "messengerPreviewChrome":
      return allowMessengerPreviewChrome(source);
    default:
      return false;
  }
}
