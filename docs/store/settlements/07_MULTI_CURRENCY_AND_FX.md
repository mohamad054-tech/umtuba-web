# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 07 · Multi-Currency and FX

**Document type:** Architecture (design only)  
**Status:** Not implemented  
**Related:** `02_FINANCIAL_LEDGER_ARCHITECTURE.md`, `05_PAYOUT_ARCHITECTURE.md`

---

## 1. Hard rules

1. Integer **minor units** only.  
2. **Currency on every** financial record.  
3. **No mixed-currency totals** in ledger transactions, settlements, or payouts.  
4. **No invented FX rates** — rates MUST come from an approved rate source with timestamp, or conversion is disallowed.  
5. Presentation conversion (UI) is non-authoritative unless labeled and sourced.

---

## 2. Currency roles

| Role | Meaning |
|------|---------|
| **Sale currency** | Currency of the order / capture |
| **Account currency** | Currency of a ledger account (always one) |
| **Settlement currency** | Currency of settlement items & merchant payable |
| **Payout currency** | Currency sent to beneficiary |
| **Presentation currency** | Display-only conversion for dashboards |

**Default recommendation:** Settlement currency = sale currency for V1 of finance; FX conversion deferred until a rate provider and policy exist (**OD-SD17**).

---

## 3. Currency-specific accounts

For each merchant × currency with activity:

- Separate `merchant_payable`, `merchant_held`, `merchant_in_transit`  
- Platform clearing accounts per currency  

Never net USD against EUR inside one account.

---

## 4. Future FX transactions

When conversion is allowed:

1. Debit/credit sale-currency accounts to close exposure  
2. Debit/credit settlement-currency accounts for counterpart  
3. Record `fx_rate`, `fx_rate_source`, `fx_rate_timestamp`, `conversion_fee_minor`  
4. Book FX gain/loss to platform accounts  
5. Rounding rules explicit (document residual minor units)

If any required FX field is missing → **fail closed** (no conversion post).

---

## 5. Rounding

- Prefer deterministic floor/half-even policy per OD  
- Residuals from FX MUST be booked (gain/loss or rounding account), never dropped silently  

---

## 6. Merchant experience

- Earnings widgets segmented by currency  
- Optional presentation total with disclaimer + rate timestamp  
- Payout profile currency must match payout currency capability  

---

## 7. Open decisions

See `12`: **OD-SD17** (when FX enabled), **OD-SD18** (rate provider), **OD-SD19** (who pays FX fees).
