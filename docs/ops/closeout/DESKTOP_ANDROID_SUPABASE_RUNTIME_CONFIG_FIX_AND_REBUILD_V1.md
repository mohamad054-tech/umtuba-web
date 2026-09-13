# DESKTOP_ANDROID_SUPABASE_RUNTIME_CONFIG_FIX_AND_REBUILD_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** COMMERCE_PRIMARY / ANDROID_RELEASE_OPERATOR  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** INSPECT_FIX_BUILD_REPORT  
**DATE:** 2026-08-13  
**MOBILE PROJECT:** `C:\Users\1\Desktop\umtuba\umtuba-mobile`  
**WEB WORKSPACE:** `C:\Users\1\Desktop\umtuba\umtuba-web`

## Observed failure

| Gate | Result |
|------|--------|
| GOOGLE_PLAY_INSTALL | PASS (already installed from Internal Testing) |
| APP_LAUNCH | PASS |
| RUNTIME_CONFIGURATION | FAIL — screen "Configuration needed" / copy `.env.example` and set public Supabase URL + publishable key |

Tester enrollment and Play app identity were not reopened.

## Root cause

The Android app validates `process.env.EXPO_PUBLIC_SUPABASE_URL` and `process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `src/lib/env.ts`. Metro inlines `EXPO_PUBLIC_*` at **EAS cloud bundle time**. Local `umtuba-mobile/.env` is gitignored and was **not** present on the previous production build (`86c0d773`, versionCode 2). EAS production environment had **zero** variables. `eas.json` production profile also did not set `"environment": "production"`, so even later EAS env would not have been attached.

`getEnv()` threw → `AuthContext` `configError` → `_layout.tsx` "Configuration needed".

This is the standard Expo pitfall: a local `.env` does not bake into EAS cloud builds unless the vars are in EAS env, `eas.json` `env`, or `app.config` extra.

## Authoritative public config

Compared without printing secrets:

| Source | URL host | Publishable key |
|--------|----------|-----------------|
| `umtuba-mobile/.env` | `tgucwnjwoyeqoxqaxmew.supabase.co` | `sb_publishable_...<redacted>` (len 46) |
| `umtuba-web/.env.local` `NEXT_PUBLIC_*` | same host | exact key match |

Web `.env.local` also contains `SUPABASE_SERVICE_ROLE_KEY` (name only confirmed). **Not** copied to mobile, EAS, or reports.

## Fix

1. `eas.json` `build.production.environment = "production"`.
2. Created EAS project env on `production`:
   - `EXPO_PUBLIC_SUPABASE_URL` — plaintext (public host)
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — sensitive
3. `app.config.ts` `android.versionCode` 1 → 3 (local hint). EAS remote `appVersionSource` incremented **2 → 3**.
4. `eas.json` `submit.production.android.track = "internal"` so a later submit cannot default off Internal Testing.
5. One-shot create script deleted after use (no secrets in repo).

No env-loading redesign. Local `.env` still drives `expo start`. `.env.example` still sanitized. No service-role in client path.

## Validation

| Check | Result |
|-------|--------|
| EXPO_CONFIG_LOAD | PASS |
| PACKAGE_ID | `com.umtuba.app` |
| SUPABASE_PUBLIC_URL_RESOLVES | YES |
| SUPABASE_PUBLIC_CLIENT_KEY_RESOLVES | YES (`sb_publishable_...<redacted>`) |
| SERVICE_ROLE_EXPOSED | NO |
| RUNTIME_CONFIGURATION_GATE | PASS (local `.env` + EAS env names present) |
| `npx tsc --noEmit` | PASS |
| `src/lib/env.test.ts` | 4/4 PASS |
| Full vitest | 366 pass / 1 pre-existing locale fail in `wallet/format.test.ts` |
| `git diff --check` | PASS |
| EAS build loaded env | YES — CLI: `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, EXPO_PUBLIC_SUPABASE_URL` |

## Version

| Field | Old | New |
|-------|-----|-----|
| VERSION_NAME | 1.0.0 | 1.0.0 |
| VERSION_CODE (EAS remote / last Play AAB) | 2 | 3 |

Inspected via `eas build:version:get` (Android versionCode 2) and last production build `86c0d773` `appBuildVersion: 2`. Did not guess.

## Build

| Field | Value |
|-------|--------|
| AAB_BUILD_EXECUTED | YES |
| AAB_BUILD_RESULT | PASS |
| Command | `npx eas-cli build --platform android --profile production --non-interactive` |
| BUILD_ID | `26a60f53-5658-4182-bca4-c0424928b015` |
| BUILD_URL | https://expo.dev/accounts/umtuba/projects/umtuba-mobile/builds/26a60f53-5658-4182-bca4-c0424928b015 |
| Profile | production |
| Distribution | STORE |
| PACKAGE_ID | com.umtuba.app |
| versionName | 1.0.0 |
| versionCode | 3 |
| SIGNING_CREDENTIALS_CHANGED | NO |
| Keystore | existing remote `Build Credentials p6De1DDtE_` |
| Artifact URL | https://expo.dev/artifacts/eas/FTD5AK_u0eFlbytU6X5Dp2k9_fJPFO7BNIBrDJbqFqY.aab |
| Local AAB | `C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-26a60f53.aab` |
| Size | 102242485 |
| SHA256 | 61DAC1C62D9CCF85FBAD824B853F28DF24EFD7C2F4DDA3ADBCC0B470522ED70A |
| AAB structure | `BundleConfig.pb` + `base/manifest/AndroidManifest.xml` present |

## Google Play

| Field | Value |
|-------|--------|
| GOOGLE_PLAY_UPLOAD_PERFORMED | NO |
| GOOGLE_PLAY_UPLOAD_READY | YES |
| GOOGLE_PLAY_TRACK | NONE (upload not performed; submit profile locked to `internal`) |
| Blocker | `eas submit --non-interactive` → "Google Service Account Keys cannot be set up in --non-interactive mode." |

No new Play app. Package id unchanged. Tester list not touched.

## Next operator action (single step)

Upload versionCode **3** to the **existing** Internal Testing track only.

Option A — EAS (interactive, first-time Google service account):

```powershell
cd C:\Users\1\Desktop\umtuba\umtuba-mobile
npx eas-cli submit --platform android --profile production --id 26a60f53-5658-4182-bca4-c0424928b015
```

Option B — Play Console: upload  
`C:\Users\1\Desktop\umtuba\umtuba-mobile\release-artifacts\umtuba-android-production-26a60f53.aab`  
to Internal testing. Do not promote to closed/open/production.

Then have a tester install **1.0.0 (3)** and confirm the configuration screen is gone.

## Constraints honored

- No git commit / push / force / reset
- No remote Supabase migrations or data changes
- No service-role in the mobile bundle
- No secrets printed
- No Windows Desktop artifact writes
- `_port_extract` untouched
- Existing Android/Play work preserved
