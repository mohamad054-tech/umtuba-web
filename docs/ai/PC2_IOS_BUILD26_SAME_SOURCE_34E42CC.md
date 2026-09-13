# PC2_IOS_BUILD26_SAME_SOURCE_34E42CC

Central PATH B GO. Same product SHA `34e42cc`. Remote identity bump 25 → 26 only. Archive + TestFlight Internal succeeded. Apple shows 26 VALID / IN_BETA_TESTING. iPhone 13 still leftover 25. QA not started.

```text
TASK_ID = PC2_IOS_BUILD26_SAME_SOURCE_34E42CC
SOURCE_SHA_VERIFIED = YES
SOURCE_SHA_FOR_BUILD = 34e42cc0cdd27a850d5b485d5786c22114531ed8
IOS_BUILD_NUMBER = 26
EAS_BUILD_ID = c7e24944-11b4-4e30-a4c5-e26016e23242
TESTFLIGHT_UPLOAD = FINISHED
TESTFLIGHT_STATUS = APPLE_1.0.0_26_VALID_IN_BETA_TESTING
INSTALLED_ON_IPHONE13 = NO
INSTALLED_BINARY_CONFIRMED_34E42CC = NO
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
NEW_DEFECTS = NONE_THIS_TURN_QA_NOT_STARTED
SHARED_DEFECTS = FOLLOWERS_FOLLOWING_LIST_NOT_OPENING_PRIOR_REPORT_NOT_RETESTED
SOURCE_PATCHED = NO
ADD_FOR_REVIEW = NO
APP_STORE_PRODUCTION = NO
IOS_FINAL_DEVICE_GATE = NOT_RUN
READY_FOR_CENTRAL_FINAL_DECISION = NO
PC2_FINAL_STATUS = BLOCKED_OPERATOR_TESTFLIGHT_INSTALL
BLOCKERS = Operator must install TestFlight 1.0.0 (26). USB still leftover 25 E217B62A. Windows cannot tap UI.
```

## Step 1–2 — Source verified

Worktree `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build25-34e42cc-v1`

```text
git rev-parse HEAD = 34e42cc0cdd27a850d5b485d5786c22114531ed8
git status --porcelain = EMPTY
git diff 34e42cc = EMPTY
```

No product/shared source edit. `app.config.ts` `ios.buildNumber` remains committed `"20"` (remote version source ignores it).

## Step 3–4 — Archive 26

Remote before archive: `iOS buildNumber - 25`. EAS: `Incremented buildNumber from 25 to 26.`

```text
EAS_BUILD_ID = c7e24944-11b4-4e30-a4c5-e26016e23242
STATUS = FINISHED
appVersion = 1.0.0
appBuildVersion = 26
gitCommitHash = 34e42cc0cdd27a850d5b485d5786c22114531ed8
fingerprint = fa3e327474986ed43d55f213eadfca93825e4567
completedAt = 2026-08-22T16:39:00.099Z
OTHER_THAN_26 = NO
```

Fingerprint `fa3e3274` matches leftover `21ec031` / Build 24 EAS fingerprints because this archive used committed `eas.json` (`autoIncrement: true`). Earlier `34e42cc` EAS 25 (`999b618b`) used a temporary `autoIncrement: false` and hashed `f2955523`. Product SHA for this IPA is still `34e42cc`. USB proof is `CFBundleVersion=26` + new container, not leftover `E217B62A`.

## Step 5–6 — TestFlight Internal + ASC

Temporary `eas.json` `submit.production.ios.ascAppId = 6801665530` for submit only, then restored. Worktree clean.

```text
SUBMISSION_ID = 1a5a11d6-de5e-43ed-8e3e-2492230863b4
SUBMISSION_STATUS = FINISHED
APPLE_BUILD_ID = e8842817-f94f-4f1a-b847-3d9cd8965a2b
uploadedDate = 2026-08-22T09:41:11-07:00
processingState = VALID
internalBuildState = IN_BETA_TESTING
FILTER_VERSION_26_COUNT = 1
```

Official ASC API (`filter[version]=26`), not EAS-only linkage.

## Step 7–9 — Device / QA

USB DeviceID 2, UDID `00008110-000A10123AF9801E`, polled ~8 minutes after Apple VALID:

```text
CFBundleVersion = 25
Path = .../E217B62A-061F-47AF-BA0F-DC9E9811F16B/UMTUBA.app
OLD_21EC031_BUILD25_REUSED_FOR_QA = NO
```

Windows cannot tap TestFlight. Matrix not run. Do not fabricate PASS.

## Next

Operator installs **1.0.0 (26)** from TestFlight. PC2 USB-confirms version 26 and a new container, then runs the authorized cold/stress/FQ/nav matrix. No Add for Review.
