# UMTUBA Ads — Frontend Plan

**Document type:** Implementation planning — advertiser, admin, and related UI surfaces
**Repository:** `umtuba-web`
**Branch context:** `office/ads-design-v2`
**Status:** Planning only — **does not claim** these pages or components exist as specified here
**Constraint:** No executable code, JSX, or API schemas in this document

**Normative inputs:** `../01_PRODUCT_VISION.md`, `../03_AD_TYPES.md`, `../04_PLACEMENTS.md`, `../05_TARGETING.md`, `../06_BUDGET_SYSTEM.md`, `../07_REPORTING.md`, `../08_SECURITY.md`, `../11_AI_ADVERTISING_ENGINE.md`, `../12_CREATIVE_ASSET_LIBRARY.md`, `../15_ENTERPRISE_REPORTING.md`
**Program plans:** `01_IMPLEMENTATION_ROADMAP.md`, `02_DATABASE_MIGRATIONS_PLAN.md`, `03_BACKEND_SERVICES_PLAN.md`

---

## 1. Executive Summary

This plan defines the **frontend information architecture and UX delivery program** for UMTUBA Ads on `umtuba-web`: Advertiser Console (management plane) and Admin Ads Console (trust/enforcement), with clear MVP vs Future cuts.

**UI north star:** advertisers create Campaign → Ad Group → Ad → Creative safely; Review is visible and honest; Budget cannot be “edited” as a ledger; Reporting shows freshness; AI never silently changes spend; Admin tools are platform-admin-only.

**Alignment**

| Layer | Frontend consumes |
|-------|-------------------|
| Roadmap phases A–F | Progressive screen enablement |
| Backend services A–M (`03`) | Thin UI orchestration via Server Actions → domain/RPC |
| Placement/consumer ads | **Out of this doc’s primary scope** (product-owned slot chrome in Discover/Watch); console only |

Exact route strings, chart/form libraries, and autosave behavior remain **Open Decisions**.

---

## 2. Scope

| In scope | Out of scope |
|----------|----------------|
| Advertiser + Admin Ads UI planning | Implementing `app/` routes or components |
| Wizards, editors, library, reporting shells | Consumer Placement renderers (product teams) |
| Role-aware UX, a11y, i18n/RTL, states | Closing Open Decisions |
| Component/state/fetch strategies (conceptual) | JSX, CSS, or design tokens files |
| Telemetry plan (privacy-safe) | Committing DiscoverShell or unrelated UI |

---

## 3. Non-Goals

- Shipping production pages as part of this documentation task.
- Freezing URL paths or nav IA as final product law.
- Building agency multi-account switcher in MVP.
- Full Enterprise Reporting parity (`15`) on day one.
- Client-side authorization as the only gate.
- Realtime firehoses of raw delivery events.
- Auto-applying AI budget/targeting changes.
- Auto-promoting experiment winners.

---

## 4. Frontend Design Principles

1. **Server-enforced truth** — UI reflects membership/admin checks; never trust hidden fields for ownership.
2. **Progressive disclosure** — Wizard steps; advanced targeting collapsed.
3. **Honest states** — Loading, empty, error, restricted, frozen, pending review are first-class.
4. **Sponsored clarity elsewhere** — Console teaches labeling rules; consumer labels owned by placements (`04`).
5. **Money UX is read-mostly** — Configure budgets; never “edit ledger rows.”
6. **Review before pride** — Submit/resubmit flows clearer than vanity dashboards.
7. **Accessibility is release-blocking** for forms, tables, dialogs.
8. **Arabic + English, RTL + LTR** from MVP console shells.
9. **Mobile usable, desktop powerful** — MVP mobile parity level is **Open**.
10. **Feature-flagged surfaces** — Match backend flags (Delivery, Billing settle, AI, Experiments).
11. **Thin client** — No OLTP-heavy analytics in browser; use rollups (`03` I, `07`/`15`).
12. **Reconcile scaffolding** — If early `/advertise/*` or `/admin/ads/*` shells exist, evolve toward Design V2 IA without parallel consoles.

---

## 5. Information Architecture

