# PC2 iOS Build 4 — playback device log capture

DATE = 2026-08-16  
DEVICE = PC2  
TASK = `PC2_IOS_BUILD4_PLAYBACK_DEVICE_LOG_CAPTURE_V1`  
PRIORITY = MAXIMUM  
OPERATOR = Physical iPhone 13 / TestFlight Build 4  
BUILD5_BLOCKED = YES  
CURSOR_REPORT_OVERWRITTEN = NO

```text
PC2 REPORT
SOURCE_DEVICE = PC2
TASK_ID = PC2_IOS_BUILD4_PLAYBACK_DEVICE_LOG_CAPTURE_V1
MODE = DEVICE_LOG_CAPTURE / NO_SPECULATIVE_FIX
BUILD4_BINARY = TestFlight 1.0.0 (4)
BUILD5_BUILT = NO
BUILD4_REUPLOADED = NO
APP_REVIEW_SUBMITTED = NO
PR_CREATED = NO
ALPHA_02_TOUCHED = NO
SOURCE_FIX_APPLIED = NO
BACKEND_CHANGED = NO
EXPO_VIDEO_DOWNGRADED = NO
SECRET_VALUES_PRINTED = NO
APPLE_LOGIN_RETRIED = NO
EAS_DEVICE_CREATE_RETRIED = NO
```

## Return fields

```text
IOS_DEVICE_LOG_ACCESS = YES — lockdown pairing present; usbmux ListDevices shows USB SerialNumber 00008110-000A10123AF9801E
LOG_CAPTURE_METHOD = com.apple.syslog_relay — still running (pid 14140). Live file %LOCALAPPDATA%\Temp\pc2-ios-syslog\build4-syslog.capture.log
PLAYBACK_CURRENT_STATE = WORKING — operator: previously failing Watch videos now play on same iPhone 13 / TestFlight Build 4
FAILURE_REPRODUCIBLE = NO — not observed under this capture
INTERMITTENT = YES — prior FAIL (on-screen) + current SUCCESS (operator + OS log). Not a permanent fix.
SUCCESS_SESSION_LOGS = YES — 2026-08-16 01:34:29–01:35:46+ (PC local) com.umtuba.app pid 2246
PLAYBACK_REPRODUCED_WITH_LOGGING = NO — failure session is NOT in this capture (capture started 01:30 after Trust/reconnect; fail was earlier)
AVPLAYER_ERRORS = NONE matching prior failure. No "resource unavailable". No AVPlayerItemStatusFailed. NSURLErrorDomain Code=-999 only (cancelled; 21 hits; URLs <private>)
NETWORK_ERRORS = NONE of -1008 / -1001 / -1009. HTTP status codes not present in syslog (privacy). FigHTTP created many NSURLSessionDataTask. No post-videos host printed.
AVPLAYER_ERROR = UNCONFIRMED_IN_OS_LOG for the historical fail — on-screen only: "Failed to load the player item: resource unavailable"
NSURLError = SUCCESS_SESSION_-999_CANCEL_ONLY
HTTP_STATUS = UNCONFIRMED_ON_DEVICE — not in syslog; prior server probe HEAD 200 / Range 206 still stands
ATS_TLS = NO_ATS_BLOCK_LINE_IN_THIS_CAPTURE
MIME_RANGE_FINDING = UNCONFIRMED_ON_DEVICE
DECODER_FINDING = SUCCESS_SESSION_AppleAVD_ACTIVE — videocodecd AppleAVD at 01:34:33 with FigPlayMonitor kfpmStreamLikelyToKeepUp (53) and FigPlayerPlaying YES (pid 2246)
EXPO_VIDEO_NATIVE_ERROR = NOT_SEEN_IN_SUCCESS_SESSION — ExpoVideo.VideoPlayerItem / VideoAsset created (19 New playerItem). Historical PlayerItemLoadException remains source mapping only.
LIKELY_TRIGGER = UNCONFIRMED — strongest correlation in this capture: cold launch of com.umtuba.app pid 2246 at 01:34:29 after jetsam of suspended pid 1984 (01:34:25, domain:jetsam code:17). USB reconnect/Trust (pairing 01:25) and syslog arm (01:30) happened earlier and are not isolated. App restart / reminted signed URL / transient network remain candidates. Not proven.
CONFIRMED_ROOT_CAUSE = UNCONFIRMED
SOURCE_FIX_REQUIRED = NO
BACKEND_FIX_REQUIRED = NO
BUILD5_PLAYBACK_BLOCKER = YES
BUILD5_BLOCKED = YES
ANDROID_PLAYBACK = PASS
IOS_SPECIFIC = YES — historical fail was iOS-only; current success does not erase that
NEXT_EXACT_ACTION = Do not treat as fixed. Do not build Build 5. Keep syslog running. If Watch fails again, note wall-clock time immediately. A failure captured under the same log is required before any source/backend/IPA claim.
```

