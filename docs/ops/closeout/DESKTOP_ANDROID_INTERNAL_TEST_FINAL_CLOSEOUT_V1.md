# DESKTOP_ANDROID_INTERNAL_TEST_FINAL_CLOSEOUT_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** EVIDENCE_CLOSEOUT_ONLY  
**DATE:** 2026-08-13  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE:** `3`  
**EAS_BUILD_ID:** `26a60f53-5658-4182-bca4-c0424928b015`  
**GOOGLE_PLAY_TRACK:** INTERNAL_TESTING  
**AAB:** `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-26a60f53.aab`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `fe14a34`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `7ed9159`

This packet formally closes the Android Google Play Internal Testing **CORE** gate using completed physical-device evidence for versionCode 3. It does **not** declare full-feature Internal Testing readiness or Android Production readiness.

No Android rebuild. No versionCode 4. No AAB upload. No Google Play mutation. No EAS environment change. No product-code change. Live not enabled. No Supabase production mutation. No git commit / push.

---

## Verdict

| Gate | Result |
|------|--------|
| AAB_BUILD | **PASS** (prior: EAS `26a60f53`, versionCode 3) |
| GOOGLE_PLAY_UPLOAD | **PASS** (operator-provided) |
| GOOGLE_PLAY_INTERNAL_PUBLICATION | **PASS** (operator-provided; Play displayed `1.0.0 (3)`) |
| PHYSICAL_DEVICE_INSTALL | **PASS** |
| PHYSICAL_DEVICE_STARTUP | **PASS** |
| SUPABASE_RUNTIME_CONFIG | **PASS** |
| CONFIGURATION_NEEDED_BLOCKER | **CLOSED** |
| WATCH | **PASS** |
| DISCOVER | **PASS** |
| MESSAGES | **PASS** |
| CREATE_UI | **PASS** |
| CREATE_REAL_UPLOAD | **PASS** (new this closeout) |
| CREATE_TO_WATCH_END_TO_END | **PASS** (new this closeout) |
| VIDEO_PLAYBACK | **PASS** |
| LIVE_EXPECTED_STATE | **INTENTIONALLY_UNAVAILABLE** |
| LIVE_INTERNAL_CORE_BLOCKING | **NO** |
| SERVICE_ROLE_EXPOSED | **NO** |
| ENV_HYGIENE | **PASS** |
| SIGNING_CREDENTIALS_CHANGED | **NO** |
| PRODUCT_CODE_CHANGED | **NO** |
| NEW_AAB_BUILT | **NO** |
| GOOGLE_PLAY_MUTATED_BY_CLOSEOUT | **NO** |
| ANDROID_INTERNAL_TEST_CORE_READY | **YES** |
| ANDROID_INTERNAL_TEST_CORE_CLOSED | **YES** |
| ANDROID_INTERNAL_TEST_FULL_FEATURE_READY | **NO** |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** |
| INTERNAL_TEST_CORE_OPEN_BLOCKERS | **[]** |
| FULL_FEATURE_OPEN_ITEMS | **[LIVE_INTENTIONALLY_UNAVAILABLE]** |
| VERDICT | **ANDROID_INTERNAL_TEST_CORE_CLOSED_PASS** |
| CENTRAL_HANDOFF_READY | **YES** |

---

## 1 — Repository state (pre-edit)

Inspected before any docs writes. No product files touched.

### umtuba-web

- Branch: `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9`
- Upstream: `origin/office/profile-hero-completeness-v1` — **in sync** after `git fetch --prune` (HEAD = `@{u}`)
- Dirty before this task: `docs/ai/*` from prior Android QA + untracked `docs/ops/closeout/` and `worktrees/`
- No merge / rebase / reset / stash / force

### umtuba-mobile

- Branch: `master` @ `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99` = `origin/master` after `git fetch --prune`
- Uncommitted (prior runtime-config rebuild; **kept**): `eas.json`, `app.config.ts`, untracked `release-artifacts/`
- This closeout did **not** modify the mobile tree

---

## 2 — Authoritative prior evidence (not contradicted)

