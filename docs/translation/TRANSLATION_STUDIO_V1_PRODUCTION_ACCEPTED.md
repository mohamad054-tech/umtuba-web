# Translation Studio V1 — PRODUCTION_ACCEPTED

**Status:** `TRANSLATION_STUDIO_V1` = **PRODUCTION_ACCEPTED**

**Closeout base:** `0d66bb92efb83d954dacbe770ef5f3e169f40c50`

**Branch:** `office/platform-translation-trunk-port-v1`

**Acceptance:** `TRANSLATION_STUDIO_PRODUCTION_ACCEPTANCE_AND_OPERATIONAL_SOAK_V1` = **ACCEPTANCE_PASS**

## Final accepted architecture

| Concern | State |
| --- | --- |
| Authority | **JSON file store remains authoritative** |
| Persistence mode | `shadow_dual_write` (`UMTUBA_TRANSLATION_STUDIO_PERSISTENCE_MODE`) |
| Dual-read observe | **ON** (`UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE=1`) |
| Breaker | **CLOSED** after race-fix + post-fix parity + resumed soak |
| Parity | Proven / stable (IN_SYNC; smoke residue non-actionable) |
| DB-primary | **NOT enabled** — explicitly **deferred** (V2) |
| Publish | **Dry-run only** (`dryRun=true`, `writesCatalogFiles=false`, `autoPublish=false`) |
| AI authority | Human-gated: preview → Apply-to-draft → Submit; **no** auto-approve / auto-publish |

This document does **not** claim DB authority, live catalog publish, or automatic AI workflow advancement.

## Proven capabilities (V1)

- Stable identity persistence foundations + Translation Studio schema lineage
- Authenticated snapshot write RPC (`translation_studio_upsert_snapshot`) and read RPC (`translation_studio_read_snapshot`)
- Shadow dual-write (JSON first; shadow best-effort / isolated)
- Race-safe dual-read observation (same-hash lineage lag + bounded settle re-read)
- Professional AI generation + professional AI review
- Strict 10-dimension quality contract; placeholder/formatting integrity
- Sanitized diagnostics (no raw provider/secret leakage in UX)
- Live OpenAI small smoke = **SMOKE_PASS**
- Generator × reviewer matrix = **MATRIX_PASS**
- Professional AI Studio UX (readiness chip, Generate+Review primary path, Apply-to-draft)
- Explicit human Apply-to-draft boundary
- Platform-admin authorization enforcement (unauthenticated Studio → redirect)
- Operational soak acceptance after race-fix (6/6 new IN_SYNC observe cycles)

## Final acceptance evidence (summary)

- Controlled FR value: **Retour / needs_review / v3**
- Remote Submit lineage: `ver_1561`, `audit_1562`
- JSON fingerprint: `a8c5a9c785a1e6178398901552e4dfb6df405c7970fda8ef41f7e84e8d2c201d`
- Resumed soak mutation count: **0**
- Known `__shadow_smoke_v1__` remote extras are **non-actionable smoke residue**, not unexplained drift

## Deferred V2 debt (non-blocking)

Recorded separately; **must not** reopen V1:

1. DB-primary authority cutover
2. Prune / delete reconciliation
3. Observe journal retention / rotation
4. Duplicate observe scheduling / noise reduction
5. Cleanup of known `__shadow_smoke_v1__` remote residue
6. Optional multi-provider paid matrix expansion
7. Catalog publish non-dry-run activation

## Explicit non-claims

- DB is **not** authoritative
- DB-primary is **not** enabled
- Publish is **not** live
- AI **cannot** approve or publish automatically
- Smoke residue is **not** unexplained actionable drift

## Recommended next action (outside Translation Studio V1)

Do **not** start Translation Studio V2 or DB-primary from this closeout.

Computer-2 / platform next work should be chosen by a separate GO outside this V1 milestone.
