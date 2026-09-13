# PC2-A2 — iOS TestFlight / App Store Closeout V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_A2_IOS_TESTFLIGHT_APP_STORE_CLOSEOUT_V1
DATE = 2026-08-15
MODE = EXECUTION_FIRST / TOKEN_CONSERVATIVE
COMMIT_CREATED = NO
PUSHED = NO
REBUILD = NOT_RUN
REUPLOAD_BUILD_3 = NOT_RUN
APP_STORE_REVIEW_SUBMIT = NOT_RUN
SECRET_VALUES_PRINTED = NO
DESKTOP_ANDROID_QA_DUPLICATED = NO
CURSOR_REPORT_OVERWRITTEN = NO
```

## Final fields

```text
IOS_BUILD_3_STATUS = EAS_FINISHED + ASC_BINARY_UPLOAD_FINISHED; APPLE_PROCESSING_OR_TESTFLIGHT_READY_STATE_UNVERIFIED
TESTFLIGHT_AVAILABLE = NOT_VERIFIED
TESTFLIGHT_QA = NOT_EXECUTED; CHECKLIST_PREPARED_FROM_SOURCE
IOS_REBUILD_REQUIRED = NO
APP_PRIVACY = SOURCE_MAPPING_READY; ASC_NUTRITION_LABELS_NOT_VERIFIED
ACCOUNT_DELETION = IN_APP_LINK_PRESENT; WEB_LIVE_200; E2E_DELETION_NOT_EXECUTED
UGC_SAFETY = SOURCE_PRESENT_IN_BUILD_3; DEVICE_QA_NOT_EXECUTED; LIVE_RPC_NOT_PROBED
METADATA = OPERATOR_PACKET_READY; ASC_LISTING_NOT_VERIFIED; SCREENSHOTS_NOT_CAPTURED
REVIEW_INFO = NOTES_PREPARED; REVIEWER_ACCOUNT_ABSENT_FROM_REPO
APP_STORE_READY = NO
APP_STORE_SUBMITTED = NO
BLOCKERS = APPLE_TESTFLIGHT_STATE_UNVERIFIED_NO_ASC_API; NO_PHYSICAL_IPHONE_ON_PC2; TESTFLIGHT_QA_NOT_EXECUTED; ASC_PRIVACY_AGE_SCREENSHOTS_REVIEW_FIELDS_UNVERIFIED; REVIEWER_ACCOUNT_NOT_SUPPLIED; IPAD_SCREENSHOTS_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE
```

---

## Summary

Build 3 is a finished EAS **STORE/production** IPA (`2977565d-5426-4358-823d-68cc91d6868d`, version `1.0.0`, bundle `com.umtuba.app`, SHA `4eede0b4786a77a9cd9d642b792a5642341542c2`). EAS later recorded a **finished iOS submit** of that same build to App Store Connect (submission `b62869b1-712b-4d7c-9f67-9253339b82ba`, ASC App ID `6801665530`, started 2026-08-15 ~00:57 +03). That is binary **upload**, not App Store review submission.

This Windows PC2 session could not read Apple’s current TestFlight processing / “Ready to Test” state: `xcrun` / `altool` / `notarytool` / `fastlane` are absent, no App Store Connect API key is present, and there is no physical iPhone. Public iTunes lookup for `com.umtuba.app` returned `resultCount: 0` (expected if the app is not yet on the store). TestFlight install/launch QA was **not executed**. A source-backed QA checklist is below. No rebuild and no re-upload were performed. App Store review was **not** submitted.

---

## Verified vs inferred

| Claim | Class | Evidence |
| --- | --- | --- |
| Web git fetch succeeded; branch not behind | **Verified** | `office/platform-translation-trunk-port-v1` is **ahead 2 / behind 0** vs origin. No ff-only pull. Not diverged. |
| Laptop retired / do not redo closed iOS work | **Followed** | No rebuild, no re-upload, no review submit, no mobile source edits. |
| Bundle `com.umtuba.app`, version `1.0.0`, Team `M6HDH86Z55` | **Verified** | `app.config.ts`, EAS build JSON, live AASA `M6HDH86Z55.com.umtuba.app`. |
| EAS build 3 finished STORE IPA | **Verified** | `npx eas-cli build:view` JSON: status `FINISHED`, `distribution: STORE`, `buildProfile: production`, `appBuildVersion: "3"`, `gitCommitHash: 4eede0b…`. |
| Build 3 uploaded to ASC | **Verified** | `npx eas-cli submit:list` / `submit:view`: status `finished`, Build ID matches, ASC App ID `6801665530`. |
| Apple still processing / TestFlight installable | **Not verified** | EAS “submit finished” ≠ Apple processing complete. No ASC API / Xcode / device. |
| App already on the public App Store | **Verified absent** | iTunes lookup `bundleId=com.umtuba.app` → `resultCount: 0`. |
| AASA / privacy / terms / deletion / support live | **Verified** | HTTP 200 on apex + www AASA, `/privacy`, `/terms`, `/account-deletion`, `/support`. |
| UGC report/block + own-delete in uploaded SHA | **Verified in source** | `4eede0b` contains `ugcModeration.ts` and ancestors `eb0267a` / `09e94f8`. Device path not run. |
| Account deletion actually erases an account | **Not executed** | Live page copy observed; no signed-in deletion was performed. |
| ASC privacy labels / age rating / screenshots / review notes filed | **Not verified** | No ASC console/API. Operator packet exists in mobile repo only. |
| Reviewer demo account exists | **Not verified** | Repo forbids inventing credentials; `REVIEWER_ACCESS_READY = NO` in `REVIEWER_NOTES.md`. |
| Encryption export answer | **Source-ready** | `ios.config.usesNonExemptEncryption: false`. ASC checkbox not observed. |

---

## 1. Git sync (this workspace)

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

Unrelated local docs/WIP (Store visual QA, prior handoff markdown) were left untouched. `docs/ai/CURSOR_REPORT.md` was **not** overwritten.

Sibling mobile repo (not this workspace HEAD):

```text
PATH = C:\Users\Giga store\Desktop\umtuba\umtuba-mobile
CHECKED_OUT = pc2/eas-preview-config-v1 @ 77e9e28
vs origin/master = ahead 1, behind 1 (local checkout drift; not used as SoT)
ACCEPTED_BUILD_SHA = 4eede0b4786a77a9cd9d642b792a5642341542c2
ACCEPTED_BRANCH = remotes/origin/central/ios-prebuild-integrate-build-go-v1
```

The uploaded binary is `4eede0b`, not the current mobile checkout. No branch switch / merge / reset was performed.

---

## 2. Apple / ASC / CLI availability on PC2 (Windows)

| Tool | Result |
| --- | --- |
| `xcrun` / `altool` / `notarytool` | **MISSING** |
| `fastlane` | **MISSING** |
| Global `eas` / `expo` | **MISSING** |
| `npx eas-cli` | **Works** (this run used eas-cli 22) |
| EAS login | **Logged in** as Expo owner of `@umtuba` (account names only; no tokens printed) |
| Env names `APPLE*` / `ASC*` / `EXPO*` / `EAS*` / `ITC_*` | **None present** |
| Local `.p8` / AuthKey / fastlane Appfile | **None found** under Desktop `\umtuba` (excluding `node_modules` / `.git`) |
| Physical iPhone / Ad Hoc path | **HOLD** (prior gate; unchanged) |

Live ASC TestFlight processing, tester groups, compliance questions, and listing completeness **cannot** be read from this machine without an App Store Connect API key or the ASC website.

---

## 3. Current iOS release state (continue; do not redo)

Historical checkpoint confirmed, not rebuilt:

| Field | Value |
| --- | --- |
| Bundle | `com.umtuba.app` |
| Version | `1.0.0` |
| Build number | `3` |
| EAS build ID | `2977565d-5426-4358-823d-68cc91d6868d` |
| Source SHA | `4eede0b4786a77a9cd9d642b792a5642341542c2` |
| Team | `M6HDH86Z55` |
| EAS project | `d2593b45-8f18-4c57-9d71-0419193cfd77` (`@umtuba/umtuba-mobile`) |
| Distribution | `STORE` / profile `production` |
| Simulator | `false` |
| Build completed | 2026-08-14 21:44 UTC |
| IPA artifact (EAS) | `https://expo.dev/artifacts/eas/xUWdXLSF5HW16miIZKJy8pX0gcQBkHkiRZhTXA1iu8s.ipa` |
| EAS submit ID | `b62869b1-712b-4d7c-9f67-9253339b82ba` |
| EAS submit status | `finished` |
| ASC App ID | `6801665530` |
| Submit started | 2026-08-15 ~00:57 +03 |

