# DESKTOP_ANDROID_V4_FINAL_CANDIDATE_CLOSEOUT_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_V4_FINAL_CANDIDATE_CLOSEOUT  
**CENTRAL_COORDINATOR:** SERVER  
**MODE:** RELEASE_CRITICAL / EVIDENCE_BACKED  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_ANDROID_V4_FINAL_CANDIDATE_CLOSEOUT_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE (existing AAB):** `4`  
**EAS_BUILD_ID:** `37dde25f-5cb8-4245-ab25-4e357217f6f7`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `380a36646d4de8a37c39a56ac3ccd449f6d8b20d`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `3b335610ced48aa2595fe49eef5b97511c7f4cb5` + uncommitted UGC / versionCode 4 / **this-task own-delete delta** / `release-artifacts/`  
**AAB:** `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab`  
**AAB_SHA256:** `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6`

Determine whether the **existing** v4 AAB is the correct final Android candidate. Did **not** upload. Did **not** Apply for production. Did **not** invent opted-in counts. Did **not** EAS-build v5. Prepared the smallest uncommitted own-content-delete source delta from the existing `origin/master` contract. No commit. No push.

Prior packets incorporated (not re-litigated): A1 runtime QA, A2 Closed Testing / Play evidence, A3 static reconciliation, `DESKTOP_FINAL_DEVICE_STATE_COMPLETE_INVENTORY_V1`.

---

## DESKTOP REPORT

```
DESKTOP REPORT
TASK_ID = DESKTOP_ANDROID_V4_FINAL_CANDIDATE_CLOSEOUT_V1
V4_SOURCE_PROVENANCE_VERIFIED = YES
V4_FINAL_CANDIDATE = NO
NEW_AAB_REQUIRED = YES
ANDROID_V4_DEVICE_VERIFIED = NO
V4_UPLOAD_ALLOWED = NO
ANDROID_CODE_READY = YES (WT now includes own-delete; AAB does not)
ANDROID_BACKEND_READY = YES (UGC 20260928 + existing posts owner-delete RLS)
GOOGLE_PLAY_CONFIG_READY = NO
CLOSED_TESTING_GATE = NO
ANDROID_PRODUCTION_RELEASE_READY = NO
AAB_UPLOADED = NO
APPLY_FOR_PRODUCTION = NO
EAS_V5_BUILT = NO
COMMIT_PERFORMED = NO
PUSH_PERFORMED = NO
GOOGLE_PLAY_MUTATED = NO
MIGRATION_APPLIED = NO
LIVE = OUT_OF_SCOPE / FAIL_CLOSED
OPTED_IN_COUNT = UNKNOWN
```

---

## Verdict table

| Field | Result | Basis |
|-------|--------|-------|
| V4_SOURCE_PROVENANCE_VERIFIED | **YES** | EAS `gitCommitHash` = HEAD `3b33561`; SHA256 rematch; AAB `app.config` `package=com.umtuba.app` `versionCode=4`; Hermes bundle contains dirty UGC RPC/UI strings that are **not** on committed HEAD; JAR `META-INF/33B11D9D.{SF,RSA}` + `MANIFEST.MF` |
| V4_FINAL_CANDIDATE | **NO** | AAB lacks functional own-post + own-video delete UI/client (`deletePostForOwner` **NO** in bundle) |
| NEW_AAB_REQUIRED | **YES** | Own-delete now prepared in WT; not in v4 AAB. Central must authorize any v5 EAS build. **Not built this task.** |
| ANDROID_V4_DEVICE_VERIFIED | **NO** | A1 + this session: no device / adb / APK / Java / bundletool / emulator. Do not fabricate PASS. |
| V4_UPLOAD_ALLOWED | **NO** | Device unverified **and** v4 is no longer the final candidate |
| AAB_MATCHES_CURRENT_WT | **NO** (after this task) | Intentional own-delete delta written 2026-08-14 16:00 vs AAB mtime 10:37. Before this delta, A1: match YES |
| WORKING_TREE_DIVERGED_AFTER_AAB | **YES** (this task’s delta only) | Do not FF `origin/master`. Do not discard UGC WIP |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** | New AAB required + device QA + Closed Testing 12/14 unproven + remaining Console cards |
| PRODUCT_COMMIT | **NO** | User did not ask to commit. Delta left uncommitted |
| EAS_V5 | **NOT BUILT** | Forbidden unless Central later authorizes |
| GOOGLE_PLAY_MUTATED | **NO** | |
| SERVICE_ROLE_EXPOSED | **NO** | |

