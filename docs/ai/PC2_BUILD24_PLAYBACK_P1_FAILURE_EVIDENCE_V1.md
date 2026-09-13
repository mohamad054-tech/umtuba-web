# PC2_BUILD24_PLAYBACK_P1_FAILURE_EVIDENCE_V1

Evidence only. No shared/product fix. No commit / push / reset. No App Store Review. No production release. Do not treat Build 23 as this binary.

```text
TASK_ID = PC2_BUILD24_PLAYBACK_P1_FAILURE_EVIDENCE_V1
DATE = 2026-08-22
DEVICE = PC2
DEVICE_ROLE = IOS_TESTFLIGHT_IPHONE13_VALIDATOR
BUILD = UMTUBA 1.0.0 (24)
PHYSICAL_DEVICE = iPhone 13
SOURCE_SHA = 0d5680ad05fbbb988a59de86c2ee2e87f733f970
BUILD24_DEVICE_VERSION_VERIFIED = YES
VIDEO1_START_TIME = 11_SECONDS
VIDEO2_START_TIME = 12_SECONDS
VIDEO3_START_TIME = 20_SECONDS
PROLONGED_LOADING_REPRODUCED = YES_12S_AND_20S_NEXT_ITEM
DELAY_BEFORE_VIDEOASSET = 4_SECONDS_COLD
DELAY_AFTER_VIDEOASSET = UP_TO_18_SECONDS
HTTP_403_OBSERVED = NO
HTTP_206_OBSERVED = YES
SIGNED_URL_SERIAL_BLOCKING = NOT_REPRODUCED_AS_54S_GAP
BUILD23_VS_BUILD24_RESULT = IMPROVED_NOT_CLOSED
LIKELY_LAYER = POST_ASSET_NEXT_ITEM_STALL
IOS_PLAYBACK_P1_CLOSED = NO
IOS_FINAL_DEVICE_GATE = FAIL
CENTRAL_FIX_REQUIRED = YES
BLOCKER = P1_NEXT_ITEM_12S_TO_20S_BUILD24
SOURCE_CHANGED_BY_PC2 = NO
LOCAL_FIX_ATTEMPTED = NO
APP_STORE_REVIEW_SUBMITTED = NO
APP_STORE_PRODUCTION_SUBMISSION = NO
```

**Do not erase the 11 / 12 / 20 s instrumented times.** A later operator retest (below, section G) is **PASS_ON_FRESH_RETEST**. Both records stand.

```text
FRESH_OPERATOR_RETEST = PASS
WATCH_20_PLUS_VIDEO_STRESS = PASS
VIDEOS_TESTED = 20
OBSERVED_STARTUP_DELAY = NONE
PROLONGED_LOADING_REPRODUCED_ON_FRESH_RETEST = NO
PROGRESSIVE_SLOWDOWN = NO
PREVIOUS_INSTRUMENTED_TIMES = 11s / 12s / 20s
BUILD24_CURRENT_VERDICT = PASS_ON_FRESH_RETEST
IOS_PLAYBACK_P1_CLOSED = YES_ON_CURRENT_RETEST
IOS_FINAL_DEVICE_GATE = PASS_PENDING_CENTRAL_ACCEPTANCE
READY_FOR_CENTRAL_FINAL_DECISION = YES
```

---

## Official return fields

```text
BUILD24_DEVICE_VERSION_VERIFIED = YES
VIDEO1_START_TIME = 11_SECONDS (pid 5816 start 13:36:06 → first positive ~13:36:17; first logged t=1.87 at 13:36:19)
VIDEO2_START_TIME = 12_SECONDS (13:36:45 preroll → stable play 13:36:57 t=0.88). Flash t=0.89 at 13:36:46 then paused.
VIDEO3_START_TIME = 20_SECONDS (13:37:12 preroll → 13:37:32 t=0.88)
PROLONGED_LOADING_REPRODUCED = YES_12S_AND_20S_NEXT_ITEM
DELAY_BEFORE_VIDEOASSET = 4_SECONDS_COLD (13:36:06 → 13:36:10). Build 23 was 54s.
DELAY_AFTER_VIDEOASSET = UP_TO_18_SECONDS (video 3: asset 13:37:14 → positive 13:37:32)
HTTP_403_OBSERVED = NO
HTTP_206_OBSERVED = YES (13:36:09, same second as first asset)
SIGNED_URL_SERIAL_BLOCKING = NOT_REPRODUCED_AS_54S_GAP
BUILD23_VS_BUILD24_RESULT = IMPROVED_NOT_CLOSED
LIKELY_LAYER = POST_ASSET_NEXT_ITEM_STALL
IOS_PLAYBACK_P1_CLOSED = NO
IOS_FINAL_DEVICE_GATE = FAIL
CENTRAL_FIX_REQUIRED = YES
BLOCKER = P1_NEXT_ITEM_12S_TO_20S_BUILD24
```

