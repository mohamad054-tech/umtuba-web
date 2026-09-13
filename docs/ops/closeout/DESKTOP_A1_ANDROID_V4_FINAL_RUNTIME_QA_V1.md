# DESKTOP_A1_ANDROID_V4_FINAL_RUNTIME_QA_V1

**DEVICE:** DESKTOP-A1  
**DEVICE_ROLE:** ANDROID_V4_TECHNICAL_DEVICE_VERIFICATION  
**MODE:** FINAL_PARALLEL_EXECUTION  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_A1_ANDROID_V4_FINAL_RUNTIME_QA_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE (working tree + AAB):** `4`  
**EAS_BUILD_ID:** `37dde25f-5cb8-4245-ab25-4e357217f6f7`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `3b335610ced48aa2595fe49eef5b97511c7f4cb5` + uncommitted UGC / versionCode 4  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `380a36646d4de8a37c39a56ac3ccd449f6d8b20d`  
**AAB:** `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab`  
**AAB_SHA256:** `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6`

This packet owns Android v4 **technical / device verification only**. It does **not** rebuild, upload to Play, mutate Console, apply migrations, enable Live, commit product code, or push. Docs-only closeout. A2/A3 closeouts and Play tester lists were not edited. `docs/ai/CURRENT_TASK.md` / `PROJECT_STATE.md` / `SESSION_HANDOFF.md` were not written (A3 owns those).

---

## Verdict

| Field | Result |
|------|--------|
| V4_DEVICE_RUNTIME_VERIFIED | **NO** |
| UGC_RUNTIME_VERIFIED | **PARTIAL** — production backend PASS; device UI **NOT_TESTED** |
| OWN_CONTENT_DELETE_MOBILE | **NO** (absent from v4 AAB / HEAD; present only on `origin/master` iOS commits) |
| ACCOUNT_DELETE_MOBILE | **SOURCE_PRESENT_DEVICE_UNTESTED** |
| REGRESSION | **UNVERIFIED_ON_DEVICE** (source: v3 core surfaces still present; Live still fail-closed) |
| AAB_REBUILD_REQUIRED | **NO** |
| ANDROID_V4_TECHNICAL_READY | **NO** |
| INSTALL_PATH_USED | **NONE** |
| GOOGLE_PLAY_MUTATED | **NO** |
| AAB_UPLOADED | **NO** |
| LIVE_ENABLED | **NO** (still hard fail-closed) |
| PRODUCTION_CONTENT_MUTATED | **NO** |
| SERVICE_ROLE_EXPOSED | **NO** |
| PRODUCT_COMMIT | **NO** |
| PUSH | **NO** |
| VERDICT | **AAB_VALID / BACKEND_20260928_PASS / DEVICE_BLOCKED / NOT_TECHNICAL_READY** |

**Do not fabricate a device PASS.**  
**Do not rebuild.** No newly proven source defect requires a v4 source change.  
**Do not upload this AAB.** Device runtime is unverified.

---

## 1 — Mobile source of truth

`git fetch --prune` on `umtuba-mobile` (safe). No pull / merge / rebase / reset / stash.

