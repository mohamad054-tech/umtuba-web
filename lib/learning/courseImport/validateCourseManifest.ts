import {
  LEARNING_ACTIVITY_TYPES,
} from "../activitiesFoundation";
import {
  LEARNING_COURSE_RESOURCE_KINDS,
} from "../courseResourcesFoundation";
import {
  LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS,
  LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS,
  LEARNING_LESSON_CONTENT_BLOCK_RICH_TEXT_FORMATS,
} from "../lessonContentBlocksFoundation";
import { fingerprintCourseManifest } from "./fingerprint";
import {
  LEARNING_COURSE_IMPORT_CONTENT_BLOCK_TYPES,
  LEARNING_COURSE_IMPORT_FORBIDDEN_BLOCK_TYPES,
  LEARNING_COURSE_MANIFEST_LIMITS as L,
  LEARNING_COURSE_MANIFEST_VERSION,
  type CourseImportFinding,
  type CourseManifestActivity,
  type CourseManifestContentBlock,
  type CourseManifestCourse,
  type CourseManifestLesson,
  type CourseManifestQuestion,
  type CourseManifestResource,
  type CourseManifestSection,
  type LearningCourseManifestV1,
} from "./manifestTypes";
import { isSafeHttpUrl } from "./safeUrl";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CourseManifestValidationResult = {
  ok: boolean;
  findings: CourseImportFinding[];
  manifest_fingerprint: string;
};

function err(
  findings: CourseImportFinding[],
  code: string,
  path: string,
  message: string
) {
  findings.push({ severity: "ERROR", code, path, message });
}

function warn(
  findings: CourseImportFinding[],
  code: string,
  path: string,
  message: string
) {
  findings.push({ severity: "WARNING", code, path, message });
}

function info(
  findings: CourseImportFinding[],
  code: string,
  path: string,
  message: string
) {
  findings.push({ severity: "INFO", code, path, message });
}

function isNonEmptyString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
}

function trackId(
  set: Set<string>,
  findings: CourseImportFinding[],
  path: string,
  id: unknown
): string | null {
  if (!isNonEmptyString(id, L.externalIdMax)) {
    err(findings, "EXTERNAL_ID_INVALID", path, "external_id is required");
    return null;
  }
  const trimmed = id.trim();
  if (set.has(trimmed)) {
    err(
      findings,
      "EXTERNAL_ID_DUPLICATE",
      path,
      `Duplicate external_id "${trimmed}"`
    );
    return null;
  }
  set.add(trimmed);
  return trimmed;
}

function validateSlug(
  findings: CourseImportFinding[],
  path: string,
  slug: unknown,
  slugSet: Set<string>
) {
  if (!isNonEmptyString(slug, L.slugMax)) {
    err(findings, "SLUG_INVALID", path, "slug is required");
    return;
  }
  const s = slug.trim().toLowerCase();
  if (!SLUG_RE.test(s)) {
    err(
      findings,
      "SLUG_FORMAT",
      path,
      "slug must be lowercase kebab-case [a-z0-9-]"
    );
  }
  if (slugSet.has(s)) {
    err(findings, "SLUG_DUPLICATE", path, `Duplicate slug "${s}"`);
  }
  slugSet.add(s);
}

