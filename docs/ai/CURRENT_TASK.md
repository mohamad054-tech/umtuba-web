# Current Task

> **PC2 — Official brand session PRESERVED. PC shutting down. Do not merge. Do not deploy.**

## Result (2026-08-29 shutdown)

```text
TASK_ID = PC2_SHUTDOWN_PRESERVE_OFFICIAL_BRAND_V1
STATUS = PRESERVED_AND_PUSHED
OWNER_VISUAL_APPROVAL = YES
APPROVED_COMMIT = 1c6b3fc5312d1c3ef0029785a39d5121de17b9e4
BRANCH = pc2/official-logo-from-approved-video-v1
REMOTE_BRANCH = origin/pc2/official-logo-from-approved-video-v1
MERGED = NO
DEPLOYED = NO
```

Prior RC result still stands: Central intake SHA is `1c6b3fc`. Local leftover docs `f455d90` plus this shutdown preserve are pushed so they are not disk-only.

## Allowed scope

- Resume from the isolated brand worktree after power-on
- Verify `1c6b3fc` is on origin
- RC / preserve docs only

## Forbidden scope

- Logo/globe/layout/product changes
- Merge to production
- Production deploy
- Force push
- Push other branches
- Commit or reset the primary dirty tree