| Item | Value |
|------|--------|
| Branch | `master` |
| HEAD SHA | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` |
| Short | `3b33561` |
| Upstream | `origin/master` = `db7f927467eb2a5416b612c330bfa8440bcf50f0` |
| Ahead / behind | **0 / 2** |
| `app.config.ts` `android.package` | `com.umtuba.app` |
| `app.config.ts` `version` | `1.0.0` |
| `app.config.ts` `android.versionCode` | **4** (committed tip is still `1`; dirty working-tree edit) |
| `eas.json` production | `autoIncrement: true`, `environment: production`, submit track `internal` (dirty) |

Origin-only commits **not** in HEAD / not in the v4 AAB:

1. `45f0dbc` — `feat(ios): consume UAF-12 delete and hide unfinished Live for PC2_IOS_APP_STORE_OPERATOR_MODE_V1`
2. `db7f927` — `docs(ios): record PC2_IOS_APP_STORE_OPERATOR_MODE_V1 commit SHA`

Those touch `watch.tsx` and `WatchVideoCard.tsx` (same files as uncommitted Android UGC). Fast-forward was **not** performed. Android WIP preserved.

### Dirty / untracked (preserved; not discarded)

Modified:

- `app.config.ts`
- `eas.json`
- `app/(auth)/signup.tsx`
- `app/(tabs)/watch.tsx`
- `app/_layout.tsx`
- `app/messages/[id].tsx`
- `app/settings.tsx`
- `components/WatchVideoCard.tsx`
- `src/lib/feed/watchFeed.ts`
- `src/lib/messenger/api.ts`
- `src/lib/video/ugcSafety.ts`
- `src/lib/video/ugcSafety.test.ts`

Untracked:

- `app/blocked-users.tsx`
- `components/UgcSafetySheet.tsx`
- `src/lib/safety/`
- `release-artifacts/`

---

## 2 — v4 AAB provenance vs working tree

| Field | Value |
|------|--------|
| Path | `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab` |
| Exists | **YES** |
| Bytes | `102255810` |
| LastWriteTime | 2026-08-14 10:37:30 +03 |
| SHA256 (recomputed) | `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6` — **matches known** |
| EAS metadata | `release-artifacts/eas-build-37dde25f.json` |
| EAS `gitCommitHash` | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` |
| EAS versionCode | `4` |
| EAS profile | production / store |
| Play upload (then or now) | **NO** |

Relationship:

- AAB was built from **HEAD `3b33561` plus the uncommitted UGC / versionCode 4 working tree** (that is the v4 client). EAS records the git SHA only; the UGC files were never committed.
- All dirty/untracked **product** files have LastWriteTime **before** the AAB file (≈10–11 hours earlier). Working tree did **not** diverge after the AAB was written.
- Working tree **has** diverged from `origin/master` (behind 2 iOS commits). Those commits are **not** in the AAB.
- Other local AABs (not this candidate): `26a60f53` (v3), `86c0d773` (v2).

**WORKING_TREE_DIVERGED_AFTER_AAB = NO**  
**AAB_MATCHES_CURRENT_V4_WIP = YES**  
**AAB_CONTAINS_ORIGIN_MASTER_DELETE_OWN = NO**

---

## 3 — Install / device path

Safest existing paths checked. **None usable.**

| Path | Result |
|------|--------|
| Sideload APK | **NO APK on disk** (repo + `release-artifacts/`; production profile emits AAB only) |
| bundletool APK extract from AAB | **NO** — `bundletool` not installed; `java` not on PATH |
| `adb` | **NO** — not on PATH; not at `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` |
| Emulator process | **NO** |
| USB Android / ADB device | **NO** (no matching PnP device) |
| Internal Testing already-installed | **UNKNOWN / NOT REACHABLE** — no device attached. Play Internal, if present on a phone, is still **v3** (`26a60f53`, versionCode 3). This task did **not** upload v4. |
| New Play upload | **FORBIDDEN** — not done |

**INSTALL_PATH_USED = NONE**  
**PHYSICAL_DEVICE_AVAILABLE = NO**  
**V4_DEVICE_RUNTIME_VERIFIED = NO** — not fabricated.

Exact blocker: no physical Android device, no emulator, no APK, no adb, no Java/bundletool. Cannot install or exercise the v4 AAB on this machine.

---

## 4 — Device test matrix (intended; not executed)

All rows **NOT_TESTED** on device this session.

| Surface | Source contract on v4 WIP | Device |
|---------|---------------------------|--------|
| Launch | App entry + auth restore loading gate | NOT_TESTED |
| Signup / login / session | Login + signup; signup requires Terms checkbox (`canAcceptTerms`) | NOT_TESTED |
| Watch | Feed + playback + Report sheet | NOT_TESTED |
| Discover | Home + search loading/error/empty | NOT_TESTED |
| Create chooser | **Video-from-library only** (no standalone text or image publish) | NOT_TESTED |
| Text / image / video | Caption-on-video supported; text-only / image-only **not implemented** | N/A / NOT_TESTED |
| Upload / playback | Same v3 Create → Watch contract + UGC ack before Publish | NOT_TESTED |
| Messages | Inbox + thread + report/block sheet | NOT_TESTED |
| Profile | Identity + settings entry; loading / sign-in-required / error | NOT_TESTED |
| Own-content delete | **Not in v4 tree** | NOT_TESTED / ABSENT |
| Report content | Watch → `UgcSafetySheet` → `report_ugc_content` | NOT_TESTED |
| Report user | Watch + Messages → `report_ugc_user` | NOT_TESTED |
| Block user | Watch + Messages + Settings → Blocked users | NOT_TESTED |
| UGC terms | Signup checkbox + Create publish ack (`canPublishWithUgcAck`) | NOT_TESTED |
| Account-deletion entry | Settings → Delete account → `https://umtuba.com/account-deletion` | NOT_TESTED |
| Live | Hard fail-closed (`isLiveLobbySourceConfigured()` returns `false`) | NOT_TESTED (must stay unavailable) |

