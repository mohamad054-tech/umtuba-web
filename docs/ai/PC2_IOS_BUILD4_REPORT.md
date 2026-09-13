# PC2_IOS_BUILD4_TESTFLIGHT_REAL_DEVICE_QA_V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD4_TESTFLIGHT_REAL_DEVICE_QA_V1
DATE = 2026-08-15
MODE = EXECUTION_FIRST
IOS_NEW_BUILD_GO = YES
AUTHORIZED_IOS_SOURCE_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
REMOTE_REF = origin/pc2/a2-open-watch-published-post-v1
APP_STORE_REVIEW_SUBMIT = NO
REUPLOAD_BUILD_3 = NO
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
```

## FINAL FIELDS

```text
LOCAL_SOURCE_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
EAS_BUILD_ID = 0257773b-562e-4fb6-8237-206a8b4dd237
APP_VERSION = 1.0.0
BUILD_NUMBER = 4
BUILD_SOURCE_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
BUILD_RESULT = FINISHED
TESTFLIGHT_UPLOAD = YES
ASC_PROCESSING_STATE = INTERNAL_IN_BETA_TESTING
TESTFLIGHT_AVAILABLE = YES_INTERNAL
IPHONE13_INSTALL = PASS
LOGIN_TO_PROFILE = NOT_TESTED
SESSION_PERSISTENCE = NOT_TESTED
WATCH_PLAYBACK = NOT_TESTED
OPEN_WATCH_AFTER_PUBLISH = NOT_TESTED
MESSAGES_OPEN = PASS
MESSAGES_SEND = PASS
MESSAGES_RECEIVE = NOT_TESTED
SAVED = FAIL
SAVE_PERSISTENCE = BLOCKED
UNSAVE = BLOCKED
FOLLOW = NOT_TESTED
FOLLOWING = NOT_TESTED
UNFOLLOW = NOT_TESTED
OTHER_USER_PROFILE = NOT_TESTED
OWN_PROFILE = NOT_TESTED
CREATE_UPLOAD = NOT_TESTED
UPLOAD_TO_WATCH = NOT_TESTED
ACCOUNT_DELETION = NOT_TESTED
UGC_REPORT = NOT_TESTED
UGC_BLOCK = NOT_TESTED
PERMISSIONS = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
NETWORK_ERROR_BEHAVIOR = NOT_TESTED
CRASH_SANITY = NOT_TESTED
AGE_RATING = PUSHED_UGC_TRUE_MESSAGING_TRUE; OTHER_ADVISORIES_STILL_NONE; COMPUTED_AGE_NOT_RETURNED
UGC_DECLARATION = YES
MESSAGING_DECLARATION = YES
APP_PRIVACY = NOT_VERIFIED
REVIEW_INFO = ABSENT; REVIEWER_ACCOUNT_NOT_INVENTED
SCREENSHOTS_METADATA = NOT_VERIFIED
EXPORT_COMPLIANCE = APP_CONFIG_USES_NON_EXEMPT_ENCRYPTION_FALSE; TF_NOT_BLOCKED_ON_MISSING_EXPORT_COMPLIANCE
ACCOUNT_DELETION_METADATA = NOT_IN_EAS_SCHEMA
LIVE_ACCOUNT_DELETION_WORDING = "You do not need the Android app."
REAL_IPHONE_QA_RESULT = IN_PROGRESS
APP_STORE_METADATA_READY = NO
APP_STORE_SUBMITTED = NO
BUILD5_REQUIRED = YES
PR_WORK = STOPPED
ANDROID_PR_BRANCH_PRESERVED = YES @ 8c764fb
BACKUP_REF_PRESERVED = YES refs/backup/pre-split-20260815220941 @ c13031d
IOS_FINAL_RELEASE_BLOCKERS = SAVED_FAIL_ON_BUILD4_BINARY_EDC898F; BUILD5_REQUIRED_FOR_SAVE_RETEST; REMAINING_IPHONE_QA_NOT_TESTED; REVIEWER_ACCOUNT_ABSENT; APP_PRIVACY_NUTRITION_NOT_VERIFIED; SCREENSHOTS_NOT_VERIFIED; LIVE_ACCOUNT_DELETION_ANDROID_WORDING
CENTRAL_ACTION_REQUIRED = YES
```

## Operator action (stop here)

```text
OPERATOR_DEVICE = iPhone 13 — تطبيق UMTUBA من TestFlight، البناء 4
OPERATOR_ACTION = افتح التطبيق واضغط الدائرة الصغيرة أعلى يمين شاشة Watch (فيها حرف)
WHY_REQUIRED = نفتح ملفك الشخصي لتأكيد أنك داخل الحساب قبل اختبار المتابعة وملف مستخدم آخر
```

Do **not** sign out. Do **not** delete the account. Reply with what you see (name / @username / Sign in / something else).

Do not retest Messages open/send except a one-line smoke if app state changes. Saved stays **FAIL** until Build 5. Do not claim source `831936c` as device PASS.

---

## Phase 1 — Source lock

Preferred worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a2-open-watch-v1`

