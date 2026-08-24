import { describe, expect, it } from "vitest";
import { validateCourseReviewInput } from "./courseReviews";

describe("course reviews", () => {
  it("accepts a 1–5 rating from an enrolled learner payload", () => {
    const ok = validateCourseReviewInput({
      course_id: "11111111-1111-4111-8111-111111111111",
      rating: 5,
      comment: "Clear lessons.",
    });
    expect(ok.ok).toBe(true);
  });

  it("rejects out-of-range ratings", () => {
    expect(
      validateCourseReviewInput({
        course_id: "11111111-1111-4111-8111-111111111111",
        rating: 0,
      }).ok
    ).toBe(false);
    expect(
      validateCourseReviewInput({
        course_id: "11111111-1111-4111-8111-111111111111",
        rating: 6,
      }).ok
    ).toBe(false);
  });
});