---

## 5 — Loading / error / empty (source review only)

Present in v4 WIP; **not** device-verified:

| Screen | Loading | Error | Empty |
|--------|---------|-------|-------|
| Watch | spinner | retry / banner | “No videos yet. Check back soon.” + Refresh |
| Discover | spinner | retry | “No results” |
| Create | picking / upload progress | pick + publish error boxes + retry/dismiss | “No video selected yet.” + sign-in gate |
| Messages inbox | phase loading | error / unavailable panels | empty inbox panel |
| Message thread | spinner | retry | “No messages yet” |
| Profile | “Loading profile…” | retry | “Sign in required” / “Profile details unavailable” |
| Blocked users | spinner | retry | “No blocked accounts.” |
| Live | loading | error | empty; **unavailable** is the governed state |
| Auth | busy + field errors | alert text | n/a |

---

## 6 — Regression vs v3 CORE PASS

v3 Internal Testing (`26a60f53`, versionCode 3) was device-tested **CORE PASS** (Watch / Discover / Messages / Create UI / real upload / Create→Watch / Live intentionally unavailable).

This session **could not re-run that matrix** on a device.

Source-level (v4 WIP vs that contract):

- Watch / Discover / Create / Messages screens still present.
- Create remains signed-in video publish to Watch.
- Live still hard-returns unavailable; `EXPO_PUBLIC_LIVEKIT_URL` may be set in local `.env` and is **not** consumed as a lobby/join contract.
- UGC report/block/terms are **additive** on the dirty tree.
- Own-content delete from `origin/master` was **not** merged (would collide with dirty UGC on the same files).

**REGRESSION = UNVERIFIED_ON_DEVICE.** No source evidence that v3 core was removed. Not a device PASS.

---

## 7 — UGC backend vs applied `20260928`

Central stated `20260928` is now applied. Desktop did **not** re-apply and did **not** `db push`.

Web file of record: `supabase/migrations/20260928_ugc_safety_reports_blocks_v1.sql` at `380a366` (`fix(migrations): renumber UGC safety migration off 20260922`). Clean in the web worktree.

### Client ↔ SQL contract

| Client | RPC / rule | SQL |
|--------|------------|-----|
| `reportUgcContent` | `report_ugc_content(p_post_id, p_reason_code, p_reason_detail)` | matches |
| `reportUgcUser` | `report_ugc_user(p_user_id, p_reason_code, p_reason_detail)` | matches |
| `blockUgcUser` | `block_ugc_user(p_user_id)` | matches |
| `unblockUgcUser` | `unblock_ugc_user(p_user_id)` | matches |
| `listUgcBlockIds` | `list_ugc_block_ids()` | matches |
| `listMyBlockedUsers` | `list_my_blocked_users()` | matches |
| Reason codes | spam / harassment / hate / sexual / violence / illegal / impersonation / other | matches CHECK |
| Auth | user JWT only; no service-role in mobile client | matches GRANT authenticated |

RLS (SQL review, not re-applied): `user_blocks` FORCE RLS — select own blocker/blocked, insert/delete as blocker only. `ugc_reports` FORCE RLS — select own or `is_platform_admin(auth.uid())`, insert as reporter. RPCs SECURITY DEFINER + `auth.uid()`. Message insert trigger `ugc_reject_blocked_message`.

### Production probe (read-only; Store QA)

Used gitignored `umtuba-web/.env.store-qa.local` + mobile `EXPO_PUBLIC_SUPABASE_*`. **Passwords / keys / tokens not printed.** Email identity confirmed `store-qa@umtuba.com`. Host `tgucwnjwoyeqoxqaxmew.supabase.co`. Transient local probe script deleted after use.

