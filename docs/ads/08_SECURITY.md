# UMTUBA Ads — Security, Trust & Integrity

**Document type:** Security, fraud, review, and permissions blueprint  
**Assumption:** Adversaries operate at internet scale; ad budgets are high-value targets  
**Principle:** Trust rails are product features—review, fraud, budget protection, audit, and admin moderation

---

## 1. Security Principles

1. **Least privilege** — Ads RBAC scopes on every mutating API.  
2. **Defense in depth** — Edge, app, domain, ledger, review.  
3. **Money paths are special** — Idempotency, dual control, immutable audit.  
4. **Assume adversarial advertisers and click fraud rings**.  
5. **Fail closed for risk** — Ambiguous high-risk ads hold; budget freezes on fraud spikes.  
6. **Privacy by design** — Minimize PII in logs; mask in ops tools.  
7. **Policy before yield** — Brand safety beats short-term fill rate.  
8. **Separability** — Consumer compromise must not grant advertiser billing powers and vice versa.

---

## 2. Permissions & Roles

### 2.1 Advertiser organization roles

| Role | Capabilities |
|------|----------------|
| **Owner** | Full control, billing, delete org, grant roles |
| **Admin** | Campaigns, users, reporting; limited billing |
| **Analyst** | Read reports, export (rate-limited) |
| **Campaign Manager** | Create/edit campaigns, creatives; no billing |
| **Billing Manager** | Funding, invoices, payment methods; no creative publish alone |
| **Creative Reviewer** *(optional)* | Internal approve before platform submit |
| **API Developer** | Manage API keys with scoped permissions |

### 2.2 Platform admin roles

| Role | Capabilities |
|------|----------------|
| **Ads Moderator** | Review queue decisions |
| **Senior Moderator** | Override, escalate, policy notes |
| **Fraud Analyst** | IVT cases, freezes, credits proposals |
| **Billing Ops** | Manual credits/debits with dual control |
| **Ads Admin** | Feature flags, placement enablement |
| **Auditor** | Read-only audit export |
| **Superadmin** | Break-glass with step-up + time-boxed access |

### 2.3 AuthN / AuthZ controls

- AuthN via UMTUBA Identity.  
- AuthZ in BFF + each service.  
- Step-up auth for: payout/refund-like credits, role grants, large budget raises, API key create.  
- Admin sessions: short TTL, device binding, anomaly alerts.  
- Service-to-service: signed auth / mTLS (implementation choice).  
- Advertiser API keys: hashed at rest, rotatable, IP allowlists optional.

---

## 3. Ad Review

### 3.1 Review pipeline

```text
Submit → Automated checks → (pass) Eligible provisional?
                         → Manual queue if needed
                         → Decision: Approve / Reject / Changes requested
                         → Continuous re-review triggers
```

### 3.2 Automated checks

| Check | Examples |
|-------|----------|
| Malware / phishing URL | Destination scan |
| Policy keyword / image classifiers | Prohibited claims |
| Duplicate / spam creative | Hash similarity |
| Destination integrity | SKU active, Live active, app package match |
| Vertical schema | Jobs/real estate required fields present |
| Advertiser tier gates | Unverified cannot run Government/Charity |

### 3.3 Manual review

- Queues by vertical and risk score.  
- SLA targets by campaign class (Government/Charity may be stricter).  
- Dual review for borderline political/civic claims where required.  
- Appeals path with new evidence; decision letters with policy codes.

### 3.4 Continuous review

Triggers: user reports spike, CTR anomaly, destination change, creative edit, regulatory alert, seller suspension in Store.

### 3.5 Labeling enforcement

Missing Sponsored label or spoofed UI chrome → reject or auto-pause.

---

## 4. Fraud Detection

### 4.1 Threat classes

| Threat | Description |
|--------|-------------|
| **Fake clicks** | Bots, click farms, incentivized click fraud |
| **Fake impressions / views** | Hidden ads, stacked views, non-viewable traffic |
| **Fake accounts** | Sybil users to farm engagement or attacker-side inventory |
| **Conversion fraud** | Fake installs, fake ATC rings, refunded purchase loops |
| **Budget drain** | Competitor clicking; malware auto-click on web |
| **Account takeover** | Hijack advertiser account to spend or steal funds |
| **Creative malware** | Malicious assets / destinations |
| **Collusion** | Publisher-side (future) inflated inventory |

### 4.2 Signal classes

| Signal | Examples |
|--------|----------|
| Device / environment | Emulators, headless, impossible device graphs |
| Velocity | Clicks per IP/device/user |
| Behavior | Zero dwell, robotic paths, click without viewability |
| Graph | Clusters of new accounts clicking same ads |
| Economic | CTR outliers vs placement norms |
| Destination | Instant bounce patterns |

