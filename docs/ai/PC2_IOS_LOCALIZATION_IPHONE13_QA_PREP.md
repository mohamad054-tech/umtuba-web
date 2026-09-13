# PC2-A2 iOS LOCALIZATION — iPhone 13 QA prep (Build 6)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_LOCALIZATION_IPHONE13_QA_V1
DATE = 2026-08-16
MODE = PREP_ONLY / WAITING_FOR_A1
DEVICE = PC2 + physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 6
AUTHORIZED_CENTRAL_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
EAS_BUILD_ID = NOT_AVAILABLE
EAS_SUBMIT_ID = NOT_AVAILABLE
TESTFLIGHT_BUILD = NOT_INSTALLED
TESTFLIGHT_AVAILABLE = NO
IPHONE13_INSTALL = NOT_STARTED
BUILD6_INSTALLED = NO
DEVICE_QA_EXECUTED = NO
IOS_LOCALIZATION_DEVICE_QA = WAITING_FOR_A1
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
IOS_ONLY_LOCALIZATION_FORK = NO
PLAYBACK_FIX_INVENTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD5_RETESTED_AS_BUILD6 = NO
BUILD4_RETESTED_AS_BUILD6 = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

This prep **supersedes Build 5**. Do **not** test Build 5. Do **not** declare
any Build 5 result as a Build 6 result. Do **not** invent PASS.

A1 is building TestFlight **1.0.0 (6)** from Central SHA
`c48b4b2898b116a39e90b85221ae1856f446d0a0`. This turn has **no**
`EAS_BUILD_ID` and **no** installable Build 6. Checklist and install steps
are prepared only.

Do **not** ask the operator to install Build 6 this turn.

---

## Current status (this turn)

```text
STATUS = WAITING_FOR_A1
IOS_LOCALIZATION_DEVICE_QA = WAITING_FOR_A1
TESTFLIGHT_BUILD = NOT_INSTALLED
APP_STORE_PRODUCTION_SUBMITTED = NO
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD6_INSTALL
```

Language fields (all untested — A1 not finished, Build 6 not installed):

```text
ARABIC = NOT_TESTED
GERMAN = NOT_TESTED
FRENCH = NOT_TESTED
ENGLISH = NOT_TESTED
SPANISH = NOT_TESTED
PORTUGUESE = NOT_TESTED
DEVICE_LANGUAGE_SUPPORTED = NOT_TESTED
DEVICE_LANGUAGE_UNSUPPORTED_FALLBACK = NOT_TESTED
MANUAL_OVERRIDE = NOT_TESTED
MANUAL_OVERRIDE_PERSIST_RESTART = NOT_TESTED
RESET_OVERRIDE = NOT_TESTED
ENGLISH_LEAKAGE = NOT_TESTED
MISSING_KEYS = NOT_TESTED
RAW_KEYS = NOT_TESTED
UI_OVERFLOW = NOT_TESTED
RTL = NOT_TESTED
DIRECTIONAL_ICONS = NOT_TESTED
TEXT_OVERLAP = NOT_TESTED
```

Build 5 regression-protection fields (all untested on Build 6):

```text
WATCH_PLAYBACK = NOT_TESTED
PLAYBACK_STABILITY = NOT_TESTED
SAVED = NOT_TESTED
SAVE_PERSISTENCE = NOT_TESTED
OTHER_USER_PROFILE = NOT_TESTED
FOLLOW = NOT_TESTED
FOLLOWING = NOT_TESTED
UNFOLLOW = NOT_TESTED
MESSAGES = NOT_TESTED
MESSAGES_OPEN = NOT_TESTED
MESSAGES_SEND = NOT_TESTED
BACK = NOT_TESTED
CREATE_UPLOAD = NOT_TESTED
OPEN_AFTER_UPLOAD = NOT_TESTED
SESSION_PERSISTENCE = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
CRASH_SANITY = NOT_TESTED
```

---

## Gate: what must be true before any device result

All of the following must be true before any language or regression field
may leave `NOT_TESTED`:

1. A1 reports success with a real `EAS_BUILD_ID`.
2. Parent resumes this track with that `EAS_BUILD_ID`.
3. TestFlight shows **UMTUBA 1.0.0 (6)** as installable (internal).
4. The physical iPhone 13 has **Build 6** installed — not Build 5, not Build 4.
5. The operator confirms the TestFlight / App Information build number is
   **6**, not **5** or **4**.

Until then:

```text
IOS_LOCALIZATION_DEVICE_QA = WAITING_FOR_A1
TESTFLIGHT_BUILD = NOT_INSTALLED
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD6_INSTALL
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from A1 “FINISHED”, or from ASC “in beta testing”.
- Test Build 5 or Build 4 and label it Build 6.
- Copy Build 3 / Build 4 / Build 5 PASS or FAIL into Build 6 result fields.
- Ask the operator to install Build 6 before A1 succeeds.
- Treat one later Watch play as playback PASS if intermittent failure returns.
- Invent a backend or client playback fix.
- Build, rebuild, re-upload, or Submit for Review / App Store Production.
- Modify Android `versionCode`.
- Reopen Store / Learning.
- Create an iOS-only localization fork.
- Independently declare App Store release readiness.

---

## Operator install steps (PREPARED — do not run this turn)

Use these **only** after parent resume includes `EAS_BUILD_ID` and TestFlight
shows Build 6. Windows cannot push the IPA. Install is iPhone-only via
TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for A1 + TestFlight upload

```text
WAIT_FOR = A1 success + parent resume with EAS_BUILD_ID
EAS_BUILD_ID = NOT_AVAILABLE
EAS_SUBMIT_ID = NOT_AVAILABLE
TESTFLIGHT_1.0.0_6 = NO
DO_NOT_INSTALL_YET = YES
DO_NOT_INSTALL_BUILD_5 = YES
DO_NOT_INSTALL_BUILD_4 = YES
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`. Do not invent a
  redemption code. Do not start External Beta.

### 2. Confirm it is Build 6, not Build 5 or Build 4

On the TestFlight app page, read the version line **before** tapping Install
or Update:

| Must see | Must not treat as Build 6 |
| --- | --- |
| **1.0.0 (6)** | **1.0.0 (5)** |
| Build **6** | **1.0.0 (4)** or Build **3** or any older build |

If the page still shows **(5)** or **(4)**:

- Do **not** install or “update”.
- Do **not** start the localization or regression list.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_5` or `TESTFLIGHT_STILL_SHOWS_BUILD_4`.

### 3. Install or update to 1.0.0 (6)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version **1.0.0**,
  build **6**.
- If the installed build is still 5 or 4: stop.
  `IPHONE13_INSTALL = FAIL_WRONG_BUILD`.

### 4. Cold launch once

- Force-quit UMTUBA if it was already open from Build 5 or Build 4.
- Open UMTUBA from TestFlight **Open** (or the home-screen icon **after**
  confirming build 6).
- Confirm the app is UMTUBA, not Expo Go.

### 5. Identity check (after install only)

- Stay signed in if already signed in.
- Do **not** delete the account as a first step.
- Do **not** sign out to “prepare” the phone.
- Open own Profile and record name / @username / Sign in before Follow /
  other-user / localization override tests.

---

## Language policy to verify later (after Build 6 is installed)

Resolution order on device (do not invent a different order):

1. **Saved user override** (Settings language picker, if the user chose one).
2. **Otherwise device / system language** (iPhone Settings → General →
   Language & Region).
3. **Otherwise English fallback**.

Supported locales (exact set — do not add or drop):

```text
SUPPORTED = ar, en, fr, es, de, pt
```

| Code | Direction | Device-QA focus |
| --- | --- | --- |
| `ar` | RTL | Auto from Arabic device locale; RTL chrome; no clipping |
| `en` | LTR | Fallback + representative primary flows |
| `fr` | LTR | Long strings; buttons / forms / dialogs; overflow |
| `es` | LTR | Representative primary nav + user flows |
| `de` | LTR | Long labels; named overflow strings below |
| `pt` | LTR | Representative primary nav + user flows |

Unsupported device language must fall back to **English**. Live remains
**Android-specific** — do **not** fail iOS for a missing Live tab.

---

## Mandatory localization checks (after Build 6 is installed)

