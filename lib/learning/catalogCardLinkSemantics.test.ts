import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CATALOG_PAGE = join(ROOT, "app/learning/catalog/page.tsx");

describe("LEARNING_CATALOG_CARD_LINK_SEMANTICS_AND_EMPTY_STATE_V1", () => {
  it("ships the public catalog page", () => {
    expect(existsSync(CATALOG_PAGE)).toBe(true);
  });

  it("empty state exposes status semantics", () => {
    const src = readFileSync(CATALOG_PAGE, "utf8");
    expect(src).toMatch(/role="status"/);
    expect(src).toMatch(/data-testid="learning-catalog-empty"/);
    expect(src).toMatch(/No public courses are available yet/);
  });

  it("catalog list and cards are single keyboard-accessible links", () => {
    const src = readFileSync(CATALOG_PAGE, "utf8");
    expect(src).toMatch(/aria-label="Public courses"/);
    expect(src).toMatch(/data-testid="learning-catalog-list"/);
    expect(src).toMatch(/data-testid="learning-catalog-card-link"/);
    expect(src).toMatch(/aria-label=\{`View course: \$\{course\.name\}`\}/);
    expect(src).toMatch(/watch-focus-ring/);
    expect(src).toMatch(/alt=\{`Cover for \$\{course\.name\}`\}/);
    // CTA is a non-interactive span inside the card link (no nested <Link>).
    expect(src).toMatch(/<span className="inline-flex rounded-xl bg-white/);
    expect(src).not.toMatch(
      /<p className="mt-4">\s*<Link[\s\S]*?>\s*View Course/
    );
  });
});
