# Current Task

## Task title

Translation Studio Persistence & Workflow V1

## Status

`implementation-complete` — Persistent workflow staged for manual commit (no trailers). Not pushed. Migration created locally only (not remote-applied).

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-translation-studio-persistence-workflow-v1`
2. Branch: `office/platform-translation-studio-persistence-workflow-v1` (from foundation tip `aced43c`)
3. Manual commit (no Co-authored-by / Signed-off-by / trailers)
4. Push when approved; confirm `0 0`
5. Do **not** remote-apply `20260874_translation_studio_persistence_workflow_v1.sql` without GO
6. Do **not** merge into alpha without explicit GO

## Branch

`office/platform-translation-studio-persistence-workflow-v1`

## Exact refs

| Ref | Hash / path |
|-----|-------------|
| Base | `aced43c844d93e0bae6cbb6a53cae25698c3cdad` (Translation Studio Foundation V1) |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-translation-studio-persistence-workflow-v1` |

## Allowed scope

- `lib/translationStudio/**` (persistence, workflow, history, publish contract, tests)
- `/admin/translation-studio/**` (editor, review, publish queues)
- `app/actions/translationStudio.ts`
- Additive local migration `20260874_translation_studio_persistence_workflow_v1.sql`
- Architecture + handoff docs

## Forbidden scope

- Commit / push / remote migration apply
- Public translation product
- Auto-publish into product i18n catalogs
- Learning / Commerce / Creator product translation surfaces
- Touching other worktrees / `office/profile-hero-completeness-v1`

## Done

- Durable JSON file store (`data/translation-studio/store.json`, gitignored)
- Workflow: draft / submit / approve / reject / deprecate / restore + audit + versions
- AI suggestions via stub/aiService port — never auto-approve
- Terminology conflict warnings (no silent replace)
- Memory reuse before AI; memory write on human approve
- Publish contract only (`autoPublish: false`)
- Admin UI: editor, review queue, publish queue
- Additive SQL schema (local file only)
- Focused tests + handoff docs

## Out of scope / next

Wire runtime to Supabase tables, live AI smoke, XLIFF writers, alpha merge.
