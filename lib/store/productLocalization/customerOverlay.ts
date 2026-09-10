import type { AppLocale } from "../../i18n/locales";
import type { StoreBrowseProduct } from "../../services/cj/expansionBrowse";
import { readLocalizationCatalogFile } from "./catalogFile";
import { localeCopyFromLegacy } from "./localeCompleteness";
import { isRequiredStoreLocale, type StoreLocale } from "./requiredLocales";
import type { LocalizedProductCopy } from "./types";

export type CustomerOverlayLocale = AppLocale | StoreLocale;

export function loadCustomerLocalizationLookup(
  rootDir = process.cwd()
): Map<string, LocalizedProductCopy> {
  const catalog = readLocalizationCatalogFile(rootDir);
  const map = new Map<string, LocalizedProductCopy>();
  for (const row of catalog?.products ?? []) {
    if (row.status !== "manual_review_required") {
      map.set(row.cj_product_id, row.localized);
    }
  }
  return map;
}

export function applyCustomerLocalization(
  row: StoreBrowseProduct,
  locale: CustomerOverlayLocale,
  lookup: Map<string, LocalizedProductCopy> = loadCustomerLocalizationLookup()
): StoreBrowseProduct {
  const copy = lookup.get(row.identity.cj_product_id);
  if (!copy) return row;
  const storeLocale: StoreLocale = isRequiredStoreLocale(locale) ? locale : "en";
  const localized = localeCopyFromLegacy(copy, storeLocale);
  if (!localized) return row;
  const title = localized.title;
  const description = localized.description;
  const short_description = `${localized.department} · ${localized.subcategory}`;
  return {
    ...row,
    customer: {
      ...row.customer,
      title,
      description,
      short_description,
    },
    catalogItem: {
      ...row.catalogItem,
      product: {
        ...row.catalogItem.product,
        title,
        description,
        short_description: description,
      },
    },
  };
}
