# PC2 UM LIFE HOME ENTRY V1 BUILD GATE

Isolated gate. Comms 1B-S `CURRENT_TASK.md` / `CURSOR_REPORT.md` in the communications worktree were not overwritten.

## Summary

Confirmed the webpack compile failure on `discoveryNotFoundMessage` is a **pre-existing Communications server-action boundary bug on base `866749ed`**, not introduced by UM Life nav (`a04cc4a8`).

Minimum fix: move the sync not-found helper out of `"use server"` into `lib/comms/discoveryNotFound.ts`. Client still renders the same generic copy. Discovery actions, privacy defaults, and messenger behavior are unchanged.

Webpack **compile** of that error is closed. `next build --webpack` still exits 1 in the **TypeScript phase** on a second pre-existing Next 16 `searchParams` `PageProps` union (`app/admin/ads/advertisers/page.tsx`, identical on `866749ed`). That spans Ads/Learning/Store/Seller pages and was **not** fixed (out of UM Life / comms-boundary scope).

## Reproduce (STEP 1)

Isolated detached worktrees (no checkout of the UM Life branch tree):

| Tree | SHA | Command | Result |
| --- | --- | --- | --- |
| `worktrees/PC2-UM-LIFE-BUILD-GATE-BASE` | `866749ed` | `npx next build --webpack` | FAIL compile |
| `worktrees/PC2-UM-LIFE-BUILD-GATE-CANDIDATE` | `a04cc4a8` | `npx next build --webpack` | FAIL compile (identical) |

Same error on both:

```text
./app/actions/communications.ts
Error:   x Server Actions must be async functions.
231 | export function discoveryNotFoundMessage(): string {
```

Import trace: `communications.ts` → `StartConversationPanel.tsx` → `MessagesExperience.tsx`.

`git show 866749ed:app/actions/communications.ts` starts with `"use server"` and exports the sync helper. Same file on `a04cc4a8`.

`BASE_BUILD_BLOCKER_CONFIRMED = YES`

Default `npm run build` (`next build` / Turbopack) on junctioned worktree `node_modules` fails with `Symlink [project]/node_modules is invalid` — environment, not product (STEP 3).

## Fix (STEP 2)

Committed on `pc2/umtuba-um-life-home-entry-v1`:

`b67a7b33e94bebe0015ee1b37ff956602e77e0cc` — `fix(comms): server-action boundary for discovery not-found`

- New `lib/comms/discoveryNotFound.ts` — same string `No UMTUBA account is available to message with this lookup.`
- `StartConversationPanel` imports the helper from that module
- Removed the sync export from `app/actions/communications.ts`
- Boundary tests in `lib/content/communicationsDiscovery.v1.test.ts`

Not changed: discovery privacy, migration, RPCs, email/phone exposure, messenger `get_or_create_direct_conversation`.

After the fix, webpack **Compiled successfully in 63s**. Next then failed typecheck on generated `.next/types` for `AdminAdsAdvertisersPage` `searchParams` (`Promise | object` union). Same union exists on `866749ed`. Dozens of pages share the pattern. Left untouched.

## Exact files changed

- `lib/comms/discoveryNotFound.ts` (new)
- `app/actions/communications.ts`
- `app/messages/components/StartConversationPanel.tsx`
- `lib/content/communicationsDiscovery.v1.test.ts`
- `docs/ai/PC2_UMTUBA_UM_LIFE_HOME_ENTRY_V1_BUILD_GATE.md` (this report; not in the fix commit)

## Migrations created

None. `DATABASE_CHANGE=NO`. `MIGRATIONS=NO`.

## Security review

- No RLS / grants / SECURITY DEFINER / migration edits
- Generic not-found copy unchanged (no user/email/phone leak)
- Server discovery actions remain async `"use server"`
- No secrets committed (`.env.local` copies used only for isolated builds; not staged)
- No production DB or deploy

## Tests

Web targeted:

```text
npx vitest run lib/content/communicationsDiscovery.v1.test.ts app/lib/nav lib/i18n/appShellTranslation.test.ts lib/i18n/i18nFoundation.test.ts app/lib/product/surfaceGates.test.ts app/lib/nav/homeReadinessGuardrails.test.ts app/lib/nav/contentFlowPolicyContract.test.ts
```

After the helper-comment assertion fix: comms **9 passed**. Prior same command: 16 other files **123 passed**. Combined targeted **PASS**.

