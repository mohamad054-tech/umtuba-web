# Collaboration Member Role Credentialed E2E Smoke V1

Milestone: `COLLABORATION_WORKSPACE_MEMBER_ROLE_CREDENTIALED_E2E_SMOKE_V1`

## Gate

- `COLLABORATION_E2E=1`
- `PLAYWRIGHT_BASE_URL`
- `COLLABORATION_E2E_OWNER_EMAIL` / `COLLABORATION_E2E_OWNER_PASSWORD`
- `COLLABORATION_E2E_WORKSPACE_ID`
- Optional: `COLLABORATION_E2E_MEMBER_USER_ID`

## Notes

- No migration (independent of `20260919`)
- No production Auth creation from this package
- Spec skips when env unset
