# PC2_IOS_BUILD4_WATCH_AVATAR_PROFILE_REPORT

Authoritative source commits live on
`origin/pc2/a2-open-watch-published-post-v1` in the mobile worktree
`C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-a2-open-watch-v1`.

```text
PC2 REPORT
SOURCE_DEVICE = PC2
TASK_ID = PC2_IOS_BUILD4_WATCH_AVATAR_PROFILE_V1
DATE = 2026-08-16
MODE = SOURCE_INVESTIGATION_AND_MINIMAL_FIX
AUTHORIZED_IOS_SOURCE_SHA_BUILD4 = edc898fb5b3549ae31d8b05824d9e9840f825bae
PROFILE_U_QUERY_ANCESTOR = 9202978575da2ec0611de22ff9efabcb6a9f8de1
REMOTE_REF = origin/pc2/a2-open-watch-published-post-v1
DIVERGED_CHECKOUT_77e9e28_USED = NO
CURSOR_REPORT_OVERWRITTEN = NO
STORE_WIP_TOUCHED = NO
BUILD5_BUILT = NO
BUILD4_REUPLOADED = NO
APP_REVIEW_SUBMITTED = NO
DEVICE_PASS_INVENTED = NO
```

## FINAL FIELDS

```text
WATCH_AVATAR_PROFILE_ROOT_CAUSE = Watch creator tap passed only denormalized posts.author_username as /profile?u=. Profile (9202978) looks up profiles.username. Empty/stale/placeholder author_username (feed fallback "@user") does not match a profiles row → "Profile not found". posts.user_id (profiles.id / auth user id) was on the Watch row and unused.
BUILD4_STATE = FAIL
CURRENT_BUILD5_SOURCE_STATE = FIXED_IN_SOURCE — Watch now passes ?id=profiles.id plus ?u=; Profile loads by id first, username fallback. Build 4 binary edc898f does not contain 88caf13.
ADDITIONAL_FIX_REQUIRED = YES — accepted ?u= username targeting was necessary and present on Build 4, but not sufficient for this Watch avatar path
FIX_APPLIED = YES
FIX_COMMIT = 88caf135e2cc5341649b732c18e07322433ab18e
TESTS = PASS — vitest 24 passed (watchAvatarHref + resolveTarget + watchFeed.map + profilePresentation)
TYPECHECK = PASS — mobile npx tsc --noEmit
BUILD5_SOURCE_CONTAINS_FIX = YES
BLOCKERS = NEW_IOS_BINARY_REQUIRED_FOR_DEVICE_RETEST; Build 4 TestFlight remains FAIL; do not invent iPhone PASS
OTHER_USER_PROFILE = FAIL_ON_BUILD4 — source fixed; not retested on device
```

## Device vs source (do not invent PASS)

Physical iPhone 13 / TestFlight **Build 4** (`edc898f`):

- REPRO: Watch → another user's video → tap creator/profile control
- ACTUAL: "Profile not found"
- EXPECTED: that creator's other-user Profile
- `OTHER_USER_PROFILE` / `BUILD4_RELEASE_DEFECT` remain **FAIL** on the shipped binary

Build 5 was **not** built, uploaded, or submitted. This session is source-only.

## Exact Watch creator/avatar path

There is no separate circular avatar widget. The only creator identity control is the username `Pressable` on `WatchVideoCard` (`accessibilityLabel="Profile {username}"`), wired as `onOpenProfile`.

| Step | File | Identifier |
| --- | --- | --- |
| Feed row | `src/lib/feed/watchFeed.ts` `mapRowToWatchVideo` | `author.id = posts.user_id` (auth / `profiles.id`). `author.username = @` + `posts.author_username`, or **`@user` if author_username is empty** |
| Tap | `app/(tabs)/watch.tsx` `onOpenProfile` | **Build 4 / pre-fix Build 5:** strip one leading `@`, push `/profile?u={username}` only. **No profile id. No auth user id.** If username is empty, no navigation. |
| Route | `app/_layout.tsx` stack `profile/index` | `/profile` (not the Profile tab). Query `u` (and now `id`) |
| Target | `src/lib/profile/resolveTarget.ts` | **Build 4:** `?u=` vs signed-in username. Empty/self → own. Else other username. |
| Fetch | `app/profile/index.tsx` + `getProfileByUsername` | `profiles.username = normalizeUsername(u)`. Null/error → **"Profile not found"** |

