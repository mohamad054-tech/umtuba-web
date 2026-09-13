# PC2-A2 V5 — Complete iOS source fix sweep

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_SOURCE_SWEEP
TASK_ID = PC2_IOS_COMPLETE_RELEASE_FIX_SWEEP_V5
DATE = 2026-08-15
MODE = EXECUTION_FIRST / COMPLETE_SOURCE_FIX
IOS_REBUILD = NOT_RUN
REUPLOAD_BUILD_3 = NOT_RUN
APP_STORE_REVIEW_SUBMIT = NOT_RUN
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
```

## Required return fields

```text
OPEN_WATCH_FIX = PRESERVED @ e87668e7ee664243b3bd788c850e67b912ef9d44
MESSAGES_FIX = PRESERVED @ 73e4723decdb2af96df4895afc41e367117dd02e; SUBSCRIBED_GUARD @ edc898fb5b3549ae31d8b05824d9e9840f825bae
AUTH_STATE = SOURCE_FIXED; LOGIN_SIGNUP_EMAIL_CONFIRM_TO_PROFILE_TAB; COLD_START_STILL_WATCH; LOGOUT_TO_LOGIN
LOGIN_REDIRECT = SOURCE_FIXED_TO_/(tabs)/profile
PROFILE_STATE = SOURCE_FIXED; ?u= TARGETS_OTHER_USER; OWN_PROFILE_AND_SETTINGS_UNCHANGED
SAVED_STATE = SOURCE_PRESENT_AUTH_RPC; FAILURES_NOW_ALERT_NOT_SWALLOWED
FOLLOW_STATE = SOURCE_ADDED_FOLLOW_FOLLOWING_ON_OTHER_PROFILE; RPC_toggle_profile_follow
WATCH_STATE = PLAYBACK_PRESERVED; RAIL_COMPACTED; VOLUME_CLEARED_FROM_RAIL_COLUMN
WATCH_CONTROLS_CLASSIFICATION = LIKE_SAVE_DELETE_REPORT_BLOCK=PASS_SOURCE; COMMENTS_SHARE=UX_DEBT_DISABLED; DENSITY=UX_DEBT_MITIGATED; FOLLOW_ON_WATCH_RAIL=NOT_ADDED
CREATE_UPLOAD_STATE = PRESERVED_NOT_MODIFIED
CREATE_CAPABILITY_CLASSIFICATION = WRITE_POST=POST_RELEASE_PRODUCT_EXPANSION; TEXT_ONLY=POST_RELEASE_PRODUCT_EXPANSION; OPTIONAL_IMAGE=POST_RELEASE_PRODUCT_EXPANSION; PRE_PUBLISH_EDITOR=POST_RELEASE_PRODUCT_EXPANSION; OVERLAY=POST_RELEASE_PRODUCT_EXPANSION; EMOJI_STICKER=POST_RELEASE_PRODUCT_EXPANSION
MESSAGES_STATE = SOURCE_FIXED_AT_73e4723; EXTRA_SUBSCRIBED_GUARD; DEVICE_NOT_REVERIFIED
ACCOUNT_DELETION_STATE = LIVE_200; ANDROID_WORDING_CONFIRMED_ON_PRODUCTION; THIS_WEB_TREE_HAS_NO_PAGE; NOT_FIXED
UGC_REPORT_STATE = SOURCE_BOUND_20260928; NO_NEW_DEFECT
UGC_BLOCK_STATE = SOURCE_BOUND_20260928; NO_NEW_DEFECT
VIDEO_DELETE_STATE = OWNER_ALERT_PATH_PRESERVED; RAIL_COMPACTED; DEVICE_CLIPPING_NOT_TESTED
PHOTO_PERMISSION = USED_BY_CREATE; KEPT
CAMERA_PERMISSION = UNUSED; REMOVED_FROM_APP_CONFIG_PLUS_BLOCKED
MIC_PERMISSION = UNUSED; REMOVED_FROM_APP_CONFIG_PLUS_BLOCKED
BACKGROUND_RESUME_SOURCE_STATE = EXISTING_WATCH_CREATE_MESSAGES_HANDLERS; NO_PROVEN_DEFECT_FIXED
NETWORK_ERROR_STATE = SAVE_LIKE_NOW_ALERT; OTHER_SURFACES_UNCHANGED
CRASH_SWEEP = HIGH_CONFIDENCE_ONLY; MESSENGER_SUBSCRIBED_GUARD; NO_NEW_CRASH_FOUND
ALL_CONFIRMED_RELEASE_DEFECTS = LOGIN_TO_WATCH; PROFILE_IGNORES_U; FOLLOW_UI_ABSENT; SAVE_LIKE_SILENT_FAIL; WATCH_RAIL_DENSITY; UNUSED_CAMERA_MIC; MESSENGER_ON_AFTER_SUBSCRIBE_ALREADY_FIXED; ACCOUNT_DELETION_ANDROID_WORDING_LIVE
ALL_FIXES_IMPLEMENTED = LOGIN_TO_PROFILE_TAB; PROFILE_U_TARGETING; FOLLOW_FOLLOWING_CONTROL; SAVE_LIKE_ALERTS; WATCH_RAIL_COMPACT; CAMERA_MIC_REMOVED; MESSENGER_SUBSCRIBED_GUARD
POST_RELEASE_ITEMS = WRITE_POST; TEXT_ONLY_POST; OPTIONAL_IMAGE; VIDEO_EDITOR; TEXT_OVERLAY; EMOJI_STICKER; ACCOUNT_DELETION_COPY_OTHER_LINEAGE
TARGETED_TESTS = 15 files / 91 PASS (pre-tsc-fix suite); 6 files / 22 PASS (new+permissions+messenger after tsc fix)
FULL_REGRESSION = 54 files / 412 PASS / 1 FAIL PREEXISTING wallet locale (Arabic numerals ١٬٢٣٤); NOT INTRODUCED
TYPECHECK = PASS
LINT = PASS (npm run lint = tsc --noEmit)
FINAL_BRANCH = pc2/a2-open-watch-published-post-v1
FINAL_COMMIT = edc898fb5b3549ae31d8b05824d9e9840f825bae
REMOTE_REF = origin/pc2/a2-open-watch-published-post-v1
REMOTE_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
UNCOMMITTED_RELEASE_FIXES = NO
ALL_RELEASE_CRITICAL_FIXES_IN_SOURCE = YES
IOS_REBUILD_REQUIRED = YES
IOS_REBUILD_READY = READY
IOS_NEW_BUILD_GO_REQUEST = READY
APP_STORE_SUBMITTED = NO
BLOCKERS = NEW_MOBILE_BUILD_REQUIRED_TO_REVERIFY_ON_DEVICE; BUILD_3_DOES_NOT_CONTAIN_THESE_FIXES; ACCOUNT_DELETION_ANDROID_WORDING_ON_LIVE_OTHER_LINEAGE; ASC_AGE_RATING_NOT_TOUCHED; DEVICE_QA_NOT_RUN_THIS_SESSION
```

`IOS_REBUILD_READY = READY` means accepted **mobile** source defects are committed, targeted tests and `tsc --noEmit` pass, and a **new binary** is still required before any device PASS. Do not treat TestFlight Build 3 as containing this sweep. Do not Submit for Review from this session.

---

## 1. Preserve first

```text
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a2-open-watch-v1
BRANCH = pc2/a2-open-watch-published-post-v1
PRE_SWEEP_HEAD = 73e4723decdb2af96df4895afc41e367117dd02e
FETCH = YES
FF_ONLY = NOT_NEEDED (already at required SHA)
RESET = NO
REBASE = NO
DIVERGED_CHECKOUT = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile @ 77e9e28 — TOUCHED = NO
```

Required ancestors remain first parents:

1. `e87668e` Open Watch published-post focus
2. `73e4723` Messages realtime `.on()` after subscribe

Local identity reused (repo-local only, not global): `Admin <mohamad054@gmail.com>`.

---

## 2. Confirmed source defects and what was done

| # | Defect | Proof | Fix | Commit |
| --- | --- | --- | --- | --- |
| 1 | Successful login/signup/email-confirm → Watch | `login.tsx` / `signup.tsx` / `_layout.tsx` `replace("/(tabs)/watch")`. Requirement: Profile. Root `/profile` is outside tabs. | Shared `POST_AUTH_HREF = "/(tabs)/profile"`. Visible Profile tab. IdentityHeader → tab Profile. Cold start `app/index.tsx` still Watch. | `42bbd28` |
| 2 | `/profile?u=` ignored | Screen used only `useAuth()` self profile. Watch / deep links / notifications already push `?u=`. | `resolveProfileTarget` + `getProfileByUsername`. Other user hides email/Settings. Own + Settings unchanged. | `9202978` |
| 3 | Follow UI absent | No Follow/Following/Unfollow string. Web already has `toggle_profile_follow` / `get_profile_follow_snapshot`. | Smallest other-profile control. Label `Following`, never `Unfollow`. | `9202978` |
| 4 | Save/Like silent fail | Authenticated RPC path existed; `if (!result.ok) return` swallowed errors. | `Alert.alert` on failure. Persistence path unchanged. | `88978a5` |
| 5 | Watch rail density / delete clipping risk | Cell `overflow: hidden`; 5–6 actions at 48+18; 240px volume in the same right column. Source-proven overlap on small heights. | 44pt / 8 gap; volume `right: 68` width 180. Playback untouched. | `88978a5` |
| 6 | Unused CAMERA / RECORD_AUDIO | Create uses `launchImageLibraryAsync` only. Live fail-closed. iOS already had no camera/mic usage strings. Android still declared both. Prior worktree `umtuba-mobile-pc2-a3-permissions-v2` had the same patch uncommitted. | Incorporated onto this branch: remove + `blockedPermissions`. | `652ef7f` |
| 7 | Messenger `.on()` after subscribe | Build 3 device FAIL. Already fixed at `73e4723`. | Preserved. Extra reject of `subscribed` / `SUBSCRIBED` + tests. | `edc898f` |
| 8 | Account deletion “You do not need the Android app” | Live `https://umtuba.com/account-deletion` **200**, sentence confirmed in HTML this session. This web tree has **no** `account-deletion` source (other deploy lineage). | **Not fixed.** Documented. No second deletion backend. | — |

