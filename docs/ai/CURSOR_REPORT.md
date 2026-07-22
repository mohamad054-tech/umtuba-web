# Cursor Report

## Summary

Implemented **UM Learning OS — Lesson Content Blocks Foundation V1** on
`office/learning-lesson-content-blocks-foundation-v1` (branched from
`alpha-0.2` @ `ad0a1e18a9ff727a269024f08cf9974605d84c1c`):

- New migration `20260836` adds a single table `learning_lesson_content_blocks`
  (display content body under exactly one Lesson) plus helpers, validators, RLS
  policies, and RPC-only write functions.
- Immutable typed `block_type` allowlist of **12** (10 creatable + 2 reserved);
  reserved (`ai_block`, `interactive_block`) are rejected at create; fully
  deferred types (`gallery`, `pdf`, `downloadable_file`, `table`, `embed`,
  `html`) are not in the allowlist and fail closed.
- Block-level draft/published lifecycle; explicit **idempotent** publish/unpublish;
  archive + platform moderation; two-phase per-lesson reorder (no
  `UNIQUE(lesson_id, position)`; reserved `learning_lesson_items`).
- Bounded per-type payload validation (object-only ≤ 16384 bytes; per-type key
  allowlist; safe-text rejects raw HTML/JS/iframe; media = opaque http(s)
  reference strings only — no upload/storage buckets/signed URLs).
- **Learner reads** gate on `has_learning_course_access(course_id)` + published
  lesson + published block (NOT plain space membership); managers/course staff
  read drafts in scope; platform admins read all; **no anon SELECT**.
- TypeScript contracts, contract tests (53), and an implementation doc.
- No prior migration modified; no remote Supabase apply.

## Exact files changed

- `supabase/migrations/20260836_learning_lesson_content_blocks_foundation_v1.sql` (added)
- `lib/learning/lessonContentBlocksFoundation.ts` (added)
- `lib/learning/lessonContentBlocksFoundation.test.ts` (added)
- `docs/learning/implementation/LESSON_CONTENT_BLOCKS_FOUNDATION_V1.md` (added)
- `docs/ai/CURRENT_TASK.md` (updated)
- `docs/ai/CURSOR_REPORT.md` (updated)

## Migrations created

- `20260836_learning_lesson_content_blocks_foundation_v1.sql` (Git-only; **not**
  applied to remote Supabase). Migrations `20260828`–`20260835` untouched.

### Table + RPCs

- Table: `public.learning_lesson_content_blocks` (id, lesson_id [FK RESTRICT,
  immutable], block_type [immutable, 12-allowlist], status, position [≥ 0],
  content jsonb [object], created_by [immutable], updated_by, timestamps).
- Helpers: `can_manage_learning_lesson_content_block`,
  `can_create_learning_lesson_content_block`.
- Validators (internal): `..._validate_type`, `..._validate_content`,
  `..._assert_safe_text`, `..._assert_safe_url`, `..._require_mutable_status`,
  `..._require_parent_{program,course,section,lesson}_status`, plus immutability
  guard trigger.
- RPCs: `create_learning_lesson_content_block`,
  `update_learning_lesson_content_block`,
  `publish_learning_lesson_content_block`,
  `unpublish_learning_lesson_content_block`,
  `archive_learning_lesson_content_block`,
  `moderate_learning_lesson_content_block`,
  `reorder_learning_lesson_content_blocks`.

## Security review

- FORCE + ENABLE RLS on `learning_lesson_content_blocks`; client I/U/D revoked
  (RPC-only writes).
- **No anon SELECT policy and no anon table grant.** `is_platform_admin()` only
  ever evaluated on authenticated policies (no anon path).
- SECURITY DEFINER + `search_path = public` on all functions; RPC EXECUTE revoked
  from `public`/`anon`, granted to `authenticated`/`service_role`; internal
  validators revoked from all clients.
- Server-authoritative identity (`auth.uid()`); `created_by`/`updated_by` never
  client-supplied; `lesson_id`/`block_type`/`created_by`/`created_at` immutable
  (guard trigger + no RPC assignment).
- Course/space scope derived from the parent chain (only `lesson_id` stored); no
  client `course_id`/`space_id`.
- Learner content-body reads require `has_learning_course_access` (incl. active
  parent-program enrollment inheritance) + published lesson + published block;
  space-member draft access is **not** widened; no illegal status transitions
  (suspended/archived → platform moderation only).
- Fail-closed validation: block_type allowlist (reserved rejected, deferred
  absent), per-type content bounds, safe-text (no raw HTML/JS/iframe/event
  handlers), safe-url (http(s) only, ≤ 2048 chars, no js/vbscript/data schemes).
- Append-only audit via `learning_audit_write` (content payload not audited).

## Tests

- `lib/learning/lessonContentBlocksFoundation.test.ts`: **53 passed**.
- All learning tests (`npx vitest run lib/learning`): **9 files, 315 passed**.
- Full suite (`npx vitest run`): **1564 passed, 3 failed** — the 3 failures are
  **pre-existing and unrelated** (`lib/store/paymentOutcomeSync.test.ts`,
  `lib/store/storeRemoteE2eSandboxScripts.test.ts`); no learning/content-block
  files touch the store domain, and `git diff` vs base shows no tracked-file
  changes outside this slice.

## TypeScript

- `npx tsc --noEmit`: **pass** (exit 0).

## Build

- `npm run build` (Next.js 16.2.10): **pass** (exit 0; 59 static pages generated).

## git diff --check

- `git diff --cached --check`: **clean** (no whitespace errors).

## git status --short

```
M  docs/ai/CURRENT_TASK.md
M  docs/ai/CURSOR_REPORT.md
A  docs/learning/implementation/LESSON_CONTENT_BLOCKS_FOUNDATION_V1.md
A  lib/learning/lessonContentBlocksFoundation.test.ts
A  lib/learning/lessonContentBlocksFoundation.ts
A  supabase/migrations/20260836_learning_lesson_content_blocks_foundation_v1.sql
```

## Open issues

- Remote apply of `20260828`–`20260836` remains pending explicit approval.
- Pre-existing `lib/store` test failures (payment outcome sync + store remote E2E
  sandbox scripts) are outside this slice's scope and were not modified.
- Deferred by design: `learning_lesson_items` unified lesson spine, reserved
  `ai_block`/`interactive_block` behavior, block-level progress, media
  upload/storage, and UI.
