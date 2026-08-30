# PC2 UMTUBA WEB NEXT16 PAGEPROPS BUILD BLOCKER FIX V1

Isolated contract fix on `pc2/umtuba-um-life-home-entry-v1`. Communications / local-Supabase worktrees were not checked out. No reboot. `npm run dev` / Docker left running.

## Cause

Installed Next.js **16.2.10** (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` and `node_modules/next/dist/build/webpack/plugins/next-types-plugin/index.js`):

```ts
export interface PageProps {
  params?: Promise<SegmentParams>
  searchParams?: Promise<any>
}
```

Generated check: `T extends PageProps` where `T` is the page function’s first argument.

Custom aliases used `Promise<T> | T` (and the same for `params`). The sync object is not assignable to `Promise<any>`, so `next build` failed in the TypeScript phase after webpack compile — first reported on `app/admin/ads/advertisers/page.tsx`, same class of mismatch on dozens of Ads/Learning/Store/Seller/Home pages (also present on `866749ed`).

`npx tsc --noEmit` did not catch this until the unions were removed, because the generated `.next/types` check only runs during `next build`.

## Fix

1. Drop the sync object from every `params` / `searchParams` page-prop union (`Promise<T>` only).
2. Replace `await Promise.resolve(searchParams ?? {})` with `(await searchParams) ?? {}` so TypeScript keeps the typed query object (`Promise.resolve(promise | {})` was inferring `{}`).
3. Leave `await Promise.resolve(params)` for required `params` Promises (still valid).
4. No `@ts-ignore`, no `any` widening, no Next config / typecheck disable.

Runtime: pages still await query/route params and read the same keys. No ads/product behavior change.

## Validation

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| Targeted vitest (ads + nav + i18n shell + surface gates) | PASS (871) |
| `npm run build -- --webpack` | PASS |
| `git diff --check` | PASS |

Conceptual routes present in the production build output: `/`, `/life`, `/discover`, `/watch`, `/messages`, `/learning`, `/store`, `/profile/[username]`, admin ads.

## Structured OUTPUT

```text
TASK_ID = PC2_UMTUBA_WEB_NEXT16_PAGEPROPS_BUILD_BLOCKER_FIX_V1
STATUS = IMPLEMENTED
CAUSE = custom PageProps unions Promise<T>|T not assignable to Next 16 generated { params?: Promise<SegmentParams>; searchParams?: Promise<any> }
WEB_BASE_SHA = b67a7b33e94bebe0015ee1b37ff956602e77e0cc
UM_LIFE_FINAL_MOBILE_SHA = 4d07bd6c0eca5514a2e4df139203d929c9943b68
WEB_TESTS = PASS
WEB_TYPECHECK = PASS
WEB_BUILD = PASS
FULL_NEXT_BUILD = PASS
MOBILE_CHANGED = NO
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
DEPLOYED = NO
PLAY_UPLOAD = NO
APP_STORE_UPLOAD = NO
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
READY_FOR_OWNER_FINAL_REVIEW = YES
READY_FOR_CENTRAL_INTEGRATION = NO
```
