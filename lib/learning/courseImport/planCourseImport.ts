import { fingerprintCourseManifest } from "./fingerprint";
import {
  type CourseImportEntityPlan,
  type CourseImportPlan,
  type LearningCourseManifestV1,
} from "./manifestTypes";
import { validateCourseManifest } from "./validateCourseManifest";

/**
 * Dry-run planner. ZERO mutations / ZERO remote writes.
 */
export function planCourseImport(manifest: unknown): CourseImportPlan {
  const validation = validateCourseManifest(manifest);
  const emptyPlan = (m: Partial<LearningCourseManifestV1>): CourseImportPlan => ({
    ok: false,
    manifest_version: String(m.manifest_version ?? ""),
    manifest_fingerprint: validation.manifest_fingerprint,
    program_id: String(m.program_id ?? ""),
    publication_state: "draft",
    visibility_intent: "private",
    counts: {
      sections: 0,
      lessons: 0,
      content_blocks: 0,
      content_blocks_by_type: {},
      activities: 0,
      questions: 0,
      resources: 0,
    },
    entities: [],
    findings: validation.findings,
    proposed_course_slug: "",
  });

  if (!manifest || typeof manifest !== "object") {
    return emptyPlan({});
  }
  const m = manifest as LearningCourseManifestV1;
  if (!validation.ok || !m.course) {
    return {
      ...emptyPlan(m),
      proposed_course_slug: m.course?.slug?.trim().toLowerCase() ?? "",
      visibility_intent: m.course?.visibility_intent ?? "private",
    };
  }

  const entities: CourseImportEntityPlan[] = [];
  const byType: Record<string, number> = {};
  let lessons = 0;
  let blocks = 0;
  let activities = 0;
  let questions = 0;

  entities.push({
    kind: "course",
    external_id: m.course.external_id,
    action: "create",
    proposed_slug: m.course.slug.trim().toLowerCase(),
    detail: "status=draft; visibility remains private on import",
  });

  for (const section of m.course.sections) {
    entities.push({
      kind: "section",
      external_id: section.external_id,
      action: "create",
      parent_external_id: m.course.external_id,
      proposed_slug: section.slug?.trim().toLowerCase(),
    });
    for (const lesson of section.lessons) {
      lessons += 1;
      entities.push({
        kind: "lesson",
        external_id: lesson.external_id,
        action: "create",
        parent_external_id: section.external_id,
        proposed_slug: lesson.slug.trim().toLowerCase(),
      });
      for (const block of lesson.content_blocks ?? []) {
        blocks += 1;
        byType[block.type] = (byType[block.type] ?? 0) + 1;
        entities.push({
          kind: "content_block",
          external_id: block.external_id,
          action: "create",
          parent_external_id: lesson.external_id,
          detail: block.type,
        });
      }
      for (const activity of lesson.activities ?? []) {
        activities += 1;
        entities.push({
          kind: "activity",
          external_id: activity.external_id,
          action: "create",
          parent_external_id: lesson.external_id,
          detail: activity.type,
        });
        for (const q of activity.questions ?? []) {
          questions += 1;
          entities.push({
            kind: "question",
            external_id: q.external_id,
            action: "create",
            parent_external_id: activity.external_id,
          });
        }
      }
    }
  }

  for (const resource of m.course.resources ?? []) {
    entities.push({
      kind: "resource",
      external_id: resource.external_id,
      action: "create",
      parent_external_id: m.course.external_id,
      detail: resource.resource_kind,
    });
  }

  return {
    ok: true,
    manifest_version: String(m.manifest_version),
    manifest_fingerprint:
      validation.manifest_fingerprint || fingerprintCourseManifest(m),
    program_id: m.program_id.trim(),
    publication_state: "draft",
    visibility_intent: m.course.visibility_intent ?? "private",
    counts: {
      sections: m.course.sections.length,
      lessons,
      content_blocks: blocks,
      content_blocks_by_type: byType,
      activities,
      questions,
      resources: (m.course.resources ?? []).length,
    },
    entities,
    findings: validation.findings,
    proposed_course_slug: m.course.slug.trim().toLowerCase(),
  };
}
