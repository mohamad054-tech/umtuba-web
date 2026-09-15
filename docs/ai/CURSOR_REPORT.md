# CURSOR_REPORT — Shared AI Surface Integration V1

## Summary

**FAIL for worktree/branch contract; functional Shared AI checks PASS on current tree.**

Current folder `umtuba-web-shared-ai-surface-integration-v1` is checked out as
`office/platform-private-ai-workflow-lifecycle-v1` @ `db6f52a` (not Gemini tip
`30bda6a`). Working tree mixes Private AI Workflow files + Shared AI Surface
files. Per operator instruction: no reset/clean/backup restore was performed.

On this mixed tree: focused Shared AI tests **35/35 PASS**, `tsc --noEmit`
**PASS**. Translation Studio admin AI path is wired through `aiService`.
Architecture guards + secret sanitize present. No `.env.local` → live smoke
not run. No commit / no push.

## Verdict detail

| Contract | Result |
| --- | --- |
| Independent Shared AI branch @ Gemini tip | **FAIL** (wrong branch/HEAD) |
| Shared AI functional wiring + tests | **PASS** on current files |
| Tree isolation from Private AI task | **FAIL** (mixed dirty tree) |

## Open issues

1. Re-home Shared AI work onto `office/platform-shared-ai-surface-integration-v1`
   @ `origin/office/platform-gemini-live-provider-v1` **without destructive
   commands** — needs explicit operator GO on the safe procedure.
2. Keep Private AI Workflow changes on their own branch/worktree.
3. **Learning Tutor UI still on stub RPC** (`app/learning/.../ai-tutor` +
   `appendAiTutorMessageAction` / `aiTutorFoundation`) — backend Shared AI
   actions exist but learner UI does not call them. Highest remaining product
   gap after inventory audit.
4. Commerce product-draft seller UI / Assistant chat UI: Core ready, product UI
   absent or Hub-entry-only (intentional / deferred unless tasked).
5. After separation + GO: Commit (no trailers) + Push + verify `0 0`.
6. Live smoke needs worktree `.env.local` with `GEMINI_API_KEY`.
