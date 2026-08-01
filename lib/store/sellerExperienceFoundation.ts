/**
 * Seller Experience Foundation V1 — pure derivation.
 * Composes existing seller catalog / order / analytics facts into
 * dashboard summary, product health, action center, analytics foundation,
 * and store readiness. Not a source of truth. No migrations. No money writes.
 */

import type { AnalyticsTopProductRow } from "./analyticsFinance";
import {
  deriveProductSnapshot,
  deriveStoreReadiness,
  type SellerDashboardOrderSnapshot,
  type SellerDashboardProductSnapshot,
  type SellerDashboardStoreReadiness,
} from "./sellerDashboardInsights";
import type { StoreProductRow } from "./types";

export const SELLER_EXPERIENCE_FOUNDATION_ID =
  "commerce.seller.experience_foundation_v1" as const;

const HREF = {
  products: "/seller/store/products",
  productNew: "/seller/store/products/new",
  setup: "/seller/setup",
  orders: "/seller/store/orders",
  analytics: "/seller/store/analytics",
  store: "/seller/store",
} as const;

export type SellerProductHealthCode =
  | "complete"
  | "missing_title"
  | "missing_images"
  | "missing_description"
  | "missing_pricing"
  | "missing_category"
  | "missing_inventory"
  | "inventory_required"
  | "missing_digital_asset"
  | "missing_physical_metadata"
  | "pending_review"
  | "rejected"
  | "published"
  | "draft"
  | "ready_to_publish";

export type SellerProductHealthItem = {
  productId: string;
  title: string;
  status: string;
  moderationStatus: string;
  codes: SellerProductHealthCode[];
  /** 0–100 completeness for catalog fields (status-independent). */
  completenessScore: number;
  primaryIssue: SellerProductHealthCode | null;
  href: string;
};

export type SellerActionCenterCard = {
  id: string;
  severity: "critical" | "warn" | "info";
  title: string;
  reason: string;
  href: string;
  actionLabel: string;
  count?: number;
};

export type SellerExperienceSummary = {
  capability: typeof SELLER_EXPERIENCE_FOUNDATION_ID;
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeStatus: string;
  verificationStatus: string;
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  inReviewProducts: number;
  rejectedProducts: number;
  ordersSummary: {
    totalOrders: number;
    openOrders: number;
    completedOrders: number;
    currency: string | null;
    paidOrderValueMinor: number | null;
    /** Gross from recent window — not profit. */
    grossOrderValueMinor: number | null;
    scopeLabel: string;
  } | null;
  revenueSummary: {
    gmvMinor: number | null;
    netSalesMinor: number | null;
    currency: string | null;
    periodLabel: string | null;
    /** Explicit: not settlement/payout/commission. */
    readOnly: true;
  } | null;
  productSnapshot: SellerDashboardProductSnapshot;
};

export type SellerAnalyticsFoundation = {
  capability: typeof SELLER_EXPERIENCE_FOUNDATION_ID;
  productViews: number | null;
  storeViews: number | null;
  orders: number | null;
  salesMinor: number | null;
  currency: string | null;
  /** orders / storeViews when both known; otherwise null. */
  conversionRate: number | null;
  topProducts: Array<{
    productId: string | null;
    title: string;
    units: number;
    salesMinor: number;
  }>;
  periodLabel: string | null;
  /** False when no trusted analytics rows/sales are available. */
  hasData: boolean;
  notes: string[];
};

export type SellerStoreReadinessChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  weight: number;
  suggestion: string;
};

export type SellerStoreReadinessReport = {
  capability: typeof SELLER_EXPERIENCE_FOUNDATION_ID;
  readyToSell: boolean;
  readinessPercent: number;
  missing: string[];
  suggestions: string[];
  checklist: SellerStoreReadinessChecklistItem[];
  base: SellerDashboardStoreReadiness;
};

export type SellerExperienceBundle = {
  capability: typeof SELLER_EXPERIENCE_FOUNDATION_ID;
  summary: SellerExperienceSummary;
  productHealth: SellerProductHealthItem[];
  actionCenter: SellerActionCenterCard[];
  analytics: SellerAnalyticsFoundation;
  storeReadiness: SellerStoreReadinessReport;
};

