/**
 * Commerce & Learning production chrome builders.
 * Route truth from Page Registry; labels/gates from presentation overlays.
 */

import { getPageById, type PageRegistryEntry } from "../pageRegistry";
import {
  BUYER_STORE_CHROME_PRESENTATION,
  DEFAULT_CHROME_FEATURE_FLAGS,
  LEARNING_INSTRUCTOR_CHROME_PRESENTATION,
  LEARNING_LEARNER_CHROME_PRESENTATION,
  SELLER_STORE_CHROME_PRESENTATION,
  isPresentationEnabled,
  type ChromeFeatureFlags,
  type ChromeNavPresentation,
} from "./presentation";
import {
  fillRegistryPath,
  requireRegistryPath,
} from "./routeTemplates";
import type { ChromeNavLink } from "./chromeNavigation";

function assertChromeEligible(
  page: PageRegistryEntry,
  options: { allowSeller?: boolean; allowInstructor?: boolean }
): void {
  if (page.deprecated || page.status === "deprecated") {
    throw new Error(`Deprecated page cannot enter chrome: ${page.id}`);
  }
  if (page.legacy && page.path !== "/") {
    throw new Error(`Legacy page cannot enter chrome: ${page.id}`);
  }
  if (
    page.navigationVisibility === "hidden" ||
    page.navigationVisibility === "none"
  ) {
    throw new Error(`Hidden page cannot enter chrome: ${page.id}`);
  }
  if (page.orphan) {
    throw new Error(`Orphan page cannot enter chrome: ${page.id}`);
  }
  if (page.adminOnly) {
    throw new Error(`Admin-only page blocked from commerce/learning chrome: ${page.id}`);
  }
  if (page.audience === "seller" && !options.allowSeller) {
    throw new Error(`Seller page blocked from buyer chrome: ${page.id}`);
  }
  if (page.audience === "instructor" && !options.allowInstructor) {
    throw new Error(`Instructor page blocked from learner chrome: ${page.id}`);
  }
}

function resolveChromeLink(
  item: ChromeNavPresentation,
  options: {
    flags?: ChromeFeatureFlags;
    allowSeller?: boolean;
    allowInstructor?: boolean;
  }
): ChromeNavLink | null {
  if (!isPresentationEnabled(item, options.flags ?? DEFAULT_CHROME_FEATURE_FLAGS)) {
    return null;
  }

  const page = getPageById(item.pageId);
  if (!page) {
    throw new Error(`Chrome presentation missing registry page: ${item.pageId}`);
  }

  assertChromeEligible(page, {
    allowSeller: options.allowSeller,
    allowInstructor: options.allowInstructor,
  });

  return {
    chromeId: item.chromeId,
    pageId: page.id,
    label: item.label,
    href: page.path,
  };
}

function mapPresentation(
  items: readonly ChromeNavPresentation[],
  options: {
    flags?: ChromeFeatureFlags;
    allowSeller?: boolean;
    allowInstructor?: boolean;
  }
): ChromeNavLink[] {
  const links: ChromeNavLink[] = [];
  for (const item of items) {
    const link = resolveChromeLink(item, options);
    if (link) links.push(link);
  }
  return links;
}

/** Seller store chrome — seller audience only. */
export function listSellerStoreChromeNavLinks(
  flags?: ChromeFeatureFlags
): ChromeNavLink[] {
  const links = mapPresentation(SELLER_STORE_CHROME_PRESENTATION, {
    flags,
    allowSeller: true,
    allowInstructor: false,
  });
  for (const link of links) {
    if (!link.href.startsWith("/seller")) {
      throw new Error(`Non-seller path in seller chrome: ${link.href}`);
    }
    if (link.href.startsWith("/admin") || link.href.startsWith("/store/")) {
      throw new Error(`Buyer/admin path leaked into seller chrome: ${link.href}`);
    }
    const page = getPageById(link.pageId);
    if (page?.audience === "buyer" || page?.audience === "public") {
      // Public storefront pages must not appear in seller operational chrome.
      if (link.pageId.startsWith("store.")) {
        throw new Error(`Storefront page in seller chrome: ${link.pageId}`);
      }
    }
  }
  return links;
}

/** Buyer store chrome — never seller/admin. */
export function listBuyerStoreChromeNavLinks(
  flags?: ChromeFeatureFlags
): ChromeNavLink[] {
  const links = mapPresentation(BUYER_STORE_CHROME_PRESENTATION, {
    flags,
    allowSeller: false,
    allowInstructor: false,
  });
  for (const link of links) {
    if (link.href.startsWith("/seller") || link.href.startsWith("/admin")) {
      throw new Error(`Seller/admin path leaked into buyer chrome: ${link.href}`);
    }
    const page = getPageById(link.pageId);
    if (page?.audience === "seller") {
      throw new Error(`Seller audience page in buyer chrome: ${link.pageId}`);
    }
  }
  return links;
}

