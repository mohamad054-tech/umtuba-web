# Current Task

## Milestone

Commerce Final Handoff Documentation + Push V1 — **checkpoint persisted**.

## Active branch / worktree

- Branch: `office/commerce-sot-unification-stock-drift-v1`
- Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-sot-unification-stock-drift-v1`
- Base implementation HEAD (before this docs commit): `91e90e456971f498b7b8f9382dda9b609da7ef3d`
- Desktop is the sole active Commerce workstation. Laptop Commerce work is stopped (laptop → Learning).

## Done (Commerce checkpoint 2026-08-02)

- Money + inventory SoT unified (20 inventory commits; 29 focused files / 276 tests PASS; `tsc --noEmit` PASS; secret scan CLEAN)
- Remote project `umtuba` / `tgucwnjwoyeqoxqaxmew` — Wave A remainder, money chain, stock runtimes applied
- Active commission policy: `umtuba_launch_usd_v1` v1 · USD · 15%/85% · merchandise_net
- `commerce_confirm_enabled = 0`; Stripe live env not configured; payout rails mock/manual

Canonical state: `docs/store/operations/COMMERCE_CURRENT_STATE_2026-08-02.md`

## Exact next Commerce step

1. Provision Stripe production environment externally (HTTPS URL, mode, live keys, webhook, live flag, production ACK).
2. Re-run Stripe Production Gate Readiness Audit → require `READY_FOR_STRIPE_LIVE_TEST`.
3. Controlled Stripe E2E drill.
4. Only after full PASS, consider controlled `commerce_confirm` enable (separate GO).

## Stop conditions

- Do not enable `commerce_confirm` before Stripe E2E PASS.
- Do not place secrets in Git or print Stripe keys.
- Do not seed another commission policy without an explicit commercial GO.
- Do not resume Commerce work on the laptop.
