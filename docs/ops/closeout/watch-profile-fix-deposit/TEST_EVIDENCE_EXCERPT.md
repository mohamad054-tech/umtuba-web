# TEST_EVIDENCE_EXCERPT (copied; suite NOT re-run)

Source: docs/ops/closeout/ANDROID_V5_WATCH_PROFILE_TARGET_FIX_V1.md (~01:20 / ANDROID_V5_WATCH_PROFILE_TARGET_FIX_V1)

## Tests (verbatim excerpt)

`npx vitest run src/lib/profile/profileTarget.test.ts` — 1 file, 11 tests PASS.

- other-user content — owner's public profile (route/params use owner id, not auth id)
- own content — own profile (matched by id, and by username-only)
- owner id authoritative over colliding username
- Report/Block target remains the selected content owner
- demo/empty identity — null href (no navigation)

## TypeScript (verbatim excerpt)

`npx tsc --noEmit` (mobile) — PASS (exit 0).

## FIX_BASE / parent (verbatim excerpt)

Working tree (uncommitted) on parent `3b335610ced48aa2595fe49eef5b97511c7f4cb5`.
No commit/push per task and workflow rules.

## Note for this deposit

Evidence is copied from the prior surgical-fix closeout. This deposit task
did not re-run vitest/tsc/build. BUILD_PERFORMED=NO. PLAY_UPLOAD_PERFORMED=NO.