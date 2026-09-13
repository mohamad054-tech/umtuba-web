# DESKTOP_A1_ANDROID_V5_SOURCE_FINALIZATION_V1

**DEVICE:** DESKTOP-A1  
**DEVICE_ROLE:** ANDROID_V5_SOURCE_FINALIZATION  
**CENTRAL_COORDINATOR:** SERVER  
**MODE:** RELEASE_CRITICAL / EVIDENCE_BACKED  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_A1_ANDROID_V5_SOURCE_FINALIZATION_V1  
**WAVE_ID:** DESKTOP_ANDROID_V5_FINAL_RELEASE_PREPARATION_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE (working-tree hint):** `4` — next authorized production EAS build will be **5** (`eas.json` `autoIncrement: true` + `cli.appVersionSource = remote`)  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `380a36646d4de8a37c39a56ac3ccd449f6d8b20d`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `3b335610ced48aa2595fe49eef5b97511c7f4cb5` + uncommitted UGC / own-delete / versionCode 4 / `release-artifacts/`  
**V5_SOURCE_SHA:** **UNCOMMITTED** + parent `3b335610ced48aa2595fe49eef5b97511c7f4cb5`  
**V4_AAB (not a candidate; do not upload):** `37dde25f` SHA256 `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6`

Prepare the exact mobile source intended for v5. Did **not** build. Did **not** upload v4. Did **not** EAS-build v5. Did **not** commit (dirty UGC already exists). Did **not** push. Did **not** fast-forward `origin/master`. Did **not** take Live-hide from `45f0dbc`.

Prior packets incorporated (not re-litigated): `DESKTOP_ANDROID_V4_FINAL_CANDIDATE_CLOSEOUT_V1`, `DESKTOP_A1_ANDROID_V4_FINAL_RUNTIME_QA_V1`, `DESKTOP_A2_GOOGLE_PLAY_CLOSED_TESTING_OPERATOR_CLOSEOUT_V1`, `DESKTOP_A3_ANDROID_RELEASE_EVIDENCE_RECONCILIATION_V1`.

---

## DESKTOP-A1 REPORT

```
DESKTOP-A1 REPORT
TASK_ID = DESKTOP_A1_ANDROID_V5_SOURCE_FINALIZATION_V1
V5_SOURCE_SHA = UNCOMMITTED + parent 3b335610ced48aa2595fe49eef5b97511c7f4cb5
OWN_POST_DELETE_INCLUDED = YES
OWN_VIDEO_DELETE_INCLUDED = YES
UGC_REPORT_INCLUDED = YES
UGC_BLOCK_INCLUDED = YES
UGC_TERMS_INCLUDED = YES
ACCOUNT_DELETE_INCLUDED = YES
TESTS = 16 files / 116/116 PASS
TYPECHECK = PASS
V5_SOURCE_READY = YES
CENTRAL_SOURCE_ACCEPTANCE_REQUIRED = YES
EAS_V5_BUILT = NO
V4_UPLOADED = NO
COMMIT_PERFORMED = NO
PUSH_PERFORMED = NO
LIVE = OUT_OF_SCOPE / FAIL_CLOSED
```

---

## Verdict

