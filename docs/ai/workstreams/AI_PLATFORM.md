# AI Platform Workstream (Desktop-owned)

## SAVE POINT â€” 2026-08-05 (Windows Server)

**Machine:** Windows Server 2019
**Active work:** AI Core Anthropic on Gemini Recovery V1

| Item | Value |
| --- | --- |
| Active branch | `office/ai-core-anthropic-on-gemini-recovery-v1` |
| Base | `919dc75` â€” Gemini Adapter Recovery V1 |
| Remote | Commit + push on this milestone |
| Do not merge / no PR unless asked | Yes |

**Done this session (Server):**
1. Anthropic provider adapter behind `AiProviderAdapter` on Gemini recovery tip
2. Config + model registry + foundation selection (OpenAI/Gemini/Anthropic interchangeable)
3. Normalized error mapping + structured JSON (prompt-steered; no illegal open-object `output_config`)
4. Streaming left disabled; fail-closed without `ANTHROPIC_API_KEY`
5. Default model `claude-haiku-4-5-20251001`; unit tests + focused AI suite + `tsc`

**NOT done / do not touch by mistake:**
- Live Anthropic API smoke (optional next)
- Local / self-hosted adapter (next on this recovery lineage)
- Product Home / Navigation / Creator / App Shell
- Commerce / Learning / Collaboration / Mobile / Guardian
- Alpha merge
- Remote migration apply without explicit GO

---

**Ownership:** Server AI_EXECUTION_MODE for Shared AI Core provider lineage on Gemini recovery tip.
**Do not touch:** Commerce, Learning, Collaboration, Mobile, Guardian.

## Status

Shared AI Core Foundation V1 closed.
Gemini Adapter Recovery V1 closed @ `919dc75`.
Anthropic Adapter ported onto recovery tip (this branch).

## Provider Foundation (V1)

```
Capability / aiService
  â†’ gateway.execute
  â†’ createProviderFoundation(config)
  â†’ resolveRoute(request)  // fail-closed + deterministic routeModel
  â†’ requireAdapter(providerId)
  â†’ adapter.execute(...)
```

| Piece | Role |
| --- | --- |
| `AiProviderFoundation` | Central provider + model + adapter registries |
| Typed model descriptors | provider id, model id, capabilities/modalities, enabled/available, context/output limits |
| Selection layer | Capabilities never hardcode provider/model names |
| Gemini | Adapter registered when `GEMINI_API_KEY` present; otherwise listed unavailable |
| Anthropic | Adapter registered when `ANTHROPIC_API_KEY` present; otherwise listed unavailable |

**Fail-closed when:** unknown provider, unknown model, disabled/unavailable model, unsupported capability/modality, unregistered adapter.

**Client exposure:** unchanged â€” server actions / integration still strip provider/model internals from UI payloads.
