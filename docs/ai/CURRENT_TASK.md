# Current Task — TOMORROW START PACKET (Design-First)

**TASK_ID** = `CENTRAL_STORE_LEARNING_DESIGN_FIRST_V1`
**DATE** = 2026-08-24 (start after 2026-08-23 overnight freeze)
**STATUS** = READY_FOR_DESIGN_PHASE
**MODE** = DESIGN_FIRST_OVER_WORKING_FUNCTIONAL_CANDIDATES
**MACHINE** = WIN-MJRKAKK2MEH / CENTRAL
**OVERNIGHT_HANDOFF** = `D:\umtuba-central\reports\UMTUBA_CENTRAL_OVERNIGHT_HANDOFF_STORE_LEARNING_DESIGN_V1.md`
**PRIOR_FREEZE_TASK** = `CENTRAL_OVERNIGHT_HANDOFF_STORE_LEARNING_DESIGN_V1`

```text
TASK_ID = CENTRAL_STORE_LEARNING_DESIGN_FIRST_V1
STATUS = READY_FOR_DESIGN_PHASE
AUTHORITATIVE_WEB_BASE = cfc57402e38423231092d9eb80244b333c4cf6a7
LIVE_RELEASE = cfc57402-20260822184650
DEPLOYED = NO
STORE_FUNCTIONAL_CANDIDATE_SHA = 09fc78dce028178bb6f6122659d4a15867532ec2
STORE_FIRST_PASS_SHA = 1f79dcba28deb58f25be0610e36d101388dbe5f5
STORE_BRANCH = central/store-seller-approval-admin-v1
STORE_WORKTREE = D:\umtuba-central\repos\umtuba-web-store-seller-approval-admin-v1
LEARNING_CANDIDATE_SHA = e7c84c668c251ca6b386a60b2b3c01a89eeb7e1b
LEARNING_BRANCH = central/learning-teacher-student-platform-v1
LEARNING_WORKTREE = D:\umtuba-central\repos\umtuba-web-learning-teacher-student-platform-v1
MIGRATION_20260934_APPLIED = NO
MIGRATION_20260935_APPLIED = NO
PC2 = STOP_AND_WAIT
DESKTOP = STOP_AND_WAIT
TOMORROW_START = DESIGN_FIRST_STORE_AND_LEARNING
```

## Allowed scope

Store **visual / product design** over the working Store functional candidate
**and** Learning **visual / product design** over the working Learning functional candidate.

Design may cover:

- Store buyer public store, Seller Center, admin seller-review chrome, RTL, empty/error/pending states
- Learning catalog, Become-a-Teacher, Teacher Center, public teacher profile, course studio, reviews chrome
- Information architecture, visual system, Arabic-first / RTL, 13-locale *design* (not a runtime locale cert)
- Returns / reviews **as design surfaces** (they remain 404 in Store source)
- Honest disabled-payment / disabled-payout UX (do **not** enable money)

Worktrees to open tomorrow:

- Store: `D:\umtuba-central\repos\umtuba-web-store-seller-approval-admin-v1` @ `09fc78dce028178bb6f6122659d4a15867532ec2`
- Learning: `D:\umtuba-central\repos\umtuba-web-learning-teacher-student-platform-v1` @ `e7c84c668c251ca6b386a60b2b3c01a89eeb7e1b`
- Live reference only: `origin/alpha-0.2` = `cfc57402e38423231092d9eb80244b333c4cf6a7`

Keep Store and Learning on **separate branches**. Do not mix them into one commit.

## Forbidden scope

- Deploy / live cutover / FF `alpha-0.2`
- Remote Supabase apply of **any** migration tonight or tomorrow unless a **new explicit GO**
  - Never `20260931`
  - Never `20260929`
  - Do not apply `20260934` or `20260935` without a new GO
- Repeating closed PC2 seller-center runtime gates (Become-a-Seller, draft persist, submit, seller A/B RLS, Store RTL, Seller RTL, buyer public store)
- Asking PC2 to rebuild seller-center evidence
- Asking Desktop to rebuild the Learning teacher/student handoff
- Enabling real course payment / teacher payout / seller payout / buyer capture
- Mobile device builds (Build 29 not authorized; no new Fold6 / iPhone binary)
- App Store / Play production
- Mixing unrelated modules (Watch nav, Security P1 firewall, UM Life Phase 2, Private AI)
- Inventing SHAs or inventing a test-seller approval

