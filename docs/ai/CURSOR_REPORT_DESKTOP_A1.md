# CURSOR_REPORT_DESKTOP_A1

Sidecar for `DESKTOP_A1_ANDROID_V5_FINAL_DEVICE_RELEASE_GATE_V1` (2026-08-15, Fold6 authorized run).  
Shared `CURSOR_REPORT.md` / `PROJECT_STATE.md` / `CURRENT_TASK.md` / `SESSION_HANDOFF.md` were **not** overwritten.

## Summary

Fold6 `RFCX718LVHK` / SM-F956B is adb-authorized. Installed `com.umtuba.app` is **1.0.0 / versionCode 5 / targetSdk 36**. Device QA ran on the cover (folded). Watch/playback/messages/create UI/account-deletion entry/UGC sheet/resume are evidenced. Deep link `umtuba://profile?u=eman` opened the viewer’s own `@mohamad` profile — Watch-profile defect **confirmed on device**. Follow control absent on native Watch. No rebuild, no upload, no commit.

## Exact files changed

- `docs/ops/closeout/DESKTOP_A1_ANDROID_V5_FINAL_DEVICE_RELEASE_GATE_V1.md`
- `docs/ai/CURSOR_REPORT_DESKTOP_A1.md`
- `docs/ops/closeout/a1-v5-device-qa/` (screenshots, dumpsys, logcat)

## Migrations created

None.

## Security review

No secrets printed. Deletion/report/block/upload not submitted. Profile email appears only in device screenshots under closeout evidence.

## Tests

Device QA executed (see closeout table). Unit tests not run.

## TypeScript

Not run.

## Build

`BUILD_PERFORMED = NO`. `ANDROID_REBUILD = FORBIDDEN` honored.

## git diff --check

Exit 0 on the markdown/text this task wrote.

## Open issues

`SOURCE_FIX_REQUIRED = YES`. `NEW_BUILD_REQUIRED = YES` (versionCode 5 obsolete for profile-fix verify). Central must authorize a new versionCode. Do not upload current v5 as final.

## Final verdict

```
STATUS = PARTIAL
INSTALLED_VERSION = 1.0.0
INSTALLED_VERSION_CODE = 5
DEVICE = SM-F956B RFCX718LVHK
PROFILE = FAIL
FOLLOW_STATE = FAIL
SOURCE_FIX_REQUIRED = YES
NEW_BUILD_REQUIRED = YES
CENTRAL_ACTION_REQUIRED = YES
```
