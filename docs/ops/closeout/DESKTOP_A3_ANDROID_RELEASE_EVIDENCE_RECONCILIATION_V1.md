# DESKTOP_A3_ANDROID_RELEASE_EVIDENCE_RECONCILIATION_V1

**DEVICE:** DESKTOP-A3  
**DEVICE_ROLE:** ANDROID_RELEASE_EVIDENCE_RECONCILER (independent static audit)  
**CENTRAL_COORDINATOR:** SERVER  
**MODE:** FINAL_PARALLEL_EXECUTION / READ_ONLY except this closeout + AI state docs  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_A3_ANDROID_RELEASE_EVIDENCE_RECONCILIATION_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE (candidate):** `4`  
**EAS_BUILD_ID:** `37dde25f-5cb8-4245-ab25-4e357217f6f7`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `380a36646d4de8a37c39a56ac3ccd449f6d8b20d`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `3b335610ced48aa2595fe49eef5b97511c7f4cb5` + uncommitted UGC / versionCode 4 / `release-artifacts/`

Independent Android release QA. Did **not** duplicate A1 device testing. Did **not** duplicate A2 Console mutation (A2 this wave was evidence-only / no Console write). Did **not** guess A1 device results. Did **not** invent an opted-in count.

| Sibling closeout | Present this run? | Use |
|------------------|-------------------|-----|
| `docs/ops/closeout/DESKTOP_A1_ANDROID_V4_FINAL_RUNTIME_QA_V1.md` | **PRESENT** (appeared after first draft; read and incorporated) | Device fields from A1. Do not guess beyond that packet. |
| `docs/ops/closeout/DESKTOP_A2_GOOGLE_PLAY_CLOSED_TESTING_OPERATOR_CLOSEOUT_V1.md` | **PRESENT** (appeared during this run; read and incorporated) | Closed-testing / Play-config fields from A2 + prior docs. Opted-in **not** guessed. |

No product code edits. No commit. No push. No AAB. No Play upload. No Live. No Stripe. Android WIP preserved. `_port_extract` untouched. No Windows Desktop writes.

---

## DESKTOP-A3 REPORT

```
DESKTOP-A3 REPORT
TASK_ID = DESKTOP_A3_ANDROID_RELEASE_EVIDENCE_RECONCILIATION_V1
ANDROID_CODE_READY = YES
ANDROID_BACKEND_READY = YES
ANDROID_V4_DEVICE_VERIFIED = NO
GOOGLE_PLAY_CONFIG_READY = NO
CLOSED_TESTING_GATE = NO
NEW_AAB_REQUIRED = NO
ANDROID_PRODUCTION_RELEASE_READY = NO
HIDDEN_BLOCKERS = [UAF-12 own-delete not in v4 tree/AAB; AUTH_ENV Central load NO; iOS origin/master +2 overlaps watch.tsx/WatchVideoCard/live/_layout (do not FF); uncommitted UGC + versionCode 4 + release-artifacts; v4 not uploaded; no A1 install path (no device/adb/APK); Closed Testing opted-in UNKNOWN / 12-14 clock unproven; Play listing/IARC/ads/app-signing OCR incomplete; 20260928 not on origin/alpha-0.2 git tip]
A1_EVIDENCE = PRESENT
A2_EVIDENCE = PRESENT
```

---

## Verdict table

