# V5 source deposit manifest

**TASK_ID:** `DESKTOP_ANDROID_V5_SOURCE_DEPOSIT_TO_CENTRAL_V1`  
**SOURCE_DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_GOOGLE_PLAY_PRIMARY / V5_SOURCE_OWNER  
**DATE:** 2026-08-14  
**PACKAGE:** source delta only (no AAB, no secrets, no commit)

## Provenance

| Field | Value |
| --- | --- |
| Mobile repo | `C:\Users\1\Desktop\umtuba\umtuba-mobile` |
| Branch | `master` |
| HEAD / V5_BASE_SHA | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` |
| HEAD subject | `feat(ios): add App Store readiness contracts from PC2 preparation` |
| Upstream | `origin/master` = `db7f927467eb2a5416b612c330bfa8440bcf50f0` |
| Ahead / behind | **0 / 2** |
| Origin-only (NOT taken) | `45f0dbc` UAF-12 + hide unfinished Live; `db7f927` iOS docs |
| Fast-forward | **NOT PERFORMED** |
| Staged | none |
| Commit invented for transport | **NO** |
| V5_DELTA_PROVENANCE_CLEAR | **YES** |

Apply the patch against a clean tree at **exactly** `3b335610ced48aa2595fe49eef5b97511c7f4cb5`. Do **not** apply onto `origin/master` (`45f0dbc` / `db7f927`) — Live-hide overlap.

## Transport files

| File | Role |
| --- | --- |
| `v5.patch` | git patch of the 22 V5_REQUIRED paths vs BASE |
| `checksums.sha256` | SHA256 of patch + each `files/` copy |
| `files/` | working-tree copies of the 22 paths (review aid) |
| `TEST_EVIDENCE.md` | A1 vitest 116/116 + tsc PASS excerpt (not re-run) |
| `DESKTOP_A1_ANDROID_V5_SOURCE_FINALIZATION_V1.md` | prior source-finalization closeout |
| `README.md` | Central apply / review instructions |
| `MANIFEST.json` | machine-readable twin of this file |

**Patch SHA256:** `3a73f43035859980c010936c9fa5aa226f10b54c04e3ca4e35888e169fe05ec1`  
**Patch bytes:** `71755`

## V5_REQUIRED (exported) — 22 files

Own-content delete:

- `src/lib/social/deleteOwnedPost.ts` (git blob `e868e52c5324d4760055261a85e9b1807a926f7e` = `45f0dbc`)
- `src/lib/social/deleteOwnedPostShared.ts` (git blob `2d9737cb69a5d7f1af7d915992817ec148753a83` = `45f0dbc`)
- `src/lib/social/deleteOwnedPost.test.ts` (A1-extended; diverges from `45f0dbc` on purpose)
- `app/(tabs)/watch.tsx` (UGC + `onDeleteOwn`)
- `components/WatchVideoCard.tsx` (owner-only Delete control)

UGC report / block / terms + account-deletion entry:

- `app/(auth)/signup.tsx`
- `app/_layout.tsx` (Blocked users stack screen only; Live tab **not** hidden)
- `app/messages/[id].tsx`
- `app/settings.tsx`
- `app/blocked-users.tsx`
- `components/UgcSafetySheet.tsx`
- `src/lib/feed/watchFeed.ts`
- `src/lib/messenger/api.ts`
- `src/lib/video/ugcSafety.ts`
- `src/lib/video/ugcSafety.test.ts`
- `src/lib/safety/blocks.ts`
- `src/lib/safety/blocks.test.ts`
- `src/lib/safety/index.ts`
- `src/lib/safety/reports.ts`
- `src/lib/safety/reports.test.ts`
- `src/lib/safety/ugcPolicy.ts`
- `src/lib/safety/ugcPolicy.test.ts`

Capabilities in this delta: own post delete, own video delete (storage cleanup after owner row delete), Report content, Report user, Block user, UGC terms, account-deletion entry (web URL).

## Classified OUT of export

| Path | Class | Why excluded |
| --- | --- | --- |
| `app.config.ts` | UNRELATED | versionCode 1→4 leftover; next authorized EAS is versionCode **5** via `autoIncrement` |
| `eas.json` | UNRELATED | production `environment` + submit `track: internal` — build-path leftover, not product source |
| `release-artifacts/**` | GENERATED | v4 AABs (`26a60f53`, `37dde25f`, `86c0d773`), EAS logs, store-listing copy, pre-ff backups |
| `.env*` | (absent from WT status) | never exported |
| Live-hide from `45f0dbc` | UNRELATED / forbidden | not in WT; not taken |

`UNRELATED_WIP_FOUND = YES` — safely separated. Not mixed into `v5.patch`.

## Integrity

- `git apply --check` against throwaway worktree at BASE: **PASS**
- `git apply` on that throwaway (then removed): **PASS** (22/22 clean)
- Authoritative `umtuba-mobile` working tree: **not modified** by export or apply-check
- Secrets / `.env` / tester emails / keystore: **not included**

## Gates (unchanged)

- `V5_BUILD_PERFORMED = NO`
- `DESKTOP_V5_BUILD_GO` remains **NO** until Central reviews this deposit and sends GO
- `V4_UPLOAD_ALLOWED = NO`
- Live = OUT_OF_SCOPE / fail-closed
