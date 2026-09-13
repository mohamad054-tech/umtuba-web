# PC2_IOS_WATCH_PLAYBACK_P1_BUILD23_DEVICE_RETEST_V1

QA + evidence only. No shared/product fix. No commit / push / reset. No App Store Review. No production release. Do not treat Build 22/21/20 as the `d989e66` binary.

```text
TASK_ID = PC2_IOS_WATCH_PLAYBACK_P1_BUILD23_DEVICE_RETEST_V1
PARENT_TASK = PC2_IOS_FINAL_DEVICE_QA_D989E66_V1
DATE = 2026-08-22
DEVICE = PC2
DEVICE_ROLE = IOS_TESTFLIGHT_IPHONE13_VALIDATOR
BUILD = UMTUBA 1.0.0 (23)
SOURCE_SHA = d989e66364af04bc11b6741914e54b480c1e64b5
BUILD23_APP_STORE_GATE = FAIL_DO_NOT_ADD_FOR_REVIEW
VIDEO_P1_REPRODUCED = YES_OPERATOR_FAIL_AND_PC2_LOG_INSTRUMENTED
MEASURED_LOAD_TIME = 57_SECONDS_ITEM_SWAP_TO_FIRST_POSITIVE_MEDIA_TIME
LIKELY_LAYER = SIGNED_URL_AND_API_FANOUT_BEFORE_NEW_VIDEOASSET
CENTRAL_ESCALATION = YES
BLOCKER = P1_VIDEO_STARTUP_OVER_60S_BUILD23
SOURCE_CHANGED_BY_PC2 = NO
LOCAL_FIX_ATTEMPTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMISSION = NO
```

---

## Official return fields

```text
BUILD23_APP_STORE_GATE = FAIL_DO_NOT_ADD_FOR_REVIEW
VIDEO_P1_REPRODUCED = YES_OPERATOR_FAIL_AND_PC2_LOG_INSTRUMENTED
MEASURED_LOAD_TIME = 57_SECONDS (PC2 syslog: 11:50:41 preroll t=-0.12 → 11:51:38 t=0.88). Operator visual = OVER_60_SECONDS. PC2 did not time a tap on-screen.
LIKELY_LAYER = SIGNED_URL_AND_API_FANOUT_BEFORE_NEW_VIDEOASSET
CENTRAL_ESCALATION = YES
BLOCKER = P1_VIDEO_STARTUP_OVER_60S_BUILD23
```

Layer ranking for Central (not a fix authorization):

| Layer | Verdict this turn |
| --- | --- |
| Signed URL generation | **PRIMARY CANDIDATE.** Clip-end at 11:50:41 is followed by CFNetwork fan-out on `Hostname#0d995e16:443` (hashed; query redacted). One HTTP **403** (369 ms) then many small POSTs (`body S 17`) before any new `ExpoVideo.VideoAsset`. Source path signs 12 feed rows **sequentially** (`fetchWatchFeedPage` → `createVideoSignedUrl`). |
| Network / API latency | **IN SCOPE, SECONDARY.** Same host QUIC later hits `Operation timed out` / keepalive limit while Wi-Fi LQM is good. Individual sign-like calls are 100–600 ms, but the gap before a new asset is ~54 s. |
| Player initialization | **NOT THE 54 s GAP.** `AVPlayerController` already exists on pid 5409. New `ExpoVideo.VideoAsset` appears only at **11:51:35**. After that, first positive media time is ~3 s later. |
| Preload / buffering | **SECONDARY AFTER ASSET EXISTS.** Adjacent H.264 sessions are torn down at swap. Once Range **206** starts, decoder start is immediate. One NSURLError **-999** cancel (not -1008). |
| Media URL / storage / CDN | **NOT SLOW ONCE FETCH BEGINS.** `mediaplaybackd` Range 206 on `Hostname#c2d3dfe1:443` at 11:51:34–11:51:38 (h3). Byte-range works. |
| Video format / codec / bitrate | **NOT PRIMARY.** Clip A was HEVC 576×1024 and **was already playing**. Next clip starts H.264 1330×672 after the asset appears. No “resource unavailable.” |
| Regression introduced in Build 23 source | **UNLIKELY.** `d989e66` vs Build 22 `48c510fa` is auth/password/autofill only. Watch / `watchFeed` / `WatchVideoCard` / `playbackPolicy` unchanged. Build 22 zIndex stall class is a different symptom; that iOS `zIndex: {}` fix **is** in 23. |

---

