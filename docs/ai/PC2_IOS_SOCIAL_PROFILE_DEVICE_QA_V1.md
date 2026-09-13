# PC2_IOS_SOCIAL_PROFILE_DEVICE_QA_V1

QA only. No shared/product fix. No commit / push / reset. No App Store Review. No production release.

```text
TASK_ID = PC2_IOS_SOCIAL_PROFILE_DEVICE_QA_V1
STATUS = BUILD20_TESTFLIGHT_READY_DEVICE_QA_BLOCKED_NO_IPHONE_USB
SOURCE_SHA_VERIFIED = YES
IOS_BUILD_RESULT = FINISHED
IOS_BUILD_NUMBER = 20
TESTFLIGHT_UPLOAD = YES
TESTFLIGHT_PROCESSING = INTERNAL_IN_BETA_TESTING
INSTALLED_ON_IPHONE13 = NO
COLD_LAUNCH = NOT_EXECUTED
OWN_PROFILE = NOT_EXECUTED
OTHER_USER_PROFILE = NOT_EXECUTED
PROFILE_TARGETING = NOT_EXECUTED
FOLLOW_FOLLOWING_UNFOLLOW = NOT_EXECUTED
PROFILE_TABS = NOT_EXECUTED
POSTS_TAB = NOT_EXECUTED
PROFILE_SCROLL = NOT_EXECUTED
GLOBAL_BACK = NOT_EXECUTED
WATCH_REGRESSION = NOT_EXECUTED
CREATE_REGRESSION = NOT_EXECUTED
SAVED_REGRESSION = NOT_EXECUTED
SESSION_REGRESSION = NOT_EXECUTED
ARABIC_RTL = NOT_EXECUTED
ENGLISH_LTR = NOT_EXECUTED
IPHONE13_LAYOUT = NOT_EXECUTED
SAFE_AREA = NOT_EXECUTED
ACCESSIBILITY_BASICS = NOT_EXECUTED
LOGO_EXPECTED_MISSING = YES
APPROVED_BACKGROUND_EXPECTED_MISSING = YES
NEUTRAL_COVER_CONTAINER = SOURCE_PRESENT_DEVICE_NOT_OBSERVED
NEW_PROFILE_DEFECTS = NONE_OBSERVED_DEVICE_QA_NOT_EXECUTED
IOS_ONLY_DEFECTS = NONE_OBSERVED
LIKELY_SHARED_DEFECTS = NONE_OBSERVED
REGRESSION_FOUND = NOT_EXECUTED
SOURCE_CHANGED_BY_PC2 = NO
APP_STORE_REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMISSION = NO
IOS_DEVICE_GATE = BLOCKED
READY_FOR_CENTRAL_REVIEW = YES
BLOCKERS = IPHONE13_USB_ABSENT; TESTFLIGHT_UI_CANNOT_BE_DRIVEN_FROM_WINDOWS; SUITES_A_H_NOT_EXECUTED
```

---

## 1 — Source integrity

Primary mobile checkout was **not** reset (left dirty at `77e9e287` / `pc2/eas-preview-config-v1`).

The candidate SHA was **absent** until `git fetch --prune origin`. After fetch:

```text
SHA = 1e708f93555e68ac39826ec57bbd18239e9a5615
OBJECT = commit
SUBJECT = feat(mobile): share Facebook-style social Profile chrome on Android and iOS.
DATE = 2026-08-21 16:50:21 +0300
AUTHOR = UMTUBA Central
PARENT = 741518b20162121baa121f57fb11aa923ea65f62
REMOTE_REF = origin/central/mobile-social-profile-v1
BUILD19_IS_ANCESTOR = YES (c0fe00a4)
```

Non-destructive worktree (detached, clean after submit restore):

`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-social-profile-device-qa-v1`

```text
HEAD = 1e708f93555e68ac39826ec57bbd18239e9a5615
WORKTREE = CLEAN
PRIMARY_CHECKOUT_UNCHANGED = YES
WEB_HEAD = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
WEB_DIRTY = YES (prior uncommitted PC2 work preserved; not discarded)
```

Also fetched (not used as SoT): `origin/central/ios20-selected-sound-apply-v1` @ `741518b` (parent of this SHA). **Not built.**

---

## 2 — Dirty / uncommitted state (preserved)

### Web (`umtuba-web-translation-trunk-port-v1`)

HEAD `b3c05d8` / `office/platform-translation-trunk-port-v1`. Dirty before this turn. Not reset.

Tracked modifications already present: `.env.example`, `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`, `vitest.config.ts`.

Large untracked set already present: PC2 iOS Build 4–19 reports, Learning/Commerce/digital-asset sandbox, `worktrees/`, vitest logs. Left intact.

This turn added/updated only docs under `docs/ai/`.

### Mobile primary (`umtuba-mobile`)

