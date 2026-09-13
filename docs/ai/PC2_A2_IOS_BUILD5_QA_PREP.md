# PC2-A2 iOS BUILD 5 — real device QA prep

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_A2_IOS_BUILD5_REAL_DEVICE_QA_V1
DATE = 2026-08-16
MODE = PREP_SUPERSEDED / SEE_PC2_A2_IOS_BUILD5_QA_REPORT
DEVICE = PC2 + physical iPhone 13
EXPECTED_APP = UMTUBA
BUNDLE_ID = com.umtuba.app
APP_VERSION = 1.0.0
EXPECTED_BUILD_NUMBER = 5
AUTHORIZED_CENTRAL_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
EAS_BUILD_ID = 4c341dcb-b4a8-4549-b50e-5eeb79293b36
EAS_SUBMIT_ID = 004dd5f9-b37f-4c37-a9e3-e5a11a356cc4
TESTFLIGHT_AVAILABLE = YES_INTERNAL_1.0.0_5
IPHONE13_INSTALL = NOT_STARTED
BUILD5_INSTALLED = NO
DEVICE_QA_EXECUTED = NO
APP_STORE_REVIEW_SUBMIT = NO
PRODUCTION_SUBMIT = NO
ANDROID_VERSIONCODE_TOUCHED = NO
STORE_LEARNING_REOPENED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
DEVICE_PASS_INVENTED = NO
BUILD4_RETESTED_AS_BUILD5 = NO
```

Prep is complete. A1 finished. This track uploaded Build 5 to internal
TestFlight (`EAS_SUBMIT_ID = 004dd5f9-b37f-4c37-a9e3-e5a11a356cc4`).
ASC lists **1.0.0 (5)** internal in beta testing. The iPhone 13 has **not**
installed it. Live status: `docs/ai/PC2_A2_IOS_BUILD5_QA_REPORT.md`.

Do **not** treat any Build 3 / Build 4 result as a Build 5 result.
Do **not** invent PASS.

---

## Current status (this turn)

```text
BUILD5_DEVICE_QA = WAITING_OPERATOR_INSTALL
SAVED = NOT_TESTED
OTHER_USER_PROFILE = NOT_TESTED
FOLLOW = NOT_TESTED
MESSAGES = NOT_TESTED
LOGIN_PROFILE = NOT_TESTED
BACK = NOT_TESTED
CREATE_UPLOAD = NOT_TESTED
OPEN_AFTER_UPLOAD = NOT_TESTED
UGC = NOT_TESTED
WATCH_PLAYBACK = NOT_TESTED
PLAYBACK_STABILITY = NOT_TESTED
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD5_INSTALL
```

Operator may now install **1.0.0 (5)** only. Confirm build **5**, not **4**.
Do **not** delete the account. Do **not** sign out to “prepare” the phone.

---

## Gate: what must be true before any device result

All of the following must be true before any field above may leave `NOT_TESTED`:

1. A1 reports success with a real `EAS_BUILD_ID`.
2. TestFlight shows **UMTUBA 1.0.0 (5)** as installable (internal).
3. The physical iPhone 13 has **Build 5** installed — not Build 4.
4. The operator confirms the TestFlight build number is **5**, not **4**.

Until then:

```text
BUILD5_DEVICE_QA = WAITING_OPERATOR_INSTALL
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD5_INSTALL
```

Forbidden:

- Declare PASS from source, from A1 “FINISHED”, or from ASC “in beta testing”.
- Test Build 4 and label it Build 5.
- Copy Build 3 / Build 4 PASS or FAIL into Build 5 result fields.
- Treat one later Watch play as playback PASS if an earlier fail/intermittent return happened.
- Invent a backend or client playback fix.
- Build, rebuild, re-upload, or Submit for Review from this track.
- Modify Android `versionCode`.
- Reopen Store / Learning.

---

## Operator install steps (PREPARED — do not run until A1 succeeds)

Use these only after parent resume includes `EAS_BUILD_ID` and TestFlight shows
Build 5. Windows cannot push the IPA. Install is iPhone-only via TestFlight.

### 0. A1 + TestFlight upload (done)

```text
WAIT_FOR = operator iPhone 13 install of 1.0.0 (5)
EAS_BUILD_ID = 4c341dcb-b4a8-4549-b50e-5eeb79293b36
EAS_SUBMIT_ID = 004dd5f9-b37f-4c37-a9e3-e5a11a356cc4
TESTFLIGHT_1.0.0_5 = YES_INTERNAL_IN_BETA_TESTING
DO_NOT_INSTALL_YET = NO — install 5 only, never 4
```

### 1. Open TestFlight on the iPhone 13

- Open the **TestFlight** app (not the App Store, not Expo Go).
- Find **UMTUBA** / `com.umtuba.app`.
- If UMTUBA is missing: stop. Report “UMTUBA not listed”. Do not invent a
  redemption code. Do not start External Beta.

### 2. Confirm it is Build 5, not Build 4

On the TestFlight app page, read the version line **before** tapping Install
or Update:

| Must see | Must not treat as Build 5 |
| --- | --- |
| **1.0.0 (5)** | **1.0.0 (4)** |
| Build **5** | Build **3** or any older build |

If the page still shows **(4)**:

- Do **not** install or “update”.
- Do **not** start the regression list.
- Reply: `TESTFLIGHT_STILL_SHOWS_BUILD_4`.

### 3. Install or update to 1.0.0 (5)

- Tap **Install** or **Update**.
- Wait until TestFlight shows **Open**.
- Open **App Information** / build details and re-read: version **1.0.0**,
  build **5**.
- If the installed build is still 4: stop. `IPHONE13_INSTALL = FAIL_WRONG_BUILD`.

### 4. Cold launch once

- Force-quit UMTUBA if it was already open from Build 4.
- Open UMTUBA from TestFlight **Open** (or the home-screen icon **after**
  confirming build 5).
- Confirm the app is UMTUBA, not Expo Go.

### 5. Identity check (after install only)

- Stay signed in if already signed in.
- Do **not** delete the account as a first step.
- Open own Profile (Watch top-right identity control, or Profile tab) and
  record name / @username / Sign in before Follow / other-user tests.

---

## Mandatory regression (after Build 5 is installed)

Record each item as `PASS` / `FAIL` / `BLOCKED` / `NOT_TESTED` only from
**this** iPhone 13 + Build 5 session. Historical Build 4 notes below are
context, not results.

### 1. Saved + Saved persistence

```text
SAVED = NOT_TESTED
SAVE_PERSISTENCE = NOT_TESTED
UNSAVE = NOT_TESTED
```

Steps:

1. Open Watch on another user’s video.
2. Tap Save. Expect success (no “Unable to update save.”).
3. Leave Watch (another tab), return. Bookmark must still be saved.
4. Unsave. Confirm it clears and stays cleared after a Watch reload.

Build 4 context (do not copy forward): Saved **FAIL** on binary `edc898f`
(`toggle_post_save` invoker + revoked award RPCs). Source fix is in later
SHAs (`831936c` / `9c1744a`). Build 5 must prove the binary path.

### 2. Other-user Profile + own Profile

```text
OTHER_USER_PROFILE = NOT_TESTED
OWN_PROFILE = NOT_TESTED
```

Steps:

1. Watch → another user’s video → tap creator / `Profile {username}`.
2. Expect that creator’s other-user Profile. Must **not** be
   “Profile not found”. Must **not** be own Profile.
3. Open own Profile (tab and/or Watch identity control). Expect own name,
   @username, Settings. No other-user Follow control on self.

Build 4 context: Watch avatar → “Profile not found” (**FAIL**). Source later
passes `?id=` plus `?u=` (`88caf13`). Retest on Build 5 only.

### 3. Follow / Following / unfollow

```text
FOLLOW = NOT_TESTED
FOLLOWING = NOT_TESTED
UNFOLLOW = NOT_TESTED
```

Steps (on the other-user Profile from §2):

1. Tap **Follow**. Label must become **Following** (never the word Unfollow).
2. Leave and return. Label still **Following**.
3. Tap **Following** to unfollow. Label returns to **Follow**.

### 4. Messages open / send

```text
MESSAGES = NOT_TESTED
MESSAGES_OPEN = NOT_TESTED
MESSAGES_SEND = NOT_TESTED
MESSAGES_RECEIVE = NOT_TESTED
```

Steps:

1. Open Messages tab. Thread list must load (not a blank/crash).
2. Open a conversation. Send one real message.
3. Receive is optional this pass; leave `NOT_TESTED` if not evidenced.

Build 4 context: open/send were PASS on Build 4. **Retest on Build 5.**
Do not carry that PASS across.

### 5. Login → Profile

```text
LOGIN_PROFILE = NOT_TESTED
```

Steps (only if a safe second account exists, or after a deliberate sign-out
that the operator approves):

1. Sign in with a real account.
2. After success, destination must be the **Profile tab**, not Watch.
3. Cold start of an already-signed-in session may still open Watch — that is
   not this check.

Do not delete the account to create a login path.

### 6. Back arrow

```text
BACK = NOT_TESTED
```

Steps:

1. Confirm a visible Back arrow on Watch, Discover, Create, Messages, Profile.
2. On tab roots: tap Back. Must be a **no-op** (stay on the tab; do not exit
   the app; do not loop through `index`).
3. Open a secondary screen (other-user Profile, Settings, a conversation).
   Back must return to the previous in-app screen.
4. From other-user Profile opened as Profile tab `?u=`, Back should return to
   own Profile tab (not exit).

Build 4 binary did **not** contain the global Back source (`e3457fc`).
This is a first-time device check on Build 5.

### 7. Create / upload + open uploaded post

```text
CREATE_UPLOAD = NOT_TESTED
OPEN_AFTER_UPLOAD = NOT_TESTED
```

Steps:

1. Create tab → pick a real iPhone video → caption → accept Terms → publish.
2. Expect “Video published.”
3. Tap **Open Watch**. Expect the **newly published** video, not a bare /
   stale Watch feed.
4. If Open Watch shows the live feed without the new post: `FAIL` (known
   Build 3 defect: bare `/(tabs)/watch` with no `?post=`).

Do not claim publish PASS unless the video exists on the platform **and**
Open Watch surfaces that post.

### 8. UGC report / block

```text
UGC = NOT_TESTED
UGC_REPORT = NOT_TESTED
UGC_BLOCK = NOT_TESTED
```

Steps (use a disposable other-user video, not the operator’s only test
account’s only post if avoidable):

1. Report a video. Confirm the report UI completes without crash.
2. Block that user. Confirm the block UI completes.
3. Record exact copy / errors. Do not invent a moderation backend result.

### 9. Account deletion

```text
ACCOUNT_DELETION = NOT_TESTED
```

**Last.** Do this only after §§1–8 and playback are recorded, and only if
the operator explicitly agrees to destroy **this** test account.

1. Settings → delete account flow.
2. Record the **exact** live wording (Build 4/production previously showed
   “You do not need the Android app.”).
3. Do not complete deletion unless the operator confirms this account is
   disposable.
4. If wording is still Android-specific: record `FAIL` / `WORDING_DEFECT`
   and stop before confirming delete if the account must be kept.

### 10. Watch playback — SPECIAL OPEN GATE

```text
WATCH_PLAYBACK = NOT_TESTED
PLAYBACK_STABILITY = NOT_TESTED
```

This gate stays **open** even if a later play works.

Rules:

- Test **multiple real videos** (not one clip, not a single retry).
- Record each attempt: video identity (creator / caption / post if visible),
  wall-clock time, on-screen result.
- **One later successful play is NOT PASS** if a fail or intermittent failure
  returned earlier in the Build 5 session (or returns after the success).
- Do **not** invent a backend fix. Do **not** change storage, RLS, or signed
  URL policy from this track.
- Do **not** declare `WATCH_PLAYBACK = PASS` from a single success after a
  fail.

If playback fails or is intermittent, preserve **exact** evidence:

| Capture | What to keep |
| --- | --- |
| On-screen error | Exact string (Build 4 was `Failed to load the player item: resource unavailable`) |
| Player | AVPlayer / expo-video (`PlayerItemLoadException` wrapping AVPlayer/NSURL) |
| URL / HTTP | Signed media host if visible; HTTP status / Range if obtainable. Do not print secrets or full signed query strings into chat/docs if they contain tokens |
| Scope | How many videos, which ones, Android contrast only if the operator already has it |
| Timing | Wall-clock of each fail and each later success |
| Stability | `INTERMITTENT` if fail then play (or play then fail). Never upgrade intermittent to PASS |

Build 4 context (not a Build 5 result):

- Historical fail: all tested iPhone videos, expo-video / AVPlayer
  “resource unavailable” (typically NSURLErrorDomain -1008).
- Same videos later played on the same iPhone 13 / Build 4 (syslog success
  session). Classified **INTERMITTENT**, not fixed.
- Android played the same videos. Do not treat that as an iOS PASS.
- Build 5 source was **not** a proven playback repair. A new binary is not
  a playback fix until this gate is closed on device.

---

## Historical Build 4 (context only — do not copy into Build 5 fields)

```text
BUILD4_BINARY_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
BUILD4_SAVED = FAIL
BUILD4_OTHER_USER_PROFILE = FAIL
BUILD4_MESSAGES_OPEN = PASS
BUILD4_MESSAGES_SEND = PASS
BUILD4_WATCH_PLAYBACK = FAIL_THEN_INTERMITTENT_WORKING
BUILD4_PLAYBACK_STABILITY = INTERMITTENT
BUILD4_LOGIN_PROFILE = NOT_TESTED
BUILD4_BACK = NOT_IN_BINARY
BUILD4_CREATE_UPLOAD = NOT_TESTED_ON_BUILD4
BUILD4_OPEN_AFTER_UPLOAD = NOT_TESTED_ON_BUILD4
```

Build 3 historical Watch/Create PASS is prior-session evidence only and is
**not** a Build 5 result.

---

## After A1 succeeds (parent resume)

Expected resume payload:

```text
EAS_BUILD_ID = <from A1>
BUILD_SOURCE_SHA = 017be09f4dff2e7c39f8f4363a79cef46cd52d48
APP_VERSION = 1.0.0
BUILD_NUMBER = 5
TESTFLIGHT_AVAILABLE = YES_INTERNAL | <A1 value>
```

Then, and only then:

1. Ask the operator to install **1.0.0 (5)** using the steps above.
2. Confirm build number **5** on device.
3. Run the mandatory regression.
4. Keep Watch playback as an open gate until multiple videos are stable
   with no intermittent return.

If A1 fails or Build 5 is not installable: keep

```text
BUILD5_DEVICE_QA = WAITING_FOR_A1
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD5_INSTALL
```

---

## Return fields (this turn — prep only)

```text
BUILD5_DEVICE_QA = WAITING_OPERATOR_INSTALL
SAVED = NOT_TESTED
OTHER_USER_PROFILE = NOT_TESTED
FOLLOW = NOT_TESTED
MESSAGES = NOT_TESTED
LOGIN_PROFILE = NOT_TESTED
BACK = NOT_TESTED
CREATE_UPLOAD = NOT_TESTED
OPEN_AFTER_UPLOAD = NOT_TESTED
UGC = NOT_TESTED
WATCH_PLAYBACK = NOT_TESTED
PLAYBACK_STABILITY = NOT_TESTED
IOS_RELEASE_BLOCKERS = WAITING_FOR_BUILD5_INSTALL
EAS_BUILD_ID = 4c341dcb-b4a8-4549-b50e-5eeb79293b36
OPERATOR_ACTION_THIS_TURN = INSTALL_TESTFLIGHT_1.0.0_5
OPERATOR_INSTALL_BUILD5 = ASK_NOW
```
