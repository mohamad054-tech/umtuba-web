# PC2-A2 — iOS Build 3 Operator Closeout V2

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_A2_IOS_BUILD3_OPERATOR_CLOSEOUT_V2
DATE = 2026-08-15
MODE = EXECUTION / CLOSE_BLOCKERS
COMMIT_CREATED = NO
PUSHED = NO
REBUILD = NOT_RUN
REUPLOAD_BUILD_3 = NOT_RUN
APP_STORE_REVIEW_SUBMIT = NOT_RUN
SECRET_VALUES_PRINTED = NO
DESKTOP_ANDROID_QA_DUPLICATED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
```

## Final fields

```text
BUILD_3_ASC_STATE = VALID; INTERNAL_IN_BETA_TESTING; EXTERNAL_READY_FOR_BETA_SUBMISSION; NOT_ON_APP_STORE
TESTFLIGHT_AVAILABLE = YES_INTERNAL
OPERATOR_ACTION_REQUIRED = YES
IPHONE_QA_STARTED = NO
IPHONE_QA_RESULT = NOT_EXECUTED
APP_PRIVACY = NOT_VERIFIED
AGE_RATING = ASC_PULL_ALL_NONE; UGC_FALSE; MESSAGING_FALSE; UNSAFE_TO_SUBMIT
METADATA = ASC_PULL_TITLE_ONLY; PRIVACY_POLICY_URL_MISSING; NO_SUBTITLE_DESCRIPTION_KEYWORDS_SUPPORT_CATEGORY
REVIEW_INFO = ABSENT_FROM_ASC_PULL
ACCOUNT_DELETION = NOT_VERIFIED
UGC = ASC_QUESTIONNAIRE_FALSE; PRODUCT_UGC_MISMATCH; SAFETY_FIELDS_NOT_SEEN_IN_ASC
EXPORT_COMPLIANCE = CHECKBOX_NOT_SEEN; INTERNAL_TF_NOT_BLOCKED_BY_MISSING_COMPLIANCE
IOS_REBUILD_REQUIRED = NO
APP_STORE_READY = NO
APP_STORE_SUBMITTED = NO
BLOCKERS = NO_PHYSICAL_IPHONE_ON_PC2; IPHONE_QA_NOT_EXECUTED; ASC_LISTING_INCOMPLETE; AGE_RATING_UGC_AND_MESSAGING_MARKED_FALSE; APP_PRIVACY_NUTRITION_LABELS_NOT_VERIFIED; REVIEW_INFO_ABSENT; REVIEWER_ACCOUNT_NOT_SUPPLIED; SCREENSHOTS_NOT_VERIFIED_IN_ASC; TESTER_GROUPS_NOT_ENUMERATED; IPAD_SCREENSHOTS_STILL_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE
```

---

## Summary

Wave 1 left Apple processing / TestFlight installability **unverified**. This V2 session read App Store Connect through EAS (`npx eas-cli submit:status` and `metadata:pull`) using the **ASC API key already stored in the EAS credentials service**. No local `.p8`, no env key, and no key material was printed.

Build 3 (`1.0.0 (3)`, bundle `com.umtuba.app`, ASC app `6801665530`) is now **VALID** on Apple. Internal TestFlight state is **IN_BETA_TESTING**. External TestFlight is **READY_FOR_BETA_SUBMISSION** (not submitted to external beta review). There is **no** live / in-review / pending-release App Store version. Public iTunes lookup for `com.umtuba.app` is still `resultCount: 0`.

Internal TestFlight availability is **YES**. Real-iPhone QA was **not** started: PC2 has no currently attached iPhone, no Xcode, and no TestFlight installer. Cursor’s browser could not open an authenticated App Store Connect session. Stop at the operator steps below. Do not mark device QA PASS.

ASC listing fields that EAS metadata can see are incomplete and unsafe to submit: English title only, missing required `privacyPolicyUrl`, no review contact/demo account, and an age-rating questionnaire that marks **userGeneratedContent = false** and **messagingAndChat = false**. App Privacy nutrition labels are outside the EAS metadata schema and remain **NOT_VERIFIED**. No rebuild, no re-upload, no App Store review submit.

---

## Verified vs inferred

| Claim | Class | Evidence |
| --- | --- | --- |
| Web git fetch succeeded; not behind; not diverged | **Verified** | Start: `2a146bb` ahead 2 / behind 0. No ff-only pull. This task left Store files untouched. End HEAD `b3c05d8` is an A1 Store commit, not this task. |
| EAS login | **Verified** | `npx eas-cli whoami` — Expo owner of `@umtuba` (account names only). |
| Local ASC `.p8` / Apple env vars | **Verified absent** | All `APPLE*` / `ASC*` / `EXPO_ASC*` / `ITC_*` unset. No `.p8` under Desktop `\umtuba`. |
| EAS credentials service has an ASC API key | **Verified existence only** | `submit:status` / `metadata:pull` printed “Using App Store Connect API Key from EAS credentials service.” Key not printed. |
| Build 3 still the only iOS submit | **Verified** | `eas submit:list` — one FINISHED iOS submit `b62869b1-712b-4d7c-9f67-9253339b82ba` for build `2977565d-5426-4358-823d-68cc91d6868d`. |
| Apple processing complete / binary valid | **Verified** | `processingState: VALID`, `expired: false`. |
| Internal TestFlight available | **Verified** | `internalState: IN_BETA_TESTING`. Human status: `1.0.0 (3) — internal: in beta testing`. |
| External TestFlight | **Verified not started** | `externalState: READY_FOR_BETA_SUBMISSION`. |
| Public App Store listing | **Verified absent** | `submit:status`: Live/In review/Pending release = none. iTunes lookup `resultCount: 0`. |
| Named tester groups / emails | **Not enumerated** | No EAS command listed groups. Feedback `total: 0`. Crashes `total: 0`. |
| ASC listing title | **Verified** | `metadata:pull` `apple.info.en-US.title = "UMTUBA"`. |
| ASC privacy URL / subtitle / description / keywords / support / category / review | **Verified missing from pull** | Only `title` present. `metadata:lint`: missing required `privacyPolicyUrl`. No `review`, `categories`, `copyright`. |
| Age-rating questionnaire values | **Verified via pull** | All advisory answers `NONE` / `false`, including `userGeneratedContent: false`, `messagingAndChat: false`. See caveat below. |
| App Privacy nutrition labels | **Not verified** | Not in EAS metadata schema. ASC console not opened. |
| Account deletion / UGC safety / export checkbox as ASC form fields | **Not verified** | Not returned by metadata pull. Do not reuse Wave 1 source-mapping as ASC observation. |
| Physical iPhone QA | **Not executed** | No present iPhone. Stale Windows WPD nodes only. |
| Cursor browser ASC session | **Not available** | `browser_tabs` empty; navigate failed (“No browser tab available”). Did not guess login. |

**Age-rating caveat:** Expo documents that EAS Metadata uses the least-restrictive advisory answers as defaults. `metadata:pull` is still generated from App Store Connect. The pulled file contained a full advisory object with UGC and messaging false. Treat that as the current ASC-facing questionnaire state. It is **unsafe to submit** whether those are unfinished defaults or incorrectly filed answers. This task did **not** run `metadata:push`.

---

## 1. Git sync (this workspace)

Start of this V2 session (after `git fetch --prune`):

```text
REPO = umtuba-web-translation-trunk-port-v1
BRANCH = office/platform-translation-trunk-port-v1
HEAD = 2a146bb089e0ca94da0b793197edc448da462dea
UPSTREAM = origin/office/platform-translation-trunk-port-v1 @ 72190b6
AHEAD = 2
BEHIND = 0
DIVERGENCE = NO
FF_ONLY_PULL = NOT_NEEDED
```

End of this V2 session (observed; **not** created by this task):

```text
HEAD = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
SUBJECT = feat(store): contain sandbox catalog and close storefront release gaps
AHEAD = 0
BEHIND = 0
DIVERGENCE = NO
```

`git fetch --prune` succeeded at start. This task did **not** commit, push, checkout, reset, stash, or clean. Store A1 later landed `b3c05d8` on the same branch (outside this task). `docs/ai/CURSOR_REPORT.md` and `docs/ai/CURRENT_TASK.md` were **not** overwritten by A2.

Sibling mobile repo (inspect only; not SoT for the uploaded binary):

```text
PATH = C:\Users\Giga store\Desktop\umtuba\umtuba-mobile
CHECKED_OUT = pc2/eas-preview-config-v1 @ 77e9e28
vs origin/master = ahead 1, behind 1
ACCEPTED_BUILD_SHA = 4eede0b4786a77a9cd9d642b792a5642341542c2
```

A temporary `store.config.json` was created by `eas metadata:pull`, read, linted, then **deleted** so it cannot be accidentally `metadata:push`ed (it contained UGC/messaging = false). Mobile product files were not edited. No branch switch / merge / reset.

---

## 2. How ASC was read on PC2 (Windows)

| Path | Result |
| --- | --- |
| `npx eas-cli` 22.0.0 | Works; logged in |
| `eas submit:status -p ios` | **Succeeded** via EAS-stored ASC API key |
| `eas metadata:pull` | **Succeeded**; listing snapshot captured then deleted |
| `eas metadata:lint` | Failed validation: missing `privacyPolicyUrl` |
| `eas testflight:feedback` | `total: 0` |
| `eas testflight:crashes` | `total: 0` |
| `xcrun` / `altool` / `notarytool` / `fastlane` | Still missing |
| Local `.p8` / Apple env | Still missing |
| Cursor browser → appstoreconnect.apple.com | **No usable tab / no authenticated session** |
| Public iTunes lookup | `resultCount: 0` |

No secrets printed. Signed Google Cloud log URLs from `eas build:view` were not copied here.

---

## 3. Current App Store Connect state of build 3

Authorized binary unchanged:

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

`eas submit:status --json` (2026-08-15, this session):

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
  1.0.0 (3) — internal: in beta testing, external: ready for beta submission — uploaded 10 hours ago
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
- Tester availability for a **specific** Apple ID remains an operator check in the ASC TestFlight UI.

---

## 4. ASC listing / compliance fields actually observed

Source: `eas metadata:pull` then `eas metadata:lint`. File deleted after read. This is **not** Wave 1 source-mapping.

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

`eas metadata:lint`:

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
| Privacy policy URL | **Missing** | Lint error |
| Support / marketing URLs | **Missing from pull** | Unset |
| Category | **Missing from pull** | Unset |
| Copyright | **Missing from pull** | Unset |
| Screenshots | **NO** (not in EAS metadata schema; console not opened) | `NOT_VERIFIED` |
| Review first/last/email/phone | **Missing from pull** | Unset |
| Review demo username/password | **Missing from pull** | Unset |
| Review notes | **Missing from pull** | Unset |
| Account deletion declaration | **NO** | `NOT_VERIFIED` |
| UGC safety / Made for Kids form | **Partial** | Questionnaire UGC = false; Kids band null. Guideline 1.2 tooling not visible. |
| Export compliance checkbox | **NO** | Not in metadata. Internal TF is not in `MISSING_EXPORT_COMPLIANCE`. |

Live web URLs (not ASC fields; probed this session, HTTP 200):

- `https://umtuba.com/privacy`
- `https://umtuba.com/terms`
- `https://umtuba.com/account-deletion`
- `https://umtuba.com/support`
- apex + www AASA

