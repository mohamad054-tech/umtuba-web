# Central: how to review / apply this v5 source deposit

This package is the **uncommitted** Android v5 product delta from Desktop’s `umtuba-mobile` working tree. No git commit was created for transport. No v5 build is authorized by this deposit.

## Identity

- Base SHA: `3b335610ced48aa2595fe49eef5b97511c7f4cb5`
- Patch: `v5.patch`
- SHA256: `3a73f43035859980c010936c9fa5aa226f10b54c04e3ca4e35888e169fe05ec1`
- 22 files. Own-delete + UGC report/block/terms + account-deletion entry.

## Review without applying

1. Read `MANIFEST.md` and `TEST_EVIDENCE.md`.
2. Inspect `files/` (same bytes as Desktop WT for the 22 paths).
3. Verify `checksums.sha256`.

## Reproduce the delta (throwaway tree only)

```text
git fetch --prune
git worktree add --detach /tmp/umtuba-v5-review 3b335610ced48aa2595fe49eef5b97511c7f4cb5
cd /tmp/umtuba-v5-review
git apply --check /path/to/v5.patch
git apply /path/to/v5.patch
```

Do **not** apply onto `origin/master` (`45f0dbc` hides unfinished Live; Desktop did not take that). Do **not** fast-forward Desktop’s dirty mobile tree.

## After review

If accepted: send `DESKTOP_V5_BUILD_GO = YES` (or equivalent Central GO).  
Until then: `DESKTOP_V5_BUILD_GO` remains **NO**. Desktop will not EAS-build v5.

Do not upload v4 AAB `37dde25f`. Own-content delete is absent from that binary.
