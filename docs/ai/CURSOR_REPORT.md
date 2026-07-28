# CURSOR_REPORT

## Summary

**UserMenu Capability Links V1** — UserMenu shows Create for signed-in users; Instructor / Admin / Seller hub only when existing helpers report eligibility; Advertise stays visible (public landing). No new role system, migrations, Home, primary nav, or Store Domain page edits. **Verification PASS** (in-scope). Commit / Push / Merge **not** performed.

## Exact files changed

- `app/components/UserMenu.tsx`
- `app/lib/nav/userMenuItems.ts`
- `app/lib/nav/userMenuCapabilities.ts` (new)
- `app/lib/nav/userMenuCapabilities.test.ts` (new)
- `app/lib/nav/userMenuItems.test.ts`
- `app/lib/nav/platformNavContract.ts`
- `app/lib/nav/platformNavContract.test.ts`
- `app/lib/nav/index.ts`
- `lib/ads/adsAdminReviewFoundation.test.ts` (Admin allowed only behind `showAdmin`; TopNav still has no Admin)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Capability links

| Link | Behavior | Eligibility source |
| --- | --- | --- |
| Create | Signed-in | Session profile → `/create/video` |
| Instructor | Conditional | `listInstructorAuthorableCourses` |
| Admin | Conditional → `/admin/ads` | `assertPlatformAdminDb` |
| Seller hub | Conditional | `getOwnedOrMemberStore` or `getLatestSellerApplication` |
| Advertise | Always for signed-in | No hide SoT (landing / apply entry) |

## Gaps remaining

- Advertise not gated on advertiser accounts.
- Admin Store URL-only (not in menu).

## Migrations created

None.

## Security review

- Admin menu link is UX-only; pages still require `assertPlatformAdminDb`.
- No Store Domain page/catalog/cart edits.
- No Home / primary chrome destination changes.

## Tests

- In-scope Vitest: **PASS**
- Full Vitest: **2703 passed**, **3 failed** — pre-existing Store Domain only:
  - `lib/store/paymentOutcomeSync.test.ts` (1)
  - `lib/store/storeRemoteE2eSandboxScripts.test.ts` (2)

## TypeScript

- `npx tsc --noEmit`: **FAIL** pre-existing / out of scope — `profilePinnedContentStructure.v1.test.ts` → `../cards`
- `npm run build` TypeScript phase: **PASS**

## Build

**PASS**

## git diff --check

**PASS**

## git status --short

Pending stage for manual commit.

## Open issues

- Await explicit commit GO (manual Terminal; no Git trailers).
- Pre-existing Store Vitest failures and pinned-content `tsc` import remain out of scope.
- **Proposed next (not started):** product GO for Advertise hide policy and/or Admin Store menu link — no work started.
