import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const PANEL = join(
  ROOT,
  "app/components/collaboration/LearningResourceLinksPanel.tsx"
);

describe("COLLABORATION_LEARNING_RESOURCE_LINKS_PANEL_A11Y_V1", () => {
  it("ships the learning resource links panel", () => {
    expect(existsSync(PANEL)).toBe(true);
  });

  it("section is labelled and empty/error/list states are announced", () => {
    const src = readFileSync(PANEL, "utf8");
    expect(src).toMatch(/aria-labelledby=\{headingId\}/);
    expect(src).toMatch(/data-testid="collaboration-learning-links-empty"/);
    expect(src).toMatch(/data-testid="collaboration-learning-links-error"/);
    expect(src).toMatch(/data-testid="collaboration-learning-links-list"/);
    expect(src).toMatch(/role="status"/);
    expect(src).toMatch(/role="alert"/);
  });

  it("link/unlink forms expose busy semantics and focusable open links", () => {
    const src = readFileSync(PANEL, "utf8");
    expect(src).toMatch(/aria-busy=\{pending\}/);
    expect(src).toMatch(/data-testid="collaboration-learning-link-form"/);
    expect(src).toMatch(/data-testid="collaboration-learning-unlink-form"/);
    expect(src).toMatch(/aria-invalid=\{showError \|\| undefined\}/);
    expect(src).toMatch(/watch-focus-ring mt-2 inline-block/);
    expect(src).toMatch(/text-white\/60/);
  });
});
