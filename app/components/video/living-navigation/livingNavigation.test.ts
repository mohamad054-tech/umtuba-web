import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LIVING_NAVIGATION_IDS,
  LIVING_NAVIGATION_ITEMS,
  getLivingNavigationItem,
} from "./livingNavigationConfig";
import {
  INITIAL_LIVING_NAVIGATION_STATE,
  reduceLivingNavigation,
} from "./livingNavigationModel";

const ROOT = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("Living Video Navigation configuration", () => {
  it("has stable unique capability ids in placement order", () => {
    const ids = LIVING_NAVIGATION_ITEMS.map((item) => item.id);
    expect(ids).toEqual([...LIVING_NAVIGATION_IDS]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(LIVING_NAVIGATION_ITEMS.map((item) => item.placement.slot)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("keeps complete prototype metadata in one typed configuration", () => {
    for (const item of LIVING_NAVIGATION_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.icon.length).toBeGreaterThan(0);
      expect(item.overlayTitle.length).toBeGreaterThan(0);
      expect(item.placeholderDescription.length).toBeGreaterThan(20);
    }
  });

  it("keeps Hello City disabled behind its existing feature flag key", () => {
    const helloCity = getLivingNavigationItem("hello-city");
    expect(helloCity).toMatchObject({
      featureStatus: "disabled",
      featureFlagKey: "hello_city_enabled",
    });
  });
});

describe("Living Video Navigation interaction model", () => {
  it("opens the selected enabled item and switches overlay content in place", () => {
    const world = reduceLivingNavigation(INITIAL_LIVING_NAVIGATION_STATE, {
      type: "open",
      id: "world",
    });
    const store = reduceLivingNavigation(world, {
      type: "open",
      id: "store",
    });

    expect(world.selectedId).toBe("world");
    expect(store.selectedId).toBe("store");
  });

  it("closes back to the underlying Watch state", () => {
    const open = reduceLivingNavigation(INITIAL_LIVING_NAVIGATION_STATE, {
      type: "open",
      id: "wallet",
    });
    expect(reduceLivingNavigation(open, { type: "close" })).toEqual(
      INITIAL_LIVING_NAVIGATION_STATE
    );
  });

  it("models Escape as a close without changing Watch state", () => {
    const open = reduceLivingNavigation(INITIAL_LIVING_NAVIGATION_STATE, {
      type: "open",
      id: "ai",
    });
    expect(reduceLivingNavigation(open, { type: "escape" })).toEqual(
      INITIAL_LIVING_NAVIGATION_STATE
    );
  });

  it("does not open an accessible disabled item", () => {
    expect(
      reduceLivingNavigation(INITIAL_LIVING_NAVIGATION_STATE, {
        type: "open",
        id: "hello-city",
      })
    ).toBe(INITIAL_LIVING_NAVIGATION_STATE);
  });
});

describe("Living Video Navigation Watch integration", () => {
  const watch = read("app/watch/WatchExperience.tsx");
  const navigation = read(
    "app/components/video/living-navigation/LivingVideoNavigation.tsx"
  );
  const overlay = read(
    "app/components/video/living-navigation/LivingNavigationOverlay.tsx"
  );
  const action = read(
    "app/components/video/living-navigation/LivingNavigationAction.tsx"
  );

  it("keeps the video feed mounted as a stable sibling of the overlay controller", () => {
    expect(watch).toMatch(/<VerticalVideoFeed[\s\S]*<LivingVideoNavigation/);
    expect(watch).toMatch(
      /prototypePanelsAllowed \? \(\s*<LivingVideoNavigation/
    );
    expect(watch).not.toMatch(
      /livingNavigation\.selectedId\s*\?\s*<VerticalVideoFeed/
    );
    expect(navigation).toMatch(
      /\{selectedItem \? \(\s*<LivingNavigationOverlay/
    );
  });

  it("uses one stage-scoped dialog with focus handling, Escape, backdrop, and sheet layout", () => {
    expect(overlay).toMatch(/useDialogA11y/);
    expect(overlay).toMatch(/role="dialog"/);
    expect(overlay).toMatch(/aria-modal="true"/);
    expect(overlay).toMatch(/onClick=\{onClose\}/);
    expect(overlay).toMatch(/absolute inset-0 z-\[90\]/);
    expect(overlay).not.toMatch(/createPortal|document\.body/);
    expect(navigation).toMatch(/flex-col gap-2/);
    expect(action).toMatch(/h-11 w-11/);
    expect(read("app/lib/product/useDialogA11y.ts")).toMatch(
      /event\.key === "Escape"[\s\S]*onClose\(\)/
    );
  });

  it("uses buttons rather than route navigation or exact-context departures", () => {
    const combined = `${navigation}\n${overlay}\n${action}`;
    expect(action).toMatch(/<button/);
    expect(action).toMatch(/aria-disabled/);
    expect(combined).not.toMatch(/useRouter|router\.push|<Link|href=/);
    expect(combined).not.toMatch(
      /saveWatchExactContextDeparture|EXACT_CONTEXT_RESTORE_EVENT/
    );
  });
});
