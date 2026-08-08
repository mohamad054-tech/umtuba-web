# Current Task

## Task title

UMTUBA Translation Studio V1 — **PRODUCTION_ACCEPTED** (FINAL CLOSEOUT)

## Milestone status

`TRANSLATION_STUDIO_V1` = **PRODUCTION_ACCEPTED**

Previously closed lineage includes:

- `TRANSLATION_REMOTE_MIGRATION_APPLY_AND_HISTORY_V1_CLOSED`
- `TRANSLATION_STUDIO_PERSISTENCE_PORT_AND_FLAG_V1`
- `TRANSLATION_STUDIO_PERSISTENCE_V1` (JSON-authoritative architecture accepted)
- Race-safe dual-read observation V1
- Production acceptance + operational soak V1 = **ACCEPTANCE_PASS**

## Status

Closed on 2026-08-08 (Computer 2). Translation Studio V1 product/operational
acceptance is complete under JSON-authoritative + shadow dual-write + dual-read
observe. **DB-primary is not enabled and remains deferred.**

## Device / worktree

- Device: كمبيوتر 2 — Translation & Internationalization only
- Worktree: `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1`
- Branch: `office/platform-translation-trunk-port-v1`
- V1 closeout base: `0d66bb92efb83d954dacbe770ef5f3e169f40c50`
- Linked Supabase: `umtuba` / `tgucwnjwoyeqoxqaxmew` (eu-west-1)

## Final accepted architecture

| Concern | State |
| --- | --- |
| Authority | **JSON** authoritative |
| Mode | `shadow_dual_write` |
| Dual-read observe | **ON** |
| Breaker | **CLOSED** |
| Parity | Proven / stable |
| DB-primary | Deferred (not enabled) |
| Publish | Dry-run / non-auto (`writesCatalogFiles=false`, `autoPublish=false`) |
| AI workflow | Human Apply-to-draft boundary; no auto-approve/publish |

Canonical closeout doc:
[`docs/translation/TRANSLATION_STUDIO_V1_PRODUCTION_ACCEPTED.md`](../translation/TRANSLATION_STUDIO_V1_PRODUCTION_ACCEPTED.md)

## Translation migrations (final)

| Role | File | Remote schema | Remote history |
| --- | --- | --- | --- |
| Intelligence | `20260902_translation_intelligence_foundation_v1.sql` | APPLIED | REGISTERED |
| Persistence & Workflow | `20260910_translation_studio_persistence_workflow_v1.sql` | APPLIED | REGISTERED |

Additional Studio lineage applied/registered on linked project includes stable
identity, write RPC, read snapshot RPC, and memory identity align migrations
(`20260911`–`20260914`) — see Computer-2 handoff.

- `20260901` remains **Learning-owned** — not reclaimed
- Runtime remains JSON store (`data/translation-studio/`)

## Hard rules (still in force)

- Never `db push` / `--include-all` / blind `migration up` / wholesale history repair
- Do not reclaim `20260901`
- Do not port Learning Translation Foundation `6a3cb3d`
- Never touch Learning / Commerce / Collaboration / Billing
- Do **not** enable DB-primary without a dedicated future GO
- Do **not** treat this closeout as permission to start Translation Studio V2

## Deferred V2 debt (non-blocking)

1. DB-primary authority cutover
2. Prune / delete reconciliation
3. Observe journal retention / rotation
4. Duplicate observe scheduling / noise
5. Cleanup of known `__shadow_smoke_v1__` remote residue
6. Optional multi-provider paid matrix
7. Catalog publish non-dry-run activation

## Next milestone

**Translation Studio V1 is COMPLETE.**
Do **not** start V2 / DB-primary / prune from this task. Next platform work
requires a separate GO outside Translation Studio V1.