### 4.3 Controls

- Real-time filters on serve and click accept.  
- Delayed IVT classification with automatic credits.  
- Budget freeze on suspected drain.  
- Graduated limits for new advertisers and new apps.  
- CAPTCHA/step-up sparingly on advertiser login anomalies—not on every consumer click.  
- Shared signals with Store Risk and Identity (fraud graph) under privacy rules.

---

## 5. Fake Clicks & Invalid Traffic (IVT)

| Stage | Action |
|-------|--------|
| **Pre-bill** | Reject obvious bot clicks |
| **Post-bill window** | Mark IVT → credit spend → restore budget |
| **Repeat sources** | Suppress inventory segments / user clusters |
| **Advertiser transparency** | Show credited IVT summary without enabling gaming |

Click validation requires signed tracking tokens bound to impression id, expiry, and placement.

---

## 6. Fake Accounts

- Registration velocity + device binding + phone/email risk.  
- Ads-specific: fake users generated to inflate “engagement audiences.”  
- Audience Service refuses membership from accounts below trust score.  
- Coordinated inauthentic behavior → network-level takedown with Identity.

---

## 7. Budget Protection

| Control | Purpose |
|---------|---------|
| Hard account/campaign caps | Limit blast radius |
| Soft serve + hard settle | Contained overshoot |
| Anomaly auto-freeze | Stop drain within minutes |
| Dual control credits | Prevent insider abuse |
| Payment velocity limits | Card testing / stolen instruments |
| Destination allowlists for high spend | Reduce phishing budget theft |
| Session binding for billing changes | ATO resistance |

**Incident playbook (design):** detect → freeze → notify advertiser → investigate → credit → unfreeze / ban.

---

## 8. Audit Log

Append-only audit facts for:

- Campaign/ad create/update/status  
- Review decisions and policy codes  
- Budget changes and freezes  
- Billing credits/charges (with actor)  
- Role grants/revokes  
- Admin break-glass access  
- API key lifecycle  
- Attribution model version changes (platform)

Logs are immutable for retention period; exports for auditors under role + ticket id.

---

## 9. Admin Moderation

### Tools

- Review console with creative preview + destination sandbox open.  
- Force pause ad / campaign / advertiser.  
- Strike system: warnings → reduced limits → ban.  
- Impersonation-free support: “view as” read-only with watermark.  
- Bulk actions with confirmation + reason codes.

### Moderation inputs

- User reports (“Hide ad”, “Inappropriate”, “Scam”)  
- Automated classifiers  
- Brand complaint portal  
- Store seller suspension events  
- Legal takedown workflow  

### Appeals

- Advertiser appeal with SLA.  
- Distinct from user content appeals.  
- Final decisions recorded with policy version.

---

## 10. Brand Safety & Suitability

- Placement-level brand safety floors.  
- Exclusion of sensitive adjacent content categories (where inventory signals exist).  
- Separate packs for kids/youth surfaces—ads heavily restricted or disabled.  
- Government/Charity misrepresentation treated as severe abuse.

---

## 11. Data Security

| Area | Control |
|------|---------|
| Creative assets | Malware scan, signed CDN URLs |
| Customer lists | Hashing, encryption, short retention options |
| Tracking tokens | Signed, expiring, non-forgeable |
| Secrets | KMS; no secrets in serve logs |
| PII in support tools | Masking + access justifications |
| Regional residency | Policy-driven storage classes |

---

## 12. Abuse of Targeting & Privacy

- Prohibit targeting packs that enable unlawful discrimination.  
- Detect advertisers iterating microsegments to harass individuals.  
- Rate-limit audience uploads; virus-scan files.  
- Ban scraping of “why this ad” to reverse-engineer users.

---

## 13. Compliance Hooks

- Regional advertising laws (disclosures, political ads—if enabled).  
- Record-keeping for government/charity campaigns.  
- Age-restricted vertical geo maps.  
- User rights: access/delete impacting advertiser audiences via privacy pipeline.

Exact legal interpretations are counsel-owned; engineering provides switches and audit.

---

## 14. Incident Severity (Ads-specific)

| Sev | Examples |
|-----|----------|
| SEV-1 | Mass budget drain; malicious creative on major placements; ledger corruption |
| SEV-2 | Elevated IVT; review backlog breaking SLA; partial freeze bugs |
| SEV-3 | Single advertiser compromise contained; classifier false positives |

---

## Related Documents

- `02_SYSTEM_ARCHITECTURE.md` — Fraud & Review services  
- `06_BUDGET_SYSTEM.md` — auto-stop and freezes  
- `07_REPORTING.md` — IVT credits impact metrics  
- `09_DATABASE_BLUEPRINT.md` — fraud_events, moderation  
- Cross-ref: `docs/store/13_SECURITY.md`  
