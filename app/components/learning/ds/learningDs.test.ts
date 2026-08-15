import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { learningDs } from "./tokens";
import * as ds from "./index";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("learning design-system foundation", () => {
  it("exports stable tokens", () => {
    expect(learningDs.pageMax).toContain("max-w");
    expect(learningDs.cardRadius).toContain("rounded");
  });

  it("re-exports primitives", () => {
    expect(ds.LearningContainer).toBeTypeOf("function");
    expect(ds.LearningSectionHeader).toBeTypeOf("function");
    expect(ds.LearningCardShell).toBeTypeOf("function");
    expect(ds.LearningProgressBar).toBeTypeOf("function");
    expect(ds.LearningStatusBadge).toBeTypeOf("function");
    expect(ds.LearningStatePanel).toBeTypeOf("function");
  });

  it("progress bar exposes progressbar semantics", () => {
    const src = read(
      "app/components/learning/ds/LearningProgressBar.tsx"
    );
    expect(src).toMatch(/role="progressbar"/);
    expect(src).toMatch(/aria-valuenow/);
  });
});

describe("LearningShell UAF-04 full-bleed chrome", () => {
  it("renders AppTopNav outside LearningContainer max-width", () => {
    const src = read("app/components/learning/LearningShell.tsx");
    expect(src).toMatch(/AppTopNav/);
    expect(src).toMatch(/LearningContainer/);
    const navIdx = src.indexOf("<AppTopNav");
    const containerIdx = src.indexOf("<LearningContainer");
    expect(navIdx).toBeGreaterThan(-1);
    expect(containerIdx).toBeGreaterThan(navIdx);
    expect(src).toMatch(/rtl:rotate-180/);
  });
});
