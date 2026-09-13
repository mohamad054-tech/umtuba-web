# PC2 iOS BUILD 18 — TestFlight editor targeted retest (text flow FAIL)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS18_EDITOR_TARGETED_RETEST_V1
DATE = 2026-08-20
PHASE = DEVICE QA — EDITOR TEXT FLOW FAIL — STOP REMAINING PUBLISH QA
MODE = RECORD_ONLY — NO PATCH — NO BUILD 19 — NO REVIEW SUBMIT
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 18
AUTHORIZED_SOURCE_SHA = a70a399d3e68780688094615d95b248a91a6120f
SOURCE_SHA = a70a399d3e68780688094615d95b248a91a6120f
EAS_BUILD_ID = 30fb2519-2677-470b-a62f-6b9653d22ef3
EAS_SUBMIT_ID = 6a4ef121-1141-43ef-a14a-35d3e68fc8ce
TESTFLIGHT_BUILD = 18
BUILD18_TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE_INSTALL = YES
BUILD18_INSTALLED = YES
DEVICE_QA_EXECUTED = PARTIAL
DEVICE_QA_RESULT = FAIL
TEXT_OVERLAY_RENDER = PASS
TEXT_DRAG = FAIL
KEYBOARD_DISMISS = FAIL
BUILD18_EDITOR_TEXT_FLOW = FAIL
EDITOR_OPEN = PASS
VIDEO_EDITOR_OPEN = PASS
VIDEO_EDITOR_EXIT_TO_PUBLISH = NOT_STARTED
CREATE_PUBLISH = BLOCKED_BY_EDITOR_TEXT_FLOW
IOS18_READY = NO
REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_COMMAND_RUN = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD17_RETESTED_AS_BUILD18 = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
EXPO_MEDIA_LIBRARY = 57.0.3
PLAINTEXT_PASSWORD = NO
IPAD_SUPPORT = DISABLED
IPHONE_ONLY = YES_SOURCE_AND_EXPO_CONFIG
IPAD_SCREENSHOT_REQUIRED = NOT_SEEN_IN_EAS_METADATA
```

This prep is **Build 18 only**. Do **not** test Build 17 as Build 18.
Do **not** fall back to Build 17 / 16 / 15 / 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7.
Do **not** invent PASS.

Phase 1 built TestFlight **1.0.0 (18)** from Central SHA
`a70a399d3e68780688094615d95b248a91a6120f`. Official device QA on a
physical iPhone 13 recorded `BUILD18_EDITOR_TEXT_FLOW = FAIL`.
Remaining publish QA is **stopped**.

Build 17 `f66f15c` / **1.0.0 (17)** is **SUPERSEDED**.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD18_AVAILABLE = YES_INTERNAL
BUILD18_INSTALLED = YES
DEVICE_QA_RESULT = FAIL
TEXT_OVERLAY_RENDER = PASS
TEXT_DRAG = FAIL
KEYBOARD_DISMISS = FAIL
BUILD18_EDITOR_TEXT_FLOW = FAIL
EDITOR_OPEN = PASS
VIDEO_EDITOR_OPEN = PASS
VIDEO_EDITOR_EXIT_TO_PUBLISH = NOT_STARTED
CREATE_PUBLISH = BLOCKED_BY_EDITOR_TEXT_FLOW
APP_STORE_PRODUCTION_SUBMITTED = NO
REVIEW_SUBMITTED = NO
IOS18_READY = NO
BLOCKERS = TEXT_DRAG_FAIL; KEYBOARD_DISMISS_FAIL; BUILD18_EDITOR_TEXT_FLOW_FAIL; REMAINING_PUBLISH_QA_STOPPED
NEXT_ACTION = REPORT_TO_CENTRAL_FOR_SINGLE_FIX_SHA
```

Official editor text-flow fields (authoritative). Do **not** invent
PASS. Remaining publish QA is **stopped**.

```text
TEXT_OVERLAY_RENDER = PASS
TEXT_DRAG = FAIL
KEYBOARD_DISMISS = FAIL
BUILD18_EDITOR_TEXT_FLOW = FAIL
```

Authorized device fields:

```text
EDITOR_OPEN = PASS
EDITOR = FAIL_TEXT_FLOW
SOUND_LIBRARY = NOT_STARTED
CHECKBOX = NOT_STARTED
NAV_ICONS = NOT_STARTED
PUBLISHED_TIMESTAMP = NOT_STARTED
WATCH_COMPOSITE = NOT_STARTED
SHARE_EXPORT_BEHAVIOR = NOT_STARTED
LAUNCH_SMOKE = NOT_STARTED
WATCH = NOT_STARTED
CREATE = BLOCKED_BY_EDITOR_TEXT_FLOW
SHARE = NOT_STARTED
CRASH_SANITY = NOT_STARTED
PLAINTEXT_PASSWORD = NO
```

RCA: `docs/ai/PC2_IOS_BUILD18_EDITOR_TEXT_FLOW_FAIL.md`.
QA report: `docs/ai/PC2_IOS_BUILD18_QA_REPORT.md`.

