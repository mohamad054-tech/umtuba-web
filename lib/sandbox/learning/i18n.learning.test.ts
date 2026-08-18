import { describe, expect, it } from "vitest";
import { SANDBOX_MESSAGE_KEYS, sandboxDirection, sandboxT } from "../i18n";

const ARABIC = /[\u0600-\u06FF]/;
const CHROME_KEYS = [
  "learning",
  "catalog",
  "searchFilter",
  "studentDashboard",
  "instructorDashboard",
  "enrollmentModels",
  "enrollSandbox",
  "mockPayment",
  "quiz",
  "aiTutor",
  "certificate",
  "qualityJudgments",
  "unknownExercise",
  "exerciseUnavailable",
  "returnToLesson",
] as const;

describe("Learning sandbox Arabic chrome", () => {
  it("is RTL for ar and LTR for en", () => {
    expect(sandboxDirection("ar")).toBe("rtl");
    expect(sandboxDirection("en")).toBe("ltr");
  });

  it("translates Learning chrome to Arabic without requiring authored lesson translation", () => {
    for (const key of CHROME_KEYS) {
      expect(sandboxT("ar", key)).toMatch(ARABIC);
      expect(sandboxT("en", key).length).toBeGreaterThan(2);
    }
    expect(SANDBOX_MESSAGE_KEYS).toContain("authoredSourceLanguage");
    expect(sandboxT("ar", "authoredSourceLanguage")).toMatch(ARABIC);
  });
});