## Operator update (success during armed capture)

USB reconnect after Trust completed. Pairing present. Syslog was already running. Operator then reported Watch playback **WORKING** on the same iPhone 13 / TestFlight Build 4 (previously failing videos now play). **Do not classify as permanently fixed.** Intermittent until a failure is captured under the same log.

```text
PLAYBACK_CURRENT_STATE = WORKING
FAILURE_REPRODUCIBLE = NO
INTERMITTENT = YES
SUCCESS_SESSION_LOGS = YES
AVPLAYER_ERRORS = NONE_MATCHING_PRIOR_FAIL
NETWORK_ERRORS = NONE_-1008
LIKELY_TRIGGER = UNCONFIRMED (cold launch pid 2246 after jetsam of suspended pid 1984; USB/Trust earlier)
CONFIRMED_ROOT_CAUSE = UNCONFIRMED
SOURCE_FIX_REQUIRED = NO
BUILD5_PLAYBACK_BLOCKER = YES
```

Do **not** retry `eas device:create` or Apple Developer login (prior account lock -20209). Signed URL query strings were not present in syslog (`<private>`); none printed.

---

## 1. What this session checked (resume after USB reconnect)

Read-only on the iPhone. No pair/unpair initiated by this agent. No Apple login. No Build 5. No source or storage change. No sync/restore/backup. PC-side syslog client only.

| Check | Result (2026-08-16 01:30 after reconnect) |
| --- | --- |
| iPhone USB present | **YES** — composite `VID_05AC` `PID_12A8` serial `00008110000A10123AF9801E` |
| MTP / Internal Storage | **YES** — WPD `Apple iPhone` `MI_00` |
| usbmux USB interface | **YES** — `Apple Mobile Device USB Device` `MI_01` |
| Apple Devices / AppleMobileDeviceProcess | **YES** — running; `:27015` Listen |
| Lockdown host BUID | **YES** — `SystemConfiguration.plist` |
| Lockdown device pairing record (`<UDID>.plist`) | **YES** — `00008110-000A10123AF9801E.plist` (2026-08-16 1:25; HostID/certs present; values not printed) |
| usbmux `ListDevices` / `Listen` | **YES** — DeviceID 1, USB, SerialNumber `00008110-000A10123AF9801E` |
| `ideviceinfo` / `idevicesyslog` / `pymobiledevice3` / `cfgutil` | **MISSING** on PATH — not required; Node usbmux/lockdown client used |
| Trust pairing | **PRESENT** |
| Syslog capture | **RUNNING** — `com.apple.syslog_relay` (SSL), live lines writing to temp capture file |
| Xcode / Console.app | **NOT EXPECTED** on Windows |

---

## 2. Best available log method on this PC

Steps 1–4 are done. Capture is armed. Playback reproduction is the remaining operator step.

