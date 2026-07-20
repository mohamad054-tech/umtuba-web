# UMTUBA Store — Reservation Operations V1
## 04 · Incident Response

**Document type:** Incident playbooks
**Status:** Operational guidance — documentation only
**Default containment bias:** Prefer **disable commerce confirm** over destructive data fixes.

---

## Global severity guide

| SEV | Meaning | Commerce gate |
|-----|---------|---------------|
| SEV-1 | Active oversell / credential leak / uncontrolled confirms | **OFF immediately** |
| SEV-2 | Expiry down, growing backlog, cancel release broken | OFF if backlog/drift worsening |
| SEV-3 | Partial monitoring gaps, single-variant drift | Usually keep state; fix forward |

**Rollback priority** (always): env kill switch → DB gate OFF → stop confirms → keep browse/cart → preserve history → release abandoned holds via approved expire RPC → forward-fix.

---

## Scenario A — Reservation expiry job stopped

| | |
|--|--|
| **Symptoms** | No job logs; backlog of `expires_at <= now()` growing; stuck metric up |
| **Containment** | If commerce ON and backlog critical → DB gate OFF and/or env kill switch |
| **Disable commerce?** | Yes if backlog critical or stock complaints |
| **Investigation** | Scheduler status, secrets, RPC grants, DB connectivity, locks |
| **Recovery** | Restore job; catch-up with bounded `p_limit` calls (`01`, `05`) |
| **Verification** | Backlog falling; sample expired rows consistent |
| **Communication** | Internal; sellers if SKUs falsely OOS |
| **Post-incident** | Add heartbeat alert; review single-point schedule |

---

## Scenario B — Reserved inventory growing unexpectedly

| | |
|--|--|
| **Symptoms** | `reserved` high; available → 0; many `active` reservations |
| **Containment** | Pause new confirms (gate OFF) if growth abnormal |
| **Disable commerce?** | Yes if unexplained |
| **Investigation** | Confirm rate vs cancel/expire rate; TTL settings; job health; unpaid order flood |
| **Recovery** | Ensure expiry running; do not mass-UPDATE reserved |
| **Verification** | Active count and reserved trend down after expire |
| **Communication** | Eng + Commerce |
| **Post-incident** | Rate-limit review; abuse checks |

---

## Scenario C — Overselling suspected

| | |
|--|--|
| **Symptoms** | Orders exceed on_hand; negative available; seller reports |
| **Containment** | **Gate OFF immediately**; stop marketing pushes to SKU |
| **Disable commerce?** | **Yes** |
| **Investigation** | Concurrent confirms; missing FOR UPDATE path; trigger/GUC bypass; manual reserved edits; migration partial |
| **Recovery** | Forward-fix code/data with finance/ops; compensating inventory; do not delete order history |
| **Verification** | Concurrency retest on staging; drift zero on SKU |
| **Communication** | Sellers affected; support macros; leadership if SEV-1 |
| **Post-incident** | Blameless RCA; add regression test |

---

## Scenario D — Reserved counter drift

| | |
|--|--|
| **Symptoms** | `reserved` ≠ sum(active qty); alerts from `03` |
| **Containment** | Gate OFF if drift widespread or on hot SKUs |
| **Disable commerce?** | If > few variants or growing |
| **Investigation** | Failed mid-txn (should rollback—check for direct SQL); double release bugs; manual updates |
| **Recovery** | Rebuild reserved from active sum via **approved** maintenance procedure (`05`) — not ad-hoc seller UI |
| **Verification** | Drift query clean |
| **Communication** | Internal unless sellers impacted |
| **Post-incident** | Harden grants; audit who mutated inventory |

---

## Scenario E — Duplicate orders

| | |
|--|--|
| **Symptoms** | Buyer sees two orders; two reservations |
| **Containment** | Usually keep gate ON unless systemic |
| **Disable commerce?** | If idempotency broken systemically → OFF |
| **Investigation** | Missing/blank idempotency keys; client retries without key; race before unique constraint |
| **Recovery** | Cancel duplicate per policy; ensure release on cancel; never delete ledger/reservation history |
| **Verification** | Idempotent retry test passes |
| **Communication** | Buyer support; seller if fulfillment risk |
| **Post-incident** | Confirm all create paths require keys (Commerce Safety) |