**Do not upload this v4 AAB. Do not Apply for production. Do not automatically EAS-build v5.**

---

## PHASE 1 — Exact v4 source reconciliation

`git fetch --prune` on web + mobile. No pull / merge / rebase / reset / stash / force.

### 1.1 SHAs

| Item | Value |
|------|--------|
| Mobile branch | `master` |
| HEAD | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` — `feat(ios): add App Store readiness contracts from PC2 preparation` |
| `origin/master` | `db7f927467eb2a5416b612c330bfa8440bcf50f0` |
| Ahead / behind | **0 / 2** |
| Origin-only (not in HEAD, not in v4 AAB) | `45f0dbc` UAF-12 consume + hide unfinished Live; `db7f927` docs SHA |
| EAS recorded `gitCommitHash` | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` — **equals HEAD** |
| Web HEAD | `380a36646d4de8a37c39a56ac3ccd449f6d8b20d` |
| `origin/alpha-0.2` | `f8e142d8cf7faab9646f127c1995e351be94fb37` (Desktop did not deploy) |

Do **not** fast-forward mobile. `45f0dbc` overlaps dirty UGC on `watch.tsx` / `WatchVideoCard.tsx` and also hides Live. This task copied **only** the three delete-contract files (byte-identical to `45f0dbc`) and wired Watch UI into the existing UGC tree. Live hide was **not** taken.

### 1.2 v4 AAB identity (re-verified this session)

| Field | Value |
|-------|--------|
| Path | `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab` |
| Exists | **YES** |
| Bytes | `102255810` |
| LastWriteTime | 2026-08-14 10:37:30 +03 |
| SHA256 (recomputed) | `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6` — **matches known + EAS JSON** |
| EAS metadata | `release-artifacts/eas-build-37dde25f.json` |
| versionName / versionCode | `1.0.0` / **4** |
| profile / distribution | production / store |
| `playUpload` | **false** |
| keystore | `Build Credentials p6De1DDtE_ (default)`; `signingChanged: false` |
| JAR signature | `META-INF/MANIFEST.MF` + `META-INF/33B11D9D.SF` + `META-INF/33B11D9D.RSA` |
| Embedded `app.config` | `"package":"com.umtuba.app","versionCode":4` |
| Other AABs on disk (not candidates) | v3 `26a60f53`; v2 `86c0d773` |
| APK on disk | **NONE** |

### 1.3 AAB string / symbol scan (`base/assets/index.android.bundle`, 4642748 bytes)

| Needle | In v4 AAB? |
|--------|------------|
| `report_ugc_content` | **YES** |
| `report_ugc_user` | **YES** |
| `block_ugc_user` | **YES** |
| `unblock_ugc_user` | **YES** |
| `list_ugc_block_ids` | **YES** |
| `list_my_blocked` | **YES** |
| `UgcSafety` | **YES** |
| `blocked-users` | **YES** |
| `account-deletion` | **YES** |
| `umtuba.com/account-deletion` | **YES** |
| `canPublishWithUgcAck` | **YES** |
| `canAcceptTerms` | **YES** |
| `deleteOwnedVideoObject` | **YES** (failed-publish / cancel storage cleanup only) |
| `deletePostForOwner` | **NO** |
| `deleteOwnedPost` | **NO** |
| `OWN_CONTENT_DELETE` | **NO** |
| `viewerMaySeeDeleteControl` | **NO** |
| `Delete this post` | **NO** |
| `Delete this video` | **NO** |
| `tgucwnjwoyeqoxqaxmew.supabase.co` | **YES** (public host) |