1. **Apple Devices** — installed and running.
2. **usbmux** — `:27015` up; `ListDevices` now returns the iPhone.
3. **Trust / pairing** — `00008110-000A10123AF9801E.plist` present after USB reconnect.
4. **syslog** — `com.apple.syslog_relay` started 2026-08-16 01:30 (PC local). Process left running (pid 14140).
5. Operator opened TestFlight Build 4 during that capture. Playback **succeeded**. Failure was **not** reproduced under logging.

TestFlight builds do not stream native logs to Metro. URLs in this syslog are `<private>`. No signed query tokens were printed.

---

## 3. Android vs iOS contrast (operator; authoritative)

```text
ANDROID_PLAYBACK = PASS
IOS_BUILD4_PLAYBACK_HISTORICAL = FAIL — on-screen "Failed to load the player item: resource unavailable" (all tested videos; same objects Android PASS)
IOS_BUILD4_PLAYBACK_CURRENT = WORKING — operator, same iPhone 13 / TestFlight Build 4, during armed syslog
INTERMITTENT = YES
SCOPE_HISTORICAL = MULTIPLE / ALL TESTED VIDEOS ON IPHONE
SAME_UMTUBA_VIDEOS = YES (operator)
```

This does **not** prove a client source bug. It does make a **general backend/storage outage even less likely**: the same objects are playable on Android now.

Prior independent evidence (do not overwrite):

| Evidence | Verdict |
| --- | --- |
| iPhone 13 / TestFlight Build 3 Watch (historical, `PC2_A2_V3_IPHONE_QA.md`) | PASS (video + audio) |
| iPhone 13 / TestFlight Build 4 Watch (historical, pre-capture) | FAIL — `Failed to load the player item: resource unavailable` |
| iPhone 13 / TestFlight Build 4 Watch (this capture, 01:34+) | WORKING — operator + OS log (ExpoVideo items, FigPlayerPlaying YES, AppleAVD) |
| Live Watch HTML + signed `post-videos` HEAD/Range (`PC2_IOS_BUILD4_PLAYBACK_REGRESSION_REPORT.md`) | UP — HEAD 200, Range 206, `video/mp4` / `video/quicktime`, `Accept-Ranges: bytes`, ftyp `mp42`/`qt` |
| Android playback of the same UMTUBA videos (this update) | PASS |

Classification after the Android contrast:

| Class | Verdict |
| --- | --- |
| General backend / storage outage | **EVEN LESS LIKELY.** Android plays the same videos. Prior signed-object probes were already UP. |
| Asset-corrupt / unplayable files | **EVEN LESS LIKELY** as the class for “all tested videos.” Android decodes them. |
| Auth/session so the feed never signs a URL | **NOT PRIMARY.** iOS overlay is expo-video item-load after a non-empty `src`. |
| iOS-specific player/runtime (AVPlayer / ATS / Range / MIME / TLS / redirect / Build 4 native) | **STILL IN SCOPE for the historical fail.** Success-session OS log shows AVPlayer/FigHTTP/AppleAVD working after a cold launch. That does **not** identify the prior fail. |
| Shared JS Watch source regression Build 3→4 | **NOT SHOWN** in the prior SHA compare (same `createSignedUrl` / `useVideoPlayer(src)` / `expo-video` `^57.0.1`). |

---

## 4. iOS-specific path (source facts; not a fix)

Shared JS (Build 3, Build 4, HEAD) in `WatchVideoCard.tsx`:

- `useVideoPlayer(src)` with a **string** signed HTTPS URL.
- No custom headers. No `contentType` override.
- Retry: remint signed URL → `player.replaceAsync`.
- Overlay text is `sanitizePlaybackError` → `getErrorMessage` (no rewrite of the native string).

Native split inside `expo-video` `57.0.1` (unchanged lockfile):

