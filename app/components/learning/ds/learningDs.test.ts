import { describe, expect, it } from "vitest";
import { learningDs } from "./tokens";
import * as ds from "./index";

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
});
