# PC2-A2 — iOS Build 3 Operator and iPhone QA V3

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD3_OPERATOR_AND_IPHONE_QA_V3
DATE = 2026-08-15
MODE = EXECUTION_FIRST / TOKEN_CONSERVATIVE
COMMIT_CREATED = NO
PUSHED = NO
REBUILD = NOT_RUN
REUPLOAD_BUILD_3 = NOT_RUN
APP_STORE_REVIEW_SUBMIT = NOT_RUN
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
CONTINUES = docs/ai/PC2_A2_V2_REPORT.md
```

## OPERATOR ACTION (ONE STEP — STOP HERE)

In a browser **already signed into App Store Connect**, open:

https://appstoreconnect.apple.com/apps/6801665530/testflight/ios

Then: **TestFlight → Internal Testing → add this iPhone’s Apple ID as a tester.**

Do not submit External Beta. Do not Submit for Review. Do not rebuild or re-upload build 3. Do not invent a redemption code. After the tester is added (or if that Apple ID is missing from the picker), return.

```text
OPERATOR_ACTION_REQUIRED = YES
OPERATOR_ACTION = Open https://appstoreconnect.apple.com/apps/6801665530/testflight/ios (already-signed-in ASC browser) → Internal Testing → add this iPhone’s Apple ID as a tester.
```

---

## Final fields

```text
BUILD_3_ASC_STATE = VALID; INTERNAL_IN_BETA_TESTING; EXTERNAL_READY_FOR_BETA_SUBMISSION; NOT_ON_APP_STORE
TESTFLIGHT_AVAILABLE = YES_INTERNAL
APPLE_AUTH_STATE = EAS_ASC_API_KEY_WORKING; NO_LOCAL_P8; NO_APPLE_ENV; NO_ASC_BROWSER_SESSION
OPERATOR_ACTION_REQUIRED = YES
IPHONE_CONNECTED_OR_AVAILABLE = PHYSICAL_AVAILABLE_NOT_USB_PRESENT
IPHONE_QA_STARTED = YES_TESTFLIGHT_OPEN
IPHONE_QA_RESULT = BLOCKED_NOT_INVITED
INSTALL = NOT_TESTED
COLD_LAUNCH = NOT_TESTED
AUTH = NOT_TESTED
POST_LOGIN_NAV = NOT_TESTED
WATCH_PLAYBACK = NOT_TESTED
SAVED = NOT_TESTED
FOLLOW_FOLLOWING = NOT_TESTED
DISCOVER = NOT_TESTED
CREATE_UPLOAD = NOT_TESTED
PROFILE_SETTINGS = NOT_TESTED
MESSAGES = NOT_TESTED
ACCOUNT_DELETION = NOT_TESTED
UGC_REPORT_BLOCK = NOT_TESTED
PERMISSIONS = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
NETWORK_ERRORS = NOT_TESTED
CRASH_BEHAVIOR = NOT_TESTED
APP_PRIVACY = NOT_VERIFIED
AGE_RATING = ASC_PULL_ALL_NONE; UGC_FALSE; MESSAGING_FALSE; UNSAFE_TO_SUBMIT
METADATA = ASC_PULL_TITLE_ONLY; PRIVACY_POLICY_URL_MISSING; NO_SUBTITLE_DESCRIPTION_KEYWORDS_SUPPORT_CATEGORY
REVIEW_INFO = ABSENT_FROM_ASC_PULL
EXPORT_COMPLIANCE = CHECKBOX_NOT_SEEN; INTERNAL_TF_NOT_BLOCKED_BY_MISSING_COMPLIANCE; BINARY_USES_NON_EXEMPT_ENCRYPTION_FALSE
IOS_REBUILD_REQUIRED = NO
APP_STORE_READY = NO
APP_STORE_SUBMITTED = NO
BLOCKERS = IPHONE_APPLE_ID_NOT_ON_INTERNAL_TESTFLIGHT; TESTFLIGHT_INVITE_OR_CODE_REQUIRED; TESTER_GROUPS_NOT_ENUMERATED_VIA_EAS; IPHONE_QA_NOT_EXECUTED; IPHONE_NOT_USB_PRESENT; ASC_LISTING_INCOMPLETE; AGE_RATING_UGC_AND_MESSAGING_MARKED_FALSE; APP_PRIVACY_NUTRITION_LABELS_NOT_VERIFIED; REVIEW_INFO_ABSENT; REVIEWER_ACCOUNT_NOT_SUPPLIED; SCREENSHOTS_NOT_VERIFIED_IN_ASC; IPAD_SCREENSHOTS_STILL_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE
```

---

## Summary

This V3 session continues Wave 2 (`docs/ai/PC2_A2_V2_REPORT.md`). It does **not** treat closed ASC paperwork as unknown. The new fact vs Wave 2 is that a **real iPhone is physically available**. This session re-read App Store Connect through EAS (`npx eas-cli submit:status`, `submit:list`, `testflight:feedback`, `testflight:crashes`, `metadata:pull`) using the **ASC API key already stored in the EAS credentials service**. No local `.p8`, no env key, and no key material was printed.

Build 3 (`1.0.0 (3)`, bundle `com.umtuba.app`, ASC app `6801665530`) is still **VALID**. Internal TestFlight is still **IN_BETA_TESTING**. External TestFlight is still **READY_FOR_BETA_SUBMISSION**. There is still **no** live / in-review / pending-release App Store version. Public iTunes lookup for `com.umtuba.app` is still `resultCount: 0`. Zero TestFlight feedback and zero crashes — still no evidence anyone has installed the build.

Operator checkpoint (this resume): TestFlight is **open** on the physical iPhone, shows **Ready to Test**, and requires an **invitation or redemption code**. **UMTUBA is not listed.** Install QA has therefore **not** started. Windows PresentOnly USB still shows **no** Apple iPhone. No Apple Devices / iTunes / `ideviceinfo`. Cursor browser still has **no** App Store Connect session.

EAS CLI 22.0.0 can read TestFlight **status/feedback/crashes** and can attach groups only during `eas submit` (forbidden — would re-upload). It **cannot** list internal groups or invite testers. Fastlane/pilot is absent. No local ASC `.p8`. Repo has no historical tester-add runbook (invite hits are product referral links). Path 1 (API invite) and path 2 (list groups, then ask for email) are unavailable. Path 3 applies: human must add this Apple ID under Internal Testing. Do **not** use External Beta review as a workaround. Do **not** invent a redemption code.

Stop at the single operator step above. Do not mark any device-QA field PASS. Do not rebuild, re-upload, or Submit for Review.

ASC listing fields visible to EAS metadata are unchanged and still unsafe to submit: English title only, missing required `privacyPolicyUrl`, no review contact/demo account, age-rating questionnaire still marks **userGeneratedContent = false** and **messagingAndChat = false**. App Privacy nutrition labels remain outside the EAS metadata schema and stay **NOT_VERIFIED**.

---

## Verified vs inferred

| Claim | Class | Evidence |
| --- | --- | --- |
| Web git fetch succeeded; not behind; not diverged | **Verified** | `office/platform-translation-trunk-port-v1` HEAD `b3c05d8` matches origin. This task did not checkout/reset/stash/clean. |
| EAS login | **Verified** | `npx eas-cli whoami` — Expo owner of `@umtuba` (account names only). |
| Local ASC `.p8` / Apple env vars | **Verified absent** | All `APPLE*` / `ASC*` / `EXPO_ASC*` / `ITC_*` unset. Recursive `.p8` walk was started then killed (hung); Wave 2 already verified none under Desktop `\umtuba`. |
| EAS credentials service has an ASC API key | **Verified existence only** | `submit:status` / `metadata:pull` printed “Using App Store Connect API Key from EAS credentials service.” Key not printed. |
| Build 3 still the only iOS submit | **Verified** | `eas submit:list` — one FINISHED iOS submit `b62869b1-712b-4d7c-9f67-9253339b82ba` for build `2977565d-5426-4358-823d-68cc91d6868d`. |
| Apple processing complete / binary valid | **Verified** | `processingState: VALID`, `expired: false`. |
| Internal TestFlight available | **Verified** | `internalState: IN_BETA_TESTING`. Human status: `1.0.0 (3) — internal: in beta testing`. |
| External TestFlight | **Verified not started** | `externalState: READY_FOR_BETA_SUBMISSION`. |
| Public App Store listing | **Verified absent** | `submit:status`: Live/In review/Pending release = none. iTunes lookup `resultCount: 0`. |
| Named tester groups / emails | **Not enumerated** | No EAS command listed groups. Feedback none. Crashes none. |
| ASC listing / age rating | **Verified via this-session pull** | Identical to Wave 2: title only; UGC false; messaging false. |
| App Privacy nutrition labels | **Not verified** | Not in EAS metadata schema. ASC console not opened. |
| Physical iPhone present on desk | **Task fact** | Central/task states a real iPhone is now physically available. |
| iPhone USB-connected / inspectable | **Verified absent** | PresentOnly: no iPhone. Stale Unknown WPD/USB nodes only. No Apple Devices / iTunes / libimobiledevice. |
| Device QA checks | **Not executed** | TestFlight open; UMTUBA absent; invite/code required. **Do not treat as PASS.** |
| EAS tester invite / group list | **Verified absent** | `eas testflight` = feedback/crashes only. `eas submit -g` requires a new submit (forbidden). Fastlane/pilot missing. |
| Cursor browser ASC session | **Not available** | `browser_tabs` empty. Did not guess login. |

**Age-rating caveat (unchanged from Wave 2):** Expo documents that EAS Metadata uses the least-restrictive advisory answers as defaults. `metadata:pull` is still generated from App Store Connect. The pulled file contained a full advisory object with UGC and messaging false. Treat that as the current ASC-facing questionnaire state. It is **unsafe to submit**. This task did **not** run `metadata:push`.

---

## 1. Git sync (this workspace)

```text
REPO = umtuba-web-translation-trunk-port-v1
BRANCH = office/platform-translation-trunk-port-v1
HEAD = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
UPSTREAM = origin/office/platform-translation-trunk-port-v1
AHEAD = 0
BEHIND = 0
DIVERGENCE = NO
FF_ONLY_PULL = NOT_NEEDED
```

`git fetch --prune` succeeded. This task did **not** commit, push, checkout, reset, stash, or clean. Store/assetlinks WIP left untouched. `docs/ai/CURSOR_REPORT.md` and `docs/ai/CURRENT_TASK.md` were **not** overwritten.

Sibling mobile repo (inspect only; not SoT for the uploaded binary):

```text
PATH = C:\Users\Giga store\Desktop\umtuba\umtuba-mobile
CHECKED_OUT = pc2/eas-preview-config-v1 @ 77e9e28
vs origin/master = ahead 1, behind 1
ACCEPTED_BUILD_SHA = 4eede0b4786a77a9cd9d642b792a5642341542c2
```

A temporary `store.config.json` was created by `eas metadata:pull`, read, then **deleted** so it cannot be accidentally `metadata:push`ed. Mobile product files were not edited. No branch switch / merge / reset. `metadata:lint` was not re-run this session after the first pull (Wave 2 lint already failed on missing `privacyPolicyUrl`; pulled JSON is identical).

---

## 2. How ASC was read on PC2 this session

| Path | Result |
| --- | --- |
| `npx eas-cli whoami` | Logged in as Expo owner of `@umtuba` |
| `eas submit:status -p ios` | **Succeeded** via EAS-stored ASC API key |
| `eas submit:list -p ios` | One FINISHED iOS submit (build 3) |
| `eas metadata:pull` | **Succeeded**; listing snapshot captured then deleted |
| `eas testflight:feedback` | No feedback submitted |
| `eas testflight:crashes` | No crashes reported |
| `xcrun` / `altool` / `ideviceinfo` / Apple Devices / iTunes | Missing |
| Local `.p8` / Apple env | Missing |
| Cursor browser → appstoreconnect.apple.com | **No usable tab / no authenticated session** |
| Public iTunes lookup | `resultCount: 0` |

No secrets printed. Signed Google Cloud log URLs were not copied.

---

## 3. Current App Store Connect state of build 3

Authorized binary unchanged from Wave 2:

| Field | Value |
| --- | --- |
| Bundle | `com.umtuba.app` |
| Version | `1.0.0` |
| Build | `3` |
| EAS build ID | `2977565d-5426-4358-823d-68cc91d6868d` |
| Source SHA | `4eede0b4786a77a9cd9d642b792a5642341542c2` |
| Team | `M6HDH86Z55` |
| ASC App ID | `6801665530` |
| EAS submit ID | `b62869b1-712b-4d7c-9f67-9253339b82ba` |
| EAS submit status | `FINISHED` (binary upload, not App Review) |
| Uploaded (ASC) | `2026-08-14T14:58:36-07:00` |

`eas submit:status --json` (2026-08-15, this V3 session):

```json
{
  "ios": {
    "ascAppIdentifier": "6801665530",
    "testFlightBuilds": [
      {
        "appVersion": "1.0.0",
        "buildNumber": "3",
        "processingState": "VALID",
        "internalState": "IN_BETA_TESTING",
        "externalState": "READY_FOR_BETA_SUBMISSION",
        "uploadedDate": "2026-08-14T14:58:36-07:00",
        "expired": false,
        "easSubmissionId": "b62869b1-712b-4d7c-9f67-9253339b82ba",
        "easBuildId": "2977565d-5426-4358-823d-68cc91d6868d",
        "fingerprintHash": "705ba91db5c235c037640fe677a546d84e9b5b2c"
      }
    ]
  }
}
```

Human status from the same command:

```text
App Store
  Live: none
  In review: none
  Pending release: none