Those URLs exist on the web. They are **not** filed in the pulled ASC listing (`privacyPolicyUrl` missing).

Do **not** submit App Store review with the pulled age-rating answers. UMTUBA is a UGC + messaging app. Filing UGC/messaging as false would be an incomplete/false declaration.

---

## 5. iPhone QA — not executed

```text
IPHONE_QA_STARTED = NO
IPHONE_QA_RESULT = NOT_EXECUTED
```

Windows PresentOnly device list: **no** Apple iPhone. Stale non-present WPD/USB nodes exist (`Apple iPhone`, `Apple Mobile Device USB Composite Device`, Status `Unknown`). That is not a usable TestFlight device. `xcrun` / `idevice_id` missing. TestFlight install is iOS-only.

No install, cold launch, auth, Watch, Follow, Discover, Create, profile, Messages, deletion, UGC report/block, permissions, background/resume, network, or crash check was run. **Do not treat this as PASS.**

### Operator TestFlight checklist (run on a real iPhone now that build 3 is internally available)

Prereq: the iPhone’s Apple ID must be an App Store Connect user or internal tester for app `6801665530`.

1. Install **TestFlight**, then install **UMTUBA 1.0.0 (3)** / `com.umtuba.app`. Confirm it is not Expo Go.
2. Cold launch to login. Sign up or log in with a real email/password (disposable or reviewer — not a production admin).
3. After login, navigate Watch / Discover / Create / Messages / Profile without a crash or login loop.
4. Watch: play a public video; like; save; swipe next; background the app (playback must stop); resume.
5. Saved: confirm the saved item appears.
6. Follow a public account → UI must show **Following**, not Unfollow-as-default / broken toggle.
7. Discover: search a known term; pull-to-refresh; airplane mode then restore.
8. Create: pick a short library video; Terms unchecked → Publish blocked; ack → publish; confirm it appears on Watch.
9. Profile: version/build label; Help/Contact/Privacy/Terms; Delete account opens `https://umtuba.com/account-deletion`.
10. Messages: open inbox; send one message if a second test user exists.
11. Account deletion: optional, disposable account only. Web page, type DELETE. Do not delete the reviewer account.
12. UGC: Report another user’s video (closed reason); Block that account; Settings → Blocked users lists it. Own-content delete on the clip you published.
13. Permissions: first Create prompts Photos; deny then allow. Notifications via Settings if prompted.
14. Live: Live tab **absent** on iOS; `/live` lands on Watch.
15. Background/resume, force-quit/relaunch, no redbox, no login loop.

