import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("LEARNING_SHELL_SKIP_LINK_AND_PROGRESS_SUMMARY_A11Y_V1", () => {
  it("LearningShell exposes skip link and main content target", () => {
    const path = join(ROOT, "app/components/learning/LearningShell.tsx");
    expect(existsSync(path)).toBe(true);
    const src = readFileSync(path, "utf8");
    expect(src).toMatch(/data-testid="learning-skip-link"/);
    expect(src).toMatch(/href="#learning-main-content"/);
    expect(src).toMatch(/id="learning-main-content"/);
    expect(src).toMatch(/aria-label=\{title\}/);
  });

  it("ProgressSummary exposes progressbar semantics", () => {
    const path = join(ROOT, "app/components/learning/ProgressSummary.tsx");
    expect(existsSync(path)).toBe(true);
    const src = readFileSync(path, "utf8");
    expect(src).toMatch(/role="progressbar"/);
    expect(src).toMatch(/aria-valuemin=\{0\}/);
    expect(src).toMatch(/aria-valuemax=\{100\}/);
    expect(src).toMatch(/aria-valuenow=\{value\}/);
    expect(src).toMatch(/data-testid="learning-progress-summary-bar"/);
    expect(src).toMatch(/role="status"/);
  });
});