```text
Advertiser Console
├── Home / Overview
├── Campaigns
│   ├── List
│   ├── Create Wizard
│   └── Campaign workspace (Ad Groups / Ads / Schedule / Submit)
├── Assets / Library
├── Review center (submissions & decisions)
├── Billing & Budget
├── Reports
├── AI Assist *(flag)*
├── Experiments *(flag)*
└── Settings (org, members, verification)

Admin Ads Console *(separate nav, no advertiser chrome)*
├── Review queues
├── Advertiser / Campaign search
├── Enforcement (freeze, suspend, emergency stop)
├── Incidents
└── Audit
```

Consumer Discover/Watch ad slots are **not** children of this tree.

---

## 6. Route Strategy

| Principle | Direction |
|-----------|-----------|
| Nest under a stable advertiser prefix | Exact prefix **Open** (historical scaffolding used advertise-style paths; Design V2 may keep or rename) |
| Admin under a distinct admin prefix | Platform-admin gate before render (`03` M, `08`) |
| Prefer resource URLs | `/…/campaigns/[id]/…` over query-only editors |
| Wizard steps | Path segments **or** query step — **Open**; must be deep-linkable for resume |
| Reports | Shareable querystring filters (date, campaign ids) |
| No secret tokens in URLs | Signed asset URLs stay short-lived query on CDN, not permanent routes |

---

## 7. Navigation Strategy

| Surface | Nav behavior |
|---------|--------------|
| Advertiser | Persistent console nav; contextual campaign subnav in workspace |
| Wizard | Stepper with save draft; exit confirm if dirty |
| Admin | Separate shell; no TopNav advertiser links to admin (**security**) |
| Role-aware | Hide billing for Campaign Manager; hide mutators for Analyst |
| Restricted account | Banner + limited nav; mutate blocked; report access per **OD-33** |
| Mobile | Bottom or condensed nav; tables → cards |

---

## 8. Role-Aware UX

| Role | Sees / can |
|------|------------|
| Owner | All console + members + billing |
| Admin | Campaigns, members (limited), reports; limited billing |
| Campaign Manager | Campaigns, creatives, submit review; no funding |
| Analyst | Reports, read-only campaigns |
| Billing Manager | Budget/billing; no solo publish if policy requires |
| Viewer | Read-only |
| Platform admin | Admin console only via admin gate—not via advertiser role |

UI hiding is convenience; **every mutation re-checked server-side**.

---

## 9. Surfaces A–M

Template fields apply to each. **None claimed as currently shipped.**

---

### A. Advertiser Onboarding

| Field | Plan |
|-------|------|
| **Purpose** | Create org/account, profile, team, verification visibility, billing placeholder |
| **Primary users** | Future Owner |
| **Entry points** | Marketing CTA, settings “Become advertiser,” empty home |
| **Key actions** | Create account, invite members, select roles, submit for verification/review, view suspended state |
| **Data dependencies** | Account service A (`03`) |
| **Loading** | Skeleton form |
| **Empty** | N/A (first-run) |
| **Error** | Validation, duplicate, network |
| **Restricted** | Rejected/suspended explainer + appeal entry |
| **Accessibility** | Labeled fields, error summary |
| **Mobile** | Single-column forms |
| **Desktop** | Two-column profile |
| **Security** | No self-approve; membership server-side |
| **Analytics** | Onboarding start/complete/drop |
| **MVP** | Create + invite + status |
| **Future** | Full KYC, billing method capture depth (**Open**) |

---

### B. Ads Home / Overview

| Field | Plan |
|-------|------|
| **Purpose** | Account health, active campaigns, spend summary, review/budget alerts, quick actions |
| **Primary users** | Owner, Admin, Campaign Manager, Analyst (read) |
| **Entry points** | Console root |
| **Key actions** | Create campaign, fix rejected items, open billing alerts |
| **Data dependencies** | B/D/E/I summaries |
| **Loading** | Card skeletons |
| **Empty** | First-campaign CTA |
| **Error** | Partial section failure isolation |
| **Restricted** | Frozen/suspended banner; CTAs disabled |
| **Accessibility** | Alert regions, heading hierarchy |
| **Mobile** | Stacked cards |
| **Desktop** | Grid + side alerts |
| **Security** | Role-filtered metrics |
| **Analytics** | Home load, quick-action clicks |
| **MVP** | Health + alerts + short campaign list |
| **Future** | Forecast widgets, AI tips |

