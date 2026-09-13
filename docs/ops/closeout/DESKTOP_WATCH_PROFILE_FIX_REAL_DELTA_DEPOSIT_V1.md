# DESKTOP_WATCH_PROFILE_FIX_REAL_DELTA_DEPOSIT_V1

- DEVICE = DESKTOP
- TASK_ID = DESKTOP_WATCH_PROFILE_FIX_REAL_DELTA_DEPOSIT_V1
- MODE = SURGICAL_DEPOSIT_ONLY
- PRIORITY = RELEASE_CRITICAL
- DATE = 2026-08-15 (~01:42 UTC+3)
- WEB = `C:\Users\1\Desktop\umtuba\umtuba-web`
- MOBILE = `C:\Users\1\Desktop\umtuba\umtuba-mobile`

## Verdict

`CENTRAL_CAN_CONSUME = YES`

Surgical Watch-profile target fix delta deposited to Central SMB intake with
non-zero patch, manifest, checksums, and verified checksum match. Patch applies
cleanly on FIX_BASE_SHA (verified via detached worktree `git apply --check` /
`git apply` exit 0).

## FIX_BASE_SHA

`3b335610ced48aa2595fe49eef5b97511c7f4cb5`

## FIX_CHANGED_FILES

- `app/(tabs)/watch.tsx` (surgical: import `buildWatchProfileHref` + `onOpenProfile` only)
- `app/profile/index.tsx`
- `src/lib/auth/profile.ts` (`getPublicProfileByIdentity`)
- `src/lib/profile/index.ts` (re-exports)
- `src/lib/profile/profileTarget.ts` (new)
- `src/lib/profile/profileTarget.test.ts` (new)

## Isolation note

Mobile working tree is dirty with Android v5 UGC / own-delete WIP entangled in
`app/(tabs)/watch.tsx`. Those hunks were **excluded** from the deposited patch
because they depend on files absent at FIX_BASE_SHA (`UgcSafetySheet`, safety /
delete modules) and would break Central apply. Deposit uses the existing
profileTarget modules + clean profile/auth/profile-screen delta + surgical
watch nav-only hunks from ANDROID_V5_WATCH_PROFILE_TARGET_FIX_V1.

## Packet (local)

`docs/ops/closeout/watch-profile-fix-deposit/`

- WATCH_PROFILE_FIX.patch
- MANIFEST.md
- CHECKSUMS.sha256
- BASE_SHA.txt
- CHANGED_FILES.txt
- TEST_EVIDENCE_EXCERPT.md

## Patch metadata

- PATCH_PATH (local) = `docs/ops/closeout/watch-profile-fix-deposit/WATCH_PROFILE_FIX.patch`
- PATCH_SIZE = 17757
- PATCH_SHA256 = `c513c4c722e12413783d8a4a8fbf6d6cc83c8fc4edbb469876bd5506053cc62c`
- UGC_OWN_DELETE_IN_PATCH = NO
- DIFF_FILE_COUNT = 6
- NEW_FILES_IN_PATCH = 2

## SMB deposit

- SMB_TARGET_PATH = `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_WATCH_PROFILE_FIX_DELTA_V1\`
- SMB_PATCH_PRESENT = YES
- SMB_PATCH_NONZERO = YES
- SMB_MANIFEST_PRESENT = YES
- SMB_CHECKSUM_PRESENT = YES
- SMB_CHECKSUM_MATCH = YES
- Patch headers readable (`diff --git`, `--- a/`, `+++ b/`)

## Test evidence

Copied excerpt from `docs/ops/closeout/ANDROID_V5_WATCH_PROFILE_TARGET_FIX_V1.md`
into packet `TEST_EVIDENCE_EXCERPT.md`. Suite **not** re-run this task.

Prior evidence: `npx vitest run src/lib/profile/profileTarget.test.ts` — 11 PASS;
`npx tsc --noEmit` — PASS.

## Gates

- BUILD_PERFORMED = NO
- PLAY_UPLOAD_PERFORMED = NO
- No commit / push
- No secrets / AAB / APK / tester data

## BLOCKER

NONE (for Central consume of this delta). Prior Central blocker
`DESKTOP_WATCH_PROFILE_FIX_DELTA_NOT_ON_CENTRAL_INTAKE_OR_ORIGIN` addressed by
this deposit.

On-device verification still requires a future v5 rebuild when
`DESKTOP_V5_BUILD_GO = YES` (out of scope).