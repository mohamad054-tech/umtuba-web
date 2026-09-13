# DESKTOP_ANDROID_PRODUCTION_AAB_BUILD_V1

**PHASE:** PRODUCTION_AAB_BUILD  
**Status:** PASS (AAB verified locally; Google Play upload NOT performed)  
**Written:** 2026-08-13 01:42:16 +03:00  
**Mobile project:** `C:\Users\1\Desktop\umtuba\umtuba-mobile`  
**EAS account / project:** `umtuba` / `umtuba-mobile` (`whoami`: mohamadabutair; Accounts include umtuba Owner)

## Summary

Production Android App Bundle built on EAS with profile `production`, using **existing remote Android keystore** (no new keystore generated). Artifact downloaded under `umtuba-mobile\release-artifacts\`. No Google Play upload/submit.

**Note:** `eas.json` production profile has `autoIncrement: true` and `cli.appVersionSource: "remote"`. EAS incremented `versionCode` from **1 → 2** at build submit time. Operator had authorized VERSION_CODE=1 for first Play bundle; Play Console still has no prior codes, so **versionCode 2 remains valid for first upload**. Package id and versionName unchanged.

## Preflight

| Check | Result |
|-------|--------|
| `eas whoami` | PASS (mohamadabutair; umtuba Owner) |
| `expo config --type public` | PASS — `android.package=com.umtuba.app`, `version=1.0.0`, `android.versionCode=1` (local config; remote source overrides at build) |
| `eas.json` production | Present; default Android artifact is **app-bundle** (no `buildType: apk`); `autoIncrement: true` |
| Existing signing | PASS — CLI: `Using remote Android credentials` / `Using Keystore from configuration: Build Credentials p6De1DDtE_ (default)` |

## EAS build

| Field | Value |
|-------|--------|
| Command | `npx eas-cli build --platform android --profile production --non-interactive` |
| Result | PASS (exit 0) |
| BUILD_ID | `86c0d773-7072-4f0a-bf97-52349cde3f21` |
| BUILD_URL | https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/86c0d773-7072-4f0a-bf97-52349cde3f21 |
| Artifact URL | https://expo.dev/artifacts/eas/gS81ENTpesTyRibnGSeph4csBNdir0vx6u3UwAd756s.aab |
| Profile | production |
| Distribution | STORE |
| appVersion (versionName) | 1.0.0 |
| appBuildVersion (versionCode) | **2** |
| SDK | 57.0.0 |
| gitCommitHash | `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99` |
| EXISTING_KEYSTORE_USED | YES |
| NEW_KEYSTORE_GENERATED | NO |

## Local artifact

| Field | Value |
|-------|--------|
| Path | `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-86c0d773.aab` |
| Type | `.aab` (contains `BundleConfig.pb`, `base/manifest/AndroidManifest.xml`) |
| Size | 102242186 bytes (~97.5 MiB) |
| SHA256 | 1C3D41006F8834DE09716049856589E5AAE5DFC1ED74712C74E28E5A187D4671 |
| Signed | YES — `META-INF/*.SF` + `*.RSA`; `Created-By: Signflinger` |
| Package | `com.umtuba.app` (binary manifest string scan + expo config + EAS project) |
| versionName | 1.0.0 (EAS metadata + manifest strings) |
| versionCode | 2 (EAS `appBuildVersion`; CLI increment log) |
| Release (not debug) | YES — profile production, distribution STORE, signed release identity |

Metadata JSON (non-secret): `umtuba-mobile\release-artifacts\eas-build-86c0d773.json`

## Verification checklist

- [x] EAS build PASS
- [x] Artifact exists, type AAB
- [x] package = com.umtuba.app
- [x] versionName = 1.0.0
- [x] versionCode = 2 (autoIncrement; see note)
- [x] release / STORE distribution
- [x] signed with existing EAS Android credentials
- [x] size + SHA256 captured
- [x] Google Play upload NOT performed

## Archive

Desktop-Agent-Archive Handoffs path not found under `C:\Users\1\Desktop\umtuba` at write time — no archive copy made. Canonical report: this file under `umtuba-web\docs\ops\closeout\`.

## Return block

```
ANDROID_PRODUCTION_BUILD_EXECUTED = YES
EAS_BUILD_RESULT = PASS
EAS_BUILD_ID = 86c0d773-7072-4f0a-bf97-52349cde3f21
EAS_BUILD_URL = https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/86c0d773-7072-4f0a-bf97-52349cde3f21
PACKAGE_ID = com.umtuba.app
VERSION_NAME = 1.0.0
VERSION_CODE = 2
EXISTING_KEYSTORE_USED = YES
NEW_KEYSTORE_GENERATED = NO
AAB_CREATED = YES
AAB_LOCAL_PATH = C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-86c0d773.aab
AAB_SIZE = 102242186
AAB_SHA256 = 1C3D41006F8834DE09716049856589E5AAE5DFC1ED74712C74E28E5A187D4671
AAB_SIGNED = YES
AAB_READY_FOR_GOOGLE_PLAY = YES
GOOGLE_PLAY_UPLOAD_PERFORMED = NO
REMAINING_BLOCKERS = [versionCode autoIncremented to 2 vs operator-authorized 1; not a Play blocker for first upload]
```

## STOP

Successful AAB verification complete. No Play upload.