TestFlight (latest uploads)
  1.0.0 (3) — internal: in beta testing, external: ready for beta submission — uploaded 12 hours ago
```

```text
DO_NOT_REUPLOAD_BUILD_3 = OBSERVED
DO_NOT_REBUILD = OBSERVED
APPLE_PROCESSING = COMPLETE_VALID
TESTFLIGHT_INTERNAL = AVAILABLE
TESTFLIGHT_EXTERNAL = NOT_SUBMITTED
```

### Testers

- Internal state **IN_BETA_TESTING** means App Store Connect Users (Admin / App Manager / Developer / Marketing, and any internal groups already attached) can install build 3 in TestFlight.
- Named groups, tester emails, and “invite sent” were **not enumerated**.
- Zero TestFlight screenshot feedback and zero crash reports — no evidence anyone has actually installed or used the build.
- Tester availability for a **specific** Apple ID remains an operator check in TestFlight on the phone (next steps after unlock + open).

---

## 4. ASC listing / compliance fields actually observed

Source: this-session `eas metadata:pull`. File deleted after read. Content is **identical** to Wave 2.

Pulled `store.config.json` (complete):

```json
{
  "configVersion": 0,
  "apple": {
    "version": "1.0",
    "release": {
      "automaticRelease": true
    },
    "info": {
      "en-US": {
        "title": "UMTUBA"
      }
    },
    "advisory": {
      "ageRatingOverride": "NONE",
      "alcoholTobaccoOrDrugUseOrReferences": "NONE",
      "contests": "NONE",
      "gambling": false,
      "gamblingSimulated": "NONE",
      "horrorOrFearThemes": "NONE",
      "kidsAgeBand": null,
      "koreaAgeRatingOverride": "NONE",
      "lootBox": false,
      "matureOrSuggestiveThemes": "NONE",
      "medicalOrTreatmentInformation": "NONE",
      "profanityOrCrudeHumor": "NONE",
      "sexualContentGraphicAndNudity": "NONE",
      "sexualContentOrNudity": "NONE",
      "unrestrictedWebAccess": false,
      "violenceCartoonOrFantasy": "NONE",
      "violenceRealistic": "NONE",
      "violenceRealisticProlongedGraphicOrSadistic": "NONE",
      "advertising": false,
      "ageAssurance": false,
      "ageRatingOverrideV2": "NONE",
      "developerAgeRatingInfoUrl": null,
      "gunsOrOtherWeapons": "NONE",
      "healthOrWellnessTopics": false,
      "messagingAndChat": false,
      "parentalControls": false,
      "userGeneratedContent": false
    }
  }
}
```

Wave 2 `eas metadata:lint` (still applicable; pulled JSON unchanged):

```text
$.apple.info.en-US The value at /apple/info/en-US is missing the required field 'privacyPolicyUrl'.
```

| Required field | ASC observed this session? | Value |
| --- | --- | --- |
| App Privacy nutrition labels | **NO** (not in EAS metadata schema; console not opened) | `NOT_VERIFIED` |
| Age rating questionnaire | **YES** | All `NONE` / `false`; UGC false; messaging false |
| Computed age (4+ / 12+ / 17+) | **NO** | Not returned by pull |
| Title | **YES** | `UMTUBA` |
| Subtitle / description / keywords / promo / release notes | **Missing from pull** | Unset |
| Privacy policy URL | **Missing** | Lint error (Wave 2; JSON unchanged) |
| Support / marketing URLs | **Missing from pull** | Unset |
| Category | **Missing from pull** | Unset |
| Copyright | **Missing from pull** | Unset |
| Screenshots | **NO** (not in EAS metadata schema; console not opened) | `NOT_VERIFIED` |
| Review first/last/email/phone | **Missing from pull** | Unset |
| Review demo username/password | **Missing from pull** | Unset |
| Review notes | **Missing from pull** | Unset |
| Account deletion declaration | **NO** | `NOT_VERIFIED` |
| UGC safety / Made for Kids form | **Partial** | Questionnaire UGC = false; Kids band null |
| Export compliance checkbox | **NO** | Not in metadata. Internal TF is not in `MISSING_EXPORT_COMPLIANCE`. Binary `usesNonExemptEncryption: false` in `app.config.ts` (source; not an ASC checkbox observation). |

Live web URLs (not ASC fields; probed this session, HTTP 200):

- `https://umtuba.com/privacy`
- `https://umtuba.com/terms`
- `https://umtuba.com/account-deletion`
- `https://umtuba.com/support`

