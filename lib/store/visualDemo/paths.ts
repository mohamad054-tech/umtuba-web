export const VISUAL_DEMO_BASE = "/sandbox/store-visual";

export const visualDemoHref = {
  home: VISUAL_DEMO_BASE,
  product: (slug: string) => `${VISUAL_DEMO_BASE}/product/${slug}`,
  cart: `${VISUAL_DEMO_BASE}/cart`,
  checkout: `${VISUAL_DEMO_BASE}/checkout`,
  sellerStore: (slug: string) => `${VISUAL_DEMO_BASE}/store/${slug}`,
  becomeSeller: `${VISUAL_DEMO_BASE}/become-a-seller`,
  sellerCenter: `${VISUAL_DEMO_BASE}/seller`,
  addProduct: `${VISUAL_DEMO_BASE}/seller/product/new`,
  orders: `${VISUAL_DEMO_BASE}/seller/orders`,
  returns: `${VISUAL_DEMO_BASE}/seller/returns`,
  reviews: `${VISUAL_DEMO_BASE}/seller/reviews`,
  analytics: `${VISUAL_DEMO_BASE}/seller/analytics`,
  watch: `${VISUAL_DEMO_BASE}/watch`,
} as const;

export type VisualSurfaceLabel =
  | "FUNCTIONAL_EXISTING"
  | "VISUAL_DEMO"
  | "FUNCTIONAL_WIRING_PENDING";

export type VisualDemoRoute =
  | { kind: "home" }
  | { kind: "product"; slug: string }
  | { kind: "cart" }
  | { kind: "checkout" }
  | { kind: "sellerStore"; slug: string }
  | { kind: "becomeSeller" }
  | { kind: "sellerCenter" }
  | { kind: "addProduct" }
  | { kind: "orders" }
  | { kind: "returns" }
  | { kind: "reviews" }
  | { kind: "analytics" }
  | { kind: "watch" }
  | { kind: "unknown" };

export function parseVisualDemoRoute(segments: string[] | undefined): VisualDemoRoute {
  const parts = segments ?? [];
  if (parts.length === 0) return { kind: "home" };
  if (parts[0] === "cart") return { kind: "cart" };
  if (parts[0] === "checkout") return { kind: "checkout" };
  if (parts[0] === "become-a-seller") return { kind: "becomeSeller" };
  if (parts[0] === "watch") return { kind: "watch" };
  if (parts[0] === "product" && parts[1]) return { kind: "product", slug: parts[1] };
  if (parts[0] === "store" && parts[1]) return { kind: "sellerStore", slug: parts[1] };
  if (parts[0] === "seller" && parts.length === 1) return { kind: "sellerCenter" };
  if (parts[0] === "seller" && parts[1] === "product" && parts[2] === "new") {
    return { kind: "addProduct" };
  }
  if (parts[0] === "seller" && parts[1] === "orders") return { kind: "orders" };
  if (parts[0] === "seller" && parts[1] === "returns") return { kind: "returns" };
  if (parts[0] === "seller" && parts[1] === "reviews") return { kind: "reviews" };
  if (parts[0] === "seller" && parts[1] === "analytics") return { kind: "analytics" };
  return { kind: "unknown" };
}

export function withLocale(href: string, hl: "en" | "ar"): string {
  if (hl === "en") return href;
  return href.includes("?") ? `${href}&hl=ar` : `${href}?hl=ar`;
}
