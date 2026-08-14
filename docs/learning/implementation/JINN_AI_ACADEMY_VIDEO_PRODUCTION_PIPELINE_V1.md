# Jinn AI Academy — Video Production Pipeline V1

## Goal

Turn each lesson’s `SCRIPT.md` + `VISUAL_PLAN.md` into a published Learning
`video` content block without reimporting courses or rewriting canonical text.

## Stages

1. **Inventory** — `scripts/learning/build-jinn-video-production-manifest.ts`  
   Reads extracted course packs → `jinn-video-production-manifest.v1.json`  
   Status for each entry starts as `planned`. `playback_url` is null until real media exists.

2. **Package** — For each manifest entry, hand the renderer:  
   - `script_relpath` / `visual_plan_relpath`  
   - `source_lesson_code`  
   - estimated duration / complexity  
   Output expected from external renderer: HTTPS MP4 (or approved provider URL), optional poster, captions.

3. **Validate** — Safe HTTPS URL only (`isSafeHttpUrl`). No `javascript:` / relative fake paths.

4. **Ingest** — `scripts/learning/ingest-lesson-video.ts` → `ingestLessonVideoBlock`  
   - Idempotent upsert of one `video` block per lesson  
   - Publish when ready  
   - Archive duplicate video blocks  
   - Best-effort reorder video to front  
   - Does **not** mutate rich_text / transcript bodies

5. **Learner render** — `LessonViewer` video slot:  
   - playable HTTPS video → `ContinueWatchingVideo`  
   - else honest **Video lesson coming soon** placeholder (no broken player)

## Contract

See `lib/learning/lessonVideoAssetContract.ts`.

Learner block payload remains SQL-validated keys only: `url`, `provider`, `caption`.

## Pilot JA-01 / M01-L01

Provider availability on this server: **none** (`ffmpeg` / Remotion / TTS vendors not installed).

Pilot stops at: **`VIDEO_RENDER_PROVIDER_REQUIRED`**.

Do not invent placeholder MP4s.

## Operator commands

```bash
npx tsx scripts/learning/build-jinn-video-production-manifest.ts

# After a real HTTPS asset exists and a manager session/key is available:
npx tsx scripts/learning/ingest-lesson-video.ts \
  --lesson-id 603def66-6610-406d-8d3b-7eb6dd614e72 \
  --url https://cdn.example.com/real.mp4 \
  --provider upload \
  --caption "JA-01 M01-L01"
```