---

## Scenario F — Gate accidentally enabled

| | |
|--|--|
| **Symptoms** | `checkout_confirm_enabled=true` outside change window; confirms succeeding |
| **Containment** | **Immediate** `admin_set_store_commerce_checkout_enabled(false)` and/or env kill switch |
| **Disable commerce?** | **Yes** |
| **Investigation** | Audit who called admin RPC; access review |
| **Recovery** | Leave OFF until checklist (`02`) re-signed |
| **Verification** | `get_store_commerce_checkout_enabled()` false; UI blocks place order |
| **Communication** | Security + Eng manager |
| **Post-incident** | Maker-checker enforcement; alert on gate transitions |

---

## Scenario G — Environment kill switch accidentally enabled

| | |
|--|--|
| **Symptoms** | Confirms fail with commerce disabled despite DB gate ON |
| **Containment** | Confirm intentional; if accidental, remove `STORE_COMMERCE_EMERGENCY_DISABLE` via controlled change |
| **Disable commerce?** | Already effectively disabled in app |
| **Investigation** | Who changed env; CI/CD diff |
| **Recovery** | Controlled env rollback; verify DB gate intended state |
| **Verification** | Effective enablement matches change ticket |
| **Communication** | Platform on-call |
| **Post-incident** | Protect env var; require approval for prod env edits |

---

## Scenario H — Buyer cancellation failing

| | |
|--|--|
| **Symptoms** | Buyer cannot cancel; stock stays reserved |
| **Containment** | If unpaid holds pile up → ensure expiry job; consider gate OFF |
| **Disable commerce?** | Optional; prefer fix cancel path |
| **Investigation** | Product rules (who may cancel); RPC errors; RLS |
| **Recovery** | Seller/admin cancel releasing reservations; expiry for abandoned |
| **Verification** | Reserved drops; event `released` |
| **Communication** | Support + buyer |
| **Post-incident** | UX/error mapping review |

---

## Scenario I — Seller cancellation not releasing stock

| | |
|--|--|
| **Symptoms** | Order `cancelled` but reservation still `active` |
| **Containment** | Gate OFF if systemic |
| **Disable commerce?** | Yes if systemic |
| **Investigation** | `update_store_order_status` path; release helper errors; partial migrate |
| **Recovery** | Bounded expire for due rows; approved recovery for cancelled+active (`05`); forward-fix RPC |
| **Verification** | Cancel test releases reserved |
| **Communication** | Affected sellers |
| **Post-incident** | Contract test + staging regression |

---

## Scenario J — Database migration partially failed

| | |
|--|--|
| **Symptoms** | Missing tables/RPCs/trigger; confirms error; expire missing |
| **Containment** | **Gate OFF**; stop scheduler calls if RPC missing |
| **Disable commerce?** | **Yes** |
| **Investigation** | Migration history; failed statements |
| **Recovery** | Forward-fix migrate; **avoid** destructive down-migrate with live data |
| **Verification** | Schema checklist G1–G4 in `02` |
| **Communication** | DBA + Eng |
| **Post-incident** | Expand migrate verify CI |

---

## Scenario K — Service-role credential exposure suspicion

| | |
|--|--|
| **Symptoms** | Leak in logs/repo/chat; anomalous admin/expire calls |
| **Containment** | **Rotate credentials immediately**; gate OFF; revoke old key |
| **Disable commerce?** | **Yes** until rotated |
| **Investigation** | Access logs; git history; CI logs |
| **Recovery** | New secrets; audit expire/admin invocations; review data access |
| **Verification** | Old key dead; alerts quiet |
| **Communication** | Security incident process |
| **Post-incident** | Secret scanning; least-privilege review (`07`) |

---

## Escalation path

1. Commerce operator →
2. On-call engineer →
3. Database operator (schema/data) →
4. Security (credentials) →
5. Eng manager / incident commander

Link every SEV-1/2 to a ticket and postmortem within 5 business days.
