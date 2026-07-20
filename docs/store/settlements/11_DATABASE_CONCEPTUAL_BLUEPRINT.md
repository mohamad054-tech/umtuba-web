# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 11 · Database Conceptual Blueprint

**Document type:** Conceptual data model only  
**Status:** Not implemented — **no SQL in this document**  
**Related:** `02`–`10`, `12`

> Entity names are logical. Physical DDL, RLS, and indexes are future implementation work and MUST NOT be inferred as existing in the current repo.

---

## 1. Entity catalog

### 1.1 `merchant_accounts`

| Field theme | Notes |
|-------------|-------|
| Purpose | Legal/KYB merchant finance umbrella |
| Ownership | Platform; linked to one or more stores |
| Relationships | 1→N stores; 1→N payout profiles; 1→N financial accounts |
| Immutability | Identity stable; status mutable |
| Sensitive | Tax ids, legal name |
| Retention | Long |

### 1.2 `merchant_payout_profiles`

| Field theme | Notes |
|-------------|-------|
| Purpose | Verified payout destinations |
| Ownership | Merchant |
| Relationships | N→1 merchant; rail type; verification status |
| Immutability | Rotate by creating new profile; deprecate old |
| Sensitive | Account numbers (tokenized/encrypted) |
| Retention | Long after last payout |

### 1.3 `financial_accounts`

| Field theme | Notes |
|-------------|-------|
| Purpose | CoA + merchant subledger accounts (single currency each) |
| Ownership | Platform CoA or merchant |
| Relationships | 1→N ledger_entries |
| Immutability | Codes stable; freeze when closed |
| Sensitive | Low (balances confidential) |
| Retention | Permanent while referenced |

### 1.4 `ledger_transactions`

| Field theme | Notes |
|-------------|-------|
| Purpose | Atomic balanced economic event |
| Ownership | Platform |
| Relationships | 1→N ledger_entries; source refs; idempotency key unique |
| Immutability | **Immutable** after post |
| Sensitive | Medium |
| Retention | Multi-year / permanent |

### 1.5 `ledger_entries`

| Field theme | Notes |
|-------------|-------|
| Purpose | Debit/credit lines |
| Ownership | Via parent transaction |
| Relationships | N→1 transaction; N→1 account; optional order/store dims |
| Immutability | **Immutable** |
| Sensitive | Medium |
| Retention | With parent |

### 1.6 `commission_rule_versions`

| Field theme | Notes |
|-------------|-------|
| Purpose | Append-only fee/commission versions |
| Ownership | Platform |
| Relationships | Referenced by snapshots |
| Immutability | Versions immutable; new version for changes |
| Sensitive | Negotiated rates confidential |
| Retention | Permanent |

### 1.7 `order_financial_snapshots`

| Field theme | Notes |
|-------------|-------|
| Purpose | Frozen money breakdown at recognition |
| Ownership | Derived from order + payment; platform authoritative |
| Relationships | 1→1 (or 1→N revisions via compensating chain) per recognition |
| Immutability | **Immutable** |
| Sensitive | Medium |
| Retention | Permanent with order |

### 1.8 `settlement_periods`

| Field theme | Notes |
|-------------|-------|
| Purpose | Time box per merchant × currency |
| Ownership | Platform ops |
| Relationships | 1→N settlements / items |
| Immutability | Close freezes membership |
| Sensitive | Low–medium |
| Retention | Long |

### 1.9 `settlements`

| Field theme | Notes |
|-------------|-------|
| Purpose | Merchant settlement header in a period |
| Ownership | Merchant-scoped |
| Relationships | Period; items; state machine (`04`) |
| Immutability | State transitions audited; amounts from items |
| Sensitive | Medium |
| Retention | Long |

### 1.10 `settlement_items`

