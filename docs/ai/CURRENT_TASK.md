# Current Task

## Task title

UM Learning AI Tutor Backend — Thread Persistence Bridge

## Status

`closed-local-push` — committed and pushed; migration **not** applied

## Branch

`office/learning-ai-tutor-thread-persistence-bridge-v1`

## Base

`office/learning-ai-tutor-explain-again-v1` @ `f5bd406de3d7ccf6e1b83c4e6c720f8b71fd92dd`

## Milestone

`learning.tutor.thread_persistence_bridge@1.0.0`

## Delivered

- Migration (local file only): `20260872_learning_ai_tutor_thread_persistence_bridge_v1.sql`
- RPC: `append_my_learning_ai_tutor_exchange`
- Bridge wired for optional `threadId` on `answer_question` / `explain_again` / `give_hint`

## Accepted follow-ups (V1)

- SQL-level lesson binding
- Lean thread metadata read RPC
- Trusted-producer transcript integrity
- Structured oversize serialization

## Machine policy

AI Tutor Backend laptop only. Do **not** touch `alpha-0.2` / Web UI. No `npm run build`. Do not apply migration remotely without explicit GO.

## Next

`code_review` remains blocked. Do not restore Provider Foundation here.
