# DESKTOP_A2_ANDROID_V5_BUILD_DEVICE_PATH_PREP_V1

**DEVICE:** DESKTOP-A2  
**DEVICE_ROLE:** ANDROID_V5_BUILD_AND_DEVICE_PATH_PREP  
**WAVE_ID:** DESKTOP_ANDROID_V5_FINAL_RELEASE_PREPARATION_V1  
**MODE:** EVIDENCE_ONLY / NO_EAS_BUILD / NO_VERSIONCODE_EDIT / NO_PLAY_UPLOAD  
**DATE:** 2026-08-14  
**TASK_ID:** DESKTOP_A2_ANDROID_V5_BUILD_DEVICE_PATH_PREP_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE (read-only):** `C:\Users\1\Desktop\umtuba\umtuba-mobile`

This packet prepares the **v5** EAS production build path and the post-build device-install path. It does **not** rebuild v4, upload v4, upload to Play, start an EAS build, increment `versionCode` in source (A1 owns those files), commit, push, apply migrations, enable Live, or touch Stripe.

`V5_BUILD_GO` was **not** in this user message. Repo docs have **no** `V5_BUILD_GO`. Therefore `V5_BUILD_GO_RECEIVED = NO`. Even though A1/prior closeout already placed own-delete in the mobile working tree, this task **did not** start a build.

No secrets. No `.env` values. No tester emails. No service-role. `docs/ai/CURRENT_TASK.md` was **not** written (A1 owns it).

---

## DESKTOP-A2 REPORT

```
DESKTOP-A2 REPORT
TASK_ID = DESKTOP_A2_ANDROID_V5_BUILD_DEVICE_PATH_PREP_V1
NEXT_VERSION_CODE = 5
EAS_PRODUCTION_READY = YES
SIGNING_READY = YES
ENV_READY = YES
V5_BUILD_GO_RECEIVED = NO
V5_BUILD_PERFORMED = NO
V5_BUILD_ID =
V5_AAB =
DEVICE_INSTALL_PATH = NONE_USABLE_ON_THIS_DESKTOP
DEVICE_QA_READY = NO
BLOCKERS = V5_BUILD_GO absent; A1 owns source (do not race); no adb/java/bundletool/APK/device on Desktop; v4 must not be uploaded; Play Internal/Closed Testing install requires a later explicit upload GO after a v5 artifact exists
```

---

## 1 — GO / non-build gate

| Check | Result |
|-------|--------|
| `V5_BUILD_GO` in this user message | **NO** |
| `V5_BUILD_GO` in `docs/` (grep) | **NO** |
| SESSION_HANDOFF next-GO language | Future Central authorize of versionCode 5 — **not** a received GO |
| Accidental later GO found | **NO** |
| `V5_BUILD_GO_RECEIVED` | **NO** |
| `V5_BUILD_PERFORMED` | **NO** |
| EAS `build` invoked this session | **NO** |
| `versionCode` edited in files | **NO** (A1 owns source) |
| v4 rebuilt / re-uploaded | **NO** |
| Play Console mutated | **NO** |

Instruction honored: if a GO had been found in docs **and** A1 source looked complete **and** this agent would not race A1 edits — still **do not build** unless the GO is explicit in **this** user message. It is not.

---

## 2 — Next versionCode (determined only; not written)

`eas.json` `cli.appVersionSource = "remote"` + production `autoIncrement: true`. Local `app.config.ts` `android.versionCode` is a hint only. EAS CLI this session warned that the app-config field is ignored for the remote source (still appears in the Expo Constants manifest).

| Source | versionCode | Class |
|--------|-------------|-------|
| `npx eas-cli build:version:get --platform android --profile production --non-interactive` (this session) | **4** | EAS remote (authoritative for next autoIncrement) |
| Latest EAS Android **production** build `37dde25f-5cb8-4245-ab25-4e357217f6f7` | **4** (`appBuildVersion`) | EAS `build:list` this session; FINISHED; no later production build |
| Local `app.config.ts` (read-only) | **4** | A1 / prior WT; not incremented here |
| Local v4 AAB metadata `eas-build-37dde25f.json` | **4** | FILE |
| Prior production builds | 3 = `26a60f53`; 2 = `86c0d773` | EAS list + local AABs |
| Play published binary (A2 Closed Testing packet, same day; not re-OCR’d here) | **3** Internal Testing CORE | DOCS. v4 `playUpload: false`. Play is **not** higher than 4 |
| Preview-profile historical builds | 1 | Not the production track |

No EAS or Play evidence of a versionCode **≥ 5**. Next production EAS build will be **5**.

**NEXT_VERSION_CODE = 5**

Do **not** hand-edit `app.config.ts` to 5. A1 owns source. Remote autoIncrement will assign 5 at the authorized build.

---

## 3 — EAS production profile

Read `C:\Users\1\Desktop\umtuba\umtuba-mobile\eas.json` (not edited).

