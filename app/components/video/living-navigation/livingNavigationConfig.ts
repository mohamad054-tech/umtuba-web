/**
 * Living Navigation — Watch prototype overlays (Secondary Surface Cleanup V1).
 *
 * These items are **not** Platform Navigation primary chrome destinations.
 * Internal `placement.group: "primary" | "secondary"` only orders overlay slots
 * inside Watch — it must never be confused with `APP_NAV_ITEMS` / mobile primary.
 * Surfaces remain available as prototypes; this module does not delete or disable them.
 */

export const LIVING_NAVIGATION_IDS = [
  "world",
  "store",
  "journey",
  "ai",
  "wallet",
  "hello-city",
] as const;

export type LivingNavigationId = (typeof LIVING_NAVIGATION_IDS)[number];

export type LivingNavigationIconId =
  | "globe"
  | "store"
  | "journey"
  | "ai"
  | "wallet"
  | "city";

export type LivingNavigationFeatureStatus = "prototype" | "disabled";

export type LivingNavigationFeatureFlagKey = "hello_city_enabled";

export type LivingNavigationItem = {
  readonly id: LivingNavigationId;
  readonly label: string;
  readonly icon: LivingNavigationIconId;
  readonly placement: {
    readonly group: "primary" | "secondary";
    readonly slot: number;
  };
  readonly featureStatus: LivingNavigationFeatureStatus;
  readonly overlayTitle: string;
  readonly placeholderDescription: string;
  readonly featureFlagKey?: LivingNavigationFeatureFlagKey;
};

export const LIVING_NAVIGATION_ITEMS = [
  {
    id: "world",
    label: "World",
    icon: "globe",
    placement: { group: "primary", slot: 1 },
    featureStatus: "prototype",
    overlayTitle: "World around this video",
    placeholderDescription:
      "A lightweight view of places, cities, and nearby context will live here in a future sprint.",
  },
  {
    id: "store",
    label: "Store",
    icon: "store",
    placement: { group: "primary", slot: 2 },
    featureStatus: "prototype",
    overlayTitle: "Store in context",
    placeholderDescription:
      "Products connected to this moment will appear here without interrupting the video.",
  },
  {
    id: "journey",
    label: "Journey",
    icon: "journey",
    placement: { group: "primary", slot: 3 },
    featureStatus: "prototype",
    overlayTitle: "Journey from this moment",
    placeholderDescription:
      "Future Journey tools will begin from the current video while preserving your exact Watch context.",
  },
  {
    id: "ai",
    label: "AI",
    icon: "ai",
    placement: { group: "secondary", slot: 4 },
    featureStatus: "prototype",
    overlayTitle: "AI for this context",
    placeholderDescription:
      "Contextual assistance for this video, place, or city will be introduced in a future sprint.",
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: "wallet",
    placement: { group: "secondary", slot: 5 },
    featureStatus: "prototype",
    overlayTitle: "Wallet at a glance",
    placeholderDescription:
      "A calm balance and quick-action view will be explored here without leaving Watch.",
  },
  {
    id: "hello-city",
    label: "Hello City",
    icon: "city",
    placement: { group: "secondary", slot: 6 },
    featureStatus: "disabled",
    featureFlagKey: "hello_city_enabled",
    overlayTitle: "Hello City",
    placeholderDescription:
      "Hello City remains unavailable until its existing feature gate is enabled in a later sprint.",
  },
] as const satisfies readonly LivingNavigationItem[];

export function isLivingNavigationItemEnabled(
  item: LivingNavigationItem
): boolean {
  return item.featureStatus === "prototype";
}

export function getLivingNavigationItem(
  id: LivingNavigationId | null
): LivingNavigationItem | null {
  if (!id) return null;
  return LIVING_NAVIGATION_ITEMS.find((item) => item.id === id) ?? null;
}
