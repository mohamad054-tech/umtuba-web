# 05 — Delivery Measurement & Reporting

## 1. Goals

- Count what happened **accurately and defensibly** — no invented numbers.
- Ingest events **server-side, signed, and deduplicated** so counts are
  trustworthy and fraud-resistant by design.
- Separate **raw events** (append-only truth) from **aggregates** (fast reads).
- Give advertisers and operators clear, consistent reporting with well-defined
  metric semantics and attribution windows.

## 2. Event taxonomy

The platform defines an explicit, first-class event catalog. Downstream outcomes
(install, purchase, save, follow) are **named events**, not merely lumped under a
generic "conversion".

| Event | Class | Meaning | Notes |
| --- | --- | --- | --- |
| eligible | diagnostic | Ad was a candidate for a slot | Optional; sampled; never billable |
| impression | delivery | Ad was rendered to a user | Viewability rules per format |
| qualified_view | delivery | Qualified view (e.g. video watch threshold) | Format-defined threshold |
| click | engagement | Click/tap-through to destination | Deduped per session/handle |
| dismiss | engagement | User dismissed/skipped the ad | Quality signal |
| save | engagement | User saved/bookmarked the promoted item | Type-tagged engagement |
| follow | engagement | User followed the promoted creator/entity | Creator-growth outcome |
| conversion | outcome | Generic downstream outcome (umbrella) | Attributed, windowed |
| install | outcome | App install attributed to the ad | App-install objective |
| purchase | outcome | Store purchase attributed to the ad | Store-sales objective; product-reported |

Notes:

- `conversion` remains an umbrella class; `install` and `purchase` are specific,
  independently reportable outcome events (a purchase is also a conversion for
  rollups but is counted and attributed as its own named event).
- Generic interaction types (expand, swipe, unmute) are recorded as
  `engagement` sub-types where a first-class event is not warranted.

Each event carries: ad id, ad set id, campaign id, placement id, coarse context
(locale, country/region, device class, surface), a **non-identifying** session/
frequency handle, timestamp, a **dedupe key**, an event signature, and an
assigned **trust level** (see doc 06 §7.1).

Events never carry PII or precise location.

## 3. Ingestion pipeline (design)

```
Product reports event via Placement Contract.report(event)
  → signed, server-side ingestion endpoint (no anonymous client writes to tables)
  → validate signature + shape + dedupe key
  → append to raw event store (append-only)
  → async aggregation → daily / rollup metrics
  → (billing enabled) Billing Adapter → UEOS spend posting for billable events
```

Design rules:

- **Server-authoritative:** raw event tables are not writable by `anon` or
  `authenticated`; ingestion is via signed, `service_role`/`SECURITY DEFINER`
  pathways. This mirrors UEOS/Store write-gate discipline.
- **Idempotent:** dedupe keys make retries and duplicate beacons safe; a repeated
  key is ignored, not double-counted.
- **Append-only raw truth:** raw events are immutable; corrections are new
  compensating records, never in-place edits.
- **Async aggregation:** rollups are computed by jobs, not on the hot serving
  path, so serving stays fast and counts remain consistent.

## 4. Aggregation

- **Daily metrics** per (campaign, ad set, ad, placement, coarse-geo, device
  class): impressions, qualified views, clicks, engagements (incl. save/follow),
  conversions (incl. install/purchase), spend (references to UEOS), derived
  rates (CTR, VTR, CVR) computed at read time.
- **Rollups** for reporting windows (day/week/month/campaign-to-date).
- **Zeros, not fakes:** empty aggregates return zero. The system never
  fabricates or estimates delivered counts.

## 5. Attribution

- **Windows:** click-through and view-through windows are explicit, per-objective
  defaults, and documented in reporting.
- **Conversion sources:** conversions are reported by consuming products (e.g.
  Store purchase, UM Learning enrollment, App install) through the event
  contract, tagged with the originating ad reference.
- **De-duplication:** a conversion is attributed once within its window using the
  dedupe key; multi-touch attribution is a **future** enhancement, not a
  foundation guarantee.
- **No cross-identity tracking:** attribution uses the same non-identifying
  handles as delivery; there is no persistent cross-product user profile.

## 6. Reporting

### 6.1 Advertiser reporting

- Dashboard over daily/rollup metrics: delivery, spend (from UEOS references),
  rates, pacing vs budget, and status.
- Breakdowns by campaign / ad set / ad / placement / coarse-geo / device / time.
- Clear metric definitions and attribution-window disclosure.
- **Planning vs actual:** while billing is disabled, monetary figures are labeled
  planning estimates; only UEOS-posted spend is shown as actual.

### 6.2 Operator reporting

- Review throughput, policy actions, suspended accounts, and traffic-quality
  signals (see doc 06).
- Platform-level delivery health and anomaly summaries.

### 6.3 Read model

- Reporting is **read-only projections**; it never mutates campaign or event
  state.
- Reads are RLS-scoped: advertisers see only their accounts; operators use
  privileged read paths.

## 7. Data quality & trust

- Every displayed number traces to raw, signed, deduped events or to a UEOS
  posting.
- Discrepancy handling: raw truth + compensating records + documented window
  semantics make numbers reconcilable.
- Sampling (if used for diagnostics like `eligible`) is disclosed and never used
  for billable counts.

## 8. Scale considerations

- High-volume ingestion via append-only writes and async rollups.
- Dedupe keys and rate limits protect hot paths.
- Aggregates are the read surface; raw events are retained per policy and used
  for recompute, audits, and fraud analysis.

## 9. Event schema evolution

The event contract will change over time; it is designed to evolve without
breaking producers or historical data:

- **Versioned event schema:** every event carries a schema version. Ingestion
  accepts a bounded window of supported versions.
- **Additive-first:** new fields are optional/defaulted; existing fields are not
  repurposed. Breaking changes require a new event version, not a field
  redefinition.
- **Backward-compatible reads:** aggregation and reporting tolerate multiple
  event versions; older raw events remain valid and recomputable.
- **Deprecation with overlap:** old versions are supported through a documented
  deprecation window before removal.
- **No silent semantics change:** the meaning of a named event (e.g.
  `qualified_view` threshold) is versioned in policy so historical numbers stay
  interpretable.

Retention, deletion, and DSAR handling for events are covered in doc 09.