Create upload, UGC report/block, Open Watch `?post=` focus, and Messages thread/inbox channel split were inspected and **not** rewritten except the extra messenger guard.

---

## 3. Path-by-path

### AUTH

Signup / login / email-confirm now `replace` / `Redirect` to `/(tabs)/profile`. Failed login still shows inline error. Logout still `replace("/(auth)/login")`. Session restore / cold start still Watch (main feed). Password recovery still update-password. Deep links unchanged except email-confirm destination.

### PROFILE

`?u=` empty or self → own profile (Rewards / Notifications / Settings). Other username → public `profiles` row, no email, no own shortcuts, Follow/Following. Missing user → “Profile not found”. Stack `/profile` remains for Watch author taps.

### SAVED

`toggle_post_save` + `post_saves` hydration unchanged. Authenticated toggle now surfaces RPC errors. Unauthenticated still auth-gated by RPC. No separate Saved tab exists; state is on Watch ★.

### FOLLOW

API already existed (web RPCs). Mobile now calls them from other-user profile only. Not added to the Watch rail (would worsen density). Self-follow cannot appear (`resolveProfileTarget` treats self `?u=` as own).

### WATCH

Playback / `?post=` focus / owner Delete Alert / Report / Block unchanged in behavior. Comments and Share remain disabled (“coming soon”) = **UX_DEBT**, not a release blocker. Dense rail = **UX_DEBT** mitigated in source; **do not invent device PASS**.

