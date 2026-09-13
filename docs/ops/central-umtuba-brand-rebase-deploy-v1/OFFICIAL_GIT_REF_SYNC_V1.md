# CENTRAL_SYNC_OFFICIAL_GIT_REF_TO_LIVE_BRAND_RELEASE_V1

2026-08-29. Fast-forward only. No deploy. No production restart. No force. No new commit.

```text
TASK_ID = CENTRAL_SYNC_OFFICIAL_GIT_REF_TO_LIVE_BRAND_RELEASE_V1
STATUS = COMPLETE
PREVIOUS_REMOTE_ALPHA_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
TARGET_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
FAST_FORWARD_VERIFIED = YES
BRAND_ONLY_SCOPE_REVERIFIED = YES
REMOTE_CHANGED_SINCE_GATE = NO
PUSHED = YES
FORCE_PUSH_USED = NO
FINAL_ORIGIN_ALPHA_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
PRODUCTION_DEPLOYED = NO
PRODUCTION_RESTARTED = NO
LIVE_SOURCE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
LIVE_HEALTH = PASS
ORIGINAL_DIRTY_CHECKOUT_PRESERVED = YES
BLOCKERS = NONE
```

## Gates

1. `git fetch --prune origin` from worktree `CENTRAL-UMTUBA-BRAND-REBASE-SAFETY-V1`.
2. `origin/alpha-0.2` was exactly `b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c`.
3. Object `b5fbeff29cb0f308481b38c06500c572cd44a9c4` exists (`commit`).
4. `git merge-base --is-ancestor b2c0bbd… b5fbeff…` exit 0.
5. `git log --oneline b2c0bbd..b5fbeff` = three brand commits only:
   - `390475c` feat(brand): ship official stacked logo from the approved End Tag video.
   - `85ebaae` fix(brand): correct approved-video logo presentation on web chrome.
   - `b5fbeff` fix(welcome): remove Alpha 0.2 and Join Beta labels.
   No `f455d90`. No extra product commits.
6. Diff vs `b2c0bbd...b5fbeff` is brand chrome/assets/metadata/welcome/nav/favicon/PWA + brand docs only.

## Push

```text
git push origin b5fbeff29cb0f308481b38c06500c572cd44a9c4:refs/heads/alpha-0.2
```

Remote accepted as fast-forward `b2c0bbd..b5fbeff`. No `--force` / `--force-with-lease` / `-f`.

Post-push `git fetch --prune origin`: `origin/alpha-0.2` = `b5fbeff29cb0f308481b38c06500c572cd44a9c4`.

## Live check (read-only)

No `ln -sfn`. No `systemctl`. No rebuild.

- `https://umtuba.com/healthz` → `200 umtuba-production-ok`
- `https://umtuba.com/welcome` → `200`
- Same host `BUILD_ID=hygi-ODkpCIc0YibGtTQT` still present (the `b5fbeff` release)
- Stacked approved-video logo present. `Alpha 0.2` / `Join Beta` absent. No `__next_error__`.

Parent checkout `office/profile-hero-completeness-v1` @ `380a366` was not reset, cleaned, stashed, checked out, or modified.