export type SellerProductHealthFacts = {
  product: StoreProductRow;
  /** When known from media query; omit if unknown. */
  hasImages?: boolean;
  /** When known from price query; omit if unknown. */
  hasPricing?: boolean;
  /**
   * When known from inventory presence for finite types.
   * Omit entirely to skip missing_inventory (do not invent inventory logic).
   */
  hasInventoryRow?: boolean;
  /** Digital products only — active deliverable present. */
  hasDigitalAsset?: boolean;
  /** Physical products — weight/dims or shipping metadata present. */
  hasPhysicalMetadata?: boolean;
  /** Inventory tracking required for this product type. */
  inventoryRequired?: boolean;
};

function hasText(value: string | null | undefined, min = 1): boolean {
  return typeof value === "string" && value.trim().length >= min;
}

/**
 * Per-product health codes. Optional media/price/inventory facts are fail-open
 * when omitted (unknown), fail-closed only when explicitly false.
 */
export function deriveSellerProductHealth(
  facts: SellerProductHealthFacts
): SellerProductHealthItem {
  const p = facts.product;
  const codes: SellerProductHealthCode[] = [];

  if (!hasText(p.title, 2)) codes.push("missing_title");
  if (p.status === "draft") codes.push("draft");
  if (p.status === "active") codes.push("published");
  if (p.status === "rejected" || p.moderation_status === "rejected") {
    codes.push("rejected");
  }
  if (
    p.status === "in_review" ||
    p.status === "pending_review" ||
    p.moderation_status === "pending" ||
    p.moderation_status === "needs_changes"
  ) {
    codes.push("pending_review");
  }

  const hasDescription =
    hasText(p.description, 20) || hasText(p.short_description, 8);
  if (!hasDescription) codes.push("missing_description");
  if (!p.primary_category_id) codes.push("missing_category");

  if (facts.hasImages === false) codes.push("missing_images");
  if (facts.hasPricing === false) codes.push("missing_pricing");
  if (facts.inventoryRequired === true) {
    codes.push("inventory_required");
    if (facts.hasInventoryRow === false) codes.push("missing_inventory");
  } else if (facts.hasInventoryRow === false) {
    codes.push("missing_inventory");
  }
  if (facts.hasDigitalAsset === false) codes.push("missing_digital_asset");
  if (facts.hasPhysicalMetadata === false) {
    codes.push("missing_physical_metadata");
  }

  let fieldScore = 0;
  let fieldTotal = 3; // title, description, category
  if (hasText(p.title, 2)) fieldScore += 1;
  if (hasDescription) fieldScore += 1;
  if (p.primary_category_id) fieldScore += 1;
  if (facts.hasImages !== undefined) {
    fieldTotal += 1;
    if (facts.hasImages) fieldScore += 1;
  }
  if (facts.hasPricing !== undefined) {
    fieldTotal += 1;
    if (facts.hasPricing) fieldScore += 1;
  }
  if (facts.hasInventoryRow !== undefined) {
    fieldTotal += 1;
    if (facts.hasInventoryRow) fieldScore += 1;
  }
  if (facts.hasDigitalAsset !== undefined) {
    fieldTotal += 1;
    if (facts.hasDigitalAsset) fieldScore += 1;
  }
  if (facts.hasPhysicalMetadata !== undefined) {
    fieldTotal += 1;
    if (facts.hasPhysicalMetadata) fieldScore += 1;
  }

  const completenessScore = Math.round(
    (fieldScore / Math.max(fieldTotal, 1)) * 100
  );

  const catalogGaps = [
    "missing_title",
    "missing_description",
    "missing_category",
    "missing_images",
    "missing_pricing",
    "missing_inventory",
    "missing_digital_asset",
    "missing_physical_metadata",
  ] as const;
  const hasCatalogGap = catalogGaps.some((c) => codes.includes(c));

  if (!hasCatalogGap && p.status === "draft" && !codes.includes("rejected")) {
    codes.push("ready_to_publish");
  }

  const blocking: SellerProductHealthCode[] = [
    "rejected",
    "missing_title",
    "missing_pricing",
    "missing_images",
    "missing_description",
    "missing_category",
    "missing_inventory",
    "missing_digital_asset",
    "missing_physical_metadata",
    "pending_review",
    "draft",
  ];
  const primaryIssue =
    blocking.find((c) => codes.includes(c)) ??
    (completenessScore >= 100 && p.status === "active" ? null : codes[0] ?? null);

  if (
    completenessScore >= 100 &&
    p.status === "active" &&
    p.moderation_status === "approved" &&
    !hasCatalogGap
  ) {
    codes.push("complete");
  }

  return {
    productId: p.id,
    title: p.title,
    status: p.status,
    moderationStatus: p.moderation_status,
    codes: [...new Set(codes)],
    completenessScore,
    primaryIssue: codes.includes("complete") ? null : primaryIssue,
    href: `${HREF.products}/${p.id}/edit`,
  };
}

