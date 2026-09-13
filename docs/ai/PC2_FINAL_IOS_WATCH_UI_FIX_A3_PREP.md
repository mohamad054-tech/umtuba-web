# PC2 FINAL iOS WATCH UI FIX — A3 surgical device QA prep

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_FINAL_IOS_WATCH_UI_FIX_A3_V1
DATE = 2026-08-17
WAVE = PC2_FINAL_IOS_WATCH_UI_FIX_WAVE
PHASE = PREP ONLY
MODE = SURGICAL_QA_PREP / WAITING_FOR_A2
DEVICE = iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = REPLACEMENT_NOT_BUILD_7
SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
A1_COMMIT = 658936e18718606a3b3d30753e717d7fe9e86a18
A1_BRANCH = origin/fix/watch-ui-overlap-progress-duration-v1
BUILD7_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
BUILD7_EAS_BUILD_ID = 67147f93-9c70-4631-8257-ff80628a49f6
TESTFLIGHT_BUILD = NOT_INSTALLED
TESTFLIGHT_AVAILABLE = NO
EAS_BUILD_ID = NOT_AVAILABLE
EAS_SUBMIT_ID = NOT_AVAILABLE
IPHONE13_INSTALL = NOT_STARTED
REPLACEMENT_BUILD_INSTALLED = NO
BUILD7_STILL_ON_DEVICE = UNKNOWN_DO_NOT_TEST
DEVICE_QA_EXECUTED = NO
SURGICAL_DEVICE_QA = WAITING_FOR_A2
APP_STORE_FINAL_GATE_READY = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD7_RETESTED_AS_REPLACEMENT = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

This prep is **replacement-binary only**. A2 is building a new iOS
binary from SOURCE_SHA `658936e18718606a3b3d30753e717d7fe9e86a18`.
That SHA is **not** Build 7 (`74188be`).

Do **not** test Build 7. Do **not** declare any Build 7 FAIL or PASS
as a replacement-build result. Do **not** invent PASS. Do **not**
claim any device QA until the actual replacement build is installed
on the physical iPhone 13.

This turn has **no** `EAS_BUILD_ID` and **no** installable replacement
build. Checklist only.

Do **not** ask the operator to install this turn.

---

## Current status (this turn)

```text
DEVICE = iPhone 13
TESTFLIGHT_BUILD = NOT_INSTALLED
LOWER_RIGHT_TEXT_OVERLAP = NOT_TESTED
RTL_PROGRESS_BAR = NOT_TESTED
LTR_PROGRESS_BAR = NOT_TESTED
VIDEO_DURATION_DISPLAY = NOT_TESTED
PLAYBACK_UNAFFECTED = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
SURGICAL_DEVICE_QA = WAITING_FOR_A2
APP_STORE_FINAL_GATE_READY = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WAITING_FOR_REPLACEMENT_BUILD
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

Do **not** upgrade any of these fields this turn.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave
`NOT_TESTED`:

1. A2 reports success with a real `EAS_BUILD_ID` built from
   `658936e18718606a3b3d30753e717d7fe9e86a18`.
2. Parent resumes this track with that `EAS_BUILD_ID` and the
   TestFlight build number.
3. TestFlight shows **UMTUBA 1.0.0 (N)** as installable (internal),
   where **N is not 7** and is the A2 replacement build.
4. The physical iPhone 13 has **that replacement build** installed —
   not Build 7, not Build 6, not Build 5, not Build 4.
5. The operator confirms the TestFlight / App Information build
   number matches A2, and is **not 7**.

Until then:

```text
SURGICAL_DEVICE_QA = WAITING_FOR_A2
REPLACEMENT_BUILD_INSTALLED = NO
TESTFLIGHT_BUILD = NOT_INSTALLED
APP_STORE_FINAL_GATE_READY = NO
BLOCKERS = WAITING_FOR_REPLACEMENT_BUILD
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from A1 “FINISHED”, or from A2 “FINISHED”.
- Test Build 7 / 6 / 5 / 4 and label it the replacement.
- Copy Build 7 overlap / progress / 8200s FAIL into replacement fields.
- Ask the operator to install before A2 succeeds and parent resumes.
- Rerun the full localization matrix.
- Rerun RTL Back, Saved, Follow, Messages, Session, Background/Resume,
  Create/upload, or Open-after-upload (unless this patch is later
  proven to touch those, or new regression evidence appears).
- Publish / upload a video as part of duration QA.
- Invent a playback fix or a new UI redesign.
- Build, rebuild, re-upload, or Submit for Review / App Store
  Production.
- Modify Android `versionCode`.
- Reopen Store / Learning.
- Overwrite `docs/ai/CURSOR_REPORT.md`.

---

