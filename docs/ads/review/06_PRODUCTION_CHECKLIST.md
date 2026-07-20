# UMTUBA Ads — Production Checklist

**Document type:** Production readiness review — public-launch checklist
**Status:** All completion states reflect **documentation/planning reality**. Implementation has **not** started Design V2 delivery as a finished product.
**Do not** mark items complete without evidence.

**Completion vocabulary:** `not started` · `planned` · `decision required` · `future`

---

## 1. Product Scope

| Item | Owner | Evidence required | Phase | Blocking? | State |
|------|-------|-------------------|-------|-----------|-------|
| Public MVP scope written (formats/objectives/placements) | Product | Signed scope + OD-46 | Rel-8 | Yes | decision required |
| Known limitations published | Product | Public help/status copy | Rel-8 | Yes | planned |
| Out-of-scope enforced (DSP/AI auto/political default off) | Product + Eng | Flags + tests | Rel-8 | Yes | planned |

---

## 2. Legal and Policy Approval

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Launch countries approved (OD-45) | Legal + Product | Geo approval record | Rel-8 | Yes | decision required |
| Sensitive targeting packs (OD-03) | Legal + T&S | Pack docs + tests | Rel-8 | Yes | decision required |
| Political ads policy (OD-04) | Legal + T&S | Default-off proof | Rel-8 | Yes | decision required |
| Minors/youth rules | T&S + Legal | Pack + tests | Rel-8 | Yes | planned |
| Privacy/consent disclosures | Legal | Copy + consent wiring | Rel-8 | Yes | planned |
| Data residency (OD-10) if required | Legal + Eng | Topology decision | Rel-8 | Conditional | decision required |

---

## 3. Architecture

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Design V2 accepted | Product + Eng | Doc sign-off | Rel-0 | Yes for build | planned |
| Implementation plans `01`–`06` accepted | Eng + Product | Doc sign-off | Rel-0 | Yes for build | planned |
| Scaffolding reconciliation M01 done | Eng | Mapping doc | Rel-1 | Yes for clean Phase A | not started |
| Kill switches designed & drilled | Eng + Ops | Drill notes | Rel-3 | Yes Delivery | planned |

---

## 4. Migrations

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Design-aligned slices applied per `02` plan | Eng | Migration CI | Rel-1+ | Yes progressive | not started |
| Forward-fix preference followed | Eng | No destructive prod downs | All | Yes | planned |
| Backfills documented when needed | Eng | Runbooks | As needed | Soft | planned |

---

## 5. RLS and Permissions

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| RLS FORCE + anon revoke | Eng | Suite B/C | Rel-1 | Yes | partially via scaffolding only → treat **planned/not proven Design V2** |
| Cross-tenant isolation green | Eng + Sec | Isolation tests | Rel-1 | Yes | not started (Design V2) |
| Role matrix server-enforced | Eng | Permission tests | Rel-1 | Yes | partially designed |

*Note: Scaffolding may exist; Design V2 still **not started** as complete — do not check “done” without fresh proof.*

---

## 6. Advertiser Verification

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Verification bar before settle (OD-17) | Trust + Finance | Decision + enforcement | Rel-4 | Yes settle | decision required |
| Suspended/frozen UX + server deny | Eng + Trust | E2E | Rel-4 | Yes | planned |

---

## 7. Moderation Operations

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Reviewer staffing/SLA owner (OD-18) | T&S + Product | Named owner + capacity | Rel-4 | Yes external beta | decision required |
| Queues + audit completeness | Eng + T&S | Tests S-07/S-23 | Rel-2 | Yes | partially designed |
| Policy codes + reject reasons | T&S | Catalog live | Rel-2 | Yes | planned |
| Appeals path (min placeholder→real) | T&S | Process | Rel-4–8 | Soft→Yes | planned |

---

## 8. Creative Processing

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Scan before ready | Eng | Pipeline metrics | Rel-1–3 | Yes | planned |
| Signed URLs only | Eng | Tests | Rel-1 | Yes | partially designed |
| Format/placement compatibility checks | Eng + Product | Matrix tests | Rel-3 | Soft→Yes | planned |

---

