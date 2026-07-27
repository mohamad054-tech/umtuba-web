# Content Card System V1

**Status:** Architecture only (no implementation)
**Branch base:** `alpha-0.2` @ `f053709`
**Depends on:** Unified Content Foundation V1 · Unified Content Services V2 · Creator Space Experience V1 · Unified Experience Page Consolidation V1
**Hard constraint:** Do **not** redesign Home feed/player. Cards may *describe* how Home could consume a shared language later; this phase does not change Home UI.

---

## 0. Purpose

Every piece of content in UMTUBA must be expressible as one **Content Card** family — same anatomy, same metadata language, same CTA slot — regardless of kind.

```text
Registry row  →  Card View Model  →  Variant layout  →  Surface
   (data)           (contract)         (density)        (Home / Space / Search / …)
```

**Not:** a different design system per Articles / Videos / Courses / Store.
**Yes:** one card grammar; kind only changes preview + CTA label + status chips.

---

## 1. Design principles

1. **One grammar.** Header · Preview · Metadata · Status · Actions · CTA — always in that conceptual order (slots may collapse when empty).
2. **Kind is a label, not a layout rewrite.** Article and Product share structure; previews differ.
3. **Answer four questions on every card:**
   - What is this? → kind + title
   - Who owns it? → creator
   - How was it discovered? → discovery binding / surface context
   - Where does it go? → canonical href + CTA
4. **Registry is the index.** Domains remain authoritative; cards project registry (+ domain enrichment), never invent a second source of truth.
5. **Dedup-aware.** Article + teaser = **one** article card in Creator Space All / unified lists (see Creator Space V1). Teaser is discovery media, not a sibling card.
6. **Home stays Video First.** Home’s primary unit remains the vertical video experience. Content Cards are the system for **catalog / timeline / search / related / Space** surfaces. Home may later reuse card metadata chips without adopting a card feed.
7. **Extensible kinds.** New kinds register an adapter + preview recipe + CTA verb — no new card framework.
8. **UMTUBA identity.** Dark glass, bold title, blue accent, kind micro-label — not FB/IG/TikTok card clones.

---

## 2. Card anatomy

```text
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│  [kind]  ·  optional context (Pinned / Featured / surface)  │
│  [creator avatar+name]          [time]     [more ⋯]         │
├─────────────────────────────────────────────────────────────┤
│ PREVIEW                                                     │
│  aspect + media recipe by kind (image / still / live / …)   │
│  overlay badges (Live / New / Premium …)                    │
├─────────────────────────────────────────────────────────────┤
│ BODY                                                        │
│  Title (1–2 lines)                                          │
│  Subline / excerpt / price / lesson count (kind-specific)   │
├─────────────────────────────────────────────────────────────┤
│ METADATA ROW                                                │
│  visibility · verification · discovery hint · featured      │
├─────────────────────────────────────────────────────────────┤
│ FOOTER                                                      │
│  [secondary actions]                    [ PRIMARY CTA ]     │
└─────────────────────────────────────────────────────────────┘
```

### Slots

| Slot | Role | Required? |
| --- | --- | --- |
| **Header** | Kind label + creator + relative time + overflow | Kind + title elsewhere; creator may hide on Profile-owned surfaces |
| **Preview** | Visual hook | Preferred; text-only fallback allowed |
| **Body** | Title + one context line | Title required |
| **Metadata** | Shared flags (visibility, pinned, teaser-bound, etc.) | Optional chips; hide empty |
| **Status** | Live/New/Featured/Draft/Premium overlays or chips | Optional |
| **Actions** | Save, share, overflow (non-navigating) | Optional by variant |
| **CTA** | Primary navigation verb | Required for interactive cards |

### Focus / hit target

- Whole card is one primary link to `canonical_href` (or kind destination).
- CTA may visually reinforce the same href (avoid dual conflicting destinations).
- Secondary actions are separate controls (stop propagation in future UI).

---

## 3. Shared metadata

### Card View Model (design contract)

Maps from `content_registry` + domain enrichment. Today’s `ProfileContentCard` is a **minimal subset**; V1 target expands the projection without breaking domains.