| Field | Result | Independent basis |
|-------|--------|-------------------|
| ANDROID_CODE_READY | **YES** | Mobile WT implements report/block/terms/deletion-link; RPC names match `20260928`; those strings are **inside** v4 `index.android.bundle`. Recent-valid unit tests cited (not re-run). Uncommitted = hidden blocker, not “code missing”. |
| ANDROID_BACKEND_READY | **YES** | Parent GO: Central targeted-applied `20260928`. A3 uniqueness vs `20260873` / `20260922` confirmed. A1 read-only production RPC probe **PASS** (`list_ugc_block_ids` / `list_my_blocked_users` / report RPCs exist). Desktop did not apply. File still **not** on `origin/alpha-0.2`. |
| ANDROID_V4_DEVICE_VERIFIED | **NO** | A1: `V4_DEVICE_RUNTIME_VERIFIED = NO`. No device / adb / APK / emulator. UGC UI **NOT_TESTED**. Do not fabricate PASS. |
| GOOGLE_PLAY_CONFIG_READY | **NO** | A2 + prior docs: Data Safety / App access / ages / deletion-URL half complete. Ads / IARC / listing graphics / TA remainder / app-signing OCR open. UGC Play answers must stay honest **NO** while v3 is the Play binary. |
| CLOSED_TESTING_GATE | **NO** | A2: `OPTED_IN_COUNT = UNKNOWN`; `DAY_COUNT = UNKNOWN / NOT_PROVEN_STARTED`; `PRODUCTION_ACCESS_ELIGIBLE = NO`. Emails-on-list ≠ opted-in. |
| NEW_AAB_REQUIRED | **NO** | v4 AAB exists, signed, SHA256 matches, contains UGC client. Backend change is SQL-only. UAF-12 would need a **later** AAB if own-delete is in production scope — not a rebuild of this candidate. |
| ANDROID_PRODUCTION_RELEASE_READY | **NO** | A1 device **NO**; Closed Testing 12/14 unproven; v4 not on Play; remaining Console cards; hidden blockers below. |
| A1_EVIDENCE | **PRESENT** | Read `DESKTOP_A1_ANDROID_V4_FINAL_RUNTIME_QA_V1.md`. |
| A2_EVIDENCE | **PRESENT** | Read `DESKTOP_A2_GOOGLE_PLAY_CLOSED_TESTING_OPERATOR_CLOSEOUT_V1.md`. |
| PRODUCT_CODE_CHANGED | **NO** (this task) | Docs only. |
| GOOGLE_PLAY_MUTATED | **NO** | |
| MIGRATION_APPLIED | **NO** (Desktop) | Central apply accepted from GO after uniqueness check. |
| SERVICE_ROLE_EXPOSED | **NO** | |

**Do not upload v4. Do not Apply for production. Do not FF mobile. Do not apply `20260873` or `20260922` as UGC.**

---

## 1 — Mobile SHA / dirty tree / versionCode

`git fetch --prune` on web + mobile. No pull / merge / rebase / reset / stash / force.

| Field | Value |
|-------|--------|
| Path | `C:\Users\1\Desktop\umtuba\umtuba-mobile` |
| Branch | `master` |
| HEAD | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` — `feat(ios): add App Store readiness contracts from PC2 preparation` |
| Upstream | `origin/master` = `db7f927467eb2a5416b612c330bfa8440bcf50f0` |
| Ahead / behind | **0 / 2** |
| Dirty | **YES** — preserve |
| `app.config.ts` WT `android.versionCode` | **4** (HEAD committed hint is still `1`; EAS remote is SoT) |
| EAS metadata versionCode | **4** |
| AAB embedded `app.config` | `"package":"com.umtuba.app","versionCode":4` |

Behind origin (do **not** FF — overlaps UGC WIP):

1. `45f0dbc` `feat(ios): consume UAF-12 delete and hide unfinished Live for PC2_IOS_APP_STORE_OPERATOR_MODE_V1`
2. `db7f927` `docs(ios): record PC2_IOS_APP_STORE_OPERATOR_MODE_V1 commit SHA`

Uncommitted (this session; not discarded):

- Modified: `app.config.ts`, `eas.json`, `app/(auth)/signup.tsx`, `app/(tabs)/watch.tsx`, `app/_layout.tsx`, `app/messages/[id].tsx`, `app/settings.tsx`, `components/WatchVideoCard.tsx`, `src/lib/feed/watchFeed.ts`, `src/lib/messenger/api.ts`, `src/lib/video/ugcSafety.ts`, `src/lib/video/ugcSafety.test.ts`
- Untracked: `app/blocked-users.tsx`, `components/UgcSafetySheet.tsx`, `src/lib/safety/`, `release-artifacts/`

`eas.json` WT vs HEAD: production `environment: "production"`; `submit.production.android.track = "internal"`.

Web (context only): `office/profile-hero-completeness-v1` @ `380a36646d4de8a37c39a56ac3ccd449f6d8b20d` even with origin; dirty docs. `origin/alpha-0.2` = `f8e142d8cf7faab9646f127c1995e351be94fb37`. Desktop did not deploy.

---

## 2 — v4 AAB path / sha256 / signing

| Field | Value |
|-------|--------|
| Path | `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab` |
| Bytes | 102255810 |
| SHA256 (rehashed this session) | `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6` |
| Matches `eas-build-37dde25f.json` | **YES** |
| Zip | Android App Bundle — 1878 entries; `BundleConfig.pb`; `BUNDLE-METADATA/` |
| JAR signature | `META-INF/MANIFEST.MF` + `META-INF/33B11D9D.SF` + `META-INF/33B11D9D.RSA` |
| EAS keystore | `Build Credentials p6De1DDtE_ (default)` |
| SIGNING_CREDENTIALS_CHANGED | **NO** (EAS JSON `signingChanged: false`; same keystore id as v3) |
| Play upload | **NO** (`playUpload: false`) |
| Play App Signing enrollment | **OPERATOR_CONFIRMATION_REQUIRED** (docs; not re-OCR’d) |

Historical AABs still on disk (not current candidates):

| File | versionCode | SHA256 |
|------|------------|--------|
| `umtuba-android-production-26a60f53.aab` | 3 | `61DAC1C62D9CCF85FBAD824B853F28DF24EFD7C2F4DDA3ADBCC0B470522ED70A` |
| `umtuba-android-production-86c0d773.aab` | 2 | (superseded; not rehashed this task) |

---

## 3 — EAS build

From `release-artifacts/eas-build-37dde25f.json` (local metadata; Expo not re-queried):

| Field | Value |
|-------|--------|
| buildId | `37dde25f-5cb8-4245-ab25-4e357217f6f7` |
| status | finished |
| profile / distribution | production / store |
| versionName / versionCode | 1.0.0 / **4** |
| package | `com.umtuba.app` |
| sdkVersion | 57.0.0 |
| gitCommitHash recorded | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` |
| artifactUrl | `https://expo.dev/artifacts/eas/E30A6TXW29yo0u4eZ88budjsXkpSfzAlAcpf8XosOXM.aab` |
| logsUrl | `https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/37dde25f-5cb8-4245-ab25-4e357217f6f7` |

