import type { WorldFeatureFlags } from "./discovery";

/** Public World Discovery is live only when schema exists and the flag is on. */
export function isWorldDiscoveryPubliclyLive(input: {
  databaseReady: boolean;
  flags: Pick<WorldFeatureFlags, "worldDiscoveryEnabled">;
}): boolean {
  return input.databaseReady && input.flags.worldDiscoveryEnabled;
}

export function worldDiscoveryHoldMessage(databaseReady: boolean): string {
  return databaseReady
    ? "World Discovery is prepared but disabled pending platform approval."
    : "World Discovery database migrations are not available in this environment yet.";
}

export function worldSearchHoldMessage(databaseReady: boolean): string {
  return databaseReady
    ? "World Search is prepared but disabled pending platform approval."
    : "World Search database migrations are not available in this environment yet.";
}