Identifiers Watch had vs what it passed (Build 4):

- username (denormalized `posts.author_username`) → **passed as `?u=`**
- profile id / auth user id (`posts.user_id`) → **available, not passed**
- nothing → only if username stripped to empty (feed almost never does this because of `@user`)

Profile expects a **live** `profiles.username` (lowercase `^[a-z0-9._]{3,24}$`, no `@`). It does not accept display name, avatar initial, or user id via `?u=`.

## Why the accepted `?u=` fix does not cover this path

`9202978` (`fix(ios): honor /profile?u= and add Following control`) **is an ancestor of Build 4** `edc898f` (`git merge-base --is-ancestor` exit 0). The device string **"Profile not found"** was added in that commit. Build 4 therefore **already honors** `?u=` and already runs `getProfileByUsername`.

That is why this cannot be dismissed as "Build 4 lacks `?u=`":

1. Pre-`9202978` Profile ignored `u` and always rendered `useAuth()` self profile. It never showed "Profile not found".
2. Build 4 shows "Profile not found" → `?u=` was received, target was **other**, lookup returned null.
3. Watch still sent only the denormalized handle. `mapRowToWatchVideo` substitutes `@user` when `author_username` is missing. `u=user` is a valid-looking handle and does not match the creator's `profiles` row.
4. Stale/wrong `posts.author_username` (publish snapshot, `@` prefix stored on the post, later username change) fails the same way even when `posts.user_id` is correct.

Current Build 5 source **before this session** still used the same Watch line:

```ts
router.push(`/profile?u=${encodeURIComponent(username)}`)
```

So `?u=` targeting was **not sufficient** for this exact path. Follow / Back / Save commits after `edc898f` did not change it.

## Fix (smallest safe)

Preserved all existing Build 5 ancestors (`831936c` save, `6733cd5` location, `e3457fc` back arrow, Follow/`?u=`). Did not reset/merge `77e9e28`. Did not redesign Profile.

- `buildWatchCreatorProfileHref` — Watch creator tap → `/profile?u={handle}&id={profiles.id}`
- `resolveProfileTarget` — valid `?id=` wins; same id as signed-in user → own
- `getProfileById` — `profiles.id` lookup
- Profile fetch — id first, username fallback (deep links without id unchanged)

Commit: `88caf135e2cc5341649b732c18e07322433ab18e`  
Message: `fix(ios): open Watch creator Profile by user id`  
Branch: `pc2/a2-open-watch-published-post-v1`

## Proof / regression

`src/lib/profile/watchAvatarHref.test.ts` walks the real Watch mapper → href → target → lookup plan:

- Creator with `user_id` + username `ada` → `/profile?u=ada&id={uuid}` → other, lookup **id first**
- Empty `author_username` (`@user` fallback) still carries creator id → other, lookup **id first** (this is the Build 4 404)
- Own video id → own Profile (Settings unchanged)
- No id and no handle → no navigation

Also extended `resolveTarget.test.ts` for `?id=` vs placeholder `?u=`.

## Tests / typecheck

```text
vitest  4 files / 24 tests PASS
tsc --noEmit  PASS
git diff --check  PASS
```

## Exact files changed (mobile)

- `app/(tabs)/watch.tsx`
- `app/profile/index.tsx`
- `src/lib/auth/profile.ts`
- `src/lib/profile/index.ts`
- `src/lib/profile/resolveTarget.ts`
- `src/lib/profile/resolveTarget.test.ts`
- `src/lib/profile/watchAvatarHref.ts` (new)
- `src/lib/profile/watchAvatarHref.test.ts` (new)

## Out of scope (honored)

- No Build 5 binary
- No Build 4 re-upload
- No App Review submit
- No PRs
- No alpha-0.2
- No Profile redesign
- `CURSOR_REPORT.md` not overwritten
- Diverged checkout `77e9e28` not touched