v4 JSON does **not** repeat `easEnvLoaded`. v3 JSON (`26a60f53`) recorded `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Current `eas.json` production profile still sets `"environment": "production"`. Public host `tgucwnjwoyeqoxqaxmew.supabase.co` is **inside** the v4 Hermes bundle (see §4).

`cli.appVersionSource = remote`; `autoIncrement: true` — do not start another production build (would bump past 4).

---

## 4 — Supabase runtime config (public only)

No `.env` values printed. No service-role value read.

| Check | Result |
|-------|--------|
| Client schema | `src/lib/env.ts` requires `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; rejects keys matching `service_role` |
| Local `.env` names | PRESENT (gitignored) |
| Public host in v4 bundle | `tgucwnjwoyeqoxqaxmew.supabase.co` in `base/assets/index.android.bundle` |
| `com.umtuba.app` in AAB | `base/assets/app.config` |
| Literal `service_role` in bundle | One hit — Expo notifications copy (`notification service` smashed with `_role[expo-notifications]`). **Not** a Supabase service-role key. |
| SERVICE_ROLE_EXPOSED | **NO** |
| v3 device runtime config | PASS per prior Internal Testing CORE (docs). v4 device = A1 pending. |

---

## 5 — `20260928` uniqueness vs rejected IDs (not applied from Desktop)

Parent GO: Central says `20260928` is applied. Confirmed from **git/docs only**. No `db push`. No targeted apply. No live schema query.

| ID | Owner | This session |
|----|--------|--------------|
| `20260873` | Learning `20260873_learning_ai_tutor_thread_metadata_read_v1.sql` (`9e90448`) | **Not** UGC. Absent on this web HEAD and on `origin/alpha-0.2`. **Do not apply as UGC.** |
| `20260922` | Central registry: `knowledge_acquisition_foundation_v1`. Git filename on alpha: `20260876_knowledge_acquisition_foundation_v1.sql` | Former Desktop UGC filename at this ID was renamed away (`c708fb1` → `380a366`). **No** leftover `20260922_ugc_safety*` on HEAD. **Do not apply as UGC.** |
| `20260928` | `supabase/migrations/20260928_ugc_safety_reports_blocks_v1.sql` | **One** file. SHA256 `BFDB6F879A213746E38E768859ED6043C566E6AC861A14B5D1B372BD40B09693`. On HEAD + `origin/office/profile-hero-completeness-v1` @ `380a366`. **Not** on `origin/alpha-0.2`. History: only `380a366` (rename off `20260922`). |

`is_platform_admin()` ensure is in section 0 of `20260928` (ads-foundation contract; `SECURITY DEFINER`; execute revoked from `public`/`anon`).

