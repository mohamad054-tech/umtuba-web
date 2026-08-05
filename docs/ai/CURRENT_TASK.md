# Current Task

## Task title

UM Learning — Instructor Program & Course Publish Controls V1

## Status

`verification-pass` — **COMMITTED + PUSHED** on `office/learning-ai-tutor-learner-ui-integration-v1`. Branch synced `0 0` with origin after push.

## Milestone id

`learning.instructor.program_course_publish_controls_v1`

## Branch

`office/learning-ai-tutor-learner-ui-integration-v1`

## Base

`c3168eff3a324979efa5cab694e294c4daeeb4da` (`feat(learning): integrate learner ai tutor ui v1`)

## Worktree

`C:\Users\Admin\Desktop\umtuba\umtuba-web-learning-ai-tutor-learner-ui-integration-v1`

## Delivered

- Authoring ops: `publish_program`, `archive_program`, `publish_course`, `archive_course`
- Existing RPCs only: `publish_learning_program` / `archive_learning_program` / `publish_learning_course` / `archive_learning_course`
- Program page lifecycle UI + Course authoring lifecycle UI
- Status labels Draft / Published / Archived; invalid transitions disabled
- Fail-closed validation; sanitized RPC errors; `router.refresh` after success
- No migration

## Verification (local)

- `npx vitest run lib/learning/instructorAuthoring.test.ts` — **35 passed**
- `npx tsc --noEmit` — PASS
- `git diff --check` — PASS
- Build: not required (policy)

## Machine policy

Laptop only. Do not touch Commerce / Collaboration / Guardian / AI Tutor. No remote migration apply.

## Next

None for this milestone. Separate ops GO remains for Learning migration apply (unchanged).
