# Cursor Report — Learning Spaces Membership Foundation V1 (review fixes)

## Summary

Rebased `office/learning-spaces-membership-foundation-v1` onto latest
`origin/alpha-0.2` (`b99d1b8`) and implemented pre-merge review fixes in the
existing `20260828` migration (numbering preserved). Membership RPCs now require
an **active** space; `allow_member_invites` and `public_member_directory` are
enforced; peer-admin mutations require the target's current rank strictly below
the actor; invite email validation matches the store pattern `^\S+@\S+\.\S+$`.
Contract tests expanded for the review cases. Not merged into `alpha-0.2`.

Branch: `office/learning-spaces-membership-foundation-v1`

## Exact files changed

### Modified

- `supabase/migrations/20260828_learning_spaces_membership_foundation_v1.sql`
- `lib/learning/spacesFoundation.ts`
- `lib/learning/spacesFoundation.test.ts`
- `docs/learning/implementation/SPACES_MEMBERSHIP_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None (existing `20260828_learning_spaces_membership_foundation_v1.sql` updated
in place on the feature branch before remote apply).

## Security review

- Membership invite/accept/role/suspend/remove/transfer refuse when space is not
  `active` (covers archived and suspended).
- Peer-admin demotion/suspend/remove blocked unless target rank &lt; actor rank
  (platform admin may still manage).
- `allow_member_invites=false` blocks non-manager invites; owners/admins retain
  invite management.
- `public_member_directory=false` limits member SELECT to own row (managers /
  platform admin still see directory).
- Invite email constraint + RPC validation use store-consistent pattern; weak
  length-only check removed.
- No secrets exposed; no remote migration apply; no merge to `alpha-0.2`.

## Tests

```
npx vitest run lib/learning/spacesFoundation.test.ts
```

Result: **35 passed** (1 file).

## TypeScript

```
npx tsc --noEmit
```

Result: **pass** (exit 0).

## Build

Not required (no app UI / entry-point changes).

## git diff --check

**pass** (exit 0).

## git status --short

See post-commit/push status in the handoff response.

## Open issues

- Migration still not applied to remote Supabase (by design for this phase).
- Feature branch ready for final merge review into `alpha-0.2`; do not merge
  until that review is complete.
- After rebase, push may require `--force-with-lease` to update the remote
  feature branch tip.
