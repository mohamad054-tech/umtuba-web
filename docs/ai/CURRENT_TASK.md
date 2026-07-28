# Current Task

## Task title

Pinned Content Structure V1

## Status

`verification-pass` — **UNCOMMITTED** — awaiting explicit commit GO.

## Branch / sync

- **Branch:** `office/profile-pinned-content-structure-v1`
- **Base:** `25cbed823f653f06158f4ae63b5ff540560a3394` (`feat(web): add profile about live structure v1`)
- **Checkout:** feature branch (not merged)

## What was implemented

- Pinned rail above All tab (Creator Space §8) — soft cap 1–3.
- Empty pins → rail fully hidden (no empty header).
- Pinned items excluded from All chronology.
- Pure helpers in `app/profile/lib/profilePinnedContentStructure.ts`.
- Optional `pinnedContentCards` on ProfileView; production defaults empty (no migration/backend).
- Dev mock pins on `lina.creates` for structure demo.

## Exact files changed

- `app/profile/lib/profilePinnedContentStructure.ts` (new)
- `app/profile/components/ProfilePinnedRail.tsx` (new)
- `app/profile/components/ProfileAllPanel.tsx`
- `app/profile/components/index.ts`
- `app/profile/ProfileExperience.tsx`
- `app/profile/types.ts`
- `app/profile/lib/mapProfile.ts`
- `app/profile/data/mockProfiles.ts`
- `lib/content/profilePinnedContentStructure.v1.test.ts` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope (unchanged)

- Migrations / new tables / pin persistence
- Owner pin management UI
- Home feed / DiscoverExperience / Watch player
- Courses / Products catalog UIs
- Content-flow policy
- Commit / Push without explicit GO

## Hard lock

Home remains official Discovery Layer — do not touch feed/player behavior.

## Next step

Await explicit **commit GO** (then push/merge only on separate GO).
