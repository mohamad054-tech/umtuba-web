/**
 * Build Jinn AI Academy video production manifest for all lessons that have
 * SCRIPT.md + VISUAL_PLAN.md under the extracted course packs.
 *
 * Read-only vs source tree. Does NOT invent playback URLs or MP4 assets.
 *
 * Usage:
 *   npx tsx scripts/learning/build-jinn-video-production-manifest.ts
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import {
  classifyVideoProductionComplexity,
  estimateNarrationMinutesFromScriptChars,
  type LearningLessonVideoProductionManifest,
  type LearningLessonVideoProductionManifestEntry,
} from "../../lib/learning/lessonVideoAssetContract";

const EXTRACT_ROOT =
  process.env.JINN_EXTRACT_ROOT ??
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\pilot-normalize-validate-dry-run-20260808\\extracted-abc-readonly";

const OUT_DIR =
  process.env.JINN_VIDEO_MANIFEST_OUT ??
  "C:\\UMTUBA\\Artifacts\\Learning\\JinnAI\\video-production-readiness-20260808";

function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function listLessonDirs(root: string): string[] {
  const out: string[] = [];
  const waves = readdirSync(root).filter((n) => n.startsWith("wave-"));
  for (const wave of waves) {
    const wavePath = join(root, wave);
    if (!statSync(wavePath).isDirectory()) continue;
    for (const course of readdirSync(wavePath)) {
      const lessonsRoot = join(wavePath, course, "lessons");
      if (!existsSync(lessonsRoot)) continue;
      for (const mod of readdirSync(lessonsRoot)) {
        const modPath = join(lessonsRoot, mod);
        if (!statSync(modPath).isDirectory()) continue;
        for (const lesson of readdirSync(modPath)) {
          const lessonPath = join(modPath, lesson);
          if (!statSync(lessonPath).isDirectory()) continue;
          out.push(lessonPath);
        }
      }
    }
  }
  return out.sort();
}

function extractScenes(visualPlan: string): string[] {
  const scenes: string[] = [];
  for (const line of visualPlan.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([^|]+)\s*\|/);
    if (!m) continue;
    const cell = m[1]!.trim();
    if (!cell || cell.startsWith("---") || /visual|timestamp|shot/i.test(cell)) {
      continue;
    }
    if (/instructor|screen|camera|diagram|slide|graphic|cut/i.test(cell)) {
      scenes.push(cell.slice(0, 120));
    }
  }
  return [...new Set(scenes)].slice(0, 40);
}

function extractAssetHints(visualPlan: string): string[] {
  const hints: string[] = [];
  const re =
    /`([^`]+\.(?:svg|png|jpg|jpeg|webp|mp4))`|\b([A-Za-z0-9_./-]+\.(?:svg|png|jpg|jpeg|webp))\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(visualPlan))) {
    hints.push((m[1] || m[2] || "").slice(0, 160));
  }
  return [...new Set(hints)].slice(0, 40);
}

function courseCodeFromPath(lessonPath: string): {
  course_code: string;
  module_code: string;
  lesson_code: string;
} {
  // .../JA-01-ai-foundations/lessons/M01/L01
  const parts = lessonPath.replace(/\\/g, "/").split("/");
  const li = parts.lastIndexOf("lessons");
  const courseDir = parts[li - 1] ?? "UNKNOWN";
  const module_code = parts[li + 1] ?? "M??";
  const lesson_code = parts[li + 2] ?? "L??";
  const course_code = (courseDir.match(/^(JA-\d+)/i)?.[1] ?? courseDir).toUpperCase();
  return { course_code, module_code, lesson_code };
}

function titleFromLessonMd(text: string, fallback: string): string {
  const m = text.match(/^#\s+(.+)$/m);
  return (m?.[1] ?? fallback).trim().slice(0, 200);
}

function main() {
  if (!existsSync(EXTRACT_ROOT)) {
    console.error(`EXTRACT_ROOT missing: ${EXTRACT_ROOT}`);
    process.exit(2);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const entries: LearningLessonVideoProductionManifestEntry[] = [];
  for (const lessonPath of listLessonDirs(EXTRACT_ROOT)) {
    const scriptPath = join(lessonPath, "SCRIPT.md");
    const visualPath = join(lessonPath, "VISUAL_PLAN.md");
    const lessonMdPath = join(lessonPath, "LESSON.md");
    if (!existsSync(scriptPath) || !existsSync(visualPath)) continue;

    const script = readFileSync(scriptPath, "utf8");
    const visual = readFileSync(visualPath, "utf8");
    const lessonMd = existsSync(lessonMdPath)
      ? readFileSync(lessonMdPath, "utf8")
      : "";
    const codes = courseCodeFromPath(lessonPath);
    const source_lesson_code = `${codes.course_code}:${codes.module_code}-${codes.lesson_code}`;
    const narration = estimateNarrationMinutesFromScriptChars(script.length);
    const scenes = extractScenes(visual);
    const demos = extractAssetHints(visual);
    const hasScreen = /screen recording|screen\/visual|\[SCREEN\]/i.test(
      `${script}\n${visual}`
    );
    const complexity = classifyVideoProductionComplexity({
      estimated_narration_minutes: narration,
      scene_count: scenes.length,
      has_screen_recording_hints: hasScreen,
    });

    entries.push({
      course_code: codes.course_code,
      course_title: codes.course_code,
      module_code: codes.module_code,
      module_title: codes.module_code,
      lesson_code: codes.lesson_code,
      lesson_title: titleFromLessonMd(lessonMd, source_lesson_code),
      source_lesson_code,
      lesson_id: null,
      script_relpath: relative(EXTRACT_ROOT, scriptPath).replace(/\\/g, "/"),
      visual_plan_relpath: relative(EXTRACT_ROOT, visualPath).replace(
        /\\/g,
        "/"
      ),
      script_chars: script.length,
      visual_plan_chars: visual.length,
      estimated_narration_minutes: narration,
      estimated_video_duration_minutes: Math.max(narration, 1),
      expected_visual_scenes: scenes,
      diagrams_screenshots_demos: demos,
      production_complexity: complexity,
      asset: {
        lesson_id: null,
        source_lesson_code,
        course_code: codes.course_code,
        module_code: codes.module_code,
        lesson_code: codes.lesson_code,
        asset_provider_id: null,
        playback_url: null,
        provider: null,
        poster_url: null,
        duration_seconds: narration > 0 ? narration * 60 : null,
        captions_url: null,
        locale: "en",
        status: "planned",
        script_sha256: sha256Text(script),
        visual_plan_sha256: sha256Text(visual),
        provenance: "extracted-abc-readonly SCRIPT.md + VISUAL_PLAN.md",
      },
    });
  }

  const manifest: LearningLessonVideoProductionManifest = {
    manifest_version: "umtuba.learning.jinn_video_production.v1",
    generated_at: new Date().toISOString(),
    program_external_id: "jinn-ai-academy",
    entry_count: entries.length,
    entries,
  };

  const outFile = join(OUT_DIR, "jinn-video-production-manifest.v1.json");
  writeFileSync(outFile, JSON.stringify(manifest, null, 2), "utf8");

  const summary = {
    entry_count: entries.length,
    by_complexity: entries.reduce(
      (acc, e) => {
        acc[e.production_complexity] = (acc[e.production_complexity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    with_script_and_visual: entries.length,
    playable_urls: entries.filter((e) => e.asset.playback_url).length,
    outFile,
  };
  writeFileSync(
    join(OUT_DIR, "jinn-video-production-manifest.summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  console.log(JSON.stringify(summary, null, 2));
}

main();
