# PC2_IOS_BUILD4_SAVE_FAIL_REPORT

Copy of the mobile-branch report. Authoritative commits live on
`origin/pc2/a2-open-watch-published-post-v1` in the mobile worktree
`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a2-open-watch-v1`.

```text
PC2 REPORT
SOURCE_DEVICE = PC2
TASK_ID = PC2_IOS_BUILD4_SAVE_FAIL_SOURCE_FIX_V1
DATE = 2026-08-15
MODE = SOURCE_FIX_ONLY
AUTHORIZED_IOS_SOURCE_SHA_BUILD4 = edc898fb5b3549ae31d8b05824d9e9840f825bae
LOCATION_PURPOSE_ANCESTOR = 6733cd5dd2a97e3415dbb1ddb76ab6e4d3811045
REMOTE_REF = origin/pc2/a2-open-watch-published-post-v1
DIVERGED_CHECKOUT_77e9e28_USED = NO
CURSOR_REPORT_OVERWRITTEN = NO
STORE_WIP_TOUCHED = NO
BUILD5_BUILT = NO
DEVICE_PASS_INVENTED = NO
```

## FINAL FIELDS

```text
SAVE_ROOT_CAUSE = toggle_post_save is SECURITY INVOKER; other-user save calls award_um_points_to_user / try_award_activity_score which 20260723 revoked from authenticated; insert rolls back; V5 alert surfaces "Unable to update save."
SAVE_FIX_COMMITTED = YES
SAVE_FIX_SHA = 831936cf1816d7d3cceb95a03cb300df9e8bc5ec
SAVE_STRENGTHEN_SHA = 9c1744a8592522e4d481c5374eedba97c0b54370
SAVE_CORE_INDEPENDENT_OF_SIDE_EFFECTS = YES — client never calls toggle_post_save / award / notification; count-read failure cannot fail a successful bookmark write
UNSAVE_SOURCE_STATE = IMPLEMENTED — delete viewer post_saves row via RLS
SAVE_PERSISTENCE_SOURCE_STATE = IMPLEMENTED — Watch reload reads post_saves via loadViewerInteractionState; posts.saves via DEFINER sync_post_saves_count
SAVE_FIX_APPLIED = YES — mobile togglePostSave writes post_saves via RLS; no longer calls toggle_post_save
TESTS = PASS — mobile vitest 24 passed (interactions + watchFeed.map + deleteOwnedPost)
TYPECHECK = PASS — mobile npx tsc --noEmit
BUILD5_SOURCE_CONTAINS_SAVE_FIX = YES
BUILD5_REQUIRED = YES — Build 4 binary is edc898f and still calls the broken RPC
BLOCKERS = NEW_IOS_BINARY_REQUIRED_FOR_DEVICE_RETEST; PRODUCTION_RPC_STILL_BROKEN_FOR_OTHER_USER_SAVE_SIDE_EFFECTS
SAVED = FAIL_ON_BUILD4 — source fixed; not retested on device
```

## Root cause

Production `toggle_post_save` (`20260721_activity_tiers_event_wiring.sql`) is
`SECURITY INVOKER`. Saving another user's post then calls
`award_um_points_to_user` and `try_award_activity_score`.
`20260723_um_points_award_security.sql` revoked those from `authenticated`.
The `post_saves` insert rolls back. Build 4 / V5 alert is the surfaced error,
not a separate UI bug.

`post_saves` RLS still allows the viewer's own bookmark row. Mobile uses
that path (`831936c`). `9c1744a` keeps the write path and adds error /
persistence / side-effect isolation tests plus an optional count-read
fallback. Creator notification / UM Points will not fire until Central
converts the RPC to `SECURITY DEFINER` (or drops the revoked calls). Web
`lib/supabase/socialInteractions.ts` still uses the broken RPC (out of this
mobile scope).

Do not invent device PASS. Build 5 is required for iPhone retest.
Build 4 still fails until a new binary.
