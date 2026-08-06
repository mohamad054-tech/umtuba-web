/**
 * Presentation wiring for Unified Navigation Foundation V1.
 * Route truth comes from Page Registry / navigation groups.
 * Labels and intentional order stay as UI metadata overlays.
 */

import { PAGE_REGISTRY } from "../pageRegistry";
import { buildNavigationGroup } from "./navigationBuilder";
import {
  ADMIN_NAV_CONTEXT,
  AUTHENTICATED_NAV_CONTEXT,
} from "./navigationFilters";
import type { NavigationItem } from "./types";

export type WiredNavLink = {
  href: string;
  label: string;
  pageId: string;
};

function wireFromGroup(options: {
  groupId: "admin" | "aiAdmin" | "settings" | "commerce" | "learning";
  pathPrefix?: string;
  preferredOrder: readonly string[];
  labelOverrides?: Readonly<Record<string, string>>;
  context?: typeof ADMIN_NAV_CONTEXT | typeof AUTHENTICATED_NAV_CONTEXT;
}): WiredNavLink[] {
  const group = buildNavigationGroup(
    options.groupId,
    PAGE_REGISTRY,
    options.context ?? ADMIN_NAV_CONTEXT
  );

  let items = group.items;
  if (options.pathPrefix) {
    const base = options.pathPrefix;
    items = items.filter(
      (item) => item.href === base || item.href.startsWith(`${base}/`)
    );
  }

  const byPath = new Map(items.map((item) => [item.href, item]));
  const ordered: WiredNavLink[] = [];

  for (const path of options.preferredOrder) {
    const item = byPath.get(path);
    if (!item) {
      throw new Error(
        `Wired navigation missing registry path for ${options.groupId}: ${path}`
      );
    }
    ordered.push({
      href: item.href,
      pageId: item.pageId,
      label: options.labelOverrides?.[path] ?? shortLabel(item),
    });
    byPath.delete(path);
  }

  // Append any additional registry hubs not in preferred order (stable path sort).
  const extras = [...byPath.values()].sort((a, b) =>
    a.href.localeCompare(b.href)
  );
  for (const item of extras) {
    ordered.push({
      href: item.href,
      pageId: item.pageId,
      label: options.labelOverrides?.[item.href] ?? shortLabel(item),
    });
  }

  return ordered;
}

function shortLabel(item: NavigationItem): string {
  // Prefer the last path segment title over full "Admin · Store · …" registry titles.
  const seg = item.href.split("/").filter(Boolean).pop();
  if (!seg || item.href.split("/").filter(Boolean).length <= 2) {
    if (item.href.endsWith("/store") || item.href.endsWith("/ads")) {
      return "Overview";
    }
    if (
      item.href.endsWith("/private-ai") ||
      item.href.endsWith("/ai-data") ||
      item.href.endsWith("/knowledge")
    ) {
      return "Overview";
    }
  }
  return seg
    ? seg
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : item.label;
}

/** Store admin shell links — paths from registry `admin` group. */
export function listAdminStoreNavLinks(): WiredNavLink[] {
  return wireFromGroup({
    groupId: "admin",
    pathPrefix: "/admin/store",
    preferredOrder: [
      "/admin/store",
      "/admin/store/sellers",
      "/admin/store/products",
      "/admin/store/reservations",
    ],
    labelOverrides: {
      "/admin/store": "Overview",
      "/admin/store/sellers": "Seller applications",
      "/admin/store/products": "Product review",
      "/admin/store/reservations": "Reservations",
    },
  });
}

/** Ads admin shell links — paths from registry `admin` group. */
export function listAdminAdsNavLinks(): WiredNavLink[] {
  return wireFromGroup({
    groupId: "admin",
    pathPrefix: "/admin/ads",
    preferredOrder: [
      "/admin/ads",
      "/admin/ads/advertisers",
      "/admin/ads/campaigns",
      "/admin/ads/creatives",
      "/admin/ads/reviews",
      "/admin/ads/diagnostics",
    ],
    labelOverrides: {
      "/admin/ads": "Overview",
      "/admin/ads/advertisers": "Advertisers",
      "/admin/ads/campaigns": "Campaigns",
      "/admin/ads/creatives": "Creatives",
      "/admin/ads/reviews": "Reviews",
      "/admin/ads/diagnostics": "Diagnostics",
    },
  });
}

/** Private AI shell links — paths from registry `aiAdmin` group. */
export function listPrivateAiNavLinks(): WiredNavLink[] {
  return wireFromGroup({
    groupId: "aiAdmin",
    pathPrefix: "/admin/private-ai",
    preferredOrder: [
      "/admin/private-ai",
      "/admin/private-ai/models",
      "/admin/private-ai/capabilities",
      "/admin/private-ai/deployments",
      "/admin/private-ai/hardware",
      "/admin/private-ai/routing",
      "/admin/private-ai/lifecycle",
      "/admin/private-ai/runtime",
    ],
    labelOverrides: {
      "/admin/private-ai": "Overview",
      "/admin/private-ai/models": "Private Models",
      "/admin/private-ai/capabilities": "Capabilities",
      "/admin/private-ai/deployments": "Deployments",
      "/admin/private-ai/hardware": "Hardware",
      "/admin/private-ai/routing": "Routing",
      "/admin/private-ai/lifecycle": "Lifecycle",
      "/admin/private-ai/runtime": "Runtime",
    },
  });
}