## A — Installed binary (gate)

Phone **is** on 1.0.0 (23). QA proceeded.

```text
IPHONE13_USB_CONNECTED = YES
LIVE_USB_DEVICE = iPhone14,5 / iPhone 13 / 00008110-000A10123AF9801E
USBMUX_DEVICEID = 1
INSTALL_PROXY_AT = 2026-08-22T08:47:17.849Z
CFBundleDisplayName = UMTUBA
CFBundleShortVersionString = 1.0.0
CFBundleVersion = 23
SignerIdentity = TestFlight Beta Distribution
ApplicationType = User
ITSDRMScheme = v2
MinimumOSVersion = 18.0
BUILD23_INSTALLED = YES
PHONE_ON_PREVIOUS_BUILD = NO
```

Live syslog agrees (not TestFlight UI; Windows cannot open TestFlight):

```text
Aug 22 11:50:34 appstored [com.umtuba.app] Created app event with version: 1.0.0 bundleVersion: 23 duration: 31
Aug 22 11:50:34 appstored [com.umtuba.app] Created app event with version: 1.0.0 bundleVersion: 23 duration: 323
```

Launch bookmark (not first-frame): `startTime: 2026-08-22 11:43:51`.

---

## B — USB log method

```text
LOG_CAPTURE_METHOD = com.apple.syslog_relay (existing Temp Node lockdown client)
PAIRING = 00008110-000A10123AF9801E (first-plist default is a different UDID and InvalidHostID)
CAPTURE_START = 2026-08-22T08:49:59.706Z / local Aug 22 11:49:59
OUT = %LOCALAPPDATA%\Temp\pc2-ios-syslog\build4-syslog.capture.log
UMTUBA_PID = 5409
TAP / XCUITest / WDA = ABSENT
screenshotr = historically InvalidService
PC2_VISUAL_REPRODUCE = NO
```

First syslog attempt used the default first pairing plist (`00008030-…`) and failed `InvalidHostID`. Capture then used the existing iPhone 13 pairing record. Hosts and signed query strings are hashed/`<private>` in syslog. Tokens were not copied.

---

## C — Timing (what PC2 measured vs operator)

```text
OPERATOR_VISUAL = OVER_60_SECONDS (P1_VIDEO_STARTUP = FAIL). PC2 did not watch the screen.
PC2_VISUAL_TAP_TO_PLAY = NOT_POSSIBLE_FROM_WINDOWS
PC2_LOG_MEASURED = 57_SECONDS
```

Instrumented clip-end → next first media time (same pid 5409, Build 23):

```text
11:50:40  AVPlayer rate=0.999987 currentTime=134.88   (clip A still playing)
11:50:40  AVPlayer rate=0.000000 currentTime=135.487  (ended / paused)
11:50:41  AVPlayer rate=0.999987 currentTime=-0.126   (new item preroll; AVD torn down)
11:50:41  CFNetwork Task.<239> HTTP 200  520ms  protocol=h3  Hostname#0d995e16:443
11:50:42  CFNetwork Task.<240> HTTP 403  369ms  (same connection; URL redacted)
11:50:42  AppleAVD HEVC + two H264 576x1024 sessions finalized; AVD OFF
11:51:15  LocalAuthenticationUIService MediaPlayback assertion (concurrent; unproven)
11:51:32–11:51:34  more CFNetwork 200s on Connection 34, several body S 17
11:51:34  mediaplaybackd Range HTTP 206  Hostname#c2d3dfe1:443
11:51:35  New asset: <ExpoVideo.VideoAsset: 0x10f662bc0>
11:51:35  AppleAVD H264 StartSession 1330 x 672
11:51:37  AVPlayer currentTime=-0.12 (still preroll)
11:51:38  AVPlayer currentTime=0.884  ← first positive media time
```

```text
ITEM_SWAP_TO_VIDEOASSET = 54s (11:50:41 → 11:51:35)
ITEM_SWAP_TO_FIRST_POSITIVE_TIME = 57s (11:50:41 → 11:51:38)
VIDEOASSET_TO_FIRST_POSITIVE_TIME = 3s
STORAGE_RANGE_ONCE_STARTED = FAST (206 same second as asset)
```

Operator OVER_60_SECONDS is consistent with this window if they counted swipe/auto-next / spinner from ~11:50:40.

A later in-clip pause at 11:51:45 (t=7.70, rate=0) then resume at 11:51:52 is **not** the P1 startup class.

---

