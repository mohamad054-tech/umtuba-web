import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_LEARNER_ROUTES,
  resolveLessonCompletionHandoff,
} from "./learnerDelivery";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const HUB = read("app/components/learning/LearningHub.tsx");
const OUTLINE = read("app/components/learning/CourseOutline.tsx");
const VIEWER = read("app/components/learning/LessonViewer.tsx");
const ROUTES_SRC = read("lib/learning/learnerDelivery.ts");

const LESSON_ROUTE_RE = /\/learning\/lessons\/\$\{/;
const COURSE_ROUTE_RE = /\/learning\/courses\/\$\{/;

describe("Learner UI contract — LearningHub", () => {
  it("keeps stable E2E testids and primary Resume CTA", () => {
    expect(HUB).toMatch(/data-testid="learning-hub"/);
    expect(HUB).toMatch(/data-testid="learning-hub-continue"/);
    expect(HUB).toMatch(/data-testid="learning-hub-resume"/);
    expect(HUB).toMatch(/>\s*Resume\s*</);
    expect(HUB).toMatch(/Course outline/);
  });

  it("empty-state explains no accessible enrollments", () => {
    expect(HUB).toMatch(
      /No accessible programs or courses yet\. Once you are enrolled/
    );
    expect(HUB).toMatch(/const empty = hub\.programs\.length === 0 && hub\.courses\.length === 0/);
    expect(HUB).toMatch(/\{empty \? \(/);
  });

  it("enrolled courses render via LEARNING_LEARNER_ROUTES.course", () => {
    expect(HUB).toMatch(/hub\.courses\.map\(\(course\)/);
    expect(HUB).toMatch(/LEARNING_LEARNER_ROUTES\.course\(course\.id\)/);
    expect(HUB).toMatch(/LEARNING_LEARNER_ROUTES\.course\(continueCourse\.id\)/);
  });

  it("continue/resume targets only use provided continue_href (no invented paths)", () => {
    expect(HUB).toMatch(/continueCourse\.continue_href/);
    expect(HUB).toMatch(/course\.continue_href/);
    expect(HUB).toMatch(/href=\{continueCourse\.continue_href\}/);
    expect(HUB).toMatch(/href=\{course\.continue_href\}/);
    // Selection requires continue_href before exposing Continue Learning.
    expect(HUB).toMatch(/courses\.filter\(\(c\) => c\.continue_href\)/);
    expect(HUB).toMatch(/continueCourse && continueCourse\.continue_href/);
  });

  it("does not invent inaccessible lesson targets or hardcode lesson UUIDs", () => {
    expect(HUB).not.toMatch(/\/learning\/lessons\/[0-9a-f-]{8}/i);
    expect(HUB).not.toMatch(/instructor/i);
    expect(HUB).not.toMatch(/LEARNING_INSTRUCTOR/);
  });

  it("continue picker prefers in_progress then not_started", () => {
    expect(HUB).toMatch(/progress\?\.status === "in_progress"/);
    expect(HUB).toMatch(/percent_complete/);
    expect(HUB).toMatch(/"not_started"/);
  });
});

describe("Learner UI contract — CourseOutline", () => {
  it("keeps outline root testid and lesson route testids", () => {
    expect(OUTLINE).toMatch(/data-testid="learning-course-outline"/);
    expect(OUTLINE).toMatch(
      /data-testid=\{`learning-outline-lesson-\$\{lesson\.id\}`\}/
    );
  });

  it("renders sections and lessons in provided order with progress labels", () => {
    expect(OUTLINE).toMatch(/outline\.sections\.map\(\(section\)/);
    expect(OUTLINE).toMatch(/section\.lessons\.map\(\(lesson\)/);
    expect(OUTLINE).toMatch(/progressLabel\(lesson\.progress_status\)/);
    expect(OUTLINE).toMatch(/status === "completed"/);
    expect(OUTLINE).toMatch(/status === "in_progress"/);
  });

  it("uses LEARNING_LEARNER_ROUTES.lesson for outline links (Prev/Next-compatible)", () => {
    expect(OUTLINE).toMatch(/LEARNING_LEARNER_ROUTES\.lesson\(lesson\.id\)/);
    expect(OUTLINE).toMatch(/LEARNING_LEARNER_ROUTES\.progress\(outline\.course\.id\)/);
    expect(OUTLINE).toMatch(/LEARNING_LEARNER_ROUTES\.resources\(outline\.course\.id\)/);
  });

  it("empty published sections/lessons show status copy", () => {
    expect(OUTLINE).toMatch(/No published sections yet\./);
    expect(OUTLINE).toMatch(/No published lessons\./);
  });

  it("does not expose instructor/admin authoring actions to learners", () => {
    expect(OUTLINE).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(OUTLINE).not.toMatch(/\/learning\/instructor/);
    expect(OUTLINE).not.toMatch(/bootstrap/i);
    expect(OUTLINE).not.toMatch(/Publish|Unpublish|Archive/);
  });

  it("lock gating is not implemented in outline (viewer fail-closed owns it)", () => {
    // Proven behavior: outline lists published lessons as enterable routes;
    // locked/protected content is enforced in LessonViewer.
    expect(OUTLINE).not.toMatch(/learning-lesson-locked/);
    expect(OUTLINE).not.toMatch(/canRenderProtectedContent/);
    expect(OUTLINE).toMatch(/LEARNING_LEARNER_ROUTES\.lesson\(lesson\.id\)/);
  });
});

describe("Learner UI contract — LessonViewer", () => {
  it("keeps Browser E2E foundation testids", () => {
    expect(VIEWER).toMatch(/data-testid="learning-lesson-viewer"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-content"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-locked"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-nav"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-nav-prev"/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-nav-next"/);
  });

  it("renders protected content only from verified unlocked engine blocks", () => {
    expect(VIEWER).toMatch(
      /const verifiedEngine =\s*access\.state === "verified_unlocked" \? access\.engine : null/
    );
    expect(VIEWER).toMatch(
      /const blocks: LearningLessonContentBlock\[\] = verifiedEngine/
    );
    expect(VIEWER).toMatch(/ContentBlockRenderer block=\{block\}/);
    expect(VIEWER).toMatch(/Never fall back to delivery SELECT/);
  });

  it("presents progress/current state and completion handoff rules", () => {
    expect(VIEWER).toMatch(/Progress: \{delivery\.progress_status/);
    expect(VIEWER).toMatch(/resolveLessonCompletionHandoff/);
    expect(VIEWER).toMatch(/handoff\?\.kind === "mark_complete"/);
    expect(VIEWER).toMatch(/handoff\?\.kind === "continue_next"/);
    expect(VIEWER).toMatch(/handoff\?\.kind === "course_complete"/);
    expect(VIEWER).toMatch(/canRender\s*\?\s*resolveLessonCompletionHandoff/);
  });

  it("fail-closes locked/protected content without rendering content section", () => {
    expect(VIEWER).toMatch(/access\.state === "locked"/);
    expect(VIEWER).toMatch(/LEARNING_LESSON_LOCKED_MESSAGE/);
    expect(VIEWER).toMatch(/data-testid="learning-lesson-locked"/);
    expect(VIEWER).toMatch(/canRender \? \(/);
    expect(VIEWER).toMatch(/\) : locked \? \(/);
  });

  it("Prev/Next/Resume nav uses delivery targets and learner route truth", () => {
    expect(VIEWER).toMatch(/delivery\.previous_lesson\.href/);
    expect(VIEWER).toMatch(/delivery\.next_lesson\.href/);
    expect(VIEWER).toMatch(/LEARNING_LEARNER_ROUTES\.aiTutor\(delivery\.lesson\.id\)/);
    expect(VIEWER).toMatch(/handoff\.next_lesson\.href/);
  });

  it("has no raw HTML injection path", () => {
    expect(VIEWER).not.toMatch(/dangerouslySetInnerHTML/);
    expect(VIEWER).not.toMatch(/innerHTML/);
    expect(VIEWER).toMatch(/asPlainString\(/);
    expect(VIEWER).toMatch(/isSafeHttpUrl\(/);
  });

  it("mounts learner-only personal notes panel inside verified content path", () => {
    expect(VIEWER).toMatch(/LessonNotesPanel/);
    expect(VIEWER).toMatch(/<LessonNotesPanel lessonId=\{delivery\.lesson\.id\} \/>/);
    expect(VIEWER).toMatch(/canRender \? \([\s\S]*LessonNotesPanel/);
  });
});

describe("Learner UI contract — shared Learning route truth", () => {
  it("LEARNING_LEARNER_ROUTES templates stay canonical", () => {
    expect(LEARNING_LEARNER_ROUTES.hub).toBe("/learning");
    expect(LEARNING_LEARNER_ROUTES.course("c1")).toBe("/learning/courses/c1");
    expect(LEARNING_LEARNER_ROUTES.lesson("l1")).toBe("/learning/lessons/l1");
    expect(ROUTES_SRC).toMatch(COURSE_ROUTE_RE);
    expect(ROUTES_SRC).toMatch(LESSON_ROUTE_RE);
  });

  it("Hub/Outline/Viewer import LEARNING_LEARNER_ROUTES instead of hardcoding paths", () => {
    for (const src of [HUB, OUTLINE, VIEWER]) {
      expect(src).toMatch(/LEARNING_LEARNER_ROUTES/);
      expect(src).not.toMatch(/href=\{`\/learning\/courses\//);
      expect(src).not.toMatch(/href=\{`\/learning\/lessons\//);
      expect(src).not.toMatch(/href="\/learning\/courses\//);
      expect(src).not.toMatch(/href="\/learning\/lessons\//);
    }
  });

  it("completion handoff only exposes continue when next lesson target exists", () => {
    expect(
      resolveLessonCompletionHandoff({
        progress_status: "completed",
        next_lesson: {
          lesson_id: "l2",
          href: LEARNING_LEARNER_ROUTES.lesson("l2"),
        },
        course_id: "c1",
      })
    ).toEqual({
      kind: "continue_next",
      next_lesson: {
        lesson_id: "l2",
        href: "/learning/lessons/l2",
      },
    });

    expect(
      resolveLessonCompletionHandoff({
        progress_status: "in_progress",
        next_lesson: null,
        course_id: "c1",
      })
    ).toEqual({ kind: "mark_complete" });
  });
});
