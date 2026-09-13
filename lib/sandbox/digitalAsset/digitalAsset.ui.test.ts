import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../../..");

function readApp(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("sandbox UI copy", () => {
  it("marks every digital-asset page as TEST/SANDBOX and never offers product convert", () => {
    const files = [
      "app/sandbox/digital-asset/layout.tsx",
      "app/sandbox/digital-asset/page.tsx",
      "app/sandbox/digital-asset/user/page.tsx",
      "app/sandbox/digital-asset/admin/page.tsx",
      "app/sandbox/digital-asset/history/page.tsx",
      "app/sandbox/digital-asset/treasury/page.tsx",
    ];
    for (const file of files) {
      const src = readApp(file);
      expect(src, file).not.toMatch(/award_um_points/);
      expect(src, file).not.toMatch(/<button[^>]*>\s*Convert/);
    }
    const user = readApp("app/sandbox/digital-asset/user/page.tsx");
    expect(user).toMatch(/productUserPreview/);
    const layout = readApp("app/sandbox/digital-asset/layout.tsx");
    expect(layout).toMatch(/LAB_BANNER/);
  });
});