| Field | Result | Basis |
|-------|--------|-------|
| V5_SOURCE_SHA | **UNCOMMITTED** + parent `3b33561` | Dirty UGC already existed. User asked for a handoff SHA; leaving uncommitted is the correct choice. Do not invent a commit. |
| OWN_POST_DELETE_INCLUDED | **YES** | `deletePostForOwner` → owner-filtered `posts` DELETE + RLS. Watch owner-only control. |
| OWN_VIDEO_DELETE_INCLUDED | **YES** | Same function best-effort `deleteOwnedVideoObject` for `video_path` / `thumbnail_path` after the row delete. Android Create is video-from-library only; Watch items are video posts. |
| UGC_REPORT_INCLUDED | **YES** | Watch + Messages → `UgcSafetySheet` → `report_ugc_content` / `report_ugc_user` |
| UGC_BLOCK_INCLUDED | **YES** | Watch + Messages + Settings blocked-users → `block_ugc_user` / `unblock_ugc_user` / list RPCs. Feed + inbox filter blocked authors/peers. |
| UGC_TERMS_INCLUDED | **YES** | Signup `canAcceptTerms` + Create `canPublishWithUgcAck` |
| ACCOUNT_DELETE_INCLUDED | **YES** | Settings “Delete account” → `https://umtuba.com/account-deletion` (allowlisted). No in-app `deleteUser`. |
| TESTS | **116/116 PASS** | Targeted own-delete + UGC + Live + Discover + Create + auth session + Profile + Watch feed map + messenger + env |
| TYPECHECK | **PASS** | `npx tsc --noEmit` exit 0 |
| V5_SOURCE_READY | **YES** | Required v5 surfaces are in the working tree, wired, and unit-tested. Not a device PASS. Not an AAB. |
| CENTRAL_SOURCE_ACCEPTANCE_REQUIRED | **YES** | Central must accept this uncommitted tree before any v5 EAS GO. |
| V4_UPLOAD_ALLOWED | **NO** | Unchanged. Own-delete still absent from AAB `37dde25f`. |
| EAS_V5 | **NOT BUILT** | Forbidden this task. |
| PRODUCT_COMMIT | **NO** | |
| LIVE | **FAIL_CLOSED** | `isLiveLobbySourceConfigured()` still `false`. iOS Live-hide from `45f0dbc` **not** taken. |

**Do not build. Do not upload v4. Do not EAS-build v5 until Central accepts this source.**

---

## 1 — Mobile source identity

`git fetch --prune` on mobile. No pull / merge / rebase / reset / stash / force.