export function deriveSellerActionCenter(
  health: SellerProductHealthItem[],
  store: { storeStatus: string; verificationStatus: string }
): SellerActionCenterCard[] {
  const cards: SellerActionCenterCard[] = [];

  if (store.storeStatus !== "active") {
    cards.push({
      id: "store-inactive",
      severity: "critical",
      title: "فعّل حالة المتجر",
      reason: "المتجر غير نشط — البيع العام غير متاح.",
      href: HREF.store,
      actionLabel: "مراجعة إعدادات المتجر",
    });
  }
  if (store.verificationStatus !== "verified") {
    cards.push({
      id: "store-unverified",
      severity: "warn",
      title: "أكمل توثيق المتجر",
      reason: "التوثيق غير مكتمل — قد يبقى إنشاء الكتالوج مقفلاً.",
      href: HREF.setup,
      actionLabel: "فتح الإعداد",
    });
  }

  const missingDesc = health.filter((h) =>
    h.codes.includes("missing_description")
  );
  if (missingDesc.length) {
    cards.push({
      id: "complete-product-data",
      severity: "warn",
      title: "أكمل بيانات المنتج",
      reason: `${missingDesc.length} منتجًا ينقصه وصف كافٍ.`,
      href: HREF.products,
      actionLabel: "فتح المنتجات",
      count: missingDesc.length,
    });
  }

  const missingImages = health.filter((h) => h.codes.includes("missing_images"));
  if (missingImages.length) {
    cards.push({
      id: "add-images",
      severity: "warn",
      title: "أضف صورًا",
      reason: `${missingImages.length} منتجًا بلا صور.`,
      href: HREF.products,
      actionLabel: "إضافة صور",
      count: missingImages.length,
    });
  }

  const drafts = health.filter((h) => h.codes.includes("draft"));
  if (drafts.length) {
    cards.push({
      id: "submit-review",
      severity: "info",
      title: "أرسل للمراجعة",
      reason: `${drafts.length} مسودة جاهزة للمتابعة نحو المراجعة.`,
      href: HREF.products,
      actionLabel: "مراجعة المسودات",
      count: drafts.length,
    });
  }

  const rejected = health.filter((h) => h.codes.includes("rejected"));
  if (rejected.length) {
    cards.push({
      id: "rejected-products",
      severity: "critical",
      title: "منتجات مرفوضة",
      reason: `${rejected.length} منتجًا مرفوضًا يحتاج إصلاحًا.`,
      href: HREF.products,
      actionLabel: "إصلاح المرفوض",
      count: rejected.length,
    });
  }

  const fixErrors = health.filter(
    (h) =>
      h.codes.includes("missing_pricing") ||
      h.codes.includes("missing_inventory") ||
      h.primaryIssue === "missing_description"
  );
  if (fixErrors.length) {
    cards.push({
      id: "fix-errors",
      severity: "warn",
      title: "أصلح الأخطاء",
      reason: `${fixErrors.length} منتجًا يحتاج إصلاح حقول ناقصة.`,
      href: HREF.products,
      actionLabel: "إصلاح الأخطاء",
      count: fixErrors.length,
    });
  }

  const needsUpdate = health.filter(
    (h) =>
      h.codes.includes("published") &&
      h.completenessScore < 100 &&
      !h.codes.includes("rejected")
  );
  if (needsUpdate.length) {
    cards.push({
      id: "needs-update",
      severity: "info",
      title: "منتجات تحتاج تحديث",
      reason: `${needsUpdate.length} منتجًا منشورًا غير مكتمل البيانات.`,
      href: HREF.products,
      actionLabel: "تحديث المنتجات",
      count: needsUpdate.length,
    });
  }

  const requiringAttention = health.filter(
    (h) =>
      h.primaryIssue != null &&
      h.primaryIssue !== "published" &&
      h.primaryIssue !== "complete"
  );
  if (requiringAttention.length) {
    cards.push({
      id: "requiring-attention",
      severity: "warn",
      title: "منتجات تحتاج انتباهًا",
      reason: `${requiringAttention.length} منتجًا يحتاج متابعة.`,
      href: HREF.products,
      actionLabel: "مراجعة المنتجات",
      count: requiringAttention.length,
    });
  }

  if (!health.length) {
    cards.push({
      id: "create-first-product",
      severity: "info",
      title: "أنشئ أول منتج",
      reason: "لا توجد منتجات بعد في هذا المتجر.",
      href: HREF.productNew,
      actionLabel: "منتج جديد",
    });
  }

  return cards;
}

