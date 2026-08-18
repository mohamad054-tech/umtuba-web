/**
 * UMTUBA Originals — content owned directly by UMTUBA.
 * No fabricated external instructors or certifications.
 */

import type { LearningCourseDifficulty } from "../coursesFoundation";

export const ORIGINAL_COURSE_STATUSES = ["draft", "published", "suspended", "archived"] as const;
export type OriginalCourseStatus = (typeof ORIGINAL_COURSE_STATUSES)[number];

export const ORIGINAL_LESSON_KINDS = ["video", "text", "resource", "quiz"] as const;
export type OriginalLessonKind = (typeof ORIGINAL_LESSON_KINDS)[number];

export type OriginalAuthor = {
  userId: string;
  displayName: string;
  role: "instructor" | "author";
};

export type OriginalLesson = {
  id: string;
  kind: OriginalLessonKind;
  title: string;
  body: string | null;
  resourceRef: string | null;
  quizQuestionCount: number;
  position: number;
};

export type OriginalContentRights = {
  owner: "UMTUBA";
  aiUsageAllowed: boolean;
  certificateOwnedByUmtuba: boolean;
  hostingAllowed: true;
};

export type OriginalCourseVersion = {
  version: number;
  createdAt: string;
  note: string;
};

export type UmtubaOriginalCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: OriginalCourseStatus;
  language: string;
  category: string | null;
  difficulty: LearningCourseDifficulty | null;
  authors: OriginalAuthor[];
  lessons: OriginalLesson[];
  rights: OriginalContentRights;
  versions: OriginalCourseVersion[];
  publishedAt: string | null;
  providerId: string;
  sourceType: "UMTUBA_ORIGINAL";
  dataClass: "MOCK_DATA";
};