| Field | Value | Ready |
|-------|--------|-------|
| `cli.version` | `>= 16.0.0` | YES — this session `eas-cli/21.8.0` |
| `cli.appVersionSource` | `remote` | YES |
| `build.production.autoIncrement` | `true` | YES (next → 5) |
| `build.production.environment` | `production` | YES |
| `build.production` Android `buildType` | unset → default **app-bundle (AAB)** | YES for Play |
| `submit.production.android.track` | `internal` | YES (future submit locked to Internal; not used) |
| `build.preview` / `development` | `buildType: apk`, `distribution: internal` | **Not** the v5 candidate path |

Project: owner `umtuba`, slug `umtuba-mobile`, EAS `projectId` `d2593b45-8f18-4c57-9d71-0419193cfd77` (`app.config.ts` `extra.eas`). Package `com.umtuba.app`. versionName `1.0.0`.

**EAS_PRODUCTION_READY = YES** — cloud production profile and CLI auth are ready. This is **not** permission to build.

---

## 4 — Signing (existing keystore; do not rotate)

| Evidence | Result |
|----------|--------|
| v4 metadata `eas-build-37dde25f.json` | `keystore`: **Build Credentials p6De1DDtE_ (default)**; `signingChanged: false` |
| v3 metadata `eas-build-26a60f53.json` | `existingKeystoreUsed: true` |
| v2 production AAB packet | CLI: `Using remote Android credentials` / `Using Keystore from configuration: Build Credentials p6De1DDtE_ (default)` |
| This session | `eas credentials` **not** opened (interactive; rotate risk). No generate / replace / upload |
| Local `credentials.json` / new keystore | **Not created** |

**SIGNING_READY = YES** — reuse existing remote `p6De1DDtE_`. Do **not** rotate. Do **not** generate a second upload identity.

Preview/development APK profiles are a **different distribution**. They must **not** be used to “test the v5 candidate” in place of the production keystore AAB.

---

## 5 — Environment (presence, not values)

`eas.json` production attaches EAS environment **production**.

| Source | `EXPO_PUBLIC_SUPABASE_URL` | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
|--------|----------------------------|----------------------------------------|
| Local `umtuba-mobile/.env` (names + nonempty only) | **PRESENT_NONEMPTY** | **PRESENT_NONEMPTY** |
| `.env.example` (names only) | present (empty template) | present (empty template) |
| EAS production (this session `build:version:get` load line) | **PRESENT** (name listed) | **PRESENT** (name listed) |
| v3 build metadata `easEnvLoaded` | listed | listed |

Values were **not** printed. Service-role was **not** read or copied. `EXPO_PUBLIC_LIVEKIT_URL` exists locally as an optional name; Live stays fail-closed / out of Android production scope.

`eas env:list --format json` is unsupported on eas-cli 21.8.0 (`long` / `short` only). Name presence was taken from the production-env load line on `build:version:get`, which is sufficient.

**ENV_READY = YES**

---

## 6 — Build prerequisites (this Desktop)

| Prerequisite | Result |
|--------------|--------|
| `npx eas-cli whoami --non-interactive` | **PASS** — `mohamadabutair` / `mohamad054@gmail.com`; Accounts: `mohamadabutair` Owner, **`umtuba` Owner** |
| `eas-cli` | **21.8.0** (win32-x64, node v24.8.0) |
| `node` | **v24.8.0** |
| `npm` | **11.6.0** |
| `EXPO_TOKEN` | **ABSENT** (session login via whoami is enough; no token printed) |
| Java / `JAVA_HOME` | **ABSENT** — **not required for EAS cloud**. Required later for bundletool APK extract |
| Android SDK / `adb` | **ABSENT** — not required for EAS cloud. Required for ADB install |
| `bundletool` | **ABSENT** |
| In-progress EAS Android build | **NONE** — latest production = `37dde25f` FINISHED versionCode 4 |

Cloud EAS production build is **prerequisite-ready**. Local AAB→APK and ADB are **not**.

---

## 7 — A1 source (observed only; not edited)

A1 owns product/source. This task read `eas.json` / `app.config.ts` / EAS credentials evidence only.

Observed (do not treat as this-task completion of A1):

- `app.config.ts` `android.versionCode` still **4**
- Own-delete files are **present** in the mobile tree (`src/lib/social/deleteOwnedPost.ts` + `watch.tsx` import). That matches the prior v4-final-candidate uncommitted delta. **Not** in v4 AAB `37dde25f`.
- This agent **did not** edit those files and **did not** race A1.

v4 AAB on disk (not rebuilt, not uploaded):

| Field | Value |
|-------|--------|
| Path | `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-37dde25f.aab` |
| Bytes | `102255810` |
| EAS id | `37dde25f-5cb8-4245-ab25-4e357217f6f7` |
| SHA256 (prior verified) | `C2CD78E0C14B46D02BECDA0C5CBC364F40B8A161832B85FF9FFCEE7E418283E6` |
| Play upload | **NO** |

Also on disk (not candidates): `26a60f53` (v3), `86c0d773` (v2). **No `.apk`** under `umtuba-mobile`.

---

## 8 — Device-install path after a **future** authorized v5 build

Intended order after Central `V5_BUILD_GO` produces a production AAB (versionCode **5**). **None of these are usable on this Desktop today.**

