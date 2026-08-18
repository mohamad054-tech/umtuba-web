/**
 * In-memory Store QA surface for DEMO products.
 * Exercises catalog/search/filters/PDP/variants/favorites/cart and checkout sandbox
 * without inventing a live checkout.
 */

import { UMTUBA_DEMO_PRODUCTS, getUmtubaDemoProduct } from "./catalog";
import type { DemoCategorySlug } from "./types";
import type {
  DemoCartLine,
  DemoCatalogUiState,
  DemoCheckoutSandbox,
  DemoPdp,
  DemoProduct,
} from "./types";

export type DemoCatalogQuery = {
  q?: string;
  category?: DemoCategorySlug | "all";
  tag?: string;
  conceptKind?: DemoProduct["conceptKind"] | "all";
};

export type DemoCatalogView = {
  state: DemoCatalogUiState;
  items: DemoProduct[];
  total: number;
  emptyReason: string | null;
  errorMessage: string | null;
  responsiveNotes: {
    grid: "1-col narrow / 2-col mid / 3-col wide";
    filters: "stack on narrow, row on wide";
  };
};

export function searchDemoCatalog(
  query: DemoCatalogQuery = {},
  ui: Exclude<DemoCatalogUiState, "empty"> = "ready"
): DemoCatalogView {
  if (ui === "loading") {
    return {
      state: "loading",
      items: [],
      total: 0,
      emptyReason: null,
      errorMessage: null,
      responsiveNotes: notes(),
    };
  }
  if (ui === "error") {
    return {
      state: "error",
      items: [],
      total: 0,
      emptyReason: null,
      errorMessage: "Demo catalog failed to load. No live partner fallback is used.",
      responsiveNotes: notes(),
    };
  }

  const needle = (query.q ?? "").trim().toLowerCase();
  const items = UMTUBA_DEMO_PRODUCTS.filter((product) => {
    if (query.category && query.category !== "all" && product.category !== query.category) {
      return false;
    }
    if (query.conceptKind && query.conceptKind !== "all" && product.conceptKind !== query.conceptKind) {
      return false;
    }
    if (query.tag && !product.tags.includes(query.tag)) return false;
    if (!needle) return true;
    const hay = `${product.title} ${product.shortDescription} ${product.tags.join(" ")} ${product.category}`;
    return hay.toLowerCase().includes(needle);
  });

  if (items.length === 0) {
    return {
      state: "empty",
      items: [],
      total: 0,
      emptyReason: "No demo products match these filters. Empty is an honest Store state.",
      errorMessage: null,
      responsiveNotes: notes(),
    };
  }
  return {
    state: "ready",
    items,
    total: items.length,
    emptyReason: null,
    errorMessage: null,
    responsiveNotes: notes(),
  };
}

function notes(): DemoCatalogView["responsiveNotes"] {
  return {
    grid: "1-col narrow / 2-col mid / 3-col wide",
    filters: "stack on narrow, row on wide",
  };
}

export function describeDemoPdp(idOrSlug: string): DemoPdp | null {
  const product = getUmtubaDemoProduct(idOrSlug);
  if (!product) return null;
  return {
    product,
    purchasable: false,
    checkoutAllowed: false,
    label: "UMTUBA Demo Catalog — not real partner inventory",
  };
}

export function toggleDemoFavorite(
  favorites: readonly string[],
  productId: string
): string[] {
  return favorites.includes(productId)
    ? favorites.filter((id) => id !== productId)
    : [...favorites, productId];
}

export function addDemoCartLine(
  lines: readonly DemoCartLine[],
  productId: string,
  variantId: string
): { ok: true; lines: DemoCartLine[] } | { ok: false; message: string } {
  const product = getUmtubaDemoProduct(productId);
  if (!product) return { ok: false, message: "Unknown demo product." };
  const variant = product.variants.find((row) => row.id === variantId);
  if (!variant) return { ok: false, message: "Unknown demo variant." };
  const existing = lines.find((line) => line.variantId === variantId);
  if (existing) {
    return {
      ok: true,
      lines: lines.map((line) =>
        line.variantId === variantId ? { ...line, quantity: line.quantity + 1 } : line
      ),
    };
  }
  return { ok: true, lines: [...lines, { productId, variantId, quantity: 1 }] };
}

export function demoCheckoutSandbox(): DemoCheckoutSandbox {
  return {
    allowed: false,
    reason: "DEMO products cannot become production-purchasable.",
    liveCheckoutInvented: false,
  };
}

export function assertDemoIsolation(product: DemoProduct): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (product.sourceType !== "DEMO") reasons.push("SOURCE_TYPE must be DEMO.");
  if (product.rightsStatus !== "DEMO_ONLY") reasons.push("RIGHTS_STATUS must be DEMO_ONLY.");
  if (product.purchasable !== false) reasons.push("PURCHASABLE must be NO.");
  if (product.productionSellable !== false) reasons.push("PRODUCTION_SELLABLE must be NO.");
  if (product.realProvider !== "NONE") reasons.push("REAL_PROVIDER must be NONE.");
  if (product.imagePolicy !== "UMTUBA_NEUTRAL_PLACEHOLDER") {
    reasons.push("Images must be UMTUBA/neutral placeholders.");
  }
  const hay = `${product.title} ${product.description}`.toLowerCase();
  for (const token of ["shein", "temu", "amazon", "aliexpress", "alibaba", "trendyol", "ebay", "dhgate"]) {
    if (hay.includes(token)) reasons.push("Forbidden marketplace token.");
  }
  return { ok: reasons.length === 0, reasons };
}
