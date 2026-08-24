import { describe, expect, it } from "vitest";
import {
  DEMO_COURSES,
  DEMO_STUDENTS,
  DEMO_TEACHERS,
  continueCourse,
  demoCourse,
  demoLesson,
  demoTeacher,
} from "./world";

describe("learning visual demo world", () => {
  it("keeps fictional demo identities separable", () => {
    expect(DEMO_TEACHERS.length).toBeGreaterThanOrEqual(6);
    expect(DEMO_STUDENTS.length).toBeGreaterThanOrEqual(4);
    expect(DEMO_COURSES.length).toBeGreaterThanOrEqual(9);
    for (const teacher of DEMO_TEACHERS) {
      expect(teacher.id.startsWith("demo-")).toBe(true);
      expect(teacher.name.en.toLowerCase()).toContain("demo");
    }
  });

  it("resolves continue lesson and public course slugs", () => {
    const resume = continueCourse();
    expect(resume).not.toBeNull();
    expect(demoLesson(resume!.enrollment.continueLessonId)?.course.id).toBe(
      resume!.course.id
    );
    expect(demoCourse("quiet-interfaces")?.category).toBe("uiux");
    expect(demoTeacher("demo-teacher-nour-qamar")?.handle).toBe("nour-qamar-demo");
  });
});
