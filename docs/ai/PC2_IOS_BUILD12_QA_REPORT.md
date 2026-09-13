# PC2 iOS BUILD 12 — session QA + Watch audio overlap FAIL

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_BUILD12_SESSION_QA_V1
DATE = 2026-08-17
PHASE = SESSION GATES PASS / WATCH AUDIO OVERLAP FAIL
MODE = RECORD_ONLY
DEVICE = physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 12
AUTHORIZED_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
BUILD_SOURCE_SHA = 7638487d1412f070e19285fc434362b47a359ea5
IOS_BUILD_NUMBER = 12
EAS_BUILD_ID = 5e3337c4-37dd-455c-bc8d-c24d6062ecb6
EAS_SUBMIT_ID = d87be758-6e5c-4c92-98e3-44f394db440f
BUILD_RESULT = FINISHED
TESTFLIGHT_AVAILABLE = YES_INTERNAL
BUILD12_TESTFLIGHT_AVAILABLE = YES_INTERNAL
TESTFLIGHT_BUILD = 12
BUILD12_INSTALLED = YES
DEVICE_QA_EXECUTED = YES
DEVICE_QA_RESULT = FAIL
WATCH = FAIL
WATCH_PLAYBACK = FAIL
BUILD12_WATCH_PLAYBACK = FAIL
DEFECT = PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO
AUDIO_OVERLAP = FAIL
RELEASE_REGRESSION = YES
FINAL_SMOKE = FAIL
COLD_LAUNCH = NOT_TESTED
SHARE = NOT_TESTED
CREATE = NOT_TESTED
RTL_BACK = NOT_TESTED
CRASH_SANITY = NOT_TESTED
P4_SMOKE = FAIL
APP_STORE_PRODUCTION_SUBMITTED = NO
APP_STORE_REVIEW_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD11_RETESTED_AS_BUILD12 = NO
SHARED_DEFECT_PATCHED_HERE = NO
EXPO_MEDIA_LIBRARY = 57.0.3
SECRET_VALUES_PRINTED = NO
BLOCKERS = WATCH_PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO
CENTRAL_ACTION_REQUIRED = FIX_WATCH_PLAYER_TEARDOWN_ON_ACTIVE_POST_CHANGE; NEW_SHA_THEN_NEW_IOS_BINARY
```

Inspected detached worktree
`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-build12-session-qa-v1`
at SHA `7638487d1412f070e19285fc434362b47a359ea5` only. Main checkout
`umtuba-mobile` at `77e9e28` was **not** reset.

Do **not** repeat session persistence tests. Do **not** ask the
operator to reproduce Watch. Do **not** Submit for Review /
Production. Do **not** invent remaining smoke PASS.

Watch defect detail: `docs/ai/PC2_IOS_BUILD12_WATCH_AUDIO_OVERLAP_REPORT.md`.

---

## Official session gate (recorded — do not retest)

Operator evidence on physical iPhone 13 / TestFlight **1.0.0 (12)**
is **authoritative**. Closed. Do not downgrade.

```text
LOGIN = PASS
CLOSE_REOPEN = PASS
FORCE_CLOSE_REOPEN = PASS
BACKGROUND_RESUME = PASS
DEVICE_RESTART_SESSION = PASS
SESSION_REMAINS_AUTHENTICATED_AFTER_NORMAL_REOPEN = YES
SESSION_REMAINS_AUTHENTICATED_AFTER_FORCE_CLOSE = YES
SESSION_REMAINS_AUTHENTICATED_AFTER_BACKGROUND = YES
SESSION_REMAINS_AUTHENTICATED_AFTER_IPHONE_RESTART = YES
LOGOUT = PASS
LOGOUT_REOPEN = PASS
SESSION_REHYDRATION_AFTER_LOGOUT = NO
REMAINS_LOGGED_OUT_AFTER_FORCE_CLOSE = YES
SESSION_REFRESH = OBSERVED_SESSION_CONTINUITY
PLAINTEXT_PASSWORD = NO
SESSION_RETEST = FORBIDDEN
```

---

## P3 — source / runtime auth (closed)

```text
INSPECTED_SHA = 7638487d1412f070e19285fc434362b47a359ea5
PLAINTEXT_PASSWORD = NO
PASSWORD_WRITTEN_TO_ASYNCSTORAGE = NO
PASSWORD_WRITTEN_TO_SECURESTORE = NO
SESSION_STORAGE = src/lib/supabase/authStorage.ts
CLIENT = src/lib/supabase/client.ts
HYDRATION = src/lib/auth/sessionHydration.ts + AuthContext.tsx
LOGOUT_CLEARS_SECURESTORE_AND_ASYNCSTORAGE = YES
SESSION_REFRESH = OBSERVED_SESSION_CONTINUITY
SESSION_REFRESH_ON_DEVICE_TOKEN_PROOF = NOT_ATTEMPTED
```

`PLAINTEXT_PASSWORD = NO`. Password is React `useState` on login /
signup only. Auth storage persists session JSON only — never
email/password. On-device token refresh was not proven.
Continuity alone is not `PASS`.

---

## P4 smoke

```text
WATCH = FAIL
WATCH_PLAYBACK = FAIL
BUILD12_WATCH_PLAYBACK = FAIL
DEFECT = PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO
AUDIO_OVERLAP = FAIL
RELEASE_REGRESSION = YES
COLD_LAUNCH = NOT_TESTED
SHARE = NOT_TESTED
CREATE = NOT_TESTED
RTL_BACK = NOT_TESTED
CRASH_SANITY = NOT_TESTED
FINAL_SMOKE = FAIL
P4_SMOKE = FAIL
```

`COLD_LAUNCH` is **NOT_TESTED**. Session reopen after login is not
treated as a dedicated cold-launch smoke gate.

`CRASH_SANITY` is **NOT_TESTED**. Audio overlap is not a crash.

Share / Create / RTL were **not** continued this turn.

---

## Official Watch defect (authoritative — do not retest)

```text
BUILD12_WATCH_PLAYBACK = FAIL
DEFECT = PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO
REPRO = Watch video A plays → move to video B → video B appears → audio from video A continues
EXPECTED = When active Watch post changes, previous player must pause/stop immediately; only current video audio may play
ACTUAL = Previous video's audio overlaps the newly active video
AUDIO_OVERLAP = FAIL
RELEASE_REGRESSION = YES
```

This is **not** a crash. Device QA result is **FAIL**. Production
submit is **NO**.

---

## Read-only source note (SHA 7638487d — no patch)

Intended pause when `activeIndex` changes:

- `app/(tabs)/watch.tsx` sets `isActive={index === activeIndex}`.
- Adjacent cards stay mounted: `shouldLoadPlayer` is
  `Math.abs(index - activeIndex) <= 1`.
- `WatchPlayerPane` applies `applyPlaybackIntent(player, { shouldPlay, …, resetPosition: !isActive })`.
- Inactive cards also force `muted: true, volume: 0` via
  `resolveEffectiveAudio`.
- iOS FlatList does **not** set `removeClippedSubviews` (Android only).
- `WatchPlayerPane` has no `player.release()` / unmount teardown on
  active-post change. `createPlayerSession().release()` exists in
  unit helpers only.

Device evidence: previous expo-video audio continues after the next
card is active. Native why pause/mute did not stop audio A is
**UNCONFIRMED**. Do not invent a deeper root cause. Do not patch.

---

## Return

```text
WATCH = FAIL
AUDIO_OVERLAP = FAIL
RELEASE_REGRESSION = YES
FINAL_SMOKE = FAIL
SHARE = NOT_TESTED
CREATE = NOT_TESTED
RTL_BACK = NOT_TESTED
DEVICE_QA_RESULT = FAIL
APP_STORE_PRODUCTION_SUBMITTED = NO
BLOCKERS = WATCH_PREVIOUS_VIDEO_AUDIO_CONTINUES_ON_NEXT_VIDEO
CENTRAL_ACTION_REQUIRED = FIX_WATCH_PLAYER_TEARDOWN_ON_ACTIVE_POST_CHANGE; NEW_SHA_THEN_NEW_IOS_BINARY
```

---

## Safety

- Session persistence not retested or downgraded.
- Watch not asked to reproduce again.
- Share / Create / RTL not continued.
- No Production / App Review submit.
- No local product patch / rebuild / EAS.
- Main mobile `77e9e28` not reset.
- `CURSOR_REPORT.md` not overwritten.
- No secrets in this report.