---

### C. Campaign Creation Wizard

| Field | Plan |
|-------|------|
| **Purpose** | Guided objective → destination → audience → placements → budget → schedule → creatives → review → confirm |
| **Primary users** | Campaign Manager+, Admin, Owner |
| **Entry points** | Home, campaign list |
| **Key actions** | Save draft, resume, validate, submit for review (not self-activate Delivery) |
| **Data dependencies** | B, C, Placement Registry, policy packs |
| **Loading** | Per-step fetch |
| **Empty** | Draft with defaults |
| **Error** | Field + cross-step + policy + budget errors |
| **Restricted** | Block submit if account not approved |
| **Accessibility** | Stepper semantics, focus move on step change, unsaved dialog |
| **Mobile** | One step per screen |
| **Desktop** | Stepper + summary rail |
| **Security** | Destination allowlists; no illegal targeting affordances when pack forbids |
| **Analytics** | Step funnel, abandonment, validation fails |
| **MVP** | Core steps, image/video creative, Website/Store destinations as allowed |
| **Future** | AI fill (`11`), vertical structured ads |

**Also:** progressive disclosure for advanced targeting; unsaved-change protection; resume via draft id.

---

### D. Campaign Management

| Field | Plan |
|-------|------|
| **Purpose** | List/filter/sort campaigns; status tabs; pause/resume; duplicate; archive; conflict handling |
| **Primary users** | Campaign Manager+, Analyst (read) |
| **Entry points** | Nav Campaigns |
| **Key actions** | Bulk pause (role-gated), open workspace, duplicate |
| **Data dependencies** | Campaign list APIs; optimistic concurrency tokens |
| **Loading** | Table skeleton |
| **Empty** | CTA create |
| **Error** | Row action failures toast + revert |
| **Restricted** | Frozen campaigns show lock badge |
| **Accessibility** | Sortable table headers, bulk select announcements |
| **Mobile** | Card list; fewer bulk actions |
| **Desktop** | Dense table |
| **Security** | Bulk actions re-authZ per id |
| **Analytics** | Filter usage, pause rate |
| **MVP** | List + pause/resume + filters |
| **Future** | Heavy bulk, multi-account |

**Optimistic UI:** pause/resume may optimistically flip **only** if server accepts; conflict → reload banner.

---

### E. Ad Group Editor

| Field | Plan |
|-------|------|
| **Purpose** | Targeting, placements, budget split, schedule, frequency caps, exclusions; inherited vs override clarity |
| **Primary users** | Campaign Manager+ |
| **Entry points** | Campaign workspace |
| **Key actions** | Save, validate, open policy help |
| **Data dependencies** | TargetingSpec, placements, budget policy |
| **Loading** | Form skeleton |
| **Empty** | Defaults from campaign |
| **Error** | Geo/age/gender pack violations explained |
| **Restricted** | Read-only when pending review / approved immutable sections |
| **Accessibility** | Fieldsets, describedby for inherited hints |
| **Mobile** | Accordion sections |
| **Desktop** | Side preview of audience summary |
| **Security** | Hide prohibited dimensions entirely when illegal |
| **Analytics** | Targeting change events (coarse) |
| **MVP** | Geo, language, age, schedule, placements, basic frequency |
| **Future** | Audiences include/exclude UI, radius maps |

---

### F. Ad and Creative Editor

| Field | Plan |
|-------|------|
| **Purpose** | Asset picker/upload, preview, format compatibility, copy variants, localization, a11y metadata, moderation status, rejection recovery |
| **Primary users** | Campaign Manager+ |
| **Entry points** | Wizard creatives step; campaign workspace; library “use in ad” |
| **Key actions** | Upload, attach, preview by placement shape, resubmit after reject |
| **Data dependencies** | Creative/Asset service C; Review D |
| **Loading** | Upload progress |
| **Empty** | Prompt to upload or pick |
| **Error** | MIME/size/scan failures |
| **Restricted** | Approved creative locked → “create revision” |
| **Accessibility** | Alt text required affordance; keyboard preview |
| **Mobile** | Simplified preview |
| **Desktop** | Multi-placement preview frames |
| **Security** | Signed URLs only; active-use delete blocked with message |
| **Analytics** | Upload success/fail, resubmit |
| **MVP** | Image/video + CTA + preview |
| **Future** | Carousel builder, AI variants |

