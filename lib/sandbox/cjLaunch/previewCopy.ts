import { createTranslator } from "../../i18n/translate";
import type { StoreRail } from "../../services/cj/expansionBrowse";
import type { CjLaunchStoreLocale } from "./resolvePreviewLocale";

export type CjLaunchBadgeKind = "featured" | "deal" | "new" | "held";

export function cjLaunchRailLabel(
  rail: StoreRail | "ALL",
  locale: CjLaunchStoreLocale
): string {
  const t = createTranslator(locale);
  if (rail === "ALL") return t("store.preview.allProducts");
  if (rail === "featured") return t("store.preview.featured");
  if (rail === "new") return t("store.preview.new");
  if (rail === "top_picks") return t("store.preview.topPicks");
  return t("store.preview.bestDeals");
}

export function cjLaunchBadgeLabel(
  kind: CjLaunchBadgeKind,
  locale: CjLaunchStoreLocale
): string {
  const t = createTranslator(locale);
  if (kind === "held") return t("store.preview.badgeHeld");
  if (kind === "featured") return t("store.preview.badgeFeatured");
  if (kind === "deal") return t("store.preview.badgeDeal");
  return t("store.preview.badgeNew");
}
