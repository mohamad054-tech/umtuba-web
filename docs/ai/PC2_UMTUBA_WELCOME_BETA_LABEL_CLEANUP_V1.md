# PC2 — Welcome beta label cleanup V1

```text
TASK_ID = PC2_UMTUBA_WELCOME_BETA_LABEL_CLEANUP_V1
STATUS = IMPLEMENTED_LOCAL_PREVIEW
BASE_COMMIT = 3dc06aacc2cbc12509144f7c1310f74c235a42ee
ALPHA_02_REMOVED = YES
JOIN_BETA_REMOVED = YES
LAYOUT_PRESERVED = YES
LOGO_CHANGED = NO
GLOBE_CHANGED = NO
PRODUCT_FUNCTIONALITY_CHANGED = NO
TYPECHECK = PASS
TESTS = PASS (18)
BUILD = PASS
LOCAL_PREVIEW = http://localhost:3010/welcome
MERGED = NO
DEPLOYED = NO
READY_FOR_OWNER_VISUAL_REVIEW = YES
```

## Removed from Welcome

1. Hero badge: `Alpha 0.2 · Built for a new generation` (`LandingHero.tsx`)
2. Nav CTA: `Join Beta` (`LandingHero.tsx`)
3. Lower-section CTA: `Join the Beta` (`welcome/page.tsx`) — same Welcome Join Beta control, not replaced

No i18n keys existed for these strings (hardcoded English only). Unused `JoinBetaLink.tsx` left in the repo so auth-session source tests stay untouched.

## Preserved

- Approved stacked/symbol logo presentation (V2 accepted)
- Globe import and behavior
- Home / World / Learning / Live / Messages nav links
- Start Exploring / Go Live
- No coming soon / preview / early access wording added
- `Beta Mission` heading left (not in the owner remove list)

## Preview

http://localhost:3010/welcome — HTML confirmed the two required strings are gone; logo assets and primary CTAs remain.