| Field | Source / note |
| --- | --- |
| `registryId` | `content_registry.id` |
| `kind` | `content_kind` (extend beyond article/video over time) |
| `sourceEntityId` | Domain PK |
| `title` | Registry title |
| `canonicalHref` | Registry `canonical_href` |
| `publishedAt` / `updatedAt` | Registry timestamps |
| `ownerUserId` | Registry owner |
| `creator` | `{ id, displayName, username, avatarUrl, verified? }` — enrich |
| `visibility` | `public` / `unlisted` / `private` |
| `publishState` | `draft` / `published` / `unpublished` |
| `discoveryPostId` | Nullable; Home teaser binding |
| `discoveryMode` | `none` \| `teaser_bound` \| `native_video` \| `surface_promo` |
| `featured` | Boolean (future) |
| `pinned` | Boolean / pin rank (Creator Space) |
| `hasGeneratedTeaser` | True when article has discovery teaser |
| `preview` | `{ recipe, src?, poster?, aspect, alt }` |
| `statusBadges` | Derived list (see §6) |
| `cta` | `{ verb, href }` |
| `metrics` | Optional views/price/lessons — kind-specific, never required for render |

### Discovery semantics

| `discoveryMode` | Meaning |
| --- | --- |
| `teaser_bound` | Article (or other) discovered via generated/linked Home teaser — **do not** also show teaser as Video card in All |
| `native_video` | Independent video post |
| `surface_promo` | Featured on a surface without being the entity’s primary discovery |
| `none` | Catalog-only / no Home binding |

### Visibility display

- Public: no chip (default).
- Unlisted / Private: chip for **owner** (and staff); visitors should not see private cards in public lists.

---

## 4. Kind recipes (preview + CTA)

| Kind | Preview | Subline | CTA verb | Destination |
| --- | --- | --- | --- | --- |
| **Article** | Cover image **or** teaser still (not autoplay in card) | Excerpt · read time | **Read article** | `/articles/[id]` |
| **Video** | 9:16 or 16:9 thumb; optional mute hover preview later | Views · duration | **Watch** | `/watch?post=` |
| **Course** | Course cover 16:9 | Level · lessons | **Start course** / View course | Learning course/catalog href |
| **Product** | Product image 1:1 | Price · store | **View product** | Store PDP |
| **Live** | Gradient/preview; pulse if live | Viewers · schedule | **Join live** / View | `/live/[roomId]` |
| **Photo** | Image 1:1 crop | Caption clip · date | **View** | Lightbox / post detail (future) |
| **Future** | Register `preview.recipe` + CTA verb in adapter | — | Kind verb | `canonical_href` |

### Article teaser rule

```text
Article registry row + discovery_post_id
  → ONE Article card (hasGeneratedTeaser=true)
  → Preview MAY use teaser poster frame
  → CTA always Read article (never Watch teaser as primary)
```

### Video vs teaser

Independent video → Video card + Watch.
Teaser-only post → not a Content Card in Creator Space All (discovery asset).

---

## 5. Variants

Same anatomy; different **density and slot visibility**.

| Variant | Use | Density | Creator in header? | Preview size |
| --- | --- | --- | --- | --- |
| **Feed** | Future non-Home feeds / World lists | Comfortable | Yes | Large |
| **Profile** | Creator Space All + kind tabs | Comfortable | No (Space owns identity) | Medium |
| **Search** | `/search` results | Compact–medium | Yes | Small–medium |
| **Related** | End of article / course sidebar | Compact | Optional | Small |
| **Featured** | Pinned rail / promos | Emphasized preview | Optional | Large |
| **Compact** | Dense lists, menus, “more from creator” | Minimal | Often avatar-only | Tiny or none |

```text
Featured:   [ big preview ] title CTA
Profile:    [kind] title preview meta CTA
Compact:    [thumb] title · kind · time
Search:     [thumb] title creator meta CTA
```

**Invariant:** Changing variant never changes `canonicalHref` or kind semantics.

---

## 6. CTA strategy

- One **primary** CTA verb per kind (table above).
- CTA label may localize (AR/EN) but maps to the same action id: `read_article`, `watch`, `start_course`, `view_product`, `join_live`, `view_photo`.
- Owner viewing Draft: CTA may become **Edit** (owner-only), still same slot.
- Do not stack multiple primary CTAs (e.g. Read + Watch) on one card.
- “Has teaser on Home” is metadata/chip for owners — not a second CTA for visitors.

---

## 7. Status system

| Badge | Who sees | When |
| --- | --- | --- |
| **Live** | Everyone | Live session active |
| **New** | Everyone | Published within policy window (e.g. 72h) |
| **Featured** | Everyone | Surface/editorial flag |
| **Updated** | Everyone | Meaningful update after publish |
| **Draft** | Owner (+ staff) | `publish_state=draft` |
| **Premium** | Everyone | Entitlement/paywall flag (future) |
| **Pinned** | Everyone | Creator Space pin |
| **Teaser** | Owner optional | `hasGeneratedTeaser` |

