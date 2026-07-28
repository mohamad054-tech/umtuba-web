/**
 * Home Circular Arc — gates (Foundation + Preview).
 *
 * Product unlock remains fail-closed until Home unlock GO:
 *   `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
 *
 * Arc Preview Foundation V1 — visual review only:
 *   - Local `next dev` → preview ON (unless explicitly set to "0")
 *   - Production host (`VERCEL_ENV=production`) → always OFF
 *   - Non-production / Vercel Preview → ON only with
 *     `NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW=1`
 *
 * Does not unlock Home. Does not remove HomeSectionCircles.
 * Does not change navigation contracts.
 */

/** Product unlock path — stays false (Home locked). */
export const HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false as const;

export const HOME_CIRCULAR_ARC_FOUNDATION_MODE = "fail-closed" as const;

/**
 * Explicit Preview env (`NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW`).
 * - unset: local development may still preview
 * - "1" / "true": allow preview on non-production targets
 * - "0" / "false": force preview off everywhere
 */
export const HOME_CIRCULAR_ARC_PREVIEW_FLAG =
  process.env.NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW;

function readVercelEnv(): string {
  return (
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.VERCEL_ENV ??
    ""
  ).toLowerCase();
}

function isExplicitPreviewOff(): boolean {
  const flag = HOME_CIRCULAR_ARC_PREVIEW_FLAG;
  return flag === "0" || flag === "false";
}

function isExplicitPreviewOn(): boolean {
  const flag = HOME_CIRCULAR_ARC_PREVIEW_FLAG;
  return flag === "1" || flag === "true";
}

/**
 * Preview-only gate. Never true on production hosts.
 */
export function isHomeCircularArcPreviewActive(): boolean {
  if (isExplicitPreviewOff()) return false;

  const vercelEnv = readVercelEnv();
  // Hard fail-closed for production deployments.
  if (vercelEnv === "production") return false;

  // Local development visual review.
  if (process.env.NODE_ENV === "development") return true;

  // Vercel Preview (or similar): require explicit opt-in.
  if (isExplicitPreviewOn() && vercelEnv === "preview") return true;

  // Non-production Node builds with explicit opt-in (e.g. staging label).
  if (isExplicitPreviewOn() && process.env.NODE_ENV !== "production") {
    return true;
  }

  return false;
}

/**
 * Mount decision for the Home Circular Arc left action rail
 * (inside DiscoverVideoCard, sibling chrome to DiscoverActionRail).
 */
export function shouldMountHomeCircularArc(): boolean {
  if (HOME_CIRCULAR_ARC_FOUNDATION_ENABLED) return true;
  return isHomeCircularArcPreviewActive();
}