## D — Source path (read-only, worktree `d989e66`)

Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-final-qa-d989e66-v1`  
HEAD `d989e66364af04bc11b6741914e54b480c1e64b5` (not reset; dirty primary mobile left at `77e9e287`).

Build 23 vs 22 (`48c510fa`) files: auth screens + `PasswordField` + i18n only. **No Watch / feed / player delta.**

Relevant unchanged path:

- `WATCH_FEED_PAGE_SIZE = 12`; `loadInitial` uses `limit: 12`.
- `fetchWatchFeedPage` maps the page only after **sequential** `await resolvePlaybackUrl` / `createVideoSignedUrl` (`post-videos`, TTL 15 minutes).
- Full-page Watch spinner while `loading` is true — players do not mount until the page returns.
- After mount: `shouldLoadPlayer` = current ± 1; iOS transport waits for `itemReady`.
- Card spinner while expo-video `status === "loading"`.
- Build 22 overlay fix remains: `watchHeaderOverlayLayerStyle("ios") === {}`.

This captured stall is **after a playing clip ended**, not a proven cold Watch open. Sequential remint / feed reload still matches “no `VideoAsset` for 54 s.”

---

## E — Quoted syslog (redacted)

Hosts are hashed. No signed query params copied.

```text
Aug 22 11:50:34 appstored [Launches] [com.umtuba.app] version: 1.0.0 bundleVersion: 23
Aug 22 11:50:41 UMTUBA(AVKit)[5409] rate = 0.999987, item currentTime = -0.126591
Aug 22 11:50:41 videocodecd AppleAVDWrapperHEVCDecoderFinalize(): codecType: HEVC, 576 x 1024
Aug 22 11:50:41 UMTUBA(CFNetwork)[5409] Task.<239> summary success transaction_duration_ms=520 response_status=200 protocol="h3"
Aug 22 11:50:42 UMTUBA(CFNetwork)[5409] Task.<240> received response, status 403
Aug 22 11:50:42 UMTUBA(CFNetwork)[5409] Task.<240> summary success transaction_duration_ms=369 response_status=403
Aug 22 11:50:42 videocodecd AppleAVDWrapperH264DecoderFinalize(): codecType: AVC, 576 x 1024
Aug 22 11:50:42 kernel(AppleAVD) Turning AVD OFF
Aug 22 11:51:35 UMTUBA(AVKit)[5409] New asset: <ExpoVideo.VideoAsset: 0x10f662bc0>
Aug 22 11:51:35 videocodecd AppleAVDWrapperH264DecoderStartSession() … 1330 x 672
Aug 22 11:51:34 mediaplaybackd received response, status 206
Aug 22 11:51:37 mediaplaybackd finished with error [-999] NSURLErrorDomain Code=-999
Aug 22 11:51:38 UMTUBA(AVKit)[5409] rate = 0.999988, item currentTime = 0.884111
Aug 22 11:52:16 UMTUBA(Network)[5409] reporting state failed error Operation timed out
```

Data-usage snapshot (lifetime counters; do not treat as this stall’s bytes): Wi-Fi only; `mediaplaybackd` delegation present.

---

## F — Compare prior P1 classes

| Prior | Class | Same as this 57 s stall? |
| --- | --- | --- |
| Build 4 | `resource unavailable` / NSURL **-1008** | **NO.** Not seen. Playback later succeeded. |
| Build 15 | remount / pause-during-replace | **Related family, not proven.** iOS still gates transport on `itemReady`. |
| Build 21 / 22 P1 | header `zIndex` stalling AVPlayer | **NO.** Different symptom. 22 fix is in 23. 22 device retest was never run (phone was on 21). |
| Build 23 this turn | 54–57 s before new `VideoAsset` / first media time | **NEW measured class on 23.** Not explained by `d989e66` JS delta. |

---

## Safety

- No product source edit. No commit, push, reset, stash.
- No Add for Review. No production submit.
- No secrets / `.env` / pairing material / signed query printed.
- Dirty web + primary mobile trees preserved.

---

## Next (Central)

1. Do **not** Add for Review.
2. Do **not** treat this as a PC2-owned shared-source fix.
3. Diagnose the 54 s gap before `ExpoVideo.VideoAsset`: sequential `createSignedUrl` of the 12-row page vs 403-then-remint vs feed reload vs QUIC.
4. Optional: parallelize signing or sign the active + ±1 window first (Central authorization only).
5. Re-time a **cold** Watch open on 23 with the same syslog method if Central needs that distinct from clip-end auto-next.
