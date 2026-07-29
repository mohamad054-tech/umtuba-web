import { PRODUCT_TYPES, type ProductType } from "./types";
import { validateAmountMinor } from "./money";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const SKU_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function validateStoreCreateInput(input: {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  defaultCurrency?: unknown;
  countryCode?: unknown;
}):
  | {
      ok: true;
      value: {
        name: string;
        slug: string;
        description: string | null;
        defaultCurrency: string;
        countryCode: string | null;
      };
    }
  | { ok: false; message: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return { ok: false, message: "Store name must be 2–80 characters." };
  }

  const slugRaw =
    typeof input.slug === "string" && input.slug.trim()
      ? slugify(input.slug)
      : slugify(name);
  if (!isValidSlug(slugRaw)) {
    return { ok: false, message: "Store slug is invalid." };
  }

  const description =
    typeof input.description === "string" && input.description.trim()
      ? input.description.trim().slice(0, 2000)
      : null;

  const defaultCurrency =
    typeof input.defaultCurrency === "string"
      ? input.defaultCurrency.trim().toUpperCase()
      : "USD";
  if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
    return { ok: false, message: "Default currency must be a 3-letter code." };
  }

  let countryCode: string | null = null;
  if (typeof input.countryCode === "string" && input.countryCode.trim()) {
    countryCode = input.countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return { ok: false, message: "Country code must be 2 letters." };
    }
  }

  return {
    ok: true,
    value: { name, slug: slugRaw, description, defaultCurrency, countryCode },
  };
}

export function validateProductDraftInput(input: {
  title?: unknown;
  slug?: unknown;
  shortDescription?: unknown;
  description?: unknown;
  productType?: unknown;
}):
  | {
      ok: true;
      value: {
        title: string;
        slug: string;
        shortDescription: string | null;
        description: string | null;
        productType: ProductType;
      };
    }
  | { ok: false; message: string } {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length < 2 || title.length > 160) {
    return { ok: false, message: "Title must be 2–160 characters." };
  }

  const slugRaw =
    typeof input.slug === "string" && input.slug.trim()
      ? slugify(input.slug)
      : slugify(title);
  if (!isValidSlug(slugRaw)) {
    return { ok: false, message: "Product slug is invalid." };
  }

  const productType =
    typeof input.productType === "string" ? input.productType.trim() : "";
  if (!PRODUCT_TYPES.includes(productType as ProductType)) {
    return { ok: false, message: "Product type is invalid." };
  }

  const shortDescription =
    typeof input.shortDescription === "string" && input.shortDescription.trim()
      ? input.shortDescription.trim().slice(0, 280)
      : null;
  const description =
    typeof input.description === "string" && input.description.trim()
      ? input.description.trim().slice(0, 10000)
      : null;

  return {
    ok: true,
    value: {
      title,
      slug: slugRaw,
      shortDescription,
      description,
      productType: productType as ProductType,
    },
  };
}

export function validateVariantInput(input: {
  sku?: unknown;
  title?: unknown;
  optionValues?: unknown;
}):
  | {
      ok: true;
      value: {
        sku: string;
        title: string;
        optionValues: Record<string, string>;
      };
    }
  | { ok: false; message: string } {
  const sku = typeof input.sku === "string" ? input.sku.trim() : "";
  if (!SKU_RE.test(sku)) {
    return { ok: false, message: "SKU is invalid." };
  }
  const title =
    typeof input.title === "string" && input.title.trim()
      ? input.title.trim().slice(0, 120)
      : "Default";

  let optionValues: Record<string, string> = {};
  if (input.optionValues && typeof input.optionValues === "object") {
    const raw = input.optionValues as Record<string, unknown>;
    for (const [key, val] of Object.entries(raw)) {
      if (typeof key === "string" && typeof val === "string") {
        optionValues[key.slice(0, 40)] = val.slice(0, 80);
      }
    }
  }

  return { ok: true, value: { sku, title, optionValues } };
}

export function validatePriceInput(input: {
  amountMinor?: unknown;
  compareAtMinor?: unknown;
  currency?: unknown;
}):
  | {
      ok: true;
      value: {
        amountMinor: number;
        compareAtMinor: number | null;
        currency: string;
      };
    }
  | { ok: false; message: string } {
  const currency =
    typeof input.currency === "string" ? input.currency : "USD";
  const amount = validateAmountMinor(input.amountMinor, currency);
  if (!amount.ok) return amount;

  let compareAtMinor: number | null = null;
  if (input.compareAtMinor !== undefined && input.compareAtMinor !== null && input.compareAtMinor !== "") {
    const compare = validateAmountMinor(input.compareAtMinor, amount.currency);
    if (!compare.ok) return compare;
    if (compare.amountMinor <= amount.amountMinor) {
      return {
        ok: false,
        message: "Compare-at price must be greater than the selling price.",
      };
    }
    compareAtMinor = compare.amountMinor;
  }

  return {
    ok: true,
    value: {
      amountMinor: amount.amountMinor,
      compareAtMinor,
      currency: amount.currency,
    },
  };
}

export function validateMediaMetadata(input: {
  storagePath?: unknown;
  mediaType?: unknown;
  altText?: unknown;
  role?: unknown;
  sortOrder?: unknown;
}):
  | {
      ok: true;
      value: {
        storagePath: string;
        mediaType: "image" | "video" | "document";
        altText: string | null;
        role: "cover" | "gallery" | "detail" | "swatch";
        sortOrder: number;
      };
    }
  | { ok: false; message: string } {
  const storagePath =
    typeof input.storagePath === "string" ? input.storagePath.trim() : "";
  if (
    !storagePath ||
    storagePath.length > 512 ||
    storagePath.includes("..") ||
    storagePath.startsWith("/")
  ) {
    return {
      ok: false,
      message: "Storage path must be a relative path without '..'.",
    };
  }

  const mediaType =
    typeof input.mediaType === "string" ? input.mediaType.trim() : "";
  if (!["image", "video", "document"].includes(mediaType)) {
    return { ok: false, message: "Media type is invalid." };
  }

  const roleRaw =
    typeof input.role === "string" && input.role.trim()
      ? input.role.trim()
      : "gallery";
  if (!["cover", "gallery", "detail", "swatch"].includes(roleRaw)) {
    return { ok: false, message: "Media role is invalid." };
  }

  let sortOrder = 0;
  if (input.sortOrder !== undefined && input.sortOrder !== null && input.sortOrder !== "") {
    const n =
      typeof input.sortOrder === "string"
        ? Number(input.sortOrder)
        : input.sortOrder;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0) {
      return { ok: false, message: "Sort order must be a non-negative integer." };
    }
    sortOrder = n;
  }

  const altText =
    typeof input.altText === "string" && input.altText.trim()
      ? input.altText.trim().slice(0, 200)
      : null;

  return {
    ok: true,
    value: {
      storagePath,
      mediaType: mediaType as "image" | "video" | "document",
      altText,
      role: roleRaw as "cover" | "gallery" | "detail" | "swatch",
      sortOrder,
    },
  };
}