/** AI Data Platform shell links — paths from registry `aiAdmin` group. */
export function listAiDataNavLinks(): WiredNavLink[] {
  return wireFromGroup({
    groupId: "aiAdmin",
    pathPrefix: "/admin/ai-data",
    preferredOrder: [
      "/admin/ai-data",
      "/admin/ai-data/review",
      "/admin/ai-data/datasets",
      "/admin/ai-data/versions",
      "/admin/ai-data/experiments",
      "/admin/ai-data/models",
      "/admin/ai-data/evaluation-sets",
      "/admin/ai-data/promotion",
      "/admin/ai-data/audit",
    ],
    labelOverrides: {
      "/admin/ai-data": "Overview",
      "/admin/ai-data/review": "Review",
      "/admin/ai-data/datasets": "Datasets",
      "/admin/ai-data/versions": "Versions",
      "/admin/ai-data/experiments": "Experiments",
      "/admin/ai-data/models": "Models",
      "/admin/ai-data/evaluation-sets": "Evaluation Sets",
      "/admin/ai-data/promotion": "Promotion Queue",
      "/admin/ai-data/audit": "Audit Trail",
    },
  });
}

/** Knowledge Acquisition shell links — paths from registry `aiAdmin` group. */
export function listKnowledgeNavLinks(): WiredNavLink[] {
  return wireFromGroup({
    groupId: "aiAdmin",
    pathPrefix: "/admin/knowledge",
    preferredOrder: [
      "/admin/knowledge",
      "/admin/knowledge/sources",
      "/admin/knowledge/datasets",
      "/admin/knowledge/rights",
      "/admin/knowledge/quality",
      "/admin/knowledge/classification",
      "/admin/knowledge/eligibility",
      "/admin/knowledge/history",
    ],
    labelOverrides: {
      "/admin/knowledge": "Overview",
      "/admin/knowledge/sources": "Sources",
      "/admin/knowledge/datasets": "Datasets",
      "/admin/knowledge/rights": "Rights",
      "/admin/knowledge/quality": "Quality",
      "/admin/knowledge/classification": "Classification",
      "/admin/knowledge/eligibility": "Eligibility",
      "/admin/knowledge/history": "History",
    },
  });
}

/**
 * Settings navigation — registry `settings` group only.
 * Does not include admin or user-menu destinations.
 */
export function listSettingsNavLinks(): WiredNavLink[] {
  return wireFromGroup({
    groupId: "settings",
    preferredOrder: ["/settings"],
    labelOverrides: {
      "/settings": "Settings",
    },
    context: AUTHENTICATED_NAV_CONTEXT,
  });
}

/** Flat admin group (store + ads + platform) for inventory / tests. */
export function listAdminNavLinks(): WiredNavLink[] {
  const group = buildNavigationGroup(
    "admin",
    PAGE_REGISTRY,
    ADMIN_NAV_CONTEXT
  );
  return group.items.map((item) => ({
    href: item.href,
    pageId: item.pageId,
    label: shortLabel(item),
  }));
}

/** Flat AI admin group for inventory / tests. */
export function listAiAdminNavLinks(): WiredNavLink[] {
  const group = buildNavigationGroup(
    "aiAdmin",
    PAGE_REGISTRY,
    ADMIN_NAV_CONTEXT
  );
  return group.items.map((item) => ({
    href: item.href,
    pageId: item.pageId,
    label: shortLabel(item),
  }));
}

/**
 * Commerce navigation group hubs — buyer/seller/advertise static chrome.
 * Does not invent dynamic product/store IDs.
 * Uses seller capability so role-gated seller hubs are included in the inventory.
 */
export function listCommerceNavLinks(): WiredNavLink[] {
  return wireFromGroup({
    groupId: "commerce",
    preferredOrder: [
      "/store",
      "/store/search",
      "/store/cart",
      "/store/orders",
      "/store/wishlist",
      "/seller",
      "/seller/store",
      "/seller/store/products",
      "/seller/store/orders",
      "/seller/store/inventory",
    ],
    labelOverrides: {
      "/store": "Store",
      "/store/search": "Search",
      "/store/cart": "Cart",
      "/store/orders": "Orders",
      "/store/wishlist": "Wishlist",
      "/seller": "Seller",
      "/seller/store": "Seller store",
      "/seller/store/products": "Products",
      "/seller/store/orders": "Orders",
      "/seller/store/inventory": "Inventory",
    },
    context: {
      authenticated: true,
      isAdmin: false,
      capabilities: {
        showSeller: true,
        showAdvertise: true,
      },
    },
  });
}

/**
 * Learning navigation group hubs — learner + instructor static chrome.
 * Group membership is depth-limited (≤2); deeper instructor tools use
 * presentation chrome builders instead.
 */
export function listLearningNavLinks(): WiredNavLink[] {
  return wireFromGroup({
    groupId: "learning",
    preferredOrder: [
      "/learning",
      "/learning/catalog",
      "/learning/transcript",
      "/learning/instructor",
    ],
    labelOverrides: {
      "/learning": "My Learning",
      "/learning/catalog": "Catalog",
      "/learning/transcript": "Transcript",
      "/learning/instructor": "Instructor",
    },
    context: {
      authenticated: true,
      isAdmin: false,
      capabilities: {
        showInstructor: true,
      },
    },
  });
}
