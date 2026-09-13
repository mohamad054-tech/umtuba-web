# UMTUBA_STORE_514_364_DEEP_FILE_RECOVERY_V1

Deep file recovery. No Gemini rerun. No HOLD repair. Live catalogs were not overwritten.

## Status

**RECOVERY_COMPLETE_NO_CANDIDATE_FOUND**

No exact or near-exact copy of the 532 / 514 / 18 / 364 / 168 catalog was found on this PC.

```text
TASK_ID = UMTUBA_STORE_514_364_DEEP_FILE_RECOVERY_V1
STATUS = RECOVERY_COMPLETE_NO_CANDIDATE_FOUND
CANDIDATES_FOUND = NONE
EXACT_CHECKPOINT_FOUND = NO
RECOVERED_FILE_PATH = NONE
RECOVERED_SHA256 = NONE
CURRENT_FILE_CHANGED = NO
GEMINI_RERUN = NO
PRODUCT_DATA_CHANGED = NO
```

## Target

| Field | Value |
| --- | --- |
| Local window | 2026-09-09 20:21–20:44 UTC+3 |
| UTC window | 2026-09-09 17:21–17:44Z |
| TOTAL_PRODUCTS | 532 |
| LOCALIZED_TOTAL | 514 |
| LOCALIZATION_REVIEW | 18 |
| PUBLISHABLE | 364 |
| HELD | 168 |

Checkpoint evidence (counts only; no product dump):

- Terminal `233977` ended `2026-09-09T17:21:47.364Z` — `titles_complete:514` `manual_review_required:18` cost `$0.0513`
- Terminal `233979` ended `2026-09-09T17:40:38.266Z` — `publishable:364` `held:168` `avg_margin:0.5311879434439389`

Writer scripts (`runGemini198Localization.ts`, `runFinal18RepairAndHolds.ts`) persist **only**:

- `data/cj-catalog-532-localized-final-v1.json`
- `data/cj-localization-catalog-v1.json`

No sidecar / checkpoint / bak path exists in those scripts.

## Live file (unchanged)

| File | SHA256 | mtime UTC | size |
| --- | --- | --- | --- |
| `data/cj-catalog-532-localized-final-v1.json` | `0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb` | 2026-09-09T17:59:43.199Z | 1,052,747 |
| `data/cj-localization-catalog-v1.json` | same (byte-identical) | 2026-09-09T17:59:43.207Z | 1,052,747 |

End-of-task re-hash matched the known damaged SHA256. `CURRENT_FILE_CHANGED = NO`.

## Search locations (all negative for a 514/364 catalog file)

### Cursor / editor

- `%APPDATA%\Cursor\User\History` — 286 history dirs. **Zero** `entries.json` resources for `cj-catalog-532` / `cj-localization-catalog`. Content search for `titles_complete": 514` empty. No History JSON ≥100KB.
- `%APPDATA%\Cursor\User\workspaceStorage` — 4 workspaces. This-repo DB `ea77dbd1f7361c89cea9a8e2b3ce9af3` mtime 17:59:41Z contains **no** catalog JSON. `empty-window` `FINAL_18` hit is composer **task text**, not a file.
- `%APPDATA%\Cursor\Backups` — empty.
- `%APPDATA%\Cursor\User\globalStorage\state.vscdb` (~2.35 GB) — mmap hits for `titles_complete":514` / `publishable":364` / `0.5311879434439389` are **chat/terminal/agent strings only**. Zero `generated_at": "2026-09-09T17:21` catalog payload.
- `conversation-search.db` — index of those chat strings, not a catalog.
- `anysphere.cursor-retrieval` — no 514 signature.
- `anysphere.cursor-agent-worker` — August CLI bits only.
- VS Code `%APPDATA%\Code\...` — **missing**.

### Time window

Python walk of Desktop\umtuba, Documents, Downloads, Desktop, D:\umtuba-central (excluding `node_modules` / `.git` / `.next`):

- Name hits for localized-final / 514 / 364 / checkpoint: live damaged file + later audit docs only.
- Large JSON ≥800KB: live pair + `cj-catalog-expansion-300-v1.json` (12:40Z).
- Files written 17:15–17:50Z matching json/bak/log or ≥200KB: **only** `tsconfig.tsbuildinfo` at 17:42:06Z.

### Repo generated / scripts

- `.next` — no 17:15–17:55Z catalog-sized JSON; existing large chunks are August. Grep for `titles_complete": 514` empty.
- `tmp` / `out` / `coverage` — missing.
- `scripts/store` — no extra `*-qa.json` / `*-audit.json` / `*-publishable.json` sidecar from the 514 run.
- Repo `*.bak` / `*.old` / `*.copy` — none.
- Repo `.cursor` — workflow rule only.

### Git

- Catalog paths **never tracked** (`git ls-files` unknown). `git log --all` empty for both live JSON names.
- Stash `{0}` is `docs/ai/CURSOR_REPORT.md` only (pre-A3 audit).
- Reflog: no catalog commit.
- `git fsck --unreachable --no-reflogs --dangling`: **no dangling blobs** in the 800KB–5MB band.
- `git log -S` for `titles_complete": 514` / `":514` / `0.5311879434439389` — empty.

### Recycle / user folders / other drives

- Recycle Bin this user (C:) — 22 items; `$I` originals are August brand audio/zips. No catalog JSON.
- Recycle D: — `desktop.ini` only.
- E: — Adobe/software/images; `dir /s` exact catalog name empty.
- Downloads / Documents — no `cj-catalog*` by exact name.
- OneDrive — exists but empty (`desktop.ini` only).
- File History folder — missing.
- Windows.old — missing.
- VSS / `vssadmin list shadows` — access denied (owner already confirmed **no Previous Versions**).

### Clones / worktrees / intake

- Sibling `C:\Users\Giga store\Desktop\umtuba\umtuba-web-*\data\cj-catalog-532-localized-final-v1.json` — no extra copy.
- Store worktrees (`PC2-STORE-*`) — August 24 trees; no 532 localized-final.
- `D:\umtuba-central\FROM-PC2` — markdown returns only.
- `_central_intake` — no 514 catalog JSON in the walk.

### Temp / caches

- `%TEMP%` — `cj-loc-qa.html` (11:04Z) and `cj-rtl.html` (12:13Z) predating Gemini success.
- `tsx-Giga store` — compiled script caches (max ~20KB) from 17:07 / 17:33 / 17:41; no `titles_complete":514`.
- `node-compile-cache` large files dated Sept 5–7, not catalog names.
- npm-cache — no catalog filenames.

### Transcripts / terminals

- `233977` / `233979` — stdout counts only; write paths = live files only. No second output path.
- `233980` — `npm run build` started 17:42:23Z (after 17:40 write). `.next` did not retain a 514 catalog payload.
- Agent transcript `96241b31-2b21-4f35-8a1c-10882c7267ef` and subagents — counts and source-file writes; **no 532-row JSON dump**.

## Candidates

None. Recovery directory was **not** created (nothing to copy).

## Not reconstructed

180 Gemini-accepted rows were not invented, merged, or guessed from the 334/198 live file.

## Locations not searchable from this session

- Elevated Volume Shadow Copies
- Other Windows user profiles
- Other machines / remotes that may have had this worktree open after 17:40Z
- Gemini provider request logs (would not be the catalog file)

## Next action

Accept that the 17:21 / 17:40 payloads are gone on this PC. Do not HOLD-repair the 17:59 RETRY_V2 file as if it were the 364 checkpoint. A **new authorized localization task** is required if those 180 titles are needed again.