| Platform | Player | How the signed URL is loaded |
| --- | --- | --- |
| iOS | **AVPlayer / AVPlayerItem / AVURLAsset** | String URI → `AVURLAsset`. Headers only if JS supplies them (UMTUBA does not). `PlayerItemLoadException` wraps `AVPlayerItem.error` / `transportError.localizedDescription`. |
| Android | **ExoPlayer (Media3) / MediaItem.setUri** | Same string URI. Different HTTP stack, Range behavior, and MIME sniffing. |

That split is why Android PASS + iOS FAIL is compatible with an iOS-only load failure **and** still does not identify ATS vs Range vs MIME vs TLS vs redirect vs Build 4 IPA env.

Prioritized unanswered questions (need syslog, not a patch):

1. **AVPlayer / AVFoundation** — exact `NSError` domain/code, `AVPlayerItem.error`, `NSURLError` underlying.
2. **expo-video iOS** — `PlayerItemLoadException` param beyond the on-screen suffix.
3. **Signed URL on iOS** — whether AVPlayer requested the redacted `/storage/v1/object/sign/post-videos/...` host and whether the query survived.
4. **Range as seen by iOS** — did AVPlayer issue `Range` and get 206, 200, 4xx, or a redirect?
5. **MIME / content-type** — `video/mp4` vs `video/quicktime` vs unexpected type on the iOS request.
6. **ATS / TLS** — ATS block, cert, or ATS exception (none declared in `app.config.ts`).
7. **Redirects** — 3xx that ExoPlayer followed and AVPlayer did not, or cookie/header drop.
8. **Build 4 native/EAS** — IPA-only env or native uniqueness vs Build 3. JS playback path was identical.

Do **not** convert any of those into a source or backend change.

---

## 5. What was and was not captured

```text
SUCCESS_SESSION_LOGS = YES
FAILURE_SESSION_LOGS = NO
PLAYBACK_REPRODUCED_WITH_LOGGING = NO
LOG_TIMESTAMP_CORRELATED = YES_FOR_SUCCESS_ONLY — 01:34:29 launch; 01:34:33 first ExpoVideo.VideoPlayerItem / AppleAVD / likelyToKeepUp; FigPlayerPlaying YES at 01:34:33, 01:34:36, 01:35:33, 01:35:46
AVPLAYER_SYSLOG_LINES_SUCCESS = YES — AVPlayer 1867 / AVPlayerItem 41 / AVFoundation 35 / FigPlayer 1344 / FigPlayback 884 / FigHTTP 87 / ExpoVideo 62 (counts at analysis time; file still growing)
AVPLAYER_SYSLOG_LINES_FAILURE = NONE
NSURL_SYSLOG_LINES = NSURLErrorDomain Code=-999 only (cancelled). Failing URL keys = <private>
HTTP_STATUS_ON_DEVICE = NONE — no HTTP/1.1 200/206/4xx lines in this syslog
ATS_TLS_ON_DEVICE = NO_ATS_BLOCK_LINE
MIME_RANGE_ON_DEVICE = NONE
DECODER_ON_DEVICE = YES_SUCCESS — AppleAVD videocodecd at 01:34:33
```

The historical fail remains on-screen evidence only. Server-side probes from the regression report remain the only HTTP status evidence. Tokens were not reprinted. This session did not re-probe storage.

---

## 6. Why no source or backend fix

User rule: do not invent a client workaround; do not change storage globally without proof.

Still rejected (Android PASS makes several of these worse ideas, not better):

- Making `post-videos` public
- Injecting Supabase session headers into AVPlayer
- Disabling ATS
- Privileged download-then-play
- Speculative `{ uri, contentType }` / cache rewrite
- Downgrading `expo-video`
- Building Build 5 as a claimed playback repair (HEAD still has the same playback JS)

```text
CONFIRMED_ROOT_CAUSE = UNCONFIRMED
SOURCE_FIX_REQUIRED = NO
BACKEND_FIX_REQUIRED = NO
BUILD5_PLAYBACK_BLOCKER = YES
BUILD5_BLOCKED = YES
```