| Path | What it needs | This Desktop 2026-08-14 |
|------|----------------|-------------------------|
| **Play Internal** | Explicit **upload GO** (not this message). `submit` track already `internal`. Same production keystore. Operator/device with Play Internal access | **BLOCKED** — no v5 AAB; upload forbidden; no device here to confirm install |
| **Closed Testing** | Explicit upload GO + testers opted in. Does **not** replace device QA. Opted-in count still **UNKNOWN** (A2 Closed Testing packet) | **BLOCKED** — no v5; no upload; opted-in unproven; no device |
| **APK** | Production profile emits **AAB only**. Universal APK via `bundletool` + **Java** from the **v5** AAB. Preview/dev APK profiles are **not** the candidate | **BLOCKED** — no v5 AAB; **no APK**; **no Java**; **no bundletool** |
| **ADB** | `adb` + USB/emulator Android + an APK (or Play-installed v5) | **BLOCKED** — `adb` not on PATH; `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` **ABSENT**; no emulator process; no Android phone in PnP |

PnP this session: Samsung **printer** (`Samsung M267x 287x Series`) and Samsung **SSD** (`SAMSUNG MZALQ256HAJD-000L1`). USB Composite devices are not an Android handset. **PHYSICAL_DEVICE_AVAILABLE = NO.**

Re-verify vs A1 v4 runtime QA (same machine, same day): **NO adb, NO java, NO bundletool, NO APK, NO device** — **unchanged**.

**DEVICE_INSTALL_PATH = NONE_USABLE_ON_THIS_DESKTOP**  
**DEVICE_QA_READY = NO**

Do **not** claim device QA without installation. Do **not** sideload v4. Do **not** use a preview APK as a stand-in for the production-signed v5 candidate.

### Safest future install (not performed)

1. Central sends explicit `V5_BUILD_GO` in the user message. A1 source frozen (UGC + own-delete). No file race.  
2. One EAS `production` Android cloud build (existing `p6De1DDtE_`; remote autoIncrement → **5**).  
3. Device QA of **that** artifact: operator attaches a phone **and** either (a) explicit GO to upload the **v5** AAB to Play **Internal**, or (b) install Java + `bundletool`, extract a universal APK from the **v5** AAB, then ADB.  
4. Closed Testing is a later Play-policy path, not the first device-QA path. Do not Apply for production from this prep.

---

## 9 — Quality / mutations this session

| Check | Result |
|-------|--------|
| Mobile product / `app.config.ts` / `eas.json` edited | **NO** |
| `docs/ai/CURRENT_TASK.md` | **NOT WRITTEN** (A1 owns) |
| `PROJECT_STATE` / `SESSION_HANDOFF` | **NOT WRITTEN** |
| Commit / push | **NO** |
| EAS build / submit | **NO** |
| Play Console | **NOT OPENED / NOT MUTATED** |
| Live / Stripe / migrations / secrets printed | **NO** |
| Files written | **this closeout only** |

---

## 10 — Files changed (this task)

- `docs/ops/closeout/DESKTOP_A2_ANDROID_V5_BUILD_DEVICE_PATH_PREP_V1.md` — **this file only**

---

## Blockers

1. **`V5_BUILD_GO` not received** — this message and docs. Do not start EAS.  
2. **A1 owns source** — do not increment `versionCode`; do not race own-delete / UGC edits.  
3. **No install path on this Desktop** — no adb, no Java, no bundletool, no APK, no Android device. Device QA cannot be claimed.  
4. **v4 must not be uploaded** — Play still versionCode 3; v4 is not the final candidate.  
5. **Play Internal / Closed Testing install** requires a later explicit **upload** GO after a v5 AAB exists. Closed Testing opted-in remains UNKNOWN (does not block EAS prep; blocks production-access claims).

---

## Resume / next (not started)

STOP. Wait for Central `V5_BUILD_GO` in a later user message. Then one production EAS build (expected versionCode **5**, existing `p6De1DDtE_`). Then device QA of **that** artifact via Play Internal (upload GO) or bundletool+ADB after operator installs those tools and attaches a phone. Do not rebuild v4. Do not upload v4. Do not Apply for production.

---

## FINAL

```
DESKTOP-A2 REPORT
TASK_ID = DESKTOP_A2_ANDROID_V5_BUILD_DEVICE_PATH_PREP_V1
NEXT_VERSION_CODE = 5
EAS_PRODUCTION_READY = YES
SIGNING_READY = YES
ENV_READY = YES
V5_BUILD_GO_RECEIVED = NO
V5_BUILD_PERFORMED = NO
V5_BUILD_ID =
V5_AAB =
DEVICE_INSTALL_PATH = NONE_USABLE_ON_THIS_DESKTOP
DEVICE_QA_READY = NO
BLOCKERS = V5_BUILD_GO absent; A1 owns source (do not race); no adb/java/bundletool/APK/device on Desktop; v4 must not be uploaded; Play Internal/Closed Testing install requires a later explicit upload GO after a v5 artifact exists
```

STOP.