---

### G. Asset Library

| Field | Plan |
|-------|------|
| **Purpose** | Grid/list, filters, ownership, processing/moderation states, reuse, versioning, archive, rights expiry, AI provenance |
| **Primary users** | Campaign Manager+, Admin |
| **Entry points** | Nav Library; picker modal from F |
| **Key actions** | Upload, archive, use in creative, view versions |
| **Data dependencies** | `12` concepts via service C |
| **Loading** | Grid placeholders |
| **Empty** | Upload CTA |
| **Error** | Partial grid failure |
| **Restricted** | Rights-expired badge; cannot attach |
| **Accessibility** | Grid keyboard roving tabindex |
| **Mobile** | 2-col grid |
| **Desktop** | Filters rail + grid |
| **Security** | Org isolation; no public CDN browse |
| **Analytics** | Reuse rate |
| **MVP** | Basic library + states |
| **Future** | Brand kits, legal hold UI |

---

### H. Review and Moderation UX

| Field | Plan |
|-------|------|
| **Purpose** | Submit, status timeline, rejection reasons, policy refs, appeal, resubmit; admin/reviewer queues |
| **Primary users** | Advertisers; Platform moderators (admin shell) |
| **Entry points** | Banner alerts, campaign workspace, Admin queues |
| **Key actions** | Submit, appeal, resubmit; admin approve/reject/suspend with reason |
| **Data dependencies** | Review service D |
| **Loading** | Timeline skeleton |
| **Empty** | No submissions yet |
| **Error** | Submit blocked with checklist |
| **Restricted** | Suspended entity read-only |
| **Accessibility** | Timeline list semantics; confirm dialogs for admin |
| **Mobile** | Stacked timeline |
| **Desktop** | Split detail + history |
| **Security** | Advertiser never sees approve controls; admin confirmations |
| **Analytics** | Reject→resubmit recovery time |
| **MVP** | Status + reasons + admin queue |
| **Future** | SLA clocks, escalation UI |

---

### I. Budget and Billing UX

| Field | Plan |
|-------|------|
| **Purpose** | Budget setup, prepaid balance display, spend, credits, invoice placeholder, payment failures, hard-stop/freeze, reconciliation status; **no direct ledger editing** |
| **Primary users** | Owner, Billing Manager, Admin |
| **Entry points** | Nav Billing; campaign budget step |
| **Key actions** | Set daily/lifetime, view remaining, acknowledge freeze |
| **Data dependencies** | Budget/Billing E |
| **Loading** | Metric skeletons |
| **Empty** | “Set your first budget” |
| **Error** | Payment failure banner |
| **Restricted** | Frozen: configure disabled |
| **Accessibility** | Currency announced; tables for transactions read-only |
| **Mobile** | Summary first |
| **Desktop** | Summary + transaction table |
| **Security** | No client forge of credits |
| **Analytics** | Budget setup drop-off |
| **MVP** | Planning budgets + status (**billing depth Open**) |
| **Future** | Invoices, top-up flows post Open Decision |

---

### J. Reporting UX

| Field | Plan |
|-------|------|
| **Purpose** | Overview, campaign/creative comparison, filters, dates, attribution selector *(availability Open)*, preliminary/final labels, freshness, exports, saved reports, privacy thresholds, pagination |
| **Primary users** | Analyst+, managers |
| **Entry points** | Nav Reports |
| **Key actions** | Filter, compare, export CSV, save report |
| **Data dependencies** | Reporting I; Attribution J aggregates |
| **Loading** | Chart/table suspense |
| **Empty** | No delivery yet explainer |
| **Error** | Query too large → suggest export |
| **Restricted** | Small-N suppressed cells explained |
| **Accessibility** | Chart data table alternative; color-independent |
| **Mobile** | KPI cards; limited charts |
| **Desktop** | Full comparisons |
| **Security** | Org scope; no user-level pivots |
| **Analytics** | Report type usage |
| **MVP** | Spend/impr/clicks/CTR/CPC/CPM + freshness |
| **Future** | Saved/scheduled, full `15` dimensions |

---

### K. AI Assistance UX

