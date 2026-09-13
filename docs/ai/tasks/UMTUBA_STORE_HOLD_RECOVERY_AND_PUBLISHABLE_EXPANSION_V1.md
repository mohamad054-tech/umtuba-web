# UMTUBA_STORE_HOLD_RECOVERY_AND_PUBLISHABLE_EXPANSION_V1

## Status

**BLOCKED_CHECKPOINT_MISMATCH**

The owner-stated checkpoint was confirmed as yesterday's completed work (terminal evidence) but is **not** the live catalog on disk. HOLD recovery was not applied.

## Live dataset (do not treat as the 364/168 checkpoint)

| Field | Checkpoint | Live file |
| --- | ---: | ---: |
| TOTAL_PRODUCTS | 532 | 532 |
| Localized (not manual) | 514 | 334 |
| MANUAL_LOCALIZATION_REVIEW | 18 | 198 |
| PUBLISHABLE | 364 | 249 |
| HELD | 168 | 283 |
| AVG_PUBLISHABLE_MARGIN | 53.1% | 53.7% |
| PRODUCT_DATA_REVIEW | 129 | 129 |
| IP_REVIEW | 3 | 3 |
| PRICE_REVIEW | 25 | 25 |
| Duplicates flagged | 1 remaining | 2 flagged |
| CJ_SYNC_ERRORS | 0 | 0 |

Source files: `data/cj-catalog-532-localized-final-v1.json` and `data/cj-localization-catalog-v1.json` (identical; `generated_at` / mtime `2026-09-09T17:59:43Z`; task_id `UMTUBA_STORE_GEMINI_198_LOCALIZATION_RETRY_V2`; paid note `$0.0000`).

## Yesterday's evidence that the checkpoint existed

- Terminal `233977`: Gemini Flash accepted 180/198. `checkpoint remaining=18 titles=514`. Ended `2026-09-09T17:21:47Z`.
- Terminal `233979`: Final-18 repair repaired 0/18. `publishable:364 held:168 avg_margin:0.5311879434439389`. Ended `2026-09-09T17:40:38Z`.
- About 19 minutes later the live JSON was overwritten back to 334/198 / `$0.0000`.

## What was not done

- No HOLD repairs
- No Gemini rerun
- No product deletes
- No All-view / category visibility changes
- No live deploy / payments

## Second-pass recovery search (2026-09-10)

No 17:40Z / 514-localized / 364-publishable copy was found. Live files were not overwritten. HOLD recovery was not started. Gemini was not rerun.

Owner action: on this PC, Explorer → right-click `data/cj-catalog-532-localized-final-v1.json` → **Restore previous versions**. Choose **2026-09-09 20:21–20:44 local (17:21–17:44 UTC)**. Do not restore the 17:59Z / 20:59 copy.

## Next action

Restore the `17:40:38Z` catalog artifact (514 localized, 364 publishable, 168 HOLD) via Explorer Previous Versions on this machine, then rerun this HOLD recovery task on that dataset.
