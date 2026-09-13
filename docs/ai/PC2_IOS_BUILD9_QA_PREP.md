# PC2 iOS BUILD 9 — surgical device QA prep

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD9_SURGICAL_QA_V1
DATE = 2026-08-17
PHASE = 2 PREP ONLY
MODE = SURGICAL_QA_PREP / WAITING_FOR_A1
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 9
AUTHORIZED_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
EAS_BUILD_ID = NOT_AVAILABLE
EAS_SUBMIT_ID = NOT_AVAILABLE
TESTFLIGHT_BUILD = NOT_INSTALLED
TESTFLIGHT_AVAILABLE = NO
IPHONE13_INSTALL = NOT_STARTED
BUILD9_INSTALLED = NO
BUILD9_AVAILABLE = WAITING_FOR_A1
DEVICE_QA_EXECUTED = NO
DEVICE_QA_RESULT = WAITING_FOR_BUILD9_INSTALL
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD8_RETESTED_AS_BUILD9 = NO
BUILD7_RETESTED_AS_BUILD9 = NO
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
SHARED_DEFECT_PATCHED_HERE = NO
```

This prep is **Build 9 only**. Do **not** test Build 8. Do **not**
fall back to Build 7 / 6 / 5 / 4. Do **not** declare any Build 8
result as a Build 9 result. Do **not** invent PASS.

A1 is building TestFlight **1.0.0 (9)** from Central SHA
`7b33bae707a0eecb4107f4373698630eaea7a1c5`. This turn has **no**
`EAS_BUILD_ID` and **no** installable Build 9. Checklist only.

Do **not** ask the operator to install Build 9 this turn.

Parent will resume when TestFlight **1.0.0 (9)** is available.

---

## Current status (this turn)

```text
DEVICE = physical iPhone 13
BUILD9_AVAILABLE = WAITING_FOR_A1
DEVICE_QA_RESULT = WAITING_FOR_BUILD9_INSTALL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WAITING_FOR_BUILD9
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
```

All authorized surgical fields (untested — A1 not finished, Build 9
not installed):

```text
CREATE_RESET = NOT_TESTED
CREATE_CANCEL = NOT_TESTED
CREATE_REPLACE = NOT_TESTED
LONG_VIDEO_PUBLISH_GATE = NOT_TESTED
DIRECT_PUBLISH_BOUNDARY = NOT_TESTED
RETRY_CURRENT_ASSET = NOT_TESTED
LATE_CALLBACK_GUARD = NOT_TESTED
LIKE_STATE = NOT_TESTED
OWN_PROFILE = NOT_TESTED
SHARE = NOT_TESTED
COMMENT = NOT_TESTED
LANGUAGE_SELECTOR = NOT_TESTED
LOCALE_OVERRIDE_PERSISTENCE = NOT_TESTED
RTL_BACK = NOT_TESTED
SIDE_VOLUME = NOT_TESTED
OLD_TOP_VOLUME_BAR = NOT_TESTED
MUTE_UNMUTE = NOT_TESTED
VOLUME_ADJUSTMENT = NOT_TESTED
WATCH_COLLISION = NOT_TESTED
WATCH_RTL = NOT_TESTED
WATCH_LTR = NOT_TESTED
PLAYBACK = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
```

Do **not** upgrade any of these fields this turn.

If a later live check cannot be produced safely, keep
`NOT_TESTED` or record `NOT_REPRODUCIBLE`. Never invent PASS.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave
`NOT_TESTED`:

1. A1 reports success with a real `EAS_BUILD_ID` built from
   `7b33bae707a0eecb4107f4373698630eaea7a1c5`.
2. Parent resumes this track with that `EAS_BUILD_ID`.
3. TestFlight shows **UMTUBA 1.0.0 (9)** as installable (internal).
4. The physical iPhone 13 has **Build 9** installed — not Build 8,
   not Build 7, not Build 6, not Build 5, not Build 4.
5. The operator confirms the TestFlight / App Information build
   number is **9**, not **8** or older.

Until then:

```text
BUILD9_AVAILABLE = WAITING_FOR_A1
BUILD9_INSTALLED = NO
DEVICE_QA_RESULT = WAITING_FOR_BUILD9_INSTALL
BLOCKERS = WAITING_FOR_BUILD9
```

Forbidden this turn and until the gate is closed:

- Declare PASS from source, from A1 “FINISHED”, or from ASC
  “in beta testing”.
- Test Build 8 / 7 / 6 / 5 / 4 and label it Build 9.
- Copy Build 8 Create leftover FAIL, Watch UI PASS/FAIL, or any
  older localization / RTL Back result into Build 9 fields.
- Ask the operator to install Build 9 before A1 succeeds.
- Redo closed broad Build 8 QA (lower-right overlap, RTL/LTR
  progress bar, selected-video `8200s` duration) unless this
  authorized scope touches it or new regression evidence appears.
- Rerun the full localization matrix (DE/FR/ES/PT).
- Rerun the full Arabic RTL Back five-screen gate.
- Reopen historical Watch playback stability / intermittent matrix.
- Independently patch shared defects.
- Manufacture a publish / retry / late-callback error by damaging
  production or the backend.
- Attempt unsafe / internal publish bypass (no exploit).
- Create disposable accounts. Delete the real account. Block real
  users for QA.
- Build, rebuild, re-upload, or Submit for Review / App Store
  Production.
- Modify Android `versionCode`.
- Reopen Store / Learning.
- Overwrite `docs/ai/CURSOR_REPORT.md`.

---

## Why this gate exists (context only — not a Build 9 result)

Build 8 on the physical iPhone 13 (`658936e`, TestFlight 1.0.0 (8))
left a Create leftover-asset FAIL and did not finish the rest of
the user-reported Create / social list. Those results are
**historical**. Do **not** copy them into Build 9 fields.

| Surface | Build 8 finding (context) | Build 9 rule |
| --- | --- | --- |
| Create leftover after prior select / publish path | FAIL — fresh Create still showed `IMG_0008.MOV` / `8s` | Re-prove `CREATE_RESET` on **9** only |
| Long-video publish / retry | Not finished on 8 | First authorized proof is on **9** |
| Watch overlap / progress / `8200s` duration | Closed Build 8 surgical set | Do **not** rerun unless new regression |
| RTL Back five-screen gate | PASS on Build 7 | **One** Arabic secondary only |
| Full locale matrix | Closed on Build 7 with open UI defects | Selector + one override + persist only |

Source SHA `7b33bae` is **not** a device PASS. Re-prove on
iPhone 13 + **1.0.0 (9)** only.

---

## Authorized scope (later, after install)

Test **only** the 16 numbered checks below, plus observational
`NEW_REGRESSION`. Stay surgical.

### CREATE (1–7)

1. `CREATE_RESET` — after a successful publish, fresh Create is empty
2. `CREATE_CANCEL` — cancel picker keeps the current valid asset
3. `CREATE_REPLACE` — asset B fully replaces asset A
4. `LONG_VIDEO_PUBLISH_GATE` — over-duration cannot publish
5. `DIRECT_PUBLISH_BOUNDARY` — exposed Publish UI only; no exploit
6. `RETRY_CURRENT_ASSET` — only if a safe Retry error already exists
7. `LATE_CALLBACK_GUARD` — only if a delayed callback is safely observable

### MOBILE user defects (8–14)

8. `LIKE_STATE` — record Like **before** toggle; no false active/red
9. `OWN_PROFILE` — useful profile, not a Settings-only shell
10. `SHARE` — tap Share **once**
11. `COMMENT` — tap Comment **once**
12. `LANGUAGE_SELECTOR` — selector opens; **one** manual override
13. `LOCALE_OVERRIDE_PERSISTENCE` — override survives app restart
14. `RTL_BACK` — **one** Arabic RTL secondary Back only

### WATCH (15–16)

15. Side volume: compact side control, no old top bar, mute / unmute /
    adjust, no collision, Arabic RTL + English LTR spot-check
16. Representative playback only

---

## Explicitly out of scope (do not rerun)

Do **not** rerun unless this binary is later shown to touch the
surface, or new regression evidence appears on Build 9:

| Surface | Why out |
| --- | --- |
| Full localization matrix (DE/FR/ES/PT + unsupported fallback) | Closed / not this SHA’s surgical list |
| Full RTL Back five-screen gate + LTR Back + Watch root no-op | One Arabic secondary only |
| Watch lower-right overlap / RTL+LTR progress / `8200s` duration | Closed Build 8 surgical set |
| Saved / Follow / Messages send / Session / Background-Resume | Closed earlier; not this list |
| Full Create-upload / Open-after-upload matrix | Only the seven Create items above |
| Historical playback intermittent matrix | One representative clip |
| Account deletion / disposable accounts / block real users | Forbidden |
| App Store Production submit | Forbidden |

If a surgical check itself exposes a crash, dead control, or broken
playback, record `NEW_REGRESSION` and stop expanding. Do not turn
that into a full matrix.

---

## Operator install steps (PREPARED — do not run this turn)

Use these **only** after parent resume includes `EAS_BUILD_ID` and
TestFlight shows Build 9. Windows cannot push the IPA. Install is
iPhone-only via TestFlight.

**This turn: do not install. Do not ask the operator to install.**

### 0. Wait for A1 + TestFlight upload

```text
WAIT_FOR = A1 success + parent resume with EAS_BUILD_ID
EAS_BUILD_ID = NOT_AVAILABLE
EAS_SUBMIT_ID = NOT_AVAILABLE
SOURCE_SHA_REQUIRED = 7b33bae707a0eecb4107f4373698630eaea7a1c5
TESTFLIGHT_1.0.0_9 = NO
DO_NOT_INSTALL_YET = YES
DO_NOT_INSTALL_BUILD_8 = YES
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

