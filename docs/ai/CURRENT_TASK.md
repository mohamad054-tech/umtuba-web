# Current Task

## Task title

UM Learning — Learner Assessment Due UX Follow-through V1

## Status

`implementation-complete` — local commit pending validation; **no remote apply**.

## Milestone

`learning.learner.assessment_due_ux_followthrough_v1`

## Migration

`supabase/migrations/20260909_learning_assessment_due_ux_followthrough_v1.sql`

## Scope landed

- Delivery RPC exposes top-level nullable `due_at`
- Adapter + Due/Overdue presentation helpers
- Learner assessment page Due/Overdue display (no attempt gating)
- Docs + focused tests

## Branch / worktree

`office/learning-assessment-due-ux-followthrough-v1`  
`D:\umtuba-central\repos\umtuba-web-learning-assessment-due-ux-followthrough-v1`  
Base: `ce221d37a1200b4380aa84179680ad7dcce99bea`

## Explicitly out of scope

- Remote apply / migration repair
- Attempt eligibility / save / submit / scoring / completion
- Instructor due authoring / calendar changes
- Commerce / Translation / Collaboration / Billing / UEOS / Guardian

## Recommended next

Feature branch push + SoT FF when validation PASS; remote apply of `20260909` only on explicit GO.