| Field theme | Notes |
|-------------|-------|
| Purpose | Slice of proceeds tied to order/snapshot |
| Ownership | Merchant/store attributed |
| Relationships | Settlement; snapshot; order ids |
| Immutability | Correct via new items / cancellations, not silent edits |
| Sensitive | Medium |
| Retention | Long |

### 1.11 `payout_batches`

| Field theme | Notes |
|-------------|-------|
| Purpose | Approved group of payouts |
| Ownership | Platform finance |
| Relationships | 1→N payouts; approval audit |
| Immutability | Contents frozen on approve |
| Sensitive | Medium |
| Retention | Long |

### 1.12 `payouts`

| Field theme | Notes |
|-------------|-------|
| Purpose | Single currency transfer intent |
| Ownership | Merchant |
| Relationships | Profile; batch; attempts |
| Immutability | Amount frozen after submit |
| Sensitive | Medium |
| Retention | Long |

### 1.13 `payout_attempts`

| Field theme | Notes |
|-------------|-------|
| Purpose | Append-only provider tries |
| Ownership | Platform |
| Relationships | N→1 payout |
| Immutability | **Append-only** |
| Sensitive | Provider refs |
| Retention | Long |

### 1.14 `adjustments`

| Field theme | Notes |
|-------------|-------|
| Purpose | Controlled manual/system finance corrections |
| Ownership | Platform; targets merchant |
| Relationships | Ledger tx; optional order |
| Immutability | Posted adjustments immutable |
| Sensitive | Medium |
| Retention | Long |

### 1.15 `reserves`

| Field theme | Notes |
|-------------|-------|
| Purpose | Hold policies & instances |
| Ownership | Platform / merchant |
| Relationships | Settlement items or merchant-level balances |
| Immutability | Policy versions append-only |
| Sensitive | Low–medium |
| Retention | Long |

### 1.16 `disputes`

| Field theme | Notes |
|-------------|-------|
| Purpose | Financial dispute/chargeback cases |
| Ownership | Platform; linked order/payment |
| Relationships | Holds; adjustments; operational ticket id |
| Immutability | Event log append-only |
| Sensitive | May reference buyer—minimize PII |
| Retention | Long |

### 1.17 `reconciliation_runs`

| Field theme | Notes |
|-------------|-------|
| Purpose | A scoped recon execution |
| Ownership | Platform finance |
| Relationships | 1→N issues |
| Immutability | Result sets retained |
| Sensitive | Low–medium |
| Retention | Long |

### 1.18 `reconciliation_issues`

| Field theme | Notes |
|-------------|-------|
| Purpose | Mismatch/missing/duplicate records |
| Ownership | Platform finance |
| Relationships | Run; linked entities |
| Immutability | Resolution notes append |
| Sensitive | Medium |
| Retention | Long |

### 1.19 `financial_audit_events`

| Field theme | Notes |
|-------------|-------|
| Purpose | Privileged action audit |
| Ownership | Platform |
| Relationships | Actor; entity refs |
| Immutability | **Append-only** |
| Sensitive | May include actor ids |
| Retention | Long / permanent |

---

## 2. Relationship sketch

```text
merchant_accounts
  ├── stores (existing Store concept)
  ├── merchant_payout_profiles
  ├── financial_accounts (per currency)
  ├── settlement_periods → settlements → settlement_items → order_financial_snapshots
  └── payouts → payout_attempts
ledger_transactions → ledger_entries → financial_accounts
commission_rule_versions → (referenced by) order_financial_snapshots
disputes / reserves / adjustments → ledger_transactions
reconciliation_runs → reconciliation_issues
```

---

## 3. Cross-cutting constraints (conceptual)

- Idempotency keys on ledger postings, payouts, recognition  
- Currency isolation  
- No client inserts into ledger/settlement/payout tables  
- RLS future: merchant isolation; platform roles; auditor read  

---

## 4. Explicit non-claims

This blueprint does **not** assert that any of these tables exist in Supabase today. Current `ANALYTICS_FINANCE_FOUNDATION` placeholders are unrelated stubs.
