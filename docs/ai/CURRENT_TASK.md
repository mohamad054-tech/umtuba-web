# Current Task

## Task title

Creator Hero Social Links V1

## Status

`implementation-complete` — Feature implemented in isolated worktree; staged for manual commit (no trailers)

## Resume here (next session / next GO)

1. Manual commit (no Co-authored-by / Signed-off-by / trailers)
2. Push when approved; confirm `0 0`
3. Base: `origin/office/profile-identity-achievements-v1` @ `8ca12b7`
4. Do **not** start Home Unlock

## Branch

`office/profile-hero-social-links-v1`

## Exact refs

| Ref | Hash |
|-----|------|
| Base (Achievements tip) | `8ca12b7c1d783ec079274fb61721f9c00c17c421` |
| Worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-profile-hero-social-links-v1` |

## Done (feature — locked contract)

- Safe website href normalization in Hero (`https://` when missing; block unsafe schemes)
- Optional social/external link row from `about.links` (max 4, hide empty)
- Hides website/social row when Hero collapsed
- About Links section remains canonical
- No migrations; no verified/cover inventing
- Dependency order preserved: Hero → Strip → Achievements → Stats

## Gates (unchanged)

- `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false`
- `HOME_LOCK_ACTIVE = true`

## Out of scope

Home Unlock, Learning AI Tutor, verified badge, cover image, Store/Commerce.
