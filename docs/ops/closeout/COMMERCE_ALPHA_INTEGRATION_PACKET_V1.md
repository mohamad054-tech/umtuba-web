# COMMERCE ↔ alpha-0.2 Integration Packet V1

| Field | Value |
| --- | --- |
| PACKET_ID | `COMMERCE_ALPHA_INTEGRATION_PACKET_V1` |
| PREPARED_BY | DESKTOP-A1 |
| WAVE | `DESKTOP_CLOSEOUT_WAVE_2_V1` |
| TASK | `COMMERCE_STRIPE_TEST_AND_DIVERGENCE_CLOSEOUT_V1` |
| TIMESTAMP | 2026-08-12 12:40:14 +03:00 |
| AUTHORITY | Central / Integration coordinator (Desktop must not silent-merge) |

## Verdict

| Field | Value |
| --- | --- |
| INTEGRATION_CLASS | **NEEDS_CENTRAL_REVIEW** |
| SAFE_FF | **NO** (neither tip is ancestor of the other) |
| SAFE_MERGE | **NO** without Central review (product + package overlaps conflict) |
| BLOCKED | Silent Desktop merge / rebase / force-push |

## Live refs (resolved this wave; do not reuse stale report SHAs blindly)

| Ref | Full SHA | Notes |
| --- | --- | --- |
| Commerce tip | `9227cc3bd6fc293561f60e87b3d6af204c640947` | `origin/office/commerce-partial-refund-provider-money-execution-v1` (A0/B0) |
| `origin/alpha-0.2` | `e84475a769c731bb7e1ad511b3543ee714d2feea` | Authoritative release tip |
| Common ancestor | `6cbe0f68f418141ac887c99bf40e21eb1d0d27de` | `fix(commerce): stabilize end-to-end beta readiness v1` |
| Stripe REGRESSION (ancestor of tip) | `df4766803cb28af541ca6af13301e8faeb51db44` | Focused suite revalidated |

Left-right count (`tip...alpha`): **103** only-on-Commerce / **195** only-on-alpha.

## Asymmetry (why not trivial)

- Commerce-only history (~103): partial-refund provider money stack, Stripe TEST control-plane/fixtures/activation SM, seller live payout, settlement/refund hardening, RC safety matrices.
- Alpha-only history (~195): UM Core / AI catalog+metering / Games Hub / translation/media/scripts and related productization on the release line.
- File churn since merge-base: Commerce **556** paths; alpha **815** paths; overlap **9** paths (both sides edited).

## Overlap / conflict set (merge-tree “changed in both”)

| Path | Risk | Guidance for Central |
| --- | --- | --- |
| `.env.example` | MEDIUM | Merge both: keep Commerce Stripe TEST shape keys + alpha AI/provider keys; never copy secrets |
| `app/components/store/CheckoutClient.tsx` | **HIGH** | Manual product merge — Commerce payment/checkout honesty vs alpha checkout copy/UX edits |
| `app/lib/nav/routes.ts` | MEDIUM | Reconcile Commerce store/admin routes with alpha Discovery/Home alias notes |
| `lib/store/paymentOutcomeSync.test.ts` | MEDIUM | Prefer Commerce CRLF-normalization + keep any alpha assertion updates |
| `package.json` | **HIGH** | Union scripts carefully (Commerce verify script vs alpha translation/media workers) |
| `docs/ai/CURRENT_TASK.md` | LOW | Prefer alpha release handoff; archive Commerce notes under store/ops |
| `docs/ai/CURSOR_REPORT.md` | LOW | Append-only / regenerate after land |
| `docs/ai/PROJECT_STATE.md` | LOW | Prefer alpha SoT after land; stamp Commerce tip as integrated |
| `docs/ai/SESSION_HANDOFF.md` | LOW | Prefer alpha; link this packet |

No other path-level overlaps detected since merge-base (Commerce money modules largely land into alpha empty space).

## Recommended integration strategy (Central-owned)

1. **Do not FF** either tip onto the other.
2. Open a dedicated integration branch from `origin/alpha-0.2` @ `e84475a…`.
3. Merge Commerce tip `9227cc3…` with explicit conflict resolution on the 9 overlap files (product owners for CheckoutClient + package.json).
4. Re-run on the merge result:
   - Tip money/Stripe focused suite (this wave: **630/630 PASS** on tip)
   - Broader `lib/store` suite
   - `npx tsc --noEmit` + targeted build if UI entry points change
5. Keep fail-closed: LIVE Stripe OFF, `commerce_confirm` OFF, provider-money gates OFF until separate TEST GO.
6. Land via normal push only after Central review; no force-push; preserve WIP elsewhere.

## Explicit non-actions (Desktop A1)

- No merge/rebase performed.
- No WIP discard; `_port_extract` untouched.
- No Stripe network / production DB mutation.

## Evidence pointers

- Wave 2 report: `docs/ops/closeout/DESKTOP_A1_COMMERCE_STRIPE_DIVERGENCE_CLOSEOUT_V1.md`
- Tip vitest log: `docs/ops/closeout/_a1_wave2_tip_money_vitest_log.txt`
- REGRESSION vitest log: `docs/ops/closeout/_a1_wave2_stripe_refund_vitest_log.txt`