Operator visual “still unacceptably slow” is consistent with **12 s and 20 s** next-item windows. It is **not** the Build 23 57 s pre-`VideoAsset` class.

---

## A — Installed binary (gate)

```text
IPHONE13_USB_CONNECTED = YES
LIVE_USB_DEVICE = iPhone14,5 / iPhone 13 / 00008110-000A10123AF9801E
USBMUX_DEVICEID = 1
CFBundleDisplayName = UMTUBA
CFBundleShortVersionString = 1.0.0
CFBundleVersion = 24
SignerIdentity = TestFlight Beta Distribution
Path = /private/var/containers/Bundle/Application/C7C41B9A-46B9-408F-B248-A53B0304A477/UMTUBA.app
BUILD24_INSTALLED = YES
PHONE_ON_PREVIOUS_BUILD = NO
```

`appstored` at **13:36:02**: `[Install] … bundleVersion: 24`. pid **5816** starts **13:36:06** from that new bundle path (not the old Build 23 `908EDBA3-…` / pid 5409).

---

## B — Capture method

```text
LOG_CAPTURE_METHOD = com.apple.syslog_relay
PAIRING = 00008110-000A10123AF9801E
SESSION_USED = %LOCALAPPDATA%\Temp\pc2-ios-syslog\build24-syslog.capture.log
UMTUBA_PID = 5816
TAP / XCUITest / WDA = ABSENT
SPRINGBOARD_TERMINATE = STARTED_SERVICE_NO_ACK (timeout; not proven)
PC2_VISUAL_TAP = NO
```

A later dedicated P1 capture after 13:40 did not see another Watch session (pid 5816 was frozen). The **13:36:06–13:38:00** session is the live Build 24 Watch evidence. Hosts hashed; query strings not copied.

---

## C — Timing table (Build 24 vs Build 23)

| Video | Activation | VideoAsset | First positive media time | Start time | Notes |
| --- | --- | --- | --- | --- | --- |
| **1 (cold)** | 13:36:06 process + API 200s | 13:36:10 | ~13:36:17 (logged t=1.87 at 13:36:19) | **11 s** | 206 at 13:36:09. AVD H.264 864×480 / 1330×662. |
| **2** | 13:36:45 preroll t=-0.13 | 13:36:47 / 13:36:49 | stable t=0.88 at **13:36:57** | **12 s** | 1 s flash at 13:36:46 then pause. HEVC 576×1024 at 13:36:49. |
| **3** | 13:37:12 preroll t=-0.13 | 13:37:14 | **13:37:32** t=0.88 | **20 s** | t=0.86 at 13:37:13 rate=0; 18 s after asset. |

Build 23 baseline (same method): preroll 11:50:41 → `VideoAsset` 11:51:35 (**54 s**) → t=0.88 at 11:51:38 (**57 s**). One HTTP **403**, then serial API fan-out.

```text
BUILD23_ITEM_SWAP_TO_VIDEOASSET = 54s
BUILD24_COLD_TO_VIDEOASSET = 4s
BUILD23_TO_FIRST_POSITIVE = 57s
BUILD24_VIDEO1_TO_FIRST_POSITIVE = 11s
BUILD24_VIDEO2_TO_STABLE_POSITIVE = 12s
BUILD24_VIDEO3_TO_FIRST_POSITIVE = 20s
```

---

## D — Correlation (redacted)