Prior gate `PC2_IOS_POSTBUILD_TESTFLIGHT_GATE_V1` verified artifact / bundle / build number / signing and returned `TESTFLIGHT_UPLOAD_READY = YES` **without** running submit. A later operator/EAS submit **did** run and finished. This task did **not** run submit again.

```text
DO_NOT_REUPLOAD_BUILD_3 = OBSERVED
DO_NOT_REBUILD = OBSERVED
```

---

## 4. TestFlight QA — executed vs checklist

**Physical install/launch on iPhone: NOT EXECUTED.** Windows PC2 has no Xcode, no Simulator, no registered Ad Hoc device, and TestFlight installer is iOS-only. QA below is prepared from uploaded SHA source + live web probes.

| Area | Source evidence in build 3 | Executed on device? |
| --- | --- | --- |
| Install / launch | STORE IPA exists; TestFlight availability unverified | **NO** |
| Auth | Email/password login + signup + forgot/update password; scheme `umtuba://auth/callback`; no Google/Facebook; SIWA not required | **NO** |
| Watch / playback | Feed + `playbackPolicy` (play only when active + focused + foreground); like/save; auto-next | **NO** |
| Discover | Home grid/search; error/unavailable/empty phases | **NO** |
| Messages | Inbox + thread; loading/empty/error/unavailable; realtime subscribe | **NO** |
| Create / upload | Library picker (`expo-image-picker`); caption; Terms ack required; abort on unmount; background banner while busy | **NO** |
| Profile / settings | Profile presentation; Settings: sign out, change password, blocked users, Help/Contact/Privacy/Terms | **NO** |
| Account deletion | Settings → opens `https://umtuba.com/account-deletion` (live 200, sign-in + type DELETE) | **NO** (page GET only) |
| UGC report / block | Watch Report (closed reasons) + Block; Settings → Blocked users; RPCs `report_ugc_content` / `report_ugc_user` / `block_ugc_user` / `unblock_ugc_user`; local hide fallback | **NO** |
| Own-content delete | Watch owner delete (UAF-12) | **NO** |
| Permissions | Photo library + notifications purpose strings; camera/mic **removed**; Live tab `href: null` on iOS and Live route redirects to Watch | **NO** |
| Network / error | Watch/Discover/Messages/Create have error/unavailable copy | **NO** |
| Background / resume | Watch pauses off-foreground; Create listens to `AppState` | **NO** |
| Crash behavior | No device crash log; no rebuild trigger observed | **NO** |