### CREATE

Library video → caption → UGC ack → upload → publish → Open Watch. Not modified. Write Post / text-only / optional image / trim editor / overlay / emoji-sticker = **POST_RELEASE_PRODUCT_EXPANSION**. No existing iOS 1.0 contract requires them.

### MESSAGES

`73e4723` preserved (thread topic vs inbox topic; skip `.on()` on joined/joining). Now also skip `subscribed`. Tests still prove list+thread reuse does not throw. Build 3 still has the original fatal. Device re-verify needs a new binary.

### ACCOUNT DELETION

Settings still opens allowlisted `https://umtuba.com/account-deletion`. Live page 200. Confirmed copy: “You do not need the Android app.” No `account-deletion` files under Desktop `\umtuba` or this web tree. Central must patch the live lineage. Operator account was not deleted.

### UGC

Report/block still 20260928 RPCs with owner-hide rules. Blocked list screen unchanged. ASC age-rating answers **not** changed.

### DELETE VIDEO

Owner-only rail + system confirm/cancel. Rail compacted so Delete is less likely to clip on small iPhones. No real content deleted. Device clipping **NOT_TESTED**.

### PERMISSIONS

| Permission | State |
| --- | --- |
| Photo library | Used by Create. Kept. iOS usage string unchanged. |
| CAMERA | Unused. Removed from `android.permissions`. Blocked so plugins cannot re-add. |
| RECORD_AUDIO | Unused. Same. |
| iOS NSCamera / NSMicrophone | Already absent. Unchanged. |

Rebuild required for the binary to drop Android leftovers. IPA not edited.

### BACKGROUND / NETWORK / CRASH

Watch / Create / Messages already had AppState handlers. No additional proven lifecycle bug. Save/Like network failures now alert. Crash sweep: null session, missing `?u=` user, messenger re-subscribe, publish nav — high-confidence only; no extra speculative rewrite.

### APP STORE SOURCE ALIGNMENT

Product has UGC and messaging. This agent did **not** change ASC questionnaire, listing, or submit review. Age rating remaining false is an operator/ASC item, not a source edit.

---

## 4. Git

