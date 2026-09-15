import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../../../lib/nav/routes";
import {
  LEARNING_HUB_DEEP_LINKS,
  getVisibleLearningHubSections,
  isLearningHubPaymentEnabled,
} from "../../../../lib/learning/learningHub";
import { isOneToOnePaymentEnabled } from "../../../../lib/learning/oneToOne";
import { LEARNING_PUBLIC_ROUTES } from "../../../../lib/learning/publicCatalog";
import { LEARNING_LEARNER_ROUTES } from "../../../../lib/learning/learnerDelivery";
import { LEARNING_TEACHER_ROUTES } from "../../../../lib/learning/teacherPlatform";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("Learning Hub route and payment regression", () => {
  it("keeps existing Learning deep links and primary nav at /learning", () => {
    expect(APP_ROUTES.learning).toBe("/learning");
    expect(LEARNING_LEARNER_ROUTES.hub).toBe("/learning");
    expect(LEARNING_PUBLIC_ROUTES.catalog).toBe("/learning/catalog");
    expect(LEARNING_HUB_DEEP_LINKS.course("abc")).toBe("/learning/courses/abc");
    expect(LEARNING_HUB_DEEP_LINKS.lesson("abc")).toBe("/learning/lessons/abc");
    expect(LEARNING_HUB_DEEP_LINKS.assessment("abc")).toBe(
      "/learning/activities/abc/assessment"
    );
    expect(LEARNING_HUB_DEEP_LINKS.attempt("abc")).toBe("/learning/attempts/abc");
    expect(LEARNING_HUB_DEEP_LINKS.instructor).toBe("/learning/instructor");
    expect(LEARNING_HUB_DEEP_LINKS.teacherCenter).toBe(
      LEARNING_TEACHER_ROUTES.center
    );
    expect(LEARNING_HUB_DEEP_LINKS.marketplace).toBe(
      "/sandbox/learning/partners"
    );
  });

  it("hides teacher tools from learners and never enables payment", () => {
    expect(
      getVisibleLearningHubSections({ isTeacher: false }).map((s) => s.id)
    ).not.toContain("teacher");
    expect(
      getVisibleLearningHubSections({ isTeacher: true }).map((s) => s.id)
    ).toContain("teacher");
    expect(isLearningHubPaymentEnabled()).toBe(false);
    expect(isOneToOnePaymentEnabled()).toBe(false);
  });

  it("composes the Nexus home instead of flattening it", () => {
    const page = read("app/learning/page.tsx");
    expect(page).toMatch(/loadLearningHomeSurface/);
    expect(page).toMatch(/LearningDashboardView/);
    expect(page).toMatch(/LearningHomeView/);
    expect(page).toMatch(/LearningHubShell/);
    expect(page).toMatch(/OneToOnePanel/);
    expect(page).toMatch(/PartnerCourseCard/);
    expect(page).not.toMatch(/REAL_COURSE_PAYMENT\s*=\s*true/);
  });
});