Desktop independent `schema_migrations` dump: **ABSENT**. A1 later probed production with Store QA (read-only; secrets not reprinted here): UGC list RPCs returned empty arrays; report RPCs exist and fail-closed on invalid targets (`P0002`). That plus uniqueness + Central GO is enough for `ANDROID_BACKEND_READY = YES`. File still not on `origin/alpha-0.2`.

---

## 6 — UGC contracts: source vs AAB provenance

SQL RPCs in `20260928` (feature origin):

`report_ugc_content`, `report_ugc_user`, `block_ugc_user`, `unblock_ugc_user`, `list_my_blocked_users`, `list_ugc_block_ids`, plus `ugc_users_are_blocked` / `ugc_reject_blocked_message`.

Mobile WT callers (`src/lib/safety/reports.ts`, `blocks.ts`) use the same RPC names. UI: Watch safety sheet, Messages report/block, Settings blocked-users + Delete account → `https://umtuba.com/account-deletion`, Create/signup Terms gate.

**Independent AAB string scan** (`base/assets/index.android.bundle`):

| Needle | In v4 AAB? |
|--------|------------|
| `report_ugc_content` | YES |
| `report_ugc_user` | YES |
| `block_ugc_user` | YES |
| `list_ugc_block_ids` | YES |
| `list_my_blocked` | YES |
| `UgcSafety` | YES |
| `blocked-users` | YES |
| `account-deletion` | YES |

EAS recorded `gitCommitHash = 3b33561` but UGC was **uncommitted** at build time. Bundle contents prove the dirty UGC tree was uploaded to EAS (not a clean committed-only clone). Provenance = WT @ `3b33561` + UGC WIP, not `origin/master`.

`deletePostForOwner` (UAF-12): **absent** on mobile HEAD / v4 WT grep; **present** on `origin/master` only. **Not** in v4 AAB (not scanned as present; source not in tree). Own-delete is **not** a Play report/block substitute.

Account deletion URL re-fetched READ-ONLY this session: `https://umtuba.com/account-deletion` live (“Delete your UMTUBA account”; queued request; sign-in required). Matches A2.

Live: `isLiveLobbySourceConfigured()` hard-returns `false`. OUT_OF_SCOPE / fail-closed. Non-blocking for this audit.

---

## 7 — Play policy requirements (static + A2)

Official rules cited in prior Desktop / A2 packets (not re-litigated):