| Field | Plan |
|-------|------|
| **Purpose** | Suggestions with explainability, accept/reject, human approval, estimate disclaimers, no silent budget changes, rollback, history |
| **Primary users** | Campaign Manager+ |
| **Entry points** | Wizard assist *(placement Open)*; campaign “Improve” panel |
| **Key actions** | Generate, accept into draft, reject, approve proposal |
| **Data dependencies** | AI service L |
| **Loading** | Generating state |
| **Empty** | “Ask for ideas” |
| **Error** | Model unavailable → manual |
| **Restricted** | Disabled under kill switch / policy class |
| **Accessibility** | Suggestion list semantics; disclaimer live region |
| **Mobile** | Bottom sheet suggestions |
| **Desktop** | Side panel |
| **Security** | No PII in prompts UI; Review still required after accept |
| **Analytics** | Accept/reject rates |
| **MVP** | Flagged off or rules-only tips |
| **Future** | Full assisted drafts |

---

### L. Experiment UX

| Field | Plan |
|-------|------|
| **Purpose** | Create test, control/variants, allocation, eligibility, warnings, status, results, inconclusive; **no auto winner** |
| **Primary users** | Campaign Manager+, Analyst |
| **Entry points** | Campaign tools *(flag)* |
| **Key actions** | Start/stop, apply winner explicitly |
| **Data dependencies** | Experiment K |
| **Loading** | Setup form |
| **Empty** | Educate on sample size |
| **Error** | Overlap prevention message |
| **Restricted** | Running = locked arms |
| **Accessibility** | Allocation inputs labeled |
| **Mobile** | Limited; warn desktop-preferred |
| **Desktop** | Full results |
| **Security** | No user assignment exports |
| **Analytics** | Experiment create/complete |
| **MVP** | Deferred |
| **Future** | Creative/headline tests first |

---

### M. Admin Ads Console

| Field | Plan |
|-------|------|
| **Purpose** | Review queue, advertiser/campaign search, freezes, suspensions, emergency stop, policy overrides, incidents, audit; platform-admin-only |
| **Primary users** | Ads Moderator, Fraud, Billing Ops, Superadmin |
| **Entry points** | Admin URL only (not advertiser nav) |
| **Key actions** | Approve/reject with reason, freeze, emergency stop with confirm |
| **Data dependencies** | D, M, E |
| **Loading** | Queue skeleton |
| **Empty** | “Queue clear” |
| **Error** | Action failed; no partial silent success |
| **Restricted** | Non-admin blocked at gate |
| **Accessibility** | Destructive confirms; focus trap |
| **Mobile** | Minimal / discourage |
| **Desktop** | Primary |
| **Security** | Step-up for emergency stop (**policy**); audit always |
| **Analytics** | Ops-only metrics |
| **MVP** | Queue + search + freeze + stop |
| **Future** | Incident workflows, dual-control credits UI |

**Admin console separation** (same app vs separate host) remains **Open**.

---

## 10. Component Architecture

| Layer | Examples |
|-------|----------|
| **Pages / route shells** | Console layout, wizard layout, admin layout |
| **Feature components** | CampaignTable, TargetingForm, CreativePreview, ReviewTimeline, BudgetSummary, ReportFilters |
| **Forms** | Field primitives, stepper, error summary |
| **Tables** | Sortable, selectable, virtualized for large accounts |
| **Charts** | Lazy KPI/line/bar *(library Open)* |
| **Filters** | Date range, status chips, campaign multi-select |
| **Dialogs / drawers** | Unsaved changes, admin confirm, asset picker |
| **Status badges** | Draft / pending_review / approved / rejected / frozen / exhausted |
| **Timeline** | Review history |
| **Empty / error / loading** | Shared Ads patterns |
| **Design system** | Extend platform primitives; Ads-specific badges/stepper — **timing Open** |

No JSX in this plan—implementation maps these to real components later.

---

## 11. State Management

| Kind | Use |
|------|-----|
| **Server state** | Campaigns, metrics, membership (fetch + cache tags) |
| **Form state** | Wizard + editors *(library Open)* |
| **URL state** | Filters, wizard step, selected tab |
| **Local UI state** | Drawer open, preview placement tab |
| **Optimistic updates** | Pause/resume only with rollback |
| **Cache invalidation** | On mutation success; review decision; freeze |
| **Conflicts** | Version mismatch banner → reload |
| **Draft persistence** | Server draft entity preferred over only localStorage |
| **Autosave** | Boundaries **Open** (explicit save vs debounced draft) |

