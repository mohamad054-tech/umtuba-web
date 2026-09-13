# PC2 iOS Build 4 — Watch playback critical regression

DATE = 2026-08-16  
DEVICE = PC2  
TASK = BUILD 4 WATCH PLAYBACK CRITICAL REGRESSION  
PRIORITY = MAXIMUM  
OPERATOR = Physical iPhone 13 / TestFlight Build 4  
RELEASE_BLOCKER = YES

```text
PC2 REPORT
SOURCE_DEVICE = PC2
TASK_ID = PC2_IOS_BUILD4_WATCH_PLAYBACK_REGRESSION_V1
MODE = INVESTIGATE / NO_SPECULATIVE_CLIENT_WORKAROUND
BUILD3_SHA = 4eede0b4786a77a9cd9d642b792a5642341542c2
BUILD4_BINARY_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
BUILD5_SOURCE_HEAD = e3457fc3cf3ea5eac034eb55f8a8b7a33845d23b
REMOTE_REF = origin/pc2/a2-open-watch-published-post-v1
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a2-open-watch-v1
DIVERGED_CHECKOUT_77e9e28_USED = NO
DIVERGED_CHECKOUT_RESET = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_WIP_TOUCHED = NO
BUILD5_BUILT = NO
BUILD4_REUPLOADED = NO
APP_REVIEW_SUBMITTED = NO
PR_CREATED = NO
ALPHA_02_TOUCHED = NO
ANDROID_PR_BRANCH_TOUCHED = NO
DEVICE_PASS_INVENTED = NO
SECRET_VALUES_PRINTED = NO
```

## Return fields

```text
BUILD3_PLAYBACK_HISTORICAL = PASS
BUILD4_PLAYBACK = FAIL
PLAYBACK_SCOPE = MULTIPLE / ALL TESTED VIDEOS
ROOT_CAUSE = UNCONFIRMED_IOS_AVPLAYER_ITEM_LOAD — expo-video PlayerItemLoadException wrapping AVPlayer/NSURL "resource unavailable" (typically NSURLErrorDomain -1008). Not explained by a Build 3→4 JS playback/media-URL/ATS/expo-video delta. Not explained by a production storage outage on probed signed objects. Operator 2026-08-16: same UMTUBA videos PLAY on Android and FAIL on iPhone 13 TestFlight Build 4 — backend-outage class is now even less likely. Still unconfirmed without iOS device OS logs.
BACKEND_RUNTIME_STATE = UP — https://umtuba.com/watch HTTP 200 with video cards; storage host reachable; signed post-videos HEAD 200 + Range 206; Accept-Ranges bytes; magic ftyp qt/mp42; no webm paths in the live HTML set. ANDROID_PLAYBACK = PASS (operator, same videos). IOS_SPECIFIC = YES (contrast only; not a proven native root cause).
SOURCE_REGRESSION = NO — merge-base of Build 3 and Build 4 is 09e94f8; Watch URL mint, expo-video source, env, supabase client, and ATS plist are identical. Build 4 Watch deltas are Open Watch focus prepend, Like/Save alerts, and rail layout only.
FIX_APPLIED = NO
FIX_COMMIT = NONE
TESTS = PASS — vitest watchFeed.map + playbackPolicy + createJourney + railLayout = 4 files / 50 tests
TYPECHECK = PASS — npx tsc --noEmit
BUILD5_SOURCE_UPDATED = NO
BUILD5_REQUIRED = YES — pre-existing accepted source (Open Watch, Messages, login/Profile, Follow, Save, location plist, Back arrow). Current Build 5 tip does NOT contain a playback source fix. Do not treat a new binary as a playback repair until device retest.
BLOCKERS = BUILD4_WATCH_PLAYBACK_FAIL; ROOT_CAUSE_UNCONFIRMED_WITHOUT_DEVICE_OS_LOG; IOS_DEVICE_LOG_ACCESS_NO; DO_NOT_SHIP; DO_NOT_BUILD5_THIS_SESSION; DO_NOT_REUPLOAD_BUILD4; DO_NOT_SUBMIT_APP_REVIEW
ANDROID_PLAYBACK = PASS
IOS_SPECIFIC = YES
```