function validateBlockContent(
  findings: CourseImportFinding[],
  path: string,
  block: CourseManifestContentBlock
) {
  const c = block.content ?? {};
  switch (block.type) {
    case "rich_text": {
      if (!isNonEmptyString(c.text, L.textMax)) {
        err(findings, "BLOCK_TEXT_REQUIRED", `${path}.content.text`, "text required");
      }
      if (
        c.format != null &&
        !(LEARNING_LESSON_CONTENT_BLOCK_RICH_TEXT_FORMATS as readonly string[]).includes(
          String(c.format)
        )
      ) {
        err(findings, "BLOCK_FORMAT_INVALID", `${path}.content.format`, "invalid format");
      }
      break;
    }
    case "heading": {
      if (!isNonEmptyString(c.text, L.titleMax)) {
        err(findings, "BLOCK_TEXT_REQUIRED", `${path}.content.text`, "text required");
      }
      if (
        !(LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS as readonly number[]).includes(
          Number(c.level)
        )
      ) {
        err(findings, "HEADING_LEVEL_INVALID", `${path}.content.level`, "level 1-6 required");
      }
      break;
    }
    case "callout": {
      if (!isNonEmptyString(c.text, L.textMax)) {
        err(findings, "BLOCK_TEXT_REQUIRED", `${path}.content.text`, "text required");
      }
      if (
        c.variant != null &&
        !(LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS as readonly string[]).includes(
          String(c.variant)
        )
      ) {
        err(findings, "CALLOUT_VARIANT_INVALID", `${path}.content.variant`, "invalid variant");
      }
      break;
    }
    case "quote": {
      if (!isNonEmptyString(c.text, L.textMax)) {
        err(findings, "BLOCK_TEXT_REQUIRED", `${path}.content.text`, "text required");
      }
      break;
    }
    case "divider":
      break;
    case "image":
    case "video":
    case "audio":
    case "external_link":
    case "pdf":
    case "downloadable_file": {
      if (!isSafeHttpUrl(c.url, L.urlMax)) {
        err(findings, "UNSAFE_URL", `${path}.content.url`, "http(s) URL required");
      }
      break;
    }
    case "code_block": {
      if (!isNonEmptyString(c.code, L.textMax)) {
        err(findings, "CODE_REQUIRED", `${path}.content.code`, "code required");
      }
      break;
    }
    case "transcript": {
      if (!isNonEmptyString(c.text, L.textMax)) {
        err(findings, "BLOCK_TEXT_REQUIRED", `${path}.content.text`, "text required");
      }
      break;
    }
    default:
      err(findings, "BLOCK_TYPE_UNSUPPORTED", path, `Unsupported type`);
  }
}

function validateQuestion(
  findings: CourseImportFinding[],
  path: string,
  q: CourseManifestQuestion,
  ids: Set<string>
) {
  trackId(ids, findings, `${path}.external_id`, q.external_id);
  if (!isNonEmptyString(q.prompt, L.textMax)) {
    err(findings, "QUESTION_PROMPT_REQUIRED", `${path}.prompt`, "prompt required");
  }
  const allowed = ["single_choice", "multiple_choice", "short_text", "true_false"];
  if (!allowed.includes(q.question_type)) {
    err(findings, "QUESTION_TYPE_INVALID", `${path}.question_type`, "invalid question_type");
  }
  if (q.question_type === "single_choice" || q.question_type === "multiple_choice") {
    if (!Array.isArray(q.choices) || q.choices.length < 2) {
      err(findings, "QUESTION_CHOICES_REQUIRED", `${path}.choices`, "at least 2 choices");
    } else if (q.choices.length > L.maxChoicesPerQuestion) {
      err(findings, "QUESTION_CHOICES_LIMIT", `${path}.choices`, "too many choices");
    } else {
      const choiceIds = new Set<string>();
      for (const [i, ch] of q.choices.entries()) {
        if (!isNonEmptyString(ch.id, 64) || !isNonEmptyString(ch.label, L.titleMax)) {
          err(findings, "CHOICE_INVALID", `${path}.choices[${i}]`, "id/label required");
        } else if (choiceIds.has(ch.id)) {
          err(findings, "CHOICE_ID_DUPLICATE", `${path}.choices[${i}]`, "duplicate choice id");
        } else {
          choiceIds.add(ch.id);
        }
      }
      const keys = q.answer_key?.correct_choice_ids ?? [];
      if (!Array.isArray(keys) || keys.length === 0) {
        err(findings, "ANSWER_KEY_MISSING", `${path}.answer_key`, "correct_choice_ids required");
      } else {
        for (const k of keys) {
          if (!choiceIds.has(k)) {
            err(findings, "ANSWER_KEY_INVALID", `${path}.answer_key`, `unknown choice id ${k}`);
          }
        }
      }
    }
  }
  if (q.question_type === "short_text") {
    const texts = q.answer_key?.expected_texts ?? [];
    if (!Array.isArray(texts) || texts.length === 0) {
      warn(
        findings,
        "ANSWER_KEY_EMPTY",
        `${path}.answer_key`,
        "short_text has no expected_texts"
      );
    }
  }
  if (q.points != null && (!Number.isInteger(q.points) || q.points < 0)) {
    err(findings, "POINTS_INVALID", `${path}.points`, "points must be non-negative integer");
  }
}

