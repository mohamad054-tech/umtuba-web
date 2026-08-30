import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  countProfilePhotos,
  getVisibleProfileTabs,
  parseProfileTab,
  PROFILE_TAB_ORDER,
  resolveActiveProfileTab,
} from "../../app/profile/lib/profileTabs";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Profile Creator Hub tab readiness V1", () => {
  it("orders tabs All · Articles · Videos · Courses · Products · Photos · Live · About", () => {
    expect([...PROFILE_TAB_ORDER]).toEqual([
      "all",
      "articles",
      "videos",
      "courses",
      "products",
      "photos",
      "live",
      "about",
    ]);
  });

  it("always shows All + About; kind tabs need count or owner", () => {
    const visitorEmpty = getVisibleProfileTabs({
      isOwner: false,
      articleCount: 0,
      videoCount: 0,
      courseCount: 0,
      productCount: 0,
      photoCount: 0,
      showLiveTab: false,
    });
    expect(visitorEmpty).toEqual(["all", "about"]);

    const visitorWithContent = getVisibleProfileTabs({
      isOwner: false,
      articleCount: 2,
      videoCount: 1,
      courseCount: 0,
      productCount: 3,
      photoCount: 1,
      showLiveTab: true,
    });
    expect(visitorWithContent).toEqual([
      "all",
      "articles",
      "videos",
      "products",
      "photos",
      "live",
      "about",
    ]);

    const ownerEmpty = getVisibleProfileTabs({
      isOwner: true,
      articleCount: 0,
      videoCount: 0,
      courseCount: 0,
      productCount: 0,
      photoCount: 0,
      showLiveTab: false,
    });
    expect(ownerEmpty).toEqual([
      "all",
      "articles",
      "videos",
      "photos",
      "about",
    ]);
  });

  it("hides empty Courses/Products/Photos from public visitors", () => {
    const tabs = getVisibleProfileTabs({
      isOwner: false,
      articleCount: 1,
      videoCount: 1,
      courseCount: 0,
      productCount: 0,
      photoCount: 0,
      showLiveTab: false,
    });
    expect(tabs).not.toContain("courses");
    expect(tabs).not.toContain("products");
    expect(tabs).not.toContain("photos");
  });

  it("maps ?tab=posts → photos; unknown → all; hidden → all", () => {
    expect(parseProfileTab("posts")).toBe("photos");
    expect(parseProfileTab("courses")).toBe("courses");
    expect(parseProfileTab("products")).toBe("products");
    expect(parseProfileTab("photos")).toBe("photos");
    expect(parseProfileTab("nope")).toBe("all");
    expect(parseProfileTab(null)).toBe("all");

    const visitor = getVisibleProfileTabs({
      isOwner: false,
      articleCount: 0,
      videoCount: 0,
      courseCount: 0,
      productCount: 0,
      photoCount: 0,
      showLiveTab: false,
    });
    expect(resolveActiveProfileTab("posts", visitor)).toBe("all");
    expect(resolveActiveProfileTab("courses", visitor)).toBe("all");
    expect(resolveActiveProfileTab("about", visitor)).toBe("about");
  });

  it("counts only image posts for Photos visibility", () => {
    expect(
      countProfilePhotos([
        { imageUrl: "https://x/a.jpg", postType: "image" },
        { imageUrl: null, postType: "text" },
        { imageUrl: "  ", postType: "image" },
        { imageUrl: null, postType: "image" },
      ])
    ).toBe(3);
  });

  it("wires stub panels and does not keep Posts as a public tab", () => {
    const experience = read("app/profile/ProfileExperience.tsx");
    const tabsUi = read("app/profile/components/ProfileTabs.tsx");
    expect(experience).toMatch(/ProfileCoursesPanel/);
    expect(experience).toMatch(/ProfileProductsPanel/);
    expect(experience).toMatch(/ProfilePhotosPanel/);
    expect(experience).not.toMatch(/ProfilePostsPanel/);
    expect(experience).not.toMatch(/activeTab === "posts"/);
    expect(tabsUi).not.toMatch(/"posts"/);
    expect(
      existsSync(join(ROOT, "app/profile/components/ProfileCoursesPanel.tsx"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/profile/components/ProfileProductsPanel.tsx"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/profile/components/ProfilePhotosPanel.tsx"))
    ).toBe(true);
  });

  it("preserves Content Cards All + article deeplink prompt", () => {
    const experience = read("app/profile/ProfileExperience.tsx");
    const allPanel = read("app/profile/components/ProfileAllPanel.tsx");
    expect(experience).toMatch(/ProfileAllPanel/);
    expect(experience).toMatch(/ProfileLinkedArticlePrompt/);
    expect(experience).toMatch(/searchParams\.get\("article"\)/);
    expect(allPanel).toMatch(/ContentCard/);
  });
});
