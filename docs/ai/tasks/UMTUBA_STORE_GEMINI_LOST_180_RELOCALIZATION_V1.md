# UMTUBA_STORE_GEMINI_LOST_180_RELOCALIZATION_V1

Authorized Gemini recovery for the 180 localization rows proven successfully localized before the 2026-09-09 17:59Z overwrite. Hard gate: identify the exact 180 vs the original 18 before any paid Gemini call.

## Status

**BLOCKED_PHASE1_IDENTITY**

The 198-queue IDs exist on the live RETRY_V2 catalog. The accept-set (180) and leftover reject-set (18) from the 17:21 run do **not**. Counts alone are not an identity proof. Gemini was not called. Canonical catalog was not written.

```text
TASK_ID = UMTUBA_STORE_GEMINI_LOST_180_RELOCALIZATION_V1
STATUS = BLOCKED_PHASE1_IDENTITY
TOTAL_PRODUCTS = 532
LOST_SUCCESS_ROWS_IDENTIFIED = 0
ORIGINAL_MANUAL_REVIEW_IDENTIFIED = 0
AMBIGUOUS_ROWS = 198
BACKUP_PATH = NONE
BACKUP_SHA256 = NONE
GEMINI_INPUT_PRODUCTS = 0
GEMINI_SUCCESS = 0
GEMINI_FAILURE = 0
GEMINI_COST = $0.0000
CANDIDATE_PATH = NONE
CANDIDATE_SHA256 = NONE
LOCALIZED_TOTAL = 334
LOCALIZATION_REVIEW = 198
PUBLISHABLE_PRODUCTS = 249
HELD_PRODUCTS = 283
AVG_PUBLISHABLE_MARGIN = 0.5365994089521336
RESTORED_514_18 = NO
RESTORED_364_168 = NO
PRODUCT_IDS_CHANGED = 0
PRODUCTS_ADDED = 0
PRODUCTS_DELETED = 0
PRICES_CHANGED = 0
COMMERCIAL_FLAGS_CHANGED = 0
ORIGINAL_334_INTACT_LOCALIZATIONS_CHANGED = 0
ORIGINAL_18_MANUAL_REVIEW_SENT_TO_GEMINI = 0
CANONICAL_FILE_REPLACED = NO
LIVE_DEPLOY = NO
PAYMENTS_CHANGED = NO
BLOCKERS = 17:21 accept/reject product IDs were never persisted; current 198 review rows cannot be split without guessing
NEXT_ACTION = OWNER_REVIEW
```

## Phase 1 — identification method (failed)

Proven history (counts only):

| Evidence | What it proves | What it does not prove |
| --- | --- | --- |
| Terminal `233977` ended `2026-09-09T17:21:47.364Z` | Flash accepted 180/198; leftover 18; `titles=514`; `$0.0513` | No product IDs |
| Terminal `233979` ended `2026-09-09T17:40:38.266Z` | FINAL_18 repaired 0/18; publishable 364 / held 168 | No leftover IDs |
| Task reports RETRY_V2 + FINAL_18 | Same counts | No ID lists |
| Live catalog SHA256 `0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb` | Current 198-queue + 334 intact | Which 18 of the 198 were leftovers |

Closest ID dump that ever existed:

- FINAL_18 agent [Repair 18 and audit HOLDs](ad9c5c0b-db65-43f9-b070-173081d02411) wrote `scripts/store/_dumpFinal18.ts`, ran it against the then-514/18 catalog, then said “I have the 18 failure reasons”.
- The script printed `{n,id,dept,sub,title,reason,gaps,…}` for each leftover row and `count=18`.
- The script was then deleted. Its stdout is **not** in surviving terminals (gap between `233978` ended 17:24Z and `233979` started 17:33Z), not in agent-tools, not in History, and not in later reports.

Why current review_reason cannot split 180 vs 18:

- After the 17:21 accept, leftovers would have carried `MANUAL_LOCALIZATION_REVIEW:` overlay reasons from `applyGeminiCopy`.
- Live 198 all have **empty** `title_ar` / `title_en_clean` / `description_ar` and **0** overlay reasons.
- Live buckets are the original local-composer empty-copy shape: `no_template=176`, `unsupported_claim=5`, paid-AI title gates `17` (3+1+3+2+2+2+1+3).
- `17 ≠ 18`. `17+5=22 ≠ 18`. Choosing any 18 of those 22 (or of the 198) would be a guess.

Therefore:

- `CURRENT_REVIEW = 198` (known IDs on live file; **not** Gemini-authorized)
- `LOST_SUCCESS_ROWS = 0` proven
- `ORIGINAL_MANUAL_REVIEW = 0` proven
- `AMBIGUOUS_ROWS = 198`

Hard gate failed. Phases 2–6 were not started. No backup, no candidate, no Gemini.

## Live file (unchanged)

| File | SHA256 | generated_at |
| --- | --- | --- |
| `data/cj-catalog-532-localized-final-v1.json` | `0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb` | `2026-09-09T17:59:43.193Z` |
| `data/cj-localization-catalog-v1.json` | same (byte-identical sibling; not re-hashed this pass beyond prior audit) | 17:59Z |

End-of-task re-hash of the canonical file matched the known live hash.

## Owner options (do not execute here)

1. Recover the 17:21 or 17:40 catalog bytes (Previous Versions already empty; other file recovery already failed). Then the leftover 18 IDs can be listed from `status === manual_review_required`.
2. If the `_dumpFinal18` stdout is found later (another machine, chat export, undeleted terminal), that 18-ID list is sufficient to subtract from the current 198 and authorize only the 180.
3. A new owner GO that explicitly authorizes a different Gemini input set (for example the full current 198) — this task does **not** treat that as authorized.
