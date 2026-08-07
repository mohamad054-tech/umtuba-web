# LEARNING_STRUCTURED_COURSE_IMPORT_FOUNDATION_V1

**Status:** Implemented on feature branch (pending central review / SoT FF / remote apply)  
**Migration:** `20260918_learning_structured_course_import_foundation_v1.sql` — **RESERVED**, not remote-applied  
**Canonical format:** Course Manifest V1 (`umtuba.learning.course_manifest.v1`)

## Purpose

Safe, deterministic, **draft-first** foundation so a real course can later flow:

SOURCE → NORMALIZE → VALIDATE → DRY RUN → IMPORT DRAFT → VERIFY → PUBLISH (separate GO)

This milestone does **not** ingest the user's real course.

## Hierarchy

Space / Program context → Course → Section → Lesson → { Content Blocks ∥ Activities }

Content blocks are **not** nested under activities.

## Manifest V1

Types: `lib/learning/courseImport/manifestTypes.ts`  
Example: `docs/learning/fixtures/course-import/synthetic-course-manifest-v1.json`

Supported content-block types (URL media only):  
`rich_text`, `heading`, `callout`, `image`, `video`, `audio`, `quote`, `divider`, `external_link`, `code_block`, `transcript`, `pdf`, `downloadable_file`

Forbidden: `ai_block`, `interactive_block`, `gallery`, `table`, `embed`, `html`, data/file/javascript URLs, binary embedding.

## Validation

`validateCourseManifest` — pure, deterministic. ERROR blocks import.

## Dry run

`planCourseImport` — **zero mutations / zero remote writes**. Returns `CourseImportPlan` with counts, entities, fingerprint, findings.

## Draft import

`executeDraftCourseImport` calls existing `create_*` RPCs only. Always private draft. Never publish / catalog / enroll.

## Idempotency

Persistent map: `learning_course_import_entity_map` keyed by `(program_id, entity_kind, external_id)`.  
Re-import of mapped external IDs → **conflict** (no silent overwrite). Future update mode is out of scope.

## Import ledger

`learning_course_import_runs` stores run id, manifest version, fingerprint, status, counts, timestamps, error summary. No secrets / no binary packages.

## Rollback

Pre-publish / pre-enrollment: archive draft course after operator review.  
Never auto-delete learner progress, notes, bookmarks, attempts, or submissions.

## Operator CLI

```bash
npx tsx scripts/learning/course-import.mjs --validate docs/learning/fixtures/course-import/synthetic-course-manifest-v1.json
npx tsx scripts/learning/course-import.mjs --dry-run docs/learning/fixtures/course-import/synthetic-course-manifest-v1.json
npx tsx scripts/learning/course-import.mjs --import-draft --confirm-import-draft <manifest.json>
```

No production publication command in V1.

## Converting course material → Manifest

1. Preserve originals offline.  
2. Host media at https URLs.  
3. Map curriculum to sections/lessons/blocks/activities.  
4. Assign stable `external_id` values.  
5. Keep `publication_intent: draft` and `visibility_intent: private` for pilot.  
6. Validate + dry-run before any IMPORT_DRAFT_GO.

## Real-course pilot procedure (not executed here)

1. Receive source files  
2. Preserve originals  
3. Normalize offline  
4. Generate Course Manifest V1  
5. Validate  
6. Human-readable validation report  
7. Dry-run  
8. Human review  
9. Explicit IMPORT_DRAFT_GO  
10. Import draft  
11. Verify instructor tree  
12. Learner preview with approved test access  
13. Separate PUBLISH_GO  
14. Verify `/learning/catalog`  
15. Rollback if necessary  

## Publication separation

Import ≠ publish. Catalog appearance requires published + `visibility=public` and enrollment strategy — **separate GO**.

## Commit hygiene

Corrective tip commits must remain free of Co-authored-by / Signed-off-by trailers.

