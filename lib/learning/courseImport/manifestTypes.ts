/**
 * UM Learning Course Manifest V1 — types & allowlists.
 * Hierarchy: Space/Program context → Course → Section → Lesson →
 *   { Content Blocks ∥ Activities } (blocks are NOT nested under activities).
 */

import { LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES } from "../lessonContentBlocksFoundation";
import { LEARNING_ACTIVITY_TYPES } from "../activitiesFoundation";
import { LEARNING_COURSE_RESOURCE_KINDS } from "../courseResourcesFoundation";

export const LEARNING_COURSE_MANIFEST_VERSION = "umtuba.learning.course_manifest.v1" as const;

export const LEARNING_COURSE_IMPORT_CONTENT_BLOCK_TYPES = [
  ...LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
] as const;

export type LearningCourseImportContentBlockType =
  (typeof LEARNING_COURSE_IMPORT_CONTENT_BLOCK_TYPES)[number];

export const LEARNING_COURSE_IMPORT_FORBIDDEN_BLOCK_TYPES = [
  "ai_block",
  "interactive_block",
  "gallery",
  "table",
  "embed",
  "html",
] as const;

export const LEARNING_COURSE_MANIFEST_LIMITS = {
  externalIdMax: 128,
  titleMax: 200,
  slugMax: 80,
  descriptionMax: 8000,
  textMax: 100_000,
  urlMax: 2048,
  maxSections: 200,
  maxLessonsPerSection: 200,
  maxBlocksPerLesson: 200,
  maxActivitiesPerLesson: 50,
  maxQuestionsPerActivity: 100,
  maxChoicesPerQuestion: 20,
  maxResources: 100,
  maxTags: 32,
} as const;

export type CourseManifestVisibilityIntent = "private" | "unlisted" | "public";

export type CourseManifestPublicationIntent = "draft" | "publish_later";

export type CourseManifestRichTextFormat = "plain" | "markdown";

export type CourseManifestContentBlock = {
  external_id: string;
  type: LearningCourseImportContentBlockType;
  position?: number;
  content: Record<string, unknown>;
};

export type CourseManifestQuestion = {
  external_id: string;
  prompt: string;
  question_type: "single_choice" | "multiple_choice" | "short_text" | "true_false";
  choices?: Array<{ id: string; label: string }>;
  /** Correct choice id(s) or short-text expected answers — staff-only intent. */
  answer_key?: {
    correct_choice_ids?: string[];
    expected_texts?: string[];
  };
  points?: number;
};

export type CourseManifestActivity = {
  external_id: string;
  type: (typeof LEARNING_ACTIVITY_TYPES)[number];
  title: string;
  slug?: string;
  description?: string | null;
  position?: number;
  questions?: CourseManifestQuestion[];
  /** Point cost unlock intent (optional; applied via existing unlock APIs later). */
  point_cost?: number | null;
};

export type CourseManifestLesson = {
  external_id: string;
  title: string;
  slug: string;
  description?: string | null;
  position?: number;
  content_blocks?: CourseManifestContentBlock[];
  activities?: CourseManifestActivity[];
  point_cost?: number | null;
};

export type CourseManifestSection = {
  external_id: string;
  title: string;
  slug?: string;
  description?: string | null;
  position?: number;
  lessons: CourseManifestLesson[];
};

export type CourseManifestResource = {
  external_id: string;
  title: string;
  resource_kind: (typeof LEARNING_COURSE_RESOURCE_KINDS)[number];
  url: string;
  description?: string | null;
};

export type CourseManifestCourse = {
  external_id: string;
  title: string;
  slug: string;
  description?: string | null;
  visibility_intent?: CourseManifestVisibilityIntent;
  /** Always draft on import; publish_later is documentation only. */
  publication_intent?: CourseManifestPublicationIntent;
  default_language?: string;
  category?: string | null;
  estimated_duration_minutes?: number | null;
  branding?: {
    cover_url?: string;
    thumbnail_url?: string;
  };
  settings?: {
    allow_self_enroll?: boolean;
    require_program_enrollment?: boolean;
    public_syllabus?: boolean;
  };
  sections: CourseManifestSection[];
  resources?: CourseManifestResource[];
};

export type LearningCourseManifestV1 = {
  manifest_version: typeof LEARNING_COURSE_MANIFEST_VERSION | string;
  /** Existing Learning program UUID to attach the course under. */
  program_id: string;
  /** Optional existing space id for documentation / future checks. */
  space_id?: string;
  course: CourseManifestCourse;
};

export type CourseImportFindingSeverity = "ERROR" | "WARNING" | "INFO";

export type CourseImportFinding = {
  severity: CourseImportFindingSeverity;
  code: string;
  path: string;
  message: string;
};

export type CourseImportEntityPlan = {
  kind:
    | "course"
    | "section"
    | "lesson"
    | "content_block"
    | "activity"
    | "question"
    | "resource";
  external_id: string;
  action: "create" | "reuse" | "conflict";
  proposed_slug?: string;
  parent_external_id?: string;
  detail?: string;
};

export type CourseImportPlan = {
  ok: boolean;
  manifest_version: string;
  manifest_fingerprint: string;
  program_id: string;
  publication_state: "draft";
  visibility_intent: CourseManifestVisibilityIntent;
  counts: {
    sections: number;
    lessons: number;
    content_blocks: number;
    content_blocks_by_type: Record<string, number>;
    activities: number;
    questions: number;
    resources: number;
  };
  entities: CourseImportEntityPlan[];
  findings: CourseImportFinding[];
  proposed_course_slug: string;
};
