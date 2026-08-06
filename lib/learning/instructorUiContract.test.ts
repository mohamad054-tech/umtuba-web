import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_ASSESSMENT_ROUTES } from "./assessmentAuthoring";
import { LEARNING_ASSIGNMENT_ROUTES } from "./assignmentsCoursework";
import {
  canArchiveInstructorLifecycle,
  canPublishInstructorLifecycle,
  formatInstructorLifecycleStatus,
  LEARNING_INSTRUCTOR_ROUTES,
} from "./instructorAuthoring";
import { LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES } from "./instructorBootstrap";
import { LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES } from "./instructorExperience";
import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";
import {
  LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES,
} from "./lessonContentBlocksFoundation";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const DASHBOARD = read("app/learning/instructor/page.tsx");
const COURSE_TREE = read("app/learning/instructor/courses/[courseId]/page.tsx");
const LESSON_BLOCKS = read(
  "app/learning/instructor/courses/[courseId]/lessons/[lessonId]/page.tsx"
);
const QUESTIONS = read(
  "app/learning/instructor/courses/[courseId]/activities/[activityId]/questions/page.tsx"
);
const ASSIGNMENT = read(
  "app/learning/instructor/courses/[courseId]/activities/[activityId]/assignment/page.tsx"
);
const REVIEW_QUEUE = read("app/learning/instructor/review/page.tsx");
const ACTION_FORM = read(
  "app/components/learning/instructor/InstructorActionForm.tsx"
);
const AUTHORING_SRC = read("lib/learning/instructorAuthoring.ts");
const EXPERIENCE_SRC = read("lib/learning/instructorExperience.ts");

