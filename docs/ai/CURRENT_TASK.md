# Current Task

## Task title

DESKTOP_UMTUBA_LEARNING_TEACHER_STUDENT_PLATFORM_V1

## Status

**COMPLETE_CANDIDATE.** Isolated web worktree from `origin/alpha-0.2` `cfc57402e38423231092d9eb80244b333c4cf6a7`. Teacher + student platform implemented, uncommitted. Payments disabled. Mobile 17cbfef frozen/historical. Not deployed. READY_FOR_CENTRAL_REVIEW.

```
TASK_ID = DESKTOP_UMTUBA_LEARNING_TEACHER_STUDENT_PLATFORM_V1
STATUS = COMPLETE_CANDIDATE
DATE = 2026-08-23
MACHINE = DESKTOP
OPERATOR = DESKTOP
AUTHORITATIVE_WEB_BASE = cfc57402e38423231092d9eb80244b333c4cf6a7
AUTHORITATIVE_WEB_REF = origin/alpha-0.2
BRANCH = desktop/learning-teacher-student-platform-v1
WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1
CANDIDATE_SHA = cfc57402e38423231092d9eb80244b333c4cf6a7 + UNCOMMITTED_LEARNING_DELTA
REAL_COURSE_PAYMENT = DISABLED
REAL_TEACHER_PAYOUT = DISABLED
PAYMENT_PROVIDER_CONNECTED = NO
TYPECHECK = PASS
TESTS = PASS
BUILD = PASS
RUNTIME_SMOKE = PARTIAL
MOBILE_17CBFEF_TOUCHED = NO
EAS_BUILD = NO
GOOGLE_PLAY_UPLOAD = NO
DEPLOYED = NO
READY_FOR_CENTRAL_REVIEW = YES
NEXT_ACTION = CENTRAL_REVIEWS_UNCOMMITTED_LEARNING_CANDIDATE
```

## Allowed scope

- Isolated web worktree at `worktrees/DESKTOP-LEARNING-TEACHER-STUDENT-PLATFORM-V1` from verified `origin/alpha-0.2` SHA `cfc57402e38423231092d9eb80244b333c4cf6a7`.
- Branch `desktop/learning-teacher-student-platform-v1`.
- Learning teacher onboarding, Teacher Center, course/section/lesson authoring, student catalog/player/progress, quizzes, certificates, teacher economics architecture (placeholders only), RLS, i18n, welcome-video hook.
- Local/migration SQL files in the isolated worktree if required for Learning. Do NOT apply to remote Supabase.
- Packets under worktree `docs/ops` / `docs/ai` and web `docs/ops` / `docs/ai`.

## Forbidden scope

- Do not commit, push, force/reset/clean, or deploy.
- Do not apply Supabase migrations to the remote project.
- Do not touch `C:\Users\1\Desktop\umtuba\umtuba-mobile`.
- Do not run EAS. Do not upload Google Play. Do not reopen closed mobile QA.
- Do not connect Stripe/PayPal/personal payment accounts.
- Do not invent the final UMTUBA commission percentage.
- Do not fake teacher approval.
- Do not issue certificates merely because the final lesson was opened.
- Do not disable RLS to make functionality pass.
- No new hardcoded English user-facing strings — use UMTUBA i18n.
- Do not reopen unrelated localization work or 13-locale worktrees.
- Do not write outputs to the Windows Desktop. `_port_extract` protected.
- Do not start from stale DESKTOP-STORE-* / old Learning branches.

## Prior completed tasks (history — do not delete artifacts)

- `DESKTOP_UMTUBA_LEARNING_TEACHER_STUDENT_PLATFORM_V1` COMPLETE_CANDIDATE on `cfc5740` + uncommitted Learning delta. This GO.
- `DESKTOP_ANDROID_17CBFEF_FOLLOW_LIST_STACK_RETEST` PASS on `17cbfef` / `c6e73333` / vc 20. Frozen/historical. Do not rebuild or retest.
- `DESKTOP_ANDROID_7E5F734_WATCH_REMOUNT_RETEST` FAIL on `7e5f734` / `ad6fd68e` / vc 20. SUPERSEDED. Do not rebuild or retest.
- `DESKTOP_ANDROID_FOLD6_QA_34E42CC` FAIL / PHYSICAL_NAVIGATION_FAIL on `34e42cc` / `d6f30f54` / vc 20. SUPERSEDED.
- Auth password COMPLETE on `d989e66` / `c9892a8f` / vc 20.
- Playback P1 COMPLETE on `dd86a3e` / `ed2bb44a` / vc 20.
- Signed-URL regression COMPLETE_WITH_NESTED_PROFILE_BACK FAIL on `0d5680a` / `fa041da6` / vc 20.

## Residual

Central reviews the uncommitted Learning candidate. Do not apply `20260934` remotely from Desktop. Do not invent commission %. Mobile 17cbfef remains frozen.
