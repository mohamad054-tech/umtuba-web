# PC2_BUILD27_PLAYBACK_REGRESSION_DELTA_V1

Surgical. Report-only. SOURCE_PATCHED=NO. NEXT_IOS_BUILD_AUTHORIZED=NO.

```text
REGRESSION_CONFIRMED = YES
LAST_KNOWN_GOOD_PLAYBACK_BASE = 21ec031 (Build 25 leftover; operator-fast)
REGRESSING_DELTA = ce7d846 vs 34e42cc (nav-only; no player/signed-URL files)
ROOT_CAUSE = EXPOSED_BY_NAV_REMOUNT
FIX = propose only (below)
OLD_PLAYBACK_FIXES_PRESERVED = YES
NESTED_ORIGIN_FIX_PRESERVED = YES_IF_FIX_AS_PROPOSED
PERMANENT_REGRESSION_GATE_ADDED = NO
NEW_AUTHORITATIVE_SHA = none
NEXT_IOS_BUILD_AUTHORIZED = NO
BLOCKERS = Central must land a candidate SHA. No rebuild. No operator re-QA of historical packets.
```

## Diff scope (done; not a Watch-stack audit)

`ce7d846` parent = `34e42cc`. 16 files, +719/−60, **nav only**:

- `app/(tabs)/watch.tsx` — `rememberProfileBackContext` on creator Profile push; `isWatchRootSurface` on root Back
- `src/lib/nav/globalBack.ts` — `shouldTrustHistoryBack` false when stacked Profile + previous=`(tabs)` → `{ replace, /(tabs)/watch }`
- `src/lib/nav/profileBackContext.ts` — new remembered origin
- `components/GlobalBackButton.tsx` — stacked origin Back / swipe / Android
- profile/follow-list href + tests (`watchNestedOriginBack.test.ts` encodes replace-always for previous=`(tabs)`)

`21ec031..ce7d846` on `src/lib/watch`, `src/lib/feed`, `app/(tabs)/watch.tsx`: **watch.tsx only** (+19/−2). No signed-URL / one-player / AVPlayer code in that range.

`34e42cc` (followers + origin Back) is identity/nav between last-good and 27; Build 26 playback was never locked. This packet’s regressing commit is **ce7d846**.

## Why 3–7s (not 12–20s / not 403)

On 34e42cc, `isValidHistoryPrevious("(tabs)")` is **true**, so Watch→Profile→Back **pops**. Watch stays mounted.

`ce7d846` Fold6 lock: `shouldTrustHistoryBack` is **false** for that same previous=`(tabs)` class, then `replace /(tabs)/watch`. That remounts Watch → new `VideoAsset` → 3s/3s/7s/5s to first `currentTime≥0.2`. HTTP 403=0. `Playing=YES` max 1/sec. Old 12–20s post-asset class = NO.

Operator EVERY_PLAYBACK during A×5 matches remount-per-return, not a playback-policy edit.

## FIX (do not apply)

Keep nested-origin: Back from Watch-origin Profile must still land on **originating Watch**, not Home / own Profile / wrong tab.

Change only the **remount**:

1. If nav state shows Watch still mounted under the stacked Profile (`router.push` from Watch), use **history-back / pop**. Do not `replace /(tabs)/watch`.
2. Keep `replace /(tabs)/watch` only when Watch is **not** underneath (wrong focused tab, param loss, Fold6 previous=`(tabs)` **and** focused tab ≠ watch).
3. Do not touch `signedUrlScheduler`, `playerLifecycle`, one-active-player, or 403-avoidance.

Expected: A×5 origin still PASS; return should not mint a new VideoAsset / 3–7s cold start.

## Permanent gate (describe only; not added)

Home already exists: `src/lib/nav/watchNestedOriginBack.test.ts` + `src/lib/watch/playerLifecycleRegressionLock.test.ts`.

Assert (when Central implements):

- Watch-mounted + stacked Profile + origin=watch → `history-back`, **not** replace.
- Watch **not** mounted / focused tab ≠ watch + origin=watch → still `replace /(tabs)/watch`.
- Existing signed-URL / one-active-player / no-overlap locks unchanged.
- Device: after Watch-origin Profile Back, no new VideoAsset **or** asset→first positive **< 3s** (last-good was “fast”; do not accept 3–7s remount as the gate).

## Official fields

```text
REGRESSION_CONFIRMED = YES
LAST_KNOWN_GOOD_PLAYBACK_BASE = 21ec031
REGRESSING_DELTA = ce7d846 shouldTrustHistoryBack=false + replace /(tabs)/watch
ROOT_CAUSE = EXPOSED_BY_NAV_REMOUNT
FIX = pop when Watch still mounted; replace only when Watch not underneath
OLD_PLAYBACK_FIXES_PRESERVED = YES
NESTED_ORIGIN_FIX_PRESERVED = YES_IF_FIX_AS_PROPOSED
PERMANENT_REGRESSION_GATE_ADDED = NO
NEW_AUTHORITATIVE_SHA = none
NEXT_IOS_BUILD_AUTHORIZED = NO
SOURCE_PATCHED = NO
ADD_FOR_REVIEW = NO
APP_STORE_PRODUCTION = NO
BLOCKERS = no candidate SHA; no rebuild authorized
```