---

## 12. Forms and Validation

| Layer | Behavior |
|-------|----------|
| Client | Immediate field hints; disable submit when obvious invalid |
| Server | Authoritative; returns field codes |
| Field-level | Inline + focus |
| Cross-step | Wizard summary checklist |
| Policy | Non-dismissible explainers with pack name |
| Budget | Lifetime &lt; spent blocked; currency locked messaging |
| File | Type/size/scan |
| Localization | Missing locale warnings |
| A11y | Error summary linked before submit |

---

## 13. Data Fetching

| Pattern | Direction |
|---------|-----------|
| Server Components | Read shells, gated admin pages |
| Client Components | Interactive tables, uploads, wizards |
| Server Actions | Thin mutations per `03` §9 |
| Pagination | Cursor for campaigns/assets/reports |
| Streaming / Suspense | Report sections independent |
| Realtime | Optional review/budget badges — **boundaries Open**; no raw events |
| AuthZ | Every request/action |

---

## 14. Accessibility

- Full keyboard for nav, tables, dialogs, steppers.
- Focus management on route/step/dialog open-close.
- Status not by color alone (icons/text).
- `prefers-reduced-motion` for previews/charts.
- Screen reader labels on icon buttons; chart fallbacks.
- Form errors associated via `aria-describedby`.
- Creative alt/captions prompted in F/G.

---

## 15. Responsive Design

| Breakpoint mindset | Behavior |
|--------------------|----------|
| Mobile | Wizard single-step; cards; limited admin |
| Tablet | Hybrid tables |
| Desktop | Full management density |
| Large tables | Horizontal scroll or column picker; virtualize |
| Charts | Simplify on small screens |
| Drawers | Prefer over modal multi-panels on mobile |

**MVP mobile parity** depth is **Open**.

---

## 16. Internationalization

- Arabic + English strings for console MVP.
- RTL/LTR layout flip for chrome, steppers, tables.
- Locale number/date/currency formatting from Billing Account currency + user locale.
- Translation completeness gates for flagged releases.
- Long Arabic copy: avoid truncation of legal/rejection reasons.
- Policy/legal text by region pack.

---

## 17. Security and Privacy

- Role-aware rendering + **server enforcement**.
- No PII in client analytics payloads.
- Signed asset URLs only; safe sandbox previews (no scriptable HTML ads in MVP).
- Upload virus/scan states visible; block ready-until-clear.
- Admin destructive confirms; emergency stop double confirm.
- No client-trusted `org_id` ownership.
- Reporting privacy threshold empty states—not fake zeros.
- Separability: consumer session ≠ advertiser privilege (`08`).

---

## 18. Performance

- Route-level code splitting for wizard, reports, admin, AI.
- Table virtualization for large accounts.
- Lazy charts.
- Image/video thumbnails, not full assets in grids.
- Avoid unnecessary realtime.
- Cache read models; invalidate on mutations.
- Paginate everything that can grow.

---

## 19. Analytics and UX Telemetry

| Event family | Examples |
|--------------|----------|
| Wizard | Step views, abandonment, validation fail codes |
| Review | Reject view, resubmit success |
| Budget | Setup start/complete, drop-off step |
| Reporting | Export requested, filter sets (coarse) |
| AI | Suggestion shown/accepted/rejected |
| Privacy | No creative bytes, no user lists, no raw spend line dumps beyond org |

---

## 20. Rollout

| Stage | Frontend |
|-------|----------|
| Internal-only | Flag console for staff advertisers |
| Admin-first | Ship M queue before wide self-serve |
| Read-only reporting | Metrics before Delivery polish |
| Advertiser beta | Onboarding + wizard + review |
| Progressive | Enable Billing/AI/Experiments flags |
| Rollback | Flag off routes; keep drafts safe |

Do not block consumer apps on console errors.

---

## 21. Risks