Record each item as `PASS` / `FAIL` / `BLOCKED` / `NOT_TESTED` only from
**this** iPhone 13 + Build 6 session. Do not execute these checks this turn.

Inspect every language pass for:

| Defect class | Fail if |
| --- | --- |
| `ENGLISH_LEAKAGE` | Supported-locale UI still shows English where a translation is expected |
| `MISSING_KEYS` | Expected control / screen has no localized string |
| `RAW_KEYS` | Visible `namespace.key` / catalog IDs (e.g. `actions.retry`) |
| `UI_OVERFLOW` | Label clipped, truncated without affordance, or overflows the control |
| `RTL` | Arabic is LTR, or LTR locales flip incorrectly |
| `DIRECTIONAL_ICONS` | Back / chevrons / start-end icons point the wrong way for the locale |
| `TEXT_OVERLAP` | Two strings occupy the same space |

### Surfaces (every language that is fully walked)

Walk these on the locales called out below. Live is Android-only — skip on
iOS and do not mark FAIL for its absence.

- Watch
- Discover
- Create
- Messages
- Conversation
- Profile (own)
- other-user Profile
- Settings
- Auth
- Saved
- Follow / Following
- UGC report / block
- Account deletion **entry** (do not complete deletion unless the operator
  later agrees this account is disposable)
- Notifications
- World
- Loading / error / empty states
- Dialogs
- Back navigation

### 1. Arabic (`ar`)

```text
ARABIC = NOT_TESTED
RTL = NOT_TESTED
DIRECTIONAL_ICONS = NOT_TESTED
```

Later steps:

1. Set iPhone system language to **Arabic**. Clear any in-app language
   override first (or use a fresh session with no saved override).
2. Cold-launch UMTUBA. Expect Arabic **automatically** from device locale
   (policy step 2). Do not require a manual picker for this check.
3. Confirm `dir` / layout is **RTL**.
4. Confirm nav direction, Back, and chevrons are RTL-correct (start-side
   Back; mirrored directional icons).
5. Confirm no clipping on primary and secondary screens.
6. Walk forms and dialogs (Auth if reachable without destroying the
   session, Settings, report/block, publish ack).
7. Walk primary + secondary screens from the surfaces list.

### 2. German (`de`) — long-label overflow

```text
GERMAN = NOT_TESTED
UI_OVERFLOW = NOT_TESTED
```

Later steps:

1. Activate German (device language **or** manual override — record which).
2. Hunt long labels and buttons for clip / overflow / overlap.
3. Named inspection strings (record exact on-screen text):

| Expected German (inspect) | English sense | Where to look |
| --- | --- | --- |
| **Automatisch weiter an** | Auto-next on | Watch playback chrome |
| **Veröffentlichen** | Publish | Create / upload |
| **Erneut versuchen** | Retry | Loading / error empty states |

4. Re-check buttons, forms, and dialogs after those strings appear.

### 3. French (`fr`) — long strings

```text
FRENCH = NOT_TESTED
```

Later steps:

1. Activate French (device language or manual override — record which).
2. Walk buttons, forms, and dialogs on primary + secondary screens.
3. Record clipping / overflow / overlap. French is often longer than EN.

### 4. English / Spanish / Portuguese — representative flows

```text
ENGLISH = NOT_TESTED
SPANISH = NOT_TESTED
PORTUGUESE = NOT_TESTED
```

Later steps (each locale):

1. Activate the locale.
2. Walk representative **primary nav** (Watch, Discover, Create, Messages,
   Profile) plus one secondary flow (Settings, Conversation, or other-user
   Profile).
3. Record leakage, raw keys, overflow. Do not require a full Arabic-depth
   walk on ES/PT unless a defect appears.

### 5. Device language auto-select

```text
DEVICE_LANGUAGE_SUPPORTED = NOT_TESTED
DEVICE_LANGUAGE_UNSUPPORTED_FALLBACK = NOT_TESTED
```

Later steps:

1. With **no** saved override: set iPhone language to a **supported** locale
   (`ar` / `en` / `fr` / `es` / `de` / `pt`). Cold-launch. App language must
   match that locale.
