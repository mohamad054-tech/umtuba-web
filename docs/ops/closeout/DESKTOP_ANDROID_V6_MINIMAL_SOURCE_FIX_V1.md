# DESKTOP_ANDROID_V6_MINIMAL_SOURCE_FIX_V1

**DEVICE:** DESKTOP-A1  
**DATE:** 2026-08-15  
**TASK_ID:** DESKTOP_ANDROID_V6_MINIMAL_SOURCE_FIX_V1  
**KIND:** Authoritative Android v6 source commit. No AAB rebuild. No Play publish. No Production submit.

Central authorized this minimal PROFILE + native FOLLOW patch + versionCode 6. A3 builds the binary.

```
ANDROID_V6_BASE_SHA = 822d893c78505d7db99e892190510cf202cbbc6d
PROFILE_FIX = YES
NATIVE_FOLLOW_FIX = YES
V6_SOURCE_SHA = f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604
COMMIT_SHA = f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604
versionName = 1.0.0
versionCode = 6
TARGETED_TESTS = PASS
TYPECHECK = PASS
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A1-ANDROID-V6
BRANCH = office/android-v6-minimal-source-fix-v1
PUSHED = NO
AAB_REBUILT = NO
PRODUCTION_SUBMITTED = NO
```

---

## Lineage

Started from the accepted Android v5 source (`ANDROID_SOURCE_SHA` / `ANDROID_V6_BASE_SHA`):

`822d893c78505d7db99e892190510cf202cbbc6d` — `chore(android): set v5 versionCode 5`

Dedicated worktree created so dirty mobile parent (`3b33561` + uncommitted UGC/WIP) and web closeout pile were not clobbered.

The prior uncommitted Watch-profile destination fix on dirty parent was **reconciled onto this v5 lineage**, not copied from the dirty tree as-is.

---

## PROFILE_FIX = YES

**Defect:** `umtuba://profile?u=eman` opened the authenticated viewer profile (`@mohamad` on Fold6) because `app/profile/index.tsx` ignored `u`/`uid` and rendered `useAuth()` only.

**Fix:**

- New pure resolver `src/lib/profile/profileTarget.ts`
  - `firstRouteParam` — expo-router / deep-link `string | string[]`
  - `buildWatchProfileHref` / `resolveWatchProfileNavParams` — `/profile?uid=<ownerId>&u=<username>`
  - `resolveProfileScreenIdentity` — `self` vs `other`; owner id authoritative over colliding username
  - `resolveWatchSafetyTarget` — Report/Block stay on the content owner
- Profile screen honors `u` / `uid`. Other-user target loads `getPublicProfileByIdentity`. Own Profile (no target, or target is viewer) is unchanged.
- Watch owner tap no longer pushes username-only `/profile?u=` that the destination used to ignore; it now includes `uid` + `u`.
- Username-only deep link `umtuba://profile?u=eman` still resolves to eman when the viewer is someone else.

**Preserved:** accepted UGC report/block, owner-delete, own Profile shortcuts/settings.

---

## NATIVE_FOLLOW_FIX = YES

**Defect:** Native Watch had no Follow control (device FAIL). This is not the web Following-label bug.

**Fix:**

- New `src/lib/social/follows.ts` using existing `toggle_profile_follow` / `get_profile_follow_snapshot` / `profile_follows` (same contract as web).
- Watch card shows **Follow** before success and **Following** after success. Primary followed-state label is never `Unfollow`. Unfollow is the tap on `Following`.
- Hidden for self / demo (no creator UUID). Signed-out still shows Follow → login.
- Authenticated RPC toggle. Failed action keeps previous label (does not falsely show Following).
- Feed hydrates `author.isFollowing` via `loadViewerFollowingSet`. Toggle updates every clip for that creator.
- Playback / like / save / report / delete paths unchanged.

---

## Version

Shipping config is `app.config.ts` (same as v5):

| Field | v5 | v6 |
|---|---|---|
| versionName (`version`) | `1.0.0` | `1.0.0` |
| android.versionCode | `5` | `6` |

`eas.json` still has `appVersionSource: "remote"` + production `autoIncrement`. A3 must pin/consume **versionCode 6** from this source SHA when building.

---

## Exact files changed (commit `f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604`)

- `app.config.ts` — versionCode 6
- `app/(tabs)/watch.tsx` — profile href + safety target + Follow toggle
- `app/profile/index.tsx` — honor `u`/`uid`; public vs own profile
- `components/WatchVideoCard.tsx` — Follow/Following control
- `src/contracts/watch.ts` — `author.isFollowing` (FOLLOW dependency)
- `src/lib/auth/profile.ts` — `getPublicProfileByIdentity` (PROFILE dependency)
- `src/lib/feed/watchFeed.ts` — hydrate follow set (FOLLOW dependency)
- `src/lib/feed/watchFeed.map.test.ts`
- `src/lib/profile/index.ts` — re-exports
- `src/lib/profile/profileTarget.ts` (new)
- `src/lib/profile/profileTarget.test.ts` (new)
- `src/lib/social/follows.ts` (new)
- `src/lib/social/follows.test.ts` (new)

---

## Tests

```
npx vitest run src/lib/profile/profileTarget.test.ts src/lib/social/follows.test.ts src/lib/feed/watchFeed.map.test.ts
```

3 files, **29 passed**.

- other-user / `u=eman` → requested public profile, not viewer
- own profile by id and by username-only
- owner id authoritative over colliding username
- Report/Block target remains content owner
- Follow / Following labels; never Unfollow as primary
- no self-follow control; signed-out still shows Follow
- failed toggle does not apply Following
- same-creator clips stay in sync

## TypeScript

`npx tsc --noEmit` → PASS (exit 0)

## git diff --check

Clean.

## git status --short (worktree after commit)

Clean. Branch `office/android-v6-minimal-source-fix-v1`. **Not pushed.**

---

## A3 consume

```
V6_SOURCE_SHA = f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A1-ANDROID-V6
versionName = 1.0.0
versionCode = 6
```

Build the next Android candidate from this SHA. Do not publish v5. Do not submit Production from this packet.

---

## BLOCKERS

None for this source commit.

Residual (out of this task): A3 AAB/APK not built; on-device Fold6 re-QA not run; not pushed; Play/Closed Testing/Production untouched.
