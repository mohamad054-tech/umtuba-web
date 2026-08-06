# Current Task

## Task title

UMTUBA Translation Trunk Port V1 — migration reallocation

## Status

`implementation-complete` — six platform translation commits ported onto
`origin/alpha-0.2` @ `62c6c5d`. Learning Translation Foundation excluded.
Persistence migration reallocated from Learning-reserved `20260901` to
`20260910`. Intelligence retains `20260902` after provenance audit
(not remotely applied).

## Branch

`office/platform-translation-trunk-port-v1`

## Worktree

`C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1`

## Base

`62c6c5d04f962b9615c1fb8037bae6b76d7f8e36` — `origin/alpha-0.2`

## Ported commits (platform only)

1. `6528202` → i18n Foundation V1
2. `0d18160` → App Shell Translation V1
3. `aced43c` → Translation Studio Foundation V1
4. `189ec08` → Persistence & Workflow V1 (migration → `20260910`)
5. `e12cd6d` → App Shell Ingestion V1
6. `7296ac3` → Translation Intelligence Foundation V1 (migration → `20260902`)

## Excluded

- `6a3cb3d` Learning Translation Foundation — not cherry-picked

## Migrations

| Role | Forbidden / old | Current |
| --- | --- | --- |
| Persistence & Workflow | `20260874_*` and Learning-reserved `20260901` | `20260910_translation_studio_persistence_workflow_v1.sql` |
| Intelligence | `20260875_*` | `20260902_translation_intelligence_foundation_v1.sql` |

- **`20260901` is reserved for Learning** — Translation must not use it
- Runtime remains JSON file store under `/data/translation-studio/` (gitignored)
- **Do not** remote-apply these migrations without explicit approval

## Allowed scope

- `lib/i18n/**`, `lib/translationStudio/**`
- `app/components/i18n/**`, App Shell label wiring
- `app/admin/translation-studio/**`, `app/actions/translationStudio.ts`
- Additive Translation Studio AI suggestion port into `lib/ai/**` (no Private AI behavior replacement)
- Architecture docs under `docs/architecture/*TRANSLATION*` / i18n foundation

## Forbidden

- Learning Translation Foundation
- Commerce / Collaboration product work
- Remote Supabase migration apply
- Auto-publish / catalog file writes
- Model training / STT / TTS / dubbing
- Reusing Learning-reserved migration number `20260901`