EAS records the git SHA only. Bundle contents prove the **uncommitted UGC tree** was uploaded to EAS. Provenance of the **existing** v4 AAB = HEAD `3b33561` + UGC / versionCode 4 WIP **as of 10:37**, **not** `origin/master`, **not** this task’s 16:00 own-delete files.

**V4_SOURCE_PROVENANCE_VERIFIED = YES.**

### 1.4 Missing-delta vs required release functionality

Required for a **final** Android candidate (this GO):

| Function | In v4 AAB? | In HEAD? | In WT after this task? |
|----------|------------|----------|------------------------|
| Report content / user | YES | NO (uncommitted UGC) | YES |
| Block | YES | NO (uncommitted UGC) | YES |
| Terms before publish | YES | NO (uncommitted UGC) | YES |
| Account-deletion Settings link | YES | NO (uncommitted UGC) | YES |
| Own-content delete (post row + owned video object) | **NO** | **NO** | **YES** (prepared; uncommitted) |
| Live | fail-closed | fail-closed | fail-closed (Live hide from `45f0dbc` **not** taken) |

---

## PHASE 2 — Own-content delete decision

**Conclusive (do not infer from Web UAF-12 alone):**

v4 does **not** contain functional UI + client for delete-own-post **or** delete-own-video of a **published** Watch item.

Evidence:

1. Bundle scan: `deletePostForOwner` / `deleteOwnedPost` / `viewerMaySeeDeleteControl` / `OWN_CONTENT_DELETE` / “Delete this post|video” = **NO**.
2. HEAD `git grep` / WT before this task: no `src/lib/social/deleteOwnedPost*`. Only `deleteOwnedVideoObject` for **failed-publish / cancel** cleanup in Create (`create.tsx` / `publishVideoPost.ts`). That is **not** owner delete of a live Watch post.
3. Authoritative Android consume lives on `origin/master` `45f0dbc` only (`src/lib/social/deleteOwnedPost.ts` + Watch UI). A1 already stated this; this session independently confirmed via `git show` + AAB scan.

**V4_FINAL_CANDIDATE = NO.**

### 2.1 Authoritative contract (consumed, not duplicated)

Mobile `45f0dbc` `deletePostForOwner`:

- Load `posts` (`id, user_id, post_type, video_path, thumbnail_path`)
- Reject non-UUID / invalid id / missing / non-owner
- `DELETE FROM posts WHERE id = ? AND user_id = ?` (client + RLS)
- Best-effort `deleteOwnedVideoObject` for `video_path` and `thumbnail_path`

That is **one** function for both:

- **Delete own post** = owner-filtered `posts` row delete  
- **Delete own video** = storage cleanup of the owned video (and thumbnail) after the row delete  

Android Create is **video-from-library only**. Watch items are video posts. No second text/image publish UI exists on Android. No Profile delete control exists on `origin/master`. Smallest correct surface = Watch owner-only “Delete your video”.

Web UAF-12 on `origin/alpha-0.2` `6e494df` (`lib/supabase/deleteOwnedPost.ts`) is the same `posts` owner-delete plus image-bucket + content-registry extras. Those extras were **not** ported (Android has no image-post publish; would be a second backend/client). No new SQL. Existing RLS from `20260712_auth_profiles_posts_rls.sql`:

```
"Users can delete their own posts"
  on public.posts for delete to authenticated
  using ((select auth.uid()) = user_id);
```

**BACKEND_READY** for own-delete = existing posts RLS + existing storage helper. Not `20260928` (that is report/block). Desktop did **not** runtime-probe a real owner delete (would mutate production content).

### 2.2 Smallest WT delta prepared (uncommitted; not built)