```text
git fetch --prune = DONE
ORIGIN_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
LOCAL_SOURCE_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
BRANCH = pc2/a2-open-watch-published-post-v1
CLEAN_WORKTREE = YES
LS_REMOTE = edc898fb5b3549ae31d8b05824d9e9840f825bae  refs/heads/pc2/a2-open-watch-published-post-v1
```

Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` was **not** reset, merged, or used as SoT (`77e9e28` untouched).

No source files were committed. Temporary `eas.json` `ascAppId` was added only for non-interactive submit, then reverted. Temporary `store.config.json` from metadata pull was deleted after push. Worktree is clean at `edc898f`.

---

## Phase 2 — Build number

`eas.json` uses `cli.appVersionSource = remote` and `build.production.autoIncrement = true` (same path as Build 3). Local `app.config.ts` `ios.buildNumber = "1"` is ignored for remote version source.

```text
PRE_BUILD_SOURCE_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
APP_VERSION = 1.0.0
EAS_REMOTE_BUILD_NUMBER_BEFORE = 3
EXPECTED_BUILD_NUMBER = 4
BUNDLE_ID = com.umtuba.app
SOURCE_DELTA_COMMITTED = NO
```

EAS printed: `Incrementing buildNumber from 3 to 4.` It did **not** jump to 5.

---

## Phase 3 — One iOS production build

Exactly one authorized production/store build:

```text
COMMAND = npx eas-cli build --platform ios --profile production --non-interactive
EAS_BUILD_ID = 0257773b-562e-4fb6-8237-206a8b4dd237
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 4
gitCommitHash = edc898fb5b3549ae31d8b05824d9e9840f825bae
isForIosSimulator = false
completedAt = 2026-08-15T17:51:14.389Z
```

Built source matches the authorized SHA. No other source change. Upload was allowed.

---

## Phase 4 — TestFlight upload

First `eas submit --non-interactive` failed because `eas.json` submit.production had no `ascAppId`. That is not a binary problem. `ascAppId` `6801665530` (same ASC app as Build 3) was set locally, submit rerun, then `eas.json` restored.

```text
COMMAND = npx eas-cli submit --platform ios --id 0257773b-562e-4fb6-8237-206a8b4dd237 --profile production --non-interactive --wait
EAS_SUBMIT_ID = fdef2f33-2e28-4bee-a64e-4256a0ddcffe
SUBMIT_STATUS = FINISHED
ASC_APP_ID = 6801665530
REUPLOAD_BUILD_3 = NO
APP_STORE_REVIEW_SUBMIT = NO
EXTERNAL_BETA = NO
```

`eas submit:status` after Apple accepted the binary:

```text
1.0.0 (4) — internal: in beta testing, external: ready for beta submission
EAS Build ID 0257773b-562e-4fb6-8237-206a8b4dd237
```

Build 3 remains listed. It was not re-uploaded. No live / in-review / pending-release App Store version.

---

## Phase 5 — iPhone 13 install

```text
IPHONE13_INSTALL = PASS
DUT = physical iPhone 13 / TestFlight 1.0.0 (4)
```

Operator confirmed Messages open/send and Saved findings on physical iPhone 13 / TestFlight Build 4. The exact phrase `تم تثبيت 4` was not received; Central instruction for this turn is to treat Build 4 as the device under test given those findings. ASC “in beta testing” is still not used as install proof.

---

## Phase 6 — Real device revalidation

In progress on Build 4. Prior Build 3 operator evidence is **not** copied forward. Source `831936c` (RLS `post_saves`, no `toggle_post_save`) is **not** in this binary (`edc898f`). Do not invent device PASS from that commit.

### Operator-confirmed on Build 4 (2026-08-15)

| Check | Device verdict | Notes |
| --- | --- | --- |
| Messages open | **PASS** | Physical iPhone 13 / TF Build 4 |
| Messages send | **PASS** | Physical iPhone 13 / TF Build 4 |
| Messages receive | **NOT_TESTED** | No counterpart evidence this turn |
| Saved | **FAIL** | Build 4 still `edc898f` (broken RPC). Source fix `831936c` is not in this binary |
| Save persistence | **BLOCKED** | Blocked by Saved FAIL |
| Unsave | **BLOCKED** | Blocked by Saved FAIL |

```text
BUILD5_REQUIRED = YES
EAS_BUILD_5_STARTED = NO
SOURCE_831936C_CLAIMED_AS_DEVICE_PASS = NO
```

### Still NOT_TESTED on Build 4 (do not convert from source or Build 3)

- login → Profile (next tap: Watch top-right avatar circle)
- Own Profile / session visible
- Follow → Following (other-user Profile; source has Follow/Following, never Unfollow — device must still confirm)
- Other-user Profile (Watch author “Profile {username}”)
- Open Watch after a real publish
- UGC report / block
- Account deletion entry (inspect only; do not confirm-delete)
- Background / resume
- Watch playback / Create / permissions / crash smoke

Do not retest Messages open/send except a one-line smoke if state changes.

---

## Phase 7 — Metadata

`eas metadata:pull` (EAS credentials service; no local `.p8` printed) showed listing copy that was **already richer** than Wave 2/V3:

- title `UMTUBA`
- subtitle, description, keywords, promo, support/marketing/privacy URLs
- categories `SOCIAL_NETWORKING` + `ENTERTAINMENT`
- advisory still had `userGeneratedContent: false` and `messagingAndChat: false`

Those two were **false declarations**. The app publishes user video, reports/blocks, and has Messages. This session set both to `true` and ran:

```text
eas metadata:lint = PASS
eas metadata:push --profile production --non-interactive = SYNCED
age rating declaration = UPDATED
store review details = SKIPPED (not configured; reviewer password not invented)
app clip = SKIPPED
```

`store.config.json` was deleted after push. Other advisories remain `NONE` / `false`. Computed 4+/12+/17+ age was not returned.

Still incomplete for App Store review:

| Field | State |
| --- | --- |
| App Privacy nutrition labels | Not in EAS metadata schema; console not opened → `NOT_VERIFIED` |
| Screenshots (iPhone / iPad) | Not in EAS metadata schema → `NOT_VERIFIED` |
| Review first/last/email/phone / demo account | Absent; not invented |
| Account deletion ASC checkbox | Not in EAS schema |
| Live deletion page | HTTP 200 `https://umtuba.com/account-deletion` |

