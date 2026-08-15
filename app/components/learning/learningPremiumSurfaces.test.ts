import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("Learning premium surface wiring", () => {
  it("catalog uses searchable/filterable browser", () => {
    const page = read("app/learning/catalog/page.tsx");
    const browser = read("app/components/learning/CatalogBrowser.tsx");
    expect(page).toMatch(/CatalogBrowser/);
    expect(browser).toMatch(/role="search"/);
    expect(browser).toMatch(/type="search"/);
    expect(browser).toMatch(/All levels/);
  });

  it("hub and progress surfaces wire progress bars", () => {
    const hub = read("app/components/learning/LearningHub.tsx");
    const summary = read("app/components/learning/ProgressSummary.tsx");
    expect(hub).toMatch(/LearningProgressBar/);
    expect(hub).toMatch(/Continue Learning/);
    expect(summary).toMatch(/LearningProgressBar/);
    expect(summary).toMatch(/role|LearningStatusBadge/);
  });
});
