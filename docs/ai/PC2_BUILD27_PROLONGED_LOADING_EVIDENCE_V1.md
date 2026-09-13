# PC2_BUILD27_PROLONGED_LOADING_EVIDENCE_V1

Evidence only. No patch. No rebuild. No Add for Review.

Operator A×5: Watch → other-user Profile → Back → same Watch, 5× = PASS. Video load felt long on **every** playback. USB still 1.0.0 (27) / `03B8D097` / `ce7d846`.

```text
TASK_ID = PC2_IOS_CE7D846_NESTED_ORIGIN_RETEST
BUILD = UMTUBA 1.0.0 (27)
SOURCE_SHA = ce7d846a13167b2104e4608f8924066d05ee3e18
SOURCE_SHA_VERIFIED = YES
NO_PROLONGED_LOADING_SMOKE = FAIL
PROLONGED_LOADING_REPRODUCED = YES
REPRO_FREQUENCY = EVERY_PLAYBACK_DURING_CURRENT_OPERATOR_TEST
MEASURED_VIDEO_START_TIMES = 3s / 3s / 7s / 5s
OLD_12_20S_CLASS_REPRODUCED = NO
HTTP_403 = 0
MAX_PLAYING_YES_PER_SEC = 1
PREVIOUS_AUDIO_OVERLAP = NO_ON_MAX1_PLAYING_YES
LIKELY_LAYER = OPERATOR_PERCEIVED_WATCH_LOAD_NOT_INSTRUMENTED_12_20_POST_ASSET
PC2_FINAL_STATUS = FAIL
CENTRAL_DECISION_REQUIRED = YES
```

## USB (this scrape)

```text
CFBundleVersion = 27
Path = .../03B8D097-9356-4E23-ACF2-8E636B268316/UMTUBA.app
NOT leftover DFCF434D / E217B62A
SignerIdentity = TestFlight Beta Distribution
UMTUBA_PID = 6289
```

## Operator (not invented seconds)

```text
WATCH_PROFILE_BACK_5X = PASS
NO_PROLONGED_LOADING_SMOKE = FAIL
PROLONGED_LOADING_REPRODUCED = YES
REPRO_FREQUENCY = EVERY_PLAYBACK_DURING_CURRENT_OPERATOR_TEST
OPERATOR_MEASURED_SECONDS = NOT_PROVIDED
```

Do not dismiss as warm-cache. Do not continue App Store release.

## USB syslog (snap `build27-qa-syslog.snap3.log`, local 21:40:47–21:42:10)

UMTUBA `New asset: ExpoVideo.VideoAsset` then first `item currentTime >= 0.2` at `rate ≈ 1`:

| n | VideoAsset | first rate≈1 | first currentTime≥0.2 | dt asset→positive |
| --- | --- | --- | --- | --- |
| 2 | 21:40:59 | 21:41:01 ct=-0.13 | 21:41:02 ct=0.88 | **3s** |
| 4 | 21:41:25 | 21:41:27 ct=-0.12 | 21:41:28 ct=0.89 | **3s** |
| 8 | 21:41:48 | 21:41:54 ct=-0.13 | 21:41:55 ct=0.88 | **7s** |
| 10 | 21:42:02 | 21:42:06 ct=-0.13 | 21:42:07 ct=0.88 | **5s** |

Assets 1/3/5/6/7/9 had no rate≈1 / no positive time (swipe or Profile cycle, not a completed play).

```text
MEASURED_VIDEO_START_TIMES = 3s / 3s / 7s / 5s
HTTP_403 = 0
STALL_57S = NO
STALL_12_20S_POST_ASSET = NO
```

## Class vs old regressions

| Class | Old signature | This scrape |
| --- | --- | --- |
| Build 23 | 57s **before** VideoAsset + blocking 403 | First UMTUBA ~21:40:47 → first VideoAsset 21:40:57 (**10s**). **403 = 0**. Not this class. |
| Build 24 | **12s / 20s after** VideoAsset to first positive | Measured **3 / 3 / 7 / 5 s**. Not 12–20s. |

```text
OLD_12_20S_CLASS_REPRODUCED = NO
```

A 15s wall-clock gap (21:41:07 rate=0 → next VideoAsset 21:41:22) sits inside the operator **Profile Back** cycle. That is not the Build 24 post-asset stall.

## Layer

Operator FAIL is real (every playback felt long). Instrumented post-asset AVKit start is 3–7s, not the old 12–20s class, not 57s/403. Likely perceived wait is return-to-Watch / UI spinner / pre-asset, **not** proven as the closed Build 24 next-item stall.

## Hard constraints

No source patch. No rebuild. No Add for Review. No production. No fabricated PASS. No signed URLs printed.
