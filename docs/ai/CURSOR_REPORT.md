# Cursor Report — Learning Programs Foundation V1 (hardening)

## Summary

Applied security & lifecycle hardening to Programs Foundation V1 on
`office/learning-programs-foundation-v1`:

1. Staff authority revalidates active parent-space membership
2. Suspended/archived programs reject normal mutations
3. JSON metadata size + key allowlists
4. Lifecycle timestamp normalization
5. Expanded contract tests (25 Programs + 35 Spaces = 60)

No commit. No push. No remote migration apply.

## Exact files changed

- `supabase/migrations/20260829_learning_programs_foundation_v1.sql`
- `lib/learning/programsFoundation.ts`
- `lib/learning/programsFoundation.test.ts`
- `docs/learning/implementation/PROGRAMS_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None new (`20260829` updated in place before first commit/apply).

## Security review

- Active space membership required for staff helpers and lead manage path
- Suspended/archived → platform moderate only for mutations
- JSON metadata fail-closed (8192 bytes, allowlists, shallow shapes)
- Timestamps normalized on publish/suspend/archive/recover

## Tests

`npx vitest run lib/learning/spacesFoundation.test.ts lib/learning/programsFoundation.test.ts`
**60 passed**

## TypeScript

`npx tsc --noEmit`: **PASS**

## Build

`npm run build`: **PASS**

## git diff --check

**PASS**

## Open issues

- Awaiting final review / commit approval
- Remote apply still deferred (`20260828` then `20260829`)
