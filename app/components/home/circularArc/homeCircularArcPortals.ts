/**
 * Portal identity for Home Circular Arc.
 * Labels/glyphs are presentation; hrefs resolve via homePlatformEntryContract (U2).
 */

export type HomeArcPortalId =
  | "store"
  | "learning"
  | "messages"
  | "world"
  | "games"
  | "live"
  | "profile"
  | (string & {});

export type HomeArcPortal = {
  id: HomeArcPortalId;
  label: string;
  /** Decorative glyph for foundation UI (not emoji product policy long-term). */
  glyph: string;
};

/** Experimental portal set for Foundation V1 — not a navigation contract. */
export const HOME_ARC_FOUNDATION_PORTALS: readonly HomeArcPortal[] = [
  { id: "store", label: "Store", glyph: "S" },
  { id: "learning", label: "Learning", glyph: "L" },
  { id: "messages", label: "Messages", glyph: "M" },
  { id: "world", label: "World", glyph: "W" },
  { id: "games", label: "Games", glyph: "G" },
  { id: "live", label: "Live", glyph: "●" },
  { id: "profile", label: "Profile", glyph: "P" },
] as const;
