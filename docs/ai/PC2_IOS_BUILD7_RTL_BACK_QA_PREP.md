# PC2-A2 iOS BUILD 7 — RTL Back device QA prep

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD7_RTL_BACK_DEVICE_QA_V1
DATE = 2026-08-16
PHASE = 2 PREP ONLY
MODE = PREP_ONLY / WAITING_FOR_A1
DEVICE = PC2 + physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 7
AUTHORIZED_CENTRAL_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
EAS_BUILD_ID = NOT_AVAILABLE
EAS_SUBMIT_ID = NOT_AVAILABLE
TESTFLIGHT_BUILD = NOT_INSTALLED
TESTFLIGHT_AVAILABLE = NO
IPHONE13_INSTALL = NOT_STARTED
BUILD7_INSTALLED = NO
DEVICE_QA_EXECUTED = NO
RTL_BACK_GATE = WAITING_FOR_A1
LOCALIZATION_QA_CAN_CONTINUE = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
IOS_ONLY_LOCALIZATION_FORK = NO
PLAYBACK_FIX_INVENTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD6_RETESTED_AS_BUILD7 = NO
BUILD5_RETESTED_AS_BUILD7 = NO
BUILD4_RETESTED_AS_BUILD7 = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

This prep is **Build 7 only**. Do **not** test Build 6. Do **not** fall
back to Build 5 or Build 4. Do **not** declare any Build 6 / Build 5
result as a Build 7 result. Do **not** invent PASS.

A1 is building TestFlight **1.0.0 (7)** from Central SHA
`74188bea5a23269c3d19448894c6ad5381e3b3a9`. This turn has **no**
`EAS_BUILD_ID` and **no** installable Build 7. Checklist and install
steps are prepared only.

Do **not** ask the operator to install Build 7 this turn.

The rest of localization QA must **not** continue until the RTL Back
gate passes on the physical iPhone 13 with Build 7 installed.

---

## Current status (this turn)

```text
STATUS = WAITING_FOR_A1
BUILD7_INSTALLED = NO
RTL_BACK_GATE = WAITING_FOR_A1
LOCALIZATION_QA_CAN_CONTINUE = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WAITING_FOR_BUILD7
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD7
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

RTL Back fields (all untested — A1 not finished, Build 7 not installed):

```text
ARABIC_RTL_BACK = NOT_TESTED
PROFILE_SETTINGS_BACK = NOT_TESTED
CONVERSATION_BACK = NOT_TESTED
OTHER_USER_PROFILE_BACK = NOT_TESTED
NOTIFICATIONS_BACK = NOT_TESTED
SECONDARY_SCREEN_BACK = NOT_TESTED
RTL_HITBOX_MATCH = NOT_TESTED
LTR_BACK = NOT_TESTED
WATCH_ROOT_NOOP = NOT_TESTED
```

Do **not** upgrade any of these fields this turn.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave
`NOT_TESTED`:

1. A1 reports success with a real `EAS_BUILD_ID`.
2. Parent resumes this track with that `EAS_BUILD_ID`.
3. TestFlight shows **UMTUBA 1.0.0 (7)** as installable (internal).
4. The physical iPhone 13 has **Build 7** installed — not Build 6, not
   Build 5, not Build 4.
5. The operator confirms the TestFlight / App Information build number
   is **7**, not **6**, **5**, or **4**.

Until then:

```text
RTL_BACK_GATE = WAITING_FOR_A1
BUILD7_INSTALLED = NO
LOCALIZATION_QA_CAN_CONTINUE = NO
BLOCKERS = WAITING_FOR_BUILD7
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from A1 “FINISHED”, or from ASC “in beta testing”.
- Test Build 6 / 5 / 4 and label it Build 7.
- Copy Build 6 RTL FAIL (or any older PASS/FAIL) into Build 7 result fields.
- Ask the operator to install Build 7 before A1 succeeds.
- Continue German / French / ES / PT / remaining localization QA before
  RTL Back passes on device.