```text
AUTHOR = Admin <mohamad054@gmail.com>
FORCE_PUSH = NO
MERGE_77e9e28 = NO
COMMITS =
  42bbd28fd396b8bfc62003b841e8b00178da86fa fix(ios): route successful login to the Profile tab
  9202978575da2ec0611de22ff9efabcb6a9f8de1 fix(ios): honor /profile?u= and add Following control
  88978a560c47ccefc8ec5a4aaa249aa009c4d866 fix(ios): surface save errors and compact Watch rail
  652ef7f883fd4a905159b4b7925f7bac89fef96e fix(ios): drop unused CAMERA and RECORD_AUDIO permissions
  edc898fb5b3549ae31d8b05824d9e9840f825bae fix(ios): reject messenger callbacks after subscribed
PUSH = git push -u origin HEAD
REMOTE_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
LOCAL_HEAD_MATCHES_REMOTE = YES
WORKING_TREE = CLEAN
```

`73e4723` and `e87668e` are ancestors of `edc898f`.

---

## 5. Tests / TypeScript

```text
npx vitest run <15 targeted files> = 15 files / 91 PASS
npx vitest run <6 new/changed suites after tsc fix> = 6 files / 22 PASS
npx vitest run (full) = 54 files / 412 PASS / 1 FAIL
  FAIL = src/lib/wallet/format.test.ts “uses locale grouping”
  Received = '١٬٢٣٤' (machine locale). File not modified this sweep.
npx tsc --noEmit = PASS
git diff --check = PASS
npm run build / EAS / iOS rebuild = NOT_RUN
```

Do not declare device PASS. Do not declare the pre-existing wallet locale test as fixed.

---

## 6. Security

- No secrets, `.env`, Apple keys, or service-role use.
- Follow/profile reads use existing public `profiles` + authenticated follow RPCs.
- Other-user profile does not show the viewer email.
- Account deletion still opens the allowlisted Central URL only.
- Permissions only removed unused camera/mic declarations.
- Diverged `77e9e28` checkout not reset/merged.
- `docs/ai/CURSOR_REPORT.md` not overwritten.

## Migrations created

None.

## Exact files changed (mobile, committed + pushed)

Auth / Profile tab: `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/profile.tsx`, `components/IdentityHeader.tsx`, `src/lib/auth/postAuthDestination.ts`, `src/lib/auth/postAuthDestination.test.ts`

Other-user + Follow: `app/profile/index.tsx`, `src/lib/auth/profile.ts`, `src/lib/profile/resolveTarget.ts`, `src/lib/profile/resolveTarget.test.ts`, `src/lib/social/follows.ts`, `src/lib/social/follows.test.ts`

Watch: `app/(tabs)/watch.tsx`, `components/WatchVideoCard.tsx`, `src/lib/watch/railLayout.ts`, `src/lib/watch/railLayout.test.ts`

Permissions: `app.config.ts`, `src/lib/ios/appStoreConfig.test.ts`

Messages: `src/lib/messenger/realtimeSubscribe.ts`, `src/lib/messenger/realtimeSubscribe.test.ts`

### Web (this report only)

- `docs/ai/PC2_A2_V5_SWEEP_REPORT.md` (this file)

Store product files, assetlinks uncommitted files, and `CURSOR_REPORT.md` were not touched.

---

## Open issues

1. **New iOS binary required.** Build 3 still has Open Watch, conversation-open, login→Watch, ignored `?u=`, no Follow, silent save errors, dense rail, and Android camera/mic leftovers.
2. **Device QA not run this session.** Do not invent PASS for login, Follow, Saved, delete clipping, or Messages send/receive.
3. **Live account-deletion copy** still says “You do not need the Android app.” Source is another deploy lineage.
4. **ASC age rating** still marks UGC/messaging false (operator). Not edited here.
5. **Do not use / reset `77e9e28`.**

---

## Verdict

```text
OPEN_WATCH_FIX = PRESERVED
MESSAGES_FIX = PRESERVED_PLUS_SUBSCRIBED_GUARD
LOGIN_REDIRECT = SOURCE_FIXED_TO_PROFILE_TAB
PROFILE_STATE = SOURCE_FIXED
FOLLOW_STATE = SOURCE_ADDED
ALL_RELEASE_CRITICAL_FIXES_IN_SOURCE = YES
UNCOMMITTED_RELEASE_FIXES = NO
FINAL_COMMIT = edc898fb5b3549ae31d8b05824d9e9840f825bae
REMOTE_SHA = edc898fb5b3549ae31d8b05824d9e9840f825bae
IOS_REBUILD_REQUIRED = YES
IOS_REBUILD_READY = READY
IOS_NEW_BUILD_GO_REQUEST = READY
APP_STORE_SUBMITTED = NO
NEXT = CENTRAL_GO_FOR_NEW_IOS_BUILD_THEN_DEVICE_REVERIFY
```