Byte-identical checkout from `45f0dbc` (hashes match):

| File | `45f0dbc` blob |
|------|----------------|
| `src/lib/social/deleteOwnedPost.ts` | `e868e52c5324d4760055261a85e9b1807a926f7e` |
| `src/lib/social/deleteOwnedPostShared.ts` | `2d9737cb69a5d7f1af7d915992817ec148753a83` |
| `src/lib/social/deleteOwnedPost.test.ts` | `c92619715ff0b3da46e3af6b4b0edb9244017000` |

Watch wiring into the **existing UGC** dirty files (not a fast-forward):

- `app/(tabs)/watch.tsx` — `Alert` + `onDeleteOwn` → `deletePostForOwner` + list remove  
- `components/WatchVideoCard.tsx` — owner-only Delete control after Report  

**Not** taken from `45f0dbc`: `app/(tabs)/live.tsx`, `app/(tabs)/_layout.tsx`, iOS operator docs. Live stays hard fail-closed.

**NEW_AAB_REQUIRED = YES.** Exact rebuild input = current mobile WT (UGC + versionCode 4 dirty + this delete delta). `eas.json` production `autoIncrement: true` + `cli.appVersionSource = remote` → the next production EAS build will be **versionCode 5**. Do **not** start it until Central authorizes.

---

## PHASE 3 — UGC / release matrix (actual AAB candidate = v4 `37dde25f`)

Do **not** collapse to a single PASS. `DEVICE_VERIFIED` is **NO** for every v4 row.

| Control | IN_SOURCE (WT now) | IN_AAB (v4) | BACKEND_READY | DEVICE_VERIFIED |
|---------|--------------------|-------------|---------------|-----------------|
| Report content | **YES** (`UgcSafetySheet` → `report_ugc_content`) | **YES** | **YES** (`20260928` Central-claimed apply + A1 RPC exists / P0002 fail-closed) | **NO** |
| Report user | **YES** (Watch + Messages → `report_ugc_user`) | **YES** | **YES** (same) | **NO** |
| Block | **YES** (Watch + Messages + Settings blocked-users) | **YES** | **YES** (block RPCs + A1 list RPCs PASS empty) | **NO** |
| Terms before publish | **YES** (signup `canAcceptTerms` + Create `canPublishWithUgcAck`) | **YES** | N/A (client gate) | **NO** |
| Own-content delete (post + video) | **YES** (this-task delta; Watch owner control) | **NO** | **YES** (existing posts owner-delete RLS + storage helper; not runtime-probed) | **NO** |
| Account deletion | **YES** (Settings → `https://umtuba.com/account-deletion`) | **YES** | **YES** (web request page live HTTP 200 this session; queued, not `deleteUser`) | **NO** (in-app tap) |

`UGC_PLAY_DECLARATIONS` for the **current Play binary (v3)** must stay honest **NO** for report/block/terms (A2). v4 is not on Play. After a **future** v5 that includes own-delete is uploaded **and** device-verified, Console UGC answers can become YES. Do not save YES now.

---

## PHASE 4 — Device test path

This machine still has **no** install path (re-checked):

| Path | Result |
|------|--------|
| Sideload APK | **NO APK** in repo / `release-artifacts/` |
| `adb` on PATH | **NO** |
| `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` | **NO** |
| `java` / `bundletool` | **NO** |
| Emulator process | **NO** |
| USB Android / ADB device | **NO** matching PnP |
| Play Internal already-installed | **UNKNOWN / NOT REACHABLE.** If a phone has the app, it is still **v3** (`26a60f53`). v4 was never uploaded. |
| Closed Testing install of v4 | **IMPOSSIBLE** — v4 not on Play; `V4_UPLOAD_ALLOWED = NO` |
| EAS artifact | AAB URL exists in metadata; still an AAB, not an APK; downloading it does not install |
| Preview / development EAS APK | Different distribution / **not** the production keystore path. Do **not** bypass signing to “test the candidate” |

