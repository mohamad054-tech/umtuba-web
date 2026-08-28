# PC2 — Official UMTUBA brand release candidate V1

```text
TASK_ID = PC2_UMTUBA_OFFICIAL_BRAND_RELEASE_CANDIDATE_V1
STATUS = READY_FOR_CENTRAL_RELEASE
OWNER_VISUAL_APPROVAL = YES
APPROVED_COMMIT = 1c6b3fc5312d1c3ef0029785a39d5121de17b9e4
FINAL_SHA = 1c6b3fc5312d1c3ef0029785a39d5121de17b9e4
BRANCH = pc2/official-logo-from-approved-video-v1
REMOTE_BRANCH = origin/pc2/official-logo-from-approved-video-v1
REMOTE_URL = https://github.com/mohamad054-tech/umtuba-web/tree/pc2/official-logo-from-approved-video-v1
DIFF_SCOPE_VERIFIED = YES
TYPECHECK = PASS
TESTS = PASS (18)
BUILD = PASS
LOGO_FINAL = YES
ALPHA_BETA_LABELS_REMOVED = YES
GLOBE_CHANGED = NO
PRODUCT_FUNCTIONALITY_CHANGED = NO
DATABASE_TOUCHED = NO
PAYMENTS_TOUCHED = NO
LEARNING_FUNCTIONALITY_CHANGED = NO
STORE_FUNCTIONALITY_CHANGED = NO
POST_VIDEO_BEHAVIOR_CHANGED = NO
PUSHED = YES
MERGED = NO
DEPLOYED = NO
READY_FOR_CENTRAL_RELEASE = YES
```

## Identity

- Worktree: `C:/Users/Giga store/Desktop/umtuba/umtuba-web-official-logo-approved-video-v1`
- HEAD at verify/push time: `1c6b3fc5312d1c3ef0029785a39d5121de17b9e4`
- Author/Committer: Admin `<mohamad054@gmail.com>` — Fri Aug 28 23:47:17 2026 +0300
- Message: `fix(welcome): remove Alpha 0.2 and Join Beta labels.`
- Authorized base: `b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2` (`office/platform-translation-trunk-port-v1`)
- Worktree was clean at push. No extra unapproved commits.

## Commits Central should take (in order)

1. `d0858b09` feat(brand): ship official stacked logo from the approved End Tag video.
2. `3dc06aac` fix(brand): correct approved-video logo presentation on web chrome.
3. `1c6b3fc5` fix(welcome): remove Alpha 0.2 and Join Beta labels.

**Intake SHA:** `1c6b3fc5312d1c3ef0029785a39d5121de17b9e4`

## Diff scope

55 files vs `b3c05d8`. Brand assets, shared brand chrome, Welcome label removals, favicon/PWA/metadata, docs/tests only.

No migrations. No Stripe/payments. No Learning/Store/Globe/posts/videos functional files.

AuthShell / feed header / legal / loading changes are branding chrome only.

## QA on `1c6b3fc`

- `npx tsc --noEmit` PASS
- vitest brand/metadata/welcome labels: 18 PASS
- `npx next build` PASS
- `git diff --check` PASS

## Push

`git push -u origin HEAD` succeeded. New remote branch. Not force-pushed. Not merged. Not deployed.

This RC docs commit (if present locally after push) is **not** what Central should take.
