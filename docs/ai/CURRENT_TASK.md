# Current Task

## Task title

Courses / Products Panel Structure V1

## Status

`verification-pass` — **UNCOMMITTED** — awaiting explicit commit GO.

## Branch / sync

- **Branch:** `office/profile-courses-products-structure-v1`
- **Base:** `faf5a0954ff10055aa90644b516019588d2a32d3` (`feat(web): add profile pinned content structure v1`)
- **Checkout:** feature branch (not merged)

## What was implemented

- Courses panel structured cards (§11): cover, title, level, CTA → Learning catalog href.
- Products panel structured cards (§12): cover, title, price, CTA → store product href.
- View-model `courses` / `products` + normalize/count helpers for tab visibility.
- Production defaults empty arrays (no catalog backend); mock data on `lina.creates`.

## Exact files changed

- `app/profile/lib/profileCoursesProductsStructure.ts` (new)
- `app/profile/components/ProfileCoursesPanel.tsx`
- `app/profile/components/ProfileProductsPanel.tsx`
- `app/profile/ProfileExperience.tsx`
- `app/profile/types.ts`
- `app/profile/lib/mapProfile.ts`
- `app/profile/data/mockProfiles.ts`
- `lib/content/profileCoursesProductsStructure.v1.test.ts` (new)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope (unchanged)

- Migrations / catalog domain / LMS embed / checkout
- Instructor / Seller dashboards
- Home / Watch / Photos lightbox / Motion·a11y
- Commit / Push without explicit GO

## Hard lock

Home remains official Discovery Layer — do not touch feed/player behavior.

## Next step

Await explicit **commit GO** (then push/merge only on separate GO).