```text
HEAD = 77e9e287e117fc9a19f9a5df1596f69b0b8bf07f
BRANCH = pc2/eas-preview-config-v1
AHEAD_BEHIND = ahead 1, behind 1 vs origin/master
DIRTY = docs/ai/CURSOR_REPORT.md + untracked app-store zip/folder + worktrees/
RESET = NO
```

### Historical worktrees

Build 19 worktree left at `c0fe00a4`. Builds 4–18 left as-is.

---

## 3 — Build-number inspection (before upload)

```text
EAS_REMOTE_IOS_BUILD_NUMBER_BEFORE = 19
LOCAL_APP_CONFIG_AT_SHA = 1.0.0 / ios.buildNumber 20 / android.versionCode 20
SUPPORTS_TABLET = false
BUNDLE_ID = com.umtuba.app
LATEST_EAS_IOS_BEFORE = 1.0.0 (19) gitCommitHash c0fe00a4 (NOT this SHA)
BUILD20_ALREADY_ON_EAS = NO
MARKETING_VERSION_CHANGED = NO
```

Next valid QA number = **20** (EAS remote 19 + autoIncrement; SHA already stamped 20). Did **not** reuse 19. Did **not** jump to 21. Did **not** build parent `741518b`.

Last known physical install (2026-08-20 lockdown): TestFlight **1.0.0 (18)**. That binary cannot validate this SHA.

---

## 4 — Approved iOS / EAS / TestFlight path

Same path as Builds 16–19. One iOS production/store job. Temporary local `eas.json` `submit.production.ios.ascAppId = 6801665530` for submit only, then restored. Worktree left clean. Not committed.

```text
COMMAND_BUILD = npx eas-cli build --platform ios --profile production --non-interactive --wait
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-social-profile-device-qa-v1
EAS_BUILD_ID = 222eb39d-f2b4-41a5-b0ee-60e1bb131f85
STATUS = FINISHED
distribution = STORE
buildProfile = production
appIdentifier = com.umtuba.app
appVersion = 1.0.0
appBuildVersion = 20
gitCommitHash = 1e708f93555e68ac39826ec57bbd18239e9a5615
gitCommitMessage = feat(mobile): share Facebook-style social Profile chrome on Android and iOS.
isForIosSimulator = false
createdAt = 2026-08-21T14:35:21.960Z
completedAt = 2026-08-21T14:41:06.756Z
IOS_ARTIFACT = https://expo.dev/artifacts/eas/jTB5qvJhiJVgn-HulYfe6bZqCggckShFd7JDgvgyQFA.ipa
LOGS = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/222eb39d-f2b4-41a5-b0ee-60e1bb131f85
FINGERPRINT = ff8df80b59dd9ce6ebc4075b0ac46a46eca434b5
EAS_REMOTE_IOS_BUILD_NUMBER_AFTER = 20
ANDROID_EAS_JOB_STARTED = NO
```

```text
COMMAND_SUBMIT = npx eas-cli submit --platform ios --id 222eb39d-f2b4-41a5-b0ee-60e1bb131f85 --profile production --non-interactive --wait
EAS_SUBMIT_ID = c251262a-0d2a-4a3e-bc36-2f86ce30721c
SUBMIT_STATUS = FINISHED (uploaded to App Store Connect)
ASC_APP_ID = 6801665530
TESTFLIGHT_UPLOAD = YES
EXTERNAL_BETA = NO
APP_STORE_REVIEW_SUBMIT = NO
APP_STORE_PRODUCTION_SUBMIT = NO
```

`eas submit:status` after Apple processing:

```text
App Store Live: none
In review: none
Pending release: none
1.0.0 (20) — internal: in beta testing, external: ready for beta submission
EAS Build ID 222eb39d-f2b4-41a5-b0ee-60e1bb131f85
EAS Submission c251262a-0d2a-4a3e-bc36-2f86ce30721c
```

ASC “in beta testing” is **not** iPhone install proof.

---

## 5 — Physical iPhone 13 this turn

```text
IPHONE13_USB_CONNECTED = NO
USBMUX_DEVICELIST = empty (three probes: start / mid / after submit)
PNP_PRESENT_APPLE_IPHONE = NONE
STALE_UNKNOWN_NODES = YES (historical UDID 00008110-000A10123AF9801E among Unknown composites; not live)
APPLE_MOBILE_DEVICE_PROCESS = running (usbmux :27015 LISTEN)
idevice* / pymobiledevice3 / tidevice = ABSENT
screenshotr = historically InvalidService; not retested (no device)
TAP / XCUITest / WDA = ABSENT
```

Cannot Lookup `com.umtuba.app` this turn. Last recorded install (2026-08-20) was **1.0.0 (18)**. Build 19 was TestFlight-ready but never confirmed installed. Build 20 is **not** installed.

Windows still cannot drive TestFlight or app UI.

---

## 6 — Suites A–H (device)

**All NOT_EXECUTED.** No screenshots. No fabricated PASS/FAIL.

