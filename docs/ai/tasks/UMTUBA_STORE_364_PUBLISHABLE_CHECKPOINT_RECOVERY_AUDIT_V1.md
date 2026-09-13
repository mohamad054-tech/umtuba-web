# UMTUBA_STORE_364_PUBLISHABLE_CHECKPOINT_RECOVERY_AUDIT_V1

Read-only root-cause audit. No HOLD repair. No catalog restore. No Gemini rerun.

## Status

**AUDIT_COMPLETE_CHECKPOINT_FILE_MISSING**

The 364/168 checkpoint is real (terminal + task reports). The 532-row JSON that held those counts is **not on disk**. Live files are a later 17:59:43Z overwrite that restored the pre-Gemini-success 334/198 localization payload.

## 1. Previous 364/168 checkpoint

**Full dataset file: NOT FOUND.**

Strongest evidence (counts only; no product-ID dump):

| Evidence | Path | Timestamp |
| --- | --- | --- |
| Gemini Flash accepted 180/198; `checkpoint remaining=18 titles=514` | `C:/Users/Giga store/.cursor/projects/c-Users-Giga-store-Desktop-umtuba-umtuba-web-translation-trunk-port-v1/terminals/233977.txt` | ended `2026-09-09T17:21:47.364Z` |
| Final-18 repaired 0/18; `publishable:364 held:168 avg_margin:0.5311879434439389` | same folder `233979.txt` | ended `2026-09-09T17:40:38.266Z` |
| Task report | `docs/ai/tasks/UMTUBA_STORE_GEMINI_198_LOCALIZATION_RETRY_V2.md` | 514 localized / 18 review / $0.0513 |
| Task report | `docs/ai/tasks/UMTUBA_STORE_GEMINI_FINAL_18_REPAIR_AND_COMMERCIAL_HOLDS_V1.md` | 364 publishable / 168 held |
| Agent transcript | `96241b31-2b21-4f35-8a1c-10882c7267ef` | same counts; no product dump |

Both writer scripts persist only:

- `data/cj-catalog-532-localized-final-v1.json`
- `data/cj-localization-catalog-v1.json`

No second copy was found in this repo `data/`, `worktrees/`, sibling umtuba web `data/` folders (prior scan 810146), Cursor History filename search, or git (files are untracked and never committed).

## 2. Dataset identity

Previous per-product list does **not** exist, so `SAME_PRODUCT_SET` cannot be proven against the 17:40 file at row level.

What can be proven on the **live** 532-row file:

- 532 unique `cj_product_id`
- Exact union of `data/cj-store-launch-approved-59.json` (59) + `data/cj-catalog-expansion-300-v1.json` (473)
- 0 IDs missing from sources, 0 extra IDs
- SKU and `retail_price_minor` match browse/source economics (0 mismatches)

Commercial source files were not rewritten after the 364 run (approved 08:17Z, expansion 12:40Z, candidate 10:24Z).

## 3. Audit rules

**AUDIT_RULES_CHANGED = NO** relative to the 17:40 classification.

`isPublishableBrowseRow` / `BLOCKING_FLAGS` in `lib/store/productLocalization/publishable.ts` last written `2026-09-09T17:31:52Z` — **before** terminal 233979 (17:33–17:40). `catalogQa.ts` last written 12:52Z, before both runs.

`scripts/store/auditHoldRecovery.ts` is a 2026-09-10 stdout wrapper around the same `publishableStats`. It does not change thresholds.

All localization scripts are untracked; there is no committed baseline to `git diff`.

Read-only live classification (same rules + browse from candidate/expansion) reproduces **249 / 283 / 53.7%**.

## 4. Localization regression

Previous: 514 localized / 18 review. Current: 334 localized / 198 review. Delta **+180 review**.

Live field evidence (not a Gemini rerun):

- All **198** `manual_review_required` rows have **empty** `title_ar`, `description_ar`, and `title_en_clean`
- 0 of those 198 have any Arabic title
- Gold 20 + local_pass 314 still have complete Arabic (334 = 20+314)

