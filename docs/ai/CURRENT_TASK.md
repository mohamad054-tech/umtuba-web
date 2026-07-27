# Current Task

## Task title

Safe-to-shutdown handoff (Public Learning Catalog V1)

## Status

`complete` — **safe to shutdown: yes**

## Branch / sync

- Branch: `alpha-0.2`
- Tracking: `origin/alpha-0.2` (synced at handoff)

## Last feature commit

- Message: `feat(learning): add public catalog and course preview foundation v1`
- Hash: `d7c66690fdfefb4efea6a51393a5b992c16dfc9b`
- Follow-up docs: `fbf8c30` — `docs(ai): record public catalog V1 close-out commit hash`

## Runtime / data state

- Migration `20260866_learning_public_course_preview_foundation_v1.sql` — **applied remotely**
- L01 preview — **enabled**
- Public catalog course slug: `ai-applications-master-course` (`status=published`, `visibility=public`)

## Catalog routes

- `/learning/catalog`
- `/learning/catalog/[courseSlug]` (e.g. `/learning/catalog/ai-applications-master-course`)

## Desktop package paths (do not commit)

- Jinn zip: `C:\Users\1\Desktop\AI-Applications-Bootcamp\dist\Jinn-Education-AI-Applications-Course-V1.zip`
- UMTUBA zip: `C:\Users\1\Desktop\AI-Applications-Bootcamp\dist\UMTUBA-AI-Applications-Course-V1.zip`

## Local junk (do not commit)

Untracked under `scripts/learning/`: `.tmp-*.sql`, `*.log`, `IMPORT_*.json`, ad-hoc `.mjs` / `_patch-fast.js` — safe to delete locally.

## Allowed scope (closed)

No active implementation scope. Next session: sync `alpha-0.2` from origin before new work.

