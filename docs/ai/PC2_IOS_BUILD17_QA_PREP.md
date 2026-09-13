# PC2 iOS BUILD 17 — TestFlight device QA prep (editor exit FAIL)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS17_BUILD_TESTFLIGHT_DEVICE_QA_V1
DATE = 2026-08-20
PHASE = DEVICE QA — VIDEO EDITOR EXIT FAIL
MODE = RECORD_ONLY — WAITING FOR CENTRAL EDITOR-EXIT FIX
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 17
AUTHORIZED_SOURCE_SHA = f66f15c81772e671da85f04333b1fbb26b9e54a5
SOURCE_SHA = f66f15c81772e671da85f04333b1fbb26b9e54a5
EAS_BUILD_ID = b65d2d81-13f2-43b5-b6c6-fc515344f03c
EAS_SUBMIT_ID = bb5802a2-509e-4bf8-93e4-af3b678e185f
TESTFLIGHT_BUILD = 17
BUILD17_TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE_INSTALL = YES
BUILD17_INSTALLED = YES
DEVICE_QA_EXECUTED = PARTIAL
DEVICE_QA_RESULT = FAIL
VIDEO_EDITOR_OPEN = PASS
VIDEO_EDITOR_EXIT_TO_PUBLISH = FAIL
CREATE_PUBLISH = BLOCKED_BY_EDITOR_UI
SEVERITY = P0
IOS17_READY = NO
REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD16_RETESTED_AS_BUILD17 = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = YES
EXPO_MEDIA_LIBRARY = 57.0.3
PLAINTEXT_PASSWORD = NO
IPAD_SUPPORT = DISABLED
IPHONE_ONLY = YES_SOURCE_AND_EXPO_CONFIG
```

This prep is **Build 17 only**. Do **not** test Build 16 as Build 17.
Do **not** fall back to Build 16 / 15 / 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7.
Do **not** invent PASS. Do **not** start Watch / Create / editor QA
until TestFlight **1.0.0 (17)** is actually installed.

Phase 1 built TestFlight **1.0.0 (17)** from Central SHA
`f66f15c81772e671da85f04333b1fbb26b9e54a5`. EAS build is
`FINISHED`. ASC now lists **1.0.0 (17)** internal `in beta testing`.
TestFlight **1.0.0 (17)** is installed on a physical iPhone 13.
Official device QA: editor **opens**, editor **exit to publish
fails**. See `docs/ai/PC2_IOS_BUILD17_EDITOR_EXIT_FAIL.md`.
Do **not** invent PASS from the source header Done string.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD17_AVAILABLE = YES_INTERNAL
BUILD17_INSTALLED = YES
DEVICE_QA_RESULT = FAIL
VIDEO_EDITOR_OPEN = PASS
VIDEO_EDITOR_EXIT_TO_PUBLISH = FAIL
CREATE_PUBLISH = BLOCKED_BY_EDITOR_UI
SEVERITY = P0
APP_STORE_PRODUCTION_SUBMITTED = NO
REVIEW_SUBMITTED = NO
IOS17_READY = NO
BLOCKERS = VIDEO_EDITOR_EXIT_TO_PUBLISH_FAIL; CREATE_PUBLISH_BLOCKED_BY_EDITOR_UI
FINDING = docs/ai/PC2_IOS_BUILD17_EDITOR_EXIT_FAIL.md
QA_REPORT = docs/ai/PC2_IOS_BUILD17_QA_REPORT.md
```

Authorized device fields:

```text
EDITOR = FAIL_EXIT
SOUND_LIBRARY = NOT_STARTED
CHECKBOX = NOT_STARTED
NAV_ICONS = NOT_STARTED
PUBLISHED_TIMESTAMP = NOT_STARTED
WATCH_COMPOSITE = NOT_STARTED
SHARE_EXPORT_BEHAVIOR = NOT_STARTED
LAUNCH_SMOKE = NOT_STARTED
WATCH = NOT_STARTED
CREATE = BLOCKED_BY_EDITOR_UI
SHARE = NOT_STARTED
CRASH_SANITY = NOT_STARTED
PLAINTEXT_PASSWORD = NO
```

Do **not** invent PASS for untested surfaces. Do **not** score the
source header `Done` string as a device PASS. Editor-exit investigation:
`docs/ai/PC2_IOS_BUILD17_EDITOR_EXIT_FAIL.md`.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave
`NOT_STARTED`:

1. Phase 1 report has `EAS_BUILD_ID = b65d2d81-13f2-43b5-b6c6-fc515344f03c`
   built from `f66f15c81772e671da85f04333b1fbb26b9e54a5`.
