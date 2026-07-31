# SESSION_HANDOFF — Private AI Provider Routing Policy V1

## Where

- Worktree: `umtuba-web-private-ai-provider-routing-policy-v1`
- Branch: `office/platform-private-ai-provider-routing-policy-v1`
- Base / HEAD tip before feature commit: `14ce7fd`

## Done

- Provider Routing Policy Engine (`evaluateProviderRouting`) — decision only
- Policy: priority, capability, readiness, deployment, health, cost/region, tenant, override, preferred, fallback, black/white lists, maintenance, cooldown, failure suppression, budget max cost
- Result: selected provider/runtime, reason, rejections, fallback chain, policy version, confidence
- Dispatcher uses routing when `runtimeId` missing
- Admin `/admin/private-ai/provider-routing`
- schemaVersion 7 (file SoT; no SQL migration)
- Vitest: `privateAiProviderRoutingPolicy.test.ts` (12) + boundary suite still green

## Next GO

Manual commit (no trailers) → push → `0 0`
