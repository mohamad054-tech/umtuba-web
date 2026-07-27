# Creator Space Experience V1

**Status:** Architecture + UX design only (no implementation)
**Branch base:** `alpha-0.2` @ `f053709`
**Depends on:** Unified Experience / Page Consolidation V1
**Hard constraint:** Do **not** redesign Home. Home remains the official Discovery Layer.

---

## 0. Positioning

**Creator Space** is the second primary destination on UMTUBA after Home.

```text
Home (Discovery)
  → Video
  → Creator Space
  → Full Content
```

It is no longer “just a profile page.” It is a durable surface for every creator role:

| Role | What Creator Space must support |
| --- | --- |
| Article writer | Articles + teaser discovery without duplication |
| Teacher | Courses entry + About expertise |
| Seller | Products shelf |
| Video creator | Videos grid + All timeline |
| Gamer | Future Games / Photos / Live presence |
| Live streamer | Live now / upcoming / past |
| Company / institution | Verification, About, multi-kind catalog |

**Design rule:** One layout language that scales by **showing/hiding tabs and modules** when data exists — not by reinventing the page per role.

**Visual rule:** Keep UMTUBA identity (dark glass, strong type, blue accent, activity tiers). Borrow clarity from Facebook-style hierarchy (cover → identity → actions → tabs → feed) without copying FB/TikTok/Instagram chrome.

---

## 1. Information Architecture

```text
/profile/[username]   ← Creator Space (canonical)
  ├── Hero
  │     Cover · Avatar · Identity · Meta · Actions
  ├── Identity strip
  │     Profession · Specialties · Interests · Badges · Stats
  ├── Sticky tab rail
  │     All · Articles · Videos · Courses · Products · Photos · Live · About
  ├── Optional: Pinned rail (above All / within All)
  └── Tab panels → Content destinations
        /articles/[id]
        /watch?post=
        /learning/...
        /store/.../product/...
        /live/[roomId]
```

### Content ownership model

- **Domains remain authoritative** (articles, videos, courses, products, live).
- **`content_registry`** powers All + kind projection.
- **Teaser videos** are discovery assets for articles — never independent All items when linked.

### Relationship to Home

| Surface | Job |
| --- | --- |
| Home | Discover content globally (Video First) — **locked** |
| Creator Space | Understand *who* made it and explore *their* catalog |
| Content page | Consume one entity fully |

---

## 2. UX Flow

### Primary (official)

```text
Home video
  → tap avatar / username
  → Creator Space (?article= optional)
  → Read article now / open tab item
  → Full content
  → Back keeps Creator Space in history (browser / in-app back)
```

### Secondary entries (allowed)

- Own Profile from mobile bottom nav / user menu
- Search result → Creator Space
- Watch avatar → Creator Space
- Messages / notifications → Creator Space deep link

### In-space flow

```text
Land on Creator Space (default tab: All)
  → scan Hero + identity
  → optional linked-article prompt
  → scroll All timeline / switch tab
  → open Content card
  → return to same tab + scroll position (target UX)
```

ASCII map:

```text
┌─────────────────────────────────────────┐
│ HOME (locked)                           │
│  [video]  avatar ──────────────┐        │
└────────────────────────────────┼────────┘
                                 ▼
┌─────────────────────────────────────────┐
│ CREATOR SPACE                           │
│ ████ COVER ████████████████████████████ │
│ (●) Name ✓  @user                       │
│ Bio · City · link · socials             │
│ [Follow] [Message] [Share]              │
│ ─────────────────────────────────────── │
│ All Articles Videos Courses … About     │
│ ┌─────────────────────────────────────┐ │
│ │ Timeline / Grid                     │ │
│ │  → tap card                         │ │
│ └─────────────────────────────────────┘ │
└──────────────────┬──────────────────────┘
                   ▼
            FULL CONTENT
```

---

## 3. Hero Design

### Layout (desktop)

```text
┌──────────────────────────────────────────────────────────┐
│ COVER (16:5–16:6, real image or brand gradient)          │
│                                                          │
│                              [Share]  (optional corner)  │
└──────────────────────────────────────────────────────────┘
   ┌──────┐
   │ AVAT │  Display Name  ✓verified   [LIVE] if live
   │  AR  │  @username
   └──────┘  Profession · Specialty chips (1–3)
             Bio (2–3 lines, expand)
             📍 City, Country   🔗 website   social icons
             Followers · Following · Likes · Views
             [ Follow ]  [ Message ]  [ Share ]   owner: [Edit] [Create ▾]
```

### Layout (mobile)

