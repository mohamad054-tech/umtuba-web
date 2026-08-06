# Current Task

## Task title

UMTUBA Translation Trunk Port V1 — paused for next session

## Status

`paused-ready-to-resume` — all work saved and pushed (`0/0`).
No remote migration apply yet.

## Resume here (tomorrow / next GO)

1. Worktree: `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1`
2. Branch: `office/platform-translation-trunk-port-v1`
3. Expected HEAD: `a4c19ea8571b9809786b03da735ff5cf8b2e9fd0`
4. Device: كمبيوتر 2 — Translation & Internationalization only
5. First commands:
   - `git fetch origin --prune`
   - confirm branch / HEAD / clean / sync `0 0`
6. Next milestone (not started): **controlled targeted remote apply** of Translation migrations only:
   - `20260910_translation_studio_persistence_workflow_v1.sql`
   - `20260902_translation_intelligence_foundation_v1.sql`
7. Hard rules next session:
   - never use `db push` / `--include-all`
   - never touch Learning / Commerce / Collaboration
   - `20260901` is **reserved for Learning** — do not reclaim
   - do not apply until explicit GO after final gate

## Branch

`office/platform-translation-trunk-port-v1`

## Worktree

`C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1`

## Base

`62c6c5d04f962b9615c1fb8037bae6b76d7f8e36` — `origin/alpha-0.2`

## Completed today

1. Translation SoT audit
2. Trunk-port worktree + migration allocation preflight
3. Six platform commits cherry-picked onto alpha-0.2 (Learning tip excluded)
4. Migrations renumbered away from colliding `20260874`/`20260875`
5. Finalize commit + push trunk-port branch
6. Remote history gap analysis (`20260872`–`75` = Learning/Commerce on remote)
7. Persistence reallocated off Learning-reserved `20260901` → `20260910`
8. Intelligence kept at `20260902` after free-number audit
9. Reallocation commit pushed; sync `0 0`

## Ported commits (platform only)

1. `6528202` → i18n Foundation V1
2. `0d18160` → App Shell Translation V1
3. `aced43c` → Translation Studio Foundation V1
4. `189ec08` → Persistence & Workflow V1 (migration → `20260910`)
5. `e12cd6d` → App Shell Ingestion V1
6. `7296ac3` → Translation Intelligence Foundation V1 (migration → `20260902`)

## Excluded

- `6a3cb3d` Learning Translation Foundation — not cherry-picked

## Migrations (current)

| Role | Forbidden | Current file |
| --- | --- | --- |
| Persistence & Workflow | `20260874_*`, Learning-reserved `20260901` | `20260910_translation_studio_persistence_workflow_v1.sql` |
| Intelligence | `20260875_*` | `20260902_translation_intelligence_foundation_v1.sql` |

- Runtime = JSON file store (`/data/translation-studio/`) — not Supabase-backed yet
- Publish = dry-run / `writesCatalogFiles: false` / `autoPublish: false`
- **Do not** remote-apply without explicit approval

## Open / next

- Final controlled targeted apply gate (read-only) then apply GO
- Known risk to re-check before apply: `is_platform_admin` remote signature may be `(uuid)` while SQL policies call `is_platform_admin()`
- Broader repo↔remote migration history misalignment remains (not Translation’s to repair wholesale)

## Forbidden

- Learning Translation Foundation / Learning domain work
- Commerce / Collaboration
- `db push` / `--include-all` / blind history repair
- Reusing `20260901`
