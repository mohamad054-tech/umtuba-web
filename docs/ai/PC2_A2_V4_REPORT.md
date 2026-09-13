# PC2-A2 V4 — Preserve + consolidate iOS fixes

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = IOS_APP_STORE_EXECUTION_PRIMARY
TASK_ID = PC2_IOS_FINAL_FIX_CONSOLIDATION_V4
DATE = 2026-08-15
MODE = FIX CONSOLIDATION
IOS_REBUILD_NOW = NO
EAS = NOT_RUN
APP_STORE_REVIEW_SUBMIT = NOT_RUN
SECRET_VALUES_PRINTED = NO
CURSOR_REPORT_OVERWRITTEN = NO
CURRENT_TASK_OVERWRITTEN = NO
STORE_PRODUCT_FILES_MODIFIED = NO
DIVERGED_CHECKOUT_USED_AS_SOT = NO
DIVERGED_CHECKOUT_RESET = NO
```

## Return fields

```text
OPEN_WATCH_FIX_PRESERVED = YES
OPEN_WATCH_COMMIT = e87668e7ee664243b3bd788c850e67b912ef9d44
REMOTE_REF = origin/pc2/a2-open-watch-published-post-v1
REMOTE_SHA = 73e4723decdb2af96df4895afc41e367117dd02e
NEW_CONFIRMED_FIXES = OPEN_WATCH_PUBLISHED_POST_FOCUS; MESSENGER_REALTIME_SUBSCRIBE_AFTER_ON
TARGETED_TESTS = messenger realtimeSubscribe + threadState + foundation = 3 files / 25 tests PASS; prior Open Watch 2 files / 19 tests PASS
TYPECHECK = PASS
IOS_FINAL_FIX_SOURCE_SHA = 73e4723decdb2af96df4895afc41e367117dd02e
IOS_REBUILD_READY = NO
CREATE_PARITY_CLASSIFICATION = SEE_SECTION
BLOCKERS = NEW_MOBILE_BUILD_REQUIRED_TO_SHIP_AND_REVERIFY_OPEN_WATCH_AND_MESSAGES; A1_V4_REMAINING_IPHONE_QA_NOT_TESTED; LOGIN_DESTINATION_SOURCE_POINTS_TO_WATCH_DEVICE_UNCONFIRMED; OTHER_USER_PROFILE_IGNORES_QUERY_U; FOLLOW_UI_ABSENT_IN_SOURCE
```

`IOS_REBUILD_READY = NO` — rebuild forbidden this session. Source for both confirmed FAILs is on `origin/pc2/a2-open-watch-published-post-v1` @ `73e4723` (Open Watch `e87668e` still first parent).

---

## 1. FIRST PRIORITY — Open Watch preservation

Worktree was **not** reset, checked out, or merged into `pc2/eas-preview-config-v1` @ `77e9e28`. That checkout is still on the diverged branch and was not used as destination.

```text
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a2-open-watch-v1
BRANCH = pc2/a2-open-watch-published-post-v1
BASE = origin/master 09e94f80775855d7e2036fa7d83d63b9202fb8a4
PRE_COMMIT_STATUS = dirty (5 files, known Open Watch patch only)
```

### Exact uncommitted diff (inspected before commit)

Minimal. 5 files, +96 / −11. No unrelated screens.

| File | Change |
| --- | --- |
| `app/(tabs)/create.tsx` | `completePublish(s, result.postId)`; Open Watch uses `openWatchAfterPublishHref(journey.publishedPostId)` |
| `src/lib/video/createJourney.ts` | `publishedPostId`; `normalizePublishedPostId`; `openWatchAfterPublishHref` → `/(tabs)/watch?post=N` |
| `src/lib/video/createJourney.test.ts` | stores id `42`; href contract; invalid id falls back to bare Watch |
| `src/lib/feed/watchFeed.ts` | `promoteFocusedWatchRow` moves/prepends focused ready post to index 0 |
| `src/lib/feed/watchFeed.map.test.ts` | in-page move, prepend, no-op without valid focus |

### Git identity

Local and global `user.name` / `user.email` were empty. Identity was set **local to this repo only** (not global) from the existing SoT author on `09e94f8` / `eb0267a`: `Admin <mohamad054@gmail.com>`. No token printed. No fake email invented.

### Commit + push

```text
COMMIT = e87668e7ee664243b3bd788c850e67b912ef9d44
MESSAGE = fix(ios): open Watch on the published post via existing ?post= focus
AUTHOR = Admin <mohamad054@gmail.com>
PUSH = git push -u origin HEAD
FORCE_PUSH = NO
REMOTE_REF = refs/heads/pc2/a2-open-watch-published-post-v1
REMOTE_SHA = e87668e7ee664243b3bd788c850e67b912ef9d44
LOCAL_HEAD_MATCHES_REMOTE = YES
```

`git ls-remote --heads origin pc2/a2-open-watch-published-post-v1` = `e87668e7ee664243b3bd788c850e67b912ef9d44`.

---

## 2. A1 V4 status (read, not blocked on)

`docs/ai/PC2_A1_V4_IPHONE_QA.md` exists. Physical QA is **not complete**. Confirmed device FAIL list is only Open Watch.

```text
A1_V4_PRESENT = YES
REAL_IPHONE_BUILD3_QA_COMPLETE = NO
FAIL_LIST = OPEN_WATCH_AFTER_PUBLISH
OPEN_WATCH_FAIL_CONFIRMED = YES
A1_NEXT = OPERATOR_TAP_WATCH_TOP_RIGHT_AVATAR_CIRCLE
```

No additional A1 device FAILs were available to consolidate. Login / Saved / Follow / other-user Profile / delete clipping / UGC remain **NOT_TESTED** on device. This session did **not** convert those to PASS or invent extra product commits.

---

## 3. Source requirement inspection (`09e94f8` / `4eede0b`)

Product files for login, profile, Create, Watch, Saved, and Watch card are **identical** on `origin/master` `09e94f8` and App Store SHA `4eede0b` (`git diff --stat` empty for those paths).

`4eede0b` is `09e94f8` plus three later commits (EAS preview Team ID + UGC test coverage). Those are not login/Create/Profile product changes. Local SoT checkout `77e9e28` was not read as destination.

| Requirement | Source fact | Device (A1 V4) | Fix this session |
| --- | --- | --- | --- |
| Login success → Profile | `login.tsx` / `signup.tsx` `replace("/(tabs)/watch")` and session `Redirect` to Watch. Cold start `app/index.tsx` also Watch. | NOT_TESTED (A1: FAIL **if** lands Watch; must still confirm) | **NO.** Source mismatch vs written requirement is real, but `/profile` is a **root Stack screen outside tabs**. Naive `replace("/profile")` can strand the user without tab chrome. Wait for A1 FAIL + a safe path (tabs first, then push Profile). |
| Saved works for authenticated users | Watch ★ calls `togglePostSave` → `toggle_post_save` RPC; `loadViewerInteractionState` reads `post_saves`. Unauthenticated failure is swallowed (`if (!result.ok) return`). | NOT_TESTED | **NO.** Authenticated path is present. No proven source defect. |
| Follow state → `Following` (not Unfollow) | **No** Follow / Following / Unfollow string on Watch card or `app/profile`. World sheet type `"follow"` exists but `actions: []`. | NOT_TESTED | **NO.** Missing control, not a wrong label. Inventing Follow UI would be a redesign. |
| Correct other-user profile targeting | Watch / deep links / notifications push `/profile?u=…`. `app/profile/index.tsx` never reads `u` and always renders `useAuth()` self profile. No public-by-username fetch. | NOT_TESTED | **NO.** Wiring defect is proven; a real other-user profile is not a one-line fix. Do not stub. |
| Delete menu fully visible (no clipping) | Delete is a right-rail action (not a popup), shown only for owner. Rail: Like, Save, disabled comments/share, optional Delete/Report/Block; plus a **240px** volume slider. `overflow: hidden` on the cell. | NOT_TESTED | **NO.** Density risk is visible in source; clipping is not device-proven. |
| Create/upload remains working | Library pick → caption → UGC ack → upload → publish. Operator already PASS on Build 3. Open Watch patch does not change pick/upload/publish. | PASS (prior) | **Observed.** Not broken by the preserved fix. |
| Open Watch focuses newly published video | Build 3 / `09e94f8` discarded `postId`. Fix stored id + `?post=` + promote-to-front. | FAIL (operator) | **YES — preserved @ e87668e.** |
| UGC report/block remains functional | Watch wires `onReport` / `onBlockUser` to 20260928 RPCs with owner-hide rules. | NOT_TESTED | **NO change.** Source still bound; do not touch. |

### Login destination note (for Central)

Written requirement and A1 both say post-login should be **Profile**. Source sends **Watch**. That is a source/requirement mismatch, **not** a device FAIL yet.

A safe later fix is **not** `router.replace("/profile")` alone. Profile is `Stack.Screen name="profile/index"` beside `(tabs)`, not inside the tab navigator. Today Profile is reached by **push** from Watch (`IdentityHeader` / author tap), so Back returns to tabs. A replace from the auth group can leave Profile with no tab bar and an empty back stack.

Recommended later shape (not applied): `replace("/(tabs)/watch")` then `push("/profile")`, or add a Profile tab. Do not implement until A1 records LOGIN_DESTINATION = FAIL or Central GO.

---

## 4. Create parity classification

Mobile Create (`app/(tabs)/create.tsx` on this branch) is: pick video from library → caption / hashtags → UGC Terms ack → upload → publish → Open Watch. No second composer.

Web comparison used for classification:

- **Write Post / text + optional image** = `app/components/CreatePostModal.tsx` (“Create Post”, text + optional image ≤ 5 MB).
- **Video create** = `app/create/video/CreateVideoForm.tsx` (file + caption + pipeline). No trim editor, no on-video text overlay, no stickers.

| Missing vs asked capability | On mobile Create today? | On web video create? | Classification | Why |
| --- | --- | --- | --- | --- |
| Write Post (separate text composer) | No | Yes (`CreatePostModal`) | **POST_RELEASE_PRODUCT_EXPANSION** | iOS 1.0 Create already ships video publish (operator PASS). A second composer is web parity, not required to close the confirmed Open Watch FAIL. |
| Text post | No | Yes (modal content field) | **POST_RELEASE_PRODUCT_EXPANSION** | Same. Do not invent a giant editor or a second publish pipeline for this release. |
| Optional image on text post | No | Yes (modal image picker) | **POST_RELEASE_PRODUCT_EXPANSION** | Tied to Write Post. Current iOS Create is video-only. |
| Video pre-publish editor (trim / filters / timeline) | No | No | **POST_RELEASE_PRODUCT_EXPANSION** | Neither surface has it. Operator published a library clip successfully. Do not invent an editor. |
| Text overlay on video | No | No (Stories foundation also excludes overlays) | **POST_RELEASE_PRODUCT_EXPANSION** | Not in current web video Create. Caption field is post text, not burned-in overlay. |
| Emoji / sticker on video | No | No | **POST_RELEASE_PRODUCT_EXPANSION** | Emoji exists on web **messages**, not video Create. Stickers are out of Stories foundation. |

```text
CREATE_PARITY_CLASSIFICATION =
  WRITE_POST=POST_RELEASE_PRODUCT_EXPANSION;
  TEXT_POST=POST_RELEASE_PRODUCT_EXPANSION;
  OPTIONAL_IMAGE=POST_RELEASE_PRODUCT_EXPANSION;
  VIDEO_PRE_PUBLISH_EDITOR=POST_RELEASE_PRODUCT_EXPANSION;
  TEXT_OVERLAY=POST_RELEASE_PRODUCT_EXPANSION;
  EMOJI_STICKER=POST_RELEASE_PRODUCT_EXPANSION
