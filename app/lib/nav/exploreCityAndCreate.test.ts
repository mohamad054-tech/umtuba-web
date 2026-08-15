import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES, buildHomeCityFocusHref } from "./routes";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("WP-QA-01 Explore This City → World", () => {
  it("builds World city explorer href instead of ignored Home ?focus=", () => {
    expect(buildHomeCityFocusHref("UMTUBA")).toBe("/world?city=umtuba");
    expect(buildHomeCityFocusHref("Amman")).toBe("/world?city=amman");
    expect(buildHomeCityFocusHref("")).toBe(APP_ROUTES.worldDiscovery);
  });

  it("Home and Discover leftover ?focus= redirect to World", () => {
    const home = read("app/page.tsx");
    expect(home).toMatch(/buildHomeCityFocusHref/);
    expect(home).toMatch(/params\.focus/);

    const discover = read("app/discover/page.tsx");
    expect(discover).toMatch(/buildHomeCityFocusHref/);
    expect(discover).toMatch(/params\.focus/);
    expect(discover).toMatch(/Compatible alias/);
  });

  it("Home Explore this city still uses the shared builder", () => {
    const experience = read("app/discover/DiscoverExperience.tsx");
    expect(experience).toMatch(/buildHomeCityFocusHref/);
    expect(experience).toMatch(/Explore this city/);
  });
});

describe("WP-QA-13 Create chooser", () => {
  it("exposes a generic /create entry for supported types", () => {
    expect(APP_ROUTES.create).toBe("/create");
    expect(APP_ROUTES.createPost).toBe("/create/post");
    expect(existsSync(join(ROOT, "app/create/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/create/CreateChooser.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/create/post/page.tsx"))).toBe(true);
    const chooser = read("app/create/CreateChooser.tsx");
    expect(chooser).toMatch(/APP_ROUTES\.createVideo/);
    expect(chooser).toMatch(/APP_ROUTES\.createPost/);
    expect(chooser).toMatch(/APP_ROUTES\.createArticle/);
    expect(chooser).toMatch(/Write Post/);
    expect(chooser).toMatch(/title: "Image"/);
    expect(chooser).not.toMatch(/CreatePostModal/);
    const page = read("app/create/page.tsx");
    expect(page).not.toMatch(/redirect\(.*createVideo/);
  });

  it("gates /create and points Home/UserMenu Create at the chooser", () => {
    const page = read("app/create/page.tsx");
    expect(page).toMatch(/APP_ROUTES\.create/);
    expect(page).toMatch(/getServerUser/);

    const circles = read("app/discover/components/HomeSectionCircles.tsx");
    expect(circles).toMatch(/href: APP_ROUTES\.create,/);

    const menu = read("app/lib/nav/userMenuItems.ts");
    expect(menu).toMatch(/href: APP_ROUTES\.create,/);
  });
});