## Classification

| Class | Verdict |
| --- | --- |
| 1. Build 4 binary regression | **NOT CONFIRMED in source.** JS playback path matches Build 3. Native/EAS-env uniqueness of the Build 4 IPA is unproven without device OS logs. |
| 2. Backend/runtime production issue | **NOT AN OUTAGE — even less likely after Android PASS.** Live Watch and signed `post-videos` objects respond. The same UMTUBA videos play on Android now. Private bucket still requires a token (unsigned/public HEAD = 400). Do not change storage globally. |
| 3. Asset-specific issue | **NO** as the operator class. All tested iPhone videos fail. Android plays those same videos. Probed live objects are mp4/mov with byte ranges and valid ftyp. |
| 4. Auth/session issue | **NOT PRIMARY.** The on-screen string is the player-item overlay, which mounts only after a non-empty `video.src`. Unsigned objects are 400 by design; they are not served as public URLs. |
| 5. iOS-specific player/runtime | **IN SCOPE, UNCONFIRMED.** Android ExoPlayer PASS vs iOS AVPlayer FAIL on the same signed URLs. Needs device syslog (ATS/TLS, Range, MIME, redirect, NSURL). See `PC2_IOS_BUILD4_PLAYBACK_DEVICE_LOG_REPORT.md`. |

Do **not** invent a device PASS. Build 3 historical PASS is prior operator evidence only. Build 3 was **not** retested on this session against current production.

---

## 1. Device evidence (authoritative; do not overwrite)

Physical iPhone 13 / TestFlight **1.0.0 (4)** / operator:

```text
BUILD4_WATCH_PLAYBACK = FAIL
ERROR = Failed to load the player item: resource unavailable
SCOPE = MULTIPLE / ALL TESTED VIDEOS
ANDROID_PLAYBACK = PASS
IOS_SPECIFIC = YES
RELEASE_BLOCKER = YES
```

Build 3 historical (same device, prior session, `PC2_A2_V3_IPHONE_QA.md`):

```text
WATCH_PLAYBACK = PASS
VIDEO = PASS
AUDIO = PASS
```

---

## 2. Exact error origin

The string is **not** an UMTUBA copy string. It is expo-video wrapping AVPlayer.

`node_modules/expo-video/ios/VideoExceptions.swift`:

```swift
internal final class PlayerItemLoadException: GenericException<String?> {
  override var reason: String {
    "Failed to load the player item: \(param ?? defaultCause)"
  }
}
```

`node_modules/expo-video/ios/VideoPlayerObserver.swift` sets that exception from `AVPlayerItem.error` / transport error `localizedDescription` when item status is `.error`.

Industry mapping for the suffix **resource unavailable** is **NSURLErrorDomain -1008** (AVPlayer failed to fetch the media resource). Common underlying causes elsewhere: missing byte-range support, HTTP 4xx on the object, WebM, `http://` + ATS, or a bad/expired URL. Those hard blockers were **not** observed on the production objects probed this session.

Watch surfaces the native message via `sanitizePlaybackError` → `getErrorMessage` (no rewrite).

---

## 3. SHA compare (playback path)

Worktree `umtuba-mobile-pc2-a2-open-watch-v1` after `git fetch --prune`:

```text
HEAD = e3457fc3cf3ea5eac034eb55f8a8b7a33845d23b
BRANCH = pc2/a2-open-watch-published-post-v1
CLEAN = YES
4eede0b ancestor of HEAD = NO
edc898f ancestor of HEAD = YES
merge-base(4eede0b, edc898f) = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
```

Main checkout `umtuba-mobile` left at `77e9e28` on `pc2/eas-preview-config-v1`. Not reset, merged, or used as SoT.

### Build 3 unique commits (`09e94f8..4eede0b`)

```text
4eede0b test(ios): queue list_my_blocked_users mock before block RPC fail path
5e7c857 test(ios): extend UGC client contract coverage before first binary
6f05636 feat(ios): lock EAS preview profile Team ID for first internal device build
```

**Zero** diff in `WatchVideoCard.tsx`, `watch.tsx`, `watchFeed.ts`, `src/lib/watch/`, `src/contracts/video.ts`, `app.config.ts`, `package.json`.

