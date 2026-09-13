import type { LearningPartnerCourse } from "./types";
import { searchLearningCourses } from "./search";

export type LearningComparisonRow = {
  topic: string;
  courses: LearningPartnerCourse[];
  providers: string[];
};

export function compareLearningTopic(
  courses: readonly LearningPartnerCourse[],
  topic: string
): LearningComparisonRow {
  const matched = searchLearningCourses(courses, { query: topic });
  const providers = [...new Set(matched.map((course) => course.provider))];
  return {
    topic,
    courses: matched,
    providers,
  };
}

export function defaultLearningComparisons(
  courses: readonly LearningPartnerCourse[]
): LearningComparisonRow[] {
  return ["python", "data", "design"].map((topic) =>
    compareLearningTopic(courses, topic)
  );
}