Mobile: `npx vitest run src/lib/nav src/lib/platform/platform.test.ts src/lib/world/world.test.ts` — **15 passed**.

## TypeScript

- Web `npx tsc --noEmit` (after removing a mid-build `.next/types` race) — **PASS**
- Mobile `npx tsc --noEmit` @ `4d07bd6` — **PASS**

## Build

- Base / candidate `next build --webpack` — **FAIL** (sync server action; identical)
- UM Life after fix `next build --webpack` — compile **PASS**; Next generated-type check **FAIL** on pre-existing admin ads `PageProps` (also on `866749ed`)
- Junction Turbopack `next build` — environment **FAIL** (not product)
- Mobile `npx expo export --platform all` — **PASS** (iOS + Android + web Hermes/JS bundles). No EAS upload, no signing change.
- `npx expo-doctor` — 19/21; pre-existing SDK 57 pin drift on mobile base `09e94f8` (not upgraded)

## git diff --check

PASS (web UM Life tree before commit; mobile clean).

## git status --short

Web UM Life after fix commit: clean except this uncommitted report (and ignored `.env.local` if present).

Mobile `umtuba-mobile-um-life-home-entry-v1`: clean @ `4d07bd6`.

Comms worktree `CURRENT_TASK.md` left for the local-Supabase agent.

## Product preserved (conceptual route/nav audit)

| Route | Status |
| --- | --- |
| `/` | Authoritative social Home; UM Life href |
| `/life` | Alias only → `/` |
| `/discover` | Forever alias to `/` |
| `/watch` | Primary chrome |
| `/messages` | UserMenu / existing route |
| `/learning` | Primary chrome |
| `/store` | Primary chrome |
| `/profile` | Existing route / UserMenu |

UM Life first-class, one tap → `/`, no second feed, RTL/a11y labels unchanged.

## Open issues

1. Full `next build --webpack` still fails **after compile** on pre-existing Next 16 `searchParams` `PageProps` unions (Ads first; Learning/Store/Seller share the pattern). Exists on `866749ed`. Out of this gate’s allowed product scope.
2. Worktree `node_modules` junctions cannot use default Turbopack `next build`.
3. Mobile `expo-doctor` SDK pin drift is inherited from `09e94f8`. Not changed (no signing/release edit).
4. No browser E2E; user `npm run dev` / Docker / WSL left untouched.

## Structured OUTPUT

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_HOME_ENTRY_V1_BUILD_GATE
STATUS = IMPLEMENTED
WEB_BASE_BUILD = FAIL
BASE_BUILD_BLOCKER_CONFIRMED = YES
BUILD_BLOCKER_ROOT_CAUSE = app/actions/communications.ts exports sync discoveryNotFoundMessage from a "use server" module; Next webpack: Server Actions must be async functions. Present on 866749ed and a04cc4a8. Residual after fix: Next generated PageProps searchParams union typecheck on admin ads (also on 866749ed).
BUILD_FIX_SHA = b67a7b33e94bebe0015ee1b37ff956602e77e0cc
UM_LIFE_FINAL_WEB_SHA = b67a7b33e94bebe0015ee1b37ff956602e77e0cc
UM_LIFE_FINAL_MOBILE_SHA = 4d07bd6c0eca5514a2e4df139203d929c9943b68
WEB_TESTS = PASS
WEB_TYPECHECK = PASS
WEB_BUILD = FAIL
MOBILE_TESTS = PASS
MOBILE_TYPECHECK = PASS
ANDROID_BUILD_CHECK = PASS
IOS_BUILD_CHECK = PASS
UM_LIFE_ENTRY = PASS
UM_LIFE_DESTINATION = PASS
WATCH_PRESERVED = YES
CREATE_PRESERVED = YES
LEARNING_PRESERVED = YES
STORE_PRESERVED = YES
PROFILE_PRESERVED = YES
MESSAGES_PRESERVED = YES
RTL = PASS
ACCESSIBILITY = PASS
REGRESSIONS_FOUND = residual next build typecheck on pre-existing PageProps searchParams unions (base 866749ed); junction Turbopack env fail; expo-doctor SDK pin drift on 09e94f8
DEPLOYED = NO
PLAY_UPLOAD = NO
APP_STORE_UPLOAD = NO
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
READY_FOR_OWNER_FINAL_REVIEW = YES
READY_FOR_CENTRAL_INTEGRATION = NO
```