| Packet | What it already closed |
|--------|------------------------|
| `DESKTOP_ANDROID_RELEASE_ARTIFACT_SEARCH_V1` | No prior AAB/APK on disk at that time |
| `DESKTOP_ANDROID_RELEASE_BUILD_V1` | First release-build attempt BLOCKED (EAS login) |
| `DESKTOP_ANDROID_RELEASE_BUILD_OPERATOR_GATES_V1` | Operator gates not yet cleared (historical) |
| `DESKTOP_ANDROID_PRODUCTION_AAB_BUILD_V1` | First production AAB: EAS `86c0d773`, versionCode **2**, Play upload not performed |
| `DESKTOP_ANDROID_EXPO_APP_CONFIG_COMMONJS_RECOVERY_V1` | Expo config recovery (historical) |
| `DESKTOP_ANDROID_SUPABASE_RUNTIME_CONFIG_FIX_AND_REBUILD_V1` | Root cause of “Configuration needed”; EAS production env + versionCode **3** AAB `26a60f53`; Play upload not performed by that task |
| `DESKTOP_ANDROID_POST_INSTALL_QA_AND_LIVE_CREATE_GATE_V1` | Live INTENTIONALLY_UNAVAILABLE; Create **contract** PASS; CREATE_REAL_UPLOAD was **NOT_TESTED** |

Accepted build identity (do not bump):

| Field | Value |
|-------|--------|
| PACKAGE_ID | `com.umtuba.app` |
| VERSION_NAME | `1.0.0` |
| VERSION_CODE | `3` |
| EAS_BUILD_ID | `26a60f53-5658-4182-bca4-c0424928b015` |
| AAB | `umtuba-mobile\release-artifacts\umtuba-android-production-26a60f53.aab` |
| SHA256 (prior rebuild packet) | `61DAC1C62D9CCF85FBAD824B853F28DF24EFD7C2F4DDA3ADBCC0B470522ED70A` |
| Keystore | existing remote `Build Credentials p6De1DDtE_` — SIGNING_CREDENTIALS_CHANGED = NO |

Runtime-config fix (prior packet; still authoritative):