Exact live sentence (HTML, this session):

> You do not need the Android app.

Full nearby wording: “Sign in is the only supported way to request deletion of your UMTUBA account and associated personal data. You do not need the Android app. UMTUBA is the service operated at umtuba.com.”

This web tree still has no `account-deletion` page source. Route to Central/Web. **Not closed.**

`app.config.ts` still has `ios.config.usesNonExemptEncryption: false`. Internal TestFlight for Build 4 is not sitting in a missing-export-compliance hold.

---

## Safety / scope

- One production iOS build only.
- Built and uploaded SHA = `edc898f` only.
- Build number 4, not 3, not 5.
- No App Store Review submit.
- No External Beta submit.
- No force push / reset / merge of `77e9e28`.
- `docs/ai/CURSOR_REPORT.md` not overwritten.
- Store / assetlinks WIP in this web repo not touched.
- No tokens / `.p8` / ASC key material printed.

---

## Preserve refs (read-only verify 2026-08-15, this turn)

Stayed on `office/platform-translation-trunk-port-v1`. Did not checkout `alpha-0.2` or `pr/pc2-android-assetlinks`. Did not mutate either ref.

```text
PR_WORK = STOPPED
ANDROID_PR_BRANCH_PRESERVED = YES
  refs/heads/pr/pc2-android-assetlinks = 8c764fb9165b4594e6346021e9eb89b4ef3983e8
  refs/remotes/origin/pr/pc2-android-assetlinks = 8c764fb9165b4594e6346021e9eb89b4ef3983e8
BACKUP_REF_PRESERVED = YES
  refs/backup/pre-split-20260815220941 = c13031dcb2c073ac0bc74b6c03ab8229d942951a
```

---

## What happens next

1. Operator taps Watch top-right avatar circle and reports own Profile (name / @username / Sign in).
2. Then one tap at a time: Follow → Following, other-user Profile, Open Watch after publish, UGC report/block, account deletion entry, background/resume.
3. Saved / save persistence / unsave stay FAIL or BLOCKED until a new binary (Build 5). Do not start EAS. Do not re-upload Build 4. Do not submit App Review.
4. Central/Web must replace the Android-specific live deletion sentence.
5. Operator/Central still owe reviewer account, App Privacy labels, and screenshots before any Submit for Review.
