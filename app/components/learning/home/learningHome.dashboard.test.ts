import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getVisibleLearningHubSections } from "../../../../lib/learning/learningHub";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("unified Learning home dashboard", () => {
  it("composes Home as a dashboard, not a full catalog", () => {
    const dashboard = read(
      "app/components/learning/home/LearningDashboardView.tsx"
    );
    const discover = read(
      "app/components/learning/visual/LearningHomeView.tsx"
    );
    const page = read("app/learning/page.tsx");
    expect(dashboard).toMatch(/ContinueLearningCard/);
    expect(dashboard).toMatch(/LearningSnapshot/);
    expect(dashboard).toMatch(/OneToOnePreview/);
    expect(dashboard).toMatch(/UpcomingLearning/);
    expect(dashboard).toMatch(/DueLearningAction/);
    expect(dashboard).toMatch(/RecommendedLearning/);
    expect(dashboard).toMatch(/LearningCategories/);
    expect(dashboard).toMatch(/PartnerLearningPreview/);
    expect(dashboard).toMatch(/data-learning-home="dashboard"/);
    expect(page).toMatch(/LearningDashboardView/);
    expect(page).toMatch(/hub=discover|LearningHomeView/);
    expect(discover).toMatch(/data-learning-discover="catalog"/);
    expect(discover).not.toMatch(/setTab\("library"\)/);
  });

  it("authorizes Teacher Center only for teachers", () => {
    expect(
      getVisibleLearningHubSections({ isTeacher: false }).map((s) => s.id)
    ).not.toContain("teacher");
    expect(
      getVisibleLearningHubSections({ isTeacher: true }).map((s) => s.id)
    ).toContain("teacher");
    const greeting = read(
      "app/components/learning/home/LearningGreeting.tsx"
    );
    expect(greeting).toMatch(/polishLearningDisplayName/);
    expect(greeting).toMatch(/learning\.hub\.becomeTeacher/);
  });

  it("does not invent live booking success on Home", () => {
    const preview = read(
      "app/components/learning/home/OneToOnePreview.tsx"
    );
    expect(preview).toMatch(/learning\.home\.oneToOneBlocked/);
    expect(preview).toMatch(/learning\.oneToOne\.paymentDisabled/);
    expect(preview).not.toMatch(/REAL_COURSE_PAYMENT\s*=\s*true/);
  });
});
