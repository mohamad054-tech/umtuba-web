# INTEGRATION.md — Central instructions

## Identity

```text
PACKET_ID = PC2_PWA_AUTH_CALLBACK_SOURCE_PACKET_V1
SOURCE_DEVICE = PC2
BRANCH = office/platform-translation-trunk-port-v1
SOURCE_SHA = 1c5ae0bd0266029f264cab866744c7fcde25cc2e
PATCH_STATUS = UNCOMMITTED
COMMIT_SHA = N/A
DO_NOT_COMMIT_FROM_PC2 = YES
DO_NOT_PUSH_FROM_PC2 = YES
DO_NOT_DEPLOY_FROM_PC2 = YES
```

## What this packet is

Verified **uncommitted** PWA auth-callback closeout patchset on PC2.
Base HEAD equals `SOURCE_SHA` above; working tree contains only the four integration files listed below for this fix (plus unrelated workspace dirt that must be ignored).

## Files to integrate (only)

```text
FILES_INCLUDED = [
  app/auth/callback/route.ts,
  lib/site/siteUrl.ts,
  lib/site/siteUrl.test.ts,
  lib/supabase/authSession.harden.test.ts
]
```

Apply via either:

1. **`patch.diff`** — `git apply` / `git apply --3way` onto a tree based at `SOURCE_SHA` (or equivalent authorized release branch after conflict resolution), **or**
2. **`files/**` copies** — overwrite the four paths with the packet copies (P: packet uses real `.ts` names).

## Behavior (intent)

- `app/auth/callback/route.ts`: redirect origin uses `resolveAuthRedirectOrigin(requestOrigin)` instead of raw `request.url` origin.
- `lib/site/siteUrl.ts`: adds `resolveAuthRedirectOrigin` + `isLoopbackHostname`
  - public Host → keep request origin
  - loopback Host + public `getSiteUrl()` → public origin (prod/staging behind nginx→localhost)
  - loopback Host + loopback `getSiteUrl()` → keep request origin (dev ports)
- Tests cover prod loopback→public, staging public preserved, intentional local loopback preserved, and harden contract that helper is wired with no `localhost:3001` literal in the callback route.

Suggested Central commit message (if Central authorizes commit):

> fix(auth): resolve auth-callback redirect origin when proxy Host is loopback

## Recommended Central steps

```text
RECOMMENDED_CENTRAL_STEPS =
  1. Checkout authorized release/integration branch; note base relative to SOURCE_SHA.
  2. Apply ONLY FILES_INCLUDED from this packet (patch.diff or files/**).
  3. Exclude all unrelated PC2 workspace artifacts and evidence-only docs.
  4. Re-run verification commands from TEST_EVIDENCE.md (vitest set + tsc --noEmit).
  5. Commit/push ONLY from authorized Central/operator flow (not PC2).
  6. Operator deploy to production (and staging if desired).
  7. Post-deploy: GET https://umtuba.com/auth/callback and
     GET https://umtuba.com/auth/callback?code=probe
     PASS only when Location host is NOT localhost / 127.0.0.1 / ::1
     (expect umtuba.com / staging.umtuba.com).
```

## Explicit non-goals for Central

- Do not merge unrelated `_pc2_*` / `_a2_*` / other worktree reports from PC2 workspace.
- Do not treat PC2 as commit/push/deploy authority for this packet.
- Do not include secrets/`.env` (none are in this packet).

## Local mirror note

If using the workspace mirror at `worktrees/PC2_PWA_AUTH_CALLBACK_SOURCE_PACKET_V1/`, file copies are stored as `*.ts.source` so they do not enter project `tsc`. Prefer the primary packet on `P:\FROM-PC2\...` which has real `.ts` filenames. `patch.diff` is identical on both.

END INTEGRATION