## 9. Billing and Reconciliation

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| OD-05 billing model closed | Finance + Product | Decision log | Rel-4 | Yes settle | decision required |
| OD-06 overshoot SLA closed | Finance + Eng | Numeric SLA | Rel-4 | Yes settle | decision required |
| Payment adapter chosen (OD-55 PROPOSED) | Finance + Eng | Adapter live in staging | Rel-4 | Yes settle | decision required |
| Daily recon for closed beta | Finance + Eng | Recon reports | Rel-4 | Yes | planned |
| Idempotent settle proven | Eng | Suite J | Rel-4 | Yes | not started |
| Credits/IVT path | Finance + Trust | Runbook + tests | Rel-4–6 | Yes honesty | planned |

---

## 10. Budget Enforcement

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Soft eligibility + hard settle | Eng | Tests | Rel-4 | Yes | planned |
| Auto-stop on exhaust/payment fail/freeze | Eng | E2E | Rel-4 | Yes | planned |
| Counter recon cadence (OD-52 PROPOSED) | Eng | Job + alert | Rel-4 | Soft→Yes | decision required |

---

## 11. Delivery Correctness

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| OD-16/46 placements closed for launch set | Product + Eng | Registry entries | Rel-3–8 | Yes | decision required |
| Only approved+in-date+unfrozen serve | Eng | Suite I | Rel-3 | Yes | not started |
| Fail-closed on timeout | Eng | Chaos/drill | Rel-3 | Yes | planned |
| Labeled inventory (product chrome) | Product surfaces | UX QA | Rel-3 | Yes | planned |
| Latency SLO (OD-43) | Eng | Dashboard + budget | Rel-6 | Yes widen | decision required |

---

## 12. Event Integrity

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Signed tokens + dedupe | Eng | Tests | Rel-3 | Yes | planned |
| Poison/DLQ handling | Eng | Staging drill | Rel-3 | Soft→Yes | planned |
| Schema version on events | Eng | Contract tests | Rel-3 | Soft | planned |

---

## 13. Fraud and IVT

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| IVT thresholds (OD-09) | Trust + Eng | Decision + config | Rel-4–6 | Yes money honesty | decision required |
| Monitoring/alerts for IVT spikes | Ops + Trust | Alert config | Rel-6 | Yes | planned |
| Freeze on drain patterns | Trust + Eng | Runbook | Rel-4 | Yes | planned |

---

## 14. Attribution

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| OD-02 dual ledger behavior | Product + Store | Tests + docs | Rel-5 | Yes Store claims | decision required |
| OD-11 windows pinned | Product + Eng | Versioned config | Rel-5–8 | Yes conversion claims | decision required |
| No Store order mutation | Eng | Negative tests | Rel-5 | Yes | planned |
| Refund/cancel reverse | Eng + Store | Tests | Rel-5 | Yes | planned |

---

## 15. Reporting

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Preliminary vs finalized labels | Eng + Product | UI + API | Rel-4–8 | Yes | planned |
| Freshness SLA (OD-44) | Eng + Product | Decision + monitor | Rel-8 | Yes Public MVP claims | decision required |
| Privacy thresholds | Eng | Tests | Rel-6–8 | Soft→Yes | planned |
| Export limits | Eng | Rate tests | Rel-8 | Soft | planned |
| Metric changelog owner (OD-51 PROPOSED) | Product + Eng | Process | Rel-8 | Soft→Yes | decision required |

---

## 16. Privacy

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| No PII in reports/AI prompts | Eng + Sec | Reviews/tests | Rel-4+ | Yes | planned |
| Consent wiring by region | Legal + Eng | Packs | Rel-8 | Yes | decision required |
| Consumer ad controls depth (OD-53 PROPOSED) | Product + Legal | Spec | Rel-6–8 | Soft | decision required |

---

## 17. Accessibility

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Console WCAG critical paths | Frontend | Suite Q + audit | Rel-8 | Soft→Yes | planned |
| Admin desktop usable securely | Frontend + Sec | QA | Rel-2 | Soft | planned |

---

## 18. Localization

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| AR/EN + RTL/LTR console | Frontend | Suite R | Rel-8 | Soft→Yes | planned |
| Currency/date formatting | Frontend | QA | Rel-4 | Soft | planned |

