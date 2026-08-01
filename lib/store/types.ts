export const STORE_MEMBER_ROLES = [
  "owner",
  "manager",
  "catalog_editor",
  "viewer",
] as const;
export type StoreMemberRole = (typeof STORE_MEMBER_ROLES)[number];

export const PRODUCT_TYPES = [
  "physical",
  "digital",
  "service",
  "subscription",
  "bundle",
  "booking",
] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_STATUSES = [
  "draft",
  "in_review",
  "pending_review",
  "active",
  "rejected",
  "paused",
  "hidden",
  "blocked",
  "archived",
] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const MODERATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_changes",
] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export type StoreRow = {
  id: string;
  owner_user_id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_path: string | null;
  cover_path: string | null;
  status: string;
  verification_status: string;
  default_currency: string;
  country_code: string | null;
  /** Marketplace Foundation V1 — public store profile fields. */
  city?: string | null;
  public_contact_email?: string | null;
  public_contact_phone?: string | null;
  public_contact_url?: string | null;
  /** Seller Self-Service V1 — storefront template + policies. */
  store_template?: string | null;
  tagline?: string | null;
  return_policy?: string | null;
  shipping_policy?: string | null;
  privacy_policy?: string | null;
  /** Supplier→Seller Marketplace V1 — store may supply products to other sellers. */
  marketplace_supplier_enabled?: boolean;
  created_at: string;
  updated_at: string;
};

export type StoreProductRow = {
  id: string;
  store_id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  product_type: ProductType;
  status: ProductStatus;
  moderation_status: ModerationStatus;
  primary_category_id: string | null;
  brand_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  /** Store Hardening V1 — operator moderation note. */
  review_note?: string | null;
  reviewed_at?: string | null;
  /** Marketplace Foundation V1 — kept in sync with `product_type` by DB trigger. */
  item_type?: ProductType;
  /** Marketplace Foundation V1 — optional logistics fields (physical goods). */
  weight_grams?: number | null;
  length_mm?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
  origin_country_code?: string | null;
  /** Physical Commerce Foundation V1 — shipping / fulfillment metadata. */
  shipping_required?: boolean | null;
  inventory_tracked?: boolean | null;
  fulfillment_required?: boolean | null;
  shippable?: boolean | null;
  weight_unit?: string | null;
  dimension_unit?: string | null;
  shipping_class?: string | null;
  fragile?: boolean;
  special_handling?: boolean;
  package_weight_grams?: number | null;
  package_length_mm?: number | null;
  package_width_mm?: number | null;
  package_height_mm?: number | null;
  /** Supplier→Seller Marketplace V1 — product may be listed by other sellers. */
  marketplace_eligible?: boolean;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  sku: string;
  title: string;
  option_values: Record<string, string>;
  status: string;
  created_at: string;
  updated_at: string;
  /** Physical Commerce Foundation V1 */
  barcode?: string | null;
  weight_grams?: number | null;
  length_mm?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
};

export type ProductPriceRow = {
  id: string;
  variant_id: string;
  currency: string;
  amount_minor: number;
  compare_at_amount_minor: number | null;
  country_code: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
};

export type ProductInventoryRow = {
  id: string;
  variant_id: string;
  warehouse_key: string;
  on_hand: number;
  reserved: number;
  safety_stock: number;
  allow_backorder: boolean;
  /** Physical Commerce Foundation V1 */
  low_stock_threshold?: number;
};

export type ProductMediaRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  media_type: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  role: string;
  status: string;
};

export type ProductCategoryRow = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  status: string;
  /** Marketplace Foundation V1 — manual display ordering (lower first). */
  sort_order?: number;
};

export type PublicCatalogItem = {
  product: StoreProductRow;
  store: Pick<StoreRow, "id" | "slug" | "name" | "logo_path" | "status">;
  coverPath: string | null;
  /** Short-lived signed Storage URL (server-authorized). */
  coverUrl?: string | null;
  priceMinor: number | null;
  /** Compare-at only when an active price row provides a higher legitimate amount. */
  compareAtMinor?: number | null;
  currency: string | null;
  available: number | null;
  /** Present when card represents a supplier-sourced seller listing. */
  sellerListingId?: string | null;
  /** Supplier store id when listing-backed; null/undefined for owned. */
  supplierStoreId?: string | null;
  marketplaceSourceType?: "owned" | "supplier_listing";
};

export type PublicProductDetail = {
  product: StoreProductRow;
  store: StoreRow;
  variants: Array<{
    variant: ProductVariantRow;
    price: ProductPriceRow | null;
    inventory: ProductInventoryRow | null;
    available: number;
  }>;
  media: Array<ProductMediaRow & { mediaUrl?: string | null }>;
  category: ProductCategoryRow | null;
  /** Listing-backed PDP fields */
  sellerListingId?: string | null;
  supplierStoreId?: string | null;
  supplierStoreName?: string | null;
  marketplaceSourceType?: "owned" | "supplier_listing";
  displayTitle?: string | null;
  purchaseAllowed?: boolean;
  purchaseBlockedReason?: string | null;
};

/** Orders Foundation V1 — lifecycle status (DB lowercase; labels elsewhere). */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  "unfulfilled",
  "partial",
  "fulfilled",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export type StoreOrderRow = {
  id: string;
  buyer_id: string;
  store_id: string;
  order_number: string;
  idempotency_key: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  subtotal_minor: number;
  discount_total_minor: number;
  tax_total_minor: number;
  shipping_total_minor: number;
  grand_total_minor: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Checkout Foundation snapshots (immutable once set). */
  shipping_address_snapshot?: Record<string, unknown> | null;
  billing_contact_snapshot?: Record<string, unknown> | null;
  shipping_method_code?: string | null;
  shipping_method_name?: string | null;
  shipping_estimate_text?: string | null;
  coupon_code_snapshot?: string | null;
  checkout_quote_id?: string | null;
  tax_snapshot?: Record<string, unknown> | null;
  discount_snapshot?: Record<string, unknown> | null;
  /** Order Management V1 lifecycle stamps (set-once on transition). */
  confirmed_at?: string | null;
  processing_at?: string | null;
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
};

export type StoreOrderStatusHistoryRow = {
  id: string;
  order_id: string;
  actor_user_id: string | null;
  from_status: OrderStatus | null;
  to_status: OrderStatus | null;
  from_fulfillment_status: FulfillmentStatus | null;
  to_fulfillment_status: FulfillmentStatus | null;
  from_payment_status: PaymentStatus | null;
  to_payment_status: PaymentStatus | null;
  note: string | null;
  source: "seller" | "system" | "admin" | "buyer";
  created_at: string;
};

export type StoreOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  /** Required in Orders Foundation V1 (authoritative price is variant-scoped). */
  variant_id: string;
  seller_user_id: string;
  quantity: number;
  unit_price_minor: number;
  total_price_minor: number;
  product_snapshot: Record<string, unknown>;
  sku_snapshot: string;
  title_snapshot: string;
  variant_title_snapshot: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreOrderMoneyInput = {
  currency: string;
  subtotalMinor: number;
  discountTotalMinor: number;
  taxTotalMinor: number;
  shippingTotalMinor: number;
  /** Optional; when set must equal computed grand total. */
  grandTotalMinor?: number;
};

export type StoreOrderItemSnapshotInput = {
  currency: string;
  quantity: unknown;
  unitPriceMinor: unknown;
  totalPriceMinor?: number;
  skuSnapshot: string;
  titleSnapshot: string;
  variantTitleSnapshot?: string | null;
  productSnapshot: Record<string, unknown>;
};
