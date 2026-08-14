/**
 * Normalize overlong rich_text blocks into within-limit chunks.
 * Canonical source untouched. Working copy only.
 *
 * Authoritative DB limit (20260836):
 *   char_length(rich_text.text) <= 10000
 *   octet_length(content::text) <= 16384
 */
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import {
  validateCourseManifest,
  planCourseImport,
} from "../../lib/learning/courseImport/index.ts";

const CANONICAL =
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\pilot-course-with-questions-20260808";
const WORK =
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\pilot-richtext-normalized-resume-20260808";
const PROGRAM_ID = "27778f84-e7f0-4b0f-9578-5b68438e4a27";
const IMPORTED = new Set(["JA-01", "JA-02", "JA-03", "JA-05"]);
const CHAR_LIMIT = 10000; // SQL char_length
const CONTENT_BYTE_LIMIT = 16384; // SQL octet_length(content::text)
// Leave headroom for JSON escaping + format field under 16384 bytes.
const TARGET_CHARS = 9000;

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sha256Text(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Postgres char_length ≈ Unicode code-point count for typical lesson text. */
function charLen(s: string): number {
  return Array.from(s).length;
}

function contentByteLen(text: string, format?: string): number {
  const obj: Record<string, unknown> = { text };
  if (format) obj.format = format;
  // Approximate Postgres jsonb::text serialization size via JSON.stringify.
  return Buffer.byteLength(JSON.stringify(obj), "utf8");
}

function fits(text: string, format?: string): boolean {
  return (
    charLen(text) <= CHAR_LIMIT &&
    contentByteLen(text, format) <= CONTENT_BYTE_LIMIT
  );
}

function splitSafe(text: string, format?: string): string[] {
  if (fits(text, format)) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (charLen(remaining) > 0) {
    if (fits(remaining, format)) {
      parts.push(remaining);
      break;
    }
    // Take up to TARGET_CHARS code points, then backtrack to boundary.
    const cps = Array.from(remaining);
    let take = Math.min(TARGET_CHARS, cps.length);
    // Shrink until byte+char limits satisfied.
    while (take > 1) {
      const candidate = cps.slice(0, take).join("");
      if (fits(candidate, format)) break;
      take = Math.floor(take * 0.9);
    }
    let chunk = cps.slice(0, take).join("");
    // Prefer paragraph, then sentence, then whitespace.
    const searchFrom = Math.floor(chunk.length * 0.5);
    const para = chunk.lastIndexOf("\n\n");
    const sent = Math.max(
      chunk.lastIndexOf(". "),
      chunk.lastIndexOf(".\n"),
      chunk.lastIndexOf("? "),
      chunk.lastIndexOf("! ")
    );
    const space = chunk.lastIndexOf(" ");
    let cut = -1;
    if (para >= searchFrom) cut = para + 2;
    else if (sent >= searchFrom) cut = sent + 2;
    else if (space >= searchFrom) cut = space + 1;
    if (cut > 0 && cut < chunk.length) {
      chunk = chunk.slice(0, cut);
    }
    // Ensure non-empty progress
    if (chunk.length === 0) {
      chunk = cps.slice(0, Math.max(1, take)).join("");
    }
    parts.push(chunk);
    remaining = remaining.slice(chunk.length);
  }
  return parts;
}

type Offender = {
  course: string;
  lesson: string;
  block: string;
  index: number;
  original_length: number;
  chunks: number;
};

function main() {
  mkdirSync(join(WORK, "manifests"), { recursive: true });
  const srcMan = join(CANONICAL, "manifests");
  const files = readdirSync(srcMan)
    .filter((f) => f.endsWith(".json"))
    .sort();

  // Copy all 21 manifests first (including already imported) for package totals.
  for (const f of files) {
    copyFileSync(join(srcMan, f), join(WORK, "manifests", f));
  }
  if (existsSync(join(CANONICAL, "merge_report.json"))) {
    copyFileSync(
      join(CANONICAL, "merge_report.json"),
      join(WORK, "merge_report.source.json")
    );
  }

  const offenders: Offender[] = [];
  const provenance: Array<Record<string, unknown>> = [];
  let chunksCreated = 0;
  let blocksSplit = 0;

  for (const f of files) {
    const courseId = f.replace(/\.manifest\.v1\.json$/, "");
    const path = join(WORK, "manifests", f);
    const manifest = JSON.parse(
      readFileSync(path, "utf8").replace(/^\uFEFF/, "")
    );
    let changed = false;

    for (const section of manifest.course.sections || []) {
      for (const lesson of section.lessons || []) {
        const blocks = lesson.content_blocks || [];
        const nextBlocks: any[] = [];
        for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
          const block = blocks[bIdx];
          if (block.type !== "rich_text") {
            nextBlocks.push(block);
            continue;
          }
          const text = String(block.content?.text ?? "");
          const format = block.content?.format;
          const len = charLen(text);
          if (fits(text, format)) {
            nextBlocks.push(block);
            continue;
          }
          if (!IMPORTED.has(courseId)) {
            // Only count offenders in remaining courses for report focus,
            // but still normalize any overlong in working copy if present.
          }
          const pieces = splitSafe(text, format);
          if (pieces.some((p) => !fits(p, format))) {
            throw new Error(
              `Failed to split ${block.external_id} under limits`
            );
          }
          offenders.push({
            course: courseId,
            lesson: lesson.external_id,
            block: block.external_id,
            index: bIdx,
            original_length: len,
            chunks: pieces.length,
          });
          blocksSplit += 1;
          const mappedChunks: string[] = [];
          pieces.forEach((piece, i) => {
            const ext =
              i === 0
                ? block.external_id
                : `${block.external_id}:part${i + 1}`;
            mappedChunks.push(ext);
            nextBlocks.push({
              ...block,
              external_id: ext,
              content: {
                ...block.content,
                text: piece,
              },
            });
            chunksCreated += 1;
          });
          provenance.push({
            course: courseId,
            lesson: lesson.external_id,
            original_block: block.external_id,
            original_length: len,
            original_sha256: sha256Text(text),
            chunks: mappedChunks.map((ext, i) => ({
              external_id: ext,
              length: charLen(pieces[i]),
              sha256: sha256Text(pieces[i]),
              content_bytes: contentByteLen(pieces[i], format),
            })),
            reconstructed_sha256: sha256Text(pieces.join("")),
            content_preserved: sha256Text(pieces.join("")) === sha256Text(text),
          });
          changed = true;
        }
        lesson.content_blocks = nextBlocks;
      }
    }

    if (changed) {
      writeFileSync(path, JSON.stringify(manifest, null, 2), "utf8");
    }
  }

  // Validate all 21
  let lessons = 0;
  let questions = 0;
  let courses = 0;
  let overlongLeft = 0;
  const validationErrors: any[] = [];
  for (const f of files) {
    const manifest = JSON.parse(
      readFileSync(join(WORK, "manifests", f), "utf8").replace(/^\uFEFF/, "")
    );
    courses += 1;
    if (manifest.program_id !== PROGRAM_ID) {
      validationErrors.push({ f, code: "PROGRAM_MISMATCH" });
    }
    const v = validateCourseManifest(manifest);
    if (!v.ok) {
      validationErrors.push({
        f,
        findings: v.findings.filter((x) => x.severity === "ERROR").slice(0, 5),
      });
    }
    const plan = planCourseImport(manifest);
    lessons += plan.counts.lessons;
    questions += plan.counts.questions;
    for (const section of manifest.course.sections || []) {
      for (const lesson of section.lessons || []) {
        for (const block of lesson.content_blocks || []) {
          if (block.type === "rich_text") {
            const text = String(block.content?.text ?? "");
            const format = block.content?.format;
            if (!fits(text, format)) overlongLeft += 1;
          }
        }
      }
    }
  }

  const preserved = provenance.every((p) => p.content_preserved === true);
  const fileHashes: Record<string, string> = {};
  for (const f of files) {
    fileHashes[f] = sha256File(join(WORK, "manifests", f));
  }
  const packageHash = sha256Text(
    files.map((f) => `${f}:${fileHashes[f]}`).join("\n")
  );

  const remainingOffenders = offenders.filter((o) => !IMPORTED.has(o.course));
  const report = {
    report_id: "JINN_RICHTEXT_NORMALIZE_WORKING_COPY",
    generated_utc: new Date().toISOString(),
    authoritative_limit: {
      rich_text_char_length_max: CHAR_LIMIT,
      measurement: "PostgreSQL char_length (characters)",
      content_octet_length_max: CONTENT_BYTE_LIMIT,
      source:
        "supabase/migrations/20260836_learning_lesson_content_blocks_foundation_v1.sql :: learning_lesson_content_block_validate_content",
      mirrored_ts: "lib/learning/lessonContentBlocksFoundation.ts richTextMaxChars=10000",
      split_target_chars: TARGET_CHARS,
    },
    canonical_path: CANONICAL,
    working_copy_path: WORK,
    offenders_remaining_courses: remainingOffenders,
    offenders_all_in_package: offenders,
    offender_count_remaining: remainingOffenders.length,
    affected_courses: [...new Set(remainingOffenders.map((o) => o.course))],
    blocks_split: blocksSplit,
    chunks_created: chunksCreated,
    provenance,
    content_preservation_pass: preserved,
    validation: {
      courses,
      lessons,
      questions,
      overlong_left: overlongLeft,
      validation_errors: validationErrors,
      ok:
        courses === 21 &&
        lessons === 336 &&
        questions === 1001 &&
        overlongLeft === 0 &&
        validationErrors.length === 0 &&
        preserved,
    },
    package_manifests_sha256: packageHash,
    per_file_sha256: fileHashes,
  };

  writeFileSync(
    join(WORK, "normalization_report.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );
  writeFileSync(
    join(WORK, "provenance_map.json"),
    JSON.stringify(provenance, null, 2),
    "utf8"
  );
  console.log(
    JSON.stringify(
      {
        ok: report.validation.ok,
        offender_count_remaining: report.offender_count_remaining,
        affected_courses: report.affected_courses,
        blocks_split: blocksSplit,
        chunks_created: chunksCreated,
        preserved,
        courses,
        lessons,
        questions,
        overlong_left: overlongLeft,
        package_hash: packageHash,
      },
      null,
      2
    )
  );
  if (!report.validation.ok) process.exit(2);
}

main();