---

## 19. Performance

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Serve perf budgets monitored | Eng | Dashboards | Rel-3+ | Yes Delivery | planned |
| Load smoke before widen | Eng | OD-36 tool + report | Rel-6 | Yes widen | decision required |
| Large-account list pagination | Eng | Tests | Rel-8 | Soft | planned |

---

## 20. Observability

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Core alerts live (serve, settle, IVT, queue, stop) | Ops + Eng | Alert screenshots | Rel-3–4 | Yes | planned |
| Correlation ids Action→RPC→job | Eng | Trace sample | Rel-1+ | Soft | planned |
| Audit retention verified | Sec + Eng | Policy | Rel-4 | Soft→Yes | planned |

---

## 21. Incident Response

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Sev model + IC rotation | Ops | Roster | Rel-3 | Yes Delivery | planned |
| Emergency stop drill | Eng + Ops | Drill log | Rel-3 | Yes | planned |
| Postmortem template | Ops | Template | Rel-3 | Soft | planned |

---

## 22. Support Readiness

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Advertiser macros / known limits | Support + Product | Docs | Rel-4 | Yes external beta | planned |
| Admin/moderator playbooks | T&S | Docs | Rel-2 | Yes | planned |
| Finance recon playbook | Finance | Docs | Rel-4 | Yes settle | planned |

---

## 23. Finance Readiness

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Billing model + SLA decisions | Finance | OD-05/06 closed | Rel-4 | Yes | decision required |
| Chart of accounts / invoicing path | Finance | If prepaid receipts OK | Rel-4–8 | Soft | planned |
| Refund/credit dual-control plan | Finance + Sec | Process | Rel-6+ | Soft→Yes | planned |

---

## 24. Regional Rollout

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Per-geo Go/No-Go | Product + Legal | Checklist signed | Rel-8 | Yes | decision required |
| Policy packs enabled per geo | T&S + Eng | Config | Rel-8 | Yes | planned |

---

## 25. Rollback

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Flag-first rollback order rehearsed | Eng | Drill | Rel-3 | Yes | planned |
| Ledger non-destructive undo (credits) | Finance + Eng | Runbook | Rel-4 | Yes | planned |

---

## 26. Go/No-Go Approval

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Use Release Plan §25 checklist | Product (A) | Signed Go | Each widen | Yes | planned |
| No open S0/S1 Ads defects | Eng + Sec | Tracker | Each widen | Yes | not started |

---

## 27. Post-Launch Monitoring

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| T+1h / T+24h / T+7d validation | Eng + Ops | Reports | Rel-8 | Yes | planned |
| Trust KPIs (hide/IVT/review SLA) | Product + T&S | Dashboard | Rel-8 | Yes | planned |

---

## Brand Safety Dependency

| Item | Owner | Evidence | Phase | Blocking? | State |
|------|-------|----------|-------|-----------|-------|
| Social adjacent-content signals (OD-54 PROPOSED) | Product Social + Ads | Contract | Rel-6 | Soft→Yes widen | decision required |

---

## Summary Launch Gate

Public launch is **blocked** until at minimum:

1. Blocking Open Decisions for Rel-8 closed (see `05_OPEN_DECISIONS_REGISTER.md` §3.7).
2. Milestones through M14 entry criteria met with test evidence (`04_IMPLEMENTATION_SEQUENCE.md`).
3. Security checklist blocking items verified in staging (`03_SECURITY_CHECKLIST.md`).
4. Go/No-Go signed; rollback drill current.

**Present state:** documentation/planning strong; engineering implementation and production launch **not started** for Design V2 public product.

---

## Related Documents

- `01_ARCHITECTURE_REVIEW.md` · `03_SECURITY_CHECKLIST.md` · `04_IMPLEMENTATION_SEQUENCE.md` · `05_OPEN_DECISIONS_REGISTER.md`
- [`../implementation/06_RELEASE_PLAN.md`](../implementation/06_RELEASE_PLAN.md) §25 Go/No-Go
- [`../implementation/05_TESTING_PLAN.md`](../implementation/05_TESTING_PLAN.md)
