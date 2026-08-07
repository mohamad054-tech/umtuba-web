# Current Task

## Task title

UM Learning — Personal Notes Hub history reallocation (`20260907` → `20260908`)

## Status

`git-correction-in-progress` — rename only; **no SQL apply**; **no migration repair** in this step.

## Milestone

`learning.learner.personal_notes_hub_v1` (history alignment)

## Version map (Learning SoT)

- `20260908` — Learning Personal Notes Hub (active migration filename)
- `20260909` — reserved next candidate for Learner Assessment Due UX Follow-through (**not created**)
- `20260910–12` — Translation (untouched)
- `20260907` — Commerce remote owner (untouched)

## Scope

- Rename Hub migration file to `20260908_learning_personal_notes_hub_v1.sql`
- Update tests/docs/version references
- No Hub SQL semantic changes
- No remote schema / repair in this GO

## Branch / worktree

`office/learning-resume-accessible-target-hardening-v1`  
`D:\umtuba-central\repos\umtuba-web-learning-sot-ff-merge-v1`

## Explicitly out of scope

- Migration repair of `20260908`
- SQL replay / `db push`
- Commerce / Translation / Due UX implementation
- Creating `20260909`

## Recommended next

After this commit is pushed: explicit GO for `migration repair 20260908 --status applied` only.