describe("Instructor UI contract — dashboard", () => {
  it("gates on auth and loads instructor dashboard via experience helper", () => {
    expect(DASHBOARD).toMatch(/getServerUser\(\)/);
    expect(DASHBOARD).toMatch(/loadInstructorDashboard\(supabase\)/);
    expect(DASHBOARD).toMatch(
      /redirect\(\s*`\/login\?next=\$\{encodeURIComponent\(LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES\.hub\)\}`/
    );
  });

  it("exposes instructor-only entry points via canonical routes", () => {
    expect(DASHBOARD).toMatch(/LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES\.hub/);
    expect(DASHBOARD).toMatch(/LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES\.reviewQueue/);
    expect(DASHBOARD).toMatch(/Create catalog/);
    expect(DASHBOARD).toMatch(/Review queue/);
  });

  it("renders owned/managed courses and empty-state create path", () => {
    expect(DASHBOARD).toMatch(/loaded\.data\.courses\.map\(\(course\)/);
    expect(DASHBOARD).toMatch(/No manageable courses yet/);
    expect(DASHBOARD).toMatch(/LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES\.spaceNew/);
    expect(DASHBOARD).toMatch(
      /LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES\.courseOverview\(\s*course\.course_id/
    );
    expect(DASHBOARD).toMatch(/LEARNING_INSTRUCTOR_ROUTES\.course\(course\.course_id\)/);
  });

  it("does not present learner delivery CTAs as instructor actions", () => {
    expect(DASHBOARD).not.toMatch(/LEARNING_LEARNER_ROUTES\.lesson/);
    expect(DASHBOARD).not.toMatch(/LEARNING_LEARNER_ROUTES\.course/);
    expect(DASHBOARD).not.toMatch(/continue_href/);
    expect(DASHBOARD).not.toMatch(/>\s*Resume\s*</);
    // Learner hub is only the shell back-link, not an authoring action.
    expect(DASHBOARD).toMatch(/backHref=\{LEARNING_LEARNER_ROUTES\.hub\}/);
    expect(DASHBOARD).toMatch(/backLabel="Learner hub"/);
  });
});

describe("Instructor UI contract — course authoring shell/tree", () => {
  it("loads course tree and gates lifecycle on canManage", () => {
    expect(COURSE_TREE).toMatch(/loadInstructorCourseTree\(supabase, courseId\)/);
    expect(COURSE_TREE).toMatch(/const canManage = payload\.canManage/);
    expect(COURSE_TREE).toMatch(/\{canManage \? \(/);
    expect(COURSE_TREE).toMatch(/canPublishInstructorLifecycle\(tree\.course\.status\)/);
    expect(COURSE_TREE).toMatch(/canArchiveInstructorLifecycle\(tree\.course\.status\)/);
  });

  it("renders section → lesson → activity hierarchy in provided order", () => {
    expect(COURSE_TREE).toMatch(/tree\.sections\.map\(\(section\)/);
    expect(COURSE_TREE).toMatch(/section\.lessons\.map\(\(lesson\)/);
    expect(COURSE_TREE).toMatch(/lesson\.activities\.map\(\(activity\)/);
    expect(COURSE_TREE).toMatch(/section\.position/);
    expect(COURSE_TREE).toMatch(/lesson\.position/);
  });

  it("uses instructor create/edit/reorder navigation contracts", () => {
    expect(COURSE_TREE).toMatch(/createSectionAction/);
    expect(COURSE_TREE).toMatch(/createLessonAction/);
    expect(COURSE_TREE).toMatch(/createActivityAction/);
    expect(COURSE_TREE).toMatch(/reorderSectionsAction/);
    expect(COURSE_TREE).toMatch(/reorderLessonsAction/);
    expect(COURSE_TREE).toMatch(/reorderActivitiesAction/);
    expect(COURSE_TREE).toMatch(
      /LEARNING_INSTRUCTOR_ROUTES\.lesson\(\s*courseId,\s*lesson\.id/
    );
  });

  it("does not use learner delivery routes for authoring actions", () => {
    expect(COURSE_TREE).not.toMatch(/LEARNING_LEARNER_ROUTES/);
    expect(COURSE_TREE).not.toMatch(/href=\{`\/learning\/courses\//);
    expect(COURSE_TREE).not.toMatch(/href=\{`\/learning\/lessons\//);
    expect(COURSE_TREE).toMatch(/LEARNING_INSTRUCTOR_ROUTES\.hub/);
    expect(COURSE_TREE).toMatch(/LEARNING_INSTRUCTOR_ROUTES\.course/);
  });

  it("keeps publish/archive actions behind canManage and draft-aware course publish", () => {
    expect(COURSE_TREE).toMatch(/disabled=\{!canPublishCourse\}/);
    expect(COURSE_TREE).toMatch(/disabled=\{!canArchiveCourse\}/);
    expect(COURSE_TREE).toMatch(/Publish is available only when status is Draft/);
    expect(COURSE_TREE).toMatch(/publishCourseAction/);
    expect(COURSE_TREE).toMatch(/archiveCourseAction/);
  });
});

describe("Instructor UI contract — lesson content-block editor", () => {
  it("loads instructor lesson blocks and verifies course ownership match", () => {
    expect(LESSON_BLOCKS).toMatch(/loadInstructorLessonBlocks\(supabase, lessonId\)/);
    expect(LESSON_BLOCKS).toMatch(/lesson\.course_id !== courseId/);
    expect(LESSON_BLOCKS).toMatch(/LEARNING_INSTRUCTOR_ROUTES\.course\(courseId\)/);
  });

  it("offers only the minimal authoring block types currently supported in UI", () => {
    expect(LESSON_BLOCKS).toMatch(/<option value="rich_text">rich_text<\/option>/);
    expect(LESSON_BLOCKS).toMatch(/<option value="heading">heading<\/option>/);
    expect(LESSON_BLOCKS).toMatch(/<option value="callout">callout<\/option>/);
    expect(LESSON_BLOCKS).toMatch(/Basic text\/heading blocks only/);
  });

  it("keeps reserved and deferred block types unavailable in the create select", () => {
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES) {
      expect(LESSON_BLOCKS).not.toMatch(new RegExp(`value="${t}"`));
    }
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES) {
      expect(LESSON_BLOCKS).not.toMatch(new RegExp(`value="${t}"`));
    }
    expect(LESSON_BLOCKS).not.toMatch(/value="html"/);
    expect(LESSON_BLOCKS).not.toMatch(/value="embed"/);
  });

  it("presents block order, status, and publish/unpublish/archive actions", () => {
    expect(LESSON_BLOCKS).toMatch(/blocks\.map\(\(block\)/);
    expect(LESSON_BLOCKS).toMatch(/block\.position/);
    expect(LESSON_BLOCKS).toMatch(/\{block\.status\}/);
    expect(LESSON_BLOCKS).toMatch(/reorderContentBlocksAction/);
    expect(LESSON_BLOCKS).toMatch(/publishContentBlockAction/);
    expect(LESSON_BLOCKS).toMatch(/unpublishContentBlockAction/);
    expect(LESSON_BLOCKS).toMatch(/archiveContentBlockAction/);
    expect(LESSON_BLOCKS).toMatch(/updateContentBlockAction/);
  });

  it("has no raw HTML injection path", () => {
    expect(LESSON_BLOCKS).not.toMatch(/dangerouslySetInnerHTML/);
    expect(LESSON_BLOCKS).not.toMatch(/innerHTML/);
    expect(ACTION_FORM).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

describe("Instructor UI contract — assessment/assignment authoring", () => {
  it("questions authoring uses assessment route truth and publish/review guards", () => {
    expect(QUESTIONS).toMatch(/loadAssessmentActivityQuestions/);
    expect(QUESTIONS).toMatch(/LEARNING_ASSESSMENT_ROUTES/);
    expect(QUESTIONS).toMatch(/LEARNING_INSTRUCTOR_ROUTES\.course/);
    expect(QUESTIONS).toMatch(/createQuestionAction/);
    expect(QUESTIONS).toMatch(/publishQuestionAction/);
    expect(QUESTIONS).toMatch(/unpublishQuestionAction/);
    expect(QUESTIONS).toMatch(/archiveQuestionAction/);
    expect(QUESTIONS).toMatch(/setAnswerKeyAction/);
  });

  it("assignment authoring uses assignment author routes and instructor course back-link", () => {
    expect(ASSIGNMENT).toMatch(/LEARNING_ASSIGNMENT_ROUTES\.author/);
    expect(ASSIGNMENT).toMatch(/LEARNING_ASSIGNMENT_ROUTES\.queue\(courseId\)/);
    expect(ASSIGNMENT).toMatch(/LEARNING_INSTRUCTOR_ROUTES\.course\(courseId\)/);
    expect(ASSIGNMENT).toMatch(/upsertAssignmentSpecAction/);
    expect(ASSIGNMENT).toMatch(/setAssignmentResourcesAction/);
    expect(ASSIGNMENT).toMatch(/loadAssignmentForManage/);
  });

  it("authoring surfaces do not expose learner attempt/submission players", () => {
    for (const src of [QUESTIONS, ASSIGNMENT, COURSE_TREE, LESSON_BLOCKS]) {
      expect(src).not.toMatch(/AttemptPlayer/);
      expect(src).not.toMatch(/AssessmentSubmitForm/);
      expect(src).not.toMatch(/AssessmentAnswerSaveForm/);
      expect(src).not.toMatch(/LEARNING_LEARNER_ROUTES\.lesson/);
    }
    expect(ASSIGNMENT).not.toMatch(/LEARNING_ASSIGNMENT_ROUTES\.learner/);
  });

  it("review queue stays on instructor experience routes", () => {
    expect(REVIEW_QUEUE).toMatch(/loadInstructorReviewQueue/);
    expect(REVIEW_QUEUE).toMatch(/LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES\.hub/);
    expect(REVIEW_QUEUE).toMatch(/LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES\.reviewQueue/);
    expect(REVIEW_QUEUE).not.toMatch(/LEARNING_LEARNER_ROUTES/);
  });
});

describe("Instructor UI contract — shared route truth and helpers", () => {
  it("LEARNING_INSTRUCTOR_ROUTES templates stay canonical", () => {
    expect(LEARNING_INSTRUCTOR_ROUTES.hub).toBe("/learning/instructor");
    expect(LEARNING_INSTRUCTOR_ROUTES.program("p1")).toBe(
      "/learning/instructor/programs/p1"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.course("c1")).toBe(
      "/learning/instructor/courses/c1"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.lesson("c1", "l1")).toBe(
      "/learning/instructor/courses/c1/lessons/l1"
    );
    expect(AUTHORING_SRC).toMatch(
      /hub:\s*"\/learning\/instructor"/
    );
  });

  it("experience/bootstrap/assessment/assignment routes stay instructor-prefixed", () => {
    expect(LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.hub).toBe(
      "/learning/instructor"
    );
    expect(LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.reviewQueue).toBe(
      "/learning/instructor/review"
    );
    expect(LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.courseOverview("c1")).toBe(
      "/learning/instructor/courses/c1/overview"
    );
    expect(LEARNING_INSTRUCTOR_BOOTSTRAP_ROUTES.hub).toBe(
      "/learning/instructor/bootstrap"
    );
    expect(LEARNING_ASSESSMENT_ROUTES.activityQuestions("c1", "a1")).toBe(
      "/learning/instructor/courses/c1/activities/a1/questions"
    );
    expect(LEARNING_ASSIGNMENT_ROUTES.author("c1", "a1")).toBe(
      "/learning/instructor/courses/c1/activities/a1/assignment"
    );
    expect(LEARNING_ASSIGNMENT_ROUTES.learner("a1")).toBe(
      "/learning/activities/a1/assignment"
    );
    expect(EXPERIENCE_SRC).toMatch(/\/learning\/instructor/);
  });

  it("learner and instructor hubs remain separated", () => {
    expect(LEARNING_LEARNER_ROUTES.hub).toBe("/learning");
    expect(LEARNING_INSTRUCTOR_ROUTES.hub).toBe("/learning/instructor");
    expect(LEARNING_INSTRUCTOR_ROUTES.hub).not.toBe(LEARNING_LEARNER_ROUTES.hub);
  });

  it("publish/archive lifecycle helpers stay draft-aware", () => {
    expect(canPublishInstructorLifecycle("draft")).toBe(true);
    expect(canPublishInstructorLifecycle("published")).toBe(false);
    expect(canPublishInstructorLifecycle("archived")).toBe(false);
    expect(canArchiveInstructorLifecycle("draft")).toBe(true);
    expect(canArchiveInstructorLifecycle("published")).toBe(true);
    expect(canArchiveInstructorLifecycle("archived")).toBe(false);
    expect(canArchiveInstructorLifecycle("suspended")).toBe(false);
    expect(formatInstructorLifecycleStatus("draft")).toBe("Draft");
    expect(formatInstructorLifecycleStatus("published")).toBe("Published");
  });

  it("InstructorActionForm disables submit when lifecycle guard is set", () => {
    expect(ACTION_FORM).toMatch(/disabled\?: boolean/);
    expect(ACTION_FORM).toMatch(/if \(disabled\) return;/);
    expect(ACTION_FORM).toMatch(/disabled=\{pending \|\| disabled\}/);
  });

  it("instructor pages import route builders instead of hardcoding path templates", () => {
    for (const src of [DASHBOARD, COURSE_TREE, LESSON_BLOCKS, QUESTIONS, ASSIGNMENT]) {
      expect(src).not.toMatch(/href=\{`\/learning\/instructor\/courses\//);
      expect(src).not.toMatch(/href="\/learning\/instructor\/courses\//);
    }
  });
});
