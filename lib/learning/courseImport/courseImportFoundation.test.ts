import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LEARNING_COURSE_MANIFEST_VERSION,
  describeDraftImportRollbackContract,
  executeDraftCourseImport,
  fingerprintCourseManifest,
  isSafeHttpUrl,
  planCourseImport,
  validateCourseManifest,
  type CourseImportRpcPort,
  type LearningCourseManifestV1,
} from "./index";

const ROOT = process.cwd();
const FIXTURE = join(
  ROOT,
  "docs/learning/fixtures/course-import/synthetic-course-manifest-v1.json"
);

function loadFixture(): LearningCourseManifestV1 {
  const raw = readFileSync(FIXTURE, "utf8").replace(/^\uFEFF/, ""); return JSON.parse(raw) as LearningCourseManifestV1;
}

describe("Learning Course Manifest Import Foundation V1", () => {
  it("validates the synthetic fixture", () => {
    const manifest = loadFixture();
    const result = validateCourseManifest(manifest);
    expect(result.ok).toBe(true);
    expect(manifest.manifest_version).toBe(LEARNING_COURSE_MANIFEST_VERSION);
    expect(result.manifest_fingerprint).toHaveLength(64);
  });

  it("rejects malformed version / duplicates / unsafe URLs / forbidden types", () => {
    const base = loadFixture();
    expect(
      validateCourseManifest({ ...base, manifest_version: "nope" }).ok
    ).toBe(false);

    const dup = structuredClone(base);
    dup.course.sections[0].lessons[0].content_blocks!.push({
      external_id: "synth.block.rich",
      type: "rich_text",
      content: { text: "dup", format: "plain" },
    });
    expect(validateCourseManifest(dup).findings.some((f) => f.code === "EXTERNAL_ID_DUPLICATE")).toBe(
      true
    );

    const badUrl = structuredClone(base);
    badUrl.course.sections[0].lessons[0].content_blocks![2].content.url =
      "javascript:alert(1)";
    expect(validateCourseManifest(badUrl).ok).toBe(false);

    const forbidden = structuredClone(base);
    forbidden.course.sections[0].lessons[0].content_blocks!.push({
      external_id: "synth.block.html",
      type: "html" as never,
      content: { html: "<b>x</b>" },
    });
    expect(validateCourseManifest(forbidden).ok).toBe(false);

    expect(isSafeHttpUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isSafeHttpUrl("data:text/plain,hi")).toBe(false);
  });

  it("rejects empty hierarchy and quiz without questions", () => {
    const empty = structuredClone(loadFixture());
    empty.course.sections = [];
    expect(validateCourseManifest(empty).ok).toBe(false);

    const noQ = structuredClone(loadFixture());
    noQ.course.sections[0].lessons[0].activities![0].questions = [];
    expect(
      validateCourseManifest(noQ).findings.some((f) => f.code === "QUIZ_QUESTIONS_MISSING")
    ).toBe(true);

    const badKey = structuredClone(loadFixture());
    badKey.course.sections[0].lessons[0].activities![0].questions![0].answer_key =
      { correct_choice_ids: ["missing"] };
    expect(validateCourseManifest(badKey).ok).toBe(false);
  });

  it("dry-run plans deterministically with zero mutations", () => {
    const manifest = loadFixture();
    const a = planCourseImport(manifest);
    const b = planCourseImport(manifest);
    expect(a.ok).toBe(true);
    expect(a.publication_state).toBe("draft");
    expect(a.counts.sections).toBe(1);
    expect(a.counts.lessons).toBe(1);
    expect(a.counts.content_blocks).toBeGreaterThan(0);
    expect(a.counts.activities).toBe(1);
    expect(a.counts.questions).toBe(1);
    expect(a.manifest_fingerprint).toBe(b.manifest_fingerprint);
    expect(a.manifest_fingerprint).toBe(fingerprintCourseManifest(manifest));
  });

  it("import requires confirmation and stays draft-only via create RPCs", async () => {
    const manifest = loadFixture();
    const calls: string[] = [];
    const mapped = new Map<string, string>();
    const rpc: CourseImportRpcPort = {
      async rpc(fn, args) {
        calls.push(fn);
        if (fn === "lookup_learning_course_import_entity") {
          const key = `${args?.p_entity_kind}:${args?.p_external_id}`;
          return { data: mapped.get(key) ?? null, error: null };
        }
        if (fn === "start_learning_course_import_run") {
          return { data: "run-1", error: null };
        }
        if (fn === "finish_learning_course_import_run") {
          return { data: null, error: null };
        }
        if (fn === "record_learning_course_import_entity_map") {
          const key = `${args?.p_entity_kind}:${args?.p_external_id}`;
          mapped.set(key, String(args?.p_entity_id));
          return { data: "map-1", error: null };
        }
        if (fn === "create_learning_course") {
          return { data: { id: "course-1" }, error: null };
        }
        if (fn === "create_learning_section") {
          return { data: { id: "section-1" }, error: null };
        }
        if (fn === "create_learning_lesson") {
          return { data: { id: "lesson-1" }, error: null };
        }
        if (fn === "create_learning_lesson_content_block") {
          return { data: { id: `block-${calls.length}` }, error: null };
        }
        if (fn === "create_learning_activity") {
          return { data: { id: "activity-1" }, error: null };
        }
        if (fn === "create_learning_course_resource") {
          return { data: { id: "resource-1" }, error: null };
        }
        return { data: null, error: { message: `unexpected ${fn}` } };
      },
    };

    const blocked = await executeDraftCourseImport({
      rpc,
      manifest,
      confirmImportDraft: false,
    });
    expect(blocked.status).toBe("blocked");
    expect(blocked.mutation_count).toBe(0);

    const ok = await executeDraftCourseImport({
      rpc,
      manifest,
      confirmImportDraft: true,
    });
    expect(ok.ok).toBe(true);
    expect(ok.status).toBe("succeeded");
    expect(ok.course_id).toBe("course-1");
    expect(ok.mutation_count).toBeGreaterThan(0);
    expect(calls).toContain("create_learning_course");
    expect(calls.some((c) => c.startsWith("publish_"))).toBe(false);
    expect(ok.findings.some((f) => f.code === "DRAFT_ONLY")).toBe(true);

    // second import hits conflict
    const conflict = await executeDraftCourseImport({
      rpc,
      manifest,
      confirmImportDraft: true,
    });
    expect(conflict.status).toBe("conflict");
    expect(conflict.mutation_count).toBe(0);
  });

  it("documents rollback contract and migration presence", () => {
    const rb = describeDraftImportRollbackContract();
    expect(rb.preferred_action).toMatch(/archive_learning_course/);
    expect(rb.forbidden.join(" ")).toMatch(/progress/);
    const sql = readFileSync(
      join(
        ROOT,
        "supabase/migrations/20260918_learning_structured_course_import_foundation_v1.sql"
      ),
      "utf8"
    );
    expect(sql).toMatch(/learning_course_import_runs/);
    expect(sql).toMatch(/learning_course_import_entity_map/);
    expect(sql).not.toMatch(/publish_learning_course/);
  });
});