| Item | Value |
|------|--------|
| Branch | `master` |
| HEAD / parent | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` — `feat(ios): add App Store readiness contracts from PC2 preparation` |
| `origin/master` | `db7f927467eb2a5416b612c330bfa8440bcf50f0` |
| Ahead / behind | **0 / 2** |
| Origin-only (not taken) | `45f0dbc` UAF-12 consume + **hide unfinished Live**; `db7f927` iOS docs SHA |
| Fast-forward | **NOT PERFORMED** — overlaps dirty `watch.tsx` / `WatchVideoCard.tsx` and would change Live scope |
| `app.config.ts` | `package=com.umtuba.app` `version=1.0.0` `android.versionCode=4` (dirty vs committed `1`) |
| `eas.json` | production `autoIncrement: true`; `cli.appVersionSource = remote` → next production EAS = versionCode **5** |

---

## 2 — Integration / reconcile (this GO)

Consumed the existing uncommitted own-delete delta from the v4-candidate closeout. Did **not** duplicate backend. Did **not** copy Live-hide / `_layout` / iOS operator docs from `45f0dbc`.

### 2.1 Own-content delete contract

Byte-identical to `45f0dbc` (hashes rematch):

| File | Blob |
|------|------|
| `src/lib/social/deleteOwnedPost.ts` | `e868e52c5324d4760055261a85e9b1807a926f7e` |
| `src/lib/social/deleteOwnedPostShared.ts` | `2d9737cb69a5d7f1af7d915992817ec148753a83` |

`deletePostForOwner`:

1. Reject non-UUID viewer → `auth_required` (anonymous / invalid).
2. Load `posts` (`id, user_id, post_type, video_path, thumbnail_path`).
3. Reject missing → `not_found`; reject `user_id !== viewer` → `not_owner`.
4. `DELETE FROM posts WHERE id = ? AND user_id = ?` (client + existing RLS).
5. Best-effort `deleteOwnedVideoObject` for owned `video_path` and `thumbnail_path`.

That is **one** function for both:

- **Own post delete** = owner-filtered `posts` row delete  
- **Own video delete** = storage cleanup of the owned video (and thumbnail) after the row delete  

No fake client-only deletion. No service-role in mobile (`env.ts` rejects service-role-looking keys). No new SQL. Existing RLS from `20260712_auth_profiles_posts_rls.sql` (“Users can delete their own posts”). UGC `20260928` is report/block, not own-delete.

Watch wiring (into the **existing UGC** dirty files, not a fast-forward):

- `app/(tabs)/watch.tsx` — `Alert` + `onDeleteOwn` → `viewerMaySeeDeleteControl` + `deletePostForOwner` + `applySuccessfulDeleteToList`
- `components/WatchVideoCard.tsx` — owner-only “Delete your video” after Report (`onDeleteOwn` omitted for non-owner / anonymous)

No Profile delete control (none on `origin/master`; Android Create is video-only; smallest correct surface = Watch).

### 2.2 Owner / non-owner / anonymous (code + tests)

| Actor | UI (`viewerMaySeeDeleteControl`) | Client (`deletePostForOwner`) |
|-------|----------------------------------|-------------------------------|
| Owner | **shown** | **allowed** — row delete + video object cleanup |
| Non-owner | **hidden** | **denied** `not_owner` — no DELETE, no storage remove |
| Anonymous / invalid UUID | **hidden** (`null` / `undefined` / `""`) | **denied** `auth_required` — no `from("posts")` call |

This GO added those anonymous + video-cleanup assertions to `deleteOwnedPost.test.ts` (test file now **diverges** from `45f0dbc` blob `c9261971` on purpose). Contract `.ts` files remain byte-identical to `45f0dbc`.

### 2.3 UGC + account deletion (already in WT; reconciled)

| Control | Source path | Backend |
|---------|-------------|---------|
| Report content | Watch `UgcSafetySheet` → `reportUgcContent` → `report_ugc_content` | `20260928` (Central-claimed apply; not re-applied here) |
| Report user | Watch + Messages → `report_ugc_user` | same |
| Block | Watch + Messages + `app/blocked-users.tsx` + Settings link | `block_ugc_user` / `unblock_ugc_user` / `list_ugc_block_ids` / `list_my_blocked_users` |
| Block effects | `watchFeed.ts` filters blocked authors; `messenger/api.ts` filters peers + blocks send | `ugc_reject_blocked_message` trigger (SQL review, not mutated) |
| Terms | Signup checkbox `canAcceptTerms`; Create publish `canPublishWithUgcAck` | client gate |
| Account deletion | Settings → `openSupport("accountDeletion")` → `https://umtuba.com/account-deletion` | live web request page; not `deleteUser` |

Self-block / anonymous-block denied by `canBlockUser`. Report/block RPCs are authenticated JWT only.

### 2.4 Core surfaces (v3 CORE still present; UGC additive)

| Surface | Source this WT |
|---------|----------------|
| Auth / session | `AuthProvider` `getSession` restore; `_layout` loading gate; tabs redirect unsigned-in to login; password-recovery redirect |
| Watch | Feed + playback + Report/Block + owner Delete |
| Discover | Home + search loading/error/empty (`discover.tsx` + `discover.test.ts`) |
| Create | Signed-in **video-from-library only**; UGC ack required before Publish; failed-publish still uses `deleteOwnedVideoObject` for orphan cleanup (not Watch owner-delete) |
| Messages | Inbox + thread + `UgcSafetySheet` report/block; blocked-peer filter |
| Profile | Identity + Settings entry; loading / sign-in-required / error |
| Live | Hard fail-closed. Tab still present. `loadLiveLobby` returns `unavailable`. **Not** iOS-hidden. |

---

## 3 — Live (do not change scope)

`45f0dbc` also hides the iOS Live tab (`Platform.OS === "ios"` early return). **Not taken.**

`src/lib/live/api.ts` `isLiveLobbySourceConfigured()` still **returns `false`**. `git diff HEAD` on `live.tsx` / `_layout.tsx` / `src/lib/live` = empty. Live tests still assert fail-closed unavailable.

