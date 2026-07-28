import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  countProfileCourses,
  countProfileProducts,
  normalizeProfileCourses,
  normalizeProfileProducts,
} from "../../app/profile/lib/profileCoursesProductsStructure";
import { getVisibleProfileTabs } from "../../app/profile/lib/profileTabs";
import type {
  ProfileCoursePreview,
  ProfileProductPreview,
} from "../../app/profile/types";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function course(
  partial: Partial<ProfileCoursePreview> &
    Pick<ProfileCoursePreview, "id" | "title" | "href">
): ProfileCoursePreview {
  return {
    levelLabel: "Beginner",
    coverGradient: "from-[#101828] to-[#081018]",
    ...partial,
  };
}

function product(
  partial: Partial<ProfileProductPreview> &
    Pick<ProfileProductPreview, "id" | "title" | "href">
): ProfileProductPreview {
  return {
    priceLabel: "$10",
    coverGradient: "from-[#1a1420] to-[#081018]",
    ...partial,
  };
}

describe("Courses / Products Panel Structure V1", () => {
  it("normalizes courses/products and counts for tab visibility", () => {
    const courses = normalizeProfileCourses([
      course({
        id: "c1",
        title: "Light",
        href: "/learning/catalog/light",
      }),
      course({
        id: "c1",
        title: "Dup",
        href: "/learning/catalog/dup",
      }),
      course({ id: "bad", title: "", href: "/learning/catalog/x" }),
    ]);
    expect(courses).toHaveLength(1);
    expect(countProfileCourses(courses)).toBe(1);

    const products = normalizeProfileProducts([
      product({
        id: "p1",
        title: "LUT",
        href: "/store/products/11111111-1111-4111-8111-111111111111",
        priceLabel: "$24",
      }),
      product({
        id: "p1",
        title: "Dup",
        href: "/store/products/11111111-1111-4111-8111-111111111111",
      }),
    ]);
    expect(products).toHaveLength(1);
    expect(countProfileProducts(products)).toBe(1);

    const visitor = getVisibleProfileTabs({
      isOwner: false,
      articleCount: 0,
      videoCount: 0,
      courseCount: countProfileCourses(courses),
      productCount: countProfileProducts(products),
      photoCount: 0,
      showLiveTab: false,
    });
    expect(visitor).toEqual(["all", "courses", "products", "about"]);
  });

  it("wires structured panels and count helpers without catalog backends", () => {
    const coursesPanel = read("app/profile/components/ProfileCoursesPanel.tsx");
    const productsPanel = read("app/profile/components/ProfileProductsPanel.tsx");
    const experience = read("app/profile/ProfileExperience.tsx");
    const structure = read(
      "app/profile/lib/profileCoursesProductsStructure.ts"
    );

    expect(coursesPanel).toMatch(/View course/);
    expect(coursesPanel).toMatch(/levelLabel/);
    expect(coursesPanel).toMatch(/normalizeProfileCourses/);
    expect(productsPanel).toMatch(/View product/);
    expect(productsPanel).toMatch(/priceLabel/);
    expect(productsPanel).toMatch(/normalizeProfileProducts/);
    expect(experience).toMatch(/countProfileCourses/);
    expect(experience).toMatch(/countProfileProducts/);
    expect(experience).toMatch(/courses=\{profile\.courses\}/);
    expect(experience).toMatch(/products=\{profile\.products\}/);
    expect(structure).toMatch(/Creator Space Experience/);
    expect(structure).not.toMatch(/supabase\/migrations|\.insert\(/);
    expect(coursesPanel).not.toMatch(/enrollInPublicCourseAction|checkout/);
    expect(productsPanel).not.toMatch(/storeCheckout|addToCart/);
    expect(
      existsSync(
        join(ROOT, "app/profile/lib/profileCoursesProductsStructure.ts")
      )
    ).toBe(true);
  });

  it("does not touch Home, Watch, Photos lightbox, or Motion/a11y pass files", () => {
    const structure = read(
      "app/profile/lib/profileCoursesProductsStructure.ts"
    );
    const experience = read("app/profile/ProfileExperience.tsx");
    expect(structure).not.toMatch(/DiscoverExperience|HomeFeed|swipe/);
    expect(experience).not.toMatch(/prefers-reduced-motion|lightbox/);
  });
});