### Build 4 unique commits (`4eede0b..edc898f`)

```text
edc898f fix(ios): reject messenger callbacks after subscribed
652ef7f fix(ios): drop unused CAMERA and RECORD_AUDIO permissions
88978a5 fix(ios): surface save errors and compact Watch rail
9202978 fix(ios): honor /profile?u= and add Following control
42bbd28 fix(ios): route successful login to the Profile tab
73e4723 fix(ios): do not add messenger realtime callbacks after subscribe
e87668e fix(ios): open Watch on the published post via existing ?post= focus
```

Playback-related file diff **only**:

| File | Build 4 delta vs Build 3 |
| --- | --- |
| `src/lib/feed/watchFeed.ts` | `promoteFocusedWatchRow` so `?post=` is index 0. **Same** `createSignedUrl` / `resolvePlaybackUrl`. |
| `app/(tabs)/watch.tsx` | `Alert.alert` on Like/Save failure. **No** src/player change. |
| `components/WatchVideoCard.tsx` | Rail/volume layout constants. **Same** `useVideoPlayer(src)` / `replaceAsync`. |
| `app.config.ts` | Android `CAMERA` / `RECORD_AUDIO` blocked. **No** iOS ATS / network policy change. |
| `eas.json` | Submit `appleTeamId` removed. Not a player change. |
| `package.json` / lockfile | **Unchanged.** `expo-video` `^57.0.1` on Build 3, Build 4, and HEAD. |
| `src/contracts/video.ts` | **Unchanged.** Bucket `post-videos`, TTL 15 minutes. |
| `src/lib/env.ts` / `src/lib/supabase/client.ts` | **Unchanged.** |
| `Info.plist` / `ios/` | **Absent** (Expo managed) at all three SHAs. |

### Build 5 source after Build 4 (`edc898f..HEAD`)

Preserved; **not** edited this session:

```text
e3457fc fix(ios): show a global Back arrow on every user-facing screen
1ad43fe docs(ios): record Build 5 save verify and strengthen SHA
9c1744a test(ios): isolate Watch save from side effects and cover persistence
1317f8b docs(ios): record Build 4 save-fail fix SHA
831936c fix(ios): persist Watch saves through post_saves RLS
6733cd5 fix(ios): declare NSLocationWhenInUseUsageDescription for MapLibre
```

`WatchVideoCard.tsx` / `watchFeed.ts` / `video.ts` vs Build 4: **no diff**. `app.config.ts` only adds the location purpose string.

---

## 4. Media URL / player contract (unchanged)

Both Build 3 and Build 4:

1. Query `posts` where `post_type=video`, `media_status=ready`, `video_path` not null.
2. Mint `supabase.storage.from("post-videos").createSignedUrl(path, 15*60)`.
3. Skip the row if signing fails (no empty-src card).
4. Pass the signed HTTPS string into `useVideoPlayer(src)` with **no** custom headers and **no** `contentType` override.
5. Retry calls `refreshPlaybackUrl` → new signed URL → `player.replaceAsync`.

No AVPlayer header injection. No public-bucket fallback. No `http://` playback path except a legacy `video_url` that already starts with `http://` or `https://` (feed prefers `video_path`).

iOS ATS: no `NSAppTransportSecurity` override in `app.config.ts` on Build 3, Build 4, or HEAD. Production host is HTTPS `*.supabase.co`.

---

## 5. Production probe (tokens not printed)

Live site `https://umtuba.com/watch`:

```text
WEB_WATCH_PAGE_LOADS = YES
VIDEO_CARDS_PRESENT = YES
STORAGE_HOST = tgucwnjwoyeqoxqaxmew.supabase.co
URL_SCHEME = https
SIGNED_OR_PUBLIC = SIGNED /storage/v1/object/sign/post-videos/...
EXTENSIONS_SEEN = mp4, mov (no webm object paths in the HTML/RSC set)
```

Three distinct signed objects (token redacted):

