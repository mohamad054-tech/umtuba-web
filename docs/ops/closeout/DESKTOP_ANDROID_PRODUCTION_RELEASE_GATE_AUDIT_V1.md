# DESKTOP_ANDROID_PRODUCTION_RELEASE_GATE_AUDIT_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** AUDIT_ONLY / NO_RELEASE_MUTATION  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_ANDROID_PRODUCTION_RELEASE_GATE_AUDIT_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE:** `3`  
**EAS_BUILD_ID:** `26a60f53-5658-4182-bca4-c0424928b015`  
**GOOGLE_PLAY_TRACK (last evidenced):** INTERNAL_TESTING  
**AAB:** `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-26a60f53.aab`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9`

This packet is an **audit only**. It determines what remains before UMTUBA Android can be promoted to Google Play Production. It does **not** rebuild, bump versionCode, upload, promote, start a rollout, submit for review, edit Play declarations, mutate Supabase, enable Live, or change product code.

Physical-device Internal Testing CORE evidence is treated as given (not re-run). iOS is not an Android production gate. Live INTENTIONALLY_UNAVAILABLE is not automatically production-blocking.

---

## Verdict

| Field | Result |
|------|--------|
| ANDROID_INTERNAL_TEST_CORE_CLOSED | **YES** |
| VERSION_CODE_3_PRODUCTION_CANDIDATE | **YES** |
| NEW_AAB_REQUIRED_BEFORE_PRODUCTION | **NO** |
| LIVE_ANDROID_PRODUCTION_SCOPE | **OUT_OF_SCOPE** |
| LIVE_ANDROID_PRODUCTION_BLOCKING | **NO** |
| GOOGLE_PLAY_PRODUCTION_ACCESS | **OPERATOR_CONFIRMATION_REQUIRED** |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** |
| PRODUCT_CODE_CHANGED | **NO** |
| GOOGLE_PLAY_MUTATED | **NO** |
| NEW_BUILD_CREATED | **NO** |
| CENTRAL_HANDOFF_READY | **YES** |

**Why READY = NO:** versionCode 3 is technically eligible and Internal Testing CORE is closed, but this machine has **no captured Google Play Console production-setup evidence** (store listing, Data safety, content rating, UGC questionnaire, account deletion, Production-track availability, closed-testing/production-access eligibility). Those pages were not logged into or mutated. A YES would invent Console completeness.

**Why PRODUCTION_BLOCKERS is not a long invented list:** no local packet proves Play will reject this binary. Missing Console captures are **OPERATOR_CONFIRMATION_REQUIRED**, not guessed policy failures. Product gaps (no Android in-app report/block/account deletion) are recorded for the operator to check against Console App content pages.

---

## 0 — Repository state (pre-edit; inspected before docs writes)

`git fetch --prune` on both repos. Fast-forward not required (already even with upstream). No merge / rebase / reset / stash / force.

### umtuba-web

- Branch: `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9`
- Upstream: `origin/office/profile-hero-completeness-v1` — **0 ahead / 0 behind**
- Dirty before this task: `docs/ai/*` from prior Android closeouts + untracked `docs/ops/closeout/` and `worktrees/`
- This task: docs only

### umtuba-mobile

- Branch: `master` @ `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99` = `origin/master` (**0 ahead / 0 behind**)
- Uncommitted (prior runtime-config rebuild; **kept, not modified this task**):
  - `app.config.ts` — local `android.versionCode` 1 → **3** (hint only; EAS remote source is authoritative)
  - `eas.json` — `build.production.environment = "production"`; `submit.production.android.track = "internal"`
  - untracked `release-artifacts/` (AAB + metadata)
- PRODUCT_CODE_CHANGED = NO

---

## 1 — Authoritative prior closeouts (not contradicted)

| Packet | What it already closed |
|--------|------------------------|
| `DESKTOP_ANDROID_RELEASE_ARTIFACT_SEARCH_V1` | Historical: no prior AAB on disk at that time |
| `DESKTOP_ANDROID_RELEASE_BUILD_V1` | First build attempt BLOCKED (EAS login) — superseded |
| `DESKTOP_ANDROID_RELEASE_BUILD_OPERATOR_GATES_V1` | Operator gates then uncleared — superseded by later AAB |
| `DESKTOP_ANDROID_EXPO_APP_CONFIG_COMMONJS_RECOVERY_V1` | `npm ci` recovered Expo config load |
| `DESKTOP_ANDROID_PRODUCTION_AAB_BUILD_V1` | First STORE AAB: EAS `86c0d773`, versionCode **2**, existing keystore, Play upload not performed |
| `DESKTOP_ANDROID_SUPABASE_RUNTIME_CONFIG_FIX_AND_REBUILD_V1` | Root cause of “Configuration needed”; EAS production env; versionCode **3** AAB `26a60f53`; submit locked to `internal` |
| `DESKTOP_ANDROID_POST_INSTALL_QA_AND_LIVE_CREATE_GATE_V1` | Live INTENTIONALLY_UNAVAILABLE (fail-closed); Create contract PASS; CREATE_REAL_UPLOAD was NOT_TESTED then |
| `DESKTOP_ANDROID_INTERNAL_TEST_FINAL_CLOSEOUT_V1` | Internal Testing **CORE CLOSED** on v3; CREATE_REAL_UPLOAD + CREATE_TO_WATCH_END_TO_END PASS; `ANDROID_PRODUCTION_RELEASE_READY = NO` |

Accepted build identity (do not bump; do not rebuild):

| Field | Value |
|-------|--------|
| PACKAGE_ID | `com.umtuba.app` |
| VERSION_NAME | `1.0.0` |
| VERSION_CODE | `3` |
| EAS_BUILD_ID | `26a60f53-5658-4182-bca4-c0424928b015` |
| Profile / distribution | production / STORE |
| SHA256 | `61DAC1C62D9CCF85FBAD824B853F28DF24EFD7C2F4DDA3ADBCC0B470522ED70A` |
| Keystore | existing remote `Build Credentials p6De1DDtE_` — SIGNING_CREDENTIALS_CHANGED = NO |
| Submit profile | `eas.json` `submit.production.android.track = "internal"` (do not treat as a new-AAB reason; Play Console can promote the same artifact if eligible) |

Given physical-device evidence (not re-run):

ANDROID_INSTALL, ANDROID_STARTUP, SUPABASE_RUNTIME_CONFIG, WATCH, DISCOVER, MESSAGES, CREATE_UI, CREATE_REAL_UPLOAD, CREATE_TO_WATCH_END_TO_END, VIDEO_PLAYBACK = **PASS**.  
LIVE_EXPECTED_STATE = INTENTIONALLY_UNAVAILABLE. LIVE_INTERNAL_CORE_BLOCKING = NO.

**Play Console packets / store-listing docs / Data safety dumps:** **none found** under `docs/ops/closeout/DESKTOP_ANDROID_*`, `docs/store`, or mobile docs. Do not invent Console completeness.

---

## Phase 1 — Project-side production release audit

### 1.1 versionCode 3 technically eligible?

**YES.** Same package id, same existing EAS Android upload keystore, production STORE AAB, public Supabase baked via EAS production environment, Internal Testing CORE closed on this exact binary. No later packet records a higher Play versionCode. No Android-production-specific TODO/FIXME found in `umtuba-mobile`. Feature backlog is not a technical rebuild trigger unless current release scope requires those features (see Phase 4–5).

### 1.2 Separate build required?

**NO** for signing, package continuity, runtime config, or versionCode. The Internal Testing artifact **is** the production-profile AAB. Promoting Internal → Production (if Console allows) does not require versionCode 4.

A new AAB would become required **only after** operator/Play review demands product changes that are not in this binary (for example in-app report/block/account deletion). That is **not** evidenced as a rebuild requirement today. Do not create versionCode 4.

### 1.3 Package / signing continuity

- `app.config.ts` `android.package` = `com.umtuba.app` (uncommitted versionCode hint 3).
- EAS metadata `release-artifacts/eas-build-26a60f53.json`: package `com.umtuba.app`, `appBuildVersion` 3, existing keystore used.
- AAB string scan: `com.umtuba.app`, `MainActivity` / `MainApplication`.
- SIGNING_CREDENTIALS_CHANGED = NO across rebuild + Internal Testing closeouts.

Play App Signing enrollment (Google-held app-signing key vs upload key) is **not** captured locally → Phase 2 OCR.

### 1.4 Target / compile / min SDK

Managed workflow: no checked-in `android/` tree. No `expo-build-properties` override in `app.config.ts`.

Local toolchain defaults used by Expo SDK 57 / React Native 0.86 (installed `node_modules`):

| Item | Value | Source |
|------|--------|--------|
| minSdk | 24 | `node_modules/react-native/gradle/libs.versions.toml`; `expo-modules-core` `useDefaultAndroidSdkVersions` fallback |
| targetSdk | 36 | same |
| compileSdk | 36 | same |

AAB `base/manifest/AndroidManifest.xml` contains `uses-sdk`, `minSdkVersion`, `targetSdkVersion`, `compileSdkVersion` attribute names (binary XML; numeric values not ASCII). No evidence this production AAB overrode Expo defaults.

### 1.5 App versioning

- versionName `1.0.0` (`app.config.ts`, `package.json`, EAS `appVersion`)
- versionCode **3** (EAS remote `appVersionSource` + `autoIncrement`; local config hint 3)
- `eas.json` production still has `autoIncrement: true` — a **future** EAS build would mint versionCode 4. Do not run that build for this gate.

### 1.6 Production environment / API / Supabase

- EAS production environment attached; loaded names: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (rebuild packet + EAS metadata).
- Same public host as web (rebuild packet; secrets not reprinted).
- `getEnv()` rejects service-role strings. SERVICE_ROLE_EXPOSED = NO. ENV_HYGIENE = PASS.
- Physical CONFIGURATION_NEEDED blocker CLOSED.

### 1.7 Crash / error handling

- `app/_layout.tsx` exports `ErrorBoundary` from `expo-router`.
- Auth config errors fail-closed to “Configuration needed” (fixed for v3).
- No Sentry / Crashlytics / Bugsnag dependency in `package.json`. Not treated as a release blocker (not required by project Android production scope). Backlog only.

### 1.8 Permissions (config + AAB)

Declared in `app.config.ts` `android.permissions`: CAMERA, RECORD_AUDIO, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE, POST_NOTIFICATIONS.

Plugins: `expo-camera` (recordAudioAndroid), `expo-image-picker`, `expo-media-library` (`isAccessMediaLocationEnabled: true`), `expo-notifications`.

Read-only AAB manifest string scan also includes (merged from native deps, not all listed in `app.config.ts`):

- ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION (MapLibre / World)
- ACCESS_MEDIA_LOCATION, READ_MEDIA_VISUAL_USER_SELECTED, READ_MEDIA_AUDIO
- SYSTEM_ALERT_WINDOW, VIBRATE, INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, RECEIVE_BOOT_COMPLETED
- USE_BIOMETRIC / USE_FINGERPRINT
- Firebase messaging init (expo-notifications FCM path)

World `view_precise_location` defaults **granted: false** in `src/lib/world/actions.ts`. Location still appears in the merged manifest → Play Data safety / permissions declarations must be confirmed on Console (OCR), not assumed.

### 1.9 Known Android-production TODO/FIXME

Grep of `umtuba-mobile` for TODO/FIXME tied to Android production: **none**. README “Phase 2” (Live, richer settings, etc.) is backlog, not an Android-production-scope requirement in this audit.

---

## Phase 2 — Google Play Console production requirements audit

**Method:** local project docs + already-captured operator Play evidence only. This task did **not** log into Google Play and did **not** mutate Console.

**Captured Play evidence (Internal Testing only):**

- AAB versionCode 3 uploaded successfully (operator-provided; Internal Testing closeout).
- Internal Testing release published; Play displayed **1.0.0 (3)**; testers could install.
- Rebuild V1: do not promote to closed/open/production. No later packet records Production promotion, review submit, or rollout.

**Not captured anywhere in-repo:** Main store listing fields, screenshots/feature graphic, category, Console contact details, Data safety form, App access, Ads declaration, content rating / IARC, target audience, News/COVID/Government/Financial/Health forms, permission declarations, Families, UGC questionnaire answers, account-deletion Console URL, Play App Signing status, Production-track availability, Publishing overview completeness.

Classification rule used: if Console state cannot be determined locally → **OPERATOR_CONFIRMATION_REQUIRED** with the exact page. Do not assume Google policy from memory (including tester counts / closed-testing duration).

| Console item | Status | Exact page to inspect |
|--------------|--------|------------------------|
| Main store listing (name, short/full description, icon, feature graphic, phone/tablet screenshots) | OPERATOR_CONFIRMATION_REQUIRED | Play Console → **Grow → Store presence → Main store listing** (and Store listings) |
| App category | OPERATOR_CONFIRMATION_REQUIRED | Main store listing / store settings **App category** |
| Contact details | OPERATOR_CONFIRMATION_REQUIRED | **Grow → Store presence → Store settings** (email / website / phone as shown) |
| Privacy policy URL | OPERATOR_CONFIRMATION_REQUIRED (product URL exists) | Store settings **Privacy policy** — expect `https://umtuba.com/privacy` if used |
| Data safety | OPERATOR_CONFIRMATION_REQUIRED | **App content → Data safety** |
| App access | OPERATOR_CONFIRMATION_REQUIRED | **App content → App access** |
| Ads declaration | OPERATOR_CONFIRMATION_REQUIRED | **App content → Ads** (mobile `package.json` has no AdMob SDK; still confirm Console) |
| Content rating | OPERATOR_CONFIRMATION_REQUIRED | **App content → Content ratings** |
| Target audience and content | OPERATOR_CONFIRMATION_REQUIRED | **App content → Target audience and content** |
| News / COVID / Government / Financial / Health | OPERATOR_CONFIRMATION_REQUIRED | **App content** corresponding declaration cards (mark N/A on Console only if the form says so) |
| Permissions declarations | OPERATOR_CONFIRMATION_REQUIRED | **App content** / Sensitive permissions + Data safety; compare to AAB permission list in Phase 1.8 |
| Account deletion | OPERATOR_CONFIRMATION_REQUIRED | **App content → Account deletion** |
| Families policy | OPERATOR_CONFIRMATION_REQUIRED | **Policy → Families** / App content Families (if shown) |
| UGC / social / moderation | OPERATOR_CONFIRMATION_REQUIRED | **App content → User-generated content** |
| Play App Signing | OPERATOR_CONFIRMATION_REQUIRED | **Test and release → Setup → App signing** (or **Release → Setup → App signing**) |
| Production track available | OPERATOR_CONFIRMATION_REQUIRED | **Test and release → Production** and **Publishing overview** |
| Unresolved policy/setup tasks | OPERATOR_CONFIRMATION_REQUIRED | **Publishing overview** task list |
| Whether content/setup is complete enough to submit | OPERATOR_CONFIRMATION_REQUIRED | **Publishing overview** + Production create-release eligibility |

Local product assets that **may** feed listing (not proof Console has them):

- Launcher icons: `umtuba-mobile/assets/images/icon.png`, `android-icon-*.png`
- No Play feature-graphic / phone-screenshot packet in either repo

---

## Phase 3 — Testing eligibility audit

GOOGLE_PLAY_INTERNAL_TESTING_CORE = CLOSED / PASS (authoritative closeout + this task’s given state).

No local document records:

- a mandatory closed-testing duration
- a minimum tester count
- that this developer account is blocked from Production
- that Production is already unlocked

Do **not** invent 14-day / 20-tester rules.

**GOOGLE_PLAY_PRODUCTION_ACCESS = OPERATOR_CONFIRMATION_REQUIRED**

Exact pages:

1. Play Console → app **UMTUBA** / `com.umtuba.app` → **Publishing overview** (production access / remaining tasks).
2. **Test and release → Testing → Closed testing** (whether a closed track exists and whether Console shows a production-access requirement).
3. **Test and release → Production** (whether “Create new release” / promote is offered or blocked, and the exact Console message if blocked).

If Console shows a specific testing condition, that condition is the blocker. If Production create-release is offered, access is AVAILABLE. This audit cannot see that UI.

---

## Phase 4 — Live release scope decision

**LIVE_ANDROID_PRODUCTION_SCOPE = OUT_OF_SCOPE**  
**LIVE_ANDROID_PRODUCTION_BLOCKING = NO**

Evidence (authoritative product/release docs + code; not inferred from unavailability alone):

1. `umtuba-mobile/README.md` titles the app **Foundation V1**. **Phase 2** lists “Live lobby + LiveKit” as a later surface, not a current ship claim.
2. Mobile contract is hard fail-closed: `isLiveLobbySourceConfigured()` and `isLiveJoinContractConfigured()` both **return `false`**. Lobby load does not call RPC/tables. Join is blocked. Unit tests assert this (`src/lib/live/live.test.ts`).
3. `EXPO_PUBLIC_LIVEKIT_URL` is optional; LiveKit URL is **not** a listing/join contract (`src/lib/env.ts`, Live comments).
4. Prior QA/closeouts: LIVE_EXPECTED_STATE = INTENTIONALLY_UNAVAILABLE; LIVE_INTERNAL_CORE_BLOCKING = NO; “do not enable Live.”
5. No Android production-scope / MVP document in `docs/ai/*` or `docs/ops/closeout/DESKTOP_ANDROID_*` requires Live join/listing for Google Play Production.
6. Web Live honesty is separately fail-closed; web Live **report** UI exists (`app/live/LiveRoomExperience.tsx`) but mobile Live is not provisioned.

`ANDROID_INTERNAL_TEST_FULL_FEATURE_READY = NO` remains true because Live is unfinished as a **full-feature** surface. That is **not** the Android Production scope gate. Full-feature Internal Testing ≠ Production eligibility.

Do **not** enable Live to satisfy production.

---

## Phase 5 — UGC / social / media policy audit

UMTUBA Android ships Watch, Create/publish, and Messages (physical PASS). This is user-generated media/content. Classification is **product evidence**, not invented Play pass/fail.

| Requirement | Class | Evidence |
|-------------|--------|----------|
| Reporting abusive content | **FAIL** (Android product) | No report control in `app/(tabs)/watch.tsx` or `components/WatchVideoCard.tsx`. Settings has no report row. Web Watch has no matching report UI found. Web **Live** has Report (`create_live_report`) — out of Android Live scope. No `content_reports` / `post_report` tables found for Watch posts. |
| Blocking users | **FAIL** (Android product) | `app/settings.tsx` “Blocked users” → *“Blocking is not available in this version.”* |
| Moderation | **UNKNOWN** (ops) / **FAIL** (Android UI) | Store admin moderation and `live_reports` / `hello_city_reports` exist on web/SQL. No Android moderation surface. Watch-post moderation pipeline not evidenced for mobile production. |
| Content removal | **FAIL** (Android published posts) | Internal Testing closeout: no published-post delete UI. Owner DELETE RLS exists on web/SQL; not exposed in Android app. Failed Create uploads self-delete storage objects. |
| Community / user policy | **PASS** | `https://umtuba.com/terms` (`app/terms/page.tsx`, `lib/legal/legalDocuments.ts` community rules, UGC license, prohibited content). Settings → Terms. |
| Contact / report channel | **FAIL** (dedicated) / weak PASS (homepage) | Settings Contact/Help open `https://umtuba.com` (homepage allowlist). **No** `app/contact` route. Legal copy uses generic “contact method provided on UMTUBA” and tests **forbid** inventing `@umtuba.com`. No in-app abuse-report destination. |
| Account deletion | **FAIL** (in-app) | No delete-account row in Android settings. Sign out only. Terms: *“Where account deletion is available…”* — documents that in-product deletion may be absent. |
| Privacy policy coverage | **PASS** | `https://umtuba.com/privacy`; `app/privacy/page.tsx`; Settings → Privacy Policy. Covers account, UGC, messages, device permissions, processors (Supabase, LiveKit). Last updated 19 July 2026. Console URL field still OCR. |
| UGC terms/acceptance | **FAIL** (Android signup) / **PASS** (web + documents) | Web `SignupForm` requires Terms + Privacy checkbox. Android `app/(auth)/signup.tsx` has **no** terms acceptance control. Terms remain reachable from Settings after sign-in. |

These product FAILs are **not** automatically listed as PRODUCTION_BLOCKERS. Play Console **App content → User-generated content** and **Account deletion** must be inspected; if those forms require in-app controls this binary lacks, **then** they become blockers and a new AAB would be required. That Console state is not in-repo.

---

## Phase 6 — Build candidate decision

**VERSION_CODE_3_PRODUCTION_CANDIDATE = YES**  
**NEW_AAB_REQUIRED_BEFORE_PRODUCTION = NO**

Reasons a new AAB is **not** required now:

- v3 is the production-profile STORE bundle already on Internal Testing.
- Runtime config fix is in this binary; physical config PASS.
- Package id and upload keystore unchanged.
- Live out of production scope → do not rebuild to enable Live.
- `eas.json` submit track `internal` is a submit-profile lock, not a reason to mint versionCode 4.

Do not bump versionCode. Do not run EAS `autoIncrement` (that would create 4).

---

## Phase 7 — Final gate matrix

Status vocabulary: PASS | BLOCKED | OPERATOR_CONFIRMATION_REQUIRED | NOT_APPLICABLE.

### A. TECHNICAL_APP_GATES

- `{ "id": "PACKAGE_ID_CONTINUITY", "status": "PASS", "evidence": "app.config.ts + EAS 26a60f53 + AAB com.umtuba.app" }`
- `{ "id": "SIGNING_CONTINUITY", "status": "PASS", "evidence": "existing EAS keystore p6De1DDtE_; SIGNING_CREDENTIALS_CHANGED=NO" }`
- `{ "id": "VERSION_CODE_3_ELIGIBLE", "status": "PASS", "evidence": "Internal Testing CORE closed on 1.0.0 (3); no higher Play code evidenced" }`
- `{ "id": "TARGET_COMPILE_MIN_SDK", "status": "PASS", "evidence": "Expo 57 / RN 0.86 defaults min 24 / target 36 / compile 36; no override" }`
- `{ "id": "PRODUCTION_SUPABASE_RUNTIME", "status": "PASS", "evidence": "EAS production env + physical CONFIG PASS; service-role rejected" }`
- `{ "id": "MEDIA_CAMERA_MIC_NOTIFICATION_PERMISSIONS_IN_APP", "status": "PASS", "evidence": "app.config.ts plugins + AAB uses-permission strings" }`
- `{ "id": "CRASH_ERROR_BOUNDARY", "status": "PASS", "evidence": "expo-router ErrorBoundary in app/_layout.tsx" }`
- `{ "id": "NO_ANDROID_PRODUCTION_FIXME", "status": "PASS", "evidence": "no Android-production TODO/FIXME in mobile tree" }`
- `{ "id": "INTERNAL_TEST_CORE_CLOSED", "status": "PASS", "evidence": "DESKTOP_ANDROID_INTERNAL_TEST_FINAL_CLOSEOUT_V1" }`
- `{ "id": "NEW_AAB_NOT_REQUIRED", "status": "PASS", "evidence": "same STORE AAB is the production candidate" }`

### B. GOOGLE_PLAY_SETUP_GATES

- `{ "id": "INTERNAL_TESTING_RELEASE_PUBLISHED", "status": "PASS", "evidence": "operator: Play displayed 1.0.0 (3) on Internal Testing" }`
- `{ "id": "MAIN_STORE_LISTING", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "Grow → Store presence → Main store listing; no local packet" }`
- `{ "id": "STORE_CATEGORY_CONTACT_PRIVACY_URL", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "Store settings; product privacy https://umtuba.com/privacy" }`
- `{ "id": "DATA_SAFETY", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "App content → Data safety; AAB has location/media/camera/mic/notifications" }`
- `{ "id": "APP_ACCESS", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "App content → App access (auth-gated surfaces)" }`
- `{ "id": "ADS_DECLARATION", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "App content → Ads; no AdMob in package.json" }`
- `{ "id": "CONTENT_RATING", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "App content → Content ratings" }`
- `{ "id": "TARGET_AUDIENCE", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "App content → Target audience and content" }`
- `{ "id": "NEWS_COVID_GOV_FINANCE_HEALTH", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "App content declaration cards; no local capture" }`
- `{ "id": "PERMISSIONS_DECLARATIONS", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "compare Console to Phase 1.8 AAB list incl. location + SYSTEM_ALERT_WINDOW" }`
- `{ "id": "PLAY_APP_SIGNING", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "Test and release → Setup → App signing" }`
- `{ "id": "PRODUCTION_TRACK_AVAILABLE", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "Test and release → Production; Publishing overview; not promoted in any packet" }`

### C. POLICY_AND_CONTENT_GATES

- `{ "id": "PRIVACY_POLICY_DOCUMENT", "status": "PASS", "evidence": "https://umtuba.com/privacy + app/privacy + settings link" }`
- `{ "id": "COMMUNITY_TERMS_DOCUMENT", "status": "PASS", "evidence": "https://umtuba.com/terms UGC + conduct sections" }`
- `{ "id": "UGC_SURFACES_SHIPPED", "status": "PASS", "evidence": "Watch/Create/Messages physical PASS on v3" }`
- `{ "id": "IN_APP_REPORT_ABUSIVE_CONTENT", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "Android has no report UI; confirm App content → User-generated content" }`
- `{ "id": "IN_APP_BLOCK_USERS", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "settings Blocked users unavailable; confirm same UGC page" }`
- `{ "id": "ACCOUNT_DELETION", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "no Android delete-account control; confirm App content → Account deletion" }`
- `{ "id": "ANDROID_SIGNUP_TERMS_ACCEPTANCE", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "web checkbox exists; Android signup has none; confirm UGC/policy forms" }`
- `{ "id": "FAMILIES_POLICY", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "no Families packet" }`
- `{ "id": "LIVE_AS_PRODUCTION_POLICY", "status": "NOT_APPLICABLE", "evidence": "LIVE_ANDROID_PRODUCTION_SCOPE=OUT_OF_SCOPE" }`
- `{ "id": "IOS_AS_ANDROID_GATE", "status": "NOT_APPLICABLE", "evidence": "iOS is not an Android production blocker" }`

### D. TESTING_AND_PRODUCTION_ACCESS_GATES

- `{ "id": "INTERNAL_TESTING_CORE", "status": "PASS", "evidence": "CLOSED/PASS versionCode 3" }`
- `{ "id": "MANDATORY_CLOSED_TESTING_PERIOD", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "no local tester-count/duration evidence; Publishing overview + Closed testing" }`
- `{ "id": "PRODUCTION_ACCESS_ELIGIBILITY", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "Publishing overview + Production create-release / promote UI" }`

### E. OPERATOR_ACTION_GATES

- `{ "id": "NO_NEW_AAB_THIS_TASK", "status": "PASS", "evidence": "NEW_BUILD_CREATED=NO" }`
- `{ "id": "NO_PLAY_MUTATION_THIS_TASK", "status": "PASS", "evidence": "GOOGLE_PLAY_MUTATED=NO" }`
- `{ "id": "CONFIRM_PUBLISHING_OVERVIEW_AND_APP_CONTENT", "status": "OPERATOR_CONFIRMATION_REQUIRED", "evidence": "highest-priority next action; read-only" }`
- `{ "id": "KEEP_MOBILE_UNCOMMITTED_CONFIG_AND_AAB", "status": "PASS", "evidence": "eas.json / app.config.ts / release-artifacts kept; do not commit .env or AAB" }`

---

## PRODUCTION_BLOCKERS

None proven as Play/technical rejects of versionCode 3.

The reason **ANDROID_PRODUCTION_RELEASE_READY = NO** is: Google Play **Production setup and production-access eligibility are not evidenced locally**. That is confirmation remaining, not a documented Console rejection.

If Publishing overview / App content shows incomplete required tasks, those Console tasks become the real blockers. Record them from the UI; do not guess here.

---

## NON_BLOCKING_BACKLOG

- Live lobby/join (OUT_OF_SCOPE for Android production; keep fail-closed)
- iOS TestFlight / App Store (not an Android gate)
- Android settings: Edit profile / Privacy settings “not available yet”
- Published Watch-post delete UI
- Dedicated crash analytics (Sentry/Crashlytics)
- README Phase 2 extras (richer profile, push inbox completeness, Universal Links verification)
- Web/AI/commerce/Learning flags from PROJECT_STATE (not Android Play production gates)
- In-app report / block / account deletion / Android signup terms checkbox — **product backlog unless Console App content forms require them** (then they leave this list)

---

## OPERATOR_CONFIRMATION_REQUIRED (exact pages)

1. **Publishing overview** — remaining tasks; whether Production access is granted or blocked; exact Console message if blocked.
2. **Test and release → Production** — track available? create-release / promote from Internal offered?
3. **Test and release → Testing → Closed testing** — only if Publishing overview cites a closed-testing condition (do not invent counts/days).
4. **Test and release → Testing → Internal testing** — confirm 1.0.0 (3) still the active internal artifact (already evidenced; re-check before promote).
5. **Grow → Store presence → Main store listing** — name, short/full description, icon, feature graphic, phone/tablet screenshots.
6. **Grow → Store presence → Store settings** — category, contact email/website, privacy policy URL (`https://umtuba.com/privacy`).
7. **App content → Data safety**
8. **App content → App access**
9. **App content → Ads**
10. **App content → Content ratings**
11. **App content → Target audience and content**
12. **App content → User-generated content** — whether in-app report/block/moderation answers can be truthful for this binary.
13. **App content → Account deletion** — in-app URL vs web/contact path.
14. **App content** News / COVID / Government / Financial / Health cards if shown.
15. **Test and release → Setup → App signing**
16. **Policy → Families** if shown.

Do not promote, submit, start rollout, or edit declarations in that pass unless a **separate** authorized task says so.

---

## Constraints honored

- No git commit / push / force / reset / stash
- No remote Supabase migrations or production data changes
- No Android rebuild / versionCode 4 / AAB upload
- No Google Play mutation / production promotion / review / rollout
- Live not enabled
- No product/runtime code changes
- No secrets printed; `.env` not dumped
- No Windows Desktop artifact writes
- `_port_extract` untouched
- iOS not treated as an Android blocker
- Tester-count/duration not invented
- Play requirements not assumed from memory

---

## Next operator action (single)

Open Google Play Console for **UMTUBA** / `com.umtuba.app` → **Publishing overview**, then **App content** and **Main store listing**, and record which tasks are complete vs incomplete vs blocking Production access. Do **not** promote, submit, roll out, or upload another AAB.

CENTRAL_HANDOFF_READY = YES