| Risk | Mitigation |
|------|------------|
| Parallel consoles (scaffolding vs Design V2) | Single IA evolution path |
| Client-only role gates | Server Actions/RPC always |
| Wizard complexity abandonment | Drafts + simpler MVP path |
| Mobile underpowered admin mistakes | Desktop-primary admin |
| Chart/table a11y debt | Required checklist |
| AI trust erosion | Disclaimers + human approve |
| Ledger editing affordances | Read-only transactions UI |
| Unrelated dirty local files | Keep Ads UI PRs scoped |

---

## 22. Open Decisions

Canonical registry: `01_IMPLEMENTATION_ROADMAP.md` §14 (OD-01…OD-50).

**Frontend / UX focus:**

| ID | Question (short) | Options | Recommendation | Owner | Phase | Blocking? |
|----|------------------|---------|----------------|-------|-------|-----------|
| OD-22 | Realtime boundaries | See registry | Poll MVP | Eng + Frontend | Rel-1+ | Non-blocking |
| OD-23 | Route naming | See registry | Decide before Public MVP bookmarks | Product + Frontend | Rel-1–8 | Non-blocking alpha |
| OD-24 | Charting library | See registry | Pick at Reporting UI | Frontend | E | Non-blocking tables-first |
| OD-25 | Form library | See registry | Pick at Wizard | Frontend | A | Non-blocking |
| OD-26 | Autosave behavior | See registry | Server draft + explicit submit | Product + Frontend | A | Non-blocking |
| OD-27 | Mobile parity at launch | See registry | Mobile usable / desktop powerful | Product + Frontend | Rel-8 | Non-blocking if disclosed |
| OD-28 | Agency multi-account UX | See registry | Phase 9 | Product | Rel-9 | Non-blocking MVP |
| OD-29 | AI suggestion placement | See registry | Panel + optional wizard | Product + Frontend | F | Non-blocking |
| OD-30 | Admin console separation | See registry | In-app admin gate first | Eng + Sec | Rel-2 | Non-blocking |
| OD-31 | Billing UX depth MVP | See registry | Tied to OD-05 | Product + Finance | Rel-4–8 | Tied to OD-05 |
| OD-32 | Attribution model selector UI | See registry | Hidden default | Product | E | Non-blocking |
| OD-33 | Restricted-account reports | See registry | Read-only reports; mutate blocked | Product + Trust | Rel-4 | Non-blocking |

Design-system extension timing: treat as Frontend ownership under OD-23/OD-25 execution (non-blocking).

---

## 23. Acceptance Criteria

This plan is complete when:

- [x] Surfaces A–M specified with purpose, users, entry, actions, data deps, loading/empty/error/restricted, a11y, mobile/desktop, security, analytics, MVP/Future
- [x] IA, routes (non-final), nav, roles, components, state, forms, fetching, a11y, responsive, i18n, security, performance, telemetry, rollout covered
- [x] No code/JSX/API schemas; no claim pages exist as specified
- [x] Open Decisions listed
- [x] Linked to Design V2 + implementation docs `01`–`03`
- [x] Convertible into route/component/task breakdowns

**Future UI acceptance:** each screen ships with the state matrix above, server authZ, and flag alignment to backend phases.

---

## Related Documents

- `01_IMPLEMENTATION_ROADMAP.md` — phase enablement
- `02_DATABASE_MIGRATIONS_PLAN.md` — data readiness
- `03_BACKEND_SERVICES_PLAN.md` — Server Actions / RPC boundaries
- `../01_PRODUCT_VISION.md` · `../03_AD_TYPES.md` · `../04_PLACEMENTS.md` · `../05_TARGETING.md`
- `../06_BUDGET_SYSTEM.md` · `../07_REPORTING.md` · `../15_ENTERPRISE_REPORTING.md`
- `../08_SECURITY.md` · `../11_AI_ADVERTISING_ENGINE.md` · `../12_CREATIVE_ASSET_LIBRARY.md`
- Early scaffolding notes (reconcile only): `../ADS_PLATFORM_FOUNDATION_V1.md`, `../ADS_ADMIN_REVIEW_FOUNDATION_V1.md`

---

## Document Control

| Item | Value |
|------|-------|
| Planning version | Implementation Planning V1 — Frontend |
| Authoring mode | Documentation only |
| Next siblings | Consumer placement UI plan; per-route tasking checklists |
