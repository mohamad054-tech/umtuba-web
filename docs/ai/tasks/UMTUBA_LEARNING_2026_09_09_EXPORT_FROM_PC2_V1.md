# UMTUBA_LEARNING_2026_09_09_EXPORT_FROM_PC2_V1

Export-only package of the 27 untracked Learning Partner Marketplace files written 2026-09-09. No transfer, no git mutation, no source edits.

## Result

```text
TASK_ID = UMTUBA_LEARNING_2026_09_09_EXPORT_FROM_PC2_V1
STATUS = EXPORT_COMPLETE
ZIP_PATH = C:/Users/Giga store/Desktop/UMTUBA_LEARNING_2026_09_09_EXACT_27.zip
ZIP_SIZE = 43413
ZIP_SHA256 = 0f775b10bc3c03339d5c158ef126c1d5ce67b4f99deddd9d85dd346084b79964
FILE_COUNT = 27
EXACT_27_VERIFIED = YES
EXTRA_FILES = NONE
MANIFEST_PATH = C:/Users/Giga store/Desktop/UMTUBA_LEARNING_2026_09_09_EXACT_27.SHA256.txt
SOURCE_CHANGED = NO
BLOCKERS = NONE
```

## Method

1. Verified all 27 live worktree files exist (`-LiteralPath`, including `[slug]`).
2. SHA256 hashed each source file before copy.
3. Staged copies under `%TEMP%\umtuba-learning-export-27` with relative paths.
4. Built the zip with .NET `ZipFile` / `CreateEntryFromFile` using forward-slash entry names and no directory entries.
5. Verified 27 file entries, zero extras, zip-entry SHA256 == source SHA256.
6. Re-hashed sources after copy: unchanged.
7. Removed the temp staging directory.
8. Wrote the Desktop SHA256 manifest next to the zip.

Entry path style: **forward slashes** (`lib/learning/partners/types.ts`). No extra parent folder. No `__MACOSX`, `desktop.ini`, or Store/Communications/UM Points files.

## Next (not this task)

Extract this zip onto a new unused Learning/alpha branch on the other computer. Do not overlay this Communications worktree and do not mix Store work.