/** Learner hub chrome — never instructor/admin. */
export function listLearningLearnerChromeNavLinks(
  flags?: ChromeFeatureFlags
): ChromeNavLink[] {
  const links = mapPresentation(LEARNING_LEARNER_CHROME_PRESENTATION, {
    flags,
    allowSeller: false,
    allowInstructor: false,
  });
  for (const link of links) {
    if (link.href.startsWith("/learning/instructor")) {
      throw new Error(`Instructor path leaked into learner chrome: ${link.href}`);
    }
    if (link.href.startsWith("/admin")) {
      throw new Error(`Admin path leaked into learner chrome: ${link.href}`);
    }
    const page = getPageById(link.pageId);
    if (page?.audience === "instructor") {
      throw new Error(`Instructor audience in learner chrome: ${link.pageId}`);
    }
  }
  return links;
}

/** Instructor chrome — instructor surfaces only. */
export function listLearningInstructorChromeNavLinks(
  flags?: ChromeFeatureFlags
): ChromeNavLink[] {
  const links = mapPresentation(LEARNING_INSTRUCTOR_CHROME_PRESENTATION, {
    flags,
    allowSeller: false,
    allowInstructor: true,
  });
  for (const link of links) {
    if (!link.href.startsWith("/learning/instructor")) {
      throw new Error(`Non-instructor path in instructor chrome: ${link.href}`);
    }
  }
  return links;
}

/** Dynamic commerce helpers — registry templates + caller context. */
export function buildStoreBySlugHref(storeSlug: string): string {
  return fillRegistryPath("store.by-storeslug", { storeSlug });
}

export function buildStoreProductSlugHref(
  storeSlug: string,
  productSlug: string
): string {
  return fillRegistryPath("store.by-storeslug.product.by-productslug", {
    storeSlug,
    productSlug,
  });
}

export function buildSellerProductEditHref(productId: string): string {
  return fillRegistryPath("seller.store.products.by-productid.edit", {
    productId,
  });
}

export function buildSellerOrderDetailHref(orderId: string): string {
  return fillRegistryPath("seller.store.orders.by-orderid", { orderId });
}

export function buildStoreOrderDetailHref(orderId: string): string {
  return fillRegistryPath("store.orders.by-orderid", { orderId });
}

/** Dynamic learning helpers — registry templates + caller context. */
export function buildLearningCourseHref(courseId: string): string {
  return fillRegistryPath("learning.courses.by-courseid", { courseId });
}

export function buildLearningLessonHref(lessonId: string): string {
  return fillRegistryPath("learning.lessons.by-lessonid", { lessonId });
}

export function buildLearningActivityHref(activityId: string): string {
  return fillRegistryPath("learning.activities.by-activityid", { activityId });
}

export function buildLearningInstructorCourseHref(courseId: string): string {
  return fillRegistryPath("learning.instructor.courses.by-courseid", {
    courseId,
  });
}

export function buildLearningInstructorLessonHref(
  courseId: string,
  lessonId: string
): string {
  return fillRegistryPath(
    "learning.instructor.courses.by-courseid.lessons.by-lessonid",
    { courseId, lessonId }
  );
}

/** Static hub paths used by APP_ROUTES / learning route maps. */
export const COMMERCE_STATIC_PAGE_IDS = {
  store: "store",
  storeSearch: "store.search",
  storeCart: "store.cart",
  storeCheckout: "store.checkout",
  storeOrders: "store.orders",
  storeWishlist: "store.wishlist",
  seller: "seller",
  sellerApply: "seller.apply",
  sellerSetup: "seller.setup",
  sellerStore: "seller.store",
  sellerStoreProducts: "seller.store.products",
  sellerMarketplace: "seller.store.marketplace",
  sellerProducts: "seller.products",
  sellerOrders: "seller.store.orders",
  sellerInventory: "seller.store.inventory",
  sellerPromotions: "seller.store.promotions",
  sellerShipping: "seller.store.shipping",
  sellerAnalytics: "seller.store.analytics",
} as const;

export const LEARNING_STATIC_PAGE_IDS = {
  learning: "learning",
  instructor: "learning.instructor",
  catalog: "learning.catalog",
  transcript: "learning.transcript",
  instructorReview: "learning.instructor.review",
} as const;

export function resolveCommerceStaticPath(
  key: keyof typeof COMMERCE_STATIC_PAGE_IDS
): string {
  return requireRegistryPath(COMMERCE_STATIC_PAGE_IDS[key]);
}

export function resolveLearningStaticPath(
  key: keyof typeof LEARNING_STATIC_PAGE_IDS
): string {
  return requireRegistryPath(LEARNING_STATIC_PAGE_IDS[key]);
}
