# PC2 shutdown preserve — official brand RC (2026-08-29)

Owner said in Arabic: احفظ كلشي بدي اسكر الكمبيوتر. **Save everything. PC shutting down now.**

No merge. No deploy. No force-push. No reset/stash/clean of the dirty primary tree.

```text
TASK_ID = PC2_SHUTDOWN_PRESERVE_OFFICIAL_BRAND_V1
STATUS = PRESERVED_AND_PUSHED
DATE = 2026-08-29
DEVICE = PC2
APPROVED_COMMIT = 1c6b3fc5312d1c3ef0029785a39d5121de17b9e4
BRANCH = pc2/official-logo-from-approved-video-v1
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-web-official-logo-approved-video-v1
REMOTE = https://github.com/mohamad054-tech/umtuba-web.git
REMOTE_BRANCH = origin/pc2/official-logo-from-approved-video-v1
MERGED = NO
DEPLOYED = NO
FORCE_PUSH = NO
PRIMARY_DIRTY_COMMITTED = NO
PRIMARY_PUSHED = NO
SAFE_TO_POWER_OFF = YES
```

## Isolated brand worktree (THIS is the session to keep)

```text
PATH = C:/Users/Giga store/Desktop/umtuba/umtuba-web-official-logo-approved-video-v1
BRANCH = pc2/official-logo-from-approved-video-v1
WORKING_TREE_AT_PRESERVE_START = CLEAN
LOCAL_HEAD_BEFORE_PRESERVE_COMMIT = f455d90d61cecb45344c9cdfaddec621545c8b17
ORIGIN_BEFORE_PUSH = 1c6b3fc5312d1c3ef0029785a39d5121de17b9e4
AHEAD_OF_ORIGIN_BEFORE_PUSH = 1 (f455d90 docs-only RC intake)
```

### Approved product SHA (Central intake)

Central should take **`1c6b3fc5312d1c3ef0029785a39d5121de17b9e4`**.

```text
1c6b3fc5 fix(welcome): remove Alpha 0.2 and Join Beta labels.
3dc06aac fix(brand): correct approved-video logo presentation on web chrome.
d0858b09 feat(brand): ship official stacked logo from the approved End Tag video.
```

`1c6b3fc` was already on origin before this shutdown. Confirmed local HEAD contains that ancestor.

### What was leftover locally (must survive disk)

`f455d90` — `docs(ai): record official brand release candidate intake for 1c6b3fc.`

- Docs only: `CURRENT_TASK.md`, `CURSOR_REPORT.md`, `PC2_UMTUBA_OFFICIAL_BRAND_RELEASE_CANDIDATE_V1.md`
- **Not** the product intake SHA
- Was **not** on origin (ahead 1) until this preserve push

### What this preserve commit adds

- This file
- Session-preserved updates to `CURRENT_TASK.md` and `CURSOR_REPORT.md`

No product/logo code. No `.env`. No secrets.

### Remotes / push

- Isolated branch only: `git push origin pc2/official-logo-from-approved-video-v1`
- Fast-forward. No force. No other branches.

After push, origin must contain:

1. `1c6b3fc` (approved product)
2. `f455d90` (RC intake docs)
3. this preserve commit (docs)

## Primary dirty checkout (LEFT UNTOUCHED)

```text
PATH = C:/Users/Giga store/Desktop/umtuba/umtuba-web-translation-trunk-port-v1
BRANCH = office/platform-translation-trunk-port-v1
HEAD = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
TRACKING = origin/office/platform-translation-trunk-port-v1
DIRTY_SHORT_LINES = ~162 (4 modified, ~158 untracked)
COMMITTED = NO
PUSHED = NO
STASHED = NO
RESET = NO
```

Pre-existing dirty/untracked tree (docs, sandbox, worktrees, logs, `.env.example`, `vitest.config.ts`, etc.). Left on disk only. Do not mass-commit. Do not push.

## How to resume

1. After boot: `cd "C:/Users/Giga store/Desktop/umtuba/umtuba-web-official-logo-approved-video-v1"`
2. `git fetch --prune`
3. `git checkout pc2/official-logo-from-approved-video-v1`
4. `git pull --ff-only` if needed
5. Confirm `git merge-base --is-ancestor 1c6b3fc5312d1c3ef0029785a39d5121de17b9e4 HEAD`
6. Central intake SHA remains `1c6b3fc`. Later commits on this branch are RC/shutdown docs only.
7. Do not merge. Do not deploy. Do not change logo/product from this preserve.

Primary dirty tree: leave as-is. Resume only if a later task explicitly scopes it.

## Editors / servers

No special handling. Any localhost:3010 / Next dev process will die with the PC. Do not kill unless needed.

## Forbidden (still)

- Merge to production
- Deploy
- Modify logo/product code
- Commit secrets
- Commit the primary dirty tree
- Force push / reset / stash