## Why this gate exists (context only — not a replacement result)

Build 7 on the physical iPhone 13 (`74188be`, TestFlight 1.0.0 (7))
left three open Watch / Create UI defects. Those results are
**historical**. Do **not** copy them into this track’s result fields.

| Defect | Build 7 finding | A1 source fix (not device PASS) |
| --- | --- | --- |
| Lower-right Watch overlap | FAIL — Delete / Supprimer / Eliminar overlaps duration clock. Shared layout, not translation length. | Rail lift 52→84, label max 72pt, 56pt physical-right clock gutter. |
| RTL progress bar | FAIL — main thumb moves with playback; second cyan segment from the opposite side. Playback itself still worked. | Scrub locked `direction:ltr`; fill `left:0` + shared percent; thumb same physical-left percent. |
| Selected-video duration | FAIL — IMG_0008.MOV (~8.2s, 9.5 MB) showed `8200s` on Create after select. Upload later succeeded. | `pickerDurationToMs`: values ≥1000 stay ms. Create label `8s`. Publish/upload path untouched. |

A1 SOURCE_SHA `658936e` is in source only. Source is **not** a device
PASS. Re-prove on iPhone 13 + the A2 replacement binary only.

---

## Authorized scope (later, after install)

Test **only** these five checks, plus a one-line new-regression watch:

1. Lower-right Watch overlap
2. RTL progress bar
3. LTR progress bar
4. Selected-video duration display (Create **select** only)
5. Representative playback unaffected

```text
LOWER_RIGHT_TEXT_OVERLAP = NOT_TESTED
RTL_PROGRESS_BAR = NOT_TESTED
LTR_PROGRESS_BAR = NOT_TESTED
VIDEO_DURATION_DISPLAY = NOT_TESTED
PLAYBACK_UNAFFECTED = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
```

Duration display **is** on Create select. That specific check is
authorized. Full upload / publish / Open-after-upload is **not**.

---

## Explicitly out of scope (do not rerun)

Do **not** rerun unless this patch is later shown to touch the
surface, or new regression evidence appears on the replacement
binary:

| Surface | Prior Build 7 status (context only) | This track |
| --- | --- | --- |
| Full localization matrix (AR/DE/FR/ES/PT/EN) | COMPLETE_WITH_OPEN_UI_DEFECTS | Do not rerun |
| RTL Back gate | PASS on Build 7 | Do not rerun |
| Saved | PASS (prior) | Do not rerun |
| Follow | PASS (prior) | Do not rerun |
| Messages send | PASS (prior) | Do not rerun |
| Session / force-quit reopen | PASS (prior) | Do not rerun |
| Background / Resume | PASS (prior) | Do not rerun |
| Create / upload / publish | PASS (prior) | Do not rerun |
| Open-after-upload | PASS (prior) | Do not rerun |
| Unsupported locale fallback | NOT_SAFELY_TESTED | Do not start |
| Messages receive | NOT_TESTED | Do not start |
| App Store Production submit | NO | Do not submit |

If a surgical check itself exposes a new crash, dead control, or
broken playback, record `NEW_REGRESSION` and stop. Do not expand
into a full matrix.

---

## Operator install steps (PREPARED — do not run this turn)

Use these **only** after parent resume includes `EAS_BUILD_ID` and
TestFlight shows the A2 replacement build. Windows cannot push the
IPA. Install is iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for A2 + TestFlight upload

```text
WAIT_FOR = A2 success + parent resume with EAS_BUILD_ID
EAS_BUILD_ID = NOT_AVAILABLE
EAS_SUBMIT_ID = NOT_AVAILABLE
SOURCE_SHA_REQUIRED = 658936e18718606a3b3d30753e717d7fe9e86a18
TESTFLIGHT_REPLACEMENT = NO
DO_NOT_INSTALL_YET = YES
DO_NOT_INSTALL_BUILD_7 = YES
DO_NOT_INSTALL_BUILD_6 = YES
DO_NOT_INSTALL_BUILD_5 = YES
DO_NOT_INSTALL_BUILD_4 = YES
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`. Do not
  invent a redemption code. Do not start External Beta.

### 2. Confirm it is the replacement, not Build 7

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as the replacement |
| --- | --- |
| **1.0.0 (N)** where N = A2 replacement build number | **1.0.0 (7)** |
| Build **N** matching A2 | **1.0.0 (6)** / **(5)** / **(4)** / **(3)** |

If the page still shows **(7)** (or older):

