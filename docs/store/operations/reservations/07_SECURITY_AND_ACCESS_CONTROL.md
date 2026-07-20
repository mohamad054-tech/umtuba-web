# UMTUBA Store — Reservation Operations V1
## 07 · Security and Access Control

**Document type:** Ops security / access model
**Related:** Commerce Safety V1; Store Hardening V1; `02` enablement checklist

---

## 1. Roles

| Role | Reservation / commerce powers |
|------|-------------------------------|
| **Platform admin** | Toggle commerce gate via admin RPC; break-glass |
| **Commerce operator** | Run enablement checklist; request toggles; read metrics; coordinate expire drills |
| **Database operator** | Apply migrations; verify schema; service-role break-glass with audit |
| **Support agent** | Read order status via product tools; **no** expire RPC; **no** gate toggle; masked data only |
| **Seller owner/manager** | Cancel/manage **own store** orders (releases via RPC); cannot see other stores; cannot mutate `reserved` directly |
| **Auditor** | Read-only financial/ops exports under control; no mutate |
| **Service role** | Expire RPC; system jobs only; vaulted credentials |

---

## 2. Least privilege matrix

| Action | Admin | Commerce op | DBA | Support | Seller | Service role |
|--------|-------|-------------|-----|---------|--------|--------------|
| Read own-store reservations (via order ACL) | ✓ | ✓* | ✓ | limited | own store | ✓ |
| Toggle `checkout_confirm_enabled` | ✓ (checker) | propose | — | — | — | — |
| Set env kill switch | Platform change mgmt | propose | — | — | — | — |
| Run `expire_store_inventory_reservations` | break-glass | via approved job | break-glass | — | — | ✓ job |
| Direct SQL mutate reserved | — | — | controlled only | — | — | via DEFINER helpers |
| Cross-store reservation read | platform only | platform only | ✓ | — | **no** | ✓ |

\*Commerce operator platform-scoped, not seller-scoped.

---

## 3. Who may toggle commerce

- **Maker:** Commerce operator completes `02` checklist
- **Checker:** Platform admin or Eng manager (different human)
- RPC: `admin_set_store_commerce_checkout_enabled`
- Alert on every transition (`03`)

---

## 4. Who may run expiry

- Automated scheduler using **service_role** (preferred)
- Manual: DBA/Commerce with ticket + dual control (`01`, `05`)
- Sellers/support: **never**

---

## 5. Who may view reservations

- Buyers/sellers: only via parent order read ACL (`can_read_store_order`)
- No listing of another merchant’s holds
- Support: use existing order privacy projections; avoid exporting reservation dumps with PII

---

## 6. Buyer PII

Reservation tables should not become a PII warehouse. Tickets use `order_id` / `reservation_token` / `variant_id` only.

---

## 7. Service-role secret handling

- Store in vault / CI secrets; never `NEXT_PUBLIC_*`
- Rotate on suspicion (`04` Scenario K)
- Separate staging vs production keys
- Job identity logged

---

## 8. Environment kill switch access

- `STORE_COMMERCE_EMERGENCY_DISABLE` changes require Platform change approval
- Documented in incident comms when used
- Cannot enable commerce when DB gate is OFF

---

## 9. Audit requirements

Log / retain:

- Gate toggles (actor, before/after)
- Manual expire invocations
- Credential rotations
- Enablement sign-offs (`02`)

---

## 10. Break-glass

1. Declare incident
2. Dual approval
3. Time-boxed access
4. Session recording/notes
5. Revoke elevated access after
6. Post-incident review

---

## 11. Maker-checker for enabling commerce

Mandatory per `02_COMMERCE_ENABLEMENT_CHECKLIST.md` §4. Enabling without checker is a policy violation even if technically possible.