export function deriveSellerExperienceSummary(input: {
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeStatus: string;
  verificationStatus: string;
  products: StoreProductRow[];
  orderSnapshot?: SellerDashboardOrderSnapshot | null;
  revenue?: {
    gmvMinor: number | null;
    netSalesMinor: number | null;
    currency: string | null;
    periodLabel: string | null;
  } | null;
}): SellerExperienceSummary {
  const productSnapshot = deriveProductSnapshot(input.products);
  return {
    capability: SELLER_EXPERIENCE_FOUNDATION_ID,
    storeId: input.storeId,
    storeName: input.storeName,
    storeSlug: input.storeSlug,
    storeStatus: input.storeStatus,
    verificationStatus: input.verificationStatus,
    totalProducts: productSnapshot.total,
    publishedProducts: productSnapshot.active,
    draftProducts: productSnapshot.draft,
    inReviewProducts: productSnapshot.inReview,
    rejectedProducts: productSnapshot.rejected,
    ordersSummary: input.orderSnapshot
      ? {
          totalOrders: input.orderSnapshot.totalOrders,
          openOrders: input.orderSnapshot.openOrders,
          completedOrders: input.orderSnapshot.completedOrders,
          currency: input.orderSnapshot.currency,
          paidOrderValueMinor: input.orderSnapshot.paidOrderValueMinor,
          grossOrderValueMinor: input.orderSnapshot.grossOrderValueMinor,
          scopeLabel: input.orderSnapshot.scopeLabel,
        }
      : null,
    revenueSummary: input.revenue
      ? {
          gmvMinor: input.revenue.gmvMinor,
          netSalesMinor: input.revenue.netSalesMinor,
          currency: input.revenue.currency,
          periodLabel: input.revenue.periodLabel,
          readOnly: true,
        }
      : null,
    productSnapshot,
  };
}

/**
 * Lightweight analytics foundation — no event pipeline, no tracking SDK.
 * Views may be null until a future telemetry source exists.
 */
