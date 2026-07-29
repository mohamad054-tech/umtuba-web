# UMTUBA Alpha Beta Operations V1

Truth line baseline for this program: `origin/alpha-0.2` (post Wave 4).

This is an **operations** guide for showing / operating Alpha as a coherent Beta.
It does not enable live money, Gemini, World, or Games productization.

---

## What should be ON for Beta demos

| Surface | Default | Notes |
| --- | --- | --- |
| Home / Watch / Profiles | ON | Public product surfaces |
| Discover | Alias → Home | Not a separate product |
| Messages / Live / Notifications / Settings | ON (auth where required) | Live may show honest “coming soon” controls |
| Learning (authenticated hub + catalog) | ON | Tutor product UI stays OFF unless AI flags ON |
| Store browse / PDP / cart / quote | ON | Browse + quote preview |
| Seller / Admin Store tools | Capability-gated | Ops only |
| Commerce confirm (DB) | **OFF** | `commerce_confirm_enabled = 0` |
| AI Hub / Assistant Runtime / Video AI | **OFF** | Fail-closed |
| Home circular arc foundation | **OFF** | `HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false` |
| Home lock | **ON** | `HOME_LOCK_ACTIVE = true` |

---

## What stays OFF

- Live PSP / capture / payout
- Gemini / OpenAI live providers and API keys
- AI Hub chrome entry (intentionally absent)
- Games playable catalog
- World Discovery product mode (foundation may soft-disable)
- Ads delivery productization
- Learning Nexus salvage (separate program)

---

## How to stop Commerce

1. **Preferred emergency:** Admin Store → Reservations → **Disable commerce confirm (DB)**.
2. **App-layer kill (Next only):** set `STORE_COMMERCE_CONFIRM_KILL_SWITCH=1` (or `true`) in the server environment and redeploy/restart.
3. Know the limit: env kill blocks Next confirm actions; **DB gate OFF is authoritative** for RPC callers. Do both for true emergency.

Verify: checkout “Record order” stays disabled / purchases unavailable banner shows; cart shows gate banner.

---

## How to stop AI

1. Ensure env unset or not truthy:
   - `UMTUBA_AI_HUB`
   - `UMTUBA_AI_ASSISTANT_RUNTIME`
   - `UMTUBA_AI_VIDEO_PERSONALIZATION`
2. Verify:
   - `/ai-hub` → notFound
   - Lesson pages hide **AI Tutor** link
   - `/learning/lessons/[id]/ai-tutor` shows **Tutor unavailable** (no threads / no provider calls)
   - No AI Hub item in primary nav / user menu

---

## How to verify Revenue / money honesty

- Checkout CTA reads **Record order (no charge)** after success **Order recorded — payment pending**.
- Disabled PSP providers are **not listed** in checkout UI.
- Wallet / Rewards do not offer withdraw / cash-out.
- Seller analytics must not be treated as withdrawable cash when payouts are disabled.
- Do **not** run `apply_store_payment_outcome` against production Beta for demos unless an explicit sandbox protocol is approved (service_role capture can mark paid without PSP).

---

## Known limitations (non-blocking for Beta)

- Env commerce kill is app-layer only (documented above).
- Deferred → captured remains a service_role ops capability; treat as sandbox-only.
- Games Home circle still routes to an honest unavailable shell (circle layout locked).
- Primary Learning points at authenticated hub (catalog is public but not primary nav target).
- Watch is public but not on primary chrome.
- Lint debt baseline (~74) remains; Beta must not add regressions.
- Learning protected worktree Nexus work is **out of scope** for this program.

---

## Rollback steps

1. Revert/redeploy previous known-good `alpha-0.2` tip if needed (no force-push; use forward fix or revert commit).
2. Force DB commerce confirm **OFF**.
3. Clear AI product flags from env.
4. Confirm `/ai-hub` 404s and checkout cannot record orders while gate OFF.

---

## Feature flag quick reference

| Flag | Effect when ON |
| --- | --- |
| `UMTUBA_AI_HUB` | Enables `/ai-hub` experience |
| `UMTUBA_AI_ASSISTANT_RUNTIME` | Enables assistant runtime execution |
| `UMTUBA_AI_VIDEO_PERSONALIZATION` | Enables video personalization wiring |
| `STORE_COMMERCE_CONFIRM_KILL_SWITCH` | App-layer deny of confirm (kill only) |
| DB `commerce_confirm_enabled` | Authoritative purchase confirm gate |