- Previous failure: “Configuration needed”
- Root cause: production EAS build lacked public Supabase env
- Fix: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` on EAS production
- EXPO_CONFIG_LOAD = PASS; RUNTIME_CONFIGURATION_GATE = PASS; SERVICE_ROLE_EXPOSED = NO; ENV_HYGIENE = PASS

---

## 3 — Google Play evidence (operator-provided; treated as given)

- AAB versionCode 3 uploaded successfully.
- Internal Testing release published successfully.
- Google Play displayed version: **1.0.0 (3)**
- Release available to internal testers.
- Physical Android device received/runs the corrected release.

This closeout did **not** upload, publish, promote, or otherwise mutate Google Play.

GOOGLE_PLAY_TRACK remains **INTERNAL_TESTING**. Prior rebuild packet locked `eas.json` submit track to `internal` and instructed: do not promote to closed/open/production. No later packet records a Production-track promotion.

---

## 4 — Physical-device evidence (operator-provided; treated as given)

| Surface | Result | Notes |
|---------|--------|--------|
| ANDROID_INSTALL | PASS | Corrected Internal Testing release |
| ANDROID_STARTUP | PASS | |
| Configuration needed | **ABSENT** | Blocker CLOSED |
| WATCH | PASS | Watch renders; video loads; playback works; controls render |
| DISCOVER | PASS | Discover renders; Trending/Latest load; Watch content visible |
| MESSAGES | PASS | Messages renders; existing conversation data loads |
| CREATE_UI | PASS | Choose video, caption, publish control before media |
| CREATE_REAL_UPLOAD | **PASS** | New vs prior QA (was NOT_TESTED) |
| CREATE_TO_WATCH_END_TO_END | **PASS** | New vs prior QA |
| VIDEO_PLAYBACK | PASS | Newly uploaded video played on device |

Operator physical Create path (given):

Create → Choose video → select media → upload → publish → Watch → playback

Recorded result:

- media upload completed
- publication completed
- newly uploaded video appeared in Watch
- newly uploaded video successfully played on the physical Android device

This closeout did **not** repeat QA and did **not** upload from Desktop.

Prior QA residual (unchanged, not a core blocker): Android app still has **no** published-post delete UI. Distinctive test captions remain the identification method.

---

## 5 — Live contract re-verification (read-only; not changed)

Re-read `umtuba-mobile` Live sources. They still match the prior contract audit.

| Check | Evidence |
|-------|----------|
| Lobby source | `src/lib/live/api.ts` `isLiveLobbySourceConfigured()` **hard-returns `false`**. Comment: LiveKit URL alone is not a session list or join contract. |
| Lobby load | `loadLiveLobby()` returns `ok: false`, `unavailable: true`, device copy *“Live lobby is not available yet…”* **without calling any RPC/table**. |
| Join contract | `src/lib/live/parse.ts` `isLiveJoinContractConfigured()` **hard-returns `false`**. |
| Join decision | `resolveLiveJoin()` returns `canJoin: false` while that flag is false. |
| Unit contract | `src/lib/live/live.test.ts` asserts lobby unconfigured and join blocked. |

Physical device UI correctly displays “Live unavailable” (operator-provided; matches source).

- LIVE_EXPECTED_STATE = INTENTIONALLY_UNAVAILABLE
- LIVE_RELEASE_BLOCKING_FOR_INTERNAL_TEST_CORE = NO
- Do **not** enable or modify Live.

---

## 6 — Readiness boundary (do not collapse)

| Classification | Result | Meaning |
|----------------|--------|---------|
| ANDROID_INTERNAL_TEST_CORE_READY | **YES** | Install, config, Watch, Discover, Messages, Create UI, Create real upload, Create→Watch playback |
| ANDROID_INTERNAL_TEST_CORE_CLOSED | **YES** | This packet closes that gate |
| ANDROID_INTERNAL_TEST_FULL_FEATURE_READY | **NO** | Live remains intentionally unavailable |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** | Separate production-release gates have **not** independently passed |

This task closes **only**: Android Google Play Internal Testing CORE.

---

## 7 — PRODUCTION_OPEN_ITEMS (derived; not invented)

From PROJECT_STATE, prior Android closeouts, and operator Play evidence. Items not evidenced in those sources are marked silent rather than assumed complete.

| Item | Source | Status |
|------|--------|--------|
| LIVE_INTENTIONALLY_UNAVAILABLE | Live code + `DESKTOP_ANDROID_POST_INSTALL_QA_AND_LIVE_CREATE_GATE_V1` + this re-read | Open for full-feature / production Live; **not** an Internal Testing core blocker |
| GOOGLE_PLAY_PRODUCTION_TRACK_NOT_PROMOTED | Rebuild V1: submit locked to `internal`; “Do not promote to closed/open/production.” Operator evidence is Internal Testing only. No later packet records Production-track promotion. | Open |
| GOOGLE_PLAY_PRODUCTION_REVIEW_AND_ROLLOUT_NOT_DONE | No Android closeout or PROJECT_STATE entry records Play production review or production rollout. | Open |
| ANDROID_PRODUCTION_RELEASE_GATES_NOT_INDEPENDENTLY_PASSED | PROJECT_STATE + prior QA: `ANDROID_PRODUCTION_RELEASE_READY = NO` | Open |
| IOS_STORE_RELEASE | Android packets record only an informational iOS `bundleIdentifier` (`DESKTOP_ANDROID_RELEASE_BUILD_V1`). PROJECT_STATE and `docs/ai/*` are otherwise **silent** on iOS TestFlight / App Store. | Not evidenced — do not invent an iOS gate result |

Web product defaults listed in PROJECT_STATE (`HOME_LOCK_ACTIVE`, AI flags OFF, Commerce confirm DB gate OFF, Profile Hero workflow residual) are **not** Android Play Internal Testing core items and are not reopened here.

---

## 8 — Constraints honored

- No git commit / push / force / reset / stash
- No remote Supabase migrations or production data changes
- No service-role exposed; no secrets printed
- No Windows Desktop artifact writes
- `_port_extract` untouched
- Unrelated WIP preserved (mobile `eas.json` / `app.config.ts` / `release-artifacts/`; web closeout folder; Profile Hero residual)
- versionCode **3** remains the accepted Internal Testing build

---

## 9 — Central handoff

Android Google Play Internal Testing **CORE** is closed on DESKTOP.

**Accepted artifact:** `com.umtuba.app` 1.0.0 (3) / EAS `26a60f53-5658-4182-bca4-c0424928b015` / Internal Testing.

**Next gate:** Determine remaining Android production-release requirements from authoritative project/Google Play evidence. Do not assume Internal Testing closure equals Production readiness. Do not rebuild. Do not bump versionCode. Do not enable Live.

CENTRAL_HANDOFF_READY = YES