REQUIRED_FOR_CURRENT_IOS_RELEASE = NONE_OF_THE_ABOVE
CURRENT_IOS_CREATE_SCOPE = LIBRARY_VIDEO + CAPTION + UGC_ACK + PUBLISH + OPEN_WATCH_FOCUS
```

---

## 5. Tests / TypeScript / Build

Run in the Open Watch worktree **before** the preservation commit:

```text
npx vitest run src/lib/video/createJourney.test.ts src/lib/feed/watchFeed.map.test.ts
  Test Files  2 passed (2)
  Tests       19 passed (19)

npx tsc --noEmit = PASS
git diff --check = PASS (pre-commit)
```

`npm run build` / EAS / iOS rebuild: **not run** (`IOS_REBUILD_NOW = NO`).

No additional product commit after preservation (no second confirmed device FAIL).

---

## 6. Security review

- No secrets, `.env`, Apple keys, or service-role use.
- Open Watch passes only the numeric `postId` already returned by the owner publish path.
- Watch focus still requires `media_status = ready` and a video path.
- Local git identity only; no global config; no tokens printed.
- Diverged `77e9e28` checkout not reset/merged.
- UGC report/block client not modified.

## Migrations created

None.

## Exact files changed

### Mobile (committed + pushed)

Open Watch `e87668e`:

- `app/(tabs)/create.tsx`
- `src/lib/video/createJourney.ts`
- `src/lib/video/createJourney.test.ts`
- `src/lib/feed/watchFeed.ts`
- `src/lib/feed/watchFeed.map.test.ts`

Messages `73e4723`:

- `src/lib/messenger/api.ts`
- `src/lib/messenger/realtimeSubscribe.ts`
- `src/lib/messenger/realtimeSubscribe.test.ts`
- `app/messages/[id].tsx`

### Web (this report only)

- `docs/ai/PC2_A2_V4_REPORT.md` (this file)
- `docs/ai/PC2_A1_V4_IPHONE_QA.md` (appended conversation FAILs only)

`docs/ai/CURSOR_REPORT.md` and `docs/ai/CURRENT_TASK.md` were **not** overwritten. No Store product files touched.

## git status — mobile worktree (after push)

```text
## pc2/a2-open-watch-published-post-v1...origin/pc2/a2-open-watch-published-post-v1
HEAD = e87668e7ee664243b3bd788c850e67b912ef9d44
CLEAN = YES
```

Diverged SoT checkout left as found:

```text
PATH = C:/Users/Giga store/Desktop/umtuba/umtuba-mobile
BRANCH = pc2/eas-preview-config-v1
HEAD = 77e9e287e117fc9a19f9a5df1596f69b0b8bf07f
TOUCHED = NO
```

---

## Open issues

1. **Build 3 still has Open Watch and conversation-open defects.** Source fixes are `e87668e` then `73e4723`. New binary required to re-verify on device. Rebuild **not** executed.
2. **A1 V4 QA incomplete** — Messages list PASS; conversation open FAIL. Remaining checks NOT_TESTED. Do not mark send/receive PASS.
3. **Login → Profile** — source/requirement mismatch; unsafe to naive-replace; wait for A1 FAIL or Central GO.
4. **Other-user Profile** — `/profile?u=` ignored; needs a public profile fetch, not a stub.
5. **Follow UI absent** — cannot retitle Unfollow → Following until a Follow control exists.
6. **Delete-rail clipping** — source density risk; device NOT_TESTED.
7. **Do not use / reset `77e9e28`.**

---

## Verdict

```text
OPEN_WATCH_FIX_PRESERVED = YES
OPEN_WATCH_COMMIT = e87668e7ee664243b3bd788c850e67b912ef9d44
OPEN_WATCH_STILL_ON_BRANCH = YES
REMOTE_REF = origin/pc2/a2-open-watch-published-post-v1
REMOTE_SHA = 73e4723decdb2af96df4895afc41e367117dd02e
NEW_CONFIRMED_FIXES = OPEN_WATCH_PUBLISHED_POST_FOCUS; MESSENGER_REALTIME_SUBSCRIBE_AFTER_ON
MESSAGES_ROOT_CAUSE = LIST_TAB_SUBSCRIBES_messenger-inbox:userId; THREAD_REUSES_SAME_CHANNEL_AND_CALLS_.on_AFTER_SUBSCRIBE
MESSAGES_FIX_APPLIED = YES @ 73e4723
TARGETED_TESTS = 3 files / 25 tests PASS (messenger) + prior Open Watch 19 PASS
TYPECHECK = PASS
IOS_FINAL_FIX_SOURCE_SHA = 73e4723decdb2af96df4895afc41e367117dd02e
IOS_REBUILD_READY = NO
CREATE_PARITY_CLASSIFICATION = WRITE_POST=POST_RELEASE_PRODUCT_EXPANSION; TEXT_POST=POST_RELEASE_PRODUCT_EXPANSION; OPTIONAL_IMAGE=POST_RELEASE_PRODUCT_EXPANSION; VIDEO_PRE_PUBLISH_EDITOR=POST_RELEASE_PRODUCT_EXPANSION; TEXT_OVERLAY=POST_RELEASE_PRODUCT_EXPANSION; EMOJI_STICKER=POST_RELEASE_PRODUCT_EXPANSION
BLOCKERS = NEW_MOBILE_BUILD_REQUIRED_TO_SHIP_AND_REVERIFY_OPEN_WATCH_AND_MESSAGES; A1_V4_REMAINING_IPHONE_QA_NOT_TESTED; LOGIN_DESTINATION_SOURCE_POINTS_TO_WATCH_DEVICE_UNCONFIRMED; OTHER_USER_PROFILE_IGNORES_QUERY_U; FOLLOW_UI_ABSENT_IN_SOURCE
NEXT = WAIT_A1_V4_DEVICE_FAILS_OR_CENTRAL_GO
```

---

## 7. Messages conversation fatal screen (A1 device FAIL — appended)

Physical iPhone 13 / TestFlight Build 3 (A1):

```text
MESSAGES_LIST = PASS
CONVERSATIONS_LOAD = PASS
CONVERSATION_OPEN = FAIL
MESSAGES_REALTIME = FAIL
MESSAGE_SEND_RECEIVE = BLOCKED
RELEASE_CRITICAL_DEFECT = YES
```

Opening an existing conversation showed Expo ErrorBoundary **Something went wrong**. Observed error: adding a realtime messenger callback after `subscribe()`.

### Root cause (source, identical on `09e94f8` / `4eede0b` / pre-fix `e87668e`)

`subscribeMessengerRealtime` always did `supabase.channel(\`messenger-inbox:${userId}\`).on(...).subscribe()`.

1. Messages **list tab** stays mounted and already subscribed that inbox topic.
2. Conversation screen (`app/messages/[id].tsx`) called the same helper with a conversation id.
3. `supabase.channel(sameName)` returns the **existing joined** channel.
4. realtime-js throws: `cannot add \`postgres_changes\` callbacks for realtime:messenger-inbox:… after \`subscribe()\`.`
5. Uncaught throw → fatal screen. List itself never hit this (first subscribe).

Secondary race: thread `useEffect` also depended on `peerLastReadAt`, so load/poll would `removeChannel` (async) then `.on()` the same still-joining thread topic.

`.on()` **before** `.subscribe()` in a single chain was already correct. The defect is **reusing a live channel**.

### Fix (`73e4723`, after Open Watch `e87668e`, not squashed)

- Thread plan: only `messenger:${conversationId}`. Inbox plan: only `messenger-inbox:${userId}`.
- Guard: skip `.on()` when channel `state` is `joined` / `joining`.
- Thread handlers held in a ref so peer-read updates do not re-subscribe.

```text
MESSAGES_FIX_COMMIT = 73e4723decdb2af96df4895afc41e367117dd02e
OPEN_WATCH_STILL_ON_BRANCH = YES (e87668e parent)
FORCE_PUSH = NO
REBUILD = NOT_RUN
DEVICE_RETEST = NOT_RUN
```

Do **not** treat conversation open / send / receive as PASS. Build 3 still has the defect.
