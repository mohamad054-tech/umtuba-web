# UMTUBA Premium Experience QA Checklist V1

**Status:** Shared acceptance gate for post-device Premium waves  
**Owners:** Central runs Final Premium Experience QA after PC2 / Laptop / Desktop packets integrate  
**Scope:** Cross-platform quality — not a substitute for domain functional tests

Use after Store Premium (PC2) and Learning Premium (Laptop) land on an agreed tip. Android/Play checked on its own track.

## Acceptance checklist (12)

1. **Brand chrome** — One primary UMTUBA brand treatment in sticky top nav; no competing duplicate brand hierarchy; void/chrome background consistent on non-Store shells (`--platform-void` or equivalent `#050510`).
2. **Nav contract** — Desktop primary matches platform nav contract (Home / World / Learning / Live / Messages). Mobile primary Home / Live / Messages / Profile. Discover aliases Home active. No Discover as a separate primary label.
3. **No prefetch storm** — Home circles + top nav + bottom nav do not trigger unbounded route prefetch (`prefetch={false}` Laptop packet integrated + measured; baseline ~36 Home RSC requests reduced).
4. **Touch & density** — Bottom-nav targets ≥44px; top-nav actions usable at 360–768px without horizontal overflow or clipped controls.
5. **Bottom inset** — Content never hidden under mobile bottom nav (`--app-mobile-bottom-nav-offset` respected on shared shells).
6. **Focus visible** — Keyboard focus rings consistent (prefer `.watch-focus-ring` / `--platform-focus-ring`); brand and auth links included; menus dismiss on Escape with sensible focus return.
7. **Dialogs** — Shared modals expose `role="dialog"`, `aria-modal`, and focus trap/restore (or documented equivalent via `useDialogA11y`).
8. **Empty / error / loading** — Platform routes use shared product states; polite live regions; errors sanitized; no prototype “Coming soon” chrome on critical paths.
9. **Motion** — `prefers-reduced-motion` disables decorative landing/watch/shell animations; no stuck transforms.
10. **Typography rhythm** — Eyebrow / title / body sizes and tracking follow documented platform scale (not ad-hoc per page); domain forks documented.
11. **Domain boundary** — Store warm tokens may differ inside storefront without breaking platform nav readability; Learning Premium stays in Learning-owned paths unless Central ACK on shared files.
12. **Production bar** — No stub chrome on critical paths; a11y/keyboard smoke on Home + Settings + Auth + one Store hub + one Learning hub; `tsc` / scoped tests / build green on tip SHA; no force push; locks retained (PRODUCTION_READY / Learning CLOSED not contradicted).

## Pass criteria

```text
PREMIUM_EXPERIENCE_QA = PASS
  only when all 12 checked with evidence (screenshots or notes + SHA)
  and AUTH_CALLBACK_P0 closed or explicitly waived by operator for UX-only staging
```

## Explicit fails

- Blind merge of device packets with shared-file conflicts unresolved
- Reopening locked gates without NEW evidence
- Inventing PASS for absent prefetch / absent SSH deploy
