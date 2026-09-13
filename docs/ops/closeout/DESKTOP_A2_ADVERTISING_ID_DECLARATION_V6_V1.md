# DESKTOP_A2_ADVERTISING_ID_DECLARATION_V6_V1

Inspect-only. No source / AAB / Play Console changes. No commit. No secrets.

## Verdict fields

```
AD_ID_PERMISSION_PRESENT = NO
ADVERTISING_ID_USED = NO
SDK_CAUSING_AD_ID = NONE
GOOGLE_PLAY_DECLARATION = NO
```

Play Console question: **"Does your app use an advertising ID?"** → answer **No**.

## Identity (confirmed)

| Field | Value |
| --- | --- |
| SOURCE_SHA / worktree HEAD | `f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604` |
| Worktree | `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A1-ANDROID-V6` (`office/android-v6-minimal-source-fix-v1`) |
| AAB | `docs/ops/closeout/android-v6-release/aab/umtuba-android-production-5c3493cb.aab` |
| AAB bytes | `102265891` |
| AAB SHA-256 | `17775D73434A16243496EEDCAB724C9960106DB73BF89134AB9B7CF00E652E67` (matches `eas-build-5c3493cb.json`) |
| EAS build | `5c3493cb-ae5f-4065-ad61-3605a9887bd2` production / store |
| EAS `gitCommitHash` | `f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604` |
| package | `com.umtuba.app` |
| versionName | `1.0.0` |
| versionCode | **6** (source `app.config.ts`; EAS JSON; AAB proto manifest `versionCode` string `"6"` / compiled `0x06`) |
| minSdk / targetSdk | 24 / 36 (AAB proto manifest) |

AAB is the v6 binary of that SHA. Managed Expo workflow: no checked-in `android/` tree / source `AndroidManifest.xml`.

## Method

`bundletool-all-1.18.1.jar` is present under `docs/ops/closeout/android-device-toolchain/`. **Java is not on PATH** on this machine, so `bundletool dump manifest` was not run.

Merged manifest was taken from the shipping AAB (what Play sees): unzip `base/manifest/AndroidManifest.xml` (aapt2 proto, 35591 bytes) and extract printable strings / attribute values. Bundled libraries from `BUNDLE-METADATA/com.android.tools.build.libraries/dependencies.pb`. DEX ASCII+UTF-16 needle scan of all 7 `classes*.dex` files.

## 1) Merged manifest — `AD_ID` permission

`com.google.android.gms.permission.AD_ID` is **absent** from the AAB merged proto manifest.

`uses-permission` names present (complete):

- `android.permission.CAMERA`
- `android.permission.INTERNET`
- `android.permission.POST_NOTIFICATIONS`
- `android.permission.READ_EXTERNAL_STORAGE`
- `android.permission.READ_MEDIA_AUDIO`
- `android.permission.READ_MEDIA_IMAGES`
- `android.permission.READ_MEDIA_VIDEO`
- `android.permission.READ_MEDIA_VISUAL_USER_SELECTED`
- `android.permission.RECORD_AUDIO`
- `android.permission.SYSTEM_ALERT_WINDOW`
- `android.permission.VIBRATE`
- `android.permission.WRITE_EXTERNAL_STORAGE`
- `android.permission.ACCESS_COARSE_LOCATION`
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.ACCESS_WIFI_STATE`
- `android.permission.USE_BIOMETRIC`
- `android.permission.USE_FINGERPRINT`
- `android.permission.RECEIVE_BOOT_COMPLETED`
- `android.permission.WAKE_LOCK`
- `com.google.android.c2dm.permission.RECEIVE`
- `com.umtuba.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
- `com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE`
- launcher badge permissions (Samsung / HTC / Sony / Huawei / Oppo / etc.) from `expo-notifications`

`BIND_GET_INSTALL_REFERRER_SERVICE` is Play **Install Referrer**, not Advertising ID. It does not change this declaration.

Source `app.config.ts` `android.permissions` lists camera / audio / media / storage / notifications only. No `AD_ID`.

## 2) DEX / SDK advertising-ID use

Needles **not found** in any DEX or the proto manifest:

- `com.google.android.gms.permission.AD_ID`
- `AdvertisingIdClient`
- `AdvertisingId` / `advertisingId` / `advertising_id`
- `getAdvertisingIdInfo`
- `ads-identifier`
- `play-services-ads`
- `com.google.android.gms.ads`
- `google_analytics_adid`
- `FirebaseAnalytics`
- `AdMob` / `mobileads`
- `AppsFlyer` / `com.adjust`

Two ASCII substring hits for `AD_ID` in `classes4.dex` are **false positives**: `ELEMENT_STATE_READ_ID` and `STATE_READ_ID3_METADATA` (media parser enums).

## 3) Bundled libraries (AAB `dependencies.pb`) — ads / analytics / attribution

**Not present:** `play-services-ads`, `play-services-ads-identifier`, `firebase-analytics`, `firebase-measurement` (implementation), AdMob, Adjust, AppsFlyer, Facebook Ads / Facebook Android SDK.

**Present (not advertising-ID readers):**

- `firebase-messaging`, `firebase-installations`, `firebase-datatransport`, `firebase-common`, `play-services-cloud-messaging` — Expo push / FCM
- `firebase-measurement-connector` — FCM interop **stub** only; Firebase Analytics is not bundled; DEX has no `AdvertisingIdClient`
- `play-services-mlkit-barcode-scanning` / `play-services-code-scanner` — `expo-camera` / ML Kit
- `play-services-base` / `basement` / `tasks` / `stats`
- `com.android.installreferrer` — install referrer, not GAID
- `com.facebook.react` / `fresco` / `hermes` / `soloader` / `fbjni` — React Native internals, not Facebook Ads SDK
- Expo modules: camera, notifications, video, image-picker, secure-store, splash, etc.
- MapLibre

`package.json` / lockfile: no AdMob, no `expo-ads-*`, no `@react-native-firebase`, no Adjust / AppsFlyer / Facebook SDK / Google Mobile Ads. Expo plugins: `expo-router`, `expo-splash-screen`, `expo-camera`, `expo-image-picker`, `expo-notifications`, `expo-secure-store`, `expo-video`, `@maplibre/maplibre-react-native`. Expo / Play Services did **not** inject `AD_ID` in this v6 merge.

## EVIDENCE

```
EVIDENCE =
- Worktree HEAD == f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604; app.config.ts android.versionCode = 6; no android/ prebuild tree.
- AAB 5c3493cb SHA-256 17775D73434A16243496EEDCAB724C9960106DB73BF89134AB9B7CF00E652E67; EAS gitCommitHash == same SHA; EAS versionCode = 6.
- AAB proto manifest: package com.umtuba.app; versionName 1.0.0; versionCode 6; targetSdk 36.
- Merged uses-permission list has no com.google.android.gms.permission.AD_ID.
- DEX+manifest: no AdvertisingIdClient / ads-identifier / play-services-ads / FirebaseAnalytics / AdMob / Adjust / AppsFlyer.
- dependencies.pb: FCM + ML Kit + installreferrer + RN/Expo/MapLibre only; no ads-identifier and no Firebase Analytics implementation.
- Expo 57 / Play Services / FCM did not inject AD_ID into this shipping merge.
```
