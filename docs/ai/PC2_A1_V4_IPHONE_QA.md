# PC2-A1 V4 — Complete real iPhone QA

Build 3 history is preserved below. **Device under test is now TestFlight Build 4.** Do not copy Build 3 PASS/FAIL forward except as historical notes.

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_FINAL_QA
TASK_ID = PC2_IOS_BUILD4_COMPLETE_REAL_DEVICE_QA_V4
DATE = 2026-08-15
MODE = IOS FINAL QA
TESTFLIGHT_BUILD = 4
PHYSICAL_DEVICE = iPhone 13
BUILD4_BINARY_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
SAVE_FIX_SOURCE = 831936c (NOT IN BUILD 4)
COMMIT_CREATED = NO
PUSHED = NO
REBUILD = NOT_RUN
REUPLOAD_BUILD_4 = NOT_RUN
BUILD5_STARTED = NO
APP_STORE_REVIEW_SUBMIT = NOT_RUN
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
STORE_WIP_CHECKOUT_RESET = NO
PR_WORK = STOPPED
CONTINUES = docs/ai/PC2_IOS_BUILD4_REPORT.md
PAUSED_FOR = ONE_OPERATOR_TAP_OWN_PROFILE
```

## Build 4 device evidence (2026-08-15, operator-confirmed)

Do not invent PASS. Do not claim `831936c` as device PASS.

```text
IPHONE13_INSTALL = PASS
MESSAGES_OPEN = PASS
MESSAGES_SEND = PASS
MESSAGES_RECEIVE = NOT_TESTED
SAVED = FAIL
SAVE_PERSISTENCE = BLOCKED
UNSAVE = BLOCKED
BUILD5_REQUIRED = YES
LOGIN_TO_PROFILE = NOT_TESTED
OWN_PROFILE = NOT_TESTED
FOLLOW = NOT_TESTED
FOLLOWING = NOT_TESTED
OTHER_USER_PROFILE = NOT_TESTED
OPEN_WATCH_AFTER_PUBLISH = NOT_TESTED
UGC_REPORT = NOT_TESTED
UGC_BLOCK = NOT_TESTED
ACCOUNT_DELETION = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
```

Saved FAIL is expected on this binary (`edc898f` still uses broken `toggle_post_save`). Persistence and unsave stay **BLOCKED** until Build 5.

### Operator stop (Build 4, this turn)

```text
OPERATOR_DEVICE = iPhone 13 — تطبيق UMTUBA من TestFlight، البناء 4
OPERATOR_ACTION = افتح التطبيق واضغط الدائرة الصغيرة أعلى يمين شاشة Watch (فيها حرف)
WHY_REQUIRED = نفتح ملفك الشخصي لتأكيد أنك داخل الحساب قبل اختبار المتابعة وملف مستخدم آخر
```

Do **not** sign out. Do **not** delete the account. Reply with what you see (name / @username / Sign in / something else). Do not retest Messages open/send except a one-line smoke if state changes.

```text
MESSAGES_OPEN = PASS
MESSAGES_SEND = PASS
SAVED = FAIL
SAVE_PERSISTENCE = BLOCKED
BUILD5_REQUIRED = YES
PR_WORK = STOPPED
ANDROID_PR_BRANCH_PRESERVED = YES @ 8c764fb
BACKUP_REF_PRESERVED = YES refs/backup/pre-split-20260815220941 @ c13031d
NEXT = OPERATOR_TAP_WATCH_TOP_RIGHT_AVATAR_CIRCLE
BLOCKERS = SAVED_FAIL_ON_BUILD4_BINARY_EDC898F; BUILD5_REQUIRED_FOR_SAVE_RETEST; REMAINING_IPHONE_QA_NOT_TESTED
```

---

# Build 3 archive (do not treat as Build 4 verdicts)

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_FINAL_QA
TASK_ID = PC2_IOS_BUILD3_COMPLETE_REAL_DEVICE_QA_V4
DATE = 2026-08-15
MODE = IOS FINAL QA
TESTFLIGHT_BUILD = 3
PHYSICAL_DEVICE = iPhone 13
COMMIT_CREATED = NO
PUSHED = NO
REBUILD = NOT_RUN
REUPLOAD_BUILD_3 = NOT_RUN
APP_STORE_REVIEW_SUBMIT = NOT_RUN
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
STORE_WIP_CHECKOUT_RESET = NO
CONTINUES = docs/ai/PC2_A2_V3_IPHONE_QA.md
PAUSED_FOR = ONE_OPERATOR_TAP_OWN_PROFILE
```

