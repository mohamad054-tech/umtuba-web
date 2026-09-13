# PC2 shutdown preserve — 2026-08-23 (21:26 +03)

Operator asked in Arabic to save where we arrived and shut the device down. **No commit. No push. No deploy. No feature work.** Files stay on disk.

```text
TASK_ID = PC2_SHUTDOWN_PRESERVE_2026_08_23
DEVICE = PC2
DATE = 2026-08-23
COMMIT_CREATED = NO
PUSH = NO
RESET_STASH_OVERWRITE = NO
SAFE_TO_POWER_OFF = YES
```

## Identity

```text
DEVICE = PC2
ROLE_HISTORY = iOS TestFlight iPhone 13 validator, then Store/Seller web
```

PC2 first closed iOS Build 29 / SHA `17cbfef` physical gates, then executed Central WEB Store Seller Center commerce readiness and a world-class visual-design prototype. Mobile stays frozen. Store work is uncommitted on isolated worktrees.

`PROJECT_STATE.md` still describes Central private-AI on another machine/worktree. It is **not** this PC2 Store session.

## Frozen iOS (DO NOT TOUCH unless Central GO)

```text
AUTHORITATIVE_MOBILE_SHA = 17cbfefbc8c77d5286efdf2c9b941101db84b6c3
IOS_BUILD = 29
EAS_BUILD_ID = 03abe57b-4421-4cbc-945a-a86cce60480f
IPHONE13_PHYSICAL_GATE = PASS
FOLD6 = PASS
MOBILE_FINAL_GATE = PASS
17cbfef = RELEASE_CANDIDATE_FROZEN
BUILD_30 = NO
ADD_FOR_REVIEW = HOLD (do not press)
APP_VERSION = 1.0.0
SELECTED_BUILD = 29
PREVIOUS_SELECTED_BUILD = 16
BUILD_16_DELETED = NO
IPHONE_6_7_REQUIRED = UNKNOWN_ASC_UI_UNAVAILABLE
READY_FOR_ADD_FOR_REVIEW = NO
WAITING = Central App Store GO / 6.7 UI confirmation
```

Reports: `docs/ai/PC2_IOS_BUILD29_17CBFEF_FINAL_CLOSEOUT.md`, `docs/ai/PC2_APP_STORE_BUILD29_CONFIGURATION_V1.md`, Central `D:\umtuba-central\FROM-PC2\UMTUBA_PC2_IOS_BUILD29_17CBFEF_FINAL_CLOSEOUT_RETURN.md`.

## Store functional candidate (PRESERVE)

```text
BASE = cfc57402e38423231092d9eb80244b333c4cf6a7
REF = origin/alpha-0.2 = origin/central/web-nextjs-cve-2026-64643-p1-v2
WORKTREE = C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-STORE-SELLER-CENTER-COMMERCE-READINESS-V1
BRANCH = office/pc2-umtuba-store-seller-center-commerce-readiness-v1
HEAD = cfc57402e38423231092d9eb80244b333c4cf6a7
UNCOMMITTED = YES (~34 dirty/untracked)
STATUS = AUTHENTICATED_RUNTIME_PARTIAL_BLOCKED_ON_SELLER_APPROVAL
```

P1 Seller Center commerce readiness is implemented on this tip (reuse + lifecycle/orders/financial gates). Payment stays disabled.

Authenticated runtime (2026-08-23):

- `AUTH_METHOD=NORMAL_USER_AUTH` `FAKE_SESSION_USED=NO` `SERVICE_ROLE_USED_CLIENT_SIDE=NO` `RLS_DISABLED=NO`
- Become a Seller: draft persist + reload (`wizard_step=6`) + submit → `pending` / PENDING_REVIEW
- `SELLER_APPROVAL_RUNTIME=BLOCKED_NO_ADMIN_PATH` (`admin_approve_seller_application` → Platform admin required)
- Product create DENIED until verified store (`P0001`)
- RLS: seller B cannot read/update A; new user C sees 0 applications / 0 members
- Identifiable TEST emails remain: `pc2.store.seller.{a,b,c}.20260823@example.com` (A pending, B draft). No service-role cleanup.
- Do **not** fake approval.