### 2. Confirm it is Build 9, not 8 / 7 / 6 / 5 / 4

On the TestFlight app page, read the version line **before** tapping
Install or Update:

| Must see | Must not treat as Build 9 |
| --- | --- |
| **1.0.0 (9)** | **1.0.0 (8)** |
| Build **9** | **1.0.0 (7)** / **(6)** / **(5)** / **(4)** / **(3)** |

If the page still shows **(8)** (or older):

- Do **not** install or “update”.
- Do **not** start the surgical list.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_8` (or `_7` / `_6` / `_5`).

### 3. Install or update to 1.0.0 (9)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version
  **1.0.0**, build **9**.
- If the installed build is still 8, 7, 6, 5, or 4: stop.
  `IPHONE13_INSTALL = FAIL_WRONG_BUILD`.

### 4. Cold launch once

- Force-quit UMTUBA if it was already open from Build 8 / 7 / 6 / 5 / 4.
- Open UMTUBA from TestFlight **Open** (or the home-screen icon
  **after** confirming build 9).
- Confirm the app is UMTUBA, not Expo Go.

### 5. Identity check (after install only)

- Stay signed in if already signed in.
- Do **not** delete the account.
- Do **not** sign out to “prepare” the phone.
- Do **not** create a disposable account.
- Do **not** block a real user for QA.
- Open own Profile once and record name / @username before Like /
  Share / other-user tests.

---

## Live QA rules (after parent green light only)

The operator is **not** experienced with iPhone settings. When live
QA starts:

1. **One action at a time.** Give one tap. Wait for evidence. Do
   not stack “then also open X”.
2. **Simple Arabic** for the operator prompt. Name the exact
   control the operator already knows (شاهد، إنشاء، الملف، الإعدادات،
   سهم الرجوع، إعجاب، مشاركة، تعليق، نشر).
3. **Wait for evidence** before the next step.
4. Record each item as `PASS` / `FAIL` / `BLOCKED` /
   `NOT_TESTED` / `NOT_REPRODUCIBLE` only from **this** iPhone 13
   + Build 9 session.
5. Stay in **Arabic RTL first** for Watch volume RTL, Like, Share,
   Comment, own Profile, and the one RTL Back. Switch language
   only when the language-override checks start.
6. If a check cannot be produced safely, leave it `NOT_TESTED` or
   `NOT_REPRODUCIBLE`. Do not invent PASS.

Recommended later order (do **not** run this turn):

1. Confirm Build **9**
2. Watch (Arabic): Like state → Share once → Comment once →
   side volume / mute / adjust / collision / RTL → one playback
3. Own Profile
4. One Arabic RTL secondary Back (Settings)
5. Create: cancel → replace A→B → long-video gate → UI publish
   boundary → one valid short publish → reset
6. Retry / late-callback **only if** they appear safely
7. Language selector + one override → restart persist → English
   LTR volume spot-check

---

## Mandatory physical checks (after Build 9 is installed)

Do **not** execute these this turn. Later: one action at a time.

### CREATE

#### 1. CREATE_RESET

```text
CREATE_RESET = NOT_TESTED
```

Do this **after** one successful short-video publish on Build 9
(not before). Then reopen Create as a fresh screen (leave Create,
return to the Create tab, or open Create again after the success
sheet is dismissed).

PASS only if fresh Create shows:

- no previous filename
- no previous duration
- caption empty
- terms unchecked
- no success state (“Video published.” / Arabic equivalent gone)
- no stale upload identity

FAIL if leftover filename / duration / success / prior asset
remains (Build 8 class: leftover `IMG_0008.MOV`).

Later operator script (after a successful publish only):

1. اخرج من **إنشاء** ثم ارجع إليه.
2. هل الشاشة فارغة؟ هل بقي اسم فيديو أو مدة أو علامة نجاح؟

Do **not** treat a leftover from Build 8 as a Build 9 result.
The publish used for this check must happen **on Build 9**.

#### 2. CREATE_CANCEL

```text
CREATE_CANCEL = NOT_TESTED
```

With a **valid current asset** already selected (short real clip):
open the picker, then **cancel** without choosing another file.

PASS only if the current valid asset stays unchanged (same name /
duration / type). FAIL if cancel clears the asset or swaps in
something else.

Later operator script:

1. في **إنشاء**، اختر فيديو قصير صالح.
2. اكتب الاسم والمدة الظاهرة.
3. افتح اختيار الفيديو مرة ثانية ثم اضغط إلغاء.
4. هل بقي نفس الفيديو؟

#### 3. CREATE_REPLACE

```text
CREATE_REPLACE = NOT_TESTED
```

Select asset **A**, then choose a different asset **B**.

PASS only if B completely replaces A: B filename / duration only.
No A filename, duration, or upload identity remains.

Later operator script:

1. اختر فيديو A. اكتب اسمه ومدته.
2. اختر فيديو آخر B.
3. هل ظهر B فقط؟ هل بقي أي أثر من A؟

#### 4. LONG_VIDEO_PUBLISH_GATE

```text
LONG_VIDEO_PUBLISH_GATE = NOT_TESTED
```

Select a confirmed **over-duration** video (several minutes if one
exists in Photos). Do **not** invent a duration ceiling if the
on-screen limit is not shown. Record the on-screen duration and
any validation copy exactly.

PASS only if:

- duration / validation is shown correctly
- **Publish** is disabled (or the UI clearly refuses)
- the invalid asset cannot publish

Do **not** tap Publish if the button is disabled. Do **not**
publish an unwanted / invalid video.

Later operator script:

1. في **إنشاء**، اختر أطول فيديو عندك (عدة دقائق إن وُجد).
2. لا تضغط **نشر**.
3. اكتب: الاسم / المدة إن ظهرت، هل ظهرت رسالة تحذير، هل زر نشر معطّل أم مفعّل.

If no over-duration clip exists on the phone: `NOT_REPRODUCIBLE`,
not PASS.

#### 5. DIRECT_PUBLISH_BOUNDARY

```text
DIRECT_PUBLISH_BOUNDARY = NOT_TESTED
```

**UI only.** Use the actual exposed Publish control on the invalid
(over-duration) Create screen. Confirm the invalid duration cannot
bypass that UI gate.

- If Publish is disabled: record that. Do not hunt for another
  hidden control.
- If Publish is enabled: **one** tap only. Record the exact
  on-screen refusal or, if it starts an upload, `FAIL`. Stop.
- Do **not** attempt unsafe / internal exploitation, URL/API
  bypass, debugger tricks, or crafted payloads.

Later operator script (only if Publish looks enabled on the long
video):

1. اضغط **نشر** مرة واحدة فقط.
2. ماذا ظهر؟ هل رُفض؟ هل بدأ الرفع؟

#### 6. RETRY_CURRENT_ASSET

```text
RETRY_CURRENT_ASSET = NOT_TESTED
```

Run **only** if a safe, already-visible Retry / error state exists
on the **current** Create asset (for example a failed upload of
the video now on screen). Do **not** damage production, toggle
Airplane Mode to force a failure, or break the backend to
manufacture Retry.

PASS only if Retry targets the **current** asset, never a stale
previously uploaded asset.

If no safe Retry state appears: keep `NOT_TESTED` or
`NOT_REPRODUCIBLE`. Do not invent PASS.

#### 7. LATE_CALLBACK_GUARD

```text
LATE_CALLBACK_GUARD = NOT_TESTED
```

Verify **only** through a safe observable flow or log evidence
already available from the authorized Build 9 session. An old
upload callback must not mutate a newer Create session (must not
restore an old filename / success / identity after the user has
moved on).

If a real delayed callback cannot safely be produced: keep
`NOT_TESTED` or `NOT_REPRODUCIBLE`. Do **not** fabricate PASS.

---

### MOBILE user defects

#### 8. LIKE_STATE

```text
LIKE_STATE = NOT_TESTED
```

On Watch, pick a **known-unliked** other-user post. **Before**
tapping Like, record the initial visual state (outline vs filled /
red / active).

PASS only if the initial state is **not** a false active / red
Like. Then one Like tap is optional after the initial state is
recorded; the required proof is the **before** state.

Do not use the operator’s own post if that would confuse liked
vs unliked. Do not spam Like.

Later operator script:

1. افتح **شاهد** على فيديو لشخص آخر لم تضغط إعجابه من قبل.
2. انظر إلى قلب الإعجاب **قبل** الضغط. هل هو فارغ أم أحمر؟
3. لا تضغط بعد. اكتب ما تراه.

#### 9. OWN_PROFILE

```text
OWN_PROFILE = NOT_TESTED
```

Open **own** Profile (Profile tab or Watch identity control).

PASS only if it is a complete useful profile / content experience
(own name, @username, and actual profile/content surfaces — not a
Settings-only shell). Record what is actually present (avatar,
counts, posts grid, Settings entry, empty-state copy).

FAIL if the screen is Settings-only, “Profile not found”, or
another user’s profile.

Later operator script:

1. افتح تبويب **الملف**.
2. هل هذا ملفك؟ اكتب ماذا يظهر: الاسم، المنشورات، الإعدادات فقط، أو شيء ناقص.

#### 10. SHARE

```text
SHARE = NOT_TESTED
```

Tap **Share once** on a safe other-user (or own) post.

PASS if a share UI / action responds. Do **not** actually send
externally unless the sheet cannot be dismissed without it. Cancel
the system sheet.

If Share is clearly disabled / unsupported with truthful UI, record
that exact state. Do not fabricate support.

Later operator script:

1. في **شاهد**، اضغط **مشاركة** مرة واحدة.
2. ماذا ظهر؟ لا ترسل لأي شخص. ألغِ إن ظهرت قائمة النظام.

#### 11. COMMENT

```text
COMMENT = NOT_TESTED
```

Tap **Comment once**.

PASS if a functional Comment flow opens, **or** the UI shows a
truthful clearly unsupported state. Do not fabricate comment
support. Do not post a comment unless the flow cannot be observed
without one short test comment on a safe post.

Later operator script:

1. في **شاهد**، اضغط **تعليق** مرة واحدة.
2. ماذا ظهر؟ هل فتحت كتابة تعليق أم أن الميزة غير مدعومة بوضوح؟

#### 12. LANGUAGE_SELECTOR

```text
LANGUAGE_SELECTOR = NOT_TESTED
```

Settings → Language. Selector must open. Perform **one** manual
override only (prefer English if the app is currently Arabic).

PASS if the selector opens and that one override applies (chrome
language changes). Do not walk DE/FR/ES/PT.

Later operator script:

1. **الملف** → **الإعدادات** → **اللغة**.
2. هل فتحت قائمة اللغة؟
3. اختر **English** مرة واحدة.
4. هل تغيّرت لغة التطبيق؟

#### 13. LOCALE_OVERRIDE_PERSISTENCE

```text
LOCALE_OVERRIDE_PERSISTENCE = NOT_TESTED
```

After the one override: force-quit UMTUBA, reopen.

PASS only if the manual override is still in effect (not silently
reset to device Arabic). Do not infer from source.

Later operator script:

1. أغلق التطبيق بالكامل من قائمة التطبيقات المفتوحة.
2. افتح UMTUBA مرة ثانية.
3. هل بقيت اللغة التي اخترتها؟

#### 14. RTL_BACK (one Arabic secondary only)

```text
RTL_BACK = NOT_TESTED
```

Arabic RTL. Test **one** representative secondary screen only:
**Profile → Settings → Back**. Do **not** rerun Conversation /
other-user Profile / Notifications / Language / Watch-root / LTR
Back / the old five-screen gate.

PASS only if:

- chevron is **RIGHT**
- tap on the **visible** right chevron returns to own Profile
- never noop, never exit the app, never show `(tabs)`

Do this **before** the English override, or switch back to Arabic
first. One screen only.

Later operator script:

1. تأكد أن التطبيق بالعربية.
2. **الملف** → **الإعدادات**.
3. سهم الرجوع: يمين أم يسار؟
4. اضغط السهم الظاهر مرة واحدة.
5. هل رجعت إلى **الملف**؟

---

### WATCH

#### 15. Side volume + collision + RTL/LTR

```text
SIDE_VOLUME = NOT_TESTED
OLD_TOP_VOLUME_BAR = NOT_TESTED
MUTE_UNMUTE = NOT_TESTED
VOLUME_ADJUSTMENT = NOT_TESTED
WATCH_COLLISION = NOT_TESTED
WATCH_RTL = NOT_TESTED
WATCH_LTR = NOT_TESTED
```

On Watch (Arabic first), look at volume chrome only.

PASS for `SIDE_VOLUME` only if a **compact side** volume control
is present.

PASS for `OLD_TOP_VOLUME_BAR` only if the **old top volume bar is
absent** (record `ABSENT` / `PRESENT`). A present old top bar is
FAIL for this check.

Then, still one action at a time:

- Mute works
- Unmute works
- Volume adjustment works (side control, not a reopened 240px top
  / wide bar)
- No collision with captions, action rail, or progress
- Arabic RTL layout of the side control is correct
- After the English override (or a later LTR spot-check): English
  LTR layout is correct

Do not treat LTR PASS as a substitute for RTL PASS.

Later operator script (Arabic first):

1. افتح **شاهد**.
2. أين زر الصوت؟ على الجانب أم شريط أعلى الشاشة؟
3. اضغط كتم مرة. ثم ألغِ الكتم.
4. حرّك مستوى الصوت قليلاً.
5. هل يغطي الصوت النص أو الأزرار أو شريط التقدم؟

English LTR later, after language override:

1. في English، افتح Watch.
2. هل زر الصوت الجانبي ما زال في مكانه الصحيح؟ هل رجع الشريط العلوي القديم؟

#### 16. Representative playback

```text
PLAYBACK = NOT_TESTED
```

Play **one** already-published real video. Do not publish a new
one for this check. Do not reopen the Build 4 intermittent matrix.

PASS only if that clip starts and plays without a new player
error, crash, black screen, or frozen first frame caused by this
binary.

This is **not** `PLAYBACK_STABILITY = PASS`.

Later operator script:

1. في **شاهد**، شغّل فيديو واحد موجود.
2. هل اشتغل الصوت والصورة؟ هل ظهرت رسالة خطأ؟

#### New regression (observational)

```text
NEW_REGRESSION = NOT_TESTED
```

Record `NONE_OBSERVED` only if the authorized checks ran and
nothing outside them broke. Record `YES` + one sentence if a new
defect appears. Do not then expand into Saved / Follow / Messages
/ full localization unless parent authorizes.

---

## Gate close rule

```text
DEVICE_QA_RESULT = PASS
```

may be set only when **all** of these are true on iPhone 13 +
**1.0.0 (9)**:

- `BUILD9_INSTALLED = YES` (operator confirmed 9, not 8/7/6/5/4)
- Every authorized field above is `PASS`, except
  `RETRY_CURRENT_ASSET` and `LATE_CALLBACK_GUARD`, which may remain
  `NOT_REPRODUCIBLE` if no safe error / delayed callback existed
- `NEW_REGRESSION = NONE_OBSERVED`

`NOT_TESTED` on a required check is **not** PASS.

This track still does **not** Submit for Review / Production.

```text
APP_STORE_PRODUCTION_SUBMITTED = NO
```

---

## After A1 succeeds (parent resume)

Expected resume payload:

```text
EAS_BUILD_ID = <from A1>
BUILD_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
APP_VERSION = 1.0.0
BUILD_NUMBER = 9
TESTFLIGHT_AVAILABLE = YES_INTERNAL | <A1 value>
```

Then, and only then:

1. Ask the operator to install **1.0.0 (9)** using the steps above.
2. Confirm build number **9** on device (not 8, not 7, not 6).
3. Run the surgical list, **one action at a time**, simple Arabic.
4. Do **not** Submit for Review / Production from this track.

If A1 fails or Build 9 is not installable: keep

```text
BUILD9_AVAILABLE = WAITING_FOR_A1
DEVICE_QA_RESULT = WAITING_FOR_BUILD9_INSTALL
BLOCKERS = WAITING_FOR_BUILD9
```

---

## Historical context (do not copy into Build 9 fields)

```text
BUILD8_SOURCE_SHA = 658936e18718606a3b3d30753e717d7fe9e86a18
BUILD8_EAS_BUILD_ID = 64047c6d-3042-4e80-b6f5-386c288b8fe2
BUILD8_CREATE_PREVIOUS_UPLOAD_STATE_RESET = FAIL
BUILD8_LEFTOVER_ASSET = IMG_0008.MOV
BUILD8_LONG_VIDEO_PUBLISH_RETRY = NOT_FINISHED
BUILD8_WATCH_OVERLAP_PROGRESS_DURATION = CLOSED_SURGICAL_SET_DO_NOT_RERUN
BUILD7_SOURCE_SHA = 74188bea5a23269c3d19448894c6ad5381e3b3a9
BUILD7_RTL_BACK_GATE = PASS
BUILD7_EAS_BUILD_ID = 67147f93-9c70-4631-8257-ff80628a49f6
```

Build 8 is superseded for this list. Do not install it. Do not
finish or reuse a Build 8 device session as Build 9 evidence.

---

## What was not done (by design)

- No device install request this turn
- No Build 9 binary build / submit / Production submit
- No Android `versionCode` change
- Store / Learning not reopened
- No shared-defect patch
- No invented device PASS
- `docs/ai/CURSOR_REPORT.md` not overwritten
- `docs/ai/CURRENT_TASK.md` not overwritten
- No surgical field left `NOT_TESTED` was upgraded
- Closed Build 8 overlap / progress / duration QA not rerun
- Full localization / full RTL Back / Saved / Follow / Messages
  / Session / Background / playback matrix not rerun

---

## Return fields (this turn — prep only)

```text
TASK_ID = PC2_IOS_BUILD9_SURGICAL_QA_V1
DEVICE = physical iPhone 13
BUILD9_SOURCE_SHA = 7b33bae707a0eecb4107f4373698630eaea7a1c5
BUILD9_AVAILABLE = WAITING_FOR_A1
CREATE_RESET = NOT_TESTED
CREATE_CANCEL = NOT_TESTED
CREATE_REPLACE = NOT_TESTED
LONG_VIDEO_PUBLISH_GATE = NOT_TESTED
DIRECT_PUBLISH_BOUNDARY = NOT_TESTED
RETRY_CURRENT_ASSET = NOT_TESTED
LATE_CALLBACK_GUARD = NOT_TESTED
LIKE_STATE = NOT_TESTED
OWN_PROFILE = NOT_TESTED
SHARE = NOT_TESTED
COMMENT = NOT_TESTED
LANGUAGE_SELECTOR = NOT_TESTED
LOCALE_OVERRIDE_PERSISTENCE = NOT_TESTED
RTL_BACK = NOT_TESTED
SIDE_VOLUME = NOT_TESTED
OLD_TOP_VOLUME_BAR = NOT_TESTED
MUTE_UNMUTE = NOT_TESTED
VOLUME_ADJUSTMENT = NOT_TESTED
WATCH_COLLISION = NOT_TESTED
WATCH_RTL = NOT_TESTED
WATCH_LTR = NOT_TESTED
PLAYBACK = NOT_TESTED
NEW_REGRESSION = NOT_TESTED
DEVICE_QA_RESULT = WAITING_FOR_BUILD9_INSTALL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WAITING_FOR_BUILD9
CENTRAL_ACTION_REQUIRED = WAIT_FOR_A1_THEN_PARENT_RESUME
OPERATOR_INSTALL_ASKED_THIS_TURN = NO
EAS_BUILD_ID = NOT_AVAILABLE
```