---

## 7. Next exact action

1. Do **not** treat Build 4 Watch as permanently fixed. Do **not** build Build 5. Do **not** apply a speculative source/backend patch.
2. Leave syslog running. If Watch fails again on this iPhone, note the wall-clock time immediately so the same capture can be sliced.
3. A failure captured under this (or a later) syslog is required before claiming ATS vs Range vs MIME vs TLS vs session vs IPA.
4. Do not Submit for Review. Do not re-upload.

```text
IOS_FINAL_RELEASE_BLOCKERS = BUILD4_WATCH_PLAYBACK_INTERMITTENT; SAVE_FAIL_ON_BUILD4_BINARY; REMAINING_IPHONE_QA; APP_STORE_METADATA
CENTRAL_ACTION_REQUIRED = YES
BUILD5_BLOCKED = YES
```

## 8. Success-session log analysis (2026-08-16)

Capture window: syslog start **01:30:03** → analysis while still growing (~25 MB by 01:38). Operator success report ~01:35.

| Time (PC local) | What the OS log shows |
| --- | --- |
| 01:25 | Lockdown pairing record written (prior turn). USB Trust/reconnect already done. |
| 01:30:03 | `syslog_relay` starts. Wi-Fi transferring (~885 KB / 5 s). `com.umtuba.app` **pid 1984** later seen `running-suspended-NotVisible`. **No** ExpoVideo / AVKit / `resource unavailable` from pid 1984 in this file. |
| 01:34:25 | pid 1984 **jetsam-killed** while suspended (`RBSProcessExitStatus domain:jetsam(1) code:17`). Normal idle memory reclaim — not itself a playback error. |
| 01:34:29 | **Cold launch** `com.umtuba.app` **pid 2246** (`Bootstrap success`, `UserInteractiveFocal`, visible). |
| 01:34:33 | `New playerItem: ExpoVideo.VideoPlayerItem`. `FigPlayMonitor` `kfpmStreamLikelyToKeepUp` (one sample: duration 38.30 s, bandwidth ~29478 kbps, durationAhead 5.83 s). `videocodecd` **AppleAVD** starts. `FigPlayerPlaying: YES` for UMTUBA(2246). |
| 01:34:33–01:35:46 | 19 `New playerItem` events; further `FigPlayerPlaying: YES` at 01:34:36, 01:35:33, 01:35:46. Matches operator “previously failing videos now playing.” |

Reconnect / Trust / app restart / network / session — what can and cannot be said:

| Candidate | In this log? | Can it explain recovery? |
| --- | --- | --- |
| USB reconnect + Trust | Pairing existed **before** this success window (01:25). Not re-logged at 01:34. | **Not isolated.** Could have refreshed network/lockdown earlier. Not shown as the 01:34 play trigger. |
| App process restart | **Yes.** Fresh pid 2246 at 01:34:29, then successful items 4 s later. | **Strongest correlation.** Cold start remints JS/session/signed URLs and new `AVPlayerItem`s. **Not proven** as the reason the old session failed. |
| Network / Wi-Fi | Wi-Fi was already moving data at 01:30. No HTTP status in syslog. | **Possible transient** recovery; **not proven.** Prior server HEAD 200 / Range 206 already showed objects UP during the fail window. |
| Session / signed URL | Hosts and query strings are `<private>`. No `post-videos` text. | **Possible** on cold start (new sign). **Not visible** in this log. |
| Source/backend change this session | None. | Cannot explain recovery. |
| Build 5 / IPA change | None. Same TestFlight Build 4. | Cannot explain recovery. |

Honesty limits: this capture **does not contain** the historical fail. Empty/missing for the fail: no `-1008`, no `resource unavailable`, no `PlayerItemLoadException`, no on-device HTTP status. Those absences are because the fail was **before** logging, not because the fail is disproven.
