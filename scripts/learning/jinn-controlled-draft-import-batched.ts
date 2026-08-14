/**
 * Fast controlled draft import: one linked db-query transaction per course.
 * Calls only approved create_* / import-run / entity-map / answer-key RPCs.
 * No API keys. No program create. No publish.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  validateCourseManifest,
  planCourseImport,
  mapQuestionPayload,
  type LearningCourseManifestV1,
} from "../../lib/learning/courseImport/index.ts";

const PROGRAM_ID = "27778f84-e7f0-4b0f-9578-5b68438e4a27";
const OWNER_ID = "87368553-5380-4ba1-ac64-d43d3d693482";
const WT =
  process.env.JINN_LEARNING_WT ||
  "D:\\umtuba-central\\repos\\umtuba-web-learning-sot-ff-merge-v1";
const MANIFEST_DIR =
  process.env.JINN_MANIFEST_DIR ||
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\pilot-course-with-questions-20260808\\manifests";
const OUT_DIR =
  process.env.JINN_IMPORT_OUT ||
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\pilot-controlled-draft-import-20260808";

function dq(tag: string, s: string): string {
  // dollar-quote with unique tag
  let t = tag;
  let i = 0;
  while (s.includes(`$${t}$`)) {
    t = `${tag}${i++}`;
  }
  return `$${t}$${s}$${t}$`;
}

function extractIdSql(expr: string): string {
  // Prefer entity-specific keys before parent course_id (section payloads include course_id).
  return `coalesce(
    (${expr})->>'id',
    (${expr})->>'question_id',
    (${expr})->>'activity_id',
    (${expr})->>'block_id',
    (${expr})->>'content_block_id',
    (${expr})->>'lesson_id',
    (${expr})->>'section_id',
    (${expr})->>'course_id'
  )::uuid`;
}

function buildCourseSql(
  manifest: LearningCourseManifestV1,
  fingerprint: string
): string {
  const course = manifest.course;
  const lines: string[] = [];
  lines.push(`select set_config('request.jwt.claim.sub', '${OWNER_ID}', true);`);
  lines.push(`select set_config('request.jwt.claim.role', 'authenticated', true);`);
  lines.push(`do $import$`);
  lines.push(`declare`);
  lines.push(`  v_run uuid;`);
  lines.push(`  v_course uuid;`);
  lines.push(`  v_section uuid;`);
  lines.push(`  v_lesson uuid;`);
  lines.push(`  v_block uuid;`);
  lines.push(`  v_activity uuid;`);
  lines.push(`  v_question uuid;`);
  lines.push(`  v_payload jsonb;`);
  lines.push(`  v_sections int := 0;`);
  lines.push(`  v_lessons int := 0;`);
  lines.push(`  v_blocks int := 0;`);
  lines.push(`  v_activities int := 0;`);
  lines.push(`  v_questions int := 0;`);
  lines.push(`begin`);
  lines.push(
    `  v_run := public.start_learning_course_import_run('${PROGRAM_ID}'::uuid, ${dq("mv", String(manifest.manifest_version))}, ${dq("fp", fingerprint)}, 'import_draft');`
  );

  const courseSlug = course.slug.trim().toLowerCase();
  const courseName = course.title.trim();
  lines.push(`  v_payload := public.create_learning_course(`);
  lines.push(`    p_program_id := '${PROGRAM_ID}'::uuid,`);
  lines.push(`    p_slug := ${dq("cslug", courseSlug)},`);
  lines.push(`    p_name := ${dq("cname", courseName)},`);
  lines.push(
    `    p_description := ${course.description == null ? "null" : dq("cdesc", String(course.description))},`
  );
  lines.push(`    p_visibility := 'private',`);
  lines.push(
    `    p_default_language := ${dq("clang", course.default_language ?? "en")}`
  );
  lines.push(`  );`);
  lines.push(`  v_course := ${extractIdSql("v_payload")};`);
  lines.push(`  if v_course is null then raise exception 'course id missing'; end if;`);
  lines.push(
    `  perform public.record_learning_course_import_entity_map('${PROGRAM_ID}'::uuid, 'course', ${dq("cext", course.external_id)}, v_course, v_run);`
  );

  course.sections.forEach((section, sIdx) => {
    const sSlug = (section.slug?.trim().toLowerCase() || `section-${sIdx + 1}`);
    lines.push(`  v_payload := public.create_learning_section(`);
    lines.push(`    p_course_id := v_course,`);
    lines.push(`    p_slug := ${dq("sslug" + sIdx, sSlug)},`);
    lines.push(`    p_name := ${dq("sname" + sIdx, section.title.trim())},`);
    lines.push(
      `    p_description := ${section.description == null ? "null" : dq("sdesc" + sIdx, String(section.description))},`
    );
    lines.push(`    p_visibility := 'private'`);
    lines.push(`  );`);
    lines.push(`  v_section := ${extractIdSql("v_payload")};`);
    lines.push(`  if v_section is null then raise exception 'section id missing %', ${sIdx}; end if;`);
    lines.push(`  v_sections := v_sections + 1;`);
    lines.push(
      `  perform public.record_learning_course_import_entity_map('${PROGRAM_ID}'::uuid, 'section', ${dq("sext" + sIdx, section.external_id)}, v_section, v_run);`
    );

    section.lessons.forEach((lesson, lIdx) => {
      const tag = `${sIdx}_${lIdx}`;
      lines.push(`  v_payload := public.create_learning_lesson(`);
      lines.push(`    p_section_id := v_section,`);
      lines.push(`    p_slug := ${dq("lslug" + tag, lesson.slug.trim().toLowerCase())},`);
      lines.push(`    p_name := ${dq("lname" + tag, lesson.title.trim())},`);
      lines.push(
        `    p_description := ${lesson.description == null ? "null" : dq("ldesc" + tag, String(lesson.description))},`
      );
      lines.push(`    p_visibility := 'private'`);
      lines.push(`  );`);
      lines.push(`  v_lesson := ${extractIdSql("v_payload")};`);
      lines.push(`  if v_lesson is null then raise exception 'lesson id missing %', ${dq("lt", tag)}; end if;`);
      lines.push(`  v_lessons := v_lessons + 1;`);
      lines.push(
        `  perform public.record_learning_course_import_entity_map('${PROGRAM_ID}'::uuid, 'lesson', ${dq("lext" + tag, lesson.external_id)}, v_lesson, v_run);`
      );

      (lesson.content_blocks ?? []).forEach((block, bIdx) => {
        const btag = `${tag}_${bIdx}`;
        const contentJson = JSON.stringify(block.content ?? {});
        lines.push(`  v_payload := public.create_learning_lesson_content_block(`);
        lines.push(`    p_lesson_id := v_lesson,`);
        lines.push(`    p_block_type := ${dq("btype" + btag, block.type)},`);
        lines.push(`    p_content := ${dq("bcontent" + btag, contentJson)}::jsonb`);
        lines.push(`  );`);
        lines.push(`  v_block := ${extractIdSql("v_payload")};`);
        lines.push(`  if v_block is not null then`);
        lines.push(`    v_blocks := v_blocks + 1;`);
        lines.push(
          `    perform public.record_learning_course_import_entity_map('${PROGRAM_ID}'::uuid, 'content_block', ${dq("bext" + btag, block.external_id)}, v_block, v_run);`
        );
        lines.push(`  end if;`);
      });

      (lesson.activities ?? []).forEach((activity, aIdx) => {
        const atag = `${tag}_a${aIdx}`;
        const aSlug =
          activity.slug?.trim().toLowerCase() || `activity-${aIdx + 1}`;
        lines.push(`  v_payload := public.create_learning_activity(`);
        lines.push(`    p_lesson_id := v_lesson,`);
        lines.push(`    p_type := ${dq("atype" + atag, activity.type)},`);
        lines.push(`    p_slug := ${dq("aslug" + atag, aSlug)},`);
        lines.push(`    p_name := ${dq("aname" + atag, activity.title.trim())},`);
        lines.push(
          `    p_description := ${activity.description == null ? "null" : dq("adesc" + atag, String(activity.description))},`
        );
        lines.push(`    p_visibility := 'private'`);
        lines.push(`  );`);
        lines.push(`  v_activity := ${extractIdSql("v_payload")};`);
        lines.push(`  if v_activity is null then raise exception 'activity id missing'; end if;`);
        lines.push(`  v_activities := v_activities + 1;`);
        lines.push(
          `  perform public.record_learning_course_import_entity_map('${PROGRAM_ID}'::uuid, 'activity', ${dq("aext" + atag, activity.external_id)}, v_activity, v_run);`
        );

        (activity.questions ?? []).forEach((question, qIdx) => {
          const mapped = mapQuestionPayload(question as never);
          if (!mapped.ok) {
            throw new Error(
              `Invalid question ${question.external_id}: ${mapped.message}`
            );
          }
          const qtag = `${atag}_q${qIdx}`;
          lines.push(`  v_payload := public.create_learning_question(`);
          lines.push(`    p_activity_id := v_activity,`);
          lines.push(`    p_question_type := ${dq("qtype" + qtag, mapped.dbType)},`);
          lines.push(
            `    p_content := ${dq("qcontent" + qtag, JSON.stringify(mapped.content))}::jsonb,`
          );
          lines.push(`    p_points := ${question.points ?? 1}`);
          lines.push(`  );`);
          lines.push(`  v_question := ${extractIdSql("v_payload")};`);
          lines.push(
            `  if v_question is null then raise exception 'question id missing'; end if;`
          );
          lines.push(`  v_questions := v_questions + 1;`);
          // no entity-map for question (allowlist)
          lines.push(`  perform public.set_learning_question_answer_key(`);
          lines.push(`    p_question_id := v_question,`);
          lines.push(
            `    p_answer_key := ${dq("qkey" + qtag, JSON.stringify(mapped.answerKey))}::jsonb`
          );
          lines.push(`  );`);
        });
      });
    });
  });

  lines.push(`  perform public.finish_learning_course_import_run(`);
  lines.push(`    p_run_id := v_run,`);
  lines.push(`    p_status := 'succeeded',`);
  lines.push(`    p_target_course_id := v_course,`);
  lines.push(
    `    p_entity_counts := jsonb_build_object('sections', v_sections, 'lessons', v_lessons, 'content_blocks', v_blocks, 'activities', v_activities, 'questions', v_questions),`
  );
  lines.push(`    p_error_summary := null`);
  lines.push(`  );`);
  lines.push(`end;`);
  lines.push(`$import$;`);
  lines.push(
    `select id::text as course_id, slug, status, visibility, published_at::text from public.learning_courses where program_id='${PROGRAM_ID}'::uuid and slug=${dq("outslug", courseSlug)};`
  );
  return lines.join("\n");
}

function runSqlFile(sqlPath: string): {
  ok: boolean;
  raw: string;
  rows: unknown[];
  error?: string;
} {
  const res = spawnSync(
    "npx",
    ["supabase", "db", "query", "--linked", "-f", sqlPath, "--output-format", "json"],
    { cwd: WT, encoding: "utf8", maxBuffer: 50 * 1024 * 1024, shell: true }
  );
  const raw = `${res.stdout || ""}\n${res.stderr || ""}`;
  const start = raw.indexOf("{");
  if (start < 0) {
    return { ok: false, raw, rows: [], error: `no json exit=${res.status}` };
  }
  // Extract first complete JSON object (ignore trailing npm warnings).
  let depth = 0;
  let end = -1;
  let inStr = false;
  let esc = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) {
    return { ok: false, raw, rows: [], error: "unterminated json" };
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (parsed?._tag === "Error" || parsed?.error) {
      return {
        ok: false,
        raw,
        rows: [],
        error: parsed?.error?.message || JSON.stringify(parsed).slice(0, 800),
      };
    }
    return { ok: true, raw, rows: parsed.rows || [] };
  } catch (e) {
    return {
      ok: false,
      raw,
      rows: [],
      error: `parse: ${(e as Error).message}`,
    };
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(join(OUT_DIR, "sql"), { recursive: true });
  const only = process.env.JINN_IMPORT_ONLY;
  const exclude = new Set(
    (process.env.JINN_IMPORT_EXCLUDE || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const files = readdirSync(MANIFEST_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .filter((f) => !only || f.startsWith(only))
    .filter((f) => ![...exclude].some((e) => f.startsWith(e)));

  console.log(
    JSON.stringify({
      phase: "start",
      mode: "batched_rpc_sql",
      files: files.length,
      program_id: PROGRAM_ID,
    })
  );

  const results: Array<Record<string, unknown>> = [];

  for (const file of files) {
    const manifest = JSON.parse(
      readFileSync(join(MANIFEST_DIR, file), "utf8").replace(/^\uFEFF/, "")
    ) as LearningCourseManifestV1;
    if (manifest.program_id !== PROGRAM_ID) {
      console.error(JSON.stringify({ phase: "blocked", file, reason: "program_id" }));
      process.exit(3);
    }
    const validation = validateCourseManifest(manifest);
    if (!validation.ok) {
      console.error(
        JSON.stringify({
          phase: "blocked",
          file,
          findings: validation.findings.slice(0, 8),
        })
      );
      process.exit(3);
    }
    const plan = planCourseImport(manifest);
    const sql = buildCourseSql(manifest, plan.manifest_fingerprint);
    const sqlPath = join(OUT_DIR, "sql", `${file}.sql`);
    writeFileSync(sqlPath, sql, "utf8");
    console.log(
      JSON.stringify({
        phase: "importing",
        file,
        fingerprint: plan.manifest_fingerprint,
        counts: plan.counts,
        sql_bytes: Buffer.byteLength(sql),
      })
    );
    const t0 = Date.now();
    const exec = runSqlFile(sqlPath);
    const summary = {
      file,
      ok: exec.ok,
      elapsed_ms: Date.now() - t0,
      rows: exec.rows,
      error: exec.error ?? null,
    };
    writeFileSync(
      join(OUT_DIR, `${file}.batched-result.json`),
      JSON.stringify({ summary, raw_tail: exec.raw.slice(-2000) }, null, 2),
      "utf8"
    );
    results.push(summary);
    console.log(JSON.stringify({ phase: "course_done", ...summary }));
    if (!exec.ok) {
      writeFileSync(
        join(OUT_DIR, "STOP_SUMMARY.json"),
        JSON.stringify(
          {
            verdict: "IMPORT_FAILED_NO_SAFE_CONTINUATION",
            stopped_at: file,
            results,
          },
          null,
          2
        ),
        "utf8"
      );
      process.exit(1);
    }
  }

  writeFileSync(
    join(OUT_DIR, "IMPORT_BATCH_SUMMARY.json"),
    JSON.stringify({ verdict: "BATCH_OK", courses: results.length, results }, null, 2),
    "utf8"
  );
  console.log(JSON.stringify({ phase: "batch_complete", courses: results.length }));
}

main().catch((e) => {
  console.error(JSON.stringify({ phase: "fatal", message: String(e?.message || e) }));
  process.exit(2);
});
