# PC2 iOS BUILD 10 — final share + create device QA prep

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD10_FINAL_SHARE_CREATE_QA_V1
DATE = 2026-08-17
PHASE = 2 PREP ONLY — DO NOT START DEVICE QA
MODE = ONE_TAP_ARABIC_PREP / WAITING_FOR_TESTFLIGHT_10
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 10
AUTHORIZED_SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
EAS_BUILD_ID = 9472a064-9e80-41b3-a61a-3473bc639c86
EAS_SUBMIT_ID = ecfed685-6b09-4826-aea2-351ba489f32c
TESTFLIGHT_BUILD = 10
TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE13_INSTALL = NOT_STARTED
BUILD10_INSTALLED = NO
BUILD10_AVAILABLE = YES_INTERNAL
DEVICE_QA_EXECUTED = NO
DEVICE_QA_RESULT = WAITING_FOR_BUILD10_INSTALL
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD9_RETESTED_AS_BUILD10 = NO
BUILD8_RETESTED_AS_BUILD10 = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

This prep is **Build 10 only**. Do **not** test Build 9. Do **not**
fall back to Build 8 / 7 / 6 / 5 / 4. Do **not** declare any older
result as a Build 10 result. Do **not** invent PASS.

Phase 1 built TestFlight **1.0.0 (10)** from Central SHA
`4d329e1bed2e1bc1a90902a1781f1821c0009392`. EAS build is
`FINISHED`. ASC now lists **1.0.0 (10)** internal `in beta testing`.
That is **not** an iPhone install PASS.

This prep turn does **not** start Phase 2 and does **not** ask the
operator to install. Parent must GO Phase 2 separately.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD10_AVAILABLE = YES_INTERNAL
DEVICE_QA_RESULT = WAITING_FOR_PHASE_2_GO
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
LONG_VIDEO_GATE = NO_MAX_DURATION_IN_SOURCE
```

All authorized fields (untested — Build 10 not installed):

```text
SHARE_TWO_CHOICE = NOT_TESTED
SHARE_LINK = NOT_TESTED
SHARE_FILE = NOT_TESTED
SHARE_IDENTITY_FROZEN = NOT_TESTED
CREATE_RESET = NOT_TESTED
CREATE_CANCEL = NOT_TESTED
CREATE_REPLACE = NOT_TESTED
CREATE_FULL_LIBRARY = NOT_TESTED
LONG_VIDEO_PUBLISH_GATE = NOT_APPLICABLE_NO_MAX_IN_SOURCE
DIRECT_PUBLISH_BOUNDARY = NOT_TESTED
RETRY_CURRENT_ASSET = NOT_TESTED
LATE_CALLBACK_GUARD = NOT_TESTED
LIKE_STATE = NOT_TESTED
OWN_PROFILE = NOT_TESTED
COMMENT = NOT_TESTED
LANGUAGE_SELECTOR = NOT_TESTED
LOCALE_OVERRIDE_PERSISTENCE = NOT_TESTED
RTL_BACK = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
```

Do **not** upgrade any of these fields this turn.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave
`NOT_TESTED`:

1. Phase 1 report has `EAS_BUILD_ID = 9472a064-9e80-41b3-a61a-3473bc639c86`
   built from `4d329e1bed2e1bc1a90902a1781f1821c0009392`.
2. TestFlight shows **UMTUBA 1.0.0 (10)** as installable (internal).
3. The physical iPhone 13 has **Build 10** installed — not Build 9,
   not Build 8, not Build 7, not Build 6, not Build 5, not Build 4.
4. The operator confirms the TestFlight / App Information build
   number is **10**, not **9** or older.

Until then:

```text
BUILD10_AVAILABLE = YES_INTERNAL
BUILD10_INSTALLED = NO
DEVICE_QA_RESULT = WAITING_FOR_PHASE_2_GO
BLOCKERS = DEVICE_QA_NOT_RUN; PHASE_2_NOT_STARTED
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from EAS `FINISHED`, or from ASC
  “in beta testing”.
- Test Build 9 / 8 / 7 / 6 / 5 / 4 and label it Build 10.
- Copy Build 8 leftover FAIL or Build 9 surgical results into
  Build 10 fields.
- Ask the operator to install Build 10 before TestFlight 10 is
  actually available.