Priority if crowded: Live > Draft > Pinned > Featured > Premium > New > Updated > Teaser.
Max **2** badges on compact variants; up to **3** on Featured/Profile.

---

## 8. Motion

| State | Behavior |
| --- | --- |
| **Hover** (pointer) | Slight brightness / border lift; no heavy shadow stack |
| **Press** | Scale ≈ 0.98 brief |
| **Focus** | `watch-focus-ring` (or equivalent) on card/CTA |
| **Loading** | Skeleton matching variant geometry |
| **Transition** | Tab/list replace: short fade; images lazy-fade in |
| **Reduced motion** | No scale/hover motion; instant state changes |

Skeletons: Preview block + 2 text lines + CTA pill ghost — never a spinner-only empty card.

---

## 9. Responsive

| Breakpoint | Profile / Feed | Search / Related | Featured |
| --- | --- | --- | --- |
| Mobile | 1-col full width | List row compact | Full-bleed preview |
| Tablet | 1-col ~ readable width | 2-col optional | Rail 2–3 items |
| Desktop | Max ~40–45rem All column | Sidebar compact | Horizontal pin rail |

Grids (Photos / Products tabs) still use **the same card grammar** with grid-oriented Featured/Compact variants — not a separate design system.

---

## 10. Accessibility

- Card is a single landmark link **or** article with one primary link; do not nest interactive links without clear names.
- Screen reader name: `"{kind}: {title} by {creator}"` (+ status if Live/Draft).
- Keyboard: Tab to card/CTA; Enter/Space activates.
- Focus order: card → secondary actions → next card.
- Kind not by color alone (text kind label required).
- `prefers-reduced-motion` honored.
- Decorative preview → empty alt if title presents the name; otherwise meaningful alt.

---

## 11. Future content (extension)

To add **AI content / Events / Games** without breaking the system:

1. Extend `ContentKind` (or adapter registry) with new kind.
2. Implement domain adapter (Foundation/Services pattern).
3. Provide: `resolveCanonicalHref`, `resolveProfileCard` enrichment, **preview recipe**, **CTA verb**, optional badges.
4. Map into Card View Model — no new React “special snowflake” page card.
5. Creator Space tab visibility follows Space V1 rules.

```text
New kind ──► Adapter ──► Registry row ──► Card VM ──► existing variants
```

---

## 12. Integration

### Creator Space

- **All** tab: Profile variant + dedup rules.
- Kind tabs: same cards, filtered by kind (Photos grid = Compact/Featured grid).
- Pinned rail: Featured variant.
- Owner Draft badges allowed.

### Home

- Remains Video First player — **out of scope to restyle**.
- Teaser videos stay player items; article identity uses existing creator/article affordances.
- Future: optional metadata chips may align with this vocabulary without converting Home into a card feed.

### Registry / Unified Content

- `content_registry` = thin index (kinds today: `article`, `video`; more later).
- Services V2 projections (`profileProjectionService`, discovery binding) feed Card VM.
- Dedup: article with `discovery_post_id` → article card only in unified lists.
- Canonical navigation always via `canonical_href` / CTA href.

```text
┌────────────┐     ┌──────────────┐     ┌─────────────┐
│  Domains   │────►│   Registry   │────►│  Card VM    │
│ article/…  │     │  + discovery │     │  + variants │
└────────────┘     └──────────────┘     └──────┬──────┘
                                               │
                    Creator Space / Search / Related / …
```

---

## 13. Priorities (future implementation — not now)

| P | Item |
| --- | --- |
| P0 | Freeze anatomy + metadata contract in this doc |
| P0 | Article/Video card VM aligned with registry + dedup |
| P1 | Profile + Compact + Search variants |
| P1 | Status badge priority rules |
| P2 | Course / Product / Live / Photo recipes when tabs go live |
| P2 | Featured / Pinned variants |
| P3 | Feed variant if non-Home feeds need it |
| P3 | AI / Events / Games kind packs |

---

## 14. Out of scope

- React / components / CSS implementation
- Migrations
- Commit / Push
- Home UI changes
- Expanding `CONTENT_KINDS` in code (design allows; code waits for GO)

---

## 15. Traceability

| Current | Card System V1 |
| --- | --- |
| `ProfileContentCard` | Minimal Profile projection → extend toward Card VM |
| `ProfileAllPanel` list rows | Profile variant cards |
| `presentationVariant` in projection | Maps to preview/CTA recipe |
| Creator Space content cards section | Consumes this system |
| Home DiscoverVideoCard | Stays player chrome; not replaced by Feed cards in this phase |
