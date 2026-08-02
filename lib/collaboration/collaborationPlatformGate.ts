/**
 * Collaboration Platform UI exposure gate.
 *
 * Pattern: same injectable `process.env` source as `app/lib/product/surfaceGates.ts`.
 * Server-authoritative. Default fail-closed (false).
 *
 * Enable with:
 *   COLLABORATION_PLATFORM_ENABLED=1
 * or
 *   COLLABORATION_PLATFORM_ENABLED=true
 *
 * Optional discovery mirror for client chrome (User menu) only when the
 * primary server key is unset — never required for route/action protection:
 *   NEXT_PUBLIC_COLLABORATION_PLATFORM_ENABLED=1
 *
 * Access decisions for routes and server actions must call this on the server.
 */

function parseBoolFlag(raw: string | undefined): boolean | null {
  if (raw === undefined) return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return null;
}

/**
 * Whether Collaboration Workspace UI / actions are available.
 * Default: false when env unset or invalid.
 */
export function isCollaborationPlatformEnabled(
  source: Record<string, string | undefined> = process.env
): boolean {
  const primary = parseBoolFlag(source.COLLABORATION_PLATFORM_ENABLED);
  if (primary !== null) return primary;

  // Client-visible mirror used only when primary key is absent (User menu).
  const published = parseBoolFlag(
    source.NEXT_PUBLIC_COLLABORATION_PLATFORM_ENABLED
  );
  if (published !== null) return published;

  return false;
}

/** Generic fail-closed copy — does not advertise an unreleased feature. */
export const COLLABORATION_PLATFORM_DISABLED_MESSAGE =
  "Request could not be completed." as const;

export type CollaborationPlatformActionRejection = {
  ok: false;
  message: typeof COLLABORATION_PLATFORM_DISABLED_MESSAGE;
};

/** Server-action guard helper (fail-closed, no feature teaser). */
export function rejectIfCollaborationPlatformDisabled(
  source: Record<string, string | undefined> = process.env
): CollaborationPlatformActionRejection | null {
  if (isCollaborationPlatformEnabled(source)) {
    return null;
  }
  return {
    ok: false,
    message: COLLABORATION_PLATFORM_DISABLED_MESSAGE,
  };
}
