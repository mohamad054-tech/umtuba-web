# DESKTOP_WATCH_PROFILE_FIX_DELTA_V1

- TASK_ID: DESKTOP_WATCH_PROFILE_FIX_REAL_DELTA_DEPOSIT_V1
- DATE: 2026-08-15 (~01:42 UTC+3)
- MODE: SURGICAL_DEPOSIT_ONLY
- SOURCE_FIX: ANDROID_V5_WATCH_PROFILE_TARGET_FIX_V1
- MOBILE_REPO: C:\Users\1\Desktop\umtuba\umtuba-mobile
- FIX_BASE_SHA: 3b335610ced48aa2595fe49eef5b97511c7f4cb5
- BUILD_PERFORMED: NO
- PLAY_UPLOAD_PERFORMED: NO
- APPLY_VERIFIED_ON_CLEAN_BASE: YES (git apply --check / git apply exit 0)

## Purpose

Deposit the surgical Watch-profile target fix delta so Central can consume it
from SMB intake. UGC / own-delete / versionCode / eas / release-artifact WIP
intentionally excluded from watch.tsx hunks (those depend on files absent at
FIX_BASE_SHA and would break apply).

## FIX_CHANGED_FILES

- `app/(tabs)/watch.tsx`
- `app/profile/index.tsx`
- `src/lib/auth/profile.ts`
- `src/lib/profile/index.ts`
- `src/lib/profile/profileTarget.ts`
- `src/lib/profile/profileTarget.test.ts`

## Packet contents

- WATCH_PROFILE_FIX.patch
- MANIFEST.md (this file)
- CHECKSUMS.sha256
- BASE_SHA.txt
- CHANGED_FILES.txt
- TEST_EVIDENCE_EXCERPT.md (from ANDROID_V5_WATCH_PROFILE_TARGET_FIX_V1.md; suite not re-run)

## Apply hint (Central)

From umtuba-mobile at `3b335610ced48aa2595fe49eef5b97511c7f4cb5`:

```
git apply --check WATCH_PROFILE_FIX.patch
git apply WATCH_PROFILE_FIX.patch
```

## PATCH metadata

- PATCH_SIZE_BYTES: 17757
- PATCH_SHA256: c513c4c722e12413783d8a4a8fbf6d6cc83c8fc4edbb469876bd5506053cc62c
- DIFF_FILE_COUNT: 6
- NEW_FILES: src/lib/profile/profileTarget.ts, src/lib/profile/profileTarget.test.ts
- UGC_OWN_DELETE_IN_PATCH: NO