## Central decisions observed

```text
CONTINUE_BUILD_3_REAL_IPHONE_QA = YES
IOS_REBUILD_NOW = NO
BUILD_3_REUPLOAD = NO
APP_STORE_SUBMISSION_NOW = NO
```

## Session status (Build 3 archive)

Physical QA on Build 3 was **not complete**. Build 4 is now the DUT. See the Build 4 evidence block at the top of this file.

```text
REAL_IPHONE_BUILD3_QA_COMPLETE = NO
OPEN_WATCH_FAIL_CONFIRMED = YES
SUPERSEDED_BY = BUILD_4
```

---

## Operator stop (Build 3 archive — superseded)

The live tap is Build 4 own-Profile at the top of this file. This Build 3 prompt is historical only.

```text
OPERATOR_DEVICE = iPhone 13 — تطبيق UMTUBA من TestFlight، البناء 3
OPERATOR_ACTION = (superseded) افتح التطبيق واضغط الدائرة الصغيرة أعلى يمين شاشة Watch (فيها حرف)
WHY_REQUIRED = historical Build 3 pause; do not run this as the current tap
```

---

## Confirmed device evidence (do not redo except smoke)

Operator-reported on iPhone 13 / TestFlight Build 3 (`docs/ai/PC2_A2_V3_IPHONE_QA.md` and the 2026-08-15 evening QA update):

| Check | Device verdict | Evidence |
| --- | --- | --- |
| Install | **PASS** | TestFlight Build 3 installed |
| Launch | **PASS** | App opened |
| Watch playback | **PASS** | Video + audio played |
| Discover | **PASS** | Discover loaded |
| Create UI | **PASS** | Create screen used |
| Photo library permission | **GRANTED** | Smoke only this session — already used for real pick |
| Real video select / upload / publish | **PASS** | iPhone QuickTime ~9.5 MB / ~8.2 s, Arabic caption, Terms accepted, “Video published.” Operator confirmed the video exists on the platform |
| Open Watch after publish | **FAIL** | Operator: Open Watch opened the normal Watch feed and did **not** surface the new post |

### Open Watch FAIL (operator-confirmed; A2 owns the fix)

```text
REPRO = Publish succeeds → tap Open Watch
EXPECTED = Watch focuses the newly published post (?post= / first item)
ACTUAL = Bare Watch tab / normal feed; new post not focused
SCREENSHOT = NONE_THIS_SESSION (operator verbal + prior V3 writeup)
OWNING_AREA = app/(tabs)/create.tsx router.replace("/(tabs)/watch") drops publishVideoPost.postId
BUILD_3_STILL_HAS_DEFECT = YES
DO_NOT_FIX_ON_DEVICE = OBSERVED
```

Identical on mobile SoT `origin/master` `09e94f8` and App Store SHA `4eede0b`. A2 already has an uncommitted source fix on `pc2/a2-open-watch-published-post-v1`. This QA does **not** retest it as PASS.

### Conversation open FAIL (operator-confirmed; A2 owns the fix)

```text
REPRO = Messages list loads → tap an existing conversation
EXPECTED = Thread opens; realtime can attach
ACTUAL = Fatal “Something went wrong”; error references adding a realtime messenger callback after subscribe()
MESSAGES_LIST = PASS
CONVERSATION_OPEN = FAIL
MESSAGES_REALTIME = FAIL
MESSAGE_SEND_RECEIVE = BLOCKED
BUILD_3_STILL_HAS_DEFECT = YES
DO_NOT_FIX_ON_DEVICE = OBSERVED
```

A2 source fix is `73e4723` on `pc2/a2-open-watch-published-post-v1` (after Open Watch `e87668e`). This QA does **not** retest conversation open as PASS.

Authenticated session at publish time is **implied** by a successful owner publish, but login UI, logout/login, and post-login destination were **never watched**. Those stay **NOT_TESTED**.

---

## QA matrix (Build 3, iPhone 13)

