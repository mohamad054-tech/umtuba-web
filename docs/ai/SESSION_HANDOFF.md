# Session Handoff — UMTUBA

**Updated:** 2026-08-05 (Windows Server — AI Platform)

## Active platform track

**AI Core Anthropic on Gemini Recovery V1 — implementation complete**

| Item | Value |
| --- | --- |
| Branch | `office/ai-core-anthropic-on-gemini-recovery-v1` |
| Base | `919dc75` (Gemini Adapter Recovery V1) |
| Worktree | `D:\umtuba-central\repos\umtuba-web-ai-core-anthropic-on-gemini-recovery-v1` |
| Prior closed | Gemini Adapter Recovery `919dc75` |

## Done

- Anthropic `AiProviderAdapter` via Messages REST
- Registry + foundation selection; OpenAI/Gemini/Anthropic interchangeable
- Fail-closed without `ANTHROPIC_API_KEY`; structured JSON preserved
- Streaming not enabled

## Next GO

1. Confirm commit + push sync `0 0`
2. Next milestone: Local / self-hosted adapter on this recovery tip
3. Do not merge to alpha without GO

## Frozen architecture

Do not modify `docs/commerce/**`, Learning frozen baselines, Games/Ads/Revenue/Platform architecture docs unless an operational handoff status line is required.
Do not touch Collaboration / Mobile / Guardian.
