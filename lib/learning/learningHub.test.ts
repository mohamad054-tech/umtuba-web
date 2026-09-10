import { describe, expect, it } from "vitest";
import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "./publicCatalog";
import { LEARNING_TEACHER_ROUTES } from "./teacherPlatform";
import {
  LEARNING_HUB_DEEP_LINKS,
  LEARNING_HUB_SECTIONS,
  getVisibleLearningHubSections,
  isLearningHubPaymentEnabled,
  learningHubHref,
  parseLearningHubSection,
} from "./learningHub";

describe("learning hub section model", () => {
  it("shows the learner sections without teacher tools", () => {
    expect(
      getVisibleLearningHubSections({ isTeacher: false }).map((s) => s.id)
    ).toEqual([
      "home",
      "courses",
      "progress",
      "live",
      "assessments",
      "oneToOne",
      "marketplace",
    ]);
  });

  it("adds teacher tools for teachers", () => {
    expect(
      getVisibleLearningHubSections({ isTeacher: true }).map((s) => s.id)
    ).toContain("teacher");
  });

  it("does not expose payment as a hub section", () => {
    expect(LEARNING_HUB_SECTIONS.map((s) => s.id)).not.toContain("payment");
    expect(isLearningHubPaymentEnabled()).toBe(false);
  });

  it("parses hub query values and falls back to home", () => {
    expect(parseLearningHubSection("oneToOne")).toBe("oneToOne");
    expect(parseLearningHubSection(["marketplace"])).toBe("marketplace");
    expect(parseLearningHubSection("payment")).toBe("home");
    expect(parseLearningHubSection(undefined)).toBe("home");
  });

  it("preserves existing Learning deep links", () => {
    expect(LEARNING_HUB_DEEP_LINKS.home).toBe(LEARNING_LEARNER_ROUTES.hub);
    expect(LEARNING_HUB_DEEP_LINKS.catalog).toBe("/learning/catalog");
    expect(LEARNING_HUB_DEEP_LINKS.course("course-1")).toBe(
      "/learning/courses/course-1"
    );
    expect(LEARNING_HUB_DEEP_LINKS.lesson("lesson-1")).toBe(
      "/learning/lessons/lesson-1"
    );
    expect(LEARNING_HUB_DEEP_LINKS.assessment("activity-1")).toBe(
      "/learning/activities/activity-1/assessment"
    );
    expect(LEARNING_HUB_DEEP_LINKS.attempt("attempt-1")).toBe(
      "/learning/attempts/attempt-1"
    );
    expect(LEARNING_HUB_DEEP_LINKS.liveSchedule("course-1")).toBe(
      "/learning/courses/course-1/live"
    );
    expect(LEARNING_HUB_DEEP_LINKS.instructor).toBe("/learning/instructor");
    expect(LEARNING_HUB_DEEP_LINKS.teacherCenter).toBe(
      LEARNING_TEACHER_ROUTES.center
    );
    expect(LEARNING_HUB_DEEP_LINKS.marketplace).toBe("/sandbox/learning/partners");
    expect(LEARNING_PUBLIC_ROUTES.catalog).toBe("/learning/catalog");
  });

  it("keeps surface=library when switching hub sections", () => {
    expect(learningHubHref("home")).toBe("/learning");
    expect(learningHubHref("progress", { surface: "library" })).toBe(
      "/learning?hub=progress&surface=library"
    );
    expect(learningHubHref("home", { surface: "library" })).toBe(
      "/learning?surface=library"
    );
  });
});
