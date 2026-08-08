# Translation Studio V1 — Central Alpha Integration Handoff

**Milestone:** `COMPUTER_2_TRANSLATION_ALL_WORK_FINAL_PUSH_AND_HANDOFF_V1`  
**Device:** Computer 2 (Translation & Internationalization)  
**Status:** Durable sanitized evidence for **Central Server** integration only.

## Translation Studio V1

`TRANSLATION_STUDIO_V1` = **PRODUCTION_ACCEPTED / COMPLETE**

Canonical acceptance record:
[`TRANSLATION_STUDIO_V1_PRODUCTION_ACCEPTED.md`](./TRANSLATION_STUDIO_V1_PRODUCTION_ACCEPTED.md)

## Integration refs (observed at Computer-2 handoff)

| Role | Ref | SHA |
| --- | --- | --- |
| Translation source (integrate **this**) | `origin/office/platform-translation-trunk-port-v1` | `c061c0a593662d03569c489246996bf2a3e034aa` |
| Alpha target (observed) | `origin/alpha-0.2` | `62c6c5d04f962b9615c1fb8037bae6b76d7f8e36` |
| Merge-base | = alpha target | `62c6c5d04f962b9615c1fb8037bae6b76d7f8e36` |

## Topology

- Alpha-only commits: **0**
- Translation-only commits: **41**
- Topology: **linear extension / fast-forward eligible**
- Textual conflict forecast (`merge-tree --write-tree`): **none**
- `READY_FOR_CENTRAL_TRANSLATION_INTEGRATION` = **YES**

## Ownership

- **Central Server** owns final alpha integration / merge execution.
- **Computer 2 must not** perform the alpha merge, rebase, cherry-pick onto `alpha-0.2`, or push alpha.
- Do **not** start Translation Studio V2 from this handoff.

## Migrations (central read-only verification; no `db push` in merge gate)

Verify history for:

- `20260902` — translation intelligence foundation
- `20260910` — translation studio persistence workflow
- `20260911` — stable identity schema
- `20260912` — write RPC (`translation_studio_upsert_snapshot`)
- `20260913` — read snapshot RPC (`translation_studio_read_snapshot`)
- `20260914` — memory identity contract align

Handoff evidence indicates these were already applied/registered on the shared linked project; Central must **re-confirm** before treating them as new applies. Do **not** repair unrelated Store/Learning history.

## Accepted V1 invariants (must preserve after integration)

- JSON authoritative
- `shadow_dual_write` accepted / supported
- Dual-read observe **ON** operationally (Computer-2 runtime); race-safe; real actionable drift opens breaker
- Breaker **CLOSED** at V1 acceptance
- DB-primary **deferred** / unsupported
- Publish remains dry-run / non-auto (`writesCatalogFiles=false`, `autoPublish=false`)
- Professional AI human authority boundary (preview → Apply-to-draft → Submit; no auto-approve/publish)
- Known `__shadow_smoke_v1__` residue = non-actionable smoke, not unexplained drift
- No secret material in Git

## Semantic review still required (even with FF)

- `app/layout.tsx` + App Shell i18n wiring
- Additive shared AI Core hooks under `lib/ai/**`
- `package.json` script additions / `vitest.config.ts` includes
- Tip docs narrative becomes Translation V1 closeout after FF

## Recommended Central strategy

Fast-forward (or equivalent merge commit if policy forbids FF):

- Source: `c061c0a593662d03569c489246996bf2a3e034aa`
- Target: `62c6c5d04f962b9615c1fb8037bae6b76d7f8e36`
- Rollback point: pre-integration alpha tip `62c6c5d04f962b9615c1fb8037bae6b76d7f8e36`

Merge must **not** rewrite Computer-2 or server `.env.local` automatically.

## Central post-integration gate (summary)

1. Confirm FF/clean merge  
2. Translation workflow / Studio tests  
3. Professional AI offline/fake tests (**no paid calls**)  
4. Persistence / shadow / dual-read race / reconciliation / auth / publish dry-run  
5. Shared AI Core regressions  
6. `npx tsc --noEmit` · `git diff --check` · secret/trailer scan  
7. Read-only remote migration history verify for the six versions above
