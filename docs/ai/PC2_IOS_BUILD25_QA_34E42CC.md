# PC2_IOS_BUILD25_QA_34E42CC

PATH B. Official App Store Connect API inspected on 2026-08-22. New `34e42cc` Build 25 never reached Apple. Number 25 is consumed by leftover `21ec031`. No rebuild. No Build 26 created. No leftover QA. No Add for Review.

```text
PACKET = PC2_IOS_BUILD25_QA_34E42CC
TASK_ID = PC2_IOS_BUILD25_QA_34E42CC
STATUS = BLOCKED_BUILD25_NUMBER_CONSUMED_OLD_BINARY_ONLY
DATE = 2026-08-22
OPERATOR = PC2
DEVICE = iPhone 13
AUTHORITATIVE_SHA_REQUIRED = 34e42cc0cdd27a850d5b485d5786c22114531ed8
GIT_REV_PARSE_HEAD = 34e42cc0cdd27a850d5b485d5786c22114531ed8
EAS_BUILD_ID = 999b618b-ed2b-4375-9869-e565f84295e4
BUILD_STATUS = FINISHED
SOURCE_SHA = 34e42cc0cdd27a850d5b485d5786c22114531ed8
APP_VERSION = 1.0.0
BUILD_NUMBER = 25
ARTIFACT_AVAILABLE = YES
TESTFLIGHT_BUILD_NUMBER = 25
SUBMISSION_ID = e3440a81-e80a-4676-ac8b-e3e1a7145ce7
PRIOR_SUBMISSION_ID = 06a17954-024d-421f-834c-dedb1a3e6474
TESTFLIGHT_SUBMISSION = ERRORED
TESTFLIGHT_STATUS = APPLE_ONLY_OLD_1.0.0_25_IN_BETA_TESTING
INSTALLED_ON_IPHONE13 = NO_34E42CC
INSTALLED_BINARY_CONFIRMED_34E42CC = NO
PHONE_CONTAINER = E217B62A-061F-47AF-BA0F-DC9E9811F16B
BUILD_24_REUSED = NO
OLD_21EC031_BUILD25_REUSED_FOR_QA = NO
COLD_LAUNCH_WATCH_1_10 = NOT_RUN
STRESS_20_PLUS = NOT_RUN
FORCE_QUIT_CYCLES = NOT_RUN
LEAVE_WATCH_RETURN = NOT_RUN
NO_57S_STALL = NOT_RUN
NO_12_20S_STALL = NOT_RUN
NO_PREVIOUS_AUDIO_OVERLAP = NOT_RUN
ONE_ACTIVE_PLAYER = NOT_RUN
SIGNED_URL_403_NOT_BLOCKING = NOT_RUN
PROFILE_BACK_TO_WATCH = NOT_RUN
FOLLOWERS_FOLLOWING_NAV_LOCK = NOT_RUN
FOLLOWERS_OWN_PROFILE = NOT_RUN
FOLLOWING_OWN_PROFILE = NOT_RUN
FOLLOWERS_OTHER_PROFILE = NOT_RUN
FOLLOWING_OTHER_PROFILE = NOT_RUN
OWN_PROFILE_FALLBACK = NOT_RUN
PASSWORD_EYE = NOT_RUN
AUTOFILL_METADATA_SMOKE = NOT_RUN
WARM_CACHE_ONLY = NO
NEW_DEFECTS = NONE_THIS_TURN_QA_NOT_STARTED
SHARED_DEFECTS = FOLLOWERS_FOLLOWING_LIST_NOT_OPENING_PRIOR_REPORT_NOT_RETESTED
PC2_FINAL_STATUS = BLOCKED
SOURCE_PATCHED = NO
ADD_FOR_REVIEW = NO
APP_STORE_PRODUCTION = NO
CENTRAL_APP_STORE_GO_REQUIRED = YES
PATH = B
BUILD25_REUPLOAD_POSSIBLE = NO
BUILD26_REQUIRED = YES
BUILD26_CREATED = NO
ASC_UI_LOGIN = BLOCKED_ASC_LOGIN
```

## Exact required fields

```text
BUILD25_VISIBLE_IN_APP_STORE_CONNECT = YES
BUILD25_PROCESSING = NO
BUILD25_AVAILABLE_IN_TESTFLIGHT = YES
BUILD25_INVALID_BINARY = NO
BUILD25_APPLE_ERROR = NONE_ON_EXISTING_BUILD
BUILD25_UPLOAD_TIMESTAMP = 2026-08-22T05:42:44-07:00
BUILD25_IDENTITY_CAN_BE_DISTINGUISHED_FROM_OLD_BUILD25 = YES_SINGLE_APPLE_BUILD25_IS_OLD_21EC031_SLOT
```