`review_reason` counts on the 198:

| Count | Reason |
| ---: | --- |
| 176 | No gold-standard local template matched this supplier title. |
| 5 | Local compose failed gold-standard gate: unsupported_claim |
| 17 | Paid-AI / human title gates (medicine, ECG/watch, foot, OBD, anxiety, aliexpress, tattoo, gaobang) |

This is the local-composer empty-copy shape (`catalogFile.emptyCopy()`), not a schema rename and not a threshold change.

Live file metadata matches a **failed/empty** `runGemini198Localization.ts` final write, not the 17:21 or 17:40 success writes:

- `task_id` = `UMTUBA_STORE_GEMINI_198_LOCALIZATION_RETRY_V2` (17:40 write used `FINAL_18`)
- `generated_at` / mtime = `2026-09-09T17:59:43Z`
- paid note `$0.0000` / model `gemini-2.5-flash` / `products: 198`
- `duplicates_flagged`: **2** (17:21 Gemini output) not **1** (17:40 commercial audit)

`paid_ai_estimate.products = 198` means that process operated on a 198-item review queue (334 localized), not the 18-item queue that would exist if it had read the 514 file.

No Cursor terminal in this project captured a command ending at 17:59. The writer is still the Gemini-retry script signature. Most likely: a process that held the pre-17:07 334 catalog in memory (or rebuilt local 334) and wrote both live paths ~19 minutes after 17:40.

## 5. Product-level diff

Previous per-product publishable list: **does not exist**.

- `PREVIOUSLY_PUBLISHABLE_NOW_HOLD` cannot be listed by id
- `PREVIOUSLY_HOLD_NOW_PUBLISHABLE` cannot be listed by id
- `PUBLISHABLE_BOTH` / `HOLD_BOTH` cannot be listed by id

Classification reconstruction (counts only):

- Localization review +180
- Publishable −115 / held +115
- Therefore **115** of the 180 newly-review rows had no other blocking gate (they are the entire publishable loss)
- **65** of the 180 were already commercial HOLD
- Current loc-only HOLD = 131 (= ~16 leftover from the original 18 loc-only + 115 newly un-localized)
- Current loc+commercial = 67; commercial-only = 85
- New HOLD reason for those 115: `LOCALIZATION_REVIEW` + empty localized copy

## 6. Input file / hashes

| File | SHA256 | mtime UTC |
| --- | --- | --- |
| `data/cj-catalog-532-localized-final-v1.json` | `0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb` | 2026-09-09T17:59:43.199Z |
| `data/cj-localization-catalog-v1.json` | same (byte-identical) | 2026-09-09T17:59:43.207Z |

Previous 17:40 SHA256: **UNKNOWN** (overwritten). `SAME_INPUT_DATASET = NO`.

`WRONG_DATASET_LOADED = YES` in the sense that live input is the 17:59 RETRY_V2 334 payload, not the 17:40 FINAL_18 514 payload. Same path, different bytes.

`STALE_OUTPUT_DETECTED = YES`.

## 7. No restoration

The 364/168 file was not found. Live catalog was not overwritten.

## Safe recovery options (do not execute in this task)

1. Owner: Explorer → Previous Versions on `data/cj-catalog-532-localized-final-v1.json` for **2026-09-09 20:21–20:44 local (17:21–17:40 UTC)**. Do not restore the 20:59 / 17:59 copy.
2. If VSS has that version, copy it to a **new** path under `docs/ai/` or a side file first; do not overwrite live until hashes and 514/364 counts are verified.
3. Do not rerun Gemini to “guess restore” the 180 rows.
4. Do not treat current 249 as a new authoritative checkpoint.

## Recommended next action

Restore-by-Previous-Versions (owner, this PC) or accept that the 180 Gemini-accepted rows are gone and schedule a **new** authorized localization task. Do not start HOLD repair on the 17:59 file.