2. With **no** saved override: set iPhone language to an **unsupported**
   locale (example: Italian, Japanese, or Chinese — pick one the operator
   can restore). Cold-launch. App language must be **English**.
3. Restore a supported iPhone language before leaving the phone.

### 6. Manual override + persist + reset

```text
MANUAL_OVERRIDE = NOT_TESTED
MANUAL_OVERRIDE_PERSIST_RESTART = NOT_TESTED
RESET_OVERRIDE = NOT_TESTED
```

Later steps:

1. With a known device language (record it), open Settings and select a
   **different** supported language.
2. Confirm the UI switches immediately (or after the documented restart
   if the app requires one).
3. Force-quit and relaunch. Override **persists**.
4. Reset / clear the override (use the in-app control that returns to
   device language — record the exact label). Device language must become
   active again.
5. If the app requires a restart after reset, restart once and confirm.

Do not invent a reset control if none exists — record `BLOCKED` with the
exact Settings copy.

---

## Build 5 regression protection (after Build 6 install)

Do **not** rerun every historical Build 5 checklist item merely for
repetition. After Build 6 is installed, prove these shipping gates on
**this** binary. Historical Build 4 / Build 5 notes are context, not
results.

### 1. Watch playback — SPECIAL OPEN GATE

```text
WATCH_PLAYBACK = NOT_TESTED
PLAYBACK_STABILITY = NOT_TESTED
```

Rules (unchanged):

- Test **multiple real videos** (not one clip, not a single retry).
- Record each attempt: video identity, wall-clock time, on-screen result.
- **One later successful play is NOT PASS** if a fail or intermittent
  failure returned earlier in the Build 6 session (or returns after the
  success).
- Do **not** invent a playback fix. Historical Build 4 incident remains
  documented: intermittent expo-video
  `Failed to load the player item: resource unavailable`.
- Do **not** declare `WATCH_PLAYBACK = PASS` from a single success after
  a fail.

If playback fails or is intermittent, preserve exact evidence (on-screen
string, player, timing, scope). Do not print signed-URL tokens.

### 2. Saved + persistence

```text
SAVED = NOT_TESTED
SAVE_PERSISTENCE = NOT_TESTED
```

Watch → Save on another user’s video → leave Watch → return (still saved)
→ Unsave → stays cleared after reload.

### 3. Other-user Profile

```text
OTHER_USER_PROFILE = NOT_TESTED
```

Watch → creator / `Profile {username}` → that user’s Profile. Must not be
“Profile not found”. Must not be own Profile.

### 4. Follow / Following / Unfollow

```text
FOLLOW = NOT_TESTED
FOLLOWING = NOT_TESTED
UNFOLLOW = NOT_TESTED
```

Follow → label **Following** (never the word Unfollow) → persist across
leave/return → tap Following to unfollow → **Follow**.

### 5. Messages open / send

```text
MESSAGES = NOT_TESTED
MESSAGES_OPEN = NOT_TESTED
MESSAGES_SEND = NOT_TESTED
```

Messages tab loads. Open a conversation. Send one real message.

### 6. Global Back

```text
BACK = NOT_TESTED
```

Visible Back on Watch, Discover, Create, Messages, Profile. Tab roots:
Back is a **no-op** (do not exit the app). Secondary screens: Back returns
to the previous in-app screen.

### 7. Create / upload + open newly published post

```text
CREATE_UPLOAD = NOT_TESTED
OPEN_AFTER_UPLOAD = NOT_TESTED
```

Create → real iPhone video → caption → Terms → publish. **Open Watch**
must show the **newly published** post, not a bare / stale feed.

### 8. Session persistence + background / resume + crash sanity

```text
SESSION_PERSISTENCE = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
CRASH_SANITY = NOT_TESTED
```

Later steps:

1. Stay signed in. Force-quit and relaunch. Session must remain.
2. Background UMTUBA (home, another app) for at least 30 seconds, then
   resume. No crash; session intact; Watch/Messages still usable.
3. Record any crash / freeze / watchdog kill. None observed → record
   `CRASH_SANITY` only after the rest of this protection list has been
   walked, not from a 10-second launch.

---

## Historical context (do not copy into Build 6 fields)