## Path B stop

```text
BUILD25_REUPLOAD_POSSIBLE = NO
REASON = Apple already has exactly one 1.0.0 (25). It is VALID, not expired, IN_BETA_TESTING. Its uploadedDate is 2026-08-22T05:42:44-07:00 (12:42:44Z), which is before the 34e42cc IPA finished (14:51:17Z) and matches leftover 21ec031 submit 3669fbe3 (created 12:41:29Z). Official ASC filter[version]=25 count is 1. There is no second PROCESSING/INVALID/FAILED Build 25. Apple uniquely identifies a build by the build string, so another CFBundleVersion 25 upload is not permitted.
APPLE_EVIDENCE = Official App Store Connect API on app 6801665530 / UMTUBA. GET builds filter[app]=6801665530 filter[version]=25 returned COUNT=1 appleBuildId=deaa9c3a-80e7-4606-8184-724495f2b263 processingState=VALID internalBuildState=IN_BETA_TESTING expired=false uploadedDate=2026-08-22T05:42:44-07:00. Latest 23 builds contain no second 25. Apple Help: "The build string is used to uniquely identify the build throughout the system." https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
BUILD26_REQUIRED = YES
```

Do **not** create Build 26 until Central authorizes. Evidence that 26 is required is now established.

---

## ASC inspection method

1. **UI:** Cursor browser MCP could not open a tab (`No browser tab available`). Local Apple ID cookie restore returned `Session expired Local session`. **BLOCKED_ASC_LOGIN** for the website.
2. **Official ASC API:** succeeded with the EAS-stored App Store Connect API key. App = **UMTUBA** `6801665530`.
3. `eas submit:status --json` also hits that API, but its **EAS linkage is wrong**: it matches by build number and attributed this Apple 25 to failed `e3440a81` / `999b618b` / fingerprint `f2955523`. Ignore that linkage. Use Apple `uploadedDate` + `appleBuildId`.

Quoted Apple Help ([Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)):

> The build string is used to uniquely identify the build throughout the system.

---

## Apple Build 25 record (quoted)

```text
appleBuildId = deaa9c3a-80e7-4606-8184-724495f2b263
appVersion = 1.0.0
cfBundleVersion = 25
uploadedDate = 2026-08-22T05:42:44-07:00
expirationDate = 2026-11-20T04:42:44-08:00
expired = false
processingState = VALID
internalBuildState = IN_BETA_TESTING
externalBuildState = READY_FOR_BETA_SUBMISSION
FILTER_VERSION_25_COUNT = 1
ALL_RECENT_COUNT = 23
SECOND_BUILD25 = NO
```

No PROCESSING, INVALID, or FAILED Build 25 exists beside this record.

---

## Timeline that proves this is leftover `21ec031`, not `34e42cc`

| Event | Time |
| --- | --- |
| Leftover EAS `bfe0029f` finished (`21ec031`, fingerprint `fa3e3274`) | `2026-08-22T12:28:20.565Z` |
| Leftover submit `3669fbe3` created / FINISHED | `2026-08-22T12:41:29.487Z` |
| **Apple Build 25 uploadedDate** | `2026-08-22T05:42:44-07:00` = `12:42:44Z` |
| `34e42cc` EAS `999b618b` finished (fingerprint `f2955523`) | `2026-08-22T14:51:17.518Z` |
| Submit `06a17954` ERRORED | `2026-08-22T14:52:59.008Z` |
| Submit `e3440a81` ERRORED | `2026-08-22T16:00:44.990Z` |

Apple uploaded this 25 about **75 seconds** after leftover submit `3669fbe3` started, and **2 hours 8 minutes before** the `34e42cc` IPA existed. The two later EAS submits did not create a second Apple build.

---

## Device / QA

Phone USB still leftover `CFBundleVersion=25` path `E217B62A-061F-47AF-BA0F-DC9E9811F16B`. **OLD_21EC031_BUILD25_REUSED_FOR_QA = NO.** Authorized matrix not run.

---

## Hard constraints kept

No rebuild of Build 25. No Build 26 created. No product source edit. No commit/push. No Add for Review. No App Store production.