- Invent a video duration max. Source has none
  (`LONG_VIDEO_GATE = NO_MAX_DURATION_IN_SOURCE`).
- Rerun the full localization matrix (DE/FR/ES/PT).
- Rerun the full Arabic RTL Back five-screen gate unless Phase 2
  later GO's it.
- Independently patch shared defects.
- Create disposable accounts. Delete the real account. Block real
  users for QA.
- Build, rebuild, re-upload, or Submit for Review / App Store
  Production.
- Modify Android `versionCode`.
- Reopen Store / Learning.
- Overwrite `docs/ai/CURSOR_REPORT.md`.

---

## Source contracts (for later Phase 2 — not results)

### Share (two-choice)

Tap **مشاركة** once on a published Watch post. Expected sheet title
**مشاركة**, then exactly two choices + cancel:

| Order | AR (operator) | EN | Mode |
| --- | --- | --- | --- |
| 1 | مشاركة رابط الفيديو | Share video link | `link` |
| 2 | مشاركة الفيديو كفيديو | Share video | `file` |
| 3 | إلغاء | Cancel | dismiss |

- Link must be a permanent watch URL (`https://umtuba.com/watch?post=…`),
  not a signed storage URL.
- File must share a video file for the **same** post that was on
  screen when Share was tapped. Swipe to another video after tap
  must not retarget the pending share.
- File may show **جاري تجهيز الفيديو** while downloading.
- Fail copy: **فشلت المشاركة** / **الوسائط غير متاحة**.
- Create leftovers must never appear as the shared file.

### Create reset / cancel / replace

- **CREATE_RESET** — after a successful publish on **Build 10**,
  leave إنشاء and return. Empty: no filename, no duration, empty
  caption, terms unchecked, no success leftover.
- **CREATE_CANCEL** — with a valid current asset, open picker, tap
  إلغاء. Same asset stays.
- **CREATE_REPLACE** — pick A, then pick B. Only B remains. New
  identity; A’s name / duration / retry must not linger.
- **CREATE_FULL_LIBRARY** — picker should show the full system
  library (PHPicker), not a LIMITED subset caused by a prior
  media-library grant.

### Duration

There is **no** hard max duration in source. Do not hunt for an
“over-duration” reject. Size gate is 50 MB. Invalid duration
metadata (`0` / missing-invalid) can still refuse Publish. Record
what the UI actually shows. Do not invent a minutes ceiling.

---

## Operator install steps (PREPARED — do not run this turn)

Windows cannot push the IPA. Install is iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for TestFlight 10

```text
WAIT_FOR = TestFlight 1.0.0 (10) installable
EAS_BUILD_ID = 9472a064-9e80-41b3-a61a-3473bc639c86
EAS_SUBMIT_ID = ecfed685-6b09-4826-aea2-351ba489f32c
SOURCE_SHA_REQUIRED = 4d329e1bed2e1bc1a90902a1781f1821c0009392
TESTFLIGHT_1.0.0_10 = YES_INTERNAL
DO_NOT_INSTALL_THIS_TURN = YES
DO_NOT_INSTALL_BUILD_9 = YES
DO_NOT_INSTALL_BUILD_8 = YES
DO_NOT_INSTALL_BUILD_7 = YES
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report `UMTUBA_NOT_LISTED`.

### 2. Confirm it is Build 10, not 9 / 8 / 7

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 10 |
| --- | --- |
| **1.0.0 (10)** | **1.0.0 (9)** |
| Build **10** | **1.0.0 (8)** / **(7)** / **(6)** / **(5)** / **(4)** |

If the page still shows **(9)** (or older):

- Do **not** install or “update”.
- Do **not** start the surgical list.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_9` (or `_8` / `_7`).

### 3. Install or update to 1.0.0 (10)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0**, build **10**.
- If the installed build is still 9 or older: stop.
  `IPHONE13_INSTALL = FAIL_WRONG_BUILD`.

### 4. Cold launch once

- Force-quit UMTUBA if it was already open from Build 9 / 8 / 7.
- Open UMTUBA from TestFlight **Open**.
- Confirm the app is UMTUBA, not Expo Go.

### 5. Identity check (after install only)