### A — Own Profile

```text
RESULT = NOT_EXECUTED
SCREEN = Profile (own)
EVIDENCE = none
```

Source-review only (not a device finding): `ProfileHero` renders a decorative cover container (`PROFILE_COVER_HEIGHT_DP = 148`) with brand-blue / cyan / indigo orbs and **no** logo bitmap / approved background image. Avatar overlaps the cover (`PROFILE_AVATAR_SIZE_DP = 92`). Identity shows display name, `@username`, bio (expand toggle), joined line from `createdAt`, followers/following/posts stats, Edit + Share for own, tabs All / Posts / Videos / About. `aboutExtras` is currently `emptyProfileAboutExtras()` so website / social-link / achievement chips are empty unless later wired — **not observed on device**.

### B — Other-user Profile

```text
RESULT = NOT_EXECUTED
```

Source-review only: `resolveProfileTarget` treats `?id=` as winner; matching signed-in id/username stays `own`; other username/id loads `other` (no own fallback). Follow control labels are **Follow** / **Following**. Designed pattern is **never show Unfollow** (`followButtonLabel` + unit test). Toggle is `toggle_profile_follow`. Operator must verify Follow → Following → tap Following returns to Follow, and state after navigate away/back.

### C — Navigation

```text
RESULT = NOT_EXECUTED
```

Source-review only: Watch avatar uses `buildWatchCreatorProfileHref` → `/profile?u=&id=`. Global Back helper still present. Not tapped.

### D — Regression spot-check

```text
WATCH_REGRESSION = NOT_EXECUTED
CREATE_REGRESSION = NOT_EXECUTED
SAVED_REGRESSION = NOT_EXECUTED
SESSION_REGRESSION = NOT_EXECUTED
REGRESSION_FOUND = NOT_EXECUTED
```

No old closed findings reopened.

### E — RTL / LTR

```text
ARABIC_RTL = NOT_EXECUTED
ENGLISH_LTR = NOT_EXECUTED
```

Source-review only: Profile hero / stats / tabs / root use `localeWritingDirection` / `localeTextAlign` / `chevronGlyph`. Device direction, clipping, overflow not observed.

### F — iPhone 13 visual QA

```text
IPHONE13_LAYOUT = NOT_EXECUTED
SAFE_AREA = NOT_EXECUTED
```

`SafeAreaView` uses `edges={["bottom"]}`. Cover/avatar overlap is intentional in source. Not observed on the 13.

### G — Accessibility basics

```text
ACCESSIBILITY_BASICS = NOT_EXECUTED
```

Source-review only: follow/edit/share `minHeight` 48; tabs `minHeight` 44; avatar / follow / tabs have accessibility labels. Not measured on device.

### H — Visual assets

```text
LOGO_EXPECTED_MISSING = YES
APPROVED_BACKGROUND_EXPECTED_MISSING = YES
NEUTRAL_COVER_CONTAINER = SOURCE_PRESENT_DEVICE_NOT_OBSERVED
```

Do **not** fail solely for missing logo / approved background.

---

## 7 — Defects

No device defect recorded. No screenshot paths.

```text
NEW_PROFILE_DEFECTS = NONE_OBSERVED_DEVICE_QA_NOT_EXECUTED
IOS_ONLY_DEFECTS = NONE_OBSERVED
LIKELY_SHARED_DEFECTS = NONE_OBSERVED
```

Source note for Central (not a device FAIL): own/other Profile screen constructs `aboutExtras` via `emptyProfileAboutExtras()`. If Central expected live website / social links / achievements on this SHA, confirm on-device after install. PC2 did not patch this.

---

## 8 — Operator steps remaining

Unlock and USB-connect the iPhone 13 (`iPhone14,5` / historical UDID `00008110-000A10123AF9801E`). Then:

1. Open **TestFlight** (not App Store, not Expo Go).
2. Open **UMTUBA**. Confirm available/installed line is **1.0.0 (20)**.
3. Install / Update. Wait until TestFlight shows **Open** and **1.0.0 (20)**.
4. Cold-launch UMTUBA from TestFlight Open (or home icon after that).
5. Confirm session still signed in.
6. Run suites A–H from the GO. Designed follow labels: Follow / Following (no Unfollow text). Neutral cover expected. Missing logo / approved background expected.
7. Capture screenshots if the session can (Windows `screenshotr` is not a substitute).
8. STOP on crash, own-profile fallback, broken Follow, dead navigation, or new visual blocker.
9. Return observed fields to Central. Do **not** Add for Review. Do **not** create Build 21.

---

## 9 — Safety

- No mobile / web product source edit.
- No commit, push, reset, stash, discard, merge.
- Primary mobile checkout not reset.
- `eas.json` submit `ascAppId` was temporary and restored.
- No App Store Review / production submit.
- No secrets / `.env` / pairing material printed.
- Logo / approved background not invented.