Do **not** set `IPHONE_QA_RESULT = PASS` until the above is evidenced on a device.

---

## 6. Exact operator actions required (stop here)

Cursor on PC2 cannot finish the remaining work. Next human steps, in order:

1. **iPhone + TestFlight**
   - Unlock a physical iPhone.
   - Sign into TestFlight with an Apple ID that is an ASC internal tester for UMTUBA (`6801665530`).
   - If the build is missing: App Store Connect → Apps → UMTUBA → TestFlight → iOS → build **3** → add that Apple ID to an Internal group (or confirm App Store Connect Users).
   - Install `1.0.0 (3)` and run the checklist in §5.
   - Do **not** re-upload build 3.

2. **App Store Connect listing (human browser already signed in)**
   - Open `https://appstoreconnect.apple.com` (Cursor browser on PC2 has **no** session).
   - App `6801665530` / UMTUBA.
   - Age rating: set **user-generated content = yes**, **messaging/chat = yes**, and the rest from actual product behavior. Do not leave the all-NONE pull.
   - App Privacy nutrition labels from the **iOS binary**, not web Live/camera language.
   - Listing: subtitle, description, keywords, category (Social Networking), support `https://umtuba.com/support`, privacy `https://umtuba.com/privacy`, marketing `https://umtuba.com`.
   - Screenshots: iPhone 6.9" required. iPad 13" still required while `supportsTablet: true` (changing that flag is a **new binary** — not authorized).
   - Review information: real contact + **real** demo account (repo still has `REVIEWER_ACCESS_READY = NO`).
   - Confirm export-compliance matches `usesNonExemptEncryption: false` if Apple still shows a build compliance prompt.
   - Do **not** Submit for Review until those fields are complete and honest.