2. TestFlight shows **UMTUBA 1.0.0 (17)** as installable (internal).
3. The physical iPhone has **Build 17** installed — not Build 16 or older.
4. The operator confirms the TestFlight / App Information build
   number is **17**, not **16** or older.

Install gate is **closed** (physical iPhone 13 / TestFlight 1.0.0 (17)).
Editor-exit finding is recorded. Remaining product fields stay
`NOT_STARTED` unless the operator actually exercises them.

```text
BUILD17_AVAILABLE = YES_INTERNAL
BUILD17_INSTALLED = YES
DEVICE_QA_RESULT = FAIL
BLOCKERS = VIDEO_EDITOR_EXIT_TO_PUBLISH_FAIL; CREATE_PUBLISH_BLOCKED_BY_EDITOR_UI
```

Forbidden until the gate is closed:

- Declare PASS from source, from EAS `FINISHED`, or from ASC
  “in beta testing”.
- Test Build 16 / 15 / 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7 and label it Build 17.
- Invent PASS for Watch / Create / editor / sound library / checkbox /
  nav icons / published timestamp / composite / share-export.
- Independently patch shared defects.
- Submit for Review / Add for Review / App Store Production.
- Modify Android `versionCode`.
- Manufacture or upload iPad screenshots.
- Reopen Store / Learning.
- Overwrite `docs/ai/CURSOR_REPORT.md`.
- Ask for / log / store plaintext passwords or tokens.

---

## Why Build 17 exists (source presence only)

One Central commit on top of Build 16. Source advertises:

- iPhone-only iOS (`supportsTablet: false`)
- Create editor + sound library + Terms checkbox
- Larger tab-bar icons
- Server `created_at` as the visible publish time
- Watch composite overlays from `media_pipeline`

That list is **not** a device PASS. First operator action is
**install + confirm 1.0.0 (17)**.

---

## Operator install steps (COMPLETED — finding recorded)

Windows cannot push the IPA. Install is iPhone-only via TestFlight.

### 1. Open TestFlight on the iPhone

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`.

### 2. Confirm it is Build 17, not 16 or older

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 17 |
| --- | --- |
| **1.0.0 (17)** | **1.0.0 (16)** or older |

If the page still shows **(16)** (or older):

- Do **not** install or “update”.
- Do **not** start editor / Watch / Create QA.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_16` (or the older number).

### 3. Install or update to 1.0.0 (17)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0 (17)**.
- Only then open the app.

### 4. After install (later device-QA turn)

Do not start product gates until Build 17 is confirmed installed.
Primary later checks (still `NOT_STARTED` now):

| Field | What to look at (after install only) |
| --- | --- |
| `NAV_ICONS` | Watch / Discover / Create / Messages / Profile glyphs are recognizable and tappable |
| `EDITOR` | Create editor opens from a picked library video; usable without adding music |
| `SOUND_LIBRARY` | Optional sound sheet; Create still works if no sound is added |
| `CHECKBOX` | Terms/UGC ack checkbox required before publish |
| `PUBLISHED_TIMESTAMP` | Visible time is server `created_at`, not device clock |
| `WATCH_COMPOSITE` | Published overlays/trim appear on Watch if the clip had them |
| `SHARE_EXPORT_BEHAVIOR` | Share/export of an edited clip — only if the operator naturally reaches it |

Never ask for or record plaintext passwords. Do not Add for Review.

---

## Operator return block (after install)

```text
OPERATOR_DEVICE = physical iPhone
OPERATOR_ACTION = INSTALL_TESTFLIGHT_1.0.0_17
WHY_REQUIRED = Windows cannot install the IPA; TestFlight 17 is internal and ready; device QA must not start on Build 16
BUILD17_INSTALLED = YES
TESTFLIGHT_SHOWS = 1.0.0 (17)
EDITOR = FAIL_EXIT
VIDEO_EDITOR_OPEN = PASS
VIDEO_EDITOR_EXIT_TO_PUBLISH = FAIL
CREATE_PUBLISH = BLOCKED_BY_EDITOR_UI
SOUND_LIBRARY = NOT_STARTED
CHECKBOX = NOT_STARTED
NAV_ICONS = NOT_STARTED
PUBLISHED_TIMESTAMP = NOT_STARTED
WATCH_COMPOSITE = NOT_STARTED
SHARE_EXPORT_BEHAVIOR = NOT_STARTED
```

---

## Safety

- Operator install completed. Editor-exit FAIL is recorded. Central owns the next SHA / binary.
- App Store Production submitted = **NO**.
- Review submitted = **NO**.
- Android versionCode command run = **NO**.
- `CURSOR_REPORT.md` overwritten = **NO**.
- iPad screenshots manufactured = **NO**.
