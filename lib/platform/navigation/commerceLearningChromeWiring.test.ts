import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_ROUTES,
  buildSellerOrderHref,
  buildSellerProductHref,
  buildStoreBySlugHref,
  buildStoreOrderHref,
  buildStoreProductIdHref,
  buildStoreProductSlugHref,
  isNavActive,
} from "../../../app/lib/nav";
import { LEARNING_LEARNER_ROUTES } from "../../learning/learnerDelivery";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../learning/instructorAuthoring";
import { LEARNING_PUBLIC_ROUTES } from "../../learning/publicCatalog";
import { LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES } from "../../learning/instructorExperience";
import { getPageById, getPageByPath } from "../pageRegistry";
import {
  assertBreadcrumbsResolve,
  assertChromeLinksMatchRegistry,
  buildBreadcrumbs,
  fillRegistryPath,
  isRegistryHrefActive,
  listBuyerStoreChromeNavLinks,
  listCommerceNavLinks,
  listLearningInstructorChromeNavLinks,
  listLearningLearnerChromeNavLinks,
  listLearningNavLinks,
  listSellerStoreChromeNavLinks,
  resolvePageForPath,
} from "./index";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("UMTUBA Commerce & Learning Chrome Wiring V1", () => {
  it("buyer / seller / admin commerce routes stay separated", () => {
    const buyer = listBuyerStoreChromeNavLinks();
    const seller = listSellerStoreChromeNavLinks();
    assertChromeLinksMatchRegistry(buyer);
    assertChromeLinksMatchRegistry(seller);

    for (const link of buyer) {
      expect(link.href.startsWith("/seller")).toBe(false);
      expect(link.href.startsWith("/admin")).toBe(false);
      expect(getPageById(link.pageId)?.audience).not.toBe("seller");
    }
    for (const link of seller) {
      expect(link.href.startsWith("/seller")).toBe(true);
      expect(link.href.startsWith("/admin")).toBe(false);
      expect(getPageById(link.pageId)?.audience).toBe("seller");
    }

    const commerce = listCommerceNavLinks();
    expect(commerce.some((l) => l.href.startsWith("/admin"))).toBe(false);
  });

  it("seller-only and admin pages remain gated out of buyer chrome", () => {
    const buyerHrefs = new Set(listBuyerStoreChromeNavLinks().map((l) => l.href));
    expect(buyerHrefs.has("/seller")).toBe(false);
    expect(buyerHrefs.has("/seller/store")).toBe(false);
    expect(buyerHrefs.has("/admin/store")).toBe(false);
    expect(buyerHrefs.has(APP_ROUTES.sellerStoreProducts)).toBe(false);
  });

  it("dynamic product and store routes resolve from registry templates", () => {
    const storeSlug = "acme-shop";
    const productSlug = "blue-mug";
    const productId = "11111111-1111-4111-8111-111111111111";
    const orderId = "22222222-2222-4222-8222-222222222222";

    expect(buildStoreBySlugHref(storeSlug)).toBe(`/store/${storeSlug}`);
    expect(buildStoreProductSlugHref(storeSlug, productSlug)).toBe(
      `/store/${storeSlug}/product/${productSlug}`
    );
    expect(buildStoreProductIdHref(productId)).toBe(
      `/store/products/${productId}`
    );
    expect(buildSellerProductHref(productId)).toBe(
      `/seller/store/products/${productId}/edit`
    );
    expect(buildStoreOrderHref(orderId)).toBe(`/store/orders/${orderId}`);
    expect(buildSellerOrderHref(orderId)).toBe(
      `/seller/store/orders/${orderId}`
    );

    const page = resolvePageForPath(`/store/${storeSlug}/product/${productSlug}`);
    expect(page?.id).toBe("store.by-storeslug.product.by-productslug");
    expect(page?.dynamic).toBe(true);
  });

  it("APP_ROUTES commerce paths match registry and avoid duplication in shells", () => {
    expect(APP_ROUTES.store).toBe(getPageById("store")!.path);
    expect(APP_ROUTES.sellerStore).toBe(getPageById("seller.store")!.path);
    expect(APP_ROUTES.sellerStoreProducts).toBe(
      getPageById("seller.store.products")!.path
    );
    expect(APP_ROUTES.storeCart).toBe(getPageById("store.cart")!.path);

    const insights = read("app/components/store/SellerDashboardInsights.tsx");
    expect(insights.includes('href="/seller/store/products"')).toBe(false);
    expect(insights.includes("href={`/seller/store/products/")).toBe(false);
    expect(insights.includes("href={`/store/${storeSlug}`}")).toBe(false);

    const inventory = read("app/components/store/SellerInventoryWorkspace.tsx");
    expect(inventory.includes('actionHref="/seller/store/products/new"')).toBe(
      false
    );

    const productDash = read("app/components/store/SellerProductDashboard.tsx");
    expect(productDash.includes('actionHref="/seller/store/products/new"')).toBe(
      false
    );
  });

  it("learner / instructor / admin learning routes stay separated", () => {
    const learner = listLearningLearnerChromeNavLinks();
    const instructor = listLearningInstructorChromeNavLinks();
    assertChromeLinksMatchRegistry(learner);
    assertChromeLinksMatchRegistry(instructor);

    for (const link of learner) {
      expect(link.href.startsWith("/learning/instructor")).toBe(false);
      expect(link.href.startsWith("/admin")).toBe(false);
      expect(getPageById(link.pageId)?.audience).not.toBe("instructor");
    }
    for (const link of instructor) {
      expect(link.href.startsWith("/learning/instructor")).toBe(true);
      expect(getPageById(link.pageId)?.audience).toBe("instructor");
    }

    const learning = listLearningNavLinks();
    expect(learning.some((l) => l.href === "/learning")).toBe(true);
    expect(learning.some((l) => l.href.startsWith("/admin"))).toBe(false);
  });

  it("lesson and course dynamic routes resolve; Prev/Next path helpers unchanged", () => {
    const courseId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const lessonId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const activityId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

    expect(LEARNING_LEARNER_ROUTES.hub).toBe("/learning");
    expect(LEARNING_LEARNER_ROUTES.course(courseId)).toBe(
      `/learning/courses/${courseId}`
    );
    expect(LEARNING_LEARNER_ROUTES.lesson(lessonId)).toBe(
      `/learning/lessons/${lessonId}`
    );
    expect(LEARNING_LEARNER_ROUTES.assessment(activityId)).toBe(
      `/learning/activities/${activityId}/assessment`
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.hub).toBe("/learning/instructor");
    expect(LEARNING_INSTRUCTOR_ROUTES.course(courseId)).toBe(
      `/learning/instructor/courses/${courseId}`
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.lesson(courseId, lessonId)).toBe(
      `/learning/instructor/courses/${courseId}/lessons/${lessonId}`
    );
    expect(LEARNING_PUBLIC_ROUTES.catalog).toBe("/learning/catalog");
    expect(LEARNING_PUBLIC_ROUTES.course("intro-js")).toBe(
      "/learning/catalog/intro-js"
    );
    expect(LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.reviewQueue).toBe(
      "/learning/instructor/review"
    );

    expect(
      fillRegistryPath("learning.lessons.by-lessonid", { lessonId })
    ).toBe(LEARNING_LEARNER_ROUTES.lesson(lessonId));

    const lessonPage = resolvePageForPath(`/learning/lessons/${lessonId}`);
    expect(lessonPage?.id).toBe("learning.lessons.by-lessonid");
  });

  it("instructor pages remain gated out of learner chrome", () => {
    const learnerHrefs = new Set(
      listLearningLearnerChromeNavLinks().map((l) => l.href)
    );
    expect(learnerHrefs.has("/learning/instructor")).toBe(false);
    expect(learnerHrefs.has("/learning/instructor/review")).toBe(false);
  });

  it("no learning path duplication remains in migrated learner/instructor route maps", () => {
    const learnerSrc = read("lib/learning/learnerDelivery.ts");
    expect(learnerSrc.includes('hub: "/learning"')).toBe(false);
    expect(learnerSrc.includes("`/learning/courses/${courseId}`")).toBe(false);

    const instructorSrc = read("lib/learning/instructorAuthoring.ts");
    expect(instructorSrc.includes('hub: "/learning/instructor"')).toBe(false);
    expect(
      instructorSrc.includes("`/learning/instructor/courses/${courseId}`")
    ).toBe(false);

    const publicSrc = read("lib/learning/publicCatalog.ts");
    expect(publicSrc.includes('catalog: "/learning/catalog"')).toBe(false);
  });

  it("migrated paths exist in Page Registry; active-state supports nested dynamics", () => {
    const seller = listSellerStoreChromeNavLinks();
    const buyer = listBuyerStoreChromeNavLinks();
    const learner = listLearningLearnerChromeNavLinks();
    const instructor = listLearningInstructorChromeNavLinks();

    for (const link of [...seller, ...buyer, ...learner, ...instructor]) {
      expect(getPageByPath(link.href)?.id).toBe(link.pageId);
    }

    expect(isNavActive("/store/acme/product/mug", APP_ROUTES.store as "/store")).toBe(
      true
    );
    expect(
      isRegistryHrefActive(
        "/seller/store/products/11111111-1111-4111-8111-111111111111/edit",
        APP_ROUTES.sellerStoreProducts
      )
    ).toBe(true);
    expect(
      isRegistryHrefActive(
        "/learning/courses/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/progress",
        LEARNING_LEARNER_ROUTES.hub
      )
    ).toBe(true);
  });

  it("commerce PDP breadcrumbs resolve via centralized helper", () => {
    const path = "/store/acme-shop/product/blue-mug";
    const crumbs = buildBreadcrumbs(path);
    assertBreadcrumbsResolve(crumbs);
    expect(crumbs.some((c) => c.pageId === "store")).toBe(true);
    expect(
      crumbs.some((c) => c.pageId === "store.by-storeslug.product.by-productslug")
    ).toBe(true);

    const unknown = buildBreadcrumbs("/this/route/does-not-exist-xyz");
    assertBreadcrumbsResolve(unknown);
    expect(unknown[0]?.href).toBe("/");
  });

  it("presentation metadata does not duplicate raw paths", () => {
    const presentation = read("lib/platform/navigation/presentation.ts");
    expect(presentation.includes('path: "/')).toBe(false);
    expect(presentation.includes('href: "/')).toBe(false);
    expect(presentation.includes("SELLER_STORE_CHROME_PRESENTATION")).toBe(true);
    expect(presentation.includes("LEARNING_LEARNER_CHROME_PRESENTATION")).toBe(
      true
    );
  });
});