## Where we stopped tonight (2026-08-23)

Functional Store and Learning work is **source-ready, not production**. Design was explicitly **not** started. Central persisted leftover Store audit files so shutdown does not lose them. No deploy. No remote SQL.

### Store (closed as functional candidate)

- PC2 `PC2_UMTUBA_STORE_SELLER_CENTER_COMMERCE_READINESS_V1` closed authenticated seller work without admin. **Do not repeat.**
- Legitimate approval already exists at `/admin/store/sellers` for `platform_admins`.
- RPCs: `admin_approve_seller_application`, `admin_reject_seller_application`, `admin_suspend_seller_application`.
- Pending `/seller/store/*` 200-while-API-0 defect is gated to an **active + verified** store (first pass `1f79dcba`).
- Overnight persist added reviewer-audit source + admin copy: `09fc78dc` on `central/store-seller-approval-admin-v1` (local, **ahead 1, not pushed**).
- `20260935` is in that commit as a **local file only**. **Not applied remote.**
- `TEST_SELLER_APPROVED = NO`
- `READY_FOR_PC2_BLOCKED_ROWS_RETEST = NO` until a real platform-admin approves a dedicated test seller
- PC2 = **STOP_AND_WAIT**
- Store visual redesign was **not** done — that is tomorrow

### Learning (closed as source candidate)

- Handoff verified from `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_LEARNING_TEACHER_STUDENT_PLATFORM_V1`
- `LEARNING_REVIEW_ACCEPTED = YES` as source candidate, **not** production
- SHA `e7c84c668c251ca6b386a60b2b3c01a89eeb7e1b` on local `central/learning-teacher-student-platform-v1` (no origin ref; **not pushed**)
- `20260934` static review `SAFE_TO_APPLY = YES_SQL_REVIEW_NOT_AUTHORIZED`, `MIGRATION_APPLIED = NO`
- `READY_FOR_DESIGN_PHASE = YES`
- `READY_FOR_PRODUCTION_INTEGRATION = NO`
- 13-locale **not** complete (EN/AR + EN fallback)
- Residual: `AUTHENTICATED_APPROVED_TEACHER_ROW_LEAKS_REVIEW_FIELDS`
- Desktop = **STOP_AND_WAIT_FOR_CENTRAL**
- Do not ask Desktop to rebuild the handoff

## Parked blockers (do not expand tomorrow unless a new GO)

- Mobile latest source `17cbfefbc8c77d5286efdf2c9b941101db84b6c3` — no new device build until Central reviews
- iPhone 13 Build 28 PASS; Build 29 **NOT** authorized
- Fold6 follow-list Back remains the remaining historical device issue
- SQL `20260931` HOLD — never apply
- App Store / Play production HOLD
- Real course payment / teacher payout / seller payout DISABLED
- GSC token still missing
- WHM `2083`/`2087` still public
- Supabase PITR unverified
- UM Life Phase 2 not started
- No platform-admin session on Central → no test-seller approval
- Learning residual SELECT leak on approved teacher review fields (fix or accept **before** production apply of `20260934`)

## Operator path (if needed; not tomorrow's design work)

1. Sign in as a `platform_admins` user.
2. Open `/admin/store/sellers`.
3. Approve / reject / suspend via existing RPCs.
4. Do **not** apply `20260935` to make live approve work — live already uses `reviewed_at` / `review_note`.

## Reports

- Overnight packet: `D:\umtuba-central\reports\UMTUBA_CENTRAL_OVERNIGHT_HANDOFF_STORE_LEARNING_DESIGN_V1.md`
- Store path: `D:\umtuba-central\reports\UMTUBA_CENTRAL_STORE_SELLER_APPROVAL_PATH_V1.md`
- Learning review: `D:\umtuba-central\reports\UMTUBA_CENTRAL_LEARNING_TEACHER_PLATFORM_INTEGRATION_REVIEW_V1.md`

## Next action

START_DESIGN_FIRST_ON_STORE_AND_LEARNING_CANDIDATES.
PC2 STOP_AND_WAIT. Desktop STOP_AND_WAIT. No deploy. No remote SQL.