**INSTALL_PATH_USED = NONE.**  
**PHYSICAL_DEVICE_AVAILABLE = NO.**

### Safest next action (smallest; not performed)

Because **NEW_AAB_REQUIRED = YES**, do **not** spend operator time installing unverified v4.

1. Central reviews the uncommitted own-delete delta.  
2. If accepted: Central authorizes **one** production EAS build (will become versionCode **5**). Desktop must **not** auto-start it.  
3. Device QA of **that** signed artifact: operator USB Android + install Java + `bundletool` extract universal APK from the **new** AAB, **or** explicit GO to upload the **new** AAB to Play Internal (not Closed Testing as a substitute for device QA; not Apply for production).  
4. Until then: v3 Internal remains the only Play-installable binary. Useful for v3 regression only. It does **not** verify UGC or own-delete.

`eas build --local` APK is **not** possible on this Desktop (no Java / Android SDK). Preview-profile APK would not be the production-signed candidate.

---

## PHASE 5 — Google Play testers (docs only; no emails)

No Console tab. No local address file. No emails printed. Counts from A2 + prior operator statements only.

| Layer | This session |
|-------|----------------|
| LOCAL_LIST_FILE | **NONE** |
| TESTER_EMAILS_RECEIVED | OPERATOR ≥17 (2026-08-13) / ~25 (A2 GO 2026-08-14). Not unique-counted here |
| UNIQUE_TESTERS | **UNKNOWN** |
| ADDED_TO_TESTER_LIST | OPERATOR floor ≥17 on Closed Testing list “UMTUBA Closed Testers” (not Internal) |
| INVITED (opt-in link actually sent) | **UNKNOWN** |
| OPTED_IN | **UNKNOWN** — do not invent |
| INSTALLED (Closed Testing) | **UNKNOWN**. Internal: prior v3 CORE device PASS. **v4 cannot be installed from Play** |
| DAY_COUNT (12/14 rule) | **UNKNOWN / NOT_PROVEN_STARTED** |
| PRODUCTION_ACCESS_ELIGIBLE | **NO** |