| # | Check | Device | Notes |
| --- | --- | --- | --- |
| — | Install | **PASS** | Prior operator |
| — | Launch | **PASS** | Prior operator |
| — | Watch / video / audio | **PASS** | Prior operator |
| — | Discover | **PASS** | Prior operator |
| — | Create UI / pick / upload / publish | **PASS** | Prior operator |
| — | Open Watch after publish | **FAIL** | Operator-confirmed; A2 owns fix |
| 1 | Signup | **NOT_TESTED** | No signup screen observed this campaign |
| 2 | Login | **NOT_TESTED** | Login form not exercised on camera |
| 3 | Authenticated session (visible) | **NOT_TESTED** | Publish implies a session existed; Profile UI not seen |
| 4 | Post-login navigation | **NOT_TESTED** | Waiting on Profile tap, then later Sign out → Sign in |
| 5 | Login destination = Profile | **NOT_TESTED** | **FAIL if lands Watch/Discover.** Source on Build 3 sends login/signup/index to `/(tabs)/watch` — device must still confirm |
| 6 | Saved button | **NOT_TESTED** | Watch right rail ★ / accessibility “Save” — not pressed |
| 7 | Authenticated video save | **NOT_TESTED** | |
| 8 | Save persistence | **NOT_TESTED** | |
| 9 | Follow | **NOT_TESTED** | No Follow control on Watch card or own Profile in Build 3 source; World sheet type only. Device must still look |
| 10 | Follow → Following (not Unfollow) | **NOT_TESTED** | |
| 11 | Unfollow interaction | **NOT_TESTED** | |
| 12 | Follow persistence | **NOT_TESTED** | |
| 13 | Other-user Profile | **NOT_TESTED** | Watch can push `/profile?u=…`; Profile screen in source ignores `u` and always shows the signed-in user. Device must confirm |
| 14 | Own Profile | **NOT_TESTED** | Next tap: top-right Watch avatar circle |
| 15 | Settings | **NOT_TESTED** | Own Profile → Settings |
| 16 | Messages list | **PASS** | Conversations load. Opening a thread is a separate FAIL |
| 16a | Conversation open | **FAIL** | Existing thread → fatal “Something went wrong”; realtime callback after subscribe(). A2 owns source fix `73e4723`. Build 3 still defective |
| 16b | Messages realtime / send / receive | **FAIL / BLOCKED** | Blocked by conversation-open crash. Do not infer PASS |
| 17 | Account deletion | **NOT_TESTED** | Inspect UI only. Settings → Delete account opens the web deletion page. **Do not confirm-delete the operator account** |
| 18 | UGC report | **NOT_TESTED** | Watch ⚑ Report on others’ videos |
| 19 | UGC block | **NOT_TESTED** | Watch ⊘ Block on others’ videos |
| 20 | Video delete menu | **NOT_TESTED** | ⌫ Delete on **own** video only |
| 21 | Menu clipping at edges | **NOT_TESTED** | |
| 22 | Photo permission | **GRANTED** (smoke) | Already used; no re-prompt expected |
| 23 | Camera permission | **NOT_TESTED** | Live tab hidden on iOS (`href: null`). Record what happens if any camera prompt appears |
| 24 | Microphone permission | **NOT_TESTED** | No Create-record path observed; Live hidden |
| 25 | Background / resume | **NOT_TESTED** | |
| 26 | Offline / network error | **NOT_TESTED** | Safe Airplane Mode later; do not wipe data |
| 27 | Crash / regression sweep | **NOT_TESTED** | No TestFlight crash report pulled this turn |

---

## Watch right-side controls

```text
WATCH_RIGHT_CONTROLS = NOT_TESTED
```

Not classified PASS / UX_DEBT / RELEASE_BLOCKER from source. Device visual not described this campaign.

Source layout on Build 3 `WatchVideoCard` (for the later look, not a verdict): right rail ♥ Like, ★ Save, disabled comments/share, optional Delete/Report/Block; plus a **240px-wide** volume slider on the right. That is the density to photograph when Watch is on screen again.

---

## Source hints (not device PASS/FAIL)

Read from Open Watch worktree based on `origin/master` `09e94f8` / same login files as App Store SHA `4eede0b`. **Not** the diverged `77e9e28` checkout.

| Topic | Source fact | Device status |
| --- | --- | --- |
| Login / signup / cold start | `router.replace("/(tabs)/watch")` and `<Redirect href="/(tabs)/watch" />` | LOGIN_DESTINATION **NOT_TESTED** — predicted Watch, required Profile |
| Own Profile entry | Watch `IdentityHeader` top-right circle, accessibility “Open profile” | Next tap |
| Settings | Profile → Settings. Rows include Sign out, Delete account (external web) | NOT_TESTED |
| Saved | Watch ★ `Save` / `Unsave` | NOT_TESTED |
| Follow | No Follow/Following/Unfollow string in Watch card or `app/profile` | NOT_TESTED |
| Other profile | `/profile?u=` ignored; own profile only | NOT_TESTED |
| Account deletion | Settings opens support `accountDeletion` URL in Safari — inspect only | NOT_TESTED |
| Live / camera | iOS Live tab `href: null` | NOT_TESTED |

