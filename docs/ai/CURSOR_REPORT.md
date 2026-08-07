# CURSOR_REPORT — Resource Link Mutation Runtime SoT integration V1

## Summary

**CLOSED** — Fast-forwarded Resource Link Mutation Runtime V1 (`a2cd114`) into
canonical Collaboration SoT. No merge commit. No migration re-apply. Flag remains
default `false`. Product bindings deferred.

## Integration

- Method: **fast-forward only**
- Source: `office/collaboration-workspace-resource-link-mutation-runtime-v1` @ `a2cd114`
- SoT before: `9e140fd`
- SoT after FF: `a2cd114` (+ docs closeout commit if present)

## Architecture / security

- Boundary: Workspace → Resource Reference
- Writes: SECURITY DEFINER RPCs only; authenticated table grants SELECT-only
- Authz: `can_manage_collaboration_workspace`
- Update whitelist + explicit duplicate conflict
- `20260919` parity: blob `f3b42ca8e160cfe2258e52f33d6a3f105b437554` (APPLIED + VERIFIED; not re-applied)

## Validation

- Focused Collaboration tests 40/40 PASS
- `tsc --noEmit` PASS
- Trailer scan PASS
- Scope: mutation runtime + tests + spine exports + `20260919` + docs only

## Deferred

- Resource-link product bindings
- Invite expansion
- Credentialed E2E mutation smoke
