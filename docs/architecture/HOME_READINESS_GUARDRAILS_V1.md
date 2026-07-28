# Home Readiness Guardrails V1

**Status:** Active — Home remains **locked**.  
**Base:** `alpha-0.2` @ `4248975` (Platform Navigation Architecture V1 complete through Content-flow Policy Decision).  
**Purpose:** Protect Video-First Home before any unlock or Content-flow Home implementation.

## 1. Hard lock

`HOME_LOCK_ACTIVE = true` in `app/lib/nav/homeReadinessGuardrails.ts`.

Do **not** flip this flag or change Home behavior without:

1. Explicit **Product GO**
2. Explicit **Home unlock** in the task scope

## 2. Locked surfaces

| Surface | Meaning |
| --- | --- |
| feed | Video-First Home feed load + presentation |
| swipe | Vertical feed navigation / gesture behavior |
| ranking | Video order / selection for Home |
| player | In-feed video playback surface |
| circles-layout | `HomeSectionCircles` layout & presentation |
| engagement | Likes/views/signals/action rail & related Home chrome |
| home-shell | `/` page + DiscoverShell Home framing |

## 3. Owned path inventory

Canonical Home lock paths (see `HOME_LOCK_OWNED_PATHS`):

- `app/page.tsx`
- `app/components/home/HomeFeedLoader.tsx`
- `app/discover/DiscoverExperience.tsx`
- `app/discover/page.tsx` (forever alias — do not remove)
- `app/discover/components/*` including `HomeSectionCircles`, feed, card, native video, action rail, shell

Related shared video helpers (`HOME_LOCK_RELATED_SHARED_PATHS`) affect Home when changed — treat Home-impacting edits as locked.

## 4. Contracts that must be preserved

- Platform Navigation: Home is Discovery primary; `/discover` → `/` alias
- Home circles destination order (`HOME_CIRCLE_ENTRY_HREFS`) — layout locked
- Mobile World Affordance: World not on mobile bottom nav
- Content-flow Policy Decision: **Preferred Flow** `Home → Creator Space → Content` is **documented only**; Allowed Shortcuts may remain until unlock
- `buildPostNotificationHref` stays `/discover?post=` unless a later GO says otherwise

## 5. Preferred Flow status

Preferred Flow is architectural (Content-flow Policy Decision V1).  
**Not implemented** as a forced Home CTA change in Guardrails V1.

## 6. Out of scope for Guardrails V1

- Any visual/behavioral Home change
- Content-flow Home Implementation
- Watch redesign, Creator Space UI, Store Domain, mobile primary changes
- New redirects / route renames

## 7. Verification

- `app/lib/nav/homeReadinessGuardrails.test.ts`
- Existing nav/content-flow/platform contracts