Evidence: `docs/ai/pc2-seller-runtime-gate/evidence.json` (inside that worktree). Report: `docs/ai/PC2_UMTUBA_STORE_SELLER_CENTER_COMMERCE_READINESS_V1.md`.

Local migration file `supabase/migrations/20260934_store_seller_center_commerce_readiness_v1.sql` is **not applied** remotely. `PRODUCTION_SCHEMA_CHANGED_BY_PC2=NO`.

Financial gates:

```text
REAL_PAYMENT_CAPTURE = DISABLED
REAL_SELLER_PAYOUT = DISABLED
PAYMENT_PROVIDER_CONNECTED = NO
```

## Store visual prototype (OWNER REVIEW NEXT)

```text
WORKTREE = C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-STORE-WORLD-CLASS-VISUAL-DESIGN-V1
BRANCH = office/pc2-umtuba-store-world-class-visual-design-v1
HEAD = cfc57402e38423231092d9eb80244b333c4cf6a7
UNCOMMITTED = YES (~37 dirty/untracked, includes functional delta + visual sandbox)
LOCAL_PREVIEW_URL = http://127.0.0.1:3020/sandbox/store-visual
PREVIEW_PATH = /sandbox/store-visual
DEMO_DATA = lib/store/visualDemo/data.ts (local fixtures only)
READY_FOR_OWNER_VISUAL_REVIEW = YES
DESIGN_PASS = NOT_CLAIMED
```

Screenshots (15 files, all present):

`C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-STORE-WORLD-CLASS-VISUAL-DESIGN-V1\docs\ai\pc2-store-visual-design\shots\`

01 home desktop · 02 home mobile · 03 PDP · 04 cart · 05 checkout · 06 seller storefront · 07 Become a Seller · 08 Seller Center · 09 Add Product · 10 Orders · 11 Returns (FUNCTIONAL_WIRING_PENDING) · 12 Reviews (pending) · 13 Analytics (pending) · 14 Arabic RTL · 15 LTR Watch.

Dev server on 3020 **will be dead after shutdown**. Tomorrow: `cd` the visual worktree, `npx next dev -p 3020`, open `LOCAL_PREVIEW_URL`. Do not use a `node_modules` junction (Turbopack panics). Real `npm install` already ran in that worktree.

Do not mix visual demo fixtures into production `/store` or hosted Supabase.

## Main web checkout (dirty; not product authority)

```text
PATH = c:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1
BRANCH = office/platform-translation-trunk-port-v1
HEAD = b3c05d8d
UNCOMMITTED = YES (~151 status lines — historical iOS/docs/logs)
AUTHORITY = NO (do not use as Store/web product tip)
```

Handoff docs for this night live here: this preserve, `CURRENT_TASK.md`, `CURSOR_REPORT.md`, copies of Store reports.

## Tomorrow first actions (in order)

1. Read **this preserve** then `docs/ai/CURRENT_TASK.md`.
2. If owner visual review: start preview in the **visual** worktree, open `http://127.0.0.1:3020/sandbox/store-visual`, use the 15 shots.
3. If Central Store GO: continue the **functional** worktree. Admin approval path is still blocked. Do not fake approval.
4. If Central App Store GO: ASC preflight only on Build **29**. Do not create Build 30. Do not Add for Review unless explicit GO.
5. Do not mix visual demo data into production persistence.

## Hard don'ts

- No commit / push unless the user asks
- No deploy
- No EAS
- No mobile `17cbfef` edits
- No fake payment / fake refund / fake seller approval
- No RLS weaken
- No remote Supabase migrations
- No App Store Add for Review without Central GO

## Central drops already written

`D:\umtuba-central\FROM-PC2\`

- `UMTUBA_PC2_STORE_WORLD_CLASS_VISUAL_DESIGN_V1_RETURN.md`
- `UMTUBA_PC2_STORE_SELLER_CENTER_COMMERCE_READINESS_V1_RETURN.md`
- `UMTUBA_PC2_APP_STORE_BUILD29_CONFIGURATION_V1_RETURN.md`
- `UMTUBA_PC2_IOS_BUILD29_17CBFEF_FINAL_CLOSEOUT_RETURN.md`
- this file: `UMTUBA_PC2_SHUTDOWN_PRESERVE_2026_08_23.md`
