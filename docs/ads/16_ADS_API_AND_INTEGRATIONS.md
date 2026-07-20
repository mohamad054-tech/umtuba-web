# UMTUBA Ads — Ads API and Integrations

**Document type:** Enterprise design blueprint (Ads V2)  
**Status:** Design only — not implemented  
**Builds on:** ApiClient in `09_DATABASE_BLUEPRINT.md`, security in `08_SECURITY.md`, roadmap API mentions in `10_FUTURE_ROADMAP.md`  
**Scope:** Future public and internal contracts for advertisers, agencies, partners, and UMTUBA services

---

## 1. Scope

The **Ads API** exposes governed programmatic access to Campaign hierarchy, Creatives/Assets, Reporting, Billing Account read models, Review status, and (future) webhooks—without direct database access and without bypassing moderation or mutating Store/Live systems of record.

### Goals

1. Serve advertisers, agencies, enterprises, certified partners, reporting tools, future Store sellers, and internal UMTUBA services.  
2. Enforce authentication, scopes, tenant isolation, idempotency, versioning, and rate limits.  
3. Support pagination, filtering, sorting, bulk ops, and async jobs for large work.  
4. Provide conceptual flows for campaign lifecycle, creative upload, reporting, and billing reads.  
5. Define webhook security, retries, and ordering limitations *(Future)*.  
6. Enable sandbox/test accounts *(Future)* and partner certification.  
7. Guarantee: no moderation bypass; no direct Store order or Live session mutation.

### Non-goals

- Shipping OpenAPI/Swagger as a normative artifact in this document.  
- Executable SDK code.  
- Final partner pricing or eligibility matrix (Open Decision).  
- Granting partners raw user PII or audience user lists.  
- Binding OAuth provider brand as permanent.

---

## 2. Core Concepts

| Concept | Meaning |
|---------|---------|
| **Public API** | External advertiser/agency/partner HTTP API |
| **Internal service contracts** | Service-to-service APIs inside UMTUBA (mTLS/signed) |
| **Tenant** | AdvertiserOrg boundary |
| **Scope** | OAuth/API-key permission string |
| **Idempotency-Key** | Client header for safe retries on creates |
| **Async job** | Long report/export/bulk operation |
| **Sandbox** *(Future)* | Isolated test tenant + fake Delivery |
| **Certification** | Partner program gate |

**Current Design:** Blueprint only. V1 docs mention ApiClient metadata; no production Ads API is claimed as shipped in-repo.

---

## 3. Audience & API Surfaces

| Caller | Typical access |
|--------|----------------|
| Advertiser automation | Campaign CRUD, reporting |
| Agency | Multi-tenant tokens with explicit org grants |
| Enterprise | SSO-backed OAuth, stricter audit |
| Certified partner | Limited scopes; data minimization |
| Reporting tools | Read-only reporting + exports |
| Store sellers *(Future)* | Promote own catalog (tied to seller verification) |
| Internal UMTUBA services | Delivery eligibility, measurement ingest, Review |

---

## 4. Public vs Internal

| | Public API | Internal contracts |
|--|------------|--------------------|
| Auth | API key / OAuth *(Future)* | Service credentials / mTLS |
| Exposure | Internet (edge) | Private network |
| Stability | Versioned, deprecation SLA | Can evolve faster with owners |
| Abuse controls | Rate limits, WAF, anomaly | Mesh policy |

Internal contracts **must not** be re-exposed as public without a public facade and scopes.

---

## 5. Authentication, Scopes, Tenant Isolation

### Auth modes (design options — not final vendor pick)

- API keys (hashed at rest, rotatable) — near-term design  
- OAuth 2.0 / OIDC for user-delegated access — **Future Capability**  
- Service credentials for partners/internal — **Future Capability**

### Scopes (illustrative)

| Scope | Capability |
|-------|------------|
| `ads.campaigns.read` | Read Campaign/AdGroup/Ad |
| `ads.campaigns.write` | Create/update/pause/resume |
| `ads.creatives.write` | Upload/attach Creatives/Assets |
| `ads.reports.read` | Query reporting |
| `ads.billing.read` | Read Billing Account, invoices, spend |
| `ads.webhooks.manage` | Register webhook endpoints *(Future)* |
| `ads.experiments.write` | Manage experiments *(Future)* |

