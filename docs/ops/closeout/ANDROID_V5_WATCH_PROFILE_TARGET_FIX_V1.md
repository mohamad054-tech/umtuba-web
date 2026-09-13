# ANDROID_V5_WATCH_PROFILE_TARGET_FIX_V1

- DEVICE = DESKTOP
- MODE = SURGICAL_FIX
- DATE = 2026-08-15 (~01:20 UTC+3)
- MOBILE = `C:\Users\1\Desktop\umtuba\umtuba-mobile`
- WEB = `C:\Users\1\Desktop\umtuba\umtuba-web`
- MOBILE_PARENT = `3b335610ced48aa2595fe49eef5b97511c7f4cb5` (working tree, no commit)

## Bug

Android v5 (versionCode 5) on Galaxy Z Fold6: a signed-in user watching content
owned by another user taps the content owner's profile/avatar/name and the app
opens the signed-in user's OWN profile instead of the content owner's public
profile. Own content correctly opened own profile. Report/Block correctly
targeted the content owner.

## Root cause

The defect was on the **destination screen**, not the Watch tap handler.

- `app/(tabs)/watch.tsx` navigated with `router.push('/profile?u=<owner username>')`.
- `app/profile/index.tsx` rendered the profile purely from `useAuth()`
  (`profile`/`user`) and **ignored the `u` query param entirely**. It is the
  signed-in user's own-profile screen.
- Result: every owner tap (self or other) resolved to the viewer's own profile.
  There was no public-profile-by-identity rendering path at all, even though the
  `/profile?u=` contract already existed in deep links and notification mapping.

Report/Block were already bound to `item.author.id` (the content owner), so that
behavior was correct and is now locked in by an explicit, tested resolver.

## Fix

Identity binding is now explicit and unit-testable, and the destination screen
honors the target owner.

1. New pure resolver module `src/lib/profile/profileTarget.ts`:
   - `resolveWatchProfileNavParams(owner)` / `buildWatchProfileHref(owner)` —
     build `/profile?uid=<ownerId>&u=<ownerUsername>` from the owner's identity
     (owner id is included as the stable, authoritative key). Returns `null`
     when the owner has no usable identity (demo content).
   - `resolveProfileScreenIdentity({ paramUserId, paramUsername, viewerId, viewerUsername })`
     — returns `{ mode: "self" }` for the viewer's own profile (no param, or the
     param matches the viewer by id, or by username when no id is present) and
     `{ mode: "other", userId, username }` otherwise. The owner id is
     authoritative even when a username collides with the viewer.
   - `resolveWatchSafetyTarget(video)` — Report/Block target is always the
     content owner (`author.id`), never the viewer.
2. `app/(tabs)/watch.tsx` — `onOpenProfile` uses `buildWatchProfileHref(item.author)`;
   `onOpenSafety` uses `resolveWatchSafetyTarget(item)`. No visual/redesign change.
3. `app/profile/index.tsx` — reads `u`/`uid` params and branches on
   `resolveProfileScreenIdentity`. For another user it renders that owner's
   read-only public profile (avatar, name, username, bio, location) using the
   existing presentation builder and styles; own/no-target still renders the
   existing own-profile screen unchanged.
4. `src/lib/auth/profile.ts` — new `getPublicProfileByIdentity(supabase, { userId, username })`
   loads another user's public profile row by id (preferred) or username.
5. `src/lib/profile/index.ts` — re-exports the new resolvers.

No redesign, no Live changes, no unrelated modules touched. Watch playback and
own-profile behavior preserved.

## Exact files changed (mobile)

- `app/(tabs)/watch.tsx` (modified) — profile nav + safety target use resolvers
- `app/profile/index.tsx` (modified) — honor `u`/`uid`; render owner public profile
- `src/lib/auth/profile.ts` (modified) — `getPublicProfileByIdentity`
- `src/lib/profile/index.ts` (modified) — re-export resolvers
- `src/lib/profile/profileTarget.ts` (new) — pure navigation-target resolvers
- `src/lib/profile/profileTarget.test.ts` (new) — regression tests

## Tests

`npx vitest run src/lib/profile/profileTarget.test.ts` → 1 file, 11 tests PASS.

- other-user content → owner's public profile (route/params use owner id, not auth id)
- own content → own profile (matched by id, and by username-only)
- owner id authoritative over colliding username
- Report/Block target remains the selected content owner
- demo/empty identity → null href (no navigation)

## TypeScript

`npx tsc --noEmit` (mobile) → PASS (exit 0).

## Build

Not run. `NEW_AAB_OR_APK_REQUIRED = YES` — the source fix requires a new v5
binary to verify on-device; rebuild intentionally NOT performed
(`DESKTOP_V5_BUILD_GO = NO`).

## git diff --check

Clean (no output).

## git status --short (mobile, this task's files)

```
 M app/(tabs)/watch.tsx
 M app/profile/index.tsx
 M src/lib/auth/profile.ts
 M src/lib/profile/index.ts
?? src/lib/profile/profileTarget.ts
?? src/lib/profile/profileTarget.test.ts
```

(Other pre-existing dirty/untracked paths in the mobile working tree — v5 UGC /
own-delete / safety work — are unrelated to this task and were not modified.)

## FIX_SHA

Working tree (uncommitted) on parent `3b335610ced48aa2595fe49eef5b97511c7f4cb5`.
No commit/push per task and workflow rules.

## Open issues

1. On-device verification pending a new v5 build (`NEW_AAB_OR_APK_REQUIRED = YES`);
   blocked by `DESKTOP_V5_BUILD_GO = NO`.
2. `getPublicProfileByIdentity` assumes `profiles` rows are readable to
   authenticated users (public profile read). If RLS restricts cross-user reads,
   the public profile view will show "Profile unavailable" and RLS would need a
   read policy (out of scope for this surgical mobile fix).
