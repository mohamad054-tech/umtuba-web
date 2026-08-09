import { describe, expect, it } from "vitest";
import { dedupePublicCatalogCourses } from "./publicCatalog";

describe("dedupePublicCatalogCourses", () => {
  it("prefers JA-prefixed twin", () => {
    const input = [
      { slug: "ai-foundations-for-builders", title: "AI Foundations for Builders" },
      { slug: "ja-01", title: "JA-01 — AI Foundations for Builders" },
    ];
    const out = dedupePublicCatalogCourses(input);
    expect(out).toHaveLength(1);
    expect(out[0].slug).toBe("ja-01");
  });
});
