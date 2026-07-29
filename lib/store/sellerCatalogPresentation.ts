/**
 * Seller Catalog & Product Management V1 — presentation helpers.
 * Maps trusted product statuses only. Does not invent publish/pricing/AI mutations.
 */

import type { ModerationStatus, ProductStatus } from "./types";
import { PRODUCT_STATUSES } from "./types";

export type SellerCatalogFilterBucket =
  | "all"
  | "draft"
  | "in_review"
  | "published"
  | "hidden"
  | "archived";

export type SellerCatalogSortKey =
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc"
  | "status_asc"
  | "created_desc";

export type SellerCatalogListItem = {
  id: string;
  title: string;
  slug: string;
  status: ProductStatus | string;
  moderationStatus: ModerationStatus | string;
  productType: string;
  updatedAt: string;
  createdAt: string;
  shortDescription?: string | null;
};

const FILTER_STATUSES: Record<
  Exclude<SellerCatalogFilterBucket, "all">,
  readonly string[]
> = {
  draft: ["draft", "rejected"],
  in_review: ["in_review", "pending_review"],
  published: ["active"],
  hidden: ["hidden", "paused", "blocked"],
  archived: ["archived"],
};

export const SELLER_CATALOG_FILTERS: Array<{
  id: SellerCatalogFilterBucket;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "in_review", label: "In review" },
  { id: "published", label: "Published" },
  { id: "hidden", label: "Hidden" },
  { id: "archived", label: "Archived" },
];

export function sellerProductStatusLabel(status: unknown): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "in_review":
    case "pending_review":
      return "In review";
    case "active":
      return "Published";
    case "rejected":
      return "Rejected";
    case "paused":
      return "Paused";
    case "hidden":
      return "Hidden";
    case "blocked":
      return "Blocked";
    case "archived":
      return "Archived";
    default:
      return typeof status === "string" && status.trim()
        ? status
        : "Unknown";
  }
}

export function sellerModerationLabel(status: unknown): string {
  switch (status) {
    case "pending":
      return "Pending moderation";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "needs_changes":
      return "Needs changes";
    default:
      return typeof status === "string" && status.trim()
        ? status
        : "Unknown";
  }
}

/** Honest publishing rail — sellers cannot self-activate. */
export function sellerPublishingWorkflowSteps(input: {
  status: unknown;
  moderationStatus: unknown;
}): Array<{ id: string; label: string; state: "done" | "current" | "upcoming" }> {
  const status = String(input.status ?? "");
  const moderation = String(input.moderationStatus ?? "");

  const phase =
    status === "archived"
      ? 5
      : status === "hidden" || status === "paused" || status === "blocked"
        ? 4
        : status === "active" && moderation === "approved"
          ? 3
          : status === "in_review" || status === "pending_review"
            ? 2
            : 1;

  return [
    { id: "draft", label: "Draft", state: phase > 1 ? "done" : "current" },
    {
      id: "review",
      label: "In review",
      state: phase > 2 ? "done" : phase === 2 ? "current" : "upcoming",
    },
    {
      id: "published",
      label: "Published",
      state: phase > 3 ? "done" : phase === 3 ? "current" : "upcoming",
    },
    {
      id: "hidden",
      label: "Hidden / paused",
      state: phase === 4 ? "current" : phase > 4 ? "done" : "upcoming",
    },
    {
      id: "archived",
      label: "Archived",
      state: phase === 5 ? "current" : "upcoming",
    },
  ];
}

export function productMatchesCatalogFilter(
  status: unknown,
  bucket: SellerCatalogFilterBucket
): boolean {
  if (bucket === "all") return true;
  const statuses = FILTER_STATUSES[bucket];
  return statuses.includes(String(status));
}

export function filterSellerCatalogItems(
  items: SellerCatalogListItem[],
  input: {
    query?: string;
    bucket?: SellerCatalogFilterBucket;
    sort?: SellerCatalogSortKey;
  }
): SellerCatalogListItem[] {
  const q = (input.query ?? "").trim().toLowerCase();
  const bucket = input.bucket ?? "all";
  let next = items.filter((item) => {
    if (!productMatchesCatalogFilter(item.status, bucket)) return false;
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      (item.shortDescription ?? "").toLowerCase().includes(q) ||
      String(item.status).toLowerCase().includes(q)
    );
  });

  const sort = input.sort ?? "updated_desc";
  next = [...next].sort((a, b) => {
    switch (sort) {
      case "title_asc":
        return a.title.localeCompare(b.title);
      case "title_desc":
        return b.title.localeCompare(a.title);
      case "status_asc":
        return String(a.status).localeCompare(String(b.status));
      case "created_desc":
        return b.createdAt.localeCompare(a.createdAt);
      case "updated_asc":
        return a.updatedAt.localeCompare(b.updatedAt);
      case "updated_desc":
      default:
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });

  return next;
}

export function canSellerEditProductFields(status: unknown): boolean {
  return ["draft", "in_review", "rejected"].includes(String(status));
}

export function canSellerEditVariants(status: unknown): boolean {
  return ["draft", "in_review"].includes(String(status));
}

export function canSellerSubmitForReview(status: unknown): boolean {
  return ["draft", "in_review", "rejected"].includes(String(status));
}

export function canSellerArchiveProduct(status: unknown): boolean {
  return String(status) !== "archived";
}

export function deriveSellerCatalogBulkActions(input: {
  selectedStatuses: unknown[];
}): Array<{
  id: "submit_review" | "archive";
  label: string;
  enabled: boolean;
  reason?: string;
}> {
  const statuses = input.selectedStatuses.map((s) => String(s));
  if (statuses.length === 0) {
    return [
      {
        id: "submit_review",
        label: "Submit for review",
        enabled: false,
        reason: "Select products first.",
      },
      {
        id: "archive",
        label: "Archive",
        enabled: false,
        reason: "Select products first.",
      },
    ];
  }

  const allSubmittable = statuses.every((s) => canSellerSubmitForReview(s));
  const allArchivable = statuses.every((s) => canSellerArchiveProduct(s));

  return [
    {
      id: "submit_review",
      label: "Submit for review",
      enabled: allSubmittable,
      reason: allSubmittable
        ? undefined
        : "Only draft, in-review, or rejected products can be submitted.",
    },
    {
      id: "archive",
      label: "Archive selected",
      enabled: allArchivable,
      reason: allArchivable
        ? undefined
        : "Already-archived products cannot be archived again.",
    },
  ];
}

export function buildOptionValuesPayload(input: {
  color?: string;
  size?: string;
  capacity?: string;
}): Record<string, string> {
  const out: Record<string, string> = {};
  if (input.color?.trim()) out.Color = input.color.trim().slice(0, 80);
  if (input.size?.trim()) out.Size = input.size.trim().slice(0, 80);
  if (input.capacity?.trim()) out.Capacity = input.capacity.trim().slice(0, 80);
  return out;
}

export function sellerSeoPreview(input: {
  title: string;
  shortDescription?: string | null;
  slug: string;
}): { title: string; description: string; note: string } {
  const title = input.title.trim().slice(0, 70) || "Untitled product";
  const description = (input.shortDescription ?? "").trim().slice(0, 160);
  return {
    title,
    description:
      description ||
      "Add a short description to improve how this product reads publicly.",
    note: "SEO title/description fields are not stored separately in the trusted catalog schema. Public presentation uses title, slug, and short description.",
  };
}

export function isTrustedProductStatus(value: unknown): value is ProductStatus {
  return (
    typeof value === "string" &&
    (PRODUCT_STATUSES as readonly string[]).includes(value)
  );
}