- Treat Watch root no-op as a Settings / secondary-screen PASS or FAIL.
- Invent a backend or client playback fix.
- Build, rebuild, re-upload, or Submit for Review / App Store Production.
- Modify Android `versionCode`.
- Reopen Store / Learning.
- Create an iOS-only localization fork.
- Overwrite `docs/ai/CURSOR_REPORT.md`.

---

## Why this gate exists (context only — not a Build 7 result)

Build 6 on the physical iPhone 13 (Arabic, device language Arabic) had
**visual RTL PASS** and **tap FAIL**:

```text
BUILD6_AR_RTL_VISUAL = PASS
BUILD6_BACK_ARROW_RTL_POSITION = PASS
BUILD6_RTL_NAVIGATION = FAIL_ON_DEVICE
BUILD6_BACK_ARROW_TAP_BEHAVIOR = FAIL
```

Authorized Build 6 classification (do not copy into Build 7 fields):

- Profile → Settings: chevron on the **right** (correct). Tap on the
  visible chevron did **not** go back.
- Watch: chevron on the **right**. Tap does not leave Watch. That is
  **intended root no-op**, not the Settings defect.
- Root cause on Build 6: native `headerLeft` stayed physically leading
  while I18nManager RTL moved the **glyph** to the trailing/right edge.
  The Pressable hitbox did not follow the visible chevron.

Build 7 is the first binary that may contain the shared slot/hitbox
fix. Source change is **not** a device PASS. Re-prove on iPhone 13 +
**1.0.0 (7)** only.

Policy that Build 7 must still obey (source reminder, not a result):

| Surface | Visible Back | Tap |
| --- | --- | --- |
| Settings / Conversation / other-user Profile / Notifications / other secondary | Yes | history-back, or replace to a stable parent. **Never noop.** |
| Watch / other tab roots | Yes | **noop** — stay on the tab; do not exit the app; do not loop through `index` |
| Internal Expo names `(tabs)` / `(auth)` | Never as a back title | — |

RTL chevron: **RIGHT**. LTR chevron: **LEFT**. Hitbox must match the
visible glyph. 44×44 target. No dead tap. No clipping.

---

## Operator install steps (PREPARED — do not run this turn)

Use these **only** after parent resume includes `EAS_BUILD_ID` and
TestFlight shows Build 7. Windows cannot push the IPA. Install is
iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for A1 + TestFlight upload

```text
WAIT_FOR = A1 success + parent resume with EAS_BUILD_ID
EAS_BUILD_ID = NOT_AVAILABLE
EAS_SUBMIT_ID = NOT_AVAILABLE
TESTFLIGHT_1.0.0_7 = NO
DO_NOT_INSTALL_YET = YES
DO_NOT_INSTALL_BUILD_6 = YES
DO_NOT_INSTALL_BUILD_5 = YES
DO_NOT_INSTALL_BUILD_4 = YES
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`. Do not invent
  a redemption code. Do not start External Beta.

### 2. Confirm it is Build 7, not 6 / 5 / 4

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 7 |
| --- | --- |
| **1.0.0 (7)** | **1.0.0 (6)** |
| Build **7** | **1.0.0 (5)** or **1.0.0 (4)** or Build **3** or any older build |

If the page still shows **(6)**, **(5)**, or **(4)**:

- Do **not** install or “update”.
- Do **not** start the RTL Back list.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_6` (or `_5` / `_4`).

### 3. Install or update to 1.0.0 (7)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0**, build **7**.
- If the installed build is still 6, 5, or 4: stop.
  `IPHONE13_INSTALL = FAIL_WRONG_BUILD`.

### 4. Cold launch once

- Force-quit UMTUBA if it was already open from Build 6 / 5 / 4.
- Open UMTUBA from TestFlight **Open** (or the home-screen icon
  **after** confirming build 7).
- Confirm the app is UMTUBA, not Expo Go.

### 5. Identity check (after install only)

- Stay signed in if already signed in.
- Do **not** delete the account as a first step.
- Do **not** sign out to “prepare” the phone.
- Open own Profile and record name / @username before Settings /
  Conversation / other-user tests.

---

## Live QA rules (after parent green light only)

The operator is **not** experienced with iPhone settings. When live QA
starts:

1. **One action at a time.** Give one tap. Wait for evidence. Do not
   stack “then also open X”.
2. **Simple Arabic** for the operator prompt (exact button / tab names
   the operator already saw on Build 6).
3. **Exact tap.** Name the control: سهم الرجوع أعلى الشاشة.
4. **Wait for evidence** before the next step: arrow side, where the
   screen went, dead tap / clip / English route names.
5. Stay in **Arabic RTL first**. Do not switch to English until every
   Arabic secondary Back check is recorded.
6. Do **not** continue German / French / remaining localization until
   `RTL_BACK_GATE = PASS`.

Record each item as `PASS` / `FAIL` / `BLOCKED` / `NOT_TESTED` only
from **this** iPhone 13 + Build 7 session.

For **every** Arabic secondary screen, all of these must be true for
PASS:

| Check | Fail if |
| --- | --- |
| Chevron **RIGHT** in RTL | Chevron is left, missing, or two arrows |
| Hitbox matches visible chevron | Tap on the visible glyph does nothing; tap on the opposite side fires |
| Tap navigates back | Stays on the same secondary screen; exits the app; loops; opens `index` |
| No dead target | Visible arrow is untappable |
| No clipping | Chevron or title cut off |
| No internal route labels | Visible `(tabs)`, `(auth)`, `index`, or a raw path as a back title |

---

## Mandatory physical checks (after Build 7 is installed)

Do **not** execute these this turn. Order is mandatory.

### A. Arabic RTL first

Prerequisite (later, after install): iPhone / UMTUBA in **Arabic**,
RTL layout, no leftover English override. If the phone is already
device-language Arabic from the Build 6 session, confirm once, then
proceed. Do not change iPhone system language unless Arabic is gone.

```text
ARABIC_RTL_BACK = NOT_TESTED
```

Confirm once before the five secondary screens:

- App chrome is Arabic.
- Layout is RTL.
- Then start check 1. Do not walk Watch first as the proof of Back.

#### 1. Profile → Settings → Back

```text
PROFILE_SETTINGS_BACK = NOT_TESTED
```

Later operator script (one action at a time):

1. افتح تبويب **الملف**.
2. افتح **الإعدادات**.
3. انظر إلى سهم الرجوع أعلى الشاشة. هل هو على **اليمين** أم اليسار؟
4. اضغط **مرة واحدة** على السهم الظاهر (نفس المكان الذي تراه).
5. هل رجعت إلى **الملف**؟ هل بقيت في الإعدادات؟ هل خرج التطبيق؟

Expect: chevron RIGHT; tap returns to own Profile (history-back or
replace `/(tabs)/profile`). **Never noop.** Never exit the app.

This is the Build 6 FAIL case. It is the first required proof on
Build 7.

#### 2. Conversation → Back

```text
CONVERSATION_BACK = NOT_TESTED
```

Later operator script:

1. افتح تبويب **الرسائل**.
2. افتح محادثة واحدة.
3. سهم الرجوع: يمين أم يسار؟
4. اضغط السهم الظاهر مرة واحدة.
5. هل رجعت إلى قائمة الرسائل؟

Expect: chevron RIGHT; tap returns to Messages (history-back or
replace Messages). Never noop. Never exit.

#### 3. Other-user Profile → Back

```text
OTHER_USER_PROFILE_BACK = NOT_TESTED
```

Later operator script:

1. من **شاهد**، افتح فيديو لمستخدم آخر.
2. اضغط صورة / اسم صاحب الفيديو لفتح ملفه.
3. تأكد أن الصفحة **ليست** ملفك أنت، وليست “Profile not found”.
4. سهم الرجوع: يمين أم يسار؟
5. اضغط السهم الظاهر مرة واحدة.
6. هل رجعت إلى الشاشة السابقة داخل التطبيق؟

Expect: chevron RIGHT; tap returns to the previous in-app screen
(Watch, or own Profile if opened as Profile `?u=`). Never exit.
Never show `(tabs)` as a title.

#### 4. Notifications → Back

```text
NOTIFICATIONS_BACK = NOT_TESTED
```

Later operator script:

1. من **الملف** أو **الإعدادات**، افتح **الإشعارات**.
2. سهم الرجوع: يمين أم يسار؟
3. اضغط السهم الظاهر مرة واحدة.
4. هل رجعت إلى الملف / الإعدادات؟

Expect: chevron RIGHT; tap returns to Profile (or the real previous
secondary). Never noop. Never exit.

#### 5. Additional representative secondary → Back

```text
SECONDARY_SCREEN_BACK = NOT_TESTED
```

Preferred extra screen (already known from Build 6): **اللغة**
(Settings → Language). Alternate if Language is blocked: Rewards /
World / Blocked users / Change password — pick **one** and record
which.

Later operator script (Language):

1. **الملف** → **الإعدادات** → **اللغة**.
2. سهم الرجوع: يمين أم يسار؟
3. اضغط السهم الظاهر مرة واحدة.
4. هل رجعت إلى الإعدادات؟ هل ظهر اسم مسار داخلي مثل `(tabs)`؟

Expect: chevron RIGHT; tap returns to Settings (or Profile). No
internal route label. No clip.

#### RTL hitbox (scored across 1–5, not from Watch)

```text
RTL_HITBOX_MATCH = NOT_TESTED
```

PASS only if, on the secondary screens above, the tap that works is
the **visible right-side chevron**, not a hidden left-side target.
If the visible glyph is dead and a tap on the opposite edge fires:
`FAIL` (Build 6 defect still present).

`ARABIC_RTL_BACK` may leave `NOT_TESTED` only if a check was blocked
before it started. It may become `PASS` only after checks 1–5 and
`RTL_HITBOX_MATCH` are PASS. One Settings success is **not** enough.

### B. LTR English (only after Arabic RTL Back is recorded)

```text
LTR_BACK = NOT_TESTED
```

Do not start this block until Arabic checks 1–5 are recorded
(`PASS` / `FAIL` / `BLOCKED`). If Arabic FAIL, still record LTR only
if parent asks; default is stop and keep the gate closed.

Later: switch UMTUBA to English (in-app language, or device English —
record which). Then on **one** secondary screen (Settings is enough
if time is short; prefer Settings + Conversation):

- Chevron **LEFT**.
- Tap on the visible left chevron goes back.
- History is correct (Settings → Profile; Conversation → Messages).
- No internal route labels.

Do not treat LTR PASS as a substitute for Arabic RTL PASS.

### C. Watch root (after secondary screens, not instead of them)

```text
WATCH_ROOT_NOOP = NOT_TESTED
```

Later operator script:

1. افتح تبويب **شاهد** (جذر التبويب، ليس ملف مستخدم).
2. هل سهم الرجوع ظاهر؟
3. اضغط السهم الظاهر مرة واحدة.
4. هل بقيت في شاهد؟ هل خرج التطبيق؟ هل تدور الشاشة / تومض؟

Expect:

- Back **visible** (policy: visible on roots).
- Tap is an **intentional no-op**: stay on Watch; do not exit; do
  not loop through `index`; no crash.
- A visible right-side arrow that does not leave Watch is **not**
  the Settings defect and is **not** `PROFILE_SETTINGS_BACK = FAIL`.

If Watch tap crashes, loops, or exits the app: `WATCH_ROOT_NOOP = FAIL`
and the gate stays closed.

---

## Gate close rule

```text
RTL_BACK_GATE = PASS
```

only when **all** of these are true on iPhone 13 + **1.0.0 (7)**:

- `BUILD7_INSTALLED = YES` (operator confirmed 7, not 6/5/4)
- `PROFILE_SETTINGS_BACK = PASS`
- `CONVERSATION_BACK = PASS`
- `OTHER_USER_PROFILE_BACK = PASS`
- `NOTIFICATIONS_BACK = PASS`
- `SECONDARY_SCREEN_BACK = PASS`
- `RTL_HITBOX_MATCH = PASS`
- `LTR_BACK = PASS`
- `WATCH_ROOT_NOOP = PASS`
- `ARABIC_RTL_BACK = PASS`

Until then:

```text
LOCALIZATION_QA_CAN_CONTINUE = NO
```

Do not start German overflow, French, ES/PT, unsupported-locale
fallback, or the rest of the Build 6 localization list.

---

## After A1 succeeds (parent resume)

Expected resume payload:

```text
EAS_BUILD_ID = <from A1>
BUILD_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
APP_VERSION = 1.0.0
BUILD_NUMBER = 7
TESTFLIGHT_AVAILABLE = YES_INTERNAL | <A1 value>
```

Then, and only then:

1. Ask the operator to install **1.0.0 (7)** using the steps above.
2. Confirm build number **7** on device (not 6, not 5, not 4).
3. Run Arabic RTL Back checks 1–5, one tap at a time.
4. Then LTR English secondary Back.
5. Then Watch root no-op.
6. Keep `LOCALIZATION_QA_CAN_CONTINUE = NO` until `RTL_BACK_GATE = PASS`.

If A1 fails or Build 7 is not installable: keep

```text
RTL_BACK_GATE = WAITING_FOR_A1
BLOCKERS = WAITING_FOR_BUILD7
LOCALIZATION_QA_CAN_CONTINUE = NO
```

---

## Historical context (do not copy into Build 7 fields)

```text
BUILD6_SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
BUILD6_EAS_BUILD_ID = 7d0dd256-fdb0-42c3-8a4d-0833fcaae656
BUILD6_RTL_NAVIGATION = FAIL_ON_DEVICE
BUILD6_BACK_ARROW_TAP_BEHAVIOR = FAIL
BUILD6_AR_RTL_VISUAL = PASS
BUILD6_WATCH_ROOT = INTENDED_NOOP
BUILD5_SOURCE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
BUILD5_EAS_BUILD_ID = 4c341dcb-b4a8-4549-b50e-5eeb79293b36
BUILD4_BINARY_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
```

Build 6 is superseded for this gate. Do not install it. Do not finish
or reuse a Build 6 device session as Build 7 evidence.

---

## What was not done (by design)

- No device install request this turn
- No Build 7 binary build / submit / Production submit
- No Android `versionCode` change
- Store / Learning not reopened
- No iOS-only localization fork
- No invented playback fix
- `docs/ai/CURSOR_REPORT.md` not overwritten
- `docs/ai/CURRENT_TASK.md` not overwritten
- No RTL Back field left `NOT_TESTED` was upgraded
- Rest of localization QA not started

---

## Return fields (this turn — prep only)

```text
TASK_ID = PC2_IOS_BUILD7_RTL_BACK_DEVICE_QA_V1
STATUS = WAITING_FOR_A1
SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 7
TESTFLIGHT_BUILD = NOT_INSTALLED
DEVICE = iPhone 13
EAS_BUILD_ID = NOT_AVAILABLE
OPERATOR_INSTALL_ASKED_THIS_TURN = NO

BUILD7_INSTALLED = NO
ARABIC_RTL_BACK = NOT_TESTED
PROFILE_SETTINGS_BACK = NOT_TESTED
CONVERSATION_BACK = NOT_TESTED
OTHER_USER_PROFILE_BACK = NOT_TESTED
NOTIFICATIONS_BACK = NOT_TESTED
SECONDARY_SCREEN_BACK = NOT_TESTED
RTL_HITBOX_MATCH = NOT_TESTED
LTR_BACK = NOT_TESTED
WATCH_ROOT_NOOP = NOT_TESTED
RTL_BACK_GATE = WAITING_FOR_A1
LOCALIZATION_QA_CAN_CONTINUE = NO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WAITING_FOR_BUILD7
```
