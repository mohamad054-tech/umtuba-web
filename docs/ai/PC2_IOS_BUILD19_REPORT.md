# PC2_IOS19_FINAL_TARGETED_DEVICE_QA_V1 — BUILD / TESTFLIGHT EVIDENCE

```text
TASK_ID = PC2_IOS19_FINAL_TARGETED_DEVICE_QA_V1
DATE = 2026-08-20
DEVICE = PC2
DEVICE_ROLE = IOS_BUILD_TESTFLIGHT + IPHONE13_VALIDATOR
AUTHORIZED_SOURCE_SHA = c0fe00a4fc34a9262daf5870fbc1f4bc42433853
DO_NOT_BUILD_FROM = 3ceb90ba4cd9b91fe78b191bc87cbe109fe39dd7
APP_VERSION = 1.0.0
IOS_BUILD_NUMBER = 19
SOURCE_CHANGED = NO
APP_STORE_REVIEW_SUBMITTED = NO
```

## Source lock

Main mobile checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not** reset (left at `77e9e287` / `pc2/eas-preview-config-v1`).

New inspect/build worktree (this turn):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build19-sound-library-qa-v1`

```text
git fetch --prune = DONE
SHA_EXISTS = YES
ORIGIN_TIP_OF = origin/central/ios19-sound-library-blocker-v1
LOCAL_SOURCE_SHA = c0fe00a4fc34a9262daf5870fbc1f4bc42433853
COMMIT_SUBJECT = fix(mobile): keep Sound Library escapable inside the editor modal.
PARENT = 3ceb90ba4cd9b91fe78b191bc87cbe109fe39dd7 (not used as SoT / not built)
WORKTREE = detached HEAD at c0fe00a4
CLEAN_WORKTREE = YES (temporary eas.json ascAppId restored)
WEB_DOCS_REPO_HEAD = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
WEB_HEAD_IS_NOT_IOS_SOURCE = YES
```

Web docs repo does not contain the iOS SHA. iOS identity is the mobile worktree.

## Version lock

```text
LOCAL_IOS_BUILD_NUMBER = 19
EAS_REMOTE_BUILD_NUMBER_BEFORE = 18
EAS_PRINTED = Incrementing buildNumber from 18 to 19
EAS_REMOTE_BUILD_NUMBER_AFTER = 19
LOCAL_ANDROID_VERSIONCODE = 19
EAS_REMOTE_ANDROID_VERSIONCODE = 19
ANDROID_EAS_JOB_STARTED = NO
BUNDLE_ID = com.umtuba.app
SUPPORTS_TABLET = false
EXPO_MEDIA_LIBRARY = 57.0.3
EXPO_MODULES_CORE = 57.0.6
```

## EAS iOS production build

Same authorized path as Builds 16–18. One iOS production/store job. Not App Store Review.

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build19-sound-library-qa-v1
EAS_BUILD_ID = e21b7f4a-769d-4597-9885-7a5890f060ea
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 19
gitCommitHash = c0fe00a4fc34a9262daf5870fbc1f4bc42433853
gitCommitMessage = fix(mobile): keep Sound Library escapable inside the editor modal.
isForIosSimulator = false
createdAt = 2026-08-20T17:18:10.064Z
completedAt = 2026-08-20T17:23:54.891Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/tUNmcxvBaVcjKSwh1Y4MHhanCFOTuOk67pPKR1b1xB8.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/e21b7f4a-769d-4597-9885-7a5890f060ea
FINGERPRINT = 61d7d43fbf2c294f774adbb0ad5b176eecee166c
FORBIDDEN_SHA_BUILT = NO
```

## TestFlight upload

Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530` (same ASC app as Builds 16–18). Submit ran, then `eas.json` was restored. Worktree left clean. Not committed.

```text
COMMAND = npx eas-cli submit --platform ios --id e21b7f4a-769d-4597-9885-7a5890f060ea --profile production --non-interactive --wait
EAS_SUBMIT_ID = 98111364-52bb-4687-95ee-94d2bbbd8a5b
SUBMIT_STATUS = FINISHED
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (19) — internal: in beta testing, external: ready for beta submission
EAS Build ID e21b7f4a-769d-4597-9885-7a5890f060ea
EAS Submission 98111364-52bb-4687-95ee-94d2bbbd8a5b
```

ASC “in beta testing” is **not** iPhone install proof.
