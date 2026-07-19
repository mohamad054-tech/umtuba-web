import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES } from "./routes";
import { buildUserMenuGroups, listUserMenuHrefs } from "./userMenuItems";

describe("userMenuItems", () => {
  it("groups You and Account without duplicates", () => {
    const groups = buildUserMenuGroups("/profile/demo_user");
    expect(groups.map((g) => g.id)).toEqual(["you", "account"]);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual([
      "Profile",
      "Saved",
      "Rewards",
      "Notifications",
      "Settings",
      "Store",
      "Seller hub",
      "Wishlist",
      "Advertise",
    ]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("exposes Saved, Rewards, Settings, and Advertise entry points", () => {
    const hrefs = listUserMenuHrefs("/profile/demo_user");
    expect(hrefs).toContain(APP_ROUTES.saved);
    expect(hrefs).toContain(APP_ROUTES.rewards);
    expect(hrefs).toContain(APP_ROUTES.notifications);
    expect(hrefs).toContain(APP_ROUTES.settings);
    expect(hrefs).toContain(APP_ROUTES.store);
    expect(hrefs).toContain(APP_ROUTES.seller);
    expect(hrefs).toContain(APP_ROUTES.storeWishlist);
    expect(hrefs).toContain(APP_ROUTES.advertise);
    expect(hrefs).not.toContain("/feed");
    expect(hrefs).not.toContain("/ai");
    expect(hrefs).not.toContain("/uconnect");
  });

  it("UserMenu renders grouped items and a11y menu roles", () => {
    const src = readFileSync(
      join(process.cwd(), "app/components/UserMenu.tsx"),
      "utf8"
    );
    expect(src).toMatch(/buildUserMenuGroups/);
    expect(src).toMatch(/aria-label=\{"Account menu"\}|aria-label="Account menu"/);
    expect(src).toMatch(/role="menuitem"/);
    expect(src).not.toMatch(/Feed V1|Video V1|Accounts V1/);
  });
});