---

## Exact files changed

Web repo only:

- `docs/ai/PC2_A1_V4_IPHONE_QA.md` (this file; new)

`docs/ai/CURSOR_REPORT.md` and `docs/ai/CURRENT_TASK.md` were **not** overwritten. No Store product files touched. No mobile checkout/reset. No rebuild / re-upload / App Store submit.

## Migrations created

None.

## Security review

- No secrets, `.env`, Apple keys, or account passwords printed.
- Account deletion: inspect-only unless a disposable account is later supplied.
- Did not ask the operator to delete the live account.

## Tests / TypeScript / Build

Not run (docs-only QA pause; no product change).

## git diff --check

Not required for this new untracked report.

## Open issues

1. **Open Watch after publish = FAIL** — operator-confirmed; A2 owns source fix; Build 3 still defective.
2. **Conversation open = FAIL** — list PASS; opening a thread → fatal “Something went wrong” (realtime callback after subscribe). A2 source fix `73e4723` on `pc2/a2-open-watch-published-post-v1`. Build 3 still defective. Send/receive **BLOCKED**, not PASS.
3. **Remaining physical QA incomplete** — paused for one Profile tap.
3. **Login destination** — required Profile; Build 3 source sends Watch. Confirm on device after Sign out → Sign in (later tap, not this one).
4. **Follow / other-user Profile** — likely missing or own-profile-only in source; still NOT_TESTED on device.
5. **No iOS remote control from PC2** — USB MTP/photos only in prior V3; cannot tap the app from Windows.

---

## Final fields (Build 3 archive)

Superseded for DUT. Live Build 4 fields are at the top of this file and in `docs/ai/PC2_IOS_BUILD4_REPORT.md`.

```text
REAL_IPHONE_BUILD3_QA_COMPLETE = NO
SUPERSEDED_BY = BUILD_4
PASS_LIST = INSTALL; APP_LAUNCH; WATCH_PLAYBACK; VIDEO; AUDIO; DISCOVER_LOAD; CREATE_UI; PHOTO_LIBRARY_PERMISSION=GRANTED; CREATE_UPLOAD; VIDEO_PUBLISHED_TO_PLATFORM; MESSAGES_LIST; CONVERSATIONS_LOAD
FAIL_LIST = OPEN_WATCH_AFTER_PUBLISH; CONVERSATION_OPEN; MESSAGES_REALTIME
NOT_TESTED_LIST = SIGNUP; LOGIN; AUTHENTICATED_SESSION_VISIBLE; POST_LOGIN_NAV; LOGIN_DESTINATION; SAVED; SAVE_PERSISTENCE; FOLLOW; FOLLOW_FOLLOWING; UNFOLLOW; FOLLOW_PERSISTENCE; OTHER_USER_PROFILE; OWN_PROFILE; SETTINGS; ACCOUNT_DELETION; UGC_REPORT; UGC_BLOCK; VIDEO_DELETE_MENU; MENU_CLIPPING; CAMERA_PERMISSION; MICROPHONE_PERMISSION; BACKGROUND_RESUME; NETWORK_ERRORS; CRASH_SWEEP; WATCH_RIGHT_CONTROLS
WATCH_RIGHT_CONTROLS = NOT_TESTED
OPEN_WATCH_FAIL_CONFIRMED = YES
LOGIN_DESTINATION = NOT_TESTED
SAVED = NOT_TESTED
FOLLOW_FOLLOWING = NOT_TESTED
UGC = NOT_TESTED
MESSAGES_LIST = PASS
CONVERSATION_OPEN = FAIL
MESSAGES_REALTIME = FAIL
MESSAGE_SEND_RECEIVE = BLOCKED
ACCOUNT_DELETION = NOT_TESTED
DELETE_MENU_CLIPPING = NOT_TESTED
BACKGROUND_RESUME = NOT_TESTED
CRASH = NOT_TESTED
BLOCKERS = SUPERSEDED_BY_BUILD_4; SEE_PC2_IOS_BUILD4_REPORT
NEXT = SEE_BUILD4_OWN_PROFILE_TAP
```
