# DESKTOP_ANDROID_EXPO_APP_CONFIG_COMMONJS_RECOVERY_V1

**Project:** `C:\Users\1\Desktop\umtuba\umtuba-mobile`  
**Mode:** FIX CONFIG LOAD ONLY  
**Date:** 2026-08-12  
**EAS auth:** verified prior (whoami PASS); not re-printed here  

## Summary

`npx eas-cli credentials -p android` failed with `Error reading Expo config at app.config.ts: Cannot read properties of undefined (reading 'CommonJS')` because project dependencies were not installed (`node_modules` absent). Smallest fix: `npm ci` from existing lockfile. No `app.config` conversion, no TypeScript pin change, no Expo/RN/Node upgrade, no credentials/keystore changes.

## Pre-fix evidence

| Check | Result |
|--------|--------|
| Node | v24.8.0 |
| npm | 11.6.0 |
| Expo (CLI after install) | 57.0.14 / SDK 57 |
| package.json expo | `~57.0.7` |
| TypeScript (package.json / installed) | `~6.0.3` / 6.0.3 |
| EAS CLI | eas-cli/21.8.0 |
| Lockfile | YES (`package-lock.json`) |
| `node_modules` before fix | **NO** |
| `type:module` in package.json | absent |
| Config file | `app.config.ts` only (no `app.json` / `app.config.js`) |
| `app.config.ts` imports | `import type { ExpoConfig } from "expo/config"` + default export |
| PACKAGE_ID / version / versionCode in source | `com.umtuba.app` / `1.0.0` / `1` (unchanged) |

## Root cause

Missing installed dependencies (`node_modules`). Expo/EAS evaluate `app.config.ts` via local toolchain; without install, config resolution hit the CommonJS/`ModuleKind` path failure. After lockfile-faithful install, the same `app.config.ts` and TypeScript 6.0.3 load successfully—no config rewrite required.

## Fix executed

1. `npm ci` in `umtuba-mobile` (713 packages; lockfile unchanged).
2. No edits to `app.config.ts`, `package.json`, or version/package identity.
3. No signing credential / keystore / AAB / Play upload actions.

## Validation

| Check | Result |
|--------|--------|
| `npx expo config --type public` | PASS (config object printed; env load noted; no CommonJS crash) |
| android.package | `com.umtuba.app` |
| version | `1.0.0` |
| android.versionCode | `1` |
| Secrets in report/output | Not printed/committed (EAS projectId exists in public config as already present; no `.env` values recorded here) |
| `npx eas-cli credentials -p android` | Past config load: prompt `Which build profile do you want to configure?` then failed only because stdin non-interactive (`Input is required, but stdin is not readable`). **No CommonJS crash.** Stopped; no keystore generate/replace/upload. |

## Metrics (exact return block)

```
ROOT_CAUSE = Missing node_modules; Expo/EAS app.config.ts evaluation failed with CommonJS ModuleKind crash until npm ci from lockfile
FIX_EXECUTED = YES
FILES_CHANGED = []
DEPENDENCIES_CHANGED = [node_modules populated via npm ci; package.json and package-lock.json unchanged]
EXPO_CONFIG_LOAD = PASS
PACKAGE_ID = com.umtuba.app
VERSION_NAME = 1.0.0
VERSION_CODE = 1
EAS_CREDENTIALS_INTERFACE_REACHED = YES
SIGNING_CREDENTIALS_CHANGED = NO
AAB_BUILD_EXECUTED = NO
GOOGLE_PLAY_UPLOAD_PERFORMED = NO
READY_FOR_SIGNING_INSPECTION = YES
```

## Open / next

- Interactive `eas credentials -p android` can proceed for signing **inspection only** (do not generate/replace keystore unless a later task authorizes it).
- Latent risk: TypeScript 6.0.3 is ahead of typical Expo pins; not required to change for this recovery (config load PASS). Align only if a later Expo doctor/build flags it.

## Constraints honored

- No AAB build  
- No signing credential/keystore modify/generate/upload  
- No Google Play upload  
- PACKAGE_ID / version / versionCode preserved  
- No app functionality changes  
- No blind Expo/RN/Node or broad dependency upgrades  
- No secrets printed/committed  
- `_port_extract` untouched  
