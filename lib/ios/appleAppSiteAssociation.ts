/**
 * Apple App Site Association builder for Universal Links.
 *
 * Bundle ID is taken from the existing umtuba-mobile Expo config
 * (`com.umtuba.app`). Team ID is NEVER invented — operator must supply
 * APPLE_TEAM_ID from Apple Developer. Until then this module returns null
 * and the well-known route stays 404.
 */

export const IOS_BUNDLE_IDENTIFIER = "com.umtuba.app";

const TEAM_ID_RE = /^[A-Z0-9]{10}$/;

export type AppleAppSiteAssociation = {
  applinks: {
    details: Array<{
      appIDs: string[];
      components: Array<{ "/": string }>;
    }>;
  };
};

export function normalizeAppleTeamId(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const teamId = raw.trim().toUpperCase();
  return TEAM_ID_RE.test(teamId) ? teamId : null;
}

export function buildAppleAppSiteAssociation(
  teamIdRaw: string | undefined | null
): AppleAppSiteAssociation | null {
  const teamId = normalizeAppleTeamId(teamIdRaw);
  if (!teamId) return null;

  return {
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.${IOS_BUNDLE_IDENTIFIER}`],
          components: [{ "/": "/*" }],
        },
      ],
    },
  };
}
