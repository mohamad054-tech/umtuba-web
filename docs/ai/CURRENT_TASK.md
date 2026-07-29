# Current Task

## Task title

Creator Identity Strip V1

## Status

`implementation-complete` — Feature implemented in isolated worktree; awaiting clean local commit (no trailers)

## Resume here (next session / next GO)

1. Confirm branch `office/profile-identity-strip-v1` tip after commit
2. Confirm sync with origin after push: `0 0`
3. Confirm base was `origin/alpha-0.2` @ `03fe5e7e78cf4239317551671c7c33206523def7`
4. **Next GO only (separate step):** Fast-Forward merge into `alpha-0.2` + push alpha
5. Do **not** start Home Unlock (`HOME_LOCK_ACTIVE` remains true)

## Branch

`office/profile-identity-strip-v1`

## Exact refs

| Ref | Hash |
|-----|------|
| Base (`origin/alpha-0.2` at branch creation) | `03fe5e7e78cf4239317551671c7c33206523def7` |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-profile-identity-strip-v1` |

## Done (feature — locked contract)

- Identity Strip under Hero, above Stats/Actions/tabs (`ProfileIdentityStrip`)
- Role chips: max 2 visible + `+N` overflow button opens About
- Interest teasers: max 0–2 on strip; full interests remain on About
- Optional `about.roles` on view-model; Supabase map → `[]` (no migration / invented DB column)
- About tab Roles section when roles present
- Specialties remain Hero Completeness (Header only)
- Helpers + Vitest; mock `lina.creates` / `maya.labs` roles for preview
- Home locks / Learning / AI Tutor / Store untouched

## Not done yet

- Local commit + push (no trailers)
- FF-merge into `alpha-0.2` (explicit GO required)
- Persisting roles from a real DB column (Product/DB decision)

## Gates (unchanged)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`

## Out of scope

Home Unlock, Learning AI Tutor backend, verified badge, cover image, Store/Commerce, inventing `profiles.roles` migration.