function validateActivity(
  findings: CourseImportFinding[],
  path: string,
  activity: CourseManifestActivity,
  ids: Set<string>
) {
  trackId(ids, findings, `${path}.external_id`, activity.external_id);
  if (!isNonEmptyString(activity.title, L.titleMax)) {
    err(findings, "ACTIVITY_TITLE_REQUIRED", `${path}.title`, "title required");
  }
  if (!(LEARNING_ACTIVITY_TYPES as readonly string[]).includes(activity.type)) {
    err(findings, "ACTIVITY_TYPE_INVALID", `${path}.type`, "unsupported activity type");
  }
  if (activity.point_cost != null) {
    if (!Number.isInteger(activity.point_cost) || activity.point_cost < 0) {
      err(findings, "POINT_COST_INVALID", `${path}.point_cost`, "invalid point_cost");
    }
  }
  const questions = activity.questions ?? [];
  if (activity.type === "quiz" && questions.length === 0) {
    err(findings, "QUIZ_QUESTIONS_MISSING", `${path}.questions`, "quiz requires questions");
  }
  if (questions.length > L.maxQuestionsPerActivity) {
    err(findings, "QUESTIONS_LIMIT", `${path}.questions`, "too many questions");
  }
  for (const [i, q] of questions.entries()) {
    validateQuestion(findings, `${path}.questions[${i}]`, q, ids);
  }
}

function validateLesson(
  findings: CourseImportFinding[],
  path: string,
  lesson: CourseManifestLesson,
  ids: Set<string>,
  lessonSlugs: Set<string>
) {
  trackId(ids, findings, `${path}.external_id`, lesson.external_id);
  if (!isNonEmptyString(lesson.title, L.titleMax)) {
    err(findings, "LESSON_TITLE_REQUIRED", `${path}.title`, "title required");
  }
  validateSlug(findings, `${path}.slug`, lesson.slug, lessonSlugs);
  const blocks = lesson.content_blocks ?? [];
  const activities = lesson.activities ?? [];
  if (blocks.length === 0 && activities.length === 0) {
    err(
      findings,
      "LESSON_EMPTY",
      path,
      "lesson must include content_blocks and/or activities"
    );
  }
  if (blocks.length > L.maxBlocksPerLesson) {
    err(findings, "BLOCKS_LIMIT", `${path}.content_blocks`, "too many blocks");
  }
  if (activities.length > L.maxActivitiesPerLesson) {
    err(findings, "ACTIVITIES_LIMIT", `${path}.activities`, "too many activities");
  }
  if (lesson.point_cost != null) {
    if (!Number.isInteger(lesson.point_cost) || lesson.point_cost < 0) {
      err(findings, "POINT_COST_INVALID", `${path}.point_cost`, "invalid point_cost");
    }
  }
  for (const [i, block] of blocks.entries()) {
    const bPath = `${path}.content_blocks[${i}]`;
    trackId(ids, findings, `${bPath}.external_id`, block.external_id);
    if (
      (LEARNING_COURSE_IMPORT_FORBIDDEN_BLOCK_TYPES as readonly string[]).includes(
        block.type as string
      )
    ) {
      err(findings, "BLOCK_TYPE_FORBIDDEN", bPath, `Forbidden type ${block.type}`);
      continue;
    }
    if (
      !(LEARNING_COURSE_IMPORT_CONTENT_BLOCK_TYPES as readonly string[]).includes(
        block.type
      )
    ) {
      err(findings, "BLOCK_TYPE_UNSUPPORTED", bPath, `Unsupported type ${block.type}`);
      continue;
    }
    validateBlockContent(findings, bPath, block);
  }
  for (const [i, activity] of activities.entries()) {
    validateActivity(findings, `${path}.activities[${i}]`, activity, ids);
  }
}

function validateSection(
  findings: CourseImportFinding[],
  path: string,
  section: CourseManifestSection,
  ids: Set<string>,
  lessonSlugs: Set<string>
) {
  trackId(ids, findings, `${path}.external_id`, section.external_id);
  if (!isNonEmptyString(section.title, L.titleMax)) {
    err(findings, "SECTION_TITLE_REQUIRED", `${path}.title`, "title required");
  }
  if (!Array.isArray(section.lessons) || section.lessons.length === 0) {
    err(findings, "SECTION_EMPTY", path, "section must include at least one lesson");
    return;
  }
  if (section.lessons.length > L.maxLessonsPerSection) {
    err(findings, "LESSONS_LIMIT", `${path}.lessons`, "too many lessons");
  }
  for (const [i, lesson] of section.lessons.entries()) {
    validateLesson(findings, `${path}.lessons[${i}]`, lesson, ids, lessonSlugs);
  }
}

