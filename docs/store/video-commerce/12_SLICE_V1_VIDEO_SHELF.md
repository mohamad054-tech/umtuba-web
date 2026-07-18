# Video Commerce — Slice V1 (Video Shelf Linking)

Status: implemented (local only — migration not applied remotely)  
Scope: Watch shop badge + bottom sheet. No ATC/checkout from Watch.

## Behavior (UX)

1. **Badge** — `🛍 N` shown only when ≥1 linked product is active at the current playhead. Hidden when count is 0.
2. **Sheet** — opens only on badge tap (never auto-open). Shows image, title, price, honest rating placeholder (`No ratings yet`), and **View Product**.
3. **No cart chrome** — no Add to Cart, no Checkout from the shelf.
4. **Playback** — shop open/close never sets `forcePause`; video continues.
5. **Close** — swipe down, outside tap/scrim, Escape, or advancing to the next video.
6. **Timeline** — `start_ms` / `end_ms` filter via `filterShelfItemsAtTime`; future products stay hidden until their window.

## Accessibility

- Badge: ≥44px hit target, `aria-label`, `aria-expanded`, `aria-haspopup="dialog"`, visible focus ring.
- Sheet: `role="dialog"`, `aria-modal`, labelled heading, Escape + focus trap/restore via `useDialogA11y`, scrim close.
- Links: `aria-label` includes product title; keyboard operable.
- `prefers-reduced-motion`: disables swipe drag transform.

## Analytics

| Event | When |
| --- | --- |
| `badge_shown` | Badge becomes visible for a post (once per post session) |
| `badge_opened` | User opens the shelf |
| `product_viewed` | Product row shown in an open shelf |

No purchase tracking in V1. Events land in `video_commerce_events` (fail-soft insert).

## Schema (migration file only)

Migration: `supabase/migrations/20260801_video_commerce_shelf_v1.sql`

### Tables

- `video_product_attachments` — post ↔ product link with `sort_order`, `status`, `start_ms`, `end_ms`
- `video_commerce_events` — `badge_shown` | `badge_opened` | `product_viewed`

### Functions

- `can_manage_video_product_attachment(post_id, product_id)` — post owner or store editor

### RLS (fail-closed)

- Attachments: public **select** only when `status = 'active'` and product/store publicly visible; manage limited to creator/store editors.
- Events: anon/authenticated may **insert** (own `user_id` or null); authenticated may **select** own rows only.

## Watch integration

- Route: `/watch` via `WatchExperience`
- Components: `ShopBadge`, `VideoShopShelf`, `useVideoShopShelf`
- Touched: `VideoOverlay`, `VideoSlide`, `VerticalVideoFeed`, `watchTypes`

## Out of scope (V1)

- Creator attach UI
- Live pins / hotspots
- Add to Cart / Checkout from Watch
- Fake ratings or social proof
- Remote migration apply
