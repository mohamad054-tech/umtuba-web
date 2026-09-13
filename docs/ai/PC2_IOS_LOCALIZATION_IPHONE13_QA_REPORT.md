# PC2-A2 iOS LOCALIZATION — iPhone 13 QA report (Build 6)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_LOCALIZATION_IPHONE13_QA_V1
DATE = 2026-08-16
MODE = DEVICE_QA_IN_PROGRESS / STEP_03_ARABIC_RTL
DEVICE = PC2 + physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 6
AUTHORIZED_CENTRAL_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
BUILD_SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
EAS_BUILD_ID = 7d0dd256-fdb0-42c3-8a4d-0833fcaae656
EAS_SUBMIT_ID = 8d6ab5a2-27ad-4b22-9798-fa809cdaf0d1
BUILD_RESULT = FINISHED
TESTFLIGHT_BUILD6_AVAILABLE = YES_INTERNAL
APPLE_STATUS = 1.0.0 (6) — internal: in beta testing
TESTFLIGHT_BUILD = 6
IPHONE13_INSTALL = OPERATOR_CONFIRMED
BUILD6_INSTALLED = YES
DEVICE_QA_EXECUTED = IN_PROGRESS
IOS_LOCALIZATION_DEVICE_QA = IN_PROGRESS_STEP_03_ARABIC_RTL
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
A1_FAILING_TESTS_PATCHED = NO
```

Operator confirmed Build **6**. Authorized locale-detection results are
recorded below. App is back in **device-language Arabic**. Step 3 Arabic
RTL is **IN_PROGRESS**. `OVERRIDE_PERSISTENCE` after restart is **not**
inferred. Do **not** invent additional PASS.

---

## Phase 1 — A1 binary (from Central GO; this track did not rebuild)

```text
SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
BUILD_SOURCE_SHA = c48b4b2898b116a39e90b85221ae1856f446d0a0
EAS_BUILD_ID = 7d0dd256-fdb0-42c3-8a4d-0833fcaae656
EAS_SUBMIT_ID = 8d6ab5a2-27ad-4b22-9798-fa809cdaf0d1
APP_VERSION = 1.0.0
BUILD_NUMBER = 6
BUILD_RESULT = FINISHED
TESTFLIGHT_BUILD6_AVAILABLE = YES_INTERNAL
APPLE_STATUS = 1.0.0 (6) — internal: in beta testing
```

A1 unit tests on the authorized SHA: FAIL 2/478 (`appStoreConfig` still
expects `buildNumber` `"1"`; wallet grouping locale on Windows). TYPECHECK
PASS. LINT PASS. This track did **not** patch those tests.

---

## Phase 2 — iPhone 13 install (operator confirmed)

```text
OPERATOR_DEVICE = iPhone 13
UMTUBA_VERSION = 1.0.0
TESTFLIGHT_BUILD = 6
BUILD6_INSTALLED = YES
INSTALL_REPEATED = NO
```

---

## Phase 3 — Device QA (in progress)

```text
CURRENT_STEP = 03_ARABIC_RTL
APP_MODE = DEVICE_LANGUAGE_ARABIC
IPHONE_PRIMARY_LANGUAGE = Arabic
DEVICE_LOCALE_DETECTION = PASS_FOR_ARABIC
MANUAL_OVERRIDE_ENGLISH = PASS
RESET_OVERRIDE_USES_DEVICE = PASS
DEVICE_LANGUAGE_AFTER_RESET = ARABIC
MANUAL_OVERRIDE_PERSIST_RESTART = NOT_TESTED
ARABIC_RTL = IN_PROGRESS
```

### First-screen evidence (Watch) — recorded, not PASS

Operator observations only (nothing extra invented):

```text
FIRST_SCREEN_LANGUAGE_VISIBLE = ARABIC
BOTTOM_TABS = [شاهد, اكتشف, إنشاء, الرسائل, الملف]
WATCH_TITLE = شاهد
AUTO_NEXT = التشغيل التلقائي التالي مفعّل
MUTE = كتم
RTL_LAYOUT = YES
BACK_ARROW_POSITION = RIGHT
BOTTOM_NAV_RTL = YES
RAW_KEYS_VISIBLE = NONE_OBSERVED
OBVIOUS_CLIPPING = NONE_ON_THIS_SCREEN
PRODUCT_TERMS_LEFT_ENGLISH = Rising; UM
UGC_TITLE_CAPTION_NOT_COUNTED_AS_LEAKAGE = YES
```

`Rising` and `UM` are noted as possible product terms, not scored as
`ENGLISH_LEAKAGE` this turn. User-generated video title/caption is not
localization leakage.

### Language-screen evidence — recorded, not PASS

Operator observations only:

```text
DEVICE_LANGUAGE_DISPLAYED = العربية
CURRENT_SELECTED_LANGUAGE = العربية
SUPPORTED_LANGUAGES_VISIBLE = ar,en,fr,es,de,pt
USE_DEVICE_LANGUAGE_BUTTON = PRESENT
LANGUAGE_SCREEN_RTL = YES
BACK_ARROW_RTL_POSITION = RIGHT
RAW_KEYS = NONE_VISIBLE
CLIPPING = NONE_VISIBLE
ARABIC_HAS_CHECKMARK = YES
```

Probe A is already answered by this evidence: العربية has the checkmark;
**استخدام لغة الجهاز** is a button, not a selected row. That does **not**
prove override vs device mode (`language.tsx` on `c48b4b2` draws ✓ on the
effective locale in both modes). Do **not** infer override. Do **not**
mark `DEVICE_LOCALE_DETECTION` PASS.

### Locale detection — authorized results (do not expand)

Operator-authorized only:

```text
IPHONE_PRIMARY_LANGUAGE = Arabic
UMTUBA_WAS_ARABIC = YES
MANUAL_OVERRIDE_ENGLISH = PASS
RESET_OVERRIDE_USES_DEVICE = PASS
DEVICE_LANGUAGE_AFTER_RESET = ARABIC
DEVICE_LOCALE_DETECTION = PASS_FOR_ARABIC
```

Operator changed UMTUBA to English (override), then pressed Use device
language; UMTUBA returned to Arabic matching the iPhone. Do **not** infer
`OVERRIDE_PERSISTENCE` after restart. Full `MANUAL_OVERRIDE` (all locales
+ persist) is not claimed — only `MANUAL_OVERRIDE_ENGLISH`.

### Next operator action (this turn)

Step 3 only. Stay in Arabic. Do not jump to German.

Open bottom tab **شاهد**. Look at the top Back arrow. Tap it once.
Report: arrow on the right or left? stayed on Watch or left the app?
any clipping? any English on app buttons (ignore video titles)?

---

## Device results

Authorized updates only. All other fields stay `NOT_TESTED`.

```text
ARABIC = IN_PROGRESS
GERMAN = NOT_TESTED
FRENCH = NOT_TESTED
ENGLISH = NOT_TESTED
SPANISH = NOT_TESTED
PORTUGUESE = NOT_TESTED
DEVICE_LOCALE_DETECTION = PASS_FOR_ARABIC
DEVICE_LANGUAGE_SUPPORTED = PASS_FOR_ARABIC
DEVICE_LANGUAGE_UNSUPPORTED_FALLBACK = NOT_TESTED
MANUAL_OVERRIDE = NOT_TESTED
MANUAL_OVERRIDE_ENGLISH = PASS
MANUAL_OVERRIDE_PERSIST_RESTART = NOT_TESTED
RESET_OVERRIDE = PASS
RESET_OVERRIDE_USES_DEVICE = PASS
DEVICE_LANGUAGE_AFTER_RESET = ARABIC
ENGLISH_LEAKAGE = NOT_TESTED
MISSING_KEYS = NOT_TESTED
RAW_KEYS = NOT_TESTED
UI_OVERFLOW = NOT_TESTED
RTL = IN_PROGRESS
DIRECTIONAL_ICONS = IN_PROGRESS
TEXT_OVERLAP = NOT_TESTED
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
IOS_RELEASE_BLOCKERS = DEVICE_QA_IN_PROGRESS
APP_STORE_PRODUCTION_SUBMITTED = NO
```

---

## What was not done (by design)

- No device PASS/FAIL invented
- Build 4 / Build 5 results not copied forward
- Full checklist not dumped on the operator
- No App Store Production / App Review submit
- No Android `versionCode` change
- Store / Learning not reopened
- No playback fix invented
- Account deletion not requested
- `docs/ai/CURSOR_REPORT.md` not overwritten
- `docs/ai/CURRENT_TASK.md` not overwritten

---

## Next

Wait for Watch Back-arrow RTL evidence (side, stay-or-exit, clipping,
app-button English). Stay in Arabic. Do not restart for persistence.
Do not jump to German. Do not declare App Store release readiness.
