import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translate } from "../../i18n/translate";
import { cjLaunchBadgeLabel, cjLaunchRailLabel } from "./previewCopy";

const listing = readFileSync(
  join(process.cwd(), "app/sandbox/store/cj-launch/page.tsx"),
  "utf8"
);
const chrome = readFileSync(
  join(process.cwd(), "app/components/store/StoreChrome.tsx"),
  "utf8"
);
const frame = readFileSync(
  join(process.cwd(), "app/sandbox/store/cj-launch/CjLaunchPreviewFrame.tsx"),
  "utf8"
);

describe("cj-launch preview chrome copy", () => {
  it("localizes rails and badges through the i18n catalogs", () => {
    expect(cjLaunchRailLabel("ALL", "en")).toBe("All products");
    expect(cjLaunchRailLabel("ALL", "ar")).toBe("كل المنتجات");
    expect(cjLaunchRailLabel("featured", "en")).toBe("Featured");
    expect(cjLaunchRailLabel("featured", "ar")).toBe("مميز");
    expect(cjLaunchRailLabel("new", "ar")).toBe("جديد");
    expect(cjLaunchRailLabel("top_picks", "ar")).toBe("مختارات");
    expect(cjLaunchRailLabel("best_deals", "ar")).toBe("أفضل العروض");
    expect(cjLaunchBadgeLabel("deal", "en")).toBe("Deal");
    expect(cjLaunchBadgeLabel("deal", "ar")).toBe("عرض");
    expect(cjLaunchBadgeLabel("featured", "ar")).toBe("مميز");
    expect(cjLaunchBadgeLabel("new", "ar")).toBe("جديد");
  });

  it("keeps English chrome unchanged for locale=en", () => {
    expect(translate("en", "store.chrome.shop")).toBe("Shop");
    expect(translate("en", "store.chrome.searchPlaceholder")).toBe("Search products");
    expect(translate("en", "store.preview.heading")).toBe("UMTUBA Store preview");
    expect(translate("en", "store.umPoints.bannerHeadline")).toBe("SHOP MORE. EARN MORE.");
    expect(translate("en", "store.preview.all")).toBe("All");
  });

  it("provides complete Arabic chrome for locale=ar", () => {
    expect(translate("ar", "store.chrome.shop")).toBe("تسوق");
    expect(translate("ar", "store.chrome.catalog")).toBe("الكتالوج");
    expect(translate("ar", "store.chrome.favorites")).toBe("المفضلة");
    expect(translate("ar", "store.chrome.orders")).toBe("الطلبات");
    expect(translate("ar", "store.chrome.searchPlaceholder")).toBe("ابحث عن منتجات");
    expect(translate("ar", "store.preview.heading")).toBe("معاينة متجر أمتوبة");
    expect(translate("ar", "store.umPoints.bannerHeadline")).toBe("كل ما تتسوّق أكثر… تكسب أكثر!");
    expect(translate("ar", "store.preview.all")).toBe("الكل");
    expect(translate("ar", "store.preview.allProducts")).toBe("كل المنتجات");
  });

  it("binds listing, chrome, and sandbox frame to t() keys instead of English literals", () => {
    expect(listing).toMatch(/store\.preview\.heading/);
    expect(listing).toMatch(/store\.chrome\.title/);
    expect(listing).toMatch(/cjLaunchRailLabel/);
    expect(listing).toMatch(/cjLaunchBadgeLabel/);
    expect(listing).not.toMatch(/UMTUBA Store preview/);
    expect(listing).not.toMatch(/Search products/);
    expect(chrome).toMatch(/store\.chrome\.searchPlaceholder/);
    expect(chrome).toMatch(/store\.chrome\.shop/);
    expect(chrome).not.toMatch(/placeholder="Search products"/);
    expect(chrome).not.toMatch(/>Shop</);
    expect(frame).toMatch(/resolveCjLaunchPreviewLocale/);
    expect(frame).toMatch(/store\.preview\.sandboxBanner/);
  });
});