| Object | HEAD | Content-Type | Accept-Ranges | Range GET | Magic |
| --- | --- | --- | --- | --- | --- |
| `.../u-1786809936999-xx06kjm1.mov` | 200 | video/quicktime | bytes | 206 | ftyp `qt` |
| `.../<uuid>.mp4` | 200 | video/mp4 | bytes | 206 | ftyp `mp42` |
| `.../u-1786616106914-lqss8cll.mp4` | 200 | video/mp4 | bytes | 206 | ftyp `mp42` |

Tokenless checks (expected for a private bucket):

```text
HEAD /storage/v1/object/public/post-videos/ = 400
HEAD signed path without token = 400
GET /storage/v1/status = 200
GET /rest/v1/ = 401
```

Storage RLS in repo (not re-applied this session): bucket `post-videos` is private; SELECT for published ready posts is allowed so the client can mint short-lived signed URLs. That matches the live signed-URL pattern. **No client workaround that opens the bucket or bypasses signing was added.**

Soft risks that do **not** by themselves explain “all tested videos fail immediately”:

- Signed TTL is 15 minutes. Retry already remints. Immediate fail on every card is not the TTL-expiry pattern.
- One live object is `.mov` / `video/quicktime`. iPhone 13 historically played an operator-uploaded QuickTime clip on Build 3.

---

## 6. Why no source fix

User rule: if the cause is production storage/CDN, do not invent a client workaround that weakens security. If no confirmed source defect, do not patch.

Rejected as unjustified on current evidence:

- Making `post-videos` public
- Sending Supabase session headers into AVPlayer
- Disabling ATS / allowing arbitrary loads
- Downloading every clip through a privileged path
- Speculative `{ uri, contentType }` or file-system cache rewrite (same JS already PASSed on Build 3)

A Build 5 IPA from current HEAD would still ship the **same** playback JS as Build 3/4. It may still FAIL on device. It remains required for **other** accepted fixes, not as a claimed playback repair.

---

## 7. Tests / typecheck

Worktree clean at `e3457fc`. No files changed this session.

```text
npx vitest run src/lib/feed/watchFeed.map.test.ts src/lib/watch/playbackPolicy.test.ts src/lib/video/createJourney.test.ts src/lib/watch/railLayout.test.ts
= 4 files / 50 tests PASS

npx tsc --noEmit
= PASS
```

No commit. No push.

---

## 8. Preserved Build 5 work

```text
OPEN_WATCH = preserved (e87668e)
MESSAGES = preserved (73e4723 / edc898f)
LOGIN_PROFILE = preserved (42bbd28)
OTHER_USER_PROFILE_FOLLOW = preserved (9202978)
SAVE = preserved (831936c / 9c1744a)
PERMISSION_CLEANUP = preserved (652ef7f)
LOCATION_PLIST = preserved (6733cd5)
GLOBAL_BACK_ARROW = preserved (e3457fc)
```

---

## 9. Open issues / next (Central + operator)

1. **Release blocked** on Build 4 Watch playback FAIL. Do not Submit for Review.
2. **Do not rebuild/re-upload this session.** Central GO still required for Build 5.
3. Operator (if still on Build 4): note whether cards show caption/username under the error (proves feed+sign succeeded); whether Retry changes anything; do not sign out / delete account.
4. Central: compare EAS env for Build 3 vs Build 4 (`EXPO_PUBLIC_SUPABASE_URL` host only — do not paste keys). Collect iPhone Console / sysdiagnose around AVPlayer `-1008` if a playback-specific native cause must be proven.
5. If Build 3 is still installable on a spare slot, a current-production retest would distinguish “production changed after historical PASS” from “Build 4 IPA-only.” Not executed here. Do not fabricate that result.
6. Operator 2026-08-16: Android playback of the same videos is PASS. Device-log capture on PC2 is blocked until Apple Devices / Trust This Computer — see `PC2_IOS_BUILD4_PLAYBACK_DEVICE_LOG_REPORT.md`. Do not treat Android PASS as a confirmed iOS root cause.

```text
IOS_FINAL_RELEASE_BLOCKERS = BUILD4_WATCH_PLAYBACK_FAIL; SAVE_FAIL_ON_BUILD4_BINARY; REMAINING_IPHONE_QA; APP_STORE_METADATA
CENTRAL_ACTION_REQUIRED = YES
```