export function deriveSellerAnalyticsFoundation(input: {
  productViews?: number | null;
  storeViews?: number | null;
  orders?: number | null;
  salesMinor?: number | null;
  currency?: string | null;
  topProducts?: AnalyticsTopProductRow[] | null;
  periodLabel?: string | null;
}): SellerAnalyticsFoundation {
  const notes: string[] = [];
  const productViews =
    typeof input.productViews === "number" && Number.isFinite(input.productViews)
      ? Math.max(0, Math.floor(input.productViews))
      : null;
  const storeViews =
    typeof input.storeViews === "number" && Number.isFinite(input.storeViews)
      ? Math.max(0, Math.floor(input.storeViews))
      : null;
  const orders =
    typeof input.orders === "number" && Number.isFinite(input.orders)
      ? Math.max(0, Math.floor(input.orders))
      : null;
  const salesMinor =
    typeof input.salesMinor === "number" && Number.isFinite(input.salesMinor)
      ? Math.trunc(input.salesMinor)
      : null;

  if (productViews == null && storeViews == null) {
    notes.push("No data yet");
  }

  let conversionRate: number | null = null;
  if (storeViews != null && storeViews > 0 && orders != null) {
    conversionRate = Number(((orders / storeViews) * 100).toFixed(2));
  } else if (storeViews === 0 && orders != null) {
    conversionRate = 0;
  }

  const topProducts = (input.topProducts ?? []).slice(0, 5).map((row) => ({
    productId: row.productId ?? null,
    title: row.title || "Product",
    units: row.quantitySold ?? 0,
    salesMinor: row.merchandiseSubtotalMinor ?? 0,
  }));

  const hasData =
    (orders != null && orders > 0) ||
    (salesMinor != null && salesMinor !== 0) ||
    topProducts.length > 0 ||
    productViews != null ||
    storeViews != null;

  if (!hasData && !notes.includes("No data yet")) {
    notes.push("No data yet");
  }

  return {
    capability: SELLER_EXPERIENCE_FOUNDATION_ID,
    productViews,
    storeViews,
    orders,
    salesMinor,
    currency: input.currency ?? null,
    conversionRate,
    topProducts,
    periodLabel: input.periodLabel ?? null,
    hasData,
    notes,
  };
}

export function deriveSellerStoreReadinessReport(input: {
  storeStatus: string;
  verificationStatus: string;
  products: StoreProductRow[];
  health?: SellerProductHealthItem[];
  /** Store profile fields present (name/slug/etc already on store row). */
  profileComplete?: boolean;
  /** Existing payout eligibility/config signal when available. */
  payoutConfigured?: boolean | null;
}): SellerStoreReadinessReport {
  const productSnapshot = deriveProductSnapshot(input.products);
  const base = deriveStoreReadiness({
    storeStatus: input.storeStatus,
    verificationStatus: input.verificationStatus,
    productSnapshot,
  });

  const health = input.health ?? input.products.map((product) =>
    deriveSellerProductHealth({ product })
  );

  const hasCompletePublished = health.some((h) => h.codes.includes("complete"));
  const hasPricingGaps = health.some((h) => h.codes.includes("missing_pricing"));
  const hasImageGaps = health.some((h) => h.codes.includes("missing_images"));
  const hasRejected = health.some((h) => h.codes.includes("rejected"));
  const productsReady =
    hasCompletePublished ||
    (base.hasActiveProducts && !hasPricingGaps && !hasImageGaps);
  const profileComplete =
    input.profileComplete ??
    (base.storeActive && base.storeVerified);
  const payoutConfigured = input.payoutConfigured;

  const checklist: SellerStoreReadinessChecklistItem[] = [
    {
      id: "profile-complete",
      label: "الملف الشخصي مكتمل",
      done: profileComplete,
      weight: 20,
      suggestion: "أكمل اسم المتجر والتوثيق من الإعداد.",
    },
    {
      id: "store-active",
      label: "المتجر نشط",
      done: base.storeActive,
      weight: 15,
      suggestion: "فعّل حالة المتجر من الإعدادات.",
    },
    {
      id: "store-verified",
      label: "المتجر موثّق",
      done: base.storeVerified,
      weight: 15,
      suggestion: "أكمل خطوات التوثيق في الإعداد.",
    },
    {
      id: "products-ready",
      label: "منتجات جاهزة",
      done: productsReady,
      weight: 20,
      suggestion: "أكمل بيانات منتج منشور واحد على الأقل.",
    },
    {
      id: "no-rejected",
      label: "لا منتجات مرفوضة معلّقة",
      done: !hasRejected,
      weight: 15,
      suggestion: "أصلح المنتجات المرفوضة أو أرشفتها.",
    },
  ];

  if (payoutConfigured !== null && payoutConfigured !== undefined) {
    checklist.push({
      id: "payout-configured",
      label: "إعدادات الدفع للبائع",
      done: payoutConfigured,
      weight: 15,
      suggestion: "راجع أهلية الدفع من لوحة البائع عند توفرها.",
    });
  } else {
    checklist.push({
      id: "required-information",
      label: "المعلومات المطلوبة للكتالوج",
      done: base.hasActiveProducts && !hasPricingGaps,
      weight: 15,
      suggestion: "أضف سعرًا وفئة ووصفًا للمنتجات.",
    });
  }

  const earned = checklist.reduce((sum, item) => sum + (item.done ? item.weight : 0), 0);
  const readinessPercent = Math.min(100, Math.max(0, earned));
  const missing = checklist.filter((c) => !c.done).map((c) => c.label);
  const suggestions = checklist.filter((c) => !c.done).map((c) => c.suggestion);
  const readyToSell =
    base.catalogReady && readinessPercent >= 85 && !hasRejected;

  return {
    capability: SELLER_EXPERIENCE_FOUNDATION_ID,
    readyToSell,
    readinessPercent,
    missing,
    suggestions,
    checklist,
    base,
  };
}