- Cover full-bleed width, shorter height (~140–160px).
- Avatar overlaps cover (−56px), left-aligned.
- Actions: primary row `Follow` + `Message`; `Share` as icon button.
- Stats in a compact 4-cell strip under bio (not a Facebook “friends box”).

### Elements

| Element | Behavior |
| --- | --- |
| Cover | Prefer `cover_url` when available; else UMTUBA gradient (current pattern) |
| Avatar | Round; live pulse badge when streaming |
| Name | Strongest type in Hero |
| Username | Secondary, muted |
| Verification | Compact check / org mark — not a social-network clone badge farm |
| Bio | Clamp + “more” |
| Location | Text only unless World deep-link later |
| Website | External, `rel=noopener` |
| Social links | Icon row only if present; hide empty |
| Follow / Message / Share | Keep existing semantics; owner sees Edit + Create |

### What Hero is not

- Not a marketplace banner carousel.
- Not a stories ring clone.
- Not a dense stats dashboard.

---

## 4. Creator Identity

Shown **under Hero, above tabs** (collapses with Hero on scroll — see Motion).

| Signal | Placement | Always? |
| --- | --- | --- |
| Profession / role label | Chip under username (e.g. Writer · Teacher · Seller) | If set |
| Specialties / expertise | Up to 3 chips | If set |
| Interests | About tab primarily; 0–2 teaser chips optional | If set |
| Achievements | About + optional small medals under identity | If set |
| Badges | Activity tier (existing) + verification + role badges | Tier if computed |
| Stats | Followers, Following, Likes, Views | Yes (graceful empty “0”) |

**Multi-role creators:** show up to **two** primary role chips + “+N” opening About. Do not rebuild the page per role.

---

## 5. Tabs

### Order (target)

```text
All · Articles · Videos · Courses · Products · Photos · Live · About
```

Replaces today’s `Posts` label with **Photos** (photos/image posts live there; text posts can appear in All and/or Photos depending on media).

### Visibility rules

| Tab | Always visible? | Show when | Hide when |
| --- | --- | --- | --- |
| **All** | Yes | — | Never (owner empty state still shown) |
| **Articles** | If count > 0 **or** owner | Has articles / owner creating | Visitor + zero |
| **Videos** | If count > 0 **or** owner | Has independent videos / owner | Visitor + zero |
| **Courses** | If count > 0 **or** owner instructor | Has published courses | Visitor + zero |
| **Products** | If count > 0 **or** owner seller | Has listed products | Visitor + zero |
| **Photos** | If count > 0 **or** owner | Has image posts | Visitor + zero |
| **Live** | If live now **or** sessions **or** owner broadcaster | Live capability / history | Visitor + zero + not live |
| **About** | Yes | — | Never |

**Overflow (mobile):** horizontal scroll tablist with fade edges; no hamburger for primary tabs.

**Deep links:** `?tab=articles|videos|courses|…` preserved; unknown tab → All.

---

## 6. Timeline (All Tab) — highest priority

### Goal

One chronological **unified timeline** of creator-published content.

### Deduplication rules (hard)

1. An **article** appears **once** as an Article card (even if a teaser video exists).
2. A **teaser** never appears as a separate Video item in All.
3. A video that is **only** the article’s discovery teaser is **excluded** from All as video.
4. **Independent videos** (no article link / not registered as article discovery) appear as Video cards.
5. Courses / Products / Live sessions appear as their own kinds when registered.
6. Photos/image posts appear as Photo cards when included in registry projection.

### Ordering

- Primary: `published_at` desc (fallback `created_at`).
- Pinned block (if any) **above** the chronological list, not mixed mid-feed.

### Density

- Mobile: single column cards.
- Desktop: single column max ~720px centered under tabs (readable, not a FB wall full of widgets).

### What All is not

- Not a raw dump of `posts` + `articles` + `videos` tables.
- Not a second Home feed with swipe player.

---

## 7. Content Cards

Shared anatomy:

```text
┌──────────────────────────────────────────┐
│ KIND LABEL                    · time ago │
│ [media / thumb]                          │
│ Title                                    │
│ One-line context / excerpt               │
│ [primary CTA]                            │
└──────────────────────────────────────────┘
```

| Kind | Media | Title | Context | CTA / destination |
| --- | --- | --- | --- | --- |
| **Article** | Cover or teaser still (optional) | Article title | Excerpt · read time if known | → `/articles/[id]` (not teaser Watch) |
| **Video** | 9:16 or 16:9 thumb | Video title | Views · duration | → `/watch?post=` |
| **Course** | Course cover | Course title | Level · lessons count | → learning catalog/course |
| **Product** | Product image | Product name | Price · store | → PDP |
| **Live** | Preview / gradient | Session title | Live / Scheduled / Ended | → `/live/[roomId]` or lobby |
| **Photo** | Image | Optional caption | Date | → lightbox (future) or post detail |