Do **not** invent PASS for untested surfaces. Do **not** score the
source footer Continue / header Done strings as a device PASS.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave
`NOT_STARTED`:

1. Phase 1 report has `EAS_BUILD_ID = 30fb2519-2677-470b-a62f-6b9653d22ef3`
   built from `a70a399d3e68780688094615d95b248a91a6120f`.
2. TestFlight shows **UMTUBA 1.0.0 (18)** as installable (internal).
3. The physical iPhone has **Build 18** installed — not Build 17 or older.
4. The operator confirms the TestFlight / App Information build
   number is **18**, not **17** or older.

Install gate is **closed** (Build 18 installed). Official editor
text-flow result is **FAIL**. Do not continue remaining publish QA
on this binary.

```text
BUILD18_AVAILABLE = YES_INTERNAL
BUILD18_INSTALLED = YES
DEVICE_QA_RESULT = FAIL
BUILD18_EDITOR_TEXT_FLOW = FAIL
BLOCKERS = TEXT_DRAG_FAIL; KEYBOARD_DISMISS_FAIL; REMAINING_PUBLISH_QA_STOPPED
```

Forbidden until the gate is closed:

- Declare PASS from source, from EAS `FINISHED`, or from ASC
  “in beta testing”.
- Test Build 17 / 16 / 15 / 14 / 13 / 12 / 11 / 10 / 9 / 8 / 7 and label it Build 18.
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

## Why Build 18 exists (source presence only)

One Central commit on top of superseded Build 17. Source advertises:

- iPhone-only iOS (`supportsTablet: false`)
- Sticky footer Continue CTA plus header Done
- Overlay drag
- iOS buildNumber 18

That list is **not** a device PASS. First operator action is
**install + confirm 1.0.0 (18)**. Do **not** open the app yet.

---

## Operator install steps (DO NOT OPEN YET)

Windows cannot push the IPA. Install is iPhone-only via TestFlight.

### 1. Open TestFlight on the iPhone

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`.

### 2. Confirm it is Build 18, not 17 or older

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 18 |
| --- | --- |
| **1.0.0 (18)** | **1.0.0 (17)** or older |

If the page still shows **(17)** (or older):

- Do **not** install or “update”.
- Do **not** start editor / Watch / Create QA.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_17` (or the older number).

### 3. Install or update to 1.0.0 (18)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0 (18)**.
- **Do not open the app yet.** Write back whether it is installed.

### 4. After install (later device-QA turn)

Do not start product gates until Build 18 is confirmed installed.
Primary later checks (still `NOT_STARTED` now):

| Field | What to look at (after install only) |
| --- | --- |
| `EDITOR_OPEN` | Create editor opens from a picked library video |
| `VIDEO_EDITOR_EXIT_TO_PUBLISH` | Sticky footer Continue / Done returns to publish |
| `NAV_ICONS` | Watch / Discover / Create / Messages / Profile glyphs are recognizable and tappable |
| `SOUND_LIBRARY` | Optional sound sheet; Create still works if no sound is added |
| `CHECKBOX` | Terms/UGC ack checkbox required before publish |
| `PUBLISHED_TIMESTAMP` | Visible time is server `created_at`, not device clock |
| `WATCH_COMPOSITE` | Published overlays/trim appear on Watch if the clip had them |
| `SHARE_EXPORT_BEHAVIOR` | Share/export of an edited clip — only if the operator naturally reaches it |

Never ask for or record plaintext passwords. Do not Add for Review.

---

## Operator return block (after install only)

```text
OPERATOR_DEVICE = physical iPhone 13
OPERATOR_ACTION = INSTALL_TESTFLIGHT_1.0.0_18_DO_NOT_OPEN
WHY_REQUIRED = Windows cannot install the IPA; TestFlight 18 is internal and ready; device QA must not start on Build 17; do not open the app until install is confirmed
BUILD18_INSTALLED = (operator writes YES or NO)
TESTFLIGHT_SHOWS = (operator writes version line)
EDITOR_OPEN = NOT_STARTED
VIDEO_EDITOR_OPEN = NOT_STARTED
VIDEO_EDITOR_EXIT_TO_PUBLISH = NOT_STARTED
CREATE_PUBLISH = NOT_STARTED
EDITOR = NOT_STARTED
SOUND_LIBRARY = NOT_STARTED
CHECKBOX = NOT_STARTED
NAV_ICONS = NOT_STARTED
PUBLISHED_TIMESTAMP = NOT_STARTED
WATCH_COMPOSITE = NOT_STARTED
SHARE_EXPORT_BEHAVIOR = NOT_STARTED
```

---

## Safety

- Record only. No patch. No Build 19. Remaining publish QA stopped.
- App Store Production submitted = **NO**.
- Review submitted = **NO**.
- Android versionCode command run = **NO**.
- `CURSOR_REPORT.md` overwritten = **NO**.
- iPad screenshots manufactured = **NO**.