- Do **not** install or “update”.
- Do **not** start the surgical list.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_7` (or `_6` / `_5` / `_4`).

### 3. Install or update to the replacement

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0**, build **N** (A2 number, not 7).
- If the installed build is still 7, 6, 5, or 4: stop.
  `IPHONE13_INSTALL = FAIL_WRONG_BUILD`.

### 4. Cold launch once

- Force-quit UMTUBA if it was already open from Build 7 / 6 / 5 / 4.
- Open UMTUBA from TestFlight **Open** (or the home-screen icon
  **after** confirming the replacement build).
- Confirm the app is UMTUBA, not Expo Go.

### 5. Identity check (after install only)

- Stay signed in if already signed in.
- Do **not** delete the account as a first step.
- Do **not** sign out to “prepare” the phone.

---

## Live QA rules (after parent green light only)

The operator is **not** experienced with iPhone settings. When live
QA starts:

1. **One action at a time.** Give one tap. Wait for evidence. Do
   not stack “then also open X”.
2. **Exact tap.** Name the control the operator already knows
   (Watch tab, Create tab, visible delete label, progress bar).
3. **Wait for evidence** before the next step.
4. Record each item as `PASS` / `FAIL` / `BLOCKED` / `NOT_TESTED`
   only from **this** iPhone 13 + replacement-build session.
5. Stay surgical. If a check is FAIL, record it and continue the
   remaining authorized checks unless the app is unusable.

Do **not** treat source-unit PASS (A1 vitest 50) as a device PASS.

---

## Mandatory physical checks (after replacement is installed)

Do **not** execute these this turn. Order is recommended, not a
localization matrix.

### 1. Lower-right Watch overlap

```text
LOWER_RIGHT_TEXT_OVERLAP = NOT_TESTED
```

Later: open **Watch** on a video that shows the owner action rail
(own video preferred so **Delete** / locale delete label is last).
Look at the lower-right overlay: duration clock vs last rail label.

PASS only if:

- Duration clock and delete / last rail label do **not** overlap.
- Duration stays readable; rail labels stay readable.
- No new clip of the clock into the rail column.

FAIL if Delete / Supprimer / Eliminar / Löschen / حذف sits on top
of the duration number, or the clock is unreadable.

One locale is enough if the owner rail is visible (shared layout).
Do **not** walk DE/FR/ES/AR just to re-prove overlap. If the first
locale is PASS, optionally glance a second long-label locale only
if parent asks.

### 2. RTL progress bar

```text
RTL_PROGRESS_BAR = NOT_TESTED
```

Later: Watch in **Arabic RTL**. Play a video. Watch the bottom
scrub (not the volume chip unless it is the same control).

PASS only if:

- **One** cyan fill grows from the **physical left** with playback.
- Thumb sits on the leading edge of that fill.
- No second cyan segment from the right / opposite side.
- Seek still uses the physical bar (optional one tap if safe).

FAIL if a second / reversed cyan segment appears, or fill grows
from the right while the thumb is on the left.

### 3. LTR progress bar

```text
LTR_PROGRESS_BAR = NOT_TESTED
```

Later: Watch in **English LTR** (in-app language; do not change
iPhone system language unless Arabic/English switch is already
available in-app). Play a video.

PASS only if:

- Fill and thumb still grow from the **physical left**.
- No duplicate segment.
- Playback still starts / continues.

Do not treat LTR PASS as a substitute for RTL PASS.

### 4. Selected-video duration display (Create select only)

```text
VIDEO_DURATION_DISPLAY = NOT_TESTED
```

Later: open **Create**. Pick **IMG_0008.MOV** (the same ~8.2s /
9.5 MB clip from Build 7) if it is still in Photos. If that file
is gone, pick another short real clip and record the filename and
the on-screen duration.

PASS only if:

- After select, Create shows a human duration near the real length
  (IMG_0008.MOV → about **8s**, not **8200s**).
- The number is seconds-scale, not thousands of seconds.

FAIL if the label is `8200s` or any other 1000× inflation.

**Stop after the duration label is visible.** Do **not** accept
terms. Do **not** tap Publish. Do **not** upload. Do **not** open
Watch from the success sheet.

### 5. Representative playback unaffected

```text
PLAYBACK_UNAFFECTED = NOT_TESTED
```

Later: on Watch, play **one** already-published real video
(existing feed item is enough). Do not publish a new one.

PASS only if:

- Video starts and plays without a new player error.
- Audio/mute control still works at a glance.
- No crash, black screen, or frozen first frame caused by this
  chrome patch.

This is **not** `PLAYBACK_STABILITY = PASS`. One representative
clip only. Do not reopen the Build 4 intermittent matrix.

### 6. New regression watch (observational, not a matrix)

```text
NEW_REGRESSION = NOT_TESTED
```

Record `NONE_OBSERVED` only if the five checks ran and nothing
outside them broke (crash, dead Watch, Create picker failure,
unusable chrome). Record `YES` + one sentence if a new defect
appears. Do not then expand into Saved / Follow / Messages /
localization unless parent authorizes.

---

## Gate close rule

```text
SURGICAL_DEVICE_QA = PASS
APP_STORE_FINAL_GATE_READY = NOT_DECLARED_BY_THIS_TRACK
```

`SURGICAL_DEVICE_QA` may become `PASS` only when **all** of these
are true on iPhone 13 + the **replacement** build (not 7):

- `REPLACEMENT_BUILD_INSTALLED = YES` (operator confirmed N, not 7)
- `LOWER_RIGHT_TEXT_OVERLAP = PASS`
- `RTL_PROGRESS_BAR = PASS`
- `LTR_PROGRESS_BAR = PASS`
- `VIDEO_DURATION_DISPLAY = PASS`
- `PLAYBACK_UNAFFECTED = PASS`
- `NEW_REGRESSION = NONE_OBSERVED`

This track still does **not** declare App Store release readiness
and does **not** Submit for Review / Production.

Until then:

```text
APP_STORE_FINAL_GATE_READY = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
```

---

## After A2 succeeds (parent resume)

Expected resume payload:

```text
EAS_BUILD_ID = <from A2>
BUILD_SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
APP_VERSION = 1.0.0
BUILD_NUMBER = <replacement, not 7>
TESTFLIGHT_AVAILABLE = YES_INTERNAL | <A2 value>
```

Then, and only then:

1. Ask the operator to install **1.0.0 (N)** using the steps above.
2. Confirm build number **N** on device (not 7, not 6, not 5, not 4).
3. Run the five surgical checks, one action at a time.
4. Keep `APP_STORE_FINAL_GATE_READY = NO` unless parent separately
   authorizes a release gate.
5. Do **not** Submit for Review / Production from this track.

If A2 fails or the replacement is not installable: keep

```text
SURGICAL_DEVICE_QA = WAITING_FOR_A2
BLOCKERS = WAITING_FOR_REPLACEMENT_BUILD
APP_STORE_FINAL_GATE_READY = NO
```

---

## Historical context (do not copy into replacement fields)

```text
BUILD7_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
BUILD7_EAS_BUILD_ID = 67147f93-9c70-4631-8257-ff80628a49f6
BUILD7_WATCH_LOWER_RIGHT_TEXT_OVERLAP = FAIL
BUILD7_WATCH_PROGRESS_BAR_RTL_LAYOUT = FAIL
BUILD7_SELECTED_VIDEO_DURATION_DISPLAY = FAIL
BUILD7_CREATE_DURATION_DISPLAY = FAIL_OR_CONFIRMED_DEFECT_8200S
BUILD7_CREATE_SELECTED_FILE = IMG_0008.MOV
BUILD7_CREATE_SELECTED_SIZE = 9.5_MB
A1_SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
A1_FILES = app/(tabs)/create.tsx; components/WatchVideoCard.tsx; src/lib/video/pickVideo.ts; src/lib/video/pickVideo.test.ts; src/lib/watch/playbackPolicy.ts; src/lib/watch/playbackPolicy.test.ts; src/lib/watch/railLayout.ts; src/lib/watch/railLayout.test.ts
A1_TARGETED_TESTS = PASS_SOURCE_ONLY
A1_DEVICE_QA = NO
```

Build 7 is superseded for these three defects. Do not install it
for this track. Do not finish or reuse a Build 7 device session as
replacement evidence.

---

## What was not done (by design)

- No device install request this turn
- No replacement binary build / submit / Production submit
- No Android `versionCode` change
- Store / Learning not reopened
- No invented device PASS
- `docs/ai/CURSOR_REPORT.md` not overwritten
- `docs/ai/CURRENT_TASK.md` not overwritten
- No surgical field left `NOT_TESTED` was upgraded
- Full localization / RTL Back / Saved / Follow / Messages /
  Session / Background / Create-upload / Open-after-upload not rerun

---

## Return fields (this turn — prep only)

```text
TASK_ID = PC2_FINAL_IOS_WATCH_UI_FIX_A3_V1
DEVICE = iPhone 13
TESTFLIGHT_BUILD = NOT_INSTALLED
LOWER_RIGHT_TEXT_OVERLAP = NOT_TESTED
RTL_PROGRESS_BAR = NOT_TESTED
LTR_PROGRESS_BAR = NOT_TESTED
VIDEO_DURATION_DISPLAY = NOT_TESTED
PLAYBACK_UNAFFECTED = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
SURGICAL_DEVICE_QA = WAITING_FOR_A2
APP_STORE_FINAL_GATE_READY = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WAITING_FOR_REPLACEMENT_BUILD
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
EAS_BUILD_ID = NOT_AVAILABLE
```
