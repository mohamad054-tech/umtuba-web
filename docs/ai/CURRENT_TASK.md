# Current Task

> Isolated Next 16 PageProps/searchParams production-build fix on the UM Life web branch. Do not reboot. Do not kill `npm run dev` / Docker. Local Supabase/WSL agent may be idle waiting for BIOS.

## Task

```text
TASK_ID = PC2_UMTUBA_WEB_NEXT16_PAGEPROPS_BUILD_BLOCKER_FIX_V1
STATUS = IMPLEMENTED
BRANCH = pc2/umtuba-um-life-home-entry-v1
WEB_BASE_SHA = b67a7b33e94bebe0015ee1b37ff956602e77e0cc
MOBILE_SHA = 4d07bd6c0eca5514a2e4df139203d929c9943b68
PRODUCTION = STRICTLY_FORBIDDEN
```

## Product / goal

Close the inherited Next 16 generated `PageProps` / `searchParams` production-build typecheck failure. Minimum contract alignment only. Preserve UM Life first-class Home, destination `/`, Watch/Create/Learning/Store/Profile/Messages, RTL, a11y.

## Allowed scope

- Bring affected App Router pages to the installed Next 16 `params` / `searchParams` Promise contract
- Docs: this file, `CURSOR_REPORT.md`, `PC2_UMTUBA_WEB_NEXT16_PAGEPROPS_BUILD_BLOCKER_FIX_V1.md`
- Isolated UM Life web branch only

## Forbidden scope

- No product redesign, Ads data model, payments, UM Life nav redesign, Communications Part 2, Rich Profile schema
- No production DB, migrations, Play/App Store, force-push
- No `@ts-ignore`, `any` everywhere, typecheck disable, build ignore flags
- Do not change mobile unless a shared fix truly requires it