export function buildSellerExperienceBundle(input: {
  storeId: string;
  storeName: string;
  storeSlug: string;
  storeStatus: string;
  verificationStatus: string;
  products: StoreProductRow[];
  productFacts?: SellerProductHealthFacts[];
  orderSnapshot?: SellerDashboardOrderSnapshot | null;
  revenue?: {
    gmvMinor: number | null;
    netSalesMinor: number | null;
    currency: string | null;
    periodLabel: string | null;
  } | null;
  analytics?: {
    productViews?: number | null;
    storeViews?: number | null;
    orders?: number | null;
    salesMinor?: number | null;
    currency?: string | null;
    topProducts?: AnalyticsTopProductRow[] | null;
    periodLabel?: string | null;
  };
  profileComplete?: boolean;
  payoutConfigured?: boolean | null;
}): SellerExperienceBundle {
  const factsById = new Map(
    (input.productFacts ?? []).map((f) => [f.product.id, f] as const)
  );
  const productHealth = input.products.map((product) =>
    deriveSellerProductHealth(
      factsById.get(product.id) ?? { product }
    )
  );

  const summary = deriveSellerExperienceSummary({
    storeId: input.storeId,
    storeName: input.storeName,
    storeSlug: input.storeSlug,
    storeStatus: input.storeStatus,
    verificationStatus: input.verificationStatus,
    products: input.products,
    orderSnapshot: input.orderSnapshot,
    revenue: input.revenue,
  });

  const actionCenter = deriveSellerActionCenter(productHealth, {
    storeStatus: input.storeStatus,
    verificationStatus: input.verificationStatus,
  });

  const analytics = deriveSellerAnalyticsFoundation({
    productViews: input.analytics?.productViews,
    storeViews: input.analytics?.storeViews,
    orders:
      input.analytics?.orders ??
      input.orderSnapshot?.totalOrders ??
      null,
    salesMinor:
      input.analytics?.salesMinor ??
      input.revenue?.netSalesMinor ??
      input.revenue?.gmvMinor ??
      null,
    currency:
      input.analytics?.currency ??
      input.revenue?.currency ??
      input.orderSnapshot?.currency ??
      null,
    topProducts: input.analytics?.topProducts,
    periodLabel:
      input.analytics?.periodLabel ?? input.revenue?.periodLabel ?? null,
  });

  const storeReadiness = deriveSellerStoreReadinessReport({
    storeStatus: input.storeStatus,
    verificationStatus: input.verificationStatus,
    products: input.products,
    health: productHealth,
    profileComplete: input.profileComplete,
    payoutConfigured: input.payoutConfigured,
  });

  return {
    capability: SELLER_EXPERIENCE_FOUNDATION_ID,
    summary,
    productHealth,
    actionCenter,
    analytics,
    storeReadiness,
  };
}