### Operator TestFlight checklist (run on an iPhone after Apple shows build 3 Ready to Test)

1. **Install** TestFlight build 3 (`1.0.0 (3)`, `com.umtuba.app`). Confirm it is not Expo Go.
2. **Cold launch** to login. Sign in with a real email/password (reviewer account if submitting later).
3. **Auth fail**: wrong password shows an error; Forgot password sends recovery; do not test with production-admin accounts.
4. **Watch**: play a public video; like; save; swipe next; background the app and confirm playback stops; resume.
5. **Discover**: search a known term; pull-to-refresh; airplane-mode then restore.
6. **Messages**: open inbox empty or existing thread; send one message if a second test user exists.
7. **Create**: pick a short library video; leave Terms unchecked → Publish blocked; check ack → publish; confirm it appears on Watch.
8. **Own delete**: delete that clip from the Watch rail.
9. **Report**: on someone else’s video, submit a closed reason; confirm “Report submitted” or honest failure.
10. **Block**: block that account; confirm it disappears; Settings → Blocked users lists it.
11. **Profile / Settings**: version/build label; Help/Contact/Privacy/Terms open live HTTPS pages; Delete account opens `/account-deletion`.
12. **Account deletion**: optional — only on a disposable account. Sign in on the web page, type DELETE, confirm queue copy. Do not delete the reviewer account.
13. **Permissions**: first Create prompts Photos; deny then allow; Notifications via Settings → system settings.
14. **Live**: confirm Live tab is **absent** on iOS and deep-link `/live` lands on Watch.
15. **Crash**: force-quit / relaunch; no redbox; no login loop.

Do **not** mark `TESTFLIGHT_QA = PASS` until the above is evidenced on a device.

---

## 5. App Store submission requirements (repo + live vs ASC)

Do not submit review with guessed declarations. Remaining ASC work is operator/console work.

### App information

