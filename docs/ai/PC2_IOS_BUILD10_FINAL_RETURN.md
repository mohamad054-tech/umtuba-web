# PC2 FINAL RETURN — iOS BUILD 10 LAUNCH BLOCKER

Official operator/Central lock. Record only. Do **not** rebuild, patch,
reopen Build 10, or convert Phase 2 `NOT_TESTED` gates to FAIL.

## Provenance

```text
APP_VERSION = 1.0.0
TESTFLIGHT_BUILD = 10
EAS_BUILD_ID = 9472a064-9e80-41b3-a61a-3473bc639c86
EAS_SUBMIT_ID = ecfed685-6b09-4826-aea2-351ba489f32c
SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
BUNDLE_ID = com.umtuba.app
DEVICE = physical iPhone 13
DATE = 2026-08-17
TASK_ID = PC2_IOS_BUILD10_FINAL_SHARE_CREATE_QA_V1
CURSOR_REPORT_OVERWRITTEN = NO
```

Evidence already on disk: `docs/ai/PC2_IOS_BUILD10_REPORT.md` (Phase 1
build/submit) and `docs/ai/PC2_IOS_BUILD10_CRASH_REPORT.md` (ASC dyld
logs). This file is the official final return, not a new investigation.

---

## Official lock (authoritative)

```text
PC2 FINAL RETURN — IOS BUILD 10 LAUNCH BLOCKER
DEVICE = physical iPhone 13
TESTFLIGHT_BUILD = 10
SOURCE_SHA = 4d329e1bed2e1bc1a90902a1781f1821c0009392
BUILD10_INSTALL = PASS
BUILD10_LAUNCH = FAIL_HARD
CRASH_LOG_FOUND = YES
CRASH_TIMESTAMP =
- 2026-08-17 17:08:33.2187 +0300
- 2026-08-17 17:11:22.0109 +0300
CRASH_SIGNATURE =
EXC_CRASH (SIGABRT)
DYLD 4 Symbol missing
MISSING_SYMBOL =
_$s15ExpoModulesCore10BaseModuleC11willDestroyyyFTj
REFERENCED_FROM =
ExpoMediaLibrary.framework
EXPECTED_IN =
ExpoModulesCore.framework
ROOT_CAUSE =
Build 10 ships an incompatible ExpoMediaLibrary / ExpoModulesCore binary pair.
expo-media-library 57.0.4 references BaseModule.willDestroy,
while the shipped expo-modules-core 57.0.6 does not export that symbol.
Process aborts during dyld launch before JS / Share / Create starts.
BUILD10_DEVICE_QA_CAN_CONTINUE = NO
PHASE2_RESULTS =
SHARE = NOT_TESTED
CREATE = NOT_TESTED
LIKE = NOT_TESTED
PROFILE = NOT_TESTED
COMMENT = NOT_TESTED
LANGUAGE = NOT_TESTED
WATCH = NOT_TESTED
Do not convert any of these to FAIL:
the application never reaches product runtime.
BUILD10_RELEASE_STATUS = REJECTED
NEW_IOS_BINARY_REQUIRED = YES
NEW_AUTHORITATIVE_SHA_REQUIRED = YES
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
PC2_ACTION_REQUIRED = NONE_UNTIL_NEW_SHA
CENTRAL_ACTION_REQUIRED =
1. Align expo-media-library with expo-modules-core.
2. Verify native dependency compatibility before building.
3. Produce ONE new authoritative shared mobile SHA.
4. Run native dependency/build validation.
5. Authorize next unused iOS build number.
6. PC2 installs replacement build.
7. Resume ONLY the Build 10 surgical Share/Create QA scope plus launch smoke.
DO_NOT =
- reopen Build 10
- rebuild from 4d329e1
- patch locally on PC2
- submit App Store Production
- rerun Build 9 broad QA
```

---

## Return fields

```text
BUILD10_RELEASE_STATUS = REJECTED
BUILD10_LAUNCH = FAIL_HARD
BUILD10_DEVICE_QA_CAN_CONTINUE = NO
PHASE2_SHARE = NOT_TESTED
PHASE2_CREATE = NOT_TESTED
NEW_IOS_BINARY_REQUIRED = YES
NEW_AUTHORITATIVE_SHA_REQUIRED = YES
PC2_ACTION_REQUIRED = NONE_UNTIL_NEW_SHA
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
```