3. **Do not**
   - Rebuild iOS.
   - Re-upload build 3.
   - `eas metadata:push` the all-NONE snapshot (deleted on purpose).
   - Submit App Store review with UGC/messaging false or empty privacy/review fields.
   - Duplicate Desktop Android device QA.
   - Fabricate iPhone QA PASS.

---

## Exact files changed

Web repo:

- `docs/ai/PC2_A2_V2_REPORT.md` (this file; new)

No Store product files changed. `docs/ai/CURSOR_REPORT.md` and `docs/ai/CURRENT_TASK.md` not modified.

Mobile repo: temporary `store.config.json` from `metadata:pull` was deleted after capture. No lasting mobile edit from this task.

## Migrations created

None.

## Security review

- No secrets, `.env`, Apple `.p8`, EAS tokens, or demo passwords printed.
- Team ID `M6HDH86Z55` is already public in live AASA.
- ASC App ID and EAS build/submit IDs are operational identifiers, not credentials.
- Signed Google Cloud log URLs from `eas build:view` were not copied here.
- Did not extract the EAS-stored ASC API key.
- Did not `metadata:push` an incorrect age-rating questionnaire.
- Did not submit App Store review with incomplete/false declarations.
- No competing account-deletion or UGC backend created.

## Tests

Not run (docs/operator closeout; no product change; no rebuild).

## TypeScript

Not run (no TypeScript change in this workspace).