```text
BUILD4_BINARY_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
BUILD4_WATCH_PLAYBACK = FAIL_THEN_INTERMITTENT_WORKING
BUILD4_PLAYBACK_STABILITY = INTERMITTENT
BUILD4_PLAYBACK_ERROR = Failed to load the player item: resource unavailable
BUILD5_SOURCE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
BUILD5_EAS_BUILD_ID = 4c341dcb-b4a8-4549-b50e-5eeb79293b36
BUILD5_DEVICE_QA = SUPERSEDED_NOT_A_BUILD6_RESULT
```

Build 5 is superseded. Do not install it. Do not finish or reuse a Build 5
device session as Build 6 evidence.

A3 inventory at older SHA `017be09` found **no** mobile i18n layer. Build 6
source is Central SHA `c48b4b2898b116a39e90b85221ae1856f446d0a0`. Do not
treat that older inventory as a Build 6 device result, and do not invent
that localization is complete until this iPhone 13 session records it.

---

## After A1 succeeds (parent resume)

Expected resume payload:

```text
EAS_BUILD_ID = <from A1>
BUILD_SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
APP_VERSION = 1.0.0
BUILD_NUMBER = 6
TESTFLIGHT_AVAILABLE = YES_INTERNAL | <A1 value>
```

Then, and only then:

1. Ask the operator to install **1.0.0 (6)** using the steps above.
2. Confirm build number **6** on device (not 5, not 4).
3. Run the mandatory localization list, then Build 5 regression protection.
4. Keep Watch playback as an open gate until multiple videos are stable
   with no intermittent return.

If A1 fails or Build 6 is not installable: keep

```text
IOS_LOCALIZATION_DEVICE_QA = WAITING_FOR_A1
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD6_INSTALL
```

---

## What was not done (by design)

- No device install request this turn
- No Build 6 binary build / submit / Production submit
- No Android `versionCode` change
- Store / Learning not reopened
- No iOS-only localization fork
- No invented playback fix
- `docs/ai/CURSOR_REPORT.md` not overwritten
- `docs/ai/CURRENT_TASK.md` not overwritten
- No language or regression field left `NOT_TESTED` was upgraded

---

## Return fields (this turn — prep only)

```text
TASK_ID = PC2_IOS_LOCALIZATION_IPHONE13_QA_V1
STATUS = WAITING_FOR_A1
SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
TESTFLIGHT_BUILD = NOT_INSTALLED
DEVICE = iPhone 13
IOS_LOCALIZATION_DEVICE_QA = WAITING_FOR_A1
APP_STORE_PRODUCTION_SUBMITTED = NO
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD6_INSTALL
EAS_BUILD_ID = NOT_AVAILABLE
OPERATOR_INSTALL_ASKED_THIS_TURN = NO

ARABIC = NOT_TESTED
GERMAN = NOT_TESTED
FRENCH = NOT_TESTED
ENGLISH = NOT_TESTED
SPANISH = NOT_TESTED
PORTUGUESE = NOT_TESTED
DEVICE_LANGUAGE_SUPPORTED = NOT_TESTED
DEVICE_LANGUAGE_UNSUPPORTED_FALLBACK = NOT_TESTED
MANUAL_OVERRIDE = NOT_TESTED
RESET_OVERRIDE = NOT_TESTED
ENGLISH_LEAKAGE = NOT_TESTED
MISSING_KEYS = NOT_TESTED
RAW_KEYS = NOT_TESTED
UI_OVERFLOW = NOT_TESTED
RTL = NOT_TESTED
DIRECTIONAL_ICONS = NOT_TESTED
TEXT_OVERLAP = NOT_TESTED

WATCH_PLAYBACK = NOT_TESTED
PLAYBACK_STABILITY = NOT_TESTED
SAVED = NOT_TESTED
OTHER_USER_PROFILE = NOT_TESTED
FOLLOW = NOT_TESTED
MESSAGES = NOT_TESTED
BACK = NOT_TESTED
CREATE_UPLOAD = NOT_TESTED
OPEN_AFTER_UPLOAD = NOT_TESTED
SESSION_PERSISTENCE = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
CRASH_SANITY = NOT_TESTED
```
