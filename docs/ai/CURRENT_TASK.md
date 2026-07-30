# Current Task

## Task title

Translation Studio Catalog Ingestion & App Shell Review V1

## Status

`implementation-in-progress` — App Shell ingestion + review surfaces; stage for manual commit (no trailers). Not pushed. Migration 20260874 **not** applied.

## Resume here (next session / next GO)

1. Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-translation-studio-app-shell-ingestion-v1`
2. Branch: `office/platform-translation-studio-app-shell-ingestion-v1` (from Persistence tip `189ec08`)
3. Manual commit (no Co-authored-by / Signed-off-by / trailers)
4. Push when approved; confirm `0 0`
5. Do **not** apply `20260874_translation_studio_persistence_workflow_v1.sql`
6. Do **not** write product catalog files / production publish without GO

## Branch

`office/platform-translation-studio-app-shell-ingestion-v1`

## Exact refs

| Ref | Hash / path |
|-----|-------------|
| Base | `189ec08` — feat(platform): add translation studio persistence and workflow v1 |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-translation-studio-app-shell-ingestion-v1` |

## Allowed scope

- `lib/translationStudio/ingestion/**`
- Admin UI for App Shell filter / findings / publish batch preview
- Focused tests + architecture / handoff docs

## Forbidden scope

- Remote apply migration 20260874
- Commit / push without GO
- Learning / Commerce / Creator / Live / World / Games domain catalogs
- Automatic catalog file writes / production publish
- Other worktrees

## Done (target)

- Idempotent App Shell catalog ingestion (stable key ids)
- EN approved source; valid AR approved; FR/ES/DE/PT not falsely approved
- Stale-source → needs_review
- Arabic TM seed without fingerprint duplicates
- Terminology findings (warnings only)
- Publish batch dry-run contract
- Admin App Shell / keys / publish UI