**LIVE = OUT_OF_SCOPE / FAIL_CLOSED.**

---

## 4 — Quality checks this session

| Check | Result |
|-------|--------|
| Targeted + UGC + regression vitest | **16 files, 116/116 PASS** — `deleteOwnedPost`, `ugcSafety`, `src/lib/safety/*`, `live`, `discover`, `createJourney`, `sessionRestore`, `profilePresentation`, `watchFeed.map`, messenger `threadState`/`foundation`, `env`, Watch `playerSession`/`playbackPolicy` |
| `npx tsc --noEmit` | **PASS** (exit 0) |
| `git diff --check` (product + new delete/UGC files) | **PASS** |
| EAS / bundle / upload | **NOT RUN** |
| Play Console | **NOT OPENED / NOT MUTATED** |
| Production content / SQL | **NOT MUTATED** |
| Service-role in mobile | **NO** |

---

## 5 — Exact files

### Web (this task)

- `docs/ai/CURRENT_TASK.md` — set to this TASK_ID
- `docs/ops/closeout/DESKTOP_A1_ANDROID_V5_SOURCE_FINALIZATION_V1.md` — this file

`PROJECT_STATE.md` / A2 / A3 closeouts **not** written (concurrent streams).

### Mobile (uncommitted v5 source — do not discard)

**Own-delete (this wave + prior v4-candidate delta):**

- `src/lib/social/deleteOwnedPost.ts` (blob = `45f0dbc`)
- `src/lib/social/deleteOwnedPostShared.ts` (blob = `45f0dbc`)
- `src/lib/social/deleteOwnedPost.test.ts` (45f0dbc contract + this-GO anonymous / video-cleanup assertions)
- `app/(tabs)/watch.tsx` (UGC dirty + own-delete handler)
- `components/WatchVideoCard.tsx` (UGC dirty + owner Delete control)

**UGC / account-deletion (preserved; already in WT):**

- `app/(auth)/signup.tsx`
- `app/_layout.tsx`
- `app/messages/[id].tsx`
- `app/settings.tsx`
- `app/blocked-users.tsx`
- `components/UgcSafetySheet.tsx`
- `src/lib/feed/watchFeed.ts`
- `src/lib/messenger/api.ts`
- `src/lib/video/ugcSafety.ts` + `ugcSafety.test.ts`
- `src/lib/safety/`

**Preserved unchanged:** `app.config.ts` / `eas.json` / `release-artifacts/` (v4 AAB — **not** a v5 artifact), Live files, `_port_extract`.

---

## 6 — Intended v5 rebuild input (not started)

Exact source for a **future** Central-authorized production EAS build:

`HEAD 3b33561` + uncommitted UGC + own-delete + versionCode 4 dirty config.

That build will become versionCode **5**. Desktop must **not** start it.

`V4_UPLOAD_ALLOWED = NO`. AAB `37dde25f` still lacks `deletePostForOwner`.

---

## Blockers (do not collapse)

1. **CENTRAL_SOURCE_ACCEPTANCE_REQUIRED** — this tree is uncommitted; Central must accept before any v5 EAS GO.  
2. **No v5 AAB** — not built (forbidden).  
3. **Do not upload v4** — own-delete absent from `37dde25f`.  
4. **Uncommitted UGC + own-delete + iOS origin/master +2 overlap** — do not FF.  
5. **No device install path** — `ANDROID_V4_DEVICE_VERIFIED` remains **NO**; v5 device QA is after a signed v5 artifact.  
6. **Closed Testing opted-in UNKNOWN; 12/14 unproven** (A2).  
7. **Play listing / IARC / Ads / signing OCR incomplete** (A2).  
8. **AUTH_ENV Central load NO** (prior stream).  

---

## STOP

Do not build. Do not upload v4. Do not EAS-build v5. Leave the working tree uncommitted. Wait for Central source acceptance.
