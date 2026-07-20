# UMTUBA Ads — Security Checklist

**Document type:** Production readiness review — security checklist
**Status:** Checklist against **design/plans**. Do **not** treat items as implemented unless repository evidence exists.
**Sources:** `../08_SECURITY.md`, `../implementation/02_DATABASE_MIGRATIONS_PLAN.md`, `../implementation/03_BACKEND_SERVICES_PLAN.md`, `../implementation/05_TESTING_PLAN.md`, scaffolding notes (partial evidence only)

**Current-state vocabulary**

| State | Meaning |
|-------|---------|
| planned | Specified in Design/Implementation docs |
| partially designed | Docs + early scaffolding may exist; Design V2 incomplete |
| decision required | Blocked on Open Decision |
| future | Post-MVP |

---

## Checklist

| ID | Requirement | Threat addressed | Responsible component | Verification method | Release phase | Blocking? | Current state |
|----|-------------|------------------|----------------------|---------------------|---------------|-----------|---------------|
| S-01 | AuthN via UMTUBA Identity for console/admin | Account takeover of foreign sessions | Account / Admin | Session tests; no anon Ads writes | Rel-1 | Yes | partially designed |
| S-02 | Membership-derived tenant scope (no client-trusted org id) | IDOR / cross-tenant | All management services | Isolation suite C | Rel-1 | Yes | partially designed |
| S-03 | Role matrix enforced server-side (Owner/Admin/Campaign Manager/Analyst/Billing Manager) | Privilege escalation | Account + Actions/RPC | Permission unit + integration | Rel-1 | Yes | partially designed |
| S-04 | RLS ENABLE + FORCE on Ads tables | Direct table abuse | DB | Migration/RLS tests | Rel-1 | Yes | partially designed |
| S-05 | Revoke Ads privileges from `anon`/`public` | Unauthenticated access | DB grants | Privilege tests | Rel-1 | Yes | partially designed |
| S-06 | SECURITY DEFINER RPCs pin `search_path` | Search-path hijack | Review/Billing/Admin RPCs | Migration contract tests | Rel-2+ | Yes | partially designed |
| S-07 | Review approve/reject RPC-only; advertiser cannot self-approve | Trust bypass | Review service | Explicit self-approve deny tests | Rel-2 | Yes | partially designed |
| S-08 | Platform admin from DB authority (not JWT-only) | Self-promotion | Admin | Admin gate tests | Rel-2 | Yes | partially designed |
| S-09 | No INSERT policy for authenticated on platform_admins | Self-promotion | Admin | Policy tests | Rel-2 | Yes | partially designed |
| S-10 | service_role / worker keys never in browser | Key leak | All | Secret scan; architecture review | All | Yes | planned |
| S-11 | Advertiser verification bar before settle | Fraudulent spend | Trust + Billing | OD-17; process tests | Rel-4 | Yes | decision required |
| S-12 | Agency/team invites single-use, role-gated | Invite takeover | Account | Invite tests | Rel-1 | Soft | planned |
| S-13 | Creative upload path scoped to org; MIME/size limits | Path escape / malware | Creative/Asset | Upload tests | Rel-1 | Yes | partially designed |
| S-14 | Malware/content scan before `ready` | Malicious creative | Asset pipeline | Scan fail stays non-ready | Rel-1–3 | Yes | planned |
| S-15 | Signed short-lived asset URLs only | Hotlink / scrape | Media | URL expiry tests | Rel-1 | Yes | partially designed |
| S-16 | Approved creative immutability (revision model) | Silent policy evasion | Creative/Campaign | Transition tests | Rel-2 | Yes | partially designed |
| S-17 | IVT detection + non-billable / credit path | Fake clicks / drain | Fraud + Billing | IVT credit tests | Rel-4–6 | Yes for money honesty | planned |
| S-18 | Signed serving/tracking tokens; expiry; replay reject | Beacon forgery | Serving + Ingest | Token tests suite I/N | Rel-3 | Yes | planned |
| S-19 | Rate limits on ingest, invite, export, login | Abuse / DoS | Edge + services | Staging rate tests | Rel-3+ | Soft→Yes | planned |
| S-20 | Append-only billing ledger; no client writes | Ledger fraud | Budget/Billing | Financial suite J | Rel-4 | Yes | planned |
| S-21 | Idempotent settle/credit keys | Double charge | Billing | Double-settle tests | Rel-4 | Yes | planned |
| S-22 | Budget freeze + emergency Delivery stop | Drain / incident | Admin + Eligibility | Drill Rel-3+ | Rel-3–4 | Yes | planned |
| S-23 | Audit row same transaction as review/settle/freeze | Repudiation | Review/Billing/Admin | Atomicity tests | Rel-2+ | Yes | partially designed |
| S-24 | Admin destructive confirms (UI) + RPC authZ | Accidental/mass harm | Admin console | E2E admin | Rel-2 | Soft | planned |
| S-25 | Privacy: no raw audience PII to advertisers/AI | PII leak | Reporting/AI | Privacy tests | Rel-4+ | Yes | planned |
| S-26 | Consent / personalized-ads flags by region | Legal | Targeting/Eligibility | Policy pack tests | Rel-8 | Yes public geo | decision required |
| S-27 | Minors / youth ad restrictions | Child safety | Policy + Eligibility | Pack tests | Rel-8 | Yes | planned |
| S-28 | Sensitive targeting packs (OD-03) | Discrimination / legal | Targeting | Pack tests | Rel-8 | Yes | decision required |
| S-29 | Political ads default off (OD-04) | Regulatory | Review/Policy | Flag tests | Rel-8 | Yes if enabling | decision required |
| S-30 | Hide/report ad feedback → suppression hooks | Harassment / spam | Delivery + Trust | Signal tests | Rel-6 | Soft | planned |
| S-31 | Creator protection: Ads cannot rewrite creator commission | Economic harm | Attribution boundary | Contract tests | Rel-5 | Yes for Store claims | planned |
| S-32 | Reporting small-N suppression | Re-identification | Reporting | Threshold tests | Rel-6–8 | Soft→Yes | planned |
| S-33 | Attribution cannot UPDATE Store orders | Order integrity | Attribution | Negative tests | Rel-5 | Yes | planned |
| S-34 | Webhook HMAC + idempotent receivers (API) | Spoofing | Ads API | Contract tests | Rel-9 | Yes API GA | future |
| S-35 | API scopes; no moderation bypass | Partner abuse | Ads API | Scope tests | Rel-9 | Yes API GA | future |
| S-36 | Secret rotation / key revoke | Stolen credentials | API/Admin | Runbook + tests | Rel-4+ | Soft→Yes | planned |
| S-37 | Incident response: evidence preserve, freezes | Breach / fraud | Ops | Drills OD-40 | Rel-3+ | Soft→Yes | planned |
| S-38 | Regional residency controls (OD-10) | Data localization | Infra + DB | Topology review | Rel-8 | Yes sensitive geos | decision required |
| S-39 | Retention jobs for raw events vs finance/audit | Over-retention / under-retention | Data | Job existence checks | Rel-6–8 | Soft | planned |
| S-40 | AI: no raw PII in prompts; human approve default | Leak / autonomous spend | AI service | AI safety suite M | Rel-10 | Yes if AI on | planned |
| S-41 | Experiment: no auto-winner; AI lock on running arms | Bad optimize / bias | Experiment + AI | Suite L | Rel-10 | Soft | future |
| S-42 | Upload active-use delete protection | Break live ads / audit gaps | Asset Library | Conflict tests | Rel-1 | Soft | planned |

---

## Evidence Notes

- Early scaffolding (`../ADS_PLATFORM_FOUNDATION_V1.md`, `../ADS_ADMIN_REVIEW_FOUNDATION_V1.md`) may satisfy **partial** evidence for S-01–S-09, S-13, S-15, S-16, S-23 — **not** Design V2 complete, **not** Delivery/Billing settle proven.
- Items marked **decision required** depend on Open Decisions registry (`05_OPEN_DECISIONS_REGISTER.md`).
- Never mark “implemented” in launch checklists without CI/staging proof (`../implementation/05_TESTING_PLAN.md`).

---

## Related Documents

- `01_ARCHITECTURE_REVIEW.md` · `06_PRODUCTION_CHECKLIST.md`
- `../08_SECURITY.md` · `../implementation/05_TESTING_PLAN.md` · `../implementation/02_DATABASE_MIGRATIONS_PLAN.md`