| Check | Result |
|------|--------|
| Sign-in | **PASS** (session present; signed out after) |
| `list_ugc_block_ids` | **PASS** — array, length 0 |
| `list_my_blocked_users` | **PASS** — array, length 0 |
| `report_ugc_content` (post_id `-1`) | Function **exists**; **P0002** `Content not found` — no row inserted |
| `report_ugc_user` (nil UUID) | Function **exists**; **P0002** validation — no row inserted |
| Block / report of a real user or post | **NOT RUN** (would mutate) |
| OpenAPI dump | HTTP 401 — unused; RPC probes sufficient |

**UGC_BACKEND_PRODUCTION = PASS**  
**UGC_DEVICE_UI = NOT_TESTED**  
**UGC_RUNTIME_VERIFIED = PARTIAL**

Unit tests (mobile, this session): `vitest` safety + `ugcSafety` + Live + supportLinks — **5 files, 22/22 PASS**.

---

## 8 — Own-content delete

v4 AAB / HEAD **does not** ship Play-style delete of a published post.

- `src/lib/social/deleteOwnedPost.ts` exists on **`origin/master`** (`45f0dbc`) only.
- HEAD: **missing**.
- v4 Create only calls `deleteOwnedVideoObject` for **failed-publish / cancel storage cleanup**, not owner delete of a live Watch post.
- Profile has no delete-own-content control.

Integrating `origin/master` delete-own would collide with dirty UGC on `watch.tsx` / `WatchVideoCard.tsx` and would need a **new** AAB. That is a known residual, **not** a newly proven defect in the current v4 tree. This task did **not** rebuild.

**OWN_CONTENT_DELETE_MOBILE = NO**

---

## 9 — Account deletion (mobile entry)

| Check | Result |
|------|--------|
| Settings row | “Delete account” → `openSupport("accountDeletion")` |
| URL | `https://umtuba.com/account-deletion` (allowlisted in `supportLinks.ts`) |
| Public URL this session | **HTTP 200** |
| In-app Auth admin / `deleteUser` | **NO** (web request flow only) |
| Device tap-through | **NOT_TESTED** |

**ACCOUNT_DELETE_MOBILE = SOURCE_PRESENT_DEVICE_UNTESTED**

---

## 10 — Live

`src/lib/live/api.ts` `isLiveLobbySourceConfigured()` still **returns `false`**. Lobby does not call RPCs. Join contract remains unconfigured. Live was **not** enabled.

---

## 11 — Quality checks this session

| Check | Result |
|------|--------|
| Mobile UGC / Live / supportLinks vitest | **22/22 PASS** |
| `npx tsc --noEmit` | **NOT RUN** (no product edit) |
| `npm run build` | **NOT RUN** |
| `git diff --check` | **NOT REQUIRED** (docs-only) |
| EAS rebuild | **NOT RUN** |
| Play Console | **NOT OPENED / NOT MUTATED** |

---

## 12 — Files changed (this task)

- `docs/ops/closeout/DESKTOP_A1_ANDROID_V4_FINAL_RUNTIME_QA_V1.md` — **this file only**

Mobile WIP, AAB, web product, A2/A3 closeouts, Play lists, and `docs/ai/{CURRENT_TASK,PROJECT_STATE,SESSION_HANDOFF}.md` were **not** edited.

---

## Blockers

1. **No install path** — no APK, no adb, no Java/bundletool, no emulator, no attached Android device. Cannot sideload or exercise v4.
2. **v4 not on Play** — Internal Testing, if a phone already has the app, is v3. This task must not upload.
3. **Device UGC / core matrix untested** — cannot claim v4 runtime PASS or v3 non-regression on device.
4. **Own-content delete absent from v4 AAB** — lives on unmerged `origin/master` iOS commits; merging would be a future AAB, not this rebuild.

---

## Resume / next (not started)

A physical Android device (or an already-installed Internal build **plus** a v4 install path that is not a new Play upload) is required before `V4_DEVICE_RUNTIME_VERIFIED` or `ANDROID_V4_TECHNICAL_READY` can flip. Do not rebuild unless a device-proven defect requires a source change. Do not start A2/A3 from this packet.