```text
13:36:02  appstored Install bundleVersion 24
13:36:06  pid 5816 exec from C7C41B9A…/UMTUBA.app
13:36:07  UMTUBA CFNetwork many HTTP 200 (h3; 100–666 ms; body sizes S/K/U — no URLs copied)
13:36:09  mediaplaybackd Range HTTP 206  Hostname#c2d3dfe1:443
13:36:10  New asset ExpoVideo.VideoAsset ; AVD H264 start
13:36:19  first logged currentTime t=1.87 rate~1
13:36:45  clip1 pause t=27.48 → preroll t=-0.13
13:36:46  t=0.89 then rate=0
13:36:57  t=0.88 rate~1  ← video2 stable
13:37:12  pause t=12.61 → preroll t=-0.13
13:37:13  t=0.86 rate=0
13:37:14  New asset
13:37:31  preroll again
13:37:32  t=0.88 rate~1  ← video3
```

```text
HTTP_403_ON_PID_5816 = NONE (no status 403 / response_status=403)
HTTP_206 = YES
SIGNED_URL_54S_SERIAL_GAP = NOT_SEEN
```

---

## E — Layer ranking (not a fix authorization)

| Layer | Verdict this turn |
| --- | --- |
| Signed URL serial fan-out before `VideoAsset` | **NOT THE BUILD 24 STALL.** Cold asset in **4 s**. No 54 s gap. No 403 remint on this session. |
| Network / API | **SECONDARY.** Many 200s in 13:36:07–10 (100–990 ms). Later bursts at 13:37:44–56 do not explain the 20 s video-3 hole (hole is 13:37:13–13:37:31). |
| Player / item after `VideoAsset` | **PRIMARY ON 24.** Video 3: asset at 13:37:14, first positive **18 s later**. Video 2: flash then 9–12 s to stable play. |
| CDN / Range 206 | **FAST WHEN USED.** 206 at 13:36:09 with first asset. |
| Codec | **NOT PRIMARY.** H.264 then HEVC start in the same second as assets. |

```text
LIKELY_LAYER = POST_ASSET_NEXT_ITEM_STALL
```

---

## F — Compare Build 23

| | Build 23 | Build 24 |
| --- | --- | --- |
| SHA | d989e66 | 0d5680a |
| Cold / next `VideoAsset` wait | 54 s | 4 s cold |
| First positive | 57 s | 11 s / 12 s / 20 s |
| HTTP 403 in gap | YES | NO this session |
| P1 closed | NO | NO |

Fan-out P1 fix **moved** the stall. It did **not** close Watch P1.

---

## Safety

- No product source edit. No commit, push, reset, stash.
- No Add for Review. No production submit.
- No secrets / signed query / tokens printed.
- SOURCE_CHANGED_BY_PC2 = NO
- LOCAL_FIX_ATTEMPTED = NO

---

## G — Fresh operator retest (later 2026-08-22)

Operator visual retest on the **same** TestFlight **1.0.0 (24)** / iPhone 13. PC2 did **not** invent new syslog timings for this retest. The 11 / 12 / 20 s table in section C remains the instrumented record.

```text
FRESH_OPERATOR_RETEST = PASS
WATCH_20_PLUS_VIDEO_STRESS = PASS
VIDEOS_TESTED = 20
OBSERVED_STARTUP_DELAY = NONE
PROLONGED_LOADING_REPRODUCED = NO
PROGRESSIVE_SLOWDOWN = NO
BUILD24_CURRENT_VERDICT = PASS_ON_FRESH_RETEST
IOS_PLAYBACK_P1_CLOSED = YES_ON_CURRENT_RETEST
IOS_FINAL_DEVICE_GATE = PASS_PENDING_CENTRAL_ACCEPTANCE
READY_FOR_CENTRAL_FINAL_DECISION = YES
INSTALL_PROXY_RECHECK = CFBundleVersion 24 (still C7C41B9A-… / TestFlight)
```

Twenty consecutive videos played with effectively immediate startup. The earlier 12 s / 20 s next-item stalls were **not** reproduced on this pass.

---

## Next (Central)

1. Do **not** Add for Review until Central accepts this dual record.
2. Keep both: prior PC2 syslog **11 / 12 / 20 s** AND current operator **20-video PASS**.
3. Current PC2 verdict: `PASS_ON_FRESH_RETEST` pending Central acceptance. PC2 must not implement a fix.
