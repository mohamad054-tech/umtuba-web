# Current Task

## Task title

UMTUBA Translation Trunk Port V1 — remote migration apply + history CLOSED

## Milestone status

`TRANSLATION_STUDIO_PERSISTENCE_PORT_AND_FLAG_V1` — Phase 1 persistence port + mode gate (JSON-only)

Previously closed: `TRANSLATION_REMOTE_MIGRATION_APPLY_AND_HISTORY_V1_CLOSED`

## Status

Closed on 2026-08-07. Schema applied and history registered on linked Supabase.
Runtime remains JSON file store — no JSON→DB switch.

## Device / worktree

- Device: كمبيوتر 2 — Translation & Internationalization only
- Worktree: `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1`
- Branch: `office/platform-translation-trunk-port-v1`
- Pre-closure HEAD: `e861ef997631454f9584807dd03b723e61fed629`
- Linked Supabase: `umtuba` / `tgucwnjwoyeqoxqaxmew` (eu-west-1)

## Translation migrations (final)

| Role | File | Remote schema | Remote history |
| --- | --- | --- | --- |
| Intelligence | `20260902_translation_intelligence_foundation_v1.sql` | APPLIED | REGISTERED (`translation_intelligence_foundation_v1`) |
| Persistence & Workflow | `20260910_translation_studio_persistence_workflow_v1.sql` | APPLIED | REGISTERED (`translation_studio_persistence_workflow_v1`) |

- `20260901` remains **Learning-owned** (`learning_lesson_notes_foundation_v1`) — not reclaimed
- Forbidden/collision numbers retired: `20260874_*`, `20260875_*`, Learning-reserved `20260901`

## Remote closure facts (verified)

- Project: `umtuba` / `tgucwnjwoyeqoxqaxmew`
- Apply order used: `20260902` → `20260910` (targeted `db query --file` only; no `db push` / `--include-all`)
- History registration: `supabase migration repair <version> --status applied --linked` for `20260902` then `20260910`
- Translation tables present: **12** (3 `translation_intelligence_*` + 9 `translation_studio_*`)
- RLS + FORCE RLS on all 12
- Policies: 3 intelligence + 9 studio admin SELECT (`is_platform_admin()`)
- Grants: authenticated SELECT only (12); anon grants = 0
- Runtime remains JSON store (`data/translation-studio/`); publish stays dry-run / `writesCatalogFiles: false` / `autoPublish: false`
- No JSON→DB runtime switch performed
- No Translation migration collision remains against Learning `20260901`

## Concurrent remote note (OUT OF SCOPE)

- Remote history also contains `20260905` = `store_partial_refund_ledger_list_committing_v1` (Store/Commerce)
- Observed during history registration window; **not** Translation-owned; do not repair or alter

## Prior gate notes (retained)

- SHA256 `20260910`: `D7044A5FD97CE159A0C57BF515D2D0125E4D7EFE6F6D571CEEB9A638102A8D01`
- SHA256 `20260902`: `F0ECE0EFBA023886E8D226682F9427DF33DF44A19EB6E5A565D4977BA435674C`
- `is_platform_admin()` zero-arg OK via `DEFAULT auth.uid()` — false blocker cleared before apply

## Ported commits (platform only)

1. `6528202` → i18n Foundation V1
2. `0d18160` → App Shell Translation V1
3. `aced43c` → Translation Studio Foundation V1
4. `189ec08` → Persistence & Workflow V1 (migration → `20260910`)
5. `e12cd6d` → App Shell Ingestion V1
6. `7296ac3` → Translation Intelligence Foundation V1 (migration → `20260902`)

## Excluded

- `6a3cb3d` Learning Translation Foundation — not cherry-picked

## Hard rules (still in force)

- Never `db push` / `--include-all` / blind `migration up` / wholesale history repair
- Do not reclaim `20260901`
- Do not port Learning Translation Foundation `6a3cb3d`
- Never touch Learning / Commerce / Collaboration / Billing
- Do not switch runtime off JSON store without a dedicated readiness + GO milestone

## Persistence activation progress

- Readiness: `TRANSLATION_RUNTIME_PERSISTENCE_ACTIVATION_READINESS_V1` complete (NOT_READY for DB activation)
- Phase 1 landed: `TRANSLATION_STUDIO_PERSISTENCE_PORT_AND_FLAG_V1`
  - `StudioPersistencePort` + JSON adapter
  - `UMTUBA_TRANSLATION_STUDIO_PERSISTENCE_MODE`
  - Executable modes: `json` (default), `shadow_dual_write`, `dual_read` (JSON + compare, no writes)
  - Unsupported: `db_primary_json_fallback` (fail closed to JSON)
  - Runtime remains **JSON-authoritative** — no DB-primary
- Dual-read observe: `UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE` defaults **OFF**
  - Preferred safe composition: `shadow_dual_write` + observe nest
  - Observe over plain JSON-only is refused (activation-unsafe)
  - Preflight: `npm run translation:dual-read-preflight` (zero remote writes)

## Next milestone

`TRANSLATION_STUDIO_LIMITED_SHADOW_OBSERVATION_V1` (retry) then separate **activation GO** for observe — do **not** enable observe / flip authority without GO.
