# Current Task

## Task title

Profile Creator Hub Readiness V1 -- RESTART HANDOFF (Cursor Pro to Ultra)

## Status

`verification-pass` -- **UNCOMMITTED** -- awaiting explicit **commit GO** after Cursor restart.

| Field | Value |
| --- | --- |
| Verification | PASS (vitest, `tsc --noEmit`, `npm run build`, `git diff --check`) |
| Commit | **NOT done** -- work is local working tree only |
| Push / merge | **NOT done** -- do not push until after commit GO |
| Safe to restart Cursor | **YES** -- keep folder `C:\Users\Admin\Desktop\umtuba\umtuba-web` intact |

## Branch / sync

- **Branch:** `office/profile-creator-hub-readiness-v1`
- **HEAD (committed tip):** `fbbb273951f894df76a1c26daed885f75a906f71` -- `feat(web): add nav chrome hygiene v1`
- **Base:** same as HEAD (`fbbb273`) -- all readiness work is **uncommitted** on top of this tip
- **Parent / primary line:** `alpha-0.2` (nav chrome hygiene commit)
- **Remote:** do not assume branch is on origin until after commit + push GO

## Critical: do NOT destroy local work

Until the user says **GO** for commit:

- **Do NOT** `git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>"`
- **Do NOT** `git push`
- **Do NOT** `git reset` / `git checkout --` / discard
- **Do NOT** `git clean`
- **Do NOT** `git stash`
- Work remains **local only** until commit

## Exact file list (must still be present after restart)

### Modified (tracked)

- `app/profile/ProfileExperience.tsx`
- `app/profile/components/ProfileTabs.tsx`
- `app/profile/components/index.ts`
- `lib/content/cards/contentCardSystem.v1.test.ts`
- `docs/ai/CURRENT_TASK.md` (this handoff)
- `docs/ai/CURSOR_REPORT.md` (restart report)

### Untracked (new)

- `app/profile/components/ProfileCoursesPanel.tsx`
- `app/profile/components/ProfilePhotosPanel.tsx`
- `app/profile/components/ProfileProductsPanel.tsx`
- `app/profile/lib/profileTabs.ts`
- `lib/content/profileCreatorHubReadiness.v1.test.ts`

## What was implemented (already verified PASS)

- Tab model / visibility: Courses, Products, Photos on `/profile/[username]`
- Order: All / Articles / Videos / Courses / Products / Photos / Live / About
- Stub empty panels for Courses / Products; Photos = image posts grid
- Deep links: `?tab=` accepts new ids; unknown -> All; legacy `posts` -> `photos`
- Content Cards All, `?article=` prompt, Articles/Videos/About/Live preserved
- Live visibility unchanged

## Resume steps (after Cursor restart)

1. Open workspace: `C:\Users\Admin\Desktop\umtuba\umtuba-web`
2. Confirm branch:
   `
   git checkout office/profile-creator-hub-readiness-v1
   git branch --show-current
   git rev-parse HEAD
   `
   Expect: branch name above, HEAD = `fbbb273951f894df76a1c26daed885f75a906f71`
3. Confirm uncommitted work still present:
   `
   git status -sb
   git status --porcelain
   `
   Expect the modified + untracked list above (plus possibly this handoff doc refresh).
4. **Stop.** Do not commit/push/reset/clean/stash.
5. Wait for user **GO** before any commit (then push only on separate GO).

## After user says GO for commit (not yet)

Typical sequence (only when explicitly authorized):

1. Re-check `git status` / `git diff`
2. Stage readiness + test + handoff files (not `.next`, not secrets)
3. Commit with message aligned to repo style
4. Stop again unless user also says push GO

## Forbidden scope (still locked)

- Home feed / DiscoverExperience / swipe / ranking
- Watch player redesign
- Full Courses / Products catalog UIs
- Pinned data model + migration
- Content Card Search variants
- Alias hygiene / content-flow policy
- Migrations / Commit / Push without explicit GO
- Destructive git (reset/clean/stash/force)

## Hard lock

Home remains official Discovery Layer -- do not touch feed/player behavior.

## User phrase after restart

Say something like: resume Creator Hub Readiness; commit when I say GO