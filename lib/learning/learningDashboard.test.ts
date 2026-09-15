import { describe, expect, it } from "vitest";
import {
  LEARNING_HOME_RECOMMENDED_LIMIT,
  isLearningDemoSource,
  parseDiscoverCategory,
  polishLearningDisplayName,
  selectDueLearningAction,
  selectRecommendedCourses,
  selectSnapshot,
  selectUpcomingLiveCourses,
} from "./learningDashboard";
import { emptyOneToOneHubData } from "./oneToOne";
import { loadLearningHomeSurface } from "./productization";

describe("learning dashboard selectors", () => {
  it("strips visible -Demo suffixes from greeting names", () => {
    expect(polishLearningDisplayName("Lina Grove-Demo")).toBe("Lina Grove");
    expect(polishLearningDisplayName("لينا غروف-ديمو")).toBe("لينا غروف");
    expect(polishLearningDisplayName("Mira North")).toBe("Mira North");
  });

  it("keeps Home as a dashboard preview, not the full catalog", async () => {
    const home = await loadLearningHomeSurface("discover");
    expect(isLearningDemoSource(home.source)).toBe(true);
    const recommended = selectRecommendedCourses(home);
    expect(recommended.length).toBeGreaterThan(0);
    expect(recommended.length).toBeLessThanOrEqual(LEARNING_HOME_RECOMMENDED_LIMIT);
    expect(recommended.length).toBeLessThan(home.courses.length);
    expect(selectUpcomingLiveCourses(home).length).toBeLessThanOrEqual(2);
  });

  it("does not invent live-mode due assessments", async () => {
    const home = await loadLearningHomeSurface("discover");
    const liveHome = { ...home, source: "live" as const, continueItem: null, enrollments: [] };
    expect(selectDueLearningAction(liveHome)).toBeNull();
    const demoDue = selectDueLearningAction(home);
    expect(demoDue?.demoLabeled).toBe(true);
    expect(demoDue?.href).toMatch(/^\/learning\//);
  });

  it("builds snapshot links from real enrollment counts only", async () => {
    const home = await loadLearningHomeSurface("discover");
    const snapshot = selectSnapshot(home, emptyOneToOneHubData([]));
    expect(snapshot.courseCount).toBe(home.enrollments.length);
    expect(snapshot.certificateCount).toBe(
      home.enrollments.filter((row) => row.enrollment.status === "completed")
        .length
    );
    expect(snapshot.coursesHref).toBe("/learning?hub=myLearning");
    expect(snapshot.certificatesHref).toBe("/learning/transcript");
  });

  it("parses Discover category filters", () => {
    expect(parseDiscoverCategory("ai")).toBe("ai");
    expect(parseDiscoverCategory(["photography"])).toBe("photography");
    expect(parseDiscoverCategory("unknown")).toBe("all");
    expect(parseDiscoverCategory(undefined)).toBe("all");
  });
});
