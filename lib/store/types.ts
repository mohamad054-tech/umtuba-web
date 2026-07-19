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
  /** Marketplace Foundation V1 — kept in sync with `product_type` by DB trigger. */
  item_type?: ProductType;
  /** Marketplace Foundation V1 — optional logistics fields (physical goods). */
  weight_grams?: number | null;
  length_mm?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
  origin_country_code?: string | null;
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
  priceMinor: number | null;
  currency: string | null;
  available: number | null;
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
  media: ProductMediaRow[];
  category: ProductCategoryRow | null;
};