function validateResource(
  findings: CourseImportFinding[],
  path: string,
  resource: CourseManifestResource,
  ids: Set<string>
) {
  trackId(ids, findings, `${path}.external_id`, resource.external_id);
  if (!isNonEmptyString(resource.title, L.titleMax)) {
    err(findings, "RESOURCE_TITLE_REQUIRED", `${path}.title`, "title required");
  }
  if (!(LEARNING_COURSE_RESOURCE_KINDS as readonly string[]).includes(resource.resource_kind)) {
    err(findings, "RESOURCE_KIND_INVALID", `${path}.resource_kind`, "invalid kind");
  }
  if (!isSafeHttpUrl(resource.url, L.urlMax)) {
    err(findings, "UNSAFE_URL", `${path}.url`, "http(s) URL required");
  }
}

function validateCourse(
  findings: CourseImportFinding[],
  course: CourseManifestCourse,
  ids: Set<string>
) {
  trackId(ids, findings, "course.external_id", course.external_id);
  if (!isNonEmptyString(course.title, L.titleMax)) {
    err(findings, "COURSE_TITLE_REQUIRED", "course.title", "title required");
  }
  const courseSlugs = new Set<string>();
  validateSlug(findings, "course.slug", course.slug, courseSlugs);
  if (course.description != null && String(course.description).length > L.descriptionMax) {
    err(findings, "DESCRIPTION_TOO_LONG", "course.description", "description too long");
  }
  if (course.publication_intent === "publish_later") {
    info(
      findings,
      "PUBLICATION_SEPARATED",
      "course.publication_intent",
      "Import remains draft; publish requires separate GO"
    );
  }
  if (course.visibility_intent === "public") {
    warn(
      findings,
      "VISIBILITY_PUBLIC_INTENT",
      "course.visibility_intent",
      "Import still creates private draft; public catalog requires separate publish/visibility GO"
    );
  }
  if (course.branding?.cover_url && !isSafeHttpUrl(course.branding.cover_url, L.urlMax)) {
    err(findings, "UNSAFE_URL", "course.branding.cover_url", "unsafe cover_url");
  }
  if (
    course.branding?.thumbnail_url &&
    !isSafeHttpUrl(course.branding.thumbnail_url, L.urlMax)
  ) {
    err(findings, "UNSAFE_URL", "course.branding.thumbnail_url", "unsafe thumbnail_url");
  }
  if (!Array.isArray(course.sections) || course.sections.length === 0) {
    err(findings, "COURSE_EMPTY", "course.sections", "course must include sections");
    return;
  }
  if (course.sections.length > L.maxSections) {
    err(findings, "SECTIONS_LIMIT", "course.sections", "too many sections");
  }
  const lessonSlugs = new Set<string>();
  for (const [i, section] of course.sections.entries()) {
    validateSection(findings, `course.sections[${i}]`, section, ids, lessonSlugs);
  }
  const resources = course.resources ?? [];
  if (resources.length > L.maxResources) {
    err(findings, "RESOURCES_LIMIT", "course.resources", "too many resources");
  }
  for (const [i, resource] of resources.entries()) {
    validateResource(findings, `course.resources[${i}]`, resource, ids);
  }
}

/**
 * Pure deterministic validation. Errors prevent import. Zero mutations.
 */
export function validateCourseManifest(
  manifest: unknown
): CourseManifestValidationResult {
  const findings: CourseImportFinding[] = [];
  if (!manifest || typeof manifest !== "object") {
    err(findings, "MANIFEST_INVALID", "$", "Manifest must be an object");
    return { ok: false, findings, manifest_fingerprint: "" };
  }
  const m = manifest as LearningCourseManifestV1;
  if (m.manifest_version !== LEARNING_COURSE_MANIFEST_VERSION) {
    err(
      findings,
      "MANIFEST_VERSION",
      "manifest_version",
      `Expected ${LEARNING_COURSE_MANIFEST_VERSION}`
    );
  }
  if (!isNonEmptyString(m.program_id, 64) || !UUID_RE.test(m.program_id.trim())) {
    err(findings, "PROGRAM_ID_INVALID", "program_id", "program_id must be a UUID");
  }
  if (m.space_id != null && (!isNonEmptyString(m.space_id, 64) || !UUID_RE.test(m.space_id))) {
    err(findings, "SPACE_ID_INVALID", "space_id", "space_id must be a UUID when set");
  }
  if (!m.course || typeof m.course !== "object") {
    err(findings, "COURSE_REQUIRED", "course", "course object required");
  } else {
    const ids = new Set<string>();
    validateCourse(findings, m.course, ids);
  }

  const fingerprint =
    findings.some((f) => f.code === "MANIFEST_INVALID")
      ? ""
      : fingerprintCourseManifest(m);

  const ok = !findings.some((f) => f.severity === "ERROR");
  return { ok, findings, manifest_fingerprint: fingerprint };
}