**Article + teaser:** card may show a small “Has teaser on Home” affordance for owners only — visitors just see Article.

**Visual language:** same border/glass as current Profile panels; kind label uppercase tracking; no multi-column marketplace tiles inside All.

---

## 8. Pinned Content

### Idea

Creator can pin **1–3** items (soft cap) across kinds: article, video, course, product.

```text
┌─ PINNED ───────────────────────────────┐
│ [Article]  [Course]  [Product]         │  ← horizontal rail
└────────────────────────────────────────┘
         then All timeline continues
```

### Rules

- Pins appear on **All** (and optionally mirrored at top of the kind tab).
- Pinning does not duplicate the item again in the chronological list (or mark as pinned and skip duplicate — prefer **exclude from chrono** while pinned).
- Owner-only manage UI later; visitors only see rail.
- Empty pins → rail hidden (no empty “Pinned” header).

### Data (design only)

Future field/table — **out of scope to implement/migrate now**. Document as UX requirement for a later GO.

---

## 9. About

Dedicated tab (always present). Structured sections, not a Facebook About dump:

```text
About
  ├── Bio (full)
  ├── Experience (roles, years, highlights)
  ├── Education
  ├── Specialties & interests
  ├── Achievements / badges
  ├── Links (website + socials)
  └── Joined date
```

Empty sections omit entirely. Owner sees “Add experience” placeholders later (not in this design phase’s implementation).

---

## 10. Photos

**Default: Grid (3-column mobile / 4-column desktop).**
Timeline list is wrong for image-first browsing.

| Mode | Use |
| --- | --- |
| Grid | Primary Photos tab |
| Lightbox / detail | Tap photo (future) |
| All tab | Photo cards can appear in timeline as single-image rows |

Text-only posts: prefer All + optional filter later; do not force them into Photos grid.

---

## 11. Courses (design only — do not implement)

```text
Courses tab
  ├── Featured / pinned course (optional)
  └── Vertical list or 2-col cards (desktop)
        Cover · Title · Level · Lesson count · CTA “View course”
```

Empty visitor: tab hidden. Empty owner: CTA toward instructor create flow (link only when product exists).

Opens **Content** learning routes — Creator Space does not embed the full LMS.

---

## 12. Products (design only — do not implement)

```text
Products tab
  └── Responsive product cards (2-col mobile / 3-col desktop)
        Image · Name · Price · Store badge
```

Opens store PDP. Creator Space is a shop window, not checkout.

---

## 13. Live

Three buckets in one tab:

```text
LIVE
  ├── Now      (if isLive) — prominent card + Join
  ├── Upcoming (scheduled)
  └── Past     (ended / VODs if available)
```

If only past exists, skip empty Now/Upcoming headers. Live badge on avatar remains the global signal.

---

## 14. Navigation

### Continuity principle

User should feel they stayed inside UMTUBA: same chrome (top/bottom nav), same dark language, predictable back stack.

| Transition | Behavior |
| --- | --- |
| Home → Creator Space | Standard navigation; keep bottom/top nav |
| Creator Space → Content | Push content route; optional compact “back to @user” bar on content pages later |
| Content → Creator Space | Back restores tab |
| Creator Space → Home | Home tab / logo — **does not** alter Home design |

### Linked article prompt

Keep `?article=` prompt near top (above or just under Hero): **Read article now** + **Browse Creator Space**. This is the official bridge from teaser discovery.

### Do not

- Open Creator Space as a full-screen TikTok-style takeover that hides app nav (except future immersive exceptions).
- Redirect Home video into article without Profile when the official path is Creator Space (policy note; Home code locked this phase).

---

## 15. Motion

| Motion | Spec |
| --- | --- |
| Page enter | Soft fade/slide-up of Hero (~200–280ms), respect `prefers-reduced-motion` |
| Scroll | Native scroll; no fake parallax overload |
| Hero collapse | After ~80–120px scroll: cover compresses, avatar shrinks, sticky compact header shows Name + Follow |
| Sticky tabs | Tabs pin under compact header; horizontal scroll preserved |
| Tab switch | Cross-fade panel; do not remount scroll jump to top unless tab changed |
| Card hover (desktop) | Subtle lift/brightness — no glow spam |
| Live pulse | Existing live badge pulse only |

ASCII sticky states:

```text
Expanded:   [COVER........] [avatar] Name ... actions | tabs | feed
Collapsed:  [avatar] Name  [Follow]                   | tabs | feed
```

---