### Isolation

- Every request resolves to AdvertiserOrg; cross-tenant access denied by default.  
- Agency tokens list allowed org ids.  
- Internal admin APIs use separate host and break-glass audit (`08`).

---

## 6. Cross-Cutting API Rules

| Concern | Rule |
|---------|------|
| **Idempotency** | Required on creates and billing-related posts |
| **Pagination** | Cursor-based; max page size enforced |
| **Filtering / sorting** | Allowlisted fields only |
| **Versioning** | URI or header version (`v1`); breaking changes → new version |
| **Deprecation** | Documented sunset window; monitor usage |
| **Rate limits** | Per token + per org; bulk endpoints stricter |
| **Validation** | Schema validate; unknown fields rejected or ignored per version policy |
| **Error model** | Stable `code`, human `message`, optional `field_errors`, `request_id` |
| **Audit** | Mutating calls → AuditLog; API usage logs retained |
| **Data minimization** | Responses omit PII; reporting aggregates only |

---

## 7. Conceptual Resource Map

```text
/advertiser-orgs/{orgId}
  /campaigns
  /ad-groups
  /ads
  /creatives
  /assets                 (Creative Asset Library)
  /audiences
  /budgets                (read/update policies)
  /billing                (read)
  /review-status
  /reports/queries
  /exports/jobs
  /experiments            (Future)
  /webhooks               (Future)
```

Naming is illustrative—not a frozen route contract.

---

## 8. Conceptual Flows (Not Executable Code)

### 8.1 Create and launch campaign (happy path)

```text
1. POST /campaigns          (Idempotency-Key) → draft Campaign
2. POST /ad-groups          → TargetingSpec + placements
3. POST /assets             → upload session → scanning/processing
4. POST /creatives          → attach ready AssetVersions
5. POST /ads                → destination + creative bind
6. POST /campaigns/{id}/submit-review
7. GET  /review-status      → pending|approved|rejected
8. POST /campaigns/{id}/pause|resume  (only if approved/funded)
```

**Prohibition:** Any “force_publish” that skips Review is forbidden—even for partners.

### 8.2 Creative upload

```text
POST /assets/upload-sessions → upload URL (signed)
PUT  bytes to media pipeline
GET  /assets/{id} until state=ready|rejected
```

### 8.3 Pause / resume

```text
POST /campaigns/{id}/pause
POST /campaigns/{id}/resume   # still subject to Budget, Review, Fraud freezes
```

### 8.4 Reporting query

```text
POST /reports/queries
  {metrics, dimensions, filters, tz, definition_pins}
→ sync small result OR async job id
GET /exports/jobs/{id} → download when ready
```

Freshness labels required (`15_ENTERPRISE_REPORTING.md`).

### 8.5 Billing read

```text
GET /billing/account
GET /billing/transactions?cursor=
GET /billing/invoices/{id}
```

No public API to forge credits; credits are platform ops only.

---

## 9. Webhooks *(Future Capability)*

| Topic examples | When |
|----------------|------|
| `campaign.status_changed` | Pause, exhaust, reject |
| `review.decision` | Approve/reject |
| `report.job_completed` | Async export ready |
| `budget.threshold` | 80%/100% spend |

### Security & delivery

- HMAC **webhook signatures** with rotatable secrets.  
- At-least-once delivery; **ordering not guaranteed** across topics.  
- Retry with exponential backoff; dead-letter after N; partner must be idempotent.  
- Subscriptions scoped per org; public endpoints HTTPS only.

---

## 10. Bulk & Async Jobs

- Bulk mutate Campaigns/Ads via job resources.  
- Partial success reports per item.  
- Large reporting ranges must be async.  
- Job priority fair-queued per org to prevent noisy neighbors.

---

## 11. Sandbox & Test Accounts *(Future)*

- Separate sandbox tenants; no production user exposure.  
- Fake impressions optional; no real Billing charges or real Store orders.  
- Clear watermark in API responses (`environment=sandbox`).

---

## 12. Partner Certification & Eligibility

Partners requiring elevated scopes undergo certification: security review, use-case attestation, rate plan, and data-handling agreement.  
**Open Decision:** partner eligibility criteria and pricing.

