# Learning Lesson Engine Composite Access Fix V1

## Problem

Lesson content access composed `unlock_required` and `unlock.locked` with an
OR that treated `unlock_required === false` + `locked === true` as manager
authorization **without requiring `unlocked === true`**.

A missing or false `unlock_required` (including parse defaulting) combined with
`locked: true` and `unlocked: false` therefore failed open and could authorize
protected content.

Resume / Prev / Next already shared the published lesson tree, but the lesson
route did not re-check that the requested lesson id was inside that accessible
set before starting protected delivery.

## Fix

1. **Composite unlock decision** (`resolveLessonContentAccess`):
   - `unlock_required === true` → always `locked` (DB redaction path)
   - `unlock_required === false` + `locked === true` → require `unlocked === true`
     (manager/admin bypass); otherwise fail closed as `locked`
   - `unlock_required === false` + `locked === false` → free / unlocked learner
     (preserves free-lesson / first-lesson open rules even when `unlocked` is false)

2. **Accessible-set composition** (`composeLessonContentAccessWithAccessibleSet`
   + `resolveComposedLessonLearnerAccess`):
   - Same accessible published lesson ids as Resume / Prev / Next
   - Lesson page composes unlock access with that set **before**
     `loadLessonDeliveryForAccess` so progress mutations never start for
     out-of-tree lesson ids

## Preserved

- First lesson / free-access rules
- Points unlock / lock UX
- Assessment, AI Tutor, instructor paths
- Route structure

## Migrations

None.
