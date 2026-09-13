# PC2 iOS Build 4 — ITMS-90683 NSLocationWhenInUseUsageDescription

DATE = 2026-08-15  
DEVICE = PC2  
TASK = BUILD 4 APP STORE CONNECT WARNING — SOURCE ONLY  
PRIORITY = MAXIMUM

## Return block

```text
BUILD4_DELIVERY = SUCCESS
APPLE_WARNING = ITMS-90683
MISSING_KEY = NSLocationWhenInUseUsageDescription
LOCATION_REQUIRED_BY_PRODUCT = NO
LOCATION_REFERENCE_ROOT_CAUSE = @maplibre/maplibre-react-native native MLRNLocationManager (CLLocationManager + requestWhenInUseAuthorization). Secondary: expo-notifications imports CoreLocation for unused UNLocationNotificationTrigger. Not Live. Not expo-location. Not geolib.
FIX_STRATEGY = KEEP MapLibre (World ships). ADD truthful ios.infoPlist NSLocationWhenInUseUsageDescription. Do not add expo-location. Do not invent nearby-users use.
SOURCE_FIX_APPLIED = YES
INFO_PLIST_RESULT = NSLocationWhenInUseUsageDescription present in app.config.ts and in `npx expo config --type public` merged ios.infoPlist. No committed ios/ tree (Expo managed). Always keys not added.
TESTS = PASS (vitest src/lib/ios/appStoreConfig.test.ts — 5 passed)
TYPECHECK = PASS (npx tsc --noEmit)
NEW_BINARY_REQUIRED_TO_REMOVE_WARNING = YES
PROPOSED_NEXT_BUILD_NUMBER = 5
CENTRAL_GO_REQUIRED = YES
BLOCKERS = Warning remains on already-delivered Build 4 until Central GO for Build 5. Did not rebuild / re-upload / submit. Diverged main checkout 77e9e28 left untouched.
```

## Summary

Apple accepted **UMTUBA 1.0.0 build 4** and warned **ITMS-90683**: the binary references location APIs/entitlements but Info.plist lacked `NSLocationWhenInUseUsageDescription`.

Inspected authorized source `edc898fb5b3549ae31d8b05824d9e9840f825bae` on `origin/pc2/a2-open-watch-published-post-v1` in worktree `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a2-open-watch-v1`. Main checkout `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile` at `77e9e28` was not reset, merged, or edited.

No shipping iOS product feature requests GPS. World map display **does** ship and keeps `@maplibre/maplibre-react-native` in the binary. That native module always links `CLLocationManager` and can call `requestWhenInUseAuthorization`. Removing MapLibre would break World. Adding `expo-location` would widen the native surface. The safe source fix is a truthful purpose string in Expo `ios.infoPlist`.

Source fix committed and pushed:

- SHA = `6733cd5dd2a97e3415dbb1ddb76ab6e4d3811045`
- Branch = `pc2/a2-open-watch-published-post-v1`
- Message = `fix(ios): declare NSLocationWhenInUseUsageDescription for MapLibre`

Build 4 was not rebuilt, re-uploaded, or submitted. CAMERA/MIC were not restored.

## 1. Build 4 source / config / dependency graph

Authorized SHA at start: `edc898f` (`fix(ios): reject messenger callbacks after subscribed`).

| Item | Build 4 fact |
| --- | --- |
| `package.json` | No `expo-location`. No `geolib`. No `react-native-maps`. |
| Map SDK | `@maplibre/maplibre-react-native` `^11.3.6` — Expo plugin + World renderer |
| Notifications | `expo-notifications` `~57.0.6` — shipping push; unused location triggers in native types |
| Media | `expo-image-picker` (gallery publish only). No `expo-camera`. |
| Live | iOS tab hidden (`href: null`). Fail-closed. No location APIs. |
| Expo managed | No committed `ios/` / `Info.plist`. `eas.json` production `autoIncrement: true`, `appVersionSource: remote`. Committed `ios.buildNumber` remains `"1"` (EAS remote increment produced Build 4). |
| `app.config.ts` plugins | `expo-router`, `expo-splash-screen`, `expo-image-picker`, `expo-notifications`, `expo-secure-store`, `expo-video`, `@maplibre/maplibre-react-native` |

App-source search (`UserLocation`, `LocationManager`, `getCurrentPosition`, `CLLocation`, `expo-location`, `geolib`, `NSLocation*`): **no product callers**.

World `view_precise_location` exists as a permission id and is **granted: false**. Profile `locationLine` is city/country text, not GPS. Discover World entry is always shown (`shouldShowDiscoverWorldEntry` returns `true`). `MapLibreMapSurface` uses `Map` + `Camera` only — no `UserLocation`, no `trackUserLocation`.

## 2. Why location APIs are present

Apple scans the linked binary, not product UX.

**Primary (ITMS-90683 match):** `@maplibre/maplibre-react-native` iOS native:

- `ios/modules/location/MLRNLocationManager.m` imports `CoreLocation`, allocates `CLLocationManager`, implements `CLLocationManagerDelegate`, and calls `requestWhenInUseAuthorization` in `start` / `requestPermissions`.
- `ios/modules/location/MLRNLocationModule.mm` is a TurboModule (`MLRNLocationModule`).
- `ios/components/user-location/*` ships `UserLocation` native views.
- Expo plugin `withMapLibre.ts` does **not** write a purpose string (Gradle/Podfile only).

**Secondary:** `expo-notifications` iOS `NotificationRecords.swift` `import CoreLocation` to serialize unused `UNLocationNotificationTrigger`. Product push code never creates location triggers. This can also trip a static location-API scan. Removing notifications is not safe (shipping likes/rewards/account push).

**Not the cause:** Live (hidden on iOS, no location). `expo-location` (not a dependency). Camera/mic leftover (already removed in `652ef7f`).

## 3. Does any current shipping iOS feature legitimately use location?

**NO.**

World uses MapLibre to render tiles and city-level pins. Recenter is a default camera, not GPS. Live is not an iOS shipping surface. Notifications do not use geofenced triggers.

Therefore the purpose string must not claim “find nearby users”, check-in, or “show your position on the map.”

## 4. Exact package / native module / config responsible

| Layer | Responsible |
| --- | --- |
| Product config (Build 4) | `app.config.ts` `ios.infoPlist` lacked `NSLocationWhenInUseUsageDescription` |
| Native module | `@maplibre/maplibre-react-native` `MLRNLocationManager` / `MLRNLocationModule` |
| Plugin | `"@maplibre/maplibre-react-native"` in `plugins` (required for World) |
| Secondary native | `expo-notifications` CoreLocation import |

## 5–8. Fix decision

Prefer-remove was evaluated and **rejected as unsafe**:

- Removing MapLibre / the plugin would break shipping World (`app/world.tsx`, Discover entry, renderer imports).
- There is no MapLibre plugin flag to strip location.
- Forking the native SDK is out of scope and not safe for this warning-only source pass.
- Live is already disabled on iOS; location is not a Live leftover.

**Applied:** add `NSLocationWhenInUseUsageDescription` via `ios.infoPlist` (not `expo-location` plugin).

Purpose string (actual use: none; SDK reference: MapLibre):

```text
UMTUBA includes a world map. The bundled map library references location services. UMTUBA does not use your location.
```

Always-location keys were not added. CAMERA/MIC strings were not restored.

## 9. Generated iOS config verification

- Project pattern = Expo managed. Did **not** commit a prebuild `ios/` tree.
- `npx expo config --type public` merged `ios.infoPlist.NSLocationWhenInUseUsageDescription` to the string above.
- `NSLocationAlwaysUsageDescription` / `NSLocationAlwaysAndWhenInUseUsageDescription` absent.

## Exact files changed (mobile)

| File | Change |
| --- | --- |
| `app.config.ts` | `ios.infoPlist.NSLocationWhenInUseUsageDescription` + comment |
| `src/lib/ios/appStoreConfig.test.ts` | Assert truthful string, MapLibre plugin present, no `expo-location`, no Always keys |

Web: this report only. `CURSOR_REPORT.md` not overwritten. Store WIP not touched.

## Migrations created

None.

## Security review

- No secrets, keys, or `.env` reads.
- Purpose string does not invent a location product.
- Always-location not declared.
- `expo-location` not added.
- CAMERA/MIC not restored.
- Diverged mobile checkout `77e9e28` not modified.

## Tests

```text
npx vitest run src/lib/ios/appStoreConfig.test.ts
Test Files  1 passed (1)
Tests  5 passed (5)
```

## TypeScript

```text
npx tsc --noEmit
PASS (exit 0)
```

## Build

Not run. Task forbids Build 5 / rebuild / eas submit.

## git diff --check

PASS (no whitespace errors) on the source fix.

## git status --short (mobile worktree after push)

```text
## pc2/a2-open-watch-published-post-v1...origin/pc2/a2-open-watch-published-post-v1
```

Clean. Ahead/behind none after `git push origin pc2/a2-open-watch-published-post-v1` (`edc898f..6733cd5`).

## Open issues

1. **Build 4 still has the warning.** Info.plist is baked into the uploaded binary. Source fix does not change Build 4.
2. **Build 5 + Central GO required** to clear ITMS-90683. Do not rebuild until GO.
3. App Store Privacy Nutrition / review answers must stay consistent: product does not use location; MapLibre still links the API.
4. Main checkout `77e9e28` remains diverged history-only. Do not reset/merge.
5. Observed in public Expo config (out of this task): Android merged permissions still listed `RECORD_AUDIO` despite `blockedPermissions`. Not investigated further.

## Forbidden actions (honored)

- No Build 4 rebuild / re-upload
- No Build 5
- No App Store Review submit
- No CAMERA/MIC restore
- No product broaden
- No invented nearby-users location use
- No force push
- No `CURSOR_REPORT.md` overwrite
- No Store WIP edits
