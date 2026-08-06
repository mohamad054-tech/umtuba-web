# Current Task

## Task title

<<<<<<< HEAD
UMTUBA Translation Studio V1 — **PRODUCTION_ACCEPTED** (FINAL CLOSEOUT)

## Milestone status

`TRANSLATION_STUDIO_V1` = **PRODUCTION_ACCEPTED**

Previously closed lineage includes:

- `TRANSLATION_REMOTE_MIGRATION_APPLY_AND_HISTORY_V1_CLOSED`
- `TRANSLATION_STUDIO_PERSISTENCE_PORT_AND_FLAG_V1`
- `TRANSLATION_STUDIO_PERSISTENCE_V1` (JSON-authoritative architecture accepted)
- Race-safe dual-read observation V1
- Production acceptance + operational soak V1 = **ACCEPTANCE_PASS**
=======
UM Core Platform Capability Registry Foundation P5
>>>>>>> d57e481 (feat(core): add UM Core capability registry foundation P5)

## Status

Closed on 2026-08-08 (Computer 2). Translation Studio V1 product/operational
acceptance is complete under JSON-authoritative + shadow dual-write + dual-read
observe. **DB-primary is not enabled and remains deferred.**

## Device / worktree

<<<<<<< HEAD
- Device: كمبيوتر 2 — Translation & Internationalization only
- Worktree: `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1`
- Branch: `office/platform-translation-trunk-port-v1`
- V1 closeout base: `0d66bb92efb83d954dacbe770ef5f3e169f40c50`
- Linked Supabase: `umtuba` / `tgucwnjwoyeqoxqaxmew` (eu-west-1)
=======
`office/um-core-platform-capability-registry-foundation-p5`
>>>>>>> d57e481 (feat(core): add UM Core capability registry foundation P5)

## Final accepted architecture

<<<<<<< HEAD
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
=======
`5215e15267ae1c6955c6101b914066d771acabe7` (Platform Registry P4 close)
>>>>>>> d57e481 (feat(core): add UM Core capability registry foundation P5)

Canonical closeout doc:
[`docs/translation/TRANSLATION_STUDIO_V1_PRODUCTION_ACCEPTED.md`](../translation/TRANSLATION_STUDIO_V1_PRODUCTION_ACCEPTED.md)

<<<<<<< HEAD
## Translation migrations (final)
=======
`C:\Users\Admin\Desktop\umtuba\umtuba-web-um-core-platform-capability-registry-foundation-p5`
>>>>>>> d57e481 (feat(core): add UM Core capability registry foundation P5)

| Role | File | Remote schema | Remote history |
| --- | --- | --- | --- |
| Intelligence | `20260902_translation_intelligence_foundation_v1.sql` | APPLIED | REGISTERED |
| Persistence & Workflow | `20260910_translation_studio_persistence_workflow_v1.sql` | APPLIED | REGISTERED |

<<<<<<< HEAD
Additional Studio lineage applied/registered on linked project includes stable
identity, write RPC, read snapshot RPC, and memory identity align migrations
(`20260911`–`20260914`) — see Computer-2 handoff.
=======
`um.core.capability_registry_foundation_p5`
>>>>>>> d57e481 (feat(core): add UM Core capability registry foundation P5)

- `20260901` remains **Learning-owned** — not reclaimed
- Runtime remains JSON store (`data/translation-studio/`)

<<<<<<< HEAD
## Hard rules (still in force)
=======
- `platforms/core/capability/**`
- `platforms/core/packageIdentity.ts`
- `platforms/core/coreFoundationContracts.test.ts`
- `platforms/core/README.md`
- `docs/core/**`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
>>>>>>> d57e481 (feat(core): add UM Core capability registry foundation P5)

- Never `db push` / `--include-all` / blind `migration up` / wholesale history repair
- Do not reclaim `20260901`
- Do not port Learning Translation Foundation `6a3cb3d`
- Never touch Learning / Commerce / Collaboration / Billing
- Do **not** enable DB-primary without a dedicated future GO
- Do **not** treat this closeout as permission to start Translation Studio V2

<<<<<<< HEAD
## Deferred V2 debt (non-blocking)
=======
- Capability execution / AI / event routing / flag evaluation
- Persistence / networking / product integration
- Migrations / database
>>>>>>> d57e481 (feat(core): add UM Core capability registry foundation P5)

1. DB-primary authority cutover
2. Prune / delete reconciliation
3. Observe journal retention / rotation
4. Duplicate observe scheduling / noise
5. Cleanup of known `__shadow_smoke_v1__` remote residue
6. Optional multi-provider paid matrix
7. Catalog publish non-dry-run activation

<<<<<<< HEAD
## Next milestone

**Translation Studio V1 is COMPLETE.**
Do **not** start V2 / DB-primary / prune from this task. Next platform work
requires a separate GO outside Translation Studio V1.
=======
Pure in-memory capability registry bound to registered platforms, with
lookups, deterministic rejection findings, and focused tests.
Committed and pushed on `office/um-core-platform-capability-registry-foundation-p5`.
Do not start P6 from this handoff.
>>>>>>> d57e481 (feat(core): add UM Core capability registry foundation P5)
