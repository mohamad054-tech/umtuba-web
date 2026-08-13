# PC2 — iOS App Store Operator Mode V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_PRIMARY_OPERATOR
TASK_ID = PC2_IOS_APP_STORE_OPERATOR_MODE_V1
CENTRAL_COORDINATOR = SERVER
TIMESTAMP_LOCAL = 2026-08-13 ~23:30 +03
MODE = SOURCE_SYNC + IOS_CONFIG + POLICY + METADATA + BUILD_PREP + APPLE_ACCOUNT_GATE
APP_STORE_UPLOAD = NOT_ATTEMPTED
TESTFLIGHT_SUBMIT = NOT_ATTEMPTED
APPLE_PRODUCTION_CREDENTIALS_USED = NO
SECRET_VALUES_PRINTED = NO
DESKTOP_ANDROID_OVERWRITTEN = NO
COMPETING_UGC_BACKEND = NO
COMPETING_ACCOUNT_DELETION_BACKEND = NO
LIVE_ENABLED = NO
FORCE_PUSH = NO
```

## CENTRAL FIELDS

```text
AUTHORITATIVE_MOBILE_BASE_SHA = 3b335610ced48aa2595fe49eef5b97511c7f4cb5
AUTHORITATIVE_MOBILE_SHA = 45f0dbc953ad6770ed263b0961306fa04f04688c
AUTHORITATIVE_MOBILE_TIP = db7f927467eb2a5416b612c330bfa8440bcf50f0
BRANCH = master
WORKTREE_STATUS = PUSHED_TO_ORIGIN_MASTER
CENTRAL_FETCH_READY = YES
IOS_BUNDLE_ID_STATUS = PRESENT_IN_REPO com.umtuba.app
IOS_APP_NAME_STATUS = UMTUBA
IOS_VERSION_STATUS = 1.0.0
IOS_BUILD_NUMBER_STATUS = 1 (eas production autoIncrement true)
EAS_IOS_CONFIG_STATUS = PRESENT (eas.json + extra.eas.projectId d2593b45-8f18-4c57-9d71-0419193cfd77)
EAS_LOGIN_STATUS = NOT_LOGGED_IN
EXPO_LOGIN_STATUS = NOT_LOGGED_IN
IOS_RUNTIME_COMPATIBILITY = OPERATOR_FIXES_APPLIED
IOS_AUTH_QA = EMAIL_PASSWORD; CALLBACK umtuba://auth/callback
IOS_DEEP_LINK_READINESS = SCHEME_READY; UNIVERSAL_LINKS_BLOCKED_NO_TEAM_ID_AASA
AASA_SOURCE_STATUS = READY_IN_WEB 5dbd779
AASA_LIVE_STATUS = 404
APPLE_TEAM_ID_STATUS = ABSENT_NOT_INVENTED
SIGN_IN_WITH_APPLE_REQUIRED = NO
IOS_PERMISSION_AUDIT = FAIL (camera/mic declared; Live join unwired; iOS Live surface hidden)
APP_STORE_PRIVACY_READINESS = OPERATOR_MAPPING_READY_NOT_DECLARED
IOS_UGC_TERMS_GATE = PRESENT
IOS_UGC_OWN_DELETE = CONSUMED_UAF12
IOS_UGC_REPORT_BLOCK = MISSING
IOS_UGC_READINESS = PARTIAL
IOS_ACCOUNT_DELETION_URL = https://umtuba.com/account-deletion
IOS_ACCOUNT_DELETION_LIVE = PAGE_OBSERVED_200
IOS_ACCOUNT_DELETION_CENTRAL_VERIFICATION = NOT_CONFIRMED
IOS_ACCOUNT_DELETION_READINESS = NOT_READY
APP_STORE_METADATA_READINESS = OPERATOR_PACKET_READY_NOT_PUBLISHED
SCREENSHOT_PLAN_READY = YES
SCREENSHOTS_FABRICATED = NO
IOS_BUILD_READINESS = NO_LOCAL_IOS_TOOLCHAIN_ON_WINDOWS
EAS_CLOUD_PATH_PREPARED = YES
SHARED_ANDROID_REGRESSION_RISK = LOW (iOS Live hide only; Android permissions unchanged)
SAFE_FIXES_IMPLEMENTED = YES
TEST_RESULTS = MOBILE_TSC_PASS; FOCUSED_VITEST 18_PASS
TYPECHECK = MOBILE_TSC_PASS
BUILD_CHECK = IOS_NATIVE_BUILD_NOT_RUN
CENTRAL_TESTFLIGHT_GO = ABSENT
CENTRAL_APP_STORE_GO = ABSENT
IOS_APP_STORE_READY_FOR_BUILD = NO
USER_GATE = APPLE_DEVELOPER_INDIVIDUAL_ENROLLMENT
CENTRAL_ACTION_REQUIRED = YES
NEXT_ACTION_REQUIRED = USER_APPLE_INDIVIDUAL_ENROLLMENT_THEN_RETURN_TEAM_ID
```

---

## 1. What was automated

1. Confirmed mobile SoT `origin/master` @ `3b33561` (prior readiness contracts already pushed).
2. Rechecked `https://umtuba.com/account-deletion` — public deletion page with real copy (sign-in + type DELETE). Not claimed READY.
3. Rechecked `https://umtuba.com/.well-known/apple-app-site-association` — **404**.
4. Consumed web UAF-12 own-delete on mobile Watch (same error strings / owner gate / `posts` delete + owned media cleanup). No new backend.
5. Hid iOS Live tab (`href: null`) and redirected iOS Live route to Watch. Android Live tab unchanged.
6. Wrote `docs/app-store/OPERATOR_PACKET.md` (metadata, age-rating inputs, privacy mapping, reviewer notes, screenshot plan, EAS/TestFlight commands).
7. Validated Expo public config and ran `tsc` + focused tests.
8. Did not invent Team ID, did not enable Live, did not submit TestFlight/App Store, did not push web UAF-12.

