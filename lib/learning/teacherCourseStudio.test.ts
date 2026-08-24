import { describe, expect, it } from "vitest";
import {
  canTeacherCreateCourse,
  parseObjectivesField,
  resolveCourseVisibility,
  validateTeacherCourseCreateInput,
} from "./teacherCourseStudio";

describe("teacher course studio", () => {
  it("only approved teachers may create courses", () => {
    expect(canTeacherCreateCourse("approved")).toBe(true);
    expect(canTeacherCreateCourse("pending_review")).toBe(false);
    expect(canTeacherCreateCourse(null)).toBe(false);
  });

  it("validates product fields and keeps paid architecture payment-disabled", () => {
    const ok = validateTeacherCourseCreateInput({
      title: "Arabic Conversation",
      subtitle: "Speak with confidence",
      description: "A free starter course.",
      category: "language",
      level: "beginner",
      language: "ar",
      access_kind: "free",
      learning_objectives: parseObjectivesField("Greetings\nQuestions"),
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.access_kind).toBe("free");
      expect(ok.data.future_price_amount_minor).toBeNull();
      expect(resolveCourseVisibility("free")).toBe("public");
      expect(resolveCourseVisibility("paid")).toBe("private");
    }
  });

  it("rejects a too-short title", () => {
    expect(validateTeacherCourseCreateInput({ title: "Hi" }).ok).toBe(false);
  });
});