- Stay signed in if already signed in.
- Do **not** delete the account.
- Do **not** create a disposable account.
- Do **not** block a real user for QA.
- Open own Profile once and record name / @username before Like /
  Share / other-user tests.

---

## Live QA rules (after parent green light only)

The operator is **not** experienced with iPhone settings. When live
QA starts:

1. **One action at a time.** Give one tap. Wait for evidence.
2. **Simple Arabic** for the operator prompt. Name the exact
   control (شاهد، إنشاء، الملف، الإعدادات، سهم الرجوع، إعجاب،
   مشاركة، تعليق، نشر، إلغاء).
3. **Wait for evidence** before the next step.
4. Record each item as `PASS` / `FAIL` / `BLOCKED` /
   `NOT_TESTED` / `NOT_REPRODUCIBLE` only from **this** iPhone 13
   + Build 10 session.
5. Stay in **Arabic RTL first**.
6. If a check cannot be produced safely, leave it `NOT_TESTED` or
   `NOT_REPRODUCIBLE`. Do not invent PASS.

Recommended later order (do **not** run this turn):

1. Confirm Build **10**
2. Watch (Arabic): Like once → Share sheet (two choices visible) →
   **مشاركة رابط الفيديو** once → **مشاركة الفيديو كفيديو** once
   on the same post → swipe-during-share identity if safely
   observable → Comment once
3. Own Profile
4. One Arabic RTL secondary Back (Settings) if still in scope
5. Create: full library visible → cancel keeps A → replace A→B →
   one valid short publish → reset
6. Retry / late-callback **only if** they appear safely
7. Do **not** invent a long-video duration fail

---

## One-tap Arabic scripts (PREPARED — do not run this turn)

Give **one** line. Wait. Then the next line.

### Confirm build

1. افتح تطبيق **TestFlight** فقط.
2. ابحث عن **UMTUBA**.
3. اقرأ الرقم قبل التثبيت. هل مكتوب **1.0.0 (10)**؟
4. إذا كان (9) أو أقدم: توقف. لا تثبّت.
5. إذا كان (10): اضغط تثبيت أو تحديث، ثم افتح **UMTUBA**.

### Share two-choice

1. افتح تبويب **شاهد**. ابقَ على فيديو واحد منشور.
2. اضغط **مشاركة** مرة واحدة فقط.
3. هل ظهرت شاشتان فقط: **مشاركة رابط الفيديو** و **مشاركة الفيديو كفيديو** ومعهما **إلغاء**؟
4. اضغط **مشاركة رابط الفيديو**. ماذا فُتح؟ انسخ أو اكتب الرابط إن ظهر.
5. ارجع لنفس الفيديو. اضغط **مشاركة** مرة ثانية.
6. اضغط **مشاركة الفيديو كفيديو**. هل ظهر تجهيز؟ هل فُتح مشاركة ملف فيديو لنفس المنشور؟

### Create cancel / replace / reset

1. افتح **إنشاء**.
2. اضغط اختيار فيديو. هل تظهر المكتبة كاملة وليس جزءاً محدوداً؟
3. اختر فيديو قصير صالح. اكتب اسمه ومدته.
4. افتح الاختيار مرة ثانية ثم اضغط **إلغاء**. هل بقي نفس الفيديو؟
5. اختر فيديو آخر B. هل ظهر B فقط؟
6. بعد نشر ناجح لاحقاً: اخرج من **إنشاء** ثم ارجع. هل الشاشة فارغة؟

### Duration (do not invent a max)

1. اختر أطول فيديو عندك إن أردت ملاحظة فقط.
2. لا تفترض أنه مرفوض بسبب المدة.
3. اكتب المدة الظاهرة وهل زر **نشر** مفعّل أم لا، وحجم الملف إن ظهر.

---

## Explicitly out of scope this prep

- Installing or asking the operator to install
- Declaring any device PASS
- App Store Production / Submit for Review
- Android rebuild / versionCode bump
- Full locale matrix
- Historical Watch playback intermittent matrix
- Account deletion / disposable accounts

---

## Poll if TestFlight is still processing

```text
npx eas-cli submit:list --platform ios --limit 3
```

Expect submit `ecfed685-6b09-4826-aea2-351ba489f32c` to become
`finished`, then ASC internal “in beta testing” for **1.0.0 (10)**.
That still is **not** an iPhone install PASS.