## 16. Responsive

| Breakpoint | Hero | Tabs | All | Photos | Courses/Products |
| --- | --- | --- | --- | --- | --- |
| **Mobile** (<640) | Stacked, short cover | Scroll rail | 1-col | 3-col grid | 1–2 col |
| **Tablet** | Avatar + text row | More tabs visible | 1-col ~ | 4-col | 2-col |
| **Desktop** | Wide cover, actions right | Full labels | Centered column | 4–5 col | 3-col |

Max content width ~72rem shell; All timeline inner ~40–45rem for readability.

---

## 17. Design Language

**Keep:** dark canvas, glass panels, blue accent, bold titles, activity tier, Arabic/LTR dir awareness.
**Borrow:** clear Hero hierarchy; sticky section tabs; scannable cards.
**Avoid:** FB blue chrome & friend grids; TikTok FYP takeover; IG story rings as primary identity; purple AI gradients; cream-serif brochure look.

---

## 18. Empty states

| Surface | Visitor | Owner |
| --- | --- | --- |
| All | “No published content yet.” | + CTAs Create article / Upload video |
| Kind tab hidden | — | Tab still visible with empty + create CTA |
| Photos | Hidden if empty visitor | Empty grid + “Add photos” later |
| Live | Hidden if empty visitor | Empty + “Go live” when available |
| Pinned | Hide rail | — |
| About | Minimal joined date | Prompt to complete About |

---

## 19. Loading states

- Hero: cover + avatar skeleton; text lines shimmer.
- Stats: pulse placeholders (do not flash “0” then jump if avoidable).
- Tabs: render shell immediately; counts may resolve late.
- Panel: 3–6 skeleton cards matching layout (list vs grid).
- Prefer partial hydration: Hero first, then All.

---

## 20. Error states

| Failure | UX |
| --- | --- |
| Profile not found | Existing not-found |
| Stats fail | Soft banner (current pattern) — page still usable |
| Registry/All fail | Inline error in panel + Retry |
| Single tab fail | Error only in that panel |
| Share/copy fail | Inline alert under actions |

Never blank the entire Creator Space for a secondary fetch failure.

---

## 21. Accessibility

- Tablist: arrow key navigation, `aria-selected`, `aria-controls` (already patterned).
- Focus rings: keep `watch-focus-ring`.
- Cover decorative → `aria-hidden`; avatar has alt.
- Live badge announced politely.
- Motion: honor `prefers-reduced-motion` (disable collapse animation / pulses).
- Color: do not rely on color alone for kind (include text label).
- Touch targets ≥ 44px for Follow / Message / tabs.

---

## 22. Priorities

| P | Item |
| --- | --- |
| P0 | IA rename Profile → Creator Space (docs/UX); keep route `/profile/[username]` for now |
| P0 | All timeline dedup rules (article ≠ teaser ≠ linked video) |
| P0 | Hero completeness (cover, actions, identity clarity) without Home changes |
| P1 | Tab visibility rules + order (Courses/Products/Photos readiness) |
| P1 | Sticky tabs + Hero collapse motion |
| P1 | Content card system (shared anatomy) |
| P2 | Pinned content UX |
| P2 | About structured sections |
| P2 | Live Now/Upcoming/Past |
| P3 | Courses/Products tab implementation (after domain GO) |
| P3 | Photos grid polish / lightbox |

---

## 23. Phased execution (future — not now)

1. **Design freeze** — this document approved.
2. **Creator Space shell polish** — Hero + identity + sticky tabs (no Home edits).
3. **All timeline contract** — enforce dedup + card anatomy against registry.
4. **Tab visibility** — conditional Courses/Products/Photos/Live.
5. **About / Live structure**.
6. **Pinned** (requires data model GO + migration later).
7. **Courses / Products panels** when catalogs ready.
8. **Motion / a11y pass**.

---

## 24. Out of scope (this phase)

- React / components / routes / refactor
- Migrations / DB
- Commit / Push
- Home / Watch player / swipe changes
- Implementing Courses or Products UIs

---

## 25. Traceability to current app

| Today | Target |
| --- | --- |
| `ProfileExperience` | Creator Space shell |
| `ProfileHeader` + stats + actions | Hero + Identity |
| Tabs: All, Posts, Videos, Articles, Live, About | All, Articles, Videos, Courses, Products, Photos, Live, About |
| `ProfileAllPanel` + registry | All timeline (strengthen cards + dedup contract) |
| `?article=` prompt | Keep as official Home→Space→Content bridge |
| Activity tier | Keep as identity badge |

Route path may stay `/profile/[username]` until a later rename GO; UX copy may say “Creator Space.”