## Build

Not run. `IOS_REBUILD_REQUIRED = NO`. Do not rebuild unless a later confirmed binary defect appears.

## git diff --check

PASS on `docs/ai/PC2_A2_V2_REPORT.md` (no whitespace errors).

## git status --short

This task adds untracked `docs/ai/PC2_A2_V2_REPORT.md` only. Web HEAD at end of session is `b3c05d8` (Store commit from the A1 track, not this task), in sync with origin (ahead 0 / behind 0). Other dirty/untracked files (Wave 1 reports, CURRENT_TASK/CURSOR_REPORT, visual QA worktrees, A1 V2 probes) are outside this task and were not modified by it.

## Open issues

1. **No physical iPhone on PC2** — TestFlight is internally available but device QA is `NOT_EXECUTED`.
2. **Tester groups not enumerated** — operator must confirm the iPhone Apple ID is in an internal group.
3. **ASC listing incomplete** — title only; `privacyPolicyUrl` missing; no category/support/review block.
4. **Age rating unsafe** — pulled questionnaire marks UGC and messaging false.
5. **App Privacy nutrition labels not visible** via EAS metadata.
6. **Reviewer account still not supplied** in repo (`REVIEWER_ACCESS_READY = NO`).
7. **Screenshots not verified in ASC** (schema cannot pull them; console not opened). iPad 13" still required while `supportsTablet: true`.
8. **Cursor browser cannot open ASC** — operator must use an already-authenticated human browser.
9. **Do not re-upload build 3.** If Apple later marks Invalid Binary, stop and report.
10. **Web HEAD moved during this session** from `2a146bb` (ahead 2) to `b3c05d8` (A1 Store commit; now synced with origin). This A2 task did not commit or push.
11. **Mobile checkout drift** unchanged — do not treat `77e9e28` as the uploaded binary SoT.

---

## Verdict

```text
TASK_ID = PC2_A2_IOS_BUILD3_OPERATOR_CLOSEOUT_V2
BUILD_3_ASC_STATE = VALID; INTERNAL_IN_BETA_TESTING; EXTERNAL_READY_FOR_BETA_SUBMISSION; NOT_ON_APP_STORE
TESTFLIGHT_AVAILABLE = YES_INTERNAL
OPERATOR_ACTION_REQUIRED = YES
IPHONE_QA_STARTED = NO
IPHONE_QA_RESULT = NOT_EXECUTED
APP_PRIVACY = NOT_VERIFIED
AGE_RATING = ASC_PULL_ALL_NONE; UGC_FALSE; MESSAGING_FALSE; UNSAFE_TO_SUBMIT
METADATA = ASC_PULL_TITLE_ONLY; PRIVACY_POLICY_URL_MISSING; NO_SUBTITLE_DESCRIPTION_KEYWORDS_SUPPORT_CATEGORY
REVIEW_INFO = ABSENT_FROM_ASC_PULL
ACCOUNT_DELETION = NOT_VERIFIED
UGC = ASC_QUESTIONNAIRE_FALSE; PRODUCT_UGC_MISMATCH; SAFETY_FIELDS_NOT_SEEN_IN_ASC
EXPORT_COMPLIANCE = CHECKBOX_NOT_SEEN; INTERNAL_TF_NOT_BLOCKED_BY_MISSING_COMPLIANCE
IOS_REBUILD_REQUIRED = NO
APP_STORE_READY = NO
APP_STORE_SUBMITTED = NO
BLOCKERS = NO_PHYSICAL_IPHONE_ON_PC2; IPHONE_QA_NOT_EXECUTED; ASC_LISTING_INCOMPLETE; AGE_RATING_UGC_AND_MESSAGING_MARKED_FALSE; APP_PRIVACY_NUTRITION_LABELS_NOT_VERIFIED; REVIEW_INFO_ABSENT; REVIEWER_ACCOUNT_NOT_SUPPLIED; SCREENSHOTS_NOT_VERIFIED_IN_ASC; TESTER_GROUPS_NOT_ENUMERATED; IPAD_SCREENSHOTS_STILL_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE
COMMIT = NO
PUSH = NO
NEXT = OPERATOR_IPHONE_TESTFLIGHT_QA_THEN_FIX_ASC_LISTING_AGE_PRIVACY_REVIEW_DO_NOT_SUBMIT_YET
```