Email-list membership ≠ opted-in. Opted-in ≠ installed. Official rule remains [14151465](https://support.google.com/googleplay/android-developer/answer/14151465) (≥12 opted-in for 14 continuous days). Developer account type still **OPERATOR_CONFIRMATION_REQUIRED**.

---

## PHASE 6 — Play listing / policy gaps (docs only; no Console write)

| Item | Status | Class | This task |
|------|--------|-------|-----------|
| App Access / reviewer login | **COMPLETE** | A2 + provision packet. `google-play-review@umtuba.com` provisioned. Password not printed | Do not reopen |
| Data Safety | **COMPLETE / SAVED** | Operator 2026-08-13 | Do not reopen |
| Target ages 13–15 / 16–17 / 18+ | **AGES_COMPLETE** | A2 | Do not change ages; do not select under-13 |
| Target audience remainder (App details / Ads / Store presence / Summary) | **PARTIAL / UNCONFIRMED** | A2 | No Console write |
| Account deletion URL | Page **LIVE** this session (`https://umtuba.com/account-deletion`). Play URL half **YES_OPERATOR** (A2). Card not re-OCR’d | FETCH + A2 | Do not tell the operator the URL is missing |
| UGC Play declarations | Honest **NO** report/block/terms while Play binary is **v3** | A2 | Do not save YES |
| Ads | Paste-ready **No ads**. Not proven saved | A2 + local `ADS_DECLARATION.txt` | No write |
| IARC / content rating | **INCOMPLETE**. Local packet exists; A2: not saved. Honest moderation = **NO** until a UGC binary is on Play | A2 | No write |
| Store listing graphics | **INCOMPLETE** (icon / feature graphic / ≥2 screenshots). Local feature graphic exists, not uploaded | A2 + inventory | No write |
| App signing enrollment | **OPERATOR_CONFIRMATION_REQUIRED** (OCR) | A3 / inventory | No write |
| Tracks | Internal = v3 CORE. Closed Testing = IN_PREPARATION / not OCR. Production = not created | A2 | Do not upload v4; do not Apply |
| Signing credentials | EAS default keystore unchanged vs v3 (`signingChanged: false`) | EAS JSON | Do not rotate |

`GOOGLE_PLAY_CONFIG_READY = NO.`  
`CLOSED_TESTING_GATE = NO.`  
Prefer **no** Console writes until a **new** AAB is the intended review binary. Remaining A2 paste-ready cards stay valid for Ads / TA remainder / listing **text** / honest UGC **NO** — not executed here.

---

## BUILD DECISION

| Decision | Value |
|----------|--------|
| Does v4 contain all release-required mobile functionality? | **NO** — own-content delete missing |
| NEW_AAB_REQUIRED | **YES** |
| Exact delta | Three `45f0dbc` contract files + Watch UI wiring listed in §2.2. No backend duplicate. No Live hide. |
| EAS v5 this task | **NOT STARTED** |
| Upload v4 | **FORBIDDEN** |
| Apply for production | **FORBIDDEN** |
| If Central later says ship without own-delete | That would be a product-scope change. This GO treats own-delete as release-required. v4 still could not upload until device QA anyway |

---

## Quality checks this session

| Check | Result |
|-------|--------|
| AAB SHA256 | Rematch |
| AAB bundle string scan | Independent extract + scan |
| Mobile own-delete + UGC/safety vitest | **5 files, 17/17 PASS** (`deleteOwnedPost` + `ugcSafety` + `src/lib/safety`) |
| `npx tsc --noEmit` (mobile) | **PASS** (exit 0) |
| `git diff --check` (mobile product + web AI docs) | **PASS** (no whitespace errors) |
| EAS rebuild | **NOT RUN** |
| Play Console | **NOT OPENED / NOT MUTATED** |
| Production content / SQL | **NOT MUTATED** |

---

## Exact files changed

### Web (docs)

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ops/closeout/DESKTOP_ANDROID_V4_FINAL_CANDIDATE_CLOSEOUT_V1.md` — this file

### Mobile (uncommitted source delta — do not discard)

- `src/lib/social/deleteOwnedPost.ts` (**new**, blob = `45f0dbc`)
- `src/lib/social/deleteOwnedPostShared.ts` (**new**, blob = `45f0dbc`)
- `src/lib/social/deleteOwnedPost.test.ts` (**new**, blob = `45f0dbc`)
- `app/(tabs)/watch.tsx` (UGC dirty + own-delete handler)
- `components/WatchVideoCard.tsx` (UGC dirty + owner Delete control)

Preserved unchanged by this task: other UGC WIP, `app.config.ts` / `eas.json` / `release-artifacts/` (v4 AAB), `_port_extract`.

---

## Blockers (do not collapse)

1. **v4 is not the final candidate** — own-delete absent from AAB.  
2. **NEW_AAB_REQUIRED** — wait for Central to authorize v5. Do not auto-build.  
3. **No device install path** on Desktop — `ANDROID_V4_DEVICE_VERIFIED = NO`.  
4. **`V4_UPLOAD_ALLOWED = NO`** — even if someone wanted v4, device + final-candidate both fail.  
5. **Closed Testing opted-in UNKNOWN; 12/14 unproven** (A2).  
6. **Play listing / IARC / Ads / signing OCR incomplete.**  
7. **Uncommitted UGC + this delete delta + iOS origin/master +2 overlap** — do not FF.  
8. **AUTH_ENV Central load NO** (prior stream; not this binary).  
9. **`20260928` not on `origin/alpha-0.2` git tip** (targeted-apply drift).

---

## STOP

Do not upload v4. Do not Apply for production. Do not EAS-build v5 unless a new Central GO says so. Leave the own-delete delta uncommitted. Preserve Android WIP.
