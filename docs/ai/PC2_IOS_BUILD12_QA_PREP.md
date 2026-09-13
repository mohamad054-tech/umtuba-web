# PC2 iOS BUILD 12 — session QA prep (P0 only)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD12_SESSION_QA_V1
DATE = 2026-08-17
PHASE = P0 PREP ONLY — DO NOT START DEVICE QA
MODE = WAITING_FOR_LATER_DEVICE_QA_GO
DEVICE = physical iPhone 13 (later; not this turn)
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 12
AUTHORIZED_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
EAS_BUILD_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
EAS_SUBMIT_ID = d87be758-6e5c-4c92-98e3-44f394db440f
TESTFLIGHT_BUILD = 12
BUILD12_TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE13_INSTALL = NOT_STARTED
BUILD12_INSTALLED = NO
DEVICE_QA_EXECUTED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD11_RETESTED_AS_BUILD12 = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
EXPO_MEDIA_LIBRARY = 57.0.3
PLAINTEXT_PASSWORD = NO
```

This prep is **Build 12 only**. Do **not** test Build 11 as Build 12.
Do **not** fall back to Build 10 (REJECTED_BURNED) / 9 / 8 / 7 / 6 / 5 / 4.
Do **not** invent PASS.

Phase 1 built TestFlight **1.0.0 (12)** from Central SHA
`7638487d1412f070e19285fc434362b47a359ea5`. EAS build is
`FINISHED`. ASC now lists **1.0.0 (12)** internal `in beta testing`.
That is **not** an iPhone install PASS.

This prep turn does **not** start P1–P4 and does **not** ask the
operator to install. Parent must GO device QA in a later turn.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD12_AVAILABLE = YES_INTERNAL
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

All authorized fields (untested — Build 12 not installed):

```text
LAUNCH_SMOKE = NOT_TESTED
SESSION_PERSIST_COLD = NOT_TESTED
SESSION_PERSIST_BACKGROUND = NOT_TESTED
SESSION_PERSIST_SECURESTORE_DESYNC = NOT_TESTED
PLAINTEXT_PASSWORD = NO
SHARE_TWO_CHOICE = NOT_TESTED
SHARE_LINK = NOT_TESTED
SHARE_FILE = NOT_TESTED
CREATE_RESET = NOT_TESTED
CREATE_CANCEL = NOT_TESTED
CREATE_REPLACE = NOT_TESTED
CREATE_FULL_LIBRARY = NOT_TESTED
PLAYBACK = NOT_TESTED
LANGUAGE_SELECTOR = NOT_TESTED
RTL_BACK = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
```

Do **not** upgrade any of these fields this turn.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave
`NOT_TESTED` (except `PLAINTEXT_PASSWORD`, which is source-confirmed):

1. Phase 1 report has `EAS_BUILD_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6`
   built from `7638487d1412f070e19285fc434362b47a359ea5`.
2. TestFlight shows **UMTUBA 1.0.0 (12)** as installable (internal).
3. The physical iPhone 13 has **Build 12** installed — not Build 11,
   not Build 10, not Build 9, not Build 8, not Build 7, not Build 6,
   not Build 5, not Build 4.
4. The operator confirms the TestFlight / App Information build
   number is **12**, not **11** or older.

Until then:

```text
BUILD12_AVAILABLE = YES_INTERNAL
BUILD12_INSTALLED = NO
DEVICE_QA_RESULT = WAITING_FOR_LATER_DEVICE_QA_GO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from EAS `FINISHED`, or from ASC
  “in beta testing”.
- Test Build 11 / 10 / 9 / 8 / 7 / 6 / 5 / 4 and label it Build 12.
- Reopen rejected Build 10 (`4d329e1`).
- Ask the operator to install Build 12 before TestFlight 12 is
  actually available.
- Independently patch shared defects.
- Build, rebuild, re-upload, or Submit for Review / App Store
  Production.
- Modify Android `versionCode`.
- Merge localization Wave 2 / `31db97d`.
- Reopen Store / Learning.
- Overwrite `docs/ai/CURSOR_REPORT.md`.
- Ask for / log / store plaintext passwords or tokens.

---

## Why Build 12 exists

Build 12 source persists the Supabase session across SecureStore /
Keystore desync (durable AsyncStorage copy + hydration clobber guard)
and stamps iOS build **12**. Session QA is a later P3 GO.

First later-turn device action is **install + cold launch**, then
session persistence — not a full product retest of Build 11.

---

## SOURCE_AUTH_NOTE (for later P3)

```text
PLAINTEXT_PASSWORD = NO
PASSWORD_WRITTEN_TO_ASYNCSTORAGE = NO
SESSION_STORAGE = src/lib/supabase/authStorage.ts
CLIENT = src/lib/supabase/client.ts
HYDRATION = src/lib/auth/sessionHydration.ts + AuthContext.tsx
```

App storage writes session/refresh-token JSON only. Password is not
persisted. Later P3 must not ask for or record plaintext passwords.

---

## Operator install steps (PREPARED — do not run this turn)

Windows cannot push the IPA. Install is iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for later device-QA GO

```text
WAIT_FOR = later device-QA GO (TestFlight 1.0.0 (12) is now installable)
EAS_BUILD_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
EAS_SUBMIT_ID = d87be758-6e5c-4c92-98e3-44f394db440f
SOURCE_SHA_REQUIRED = 7638487d1412f070e19285fc434362b47a359ea5
TESTFLIGHT_1.0.0_12 = YES_INTERNAL
DO_NOT_INSTALL_THIS_TURN = YES
DO_NOT_INSTALL_BUILD_11 = YES
DO_NOT_INSTALL_BUILD_10 = YES
DO_NOT_INSTALL_BUILD_9 = YES
DO_NOT_INSTALL_BUILD_8 = YES
DO_NOT_INSTALL_BUILD_7 = YES
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`.

### 2. Confirm it is Build 12, not 11 / 10 / 9 / 8 / 7

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 12 |
| --- | --- |
| **1.0.0 (12)** | **1.0.0 (11)** |
| Build **12** | **1.0.0 (10)** (REJECTED_BURNED) / **(9)** / **(8)** / **(7)** |

If the page still shows **(11)** (or older):

- Do **not** install or “update”.
- Do **not** start launch smoke or session QA.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_11` (or `_10` / `_9` / `_8`).

### 3. Install or update to 1.0.0 (12)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0 (12)**.
- Only then open the app for cold-launch / session QA.

### 4. First later-turn gate: cold launch, then session

Do not start login/session QA until Build 12 is confirmed installed.
Never ask for or record plaintext passwords.

---

## Safety

- Operator install asked this turn = **NO**.
- App Store Production submitted = **NO**.
- Android versionCode touched = **NO**.
- `CURSOR_REPORT.md` overwritten = **NO**.