Those URLs exist on the web. They are **not** filed in the pulled ASC listing (`privacyPolicyUrl` missing).

Mobile source still has `REVIEWER_ACCESS_READY = NO` (`docs/app-store/REVIEWER_NOTES.md`) and `supportsTablet: true` (iPad 13" screenshots still required for a later listing; changing that flag is a **new binary** — not authorized).

Do **not** submit App Store review with the pulled age-rating answers. UMTUBA is a UGC + messaging app. Filing UGC/messaging as false would be an incomplete/false declaration.

---

## 5. iPhone connection and QA — TestFlight open, app not listed

```text
IPHONE_CONNECTED_OR_AVAILABLE = PHYSICAL_AVAILABLE_NOT_USB_PRESENT
IPHONE_QA_STARTED = YES_TESTFLIGHT_OPEN
IPHONE_QA_RESULT = BLOCKED_NOT_INVITED
INSTALL = NOT_TESTED
```

Operator-reported on-device state (this checkpoint):

- TestFlight **open**
- UI: **Ready to Test**
- Invitation or redemption code **required**
- **UMTUBA not listed**

Windows PresentOnly device list: **no** Apple iPhone. Stale non-present WPD/USB nodes unchanged. No Apple Devices / iTunes / `ideviceinfo`. TestFlight install is iOS-only and cannot be pushed from Windows.

No install, cold launch, auth, Watch, Follow, Discover, Create, profile, Messages, deletion, UGC report/block, permissions, background/resume, network, or crash check was run. **Do not treat any of those as PASS.**

### Tester tooling this resume

| Path | Result |
| --- | --- |
| `eas testflight:*` | Feedback/crashes only — no invite, no group list |
| `eas submit -g` / `--auto-testflight-setup` | Would require a new submit — **forbidden** |
| `eas device:*` | Ad-hoc Internal Distribution, not TestFlight — unused |
| Fastlane / `pilot` | **Absent** |
| Local ASC API key | **Absent** (EAS-stored key not extracted) |
| Repo tester runbook | **None** (invite strings are product referral links) |
| Cursor browser ASC | **No session** |

Internal testers must be App Store Connect users (or already on an Internal group). This Apple ID is not seeing build 3, so it is not on that set. External TestFlight (`READY_FOR_BETA_SUBMISSION`) was **not** used as a workaround.

If Internal Testing’s Add Testers picker does not include this Apple ID, the follow-up (next resume, not this click) is Users and Access → invite that Apple ID, then return it to the Internal group. Do not do that in this pause.

---

## 6. Exact operator action required (stop here)

**Do this one thing now:**

In a browser already signed into App Store Connect, open https://appstoreconnect.apple.com/apps/6801665530/testflight/ios then **Internal Testing → add this iPhone’s Apple ID as a tester.**

**Do not**

- Rebuild iOS.
- Re-upload build 3.
- Submit External Beta review.
- Submit App Store review.
- Invent a redemption code.
- `eas metadata:push` the all-NONE snapshot.
- Fabricate iPhone QA PASS.
- Dump the full device checklist in this pause.

---

## Exact files changed

Web repo:

- `docs/ai/PC2_A2_V3_REPORT.md` (this file; new)

No Store product files changed. `docs/ai/CURSOR_REPORT.md` and `docs/ai/CURRENT_TASK.md` not modified.

Mobile repo: temporary `store.config.json` from `metadata:pull` was deleted after capture. No lasting mobile edit from this task.

## Migrations created

None.

## Security review

- No secrets, `.env`, Apple `.p8`, EAS tokens, or demo passwords printed.
- Team ID `M6HDH86Z55` is already public in live AASA.
- ASC App ID and EAS build/submit IDs are operational identifiers, not credentials.
- Did not extract the EAS-stored ASC API key.
- Did not `metadata:push` an incorrect age-rating questionnaire.
- Did not submit App Store review with incomplete/false declarations.
- Did not bypass Apple login or 2FA.

## Tests

Not run (docs/operator closeout; no product change; no rebuild).

## TypeScript

Not run (no TypeScript change in this workspace).

## Build

Not run. `IOS_REBUILD_REQUIRED = NO`. Do not rebuild unless a later confirmed binary defect appears.

## git diff --check

Not required for an untracked report-only file. No product diff.

## git status --short

This task adds untracked `docs/ai/PC2_A2_V3_REPORT.md` only. Web HEAD remains `b3c05d8`. Other dirty/untracked files (Store/assetlinks WIP, Wave 1/2 reports, CURRENT_TASK/CURSOR_REPORT, visual QA worktrees) are outside this task and were not modified by it.

## Open issues

1. **This iPhone Apple ID is not on internal TestFlight** — TestFlight open, Ready to Test, invite/code required, UMTUBA not listed.
2. **EAS cannot invite testers** — human ASC Internal Testing add is required.
3. **iPhone not USB-present** — cannot collect `ideviceinfo` evidence from Windows.
4. **ASC listing incomplete** — title only; `privacyPolicyUrl` missing; no category/support/review block.
5. **Age rating unsafe** — pulled questionnaire marks UGC and messaging false.
6. **App Privacy nutrition labels not visible** via EAS metadata.
7. **Reviewer account still not supplied** (`REVIEWER_ACCESS_READY = NO`).
8. **Screenshots not verified in ASC**. iPad 13" still required while `supportsTablet: true`.
9. **Cursor browser cannot open ASC** — later listing fixes need a human-authenticated browser.
10. **Do not re-upload build 3.** If Apple later marks Invalid Binary, stop and report.
11. **Mobile checkout drift** unchanged — do not treat `77e9e28` as the uploaded binary SoT.

---

## Verdict

```text
TASK_ID = PC2_IOS_BUILD3_OPERATOR_AND_IPHONE_QA_V3
BUILD_3_ASC_STATE = VALID; INTERNAL_IN_BETA_TESTING; EXTERNAL_READY_FOR_BETA_SUBMISSION; NOT_ON_APP_STORE
TESTFLIGHT_AVAILABLE = YES_INTERNAL
APPLE_AUTH_STATE = EAS_ASC_API_KEY_WORKING; NO_LOCAL_P8; NO_APPLE_ENV; NO_ASC_BROWSER_SESSION
OPERATOR_ACTION_REQUIRED = YES
IPHONE_CONNECTED_OR_AVAILABLE = PHYSICAL_AVAILABLE_NOT_USB_PRESENT
IPHONE_QA_STARTED = YES_TESTFLIGHT_OPEN
IPHONE_QA_RESULT = BLOCKED_NOT_INVITED
INSTALL = NOT_TESTED
COLD_LAUNCH = NOT_TESTED
AUTH = NOT_TESTED
POST_LOGIN_NAV = NOT_TESTED
WATCH_PLAYBACK = NOT_TESTED
SAVED = NOT_TESTED
FOLLOW_FOLLOWING = NOT_TESTED
DISCOVER = NOT_TESTED
CREATE_UPLOAD = NOT_TESTED
PROFILE_SETTINGS = NOT_TESTED
MESSAGES = NOT_TESTED
ACCOUNT_DELETION = NOT_TESTED
UGC_REPORT_BLOCK = NOT_TESTED
PERMISSIONS = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
NETWORK_ERRORS = NOT_TESTED
CRASH_BEHAVIOR = NOT_TESTED
APP_PRIVACY = NOT_VERIFIED
AGE_RATING = ASC_PULL_ALL_NONE; UGC_FALSE; MESSAGING_FALSE; UNSAFE_TO_SUBMIT
METADATA = ASC_PULL_TITLE_ONLY; PRIVACY_POLICY_URL_MISSING; NO_SUBTITLE_DESCRIPTION_KEYWORDS_SUPPORT_CATEGORY
REVIEW_INFO = ABSENT_FROM_ASC_PULL
EXPORT_COMPLIANCE = CHECKBOX_NOT_SEEN; INTERNAL_TF_NOT_BLOCKED_BY_MISSING_COMPLIANCE; BINARY_USES_NON_EXEMPT_ENCRYPTION_FALSE
IOS_REBUILD_REQUIRED = NO
APP_STORE_READY = NO
APP_STORE_SUBMITTED = NO
BLOCKERS = IPHONE_APPLE_ID_NOT_ON_INTERNAL_TESTFLIGHT; TESTFLIGHT_INVITE_OR_CODE_REQUIRED; TESTER_GROUPS_NOT_ENUMERATED_VIA_EAS; IPHONE_QA_NOT_EXECUTED; IPHONE_NOT_USB_PRESENT; ASC_LISTING_INCOMPLETE; AGE_RATING_UGC_AND_MESSAGING_MARKED_FALSE; APP_PRIVACY_NUTRITION_LABELS_NOT_VERIFIED; REVIEW_INFO_ABSENT; REVIEWER_ACCOUNT_NOT_SUPPLIED; SCREENSHOTS_NOT_VERIFIED_IN_ASC; IPAD_SCREENSHOTS_STILL_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE
COMMIT = NO
PUSH = NO
NEXT = OPERATOR_ASC_INTERNAL_TESTING_ADD_THIS_IPHONE_APPLE_ID
```

---

## QR flow restart (2026-08-15 evening)

```text
QR_FLOW_RESTARTED = YES
YESTERDAY_EXACT_ARGV = NOT_PROVEN
COMMAND_USED = npx eas-cli device:create
CWD = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile
QR_DISPLAYED = NO
APPLE_SESSION = EXPIRED_THEN_LOGIN_FAILED
APPLE_ERROR = -20209 ACCOUNT_LOCKED
REBUILD = NOT_RUN
REUPLOAD_BUILD_3 = NOT_RUN
APP_STORE_REVIEW_SUBMIT = NOT_RUN
SECRET_VALUES_PRINTED = NO
PASSWORD_RECOVERED = NO
APPLE_SECURITY_BYPASSED = NO
CURSOR_REPORT_OVERWRITTEN = NO
```

Could not prove yesterday’s exact argv from transcripts/terminals (no historical `device:create` / `expo.dev/register-device` / credentials QR capture). Started the most likely iPhone-scan flow: `npx eas-cli device:create` in the mobile repo (visible mintty, still held open).

Local Apple session was expired. EAS then used the legitimate Apple Developer login prompt. A password was typed in that visible window by the operator (not recovered or injected by this agent). Apple returned **error -20209** (account locked; eas-cli printed Apple’s iForgot URL). The CLI exited; **no register-device QR or URL was printed**.

Do not retry `device:create` until the operator unlocks the Apple Account through Apple’s official recovery. Do not rebuild, re-upload build 3, or Submit for Review.

---

## USB iPhone detection (2026-08-15, after operator ALLOW photos)

Read-only. No pair/unpair, no `device:create` / register / credentials / build / submit, no Apple login retry, no phone change.

```text
WINDOWS_IPHONE_VISIBLE = YES
EAS_DEVICE_VISIBLE = NO
DEVICE_NAME = iPhone
UDID_AVAILABLE = YES
NEXT_OPERATOR_ACTION = NONE_DETECTION_COMPLETE
PHONE_PROMPT_REQUIRED = NO
```

### Windows (verified this session)

PresentOnly PnP + WMI both show the cable-connected phone:

| Node | Class | Status | Meaning |
| --- | --- | --- | --- |
| Apple Mobile Device USB Composite Device | USBDevice | OK | `VID_05AC` `PID_12A8`, Apple `appleusb.inf` / `oem4.inf` 538.0.0.0 (2023-06-14). Bus-reported name: **iPhone**. USB class 06/01/01 (PTP). |
| Apple iPhone | WPD | OK | Microsoft `wpdmtp.inf` **MTP USB Device**. Bus-reported: **PTP**. Matches the operator ALLOW photos/videos prompt. |

USB serial / InstanceId of the present composite device: `00008110000A10123AF9801E` (24 hex; modern iPhone UDID form). Source: `Get-PnpDevice` / `Win32_PnPEntity` only — **not** `ideviceinfo` UniqueDeviceID.

Also present from earlier unplug (not this cable): Unknown WPD `Apple iPhone` and Unknown composite `00008030000E308C3A82402E`. USBSTOR: empty (not mass-storage).

**Not present:** Apple Mobile Device USB Driver / usbmux / lockdown interface; Apple Devices app; iTunes; Apple Mobile Device Support service; `AppleMobileDevice*` process; `idevice_id` / `ideviceinfo`; `cfgutil`; Apple install dirs (`Program Files\Apple`, `Common Files\Apple`).

Distinction: Windows sees **Apple MTP/photos + Apple USB composite**. It does **not** show a lockdown/developer-trust channel. Photos ALLOW is not the same as “Trust This Computer” pairing. No second Trust/Allow prompt was triggered (no pairing tool was run).

### EAS (read-only)

`npx eas-cli device --help`: `device:list` = “list all registered devices for your account” (Internal Distribution). That is **not** USB detection.

`npx eas-cli device:list --json --non-interactive` started, then stopped for `--apple-team-id`. It printed the known team `M6HDH86Z55` and did **not** enumerate USB. The follow-up list was not completed (would only show previously registered portal devices).

```text
EAS_SEES_THIS_USB_PHONE = NO
EAS_SEES_ONLY_PREVIOUSLY_REGISTERED_DEVICES = YES
DEVICE_CREATE_RUN = NO
```

### Exact fields

```text
WINDOWS_IPHONE_VISIBLE = YES
WINDOWS_LAYER = APPLE_USB_COMPOSITE + WPD_MTP_PTP
WINDOWS_LOCKDOWN_DRIVER = NO
APPLE_DEVICES_ITUNES_AMDS = NO
LIBIMOBILEDEVICE_CFGUTIL = NO
EAS_DEVICE_VISIBLE = NO
DEVICE_NAME = iPhone
UDID_AVAILABLE = YES
UDID_SOURCE = WINDOWS_USB_ISERIAL_PNP
UDID = 00008110000A10123AF9801E
UDID_LOCKDOWN_CONFIRMED = NO
NEXT_OPERATOR_ACTION = NONE_DETECTION_COMPLETE
```

No Trust/Allow press is required for this detection closeout. Do not run `eas device:create` (Apple account still locked from the earlier V3 attempt). Do not rebuild or re-upload build 3.

---

## Autopilot note (2026-08-15) — PC2_APPLE_ACCOUNT_TESTFLIGHT_OPERATOR_AUTOPILOT_V1

Stopped for one operator action: iPhone Apple ID email from Settings (name at top). No rebuild, re-upload, `device:create`, External Beta, or App Store submit. `CURSOR_REPORT.md` / `CURRENT_TASK.md` not overwritten.

```text
BUILD_3_ASC_STATE = VALID; INTERNAL_IN_BETA_TESTING; BUILD_3_ON_TEAM_EXPO_GROUP; EXTERNAL_READY_FOR_BETA_SUBMISSION
TESTFLIGHT_AVAILABLE = YES_INTERNAL
APPLE_AUTH_STATE = EAS_WHOAMI_OK; EAS_ASC_API_KEY_READ_TESTERS_YES; USERS_READ_200; USER_INVITES_READ_200_EMPTY; WRITE_RELINK_EXISTING_409_NOT_403; NO_LOCAL_P8; NO_APPLE_ENV; CURSOR_BROWSER_NO_TAB
ASC_INTERNAL_GROUP = Team (Expo); hasAccessToAllBuilds=true
ASC_USERS = 1 ACCOUNT_HOLDER/ADMIN mohamadabutair054@gmail.com
ASC_TESTERS = 1 same email; inviteType=EMAIL; group state INVITED; builds=[]
DEVICE_CREATE = NOT_RUN
INSTALL = NOT_TESTED
NEXT = WAIT_IPHONE_APPLE_ID_EMAIL
```

---

## Autopilot resume (2026-08-15) — iPhone Apple ID received

Operator email `mohamadabutair054@gmail.com` matches the only ASC user and the only internal tester. Read-only ASC API reconfirm (no key printed; no write): already in `Team (Expo)` (`isInternalGroup=true`, `hasAccessToAllBuilds=true`). Invite **INVITED** / `inviteType=EMAIL`, not accepted. Tester builds `0`, `appDevices=[]`. Build **3** VALID on that group. `eas submit:status` still `1.0.0 (3)` internal in beta testing. No add needed. No rebuild / re-upload / `device:create`. Stopped for Accept on the TestFlight invite email.

```text
IPHONE_APPLE_ID = mohamadabutair054@gmail.com
IN_INTERNAL_GROUP = YES
INVITE_STATE = INVITED
BUILD_3_ON_GROUP = YES
NEXT = WAIT_ACCEPT_TESTFLIGHT_EMAIL
```

---

## Autopilot resume (2026-08-15) — no invite email; official resend

Operator reported no TestFlight email. Live ASC re-query (not stale): still `INVITED` / `inviteType=EMAIL`, still in `Team (Expo)`, Build 3 still VALID on the group, tester builds `0`. Did **not** treat INVITED as delivery. Official `POST /v1/betaTesterInvitations` (app + existing tester) returned **201**. Tester was **not** removed/re-added. No rebuild / re-upload / `device:create`. Stopped for Mail on the iPhone (including junk) → View in TestFlight / Accept.

```text
RESEND = YES_201
INVITATION_ID = c5b6c8d2-8aad-499c-a476-186188143950
TESTER_REMOVED = NO
NEXT = WAIT_MAIL_ACCEPT_AFTER_RESEND
```
