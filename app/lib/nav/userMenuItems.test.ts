import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES } from "./routes";
import { buildUserMenuGroups, listUserMenuHrefs } from "./userMenuItems";
import {
  USER_MENU_CAPABILITIES_SIGNED_IN_BASE,
  type UserMenuCapabilities,
} from "./userMenuCapabilities";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../lib/learning/instructorAuthoring";

describe("userMenuItems — Capability Links V1", () => {
  it("keeps You and Account groups for signed-in baseline", () => {
    const groups = buildUserMenuGroups(
      "/profile/demo_user",
      USER_MENU_CAPABILITIES_SIGNED_IN_BASE
    );
    expect(groups.map((g) => g.id)).toEqual(["you", "account"]);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual([
      "Profile",
      "Create",
      "Saved",
      "Learning",
      "Rewards",
      "Notifications",
      "Settings",
      "Store",
      "Wishlist",
      "Advertise",
    ]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("adds Create for signed-in baseline and omits gated workspaces", () => {
    const hrefs = listUserMenuHrefs(
      "/profile/demo_user",
      USER_MENU_CAPABILITIES_SIGNED_IN_BASE
    );
    expect(hrefs).toContain(APP_ROUTES.createVideo);
    expect(hrefs).toContain(APP_ROUTES.advertise);
    expect(hrefs).not.toContain(APP_ROUTES.seller);
    expect(hrefs).not.toContain(LEARNING_INSTRUCTOR_ROUTES.hub);
    expect(hrefs).not.toContain(APP_ROUTES.adminAds);
    expect(hrefs).not.toContain("/feed");
    expect(hrefs).not.toContain("/ai");
  });

  it("shows Instructor Seller Admin only when capabilities allow", () => {
    const full: UserMenuCapabilities = {
      showCreate: true,
      showInstructor: true,
      showAdmin: true,
      showSeller: true,
      showAdvertise: true,
    };
    const labels = buildUserMenuGroups("/profile/demo_user", full).flatMap(
      (g) => g.items.map((i) => i.label)
    );
    expect(labels).toEqual([
      "Profile",
      "Create",
      "Saved",
      "Learning",
      "Instructor",
      "Rewards",
      "Notifications",
      "Settings",
      "Store",
      "Seller hub",
      "Wishlist",
      "Advertise",
      "Admin",
    ]);
    const hrefs = listUserMenuHrefs("/profile/demo_user", full);
    expect(hrefs).toContain(LEARNING_INSTRUCTOR_ROUTES.hub);
    expect(hrefs).toContain(APP_ROUTES.seller);
    expect(hrefs).toContain(APP_ROUTES.adminAds);
    expect(hrefs).not.toContain(APP_ROUTES.adminStore);
  });

  it("UserMenu resolves capabilities and renders grouped items", () => {
    const src = readFileSync(
      join(process.cwd(), "app/components/UserMenu.tsx"),
      "utf8"
    );
    expect(src).toMatch(/buildUserMenuGroups/);
    expect(src).toMatch(/resolveUserMenuCapabilities/);
    expect(src).toMatch(/aria-label=\{"Account menu"\}|aria-label="Account menu"/);
    expect(src).toMatch(/role="menuitem"/);
    expect(src).not.toMatch(/Feed V1|Video V1|Accounts V1/);
  });
});