- UGC [9876937](https://support.google.com/googleplay/android-developer/answer/9876937) — in-app report content + users + block for public UGC + 1:1 messages
- Account deletion [13327111](https://support.google.com/googleplay/android-developer/answer/13327111)
- Closed testing / production access [14151465](https://support.google.com/googleplay/android-developer/answer/14151465) — ≥12 **opted-in** for 14 continuous days (personal accounts after 2023-11-13)
- Target audience [9867159](https://support.google.com/googleplay/android-developer/answer/9867159)

| Requirement | Code / AAB v4 | Backend | On Play now (v3) | Console |
|-------------|---------------|---------|------------------|---------|
| Report content / user | YES | `20260928` (Central-claimed apply) | **NO** | Honest **NO** until v4 is the Play binary (A2) |
| Block | YES | same | **NO** | Honest **NO** |
| Terms before publish | YES (client) | N/A | **NO** | Honest **NO** |
| Account deletion web URL | Settings link in v4 | Web flow live | v3 has no in-app row | URL half YES_OPERATOR (A2); page live |
| Data Safety | N/A | N/A | N/A | COMPLETE — do not reopen |
| App access | N/A | N/A | N/A | COMPLETE — do not reopen |
| Target ages 13–15 / 16–17 / 18+ | N/A | N/A | N/A | AGES_COMPLETE — do not change |
| Closed Testing 12/14 | N/A | N/A | N/A | **NOT MET** (A2) |
| Store listing / IARC / Ads / signing OCR | Packets local | N/A | N/A | Incomplete (A2) |

`UGC_GOOGLE_PLAY_READY = NO` until v4 is uploaded **and** Console answers become honest YES. Central apply does **not** change the v3 Play binary.

---

## 8 — Hidden release blockers

1. **UAF-12 own-delete not in v4 tree/AAB.** On `origin/master` `45f0dbc` only (`src/lib/social/deleteOwnedPost.ts` + Watch). Web UAF-12 is separately on `origin/alpha-0.2` (`6e494df`), not on this profile-hero HEAD. Play UGC report/block does not require this; production product completeness does if own-delete is in scope → later AAB.
2. **AUTH_ENV Central load NO.** Desktop `umtuba-web/.env.store-qa.local` PRESENT (presence only). `CENTRAL_STORE_AUTH_ENV_READY = NO` (`DESKTOP_CENTRAL_STORE_AUTH_ENV_SECURE_LANDING_V3`). Store QA / reviewer-path residual; not a Play binary defect.
3. **iOS shared files vs Android WIP.** `origin/master` +2 touches `app/(tabs)/watch.tsx`, `components/WatchVideoCard.tsx`, `app/(tabs)/live.tsx`, `app/(tabs)/_layout.tsx` — same paths as uncommitted UGC. Fast-forward would mix or lose WIP. Do not start iOS on Desktop.
4. **Uncommitted UGC + versionCode 4 + `release-artifacts/`.** v4 provenance is a dirty tree. Not on `origin/master`. Loss/FF risk. Preserve.
5. **v4 not uploaded.** `playUpload: false`. A2: `V4_UPLOAD_ALLOWED = NO` (Central apply ≠ upload GO).
6. **No A1 install path.** A1: no physical device, no emulator, no adb, no APK, no Java/bundletool. `INSTALL_PATH_USED = NONE`. v4 device matrix all NOT_TESTED.
7. **Closed Testing opted-in UNKNOWN; 12/14 clock unproven** (A2; not guessed).
8. **Play listing / IARC / Ads / app-signing OCR incomplete** (A2 + remaining-console 45%).
9. **`20260928` not on `origin/alpha-0.2` git tip.** Targeted-apply can succeed without merging SQL onto alpha; production git tip still lacks the file. Drift for the next deploy checkout.

---

## 9 — Sibling incorporation

### A1 (present; incorporated)

From `DESKTOP_A1_ANDROID_V4_FINAL_RUNTIME_QA_V1.md`:

- `V4_DEVICE_RUNTIME_VERIFIED = NO` — no install path
- `UGC_RUNTIME_VERIFIED = PARTIAL` — production backend PASS; device UI NOT_TESTED
- `UGC_BACKEND_PRODUCTION = PASS` (read-only Store QA RPC probe)
- `AAB_REBUILD_REQUIRED = NO`; `AAB_MATCHES_CURRENT_V4_WIP = YES`
- `OWN_CONTENT_DELETE_MOBILE = NO`
- `ANDROID_V4_TECHNICAL_READY = NO`
- Vitest this session: 22/22 PASS (safety + ugcSafety + Live + supportLinks)

`ANDROID_V4_DEVICE_VERIFIED = NO` from A1 (not PENDING).

### A2 (present; incorporated)

From `DESKTOP_A2_GOOGLE_PLAY_CLOSED_TESTING_OPERATOR_CLOSEOUT_V1.md`:

- `OPTED_IN_COUNT = UNKNOWN` — A3 does not invent a number
- Listed emails: operator ≥17 (2026-08-13) / ~25 (this GO); no local list file; not unique-counted
- `CLOSED_TESTING_ACTIVE = IN_PREPARATION / NOT_OCR_THIS_SESSION`
- `DAY_COUNT = UNKNOWN / NOT_PROVEN_STARTED`
- `PRODUCTION_ACCESS_ELIGIBLE = NO`
- `V4_UPLOAD_ALLOWED = NO`
- Data Safety / App access / ages complete; deletion URL live + Play URL half operator-complete
- UGC Console answers must stay **NO** for current Play binary v3
- `GOOGLE_PLAY_MUTATED = NO`

`CLOSED_TESTING_GATE = NO` from A2 evidence (not PENDING).  
`GOOGLE_PLAY_CONFIG_READY = NO` (completed subset ≠ production-config ready).

---

## 10 — What this session did / did not do

| Did | Did not |
|-----|---------|
| Independent git / AAB hash / zip / string / migration uniqueness audit | Device install or A1 runtime QA |
| Read A2 when it appeared | Open or save Play Console |
| Re-fetch account-deletion URL (public) | Upload AAB / Apply for production |
| Update AI state docs + this closeout | Commit / push / apply SQL / edit mobile or web product |
| Preserve Android WIP | FF mobile; enable Live; touch Stripe; write Desktop |

`PRODUCT_CODE_CHANGED = NO`  
`COMMIT_PERFORMED = NO`  
`PUSH_PERFORMED = NO`  
`AAB_BUILT = NO`  
`GOOGLE_PLAY_MUTATED = NO`  
`MIGRATION_APPLIED = NO`

---

## 11 — STOP

Parent rolls up A1 + A2 + A3. No next A3 action on this TASK_ID.
