# PC2 — iOS Readiness Changes Preserve Handoff V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_READINESS_PRIMARY
TASK_ID = PC2_IOS_READINESS_CHANGES_PRESERVE_HANDOFF_V1
PARENT = PC2_IOS_APP_STORE_RELEASE_READINESS_PREPARATION_V1
TIMESTAMP_LOCAL = 2026-08-13 ~20:02 +03
COMMIT_CREATED = YES
FORCE_PUSH = NO
APP_STORE_UPLOAD = NOT_ATTEMPTED
```

## CENTRAL FIELDS

```text
SOURCE_BASE_SHA = fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99
SOURCE_BRANCH = master
IOS_FILES_IDENTIFIED = YES (20 mobile + 6 isolated web AASA)
UNRELATED_WIP_FOUND = YES (web Store visual QA, vitest logs, Store deposit report — not committed)
PROVENANCE_VERDICT = ACCEPTED_IOS_READINESS_ONLY
AUTH_CALLBACK_CONFIGURED = YES (umtuba://auth/callback)
ACCOUNT_DELETION_LINK_CONFIGURED = YES (Settings → https://umtuba.com/account-deletion)
ACCOUNT_DELETION_URL_RUNTIME_STATUS = PENDING_404
UGC_TERMS_GATE_CONFIGURED = YES
IOS_PERMISSION_CLEANUP_VERIFIED = YES (expo-media-library / media-location removed; camera/mic kept for unwired Live)
ANDROID_REGRESSION = PASS
IOS_CONFIG_VALIDATION = PASS
TEST_RESULTS = MOBILE_TSC_PASS; MOBILE_READINESS_34_PASS; WEB_AASA_2_PASS; EXPO_CONFIG_RESOLVES
COMMIT_CREATED = YES
COMMIT_SHA = 3b335610ced48aa2595fe49eef5b97511c7f4cb5
WEB_AASA_COMMIT_SHA = 5dbd77910b3e5f75f0f57e908af3599474ea8a41
PUSH_RESULT = SUCCESS
REMOTE_REF = origin/master
WEB_REMOTE_REF = origin/office/platform-translation-trunk-port-v1
CENTRAL_FETCH_READY = YES
APPLE_TEAM_ID_STATUS = ABSENT (IOS-B01)
UGC_REPORT_STATUS = MISSING (IOS-B03)
UGC_BLOCK_STATUS = MISSING (IOS-B03)
LIVE_PERMISSION_STATUS = DECLARED_NOT_WIRED (IOS-B04)
IOS_APP_STORE_READY_FOR_BUILD = NO
BLOCKERS = [IOS-B01, IOS-B02, IOS-B03, IOS-B04]
CENTRAL_ACTION_REQUIRED = YES
NEXT_ACTION_REQUIRED = OPERATOR_TEAM_ID_AND_LIVE_ACCOUNT_DELETION; DO_NOT_START_ANOTHER_IOS_WAVE
```

## Provenance

| Class | Items |
| --- | --- |
| IOS_READINESS | `app.config.ts` media-library removal, privacy manifest, purpose strings |
| SHARED_MOBILE_REQUIRED | auth callback, Settings deletion link, Create UGC ack, deep links, tests |
| PREEXISTING_WIP | none in mobile |
| UNRELATED | web Store QA/logs — left uncommitted |
| UNCERTAIN | none |

Mobile was `fe14a34` = `origin/master` at start. No divergence.

## Safety

- Signup `emailRedirectTo` = `umtuba://auth/callback`. Recovery still requires `type=recovery` or update-password path. Web `/auth/callback` route not rewritten in the AASA commit.
- Account deletion Settings row opens the Central URL. **Runtime still 404 — not ready.**
- UGC ack is a checkbox; Publish stays available after the user accepts Terms.
- Removed plugin was unused (`expo-media-library` not imported). Android `permissions` array unchanged.

## Delivery

1. Mobile commit `3b33561` pushed `fe14a34..3b33561` → `origin/master`
2. Web AASA commit `5dbd779` pushed `8204c0c..5dbd779` → `origin/office/platform-translation-trunk-port-v1`
3. Git identity was set via process env only (no `git config` write)

## Keep open

- **IOS-B01** Apple Team ID / live AASA
- **IOS-B02** account-deletion URL until the live page exists
- **IOS-B03** UGC report/block (Desktop/Central)
- **IOS-B04** Live camera/microphone — do not enable Live to close this

**IOS_APP_STORE_READY_FOR_BUILD = NO**