| Field | Prepared / live | ASC observed? |
| --- | --- | --- |
| Name | UMTUBA | **NO** |
| Bundle / SKU | `com.umtuba.app` / ASC App ID `6801665530` | App ID from EAS only |
| Subtitle | “Watch. Create. Belong.” (packet) | **NO** |
| Category | Social Networking (packet; Entertainment alternate) | **NO** |
| Support URL | Live `https://umtuba.com/support` (200). In-app Help/Contact still open `/privacy` (stale packet said `/support` 404 — **live is 200 now**). Prefer ASC Support URL = `/support`. | **NO** |
| Privacy URL | `https://umtuba.com/privacy` (200) | **NO** |
| Marketing | `https://umtuba.com` | **NO** |
| Public store listing | iTunes lookup empty | Not shipped |

### Privacy

Source map: `umtuba-mobile/docs/app-store/APP_PRIVACY.md` + `NSPrivacyTracking: false`.

Declare from **actual iOS behavior** (do not copy web Live/camera language as if the iOS binary uses camera):

- Collect: email, user ID, user content (video/caption), user-selected photos/videos, messages if used, product interaction (likes/saves).
- Do **not** declare: precise location, advertising ID, tracking, IAP, camera, microphone.
- Diagnostics: only if Expo/EAS telemetry is on for the production build — **unverified**.
- Privacy policy mentions camera/mic for Live; **iOS binary hides Live and removed those plugins**. File iOS nutrition labels from the binary, not the broader web policy.

`APP_PRIVACY = SOURCE_MAPPING_READY; ASC_NUTRITION_LABELS_NOT_VERIFIED`

### Age rating

UGC + messaging + no mature-content filter product. Packet: owner completes ASC questionnaire; likely **12+ or 17+**. Do not self-attest 4+. **Not filed/verified in ASC from this task.**

### Screenshots / metadata

Plan exists (`SCREENSHOT_MATRIX.md`). **No screenshots in repo. None captured here.**

- iPhone 6.9" portrait required.
- `supportsTablet: true` → **13" iPad screenshots required** unless Central later sets `supportsTablet: false` (that would be a **new binary** — not authorized now).

### Review information

`REVIEWER_NOTES.md` has paste-ready notes. Reviewer email/password **must be created by the owner** and entered only in ASC. Not in git.

Also tell review: Live hidden; use TestFlight binary not Expo Go; Universal Links hosts `umtuba.com` / `www.umtuba.com`; custom scheme `umtuba://auth/callback`.

### Account deletion (5.1.1(v))

- In-app: Settings → Delete account → `https://umtuba.com/account-deletion`
- Live page: 200, sign-in required, type DELETE, queued (not immediate)
- Privacy/Terms both point at this URL
- End-to-end processed deletion: **not executed** this task

### UGC (Guideline 1.2)

In build 3 source:

- Terms ack before Publish
- Own-content delete
- Report with closed reasons
- Block + Blocked users list
- Client binds 20260928 RPCs; local hide fallback if RPC fails

Server queue / moderator tooling: **not probed live** from PC2 this task. Do not claim production moderation PASS.

### Encryption / export

Binary config: `usesNonExemptEncryption: false` (standard HTTPS / OS keychain). ASC export-compliance question must match that. **ASC checkbox not observed.**

### TestFlight state

| Item | State |
| --- | --- |
| Binary uploaded | **YES** (EAS submit finished) |
| Apple processing / Missing Compliance / Ready to Test | **UNVERIFIED** |
| Internal testers added | **UNVERIFIED** |
| External TestFlight review | **UNVERIFIED / not claimed** |
| Device QA | **NOT EXECUTED** |

---

## 6. Remaining ASC fields (do not guess)

Operator must open App Store Connect app `6801665530` and complete/confirm:

1. Build 3 status: Processing / Invalid Binary / Missing Compliance / Ready to Submit / Ready to Test.
2. TestFlight export-compliance / encryption answers (match `usesNonExemptEncryption: false`).
3. Internal tester group + install proof.
4. Privacy nutrition labels (from `APP_PRIVACY.md`, iOS-actual).
5. Age-rating questionnaire.
6. iPhone 6.9" screenshots (and iPad 13" while `supportsTablet: true`).
7. Description / subtitle / keywords / category / URLs (`/support`, `/privacy`).
8. Review notes + **real** demo account.
9. Content rights / UGC / Made for Kids (Kids = No).
10. Pricing / availability / primary locale.
11. Contact phone/email for App Review.
12. Only then: Submit for Review — **not authorized by this task**.

---

## Exact files changed

Web repo:

- `docs/ai/PC2_A2_REPORT.md` (this file; new)

No mobile/web product files changed. `docs/ai/CURSOR_REPORT.md` not modified.

## Migrations created

None.

## Security review

- No secrets, `.env`, Apple `.p8`, or EAS tokens printed.
- Team ID `M6HDH86Z55` is already public in live AASA.
- ASC App ID and EAS build/submit IDs are operational identifiers, not credentials.
- Signed Google Cloud log URLs from `eas build:view --json` were **not** copied into this report.
- No competing account-deletion or UGC backend created.
- No review submit with incomplete declarations.

## Tests

Not run (docs-only closeout; no product change; no rebuild).

## TypeScript

Not run (no TypeScript change in this workspace).

## Build

Not run. `IOS_REBUILD_REQUIRED = NO`. Do not rebuild unless a later confirmed binary defect appears.

## git diff --check

Pass on `docs/ai/PC2_A2_REPORT.md` (no whitespace errors).

## git status --short

This task adds untracked `docs/ai/PC2_A2_REPORT.md` only. Web branch remains ahead 2 / behind 0. Other dirty/untracked files (Store WIP, prior handoff docs, sibling `PC2_A3_REPORT.md`) are outside this task and were not modified by it.

## Open issues

1. **Apple TestFlight processing / Ready-to-Test state unknown** — no ASC API on PC2. Operator must check ASC for build 3 (`6801665530`).
2. **No physical iPhone** — cannot install, launch, or sign TestFlight QA.
3. **ASC listing incomplete from this vantage** — privacy labels, age rating, screenshots, review notes, demo account unverified.
4. **Reviewer account not in repo** — required before App Store review.
5. **iPad screenshots** required while `supportsTablet: true`.
6. **In-app Help/Contact still open `/privacy`** while `/support` is now live. Metadata-only; not a rebuild defect.
7. **Mobile checkout drift** (`pc2/eas-preview-config-v1` ahead 1 / behind 1 vs `origin/master`) — do not treat that checkout as the uploaded binary SoT. Uploaded SoT remains `4eede0b`.
8. **Web branch ahead 2** of origin (prior SAVE_ALL commits). Not a blocker for this docs report. No push.
9. **Do not re-upload build 3.** If Apple later marks Invalid Binary, stop and report; do not silently rebuild.

---

## Verdict

```text
TASK_ID = PC2_A2_IOS_TESTFLIGHT_APP_STORE_CLOSEOUT_V1
IOS_BUILD_3_STATUS = EAS_FINISHED + ASC_BINARY_UPLOAD_FINISHED; APPLE_PROCESSING_OR_TESTFLIGHT_READY_STATE_UNVERIFIED
TESTFLIGHT_AVAILABLE = NOT_VERIFIED
TESTFLIGHT_QA = NOT_EXECUTED; CHECKLIST_PREPARED_FROM_SOURCE
IOS_REBUILD_REQUIRED = NO
APP_PRIVACY = SOURCE_MAPPING_READY; ASC_NUTRITION_LABELS_NOT_VERIFIED
ACCOUNT_DELETION = IN_APP_LINK_PRESENT; WEB_LIVE_200; E2E_DELETION_NOT_EXECUTED
UGC_SAFETY = SOURCE_PRESENT_IN_BUILD_3; DEVICE_QA_NOT_EXECUTED; LIVE_RPC_NOT_PROBED
METADATA = OPERATOR_PACKET_READY; ASC_LISTING_NOT_VERIFIED; SCREENSHOTS_NOT_CAPTURED
REVIEW_INFO = NOTES_PREPARED; REVIEWER_ACCOUNT_ABSENT_FROM_REPO
APP_STORE_READY = NO
APP_STORE_SUBMITTED = NO
BLOCKERS = APPLE_TESTFLIGHT_STATE_UNVERIFIED_NO_ASC_API; NO_PHYSICAL_IPHONE_ON_PC2; TESTFLIGHT_QA_NOT_EXECUTED; ASC_PRIVACY_AGE_SCREENSHOTS_REVIEW_FIELDS_UNVERIFIED; REVIEWER_ACCOUNT_NOT_SUPPLIED; IPAD_SCREENSHOTS_REQUIRED_WHILE_SUPPORTS_TABLET_TRUE
COMMIT = NO
PUSH = NO
NEXT = OPERATOR_ASC_CONSOLE_CHECK_BUILD_3_THEN_DEVICE_TESTFLIGHT_QA
```
