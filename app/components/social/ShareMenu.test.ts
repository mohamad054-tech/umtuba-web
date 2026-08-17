import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const menu = readFileSync(
  join(process.cwd(), "app/components/social/ShareMenu.tsx"),
  "utf8"
);

describe("ShareMenu viewport contract", () => {
  it("keeps collision placement, portal, and keyboard focus wiring", () => {
    expect(menu).toMatch(/placeShareMenu/);
    expect(menu).toMatch(/createPortal/);
    expect(menu).toMatch(/useDialogA11y/);
    expect(menu).toMatch(/initialFocusRef: firstButtonRef/);
    expect(menu).toMatch(/role="menu"/);
    expect(menu).toMatch(/role="menuitem"/);
    expect(menu).toMatch(/readDocumentDir/);
    expect(menu).not.toMatch(/overflow-hidden/);
    expect(menu).not.toMatch(/-translate-x-1\/2/);
  });
});