## 2. Readiness flags

| Flag | Value |
| --- | --- |
| IOS_APP_STORE_READY_FOR_BUILD | **NO** |
| SIGN_IN_WITH_APPLE_REQUIRED | NO |
| IOS_BUNDLE_ID | `com.umtuba.app` present |
| AASA live | 404 |
| Apple Team ID | absent |
| UGC terms | present |
| UGC own-delete | consumed UAF-12 |
| UGC report/block | **missing (IOS-B03)** |
| Account deletion URL | live page observed |
| Account deletion Central READY | **NO** |
| Live product | intentionally off; iOS entry hidden |
| Expo / EAS login | not logged in |
| Central TestFlight GO | absent |
| Central App Store GO | absent |

## 3. Blockers (honest)

- **IOS-B01** Apple Developer Team ID + live AASA
- **IOS-B02** Central must still verify a real deletion on production
- **IOS-B03** Report content + block user (Guideline 1.2) — do not invent a backend
- **IOS-B04** Camera/mic still declared via `expo-camera` while Live join is unwired (plugin kept for Android)
- Apple Developer Individual enrollment / identity / 2FA / payment
- Expo + EAS login on this PC

## 4. User-only gate (Arabic copy-ready)

See parent return. Enrollment type: **Individual**. Do not create Organization.

## 5. Tests / TypeScript / Build

- `npm run typecheck` PASS
- `npx vitest run` delete + emailConfirm + ugcSafety + live = 18 PASS
- iOS native / EAS build not run
- `git diff --check` clean on operator files

## 6. Git

Mobile pushed: `3b33561..db7f927` on `origin/master`. Implementation `45f0dbc`, tip `db7f927`. Web UAF-12 `72190b6` not pushed. Store visual QA not mixed in.