Store sellers as API advertisers require seller verification alignment—Ads still cannot alter orders.

---

## 13. Security: Secrets, Rotation, Revocation, IR

| Control | Design |
|---------|--------|
| Secret storage | Hashed keys / KMS-backed |
| Rotation | Overlapping old/new window |
| Revocation | Immediate deny list |
| IP allowlists | Optional per key |
| S2S | mTLS or signed service tokens; short TTL |
| Incident response | Mass revoke, freeze org API, audit export (`08`) |

---

## 14. Hard Prohibitions

1. No direct database access for external callers.  
2. No SQL/query passthrough endpoints.  
3. No bypass of Review/moderation.  
4. No create/update/delete of Store **orders**, payments, or refunds.  
5. No start/stop of **Live sessions** as side effect of Ads API (deep-link destinations only).  
6. No export of raw audience membership user lists via reporting API.  
7. No undocumented admin force-approve for partners.

---

## 15. Region-Specific Endpoints *(Future)*

Regional base URLs may be required for data residency. Clients must not cross-post campaign PII/media contrary to org residency policy (**Open Decision** on topology).

---

## 16. Error Model (Conceptual)

| HTTP | code example | Meaning |
|------|--------------|---------|
| 400 | `validation_error` | Bad payload |
| 401 | `unauthorized` | Missing/invalid auth |
| 403 | `forbidden` | Scope/tenant |
| 404 | `not_found` | |
| 409 | `conflict` | Idempotency replay mismatch / active asset delete |
| 422 | `review_required_state` | Illegal transition |
| 429 | `rate_limited` | |
| 503 | `temporarily_unavailable` | Degraded dependency |

Always include `request_id` for support.

---

## 17. Failure Modes

| Failure | Behavior |
|---------|----------|
| Review service down | Accept draft writes; block submit-review with 503 |
| Media pipeline down | Upload session fails closed |
| Reporting warehouse lag | Return 202 + stale freshness or 503 on sync path |
| Partial bulk failure | Job status `completed_with_errors` |
| Webhook endpoint down | Retry → DLQ; no Campaign rollback |

---

## 18. MVP vs Future Capability

| MVP API | Future |
|---------|--------|
| API keys; campaigns/ads read-write; asset upload; report export jobs; billing read; review status | OAuth, webhooks, sandbox, experiments API, seller-specific surfaces, regional endpoints |
| Idempotency + cursors + rate limits | Partner marketplace certification portal |

---

## 19. Open Decisions

1. **API partner eligibility and pricing**.  
2. OAuth vs API-key timeline as primary external auth.  
3. Regional endpoint topology / data residency.  
4. Whether Store sellers get distinct API product packaging.  
5. External DSP demand integration shape (if any).  
6. Prepaid vs postpaid fields exposed in billing read.  
7. AI assisted-draft endpoints authority (`11`).  
8. Experiment API exposure to advertisers vs platform-only (`14`).  
9. Default attribution model parameters returned in reporting API (`13`).  
10. Auction-related readouts (if any) without leaking ranker IP.

---

## 20. Design Completeness Checklist

- [x] Public vs internal; auth; scopes; isolation  
- [x] Idempotency, pagination, versioning, errors, rate limits  
- [x] Conceptual campaign/creative/report/billing flows  
- [x] Webhooks, bulk, async, sandbox (future-marked)  
- [x] No moderation bypass; no Store/Live mutation; no direct DB  
- [x] Secrets rotation/revocation; audit; partner certification hooks  
- [x] Open decisions including partner pricing/eligibility  

---

## Related Documents

- `02_SYSTEM_ARCHITECTURE.md` — gateway/BFF placement  
- `08_SECURITY.md` — roles, API keys, audit  
- `09_DATABASE_BLUEPRINT.md` — ApiClient entity  
- `12_CREATIVE_ASSET_LIBRARY.md` — upload semantics  
- `15_ENTERPRISE_REPORTING.md` — query/export semantics  
- `11_AI_ADVERTISING_ENGINE.md` — future assisted endpoints  
- `13_ATTRIBUTION_ENGINE.md` / `14_EXPERIMENT_PLATFORM.md` — future read/write surfaces  
- `10_FUTURE_ROADMAP.md` — API phase alignment  
