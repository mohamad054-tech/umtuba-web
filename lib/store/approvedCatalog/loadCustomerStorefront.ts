import {
  loadStoreBrowseCatalog,
  type StoreBrowseProduct,
} from "../../services/cj/expansionBrowse";
import { readLocalizationCatalogFile } from "../productLocalization/catalogFile";
import {
  applyCustomerLocalization,
  loadCustomerLocalizationLookup,
} from "../productLocalization/customerOverlay";
import { applyPublishableCustomerVisibility } from "../productLocalization/publishable";
import type { StoreLocale } from "../productLocalization/requiredLocales";

export function loadApprovedCustomerStorefront(locale: StoreLocale): {
  items: StoreBrowseProduct[];
  approvedCount: number;
  expansionCount: number;
  visibleCount: number;
} {
  const catalog = loadStoreBrowseCatalog();
  const localizationLookup = loadCustomerLocalizationLookup();
  const localizationById = new Map(
    (readLocalizationCatalogFile()?.products ?? []).map((row) => [row.cj_product_id, row])
  );
  const items = applyPublishableCustomerVisibility(
    catalog.items.map((row) => applyCustomerLocalization(row, locale, localizationLookup)),
    localizationById
  );
  return {
    items,
    approvedCount: catalog.approvedCount,
    expansionCount: catalog.expansionCount,
    visibleCount: items.filter((row) => row.customerVisible).length,
  };
}
