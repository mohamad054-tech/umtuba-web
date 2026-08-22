import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_PUBLIC_ROUTES } from "../../lib/learning/publicCatalog";
import { APP_ROUTES } from "../lib/nav/routes";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Learning guest course entry", () => {
  it("sends guests from My Learning hub to the public catalog, not login", () => {
    const hub = read("app/learning/page.tsx");
    expect(hub).toMatch(/LEARNING_PUBLIC_ROUTES\.catalog/);
    expect(hub).toMatch(/if \(!viewerId\)/);
    expect(hub).toMatch(/redirect\(\s*LEARNING_PUBLIC_ROUTES\.catalog/);
    expect(hub).not.toMatch(/login\?next=/);
    expect(LEARNING_PUBLIC_ROUTES.catalog).toBe("/learning/catalog");
    expect(APP_ROUTES.learning).toBe("/learning");
  });

  it("makes each catalog course card a single route to the public landing", () => {
    const browser = read("app/components/learning/CatalogBrowser.tsx");
    expect(browser).toMatch(/LEARNING_PUBLIC_ROUTES\.course\(course\.slug\)/);
    expect(browser).toMatch(/learning\.catalog\.viewCourse/);
    expect(browser).toMatch(
      /<Link[\s\S]*href=\{LEARNING_PUBLIC_ROUTES\.course\(course\.slug\)\}/
    );
  });
});
