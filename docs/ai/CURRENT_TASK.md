# Current Task

## Task title

DESKTOP_UMTUBA_LEARNING_WORLD_CLASS_VISUAL_DESIGN_V1

## Status

**COMPLETE_CANDIDATE_FOR_OWNER_VISUAL_REVIEW.** Isolated visual/product experience pass over the preserved Learning teacher + student functional candidate. Not audit-only. Owner visual approval is not claimed. DESIGN PASS is not claimed.

```
TASK_ID = DESKTOP_UMTUBA_LEARNING_WORLD_CLASS_VISUAL_DESIGN_V1
STATUS = COMPLETE_CANDIDATE_FOR_OWNER_VISUAL_REVIEW
DATE = 2026-08-23
MACHINE = DESKTOP
OPERATOR = DESKTOP / WEB LEARNING DESIGN
MODE = DESIGN_FIRST + DEMO_CONTENT + INTERACTIVE_PROTOTYPE
AUTHORITATIVE_WEB_BASE = e7c84c668c251ca6b386a60b2b3c01a89eeb7e1b
AUTHORITATIVE_WEB_REF = origin/alpha-0.2
LEARNING_CANDIDATE_SHA = e7c84c668c251ca6b386a60b2b3c01a89eeb7e1b
STATUS_SOURCE = SOURCE_CANDIDATE_ACCEPTED_NOT_PRODUCTION
SHA_OBJECT_AVAILABLE = NO
LOCAL_CHECKOUT = cfc57402e38423231092d9eb80244b333c4cf6a7 + ACCEPTED_FUNCTIONAL_DELTA + VISUAL_LAYER
FUNCTIONAL_BRANCH = desktop/learning-teacher-student-platform-v1
FUNCTIONAL_WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1
DESIGN_BRANCH = desktop/learning-world-class-visual-design-v1-e7
DESIGN_WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-WORLD-CLASS-VISUAL-DESIGN-V1-E7
PRIOR_DESIGN_WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-WORLD-CLASS-VISUAL-DESIGN-V1
FUNCTIONAL_CANDIDATE_PRESERVED = YES
BACKEND_CHANGED = NO
NEW_MIGRATION = NO
MIGRATION_20260934_APPLIED = NO
REAL_PAYMENT = NO
DEPLOYED = NO
MOBILE_TOUCHED = NO
DESIGN_PASS = NOT_CLAIMED
```

## Allowed scope

- Isolated sibling design worktree/branch `desktop/learning-world-class-visual-design-v1` that includes the existing uncommitted Learning functional delta. Do not reset or destroy `DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1`.
- Visual/product experience pass over existing Learning/Teacher routes and architecture.
- Local/fixture demo world (fictional teachers, students, courses, assets). No production writes.
- Generated/local demo assets saved inside the worktree only.
- i18n chrome via existing UMTUBA catalogs (Arabic first-class RTL).
- Local next/dev preview, screenshots under worktree `docs/ops`, packets under worktree and web `docs/ops` / `docs/ai`.
- Preserve functional RPCs/SQL/RLS/course persistence. Visual layers only on top.

## Forbidden scope

- Do not commit, push, force/reset/clean, or deploy.
- Do not apply Supabase migrations (especially `20260934`). Do not create new migrations.
- Do not touch `C:\Users\1\Desktop\umtuba\umtuba-mobile`.
- Do not redo backend architecture. Do not rewrite RPCs/SQL/RLS.
- Do not fake teacher approval. Do not use real people's identities.
- Do not copy Coursera/Udemy/MasterClass/Duolingo/Skillshare branding, assets, exact layouts, or copyrighted content.
- No new hardcoded English user-facing strings — use UMTUBA i18n.
- Do not claim DESIGN PASS. Final visual approval belongs to the owner.
- Do not write outputs to the Windows Desktop. `_port_extract` protected.
- Do not copy production secrets / `.env`.

## Prior completed tasks (history — do not delete artifacts)

- `DESKTOP_UMTUBA_LEARNING_TEACHER_STUDENT_PLATFORM_V1` HANDOFF_DEPOSITED. Functional candidate preserved on `worktrees/DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1`, branch `desktop/learning-teacher-student-platform-v1`, base `cfc57402e38423231092d9eb80244b333c4cf6a7` + uncommitted delta. Deposit: `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_LEARNING_TEACHER_STUDENT_PLATFORM_V1`. Migration `20260934` not applied.
- `DESKTOP_ANDROID_17CBFEF_FOLLOW_LIST_STACK_RETEST` PASS on `17cbfef` / `c6e73333` / vc 20. Frozen/historical. Do not rebuild or retest.
- `DESKTOP_ANDROID_7E5F734_WATCH_REMOUNT_RETEST` FAIL on `7e5f734` / `ad6fd68e` / vc 20. SUPERSEDED. Do not rebuild or retest.
- `DESKTOP_ANDROID_FOLD6_QA_34E42CC` FAIL / PHYSICAL_NAVIGATION_FAIL on `34e42cc` / `d6f30f54` / vc 20. SUPERSEDED.
- Auth password COMPLETE on `d989e66` / `c9892a8f` / vc 20.
- Playback P1 COMPLETE on `dd86a3e` / `ed2bb44a` / vc 20.
- Signed-URL regression COMPLETE_WITH_NESTED_PROFILE_BACK FAIL on `0d5680a` / `fa041da6` / vc 20.

## Residual

Owner/Central visual review. Local prototype: `http://localhost:3017/learning`. Screenshots: `docs/ops/learning-world-class-visual-design-v1/screenshots/`. Do not apply `20260934`. Do not deploy. Do not claim DESIGN PASS. SHA `e7c84c66` was not fetchable on Desktop remotes; local tree is `cfc5740` + accepted functional delta + visual layer. Historical functional worktree preserved.
