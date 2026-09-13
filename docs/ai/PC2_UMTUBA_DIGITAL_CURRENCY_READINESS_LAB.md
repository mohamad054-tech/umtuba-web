# PC2 UMTUBA Digital Currency Readiness Lab V1

DATE_RETRIEVED = 2026-08-18  
DEVICE = PC2  
TASK_ID = `PC2_UMTUBA_DIGITAL_CURRENCY_READINESS_LAB_V1`  
MODE = RESEARCH_FIRST → ARCHITECTURE → LOCAL_PRIVATE_LAB  
LEGAL_CLASSIFICATION = REQUIRES_QUALIFIED_LEGAL_COUNSEL  

This document is **not** a legal opinion, investment memorandum, or token launch plan.  
TECHNICAL_MODEL, PRODUCT_UTILITY, ECONOMIC_MODEL, and LEGAL_CLASSIFICATION are kept separate.

Production firewall (this GO and product defaults):

| Flag | Value |
| --- | --- |
| PRODUCTION_ENABLED | FALSE |
| CONVERSION_ENABLED | FALSE |
| DEPOSITS / WITHDRAWALS / TRADING | FALSE |
| MAINNET_DEPLOYED | NO |
| PRODUCTION_CONNECTED | NO |
| PRODUCTION_POINTS_MIGRATION | NO |
| REAL_FUNDS_USED | 0 |
| REAL_CRYPTO_PURCHASED | 0 |
| REAL_USERS_MIGRATED | 0 |
| TOKEN_NAME / TOKEN_SYMBOL | TEST_PLACEHOLDER |
| TOKEN_SUPPLY / TOKEN_PRICE / CONVERSION_RATE / ALLOCATIONS / VESTING / LIQUIDITY | UNDECIDED |

---

## A1 — Asset-model decision (A–G)

| ID | Model | What it is | Fit for UMTUBA now |
| --- | --- | --- | --- |
| A | Internal loyalty / engagement points | Issuer-controlled ledger. No public transfer. No cash claim. | **CURRENT LIVE MODEL** (UM Points) |
| B | Closed-loop stored value | Prepaid balance redeemable only at issuer, often e-money/MSB-adjacent | Not chosen. Would add money-transmitter questions without product need |
| C | Public-chain utility token | Transferable token on a public network | Not now. No required public transferability |
| D | Native coin / own chain | Protocol asset of a new L1 | Not justified. Own chain is unnecessary |
| E | Security / investment-contract token | Offered with profit expectation from issuer efforts | Forbidden to design or market. Classification requires counsel |
| F | Stablecoin / e-money token | Pegged payment instrument | Out of scope. Price and peg UNDECIDED and not proposed |
| G | Hybrid: keep points internal; reserve a future token slot with conversion **disabled** | Architecture already sketched in wallet + UEOS | **FUTURE TECHNICAL SLOT ONLY** — not enabled |

**Decision now:** KEEP UM POINTS INTERNAL FOR NOW (Model A).  
**Future technical architecture (not enabled):** Model G already exists as placeholders (`umtuba_token` in `lib/wallet/assets.ts`, UEOS `UMT` = `future_reserved`). Conversion remains disabled.

**DOES_UMTUBA_NEED_A_CRYPTO_ASSET_NOW = NO**  
**SHOULD_UM_POINTS_REMAIN_INTERNAL_NOW = YES**  
**OWN_BLOCKCHAIN_NEEDED = NO**  
**RECOMMENDED_ARCHITECTURE = INTERNAL_UM_POINTS + PRIVATE_LAB_MODEL_G_SLOT**

The Product Owner asked for a complete **private lab** of a future token system. That lab is Model G machinery running on synthetic data only. It does not change the production recommendation.

---

## A2 — Token vs coin

Official technical distinction (not a legal conclusion):

- A **coin** is the native asset of a blockchain, used to pay fees and secure the network.
- A **token** is an application asset issued by a contract or program on an existing chain.

Sources:

| SOURCE | DATE_RETRIEVED | PUBLIC_REQUIREMENT_OR_GUIDANCE |
| --- | --- | --- |
| https://ethereum.org/en/developers/docs/intro-to-ether/ | 2026-08-18 | Ether is the native cryptocurrency used for Ethereum transaction fees (gas). Users cannot mint ether; the protocol issues it. |
| https://eips.ethereum.org/EIPS/eip-20 | 2026-08-18 | ERC-20 is a standard API for tokens inside smart contracts (transfer, approve, supply). |
| https://bitcoin.org/en/how-it-works | 2026-08-18 | Bitcoin is a shared public ledger of coin transfers signed by private keys. |
| https://solana.com/docs/tokens | 2026-08-18 | Solana tokens are SPL assets (mint account + token accounts), distinct from native SOL. |

**TOKEN_VS_COIN = TOKEN (if ever).**  
UMTUBA does not need a native coin or its own validator set. If a public asset is ever authorized later, it should be an application **token** on an existing chain — not a new L1 coin.

---

## A3 — Current official chain comparison

Comparison is technical. It is not a listing, liquidity, or legal recommendation.

| Chain | Native asset | Fungible token standard | Official notes retrieved 2026-08-18 | UMTUBA lab implication |
| --- | --- | --- | --- | --- |
| Bitcoin | BTC | Not ERC-20; UTXO coins | bitcoin.org: public ledger, key-signed transfers, mining consensus | Poor fit for an application token |
| Ethereum L1 | ETH | ERC-20 | EIP-20 + ethereum.org ERC-20 docs; OpenZeppelin ERC-20 implementation | Highest wallet/tooling familiarity; higher fee/ops surface |
| Ethereum L2 (Base / OP-class) | ETH (bridged) | ERC-20 | docs.base.org: standard ERC-20 bridge; L2StandardBridge at `0x4200…0010`; standard withdrawals have a 7-day challenge period | **Recommended IF a public EVM token is ever authorized** |
| Solana | SOL | SPL Token / Token-2022 | solana.com/docs/tokens: single Token Program, mint + ATA | Strong alternative; different custody/tooling |

**RECOMMENDED_CHAIN (future, not now) = Ethereum L2 (Base / OP-class ERC-20)**  
Reason: established ERC-20 + OpenZeppelin-class libraries, EVM wallet ecosystem, no need to operate an L1.

**ALTERNATIVE_CHAIN = Solana SPL** (if product later needs high-throughput transfers and accepts a different stack).

**This GO:** LOCAL in-memory EVM-semantic ERC-20 only.  
TESTNET_DEPLOYED = NO (skipped; public testnet adds key/RPC/operational risk and no extra invariant evidence).  
MAINNET_DEPLOYED = NO.

Known ERC-20 technical issue (not a reason to launch): ethereum.org documents irreversible loss when tokens are transferred to contracts that cannot handle them (page retrieved 2026-08-18).

---

## A4 — Legal / compliance (no legal conclusion)

**LEGAL_CLASSIFICATION = REQUIRES_QUALIFIED_LEGAL_COUNSEL**  
**LEGAL_READINESS = NOT_READY**

Do **not** read this section as UTILITY_TOKEN=LEGAL, NOT_A_SECURITY, or NO_LICENSE_REQUIRED.

Company jurisdiction = **PENDING**. All items below are jurisdiction-dependent checklists.

### Official sources reviewed

| SOURCE | DATE_RETRIEVED | JURISDICTION | PUBLIC_REQUIREMENT_OR_GUIDANCE |
| --- | --- | --- | --- |
| SEC / CFTC interpretive release 33-11412, https://www.sec.gov/files/rules/interp/2026/33-11412.pdf and Federal Register https://www.govinfo.gov/content/pkg/FR-2026-03-23/html/2026-05635.htm | 2026-08-18 | United States | Effective 2026-03-23. Applies Howey-style investment-contract analysis to certain crypto-asset transactions. A non-security crypto asset may become **subject to an investment contract** when an issuer offers it by inducing an investment of money in a common enterprise with representations or promises of essential managerial efforts from which a purchaser would reasonably expect profits. Supersedes the 2019 staff “Framework for Investment Contract Analysis of Digital Assets.” This is **not** a clearance that a product token is or is not a security. |
| Regulation (EU) 2023/1114 (MiCA), https://eur-lex.europa.eu/legal-content/en/TXT/?uri=CELEX%3A32023R1114 and ESMA MiCA rulebook https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica | 2026-08-18 | European Union | Public-offer / admission and CASP rules for crypto-asset services, including custody and exchange of crypto-assets for funds. Hardware/software for **non-custodial** wallets is described as outside that service scope. Whether UMTUBA would be an issuer or CASP is counsel-only. |
| FATF virtual-asset work, official URL https://www.fatf-gafi.org/en/news/targeted-updated-va-vasps-2026.html (7th Targeted Update, 16 July 2026) | 2026-08-18 | International standard (not self-executing law) | VA / VASP AML/CFT standards, including Travel Rule implementation progress. HTML fetch was Cloudflare-challenged from this lab; cite the official FATF URL and have counsel retrieve the PDF. National transposition is required before it is local law. |

Crypto marketing, white papers, and “utility token” blogs are **not** legal evidence.

### Current UMTUBA product legal text (internal, not a regulator determination)

`lib/legal/legalDocuments.ts` already states that UM Points are internal loyalty/engagement units, not money, bank deposits, securities, or cryptocurrency, and generally have no cash value outside the Service unless a separate clear offer says otherwise. That is **product drafting**, not a legal classification of a future token.

### Compliance requirements (checklist, not a determination)

If a transferable public token, custody, deposits, withdrawals, or conversion were ever enabled, counsel must map at least:

- Securities / investment-contract analysis (US Howey / 2026 SEC-CFTC interpretation; local equivalents)
- MiCA issuer / CASP perimeter (EU) if any EU offer, custody, or exchange
- AML/CFT + Travel Rule if the company is a VASP under local law
- Money-transmitter / e-money / stored-value if balances become redeemable value
- Sanctions screening if any transfer to external addresses
- Consumer, advertising, and “no profit promise” rules
- Tax information reporting
- Corporate formation, beneficial ownership, and licensing in the **still-pending** home jurisdiction

### Company requirements (PENDING jurisdiction)

- Incorporate / confirm legal entity and home regulator
- Appoint qualified counsel in home jurisdiction + any offer jurisdiction
- Decide whether users are customers of a regulated service
- Do **not** collect real KYC in this lab (synthetic states only)
- Do **not** open exchange accounts in this GO

---

## A5 — Points → Token architecture (disabled)

Inspected production (read-only; not modified):

| Surface | Fact |
| --- | --- |
| `public.um_point_balances` | Per-user non-negative balance. Users can SELECT own row only. Writes revoked from anon/authenticated. |
| `public.um_points_ledger` | Append-only **positive** earn rows (`points > 0`). Unique `(user_id, dedupe_key)`. |
| `award_um_points_to_user` | Trusted SECURITY DEFINER writer. Client RPC retired (20260723). Daily/category caps. Idempotent `ON CONFLICT DO NOTHING`. |
| `unlock_my_learning_lesson_with_um_points` | Spend is a **balance decrement**, not a negative ledger row. Unique unlock + compensating credit on unique_violation. |
| `lib/wallet/assets.ts` | `um_points.conversionReady = false`. `umtuba_token` placeholder. `quoteAssetConversion` always unavailable. |
| UEOS `20260822_ueos_foundation_v1.sql` | `UM_POINTS` active points asset. `UMT` = `future_reserved`. Explicitly out of scope: blockchain, token issuance, UM Points migration. |
| Legal copy | Points are not cryptocurrency. |

**POINT_TO_TOKEN_DESIGN (future, disabled):**

1. Product flag `CONVERSION_ENABLED = FALSE` (hard default).
2. Isolated request id (idempotency key).
3. Lock available synthetic points (available ↓, locked ↑).
4. Local chain adapter mints TEST_PLACEHOLDER units.
5. Burn locked points into `converted` (locked ↓, converted ↑).
6. On chain failure: unlock (refund). Never mint without a matching burn, never burn without a matching mint.
7. **Invariant:** the same unit is never spendable points **and** a transferred token.
8. Production `um_points_ledger` is never read or written.

`CONVERSION_RATE = UNDECIDED`. The lab uses a test-only identity mapping labeled `NOT_A_PRODUCTION_RATE`. That mapping is not a price, peg, or promised rate.

Existing production gap the future design must not copy blindly: spend today is not an append-only ledger entry (positive-only CHECK). A future conversion must add explicit lock/burn/refund rows on a **new** ledger, not by loosening production CHECKs in this GO.

---

## A6 — Double-spend invariants

Required invariants (lab-proven; production conversion still off):

1. Available + locked + converted + spent = earned (conservation).
2. Lock is atomic and keyed by `(userId, requestId, attempt)`.
3. Locked points cannot be spent or converted again.
4. Completed `requestId` returns DUPLICATE and does not mint again.
5. In-flight `requestId` returns RETRY.
6. Concurrent attempts on the same user return CONCURRENT.
7. Chain failure refunds lock; reconciliation still balances.
8. User role cannot mint.
9. Pause blocks convert and mint.

Production already has earn-side idempotency via `dedupe_key`. Spend-side lesson unlock uses unique `(user_id, lesson_id)` plus refund on race. The lab extends that idea to conversion lock/burn.

---

## A7 — Tokenomics framework only

All economic values remain **UNDECIDED**. Do not treat TEST_PLACEHOLDER as a priced asset.

| Parameter | Status |
| --- | --- |
| TOKEN_NAME / TOKEN_SYMBOL | TEST_PLACEHOLDER |
| TOKEN_SUPPLY | UNDECIDED |
| TOKEN_PRICE | UNDECIDED |
| CONVERSION_RATE | UNDECIDED |
| ALLOCATIONS | UNDECIDED |
| VESTING | UNDECIDED |
| LIQUIDITY | UNDECIDED |
| Public sale / listing | FORBIDDEN in this GO |

Framework questions for a later, counsel-led phase (not answers):

- What product right, if any, would a token represent?
- Who may hold it, and can it leave the platform?
- Is supply fixed, capped, or none?
- Are team/treasury allocations even desired?
- What disclosures would an offer require?

No 1B supply, no $1 peg, no fixed UM rate, no appreciation language.

---

## A8 — Utility analysis

### REAL_PRODUCT_UTILITY (today, UM Points)

- Earn for configured actions (welcome, posts, comments, saves, shares, referrals) with server-owned amounts and caps.
- Display in wallet / rewards.
- Spend to unlock some Learning lessons.
- Milestones / notifications.

These utilities work on an internal ledger. They do **not** require a public token.

### Speculative / not claimed

- Secondary-market value
- Profit, yield, or appreciation
- Governance as an investment
- Cash redemption
- Exchange listing
- Cross-platform payment

The lab token has **no product utility** outside synthetic tests. Do not market it.

**TECHNICAL_MODEL** = internal points + optional future ERC-20-shaped token slot.  
**PRODUCT_UTILITY** = points utility is real; token utility is UNDECIDED.  
**ECONOMIC_MODEL** = UNDECIDED.  
**LEGAL_CLASSIFICATION** = REQUIRES_QUALIFIED_LEGAL_COUNSEL.

---

## A9 — Wallet / custody

**Current production WALLET_MODEL:** platform-internal balance display over `um_point_balances`. No blockchain keys. Not a crypto wallet.

**Current CUSTODY_MODEL:** issuer ledger custody of points (not crypto custody). Users cannot export keys because there are none.

**Lab WALLET_MODEL:** synthetic custodial test addresses derived from user ids. No seeds shown. No public user wallets.

**If a public token is ever authorized (counsel + product GO):**

| Option | Notes | Cost category |
| --- | --- | --- |
| Keep custodial platform wallets | Company may become a CASP/custodian under local law | JURISDICTION_DEPENDENT + QUOTE_REQUIRED |
| Non-custodial user keys | Users hold keys; recovery/UX risk; MiCA text distinguishes non-custodial software | VARIABLE (engineering) + JURISDICTION_DEPENDENT |
| Qualified third-party custodian | Vendor diligence | QUOTE_REQUIRED |

This GO implements none of the public options.

---

## A10 — Security / threat model

| Threat | Control in lab | Production note |
| --- | --- | --- |
| Client self-mint | User role cannot mint; awards already revoked in production | Keep |
| Double convert | Lock + requestId + busy flag | Conversion stays off |
| Replay / retry storms | DUPLICATE / RETRY semantics | Same as points dedupe |
| Admin key abuse | Role-gated pause/mint/burn; audit trail | Future HSM/custody QUOTE_REQUIRED |
| Chain / adapter failure | Refund lock; reconcile | No public chain |
| Fake convert UI | Product preview forces convertActionable=false | Do not add convert to /rewards |
| Connecting to production ledger | Lab forbids those imports (tested) | Hard firewall |
| Seed / key leak | No real keys generated | Never create production keys here |
| Legal misrepresentation | TEST/SANDBOX/NO REAL VALUE copy | Keep |

SECURITY_MODEL = role-gated local ERC-20 semantics + append-only synthetic points + conversion state machine + audit + reconciliation.

---

## A11 — Prototype decision

A **public** token prototype is **not** product-justified now.

A **private local lab** **is** required by Product Owner addendum and is implemented.

| Decision | Value |
| --- | --- |
| SMART_CONTRACT_SANDBOX | LOCAL_IN_MEMORY_ERC20_REFERENCE (not public testnet, not mainnet) |
| TESTNET_DEPLOYED | NO |
| MAINNET_DEPLOYED | NO |
| LOCAL_SANDBOX | YES |

Reference token: EIP-20 + OpenZeppelin-class AccessControl / Pausable / mint / burn in TypeScript (`lib/sandbox/digitalAsset/token.ts`). Solidity file is documentation only and is not compiled or deployed.

---

## A12 — Lab implementation map

| # | Capability | Path |
| --- | --- | --- |
| 1 | Architecture | this document |
| 2 | Reference token | `lib/sandbox/digitalAsset/token.ts`, `contracts/TestPlaceholderToken.sol` |
| 3 | Synthetic wallet | `wallet.ts` |
| 4 | Synthetic UM Points ledger | `pointsLedger.ts` |
| 5 | Conversion engine | `conversionEngine.ts` |
| 6 | Lock/burn state machine | same |
| 7 | Double-spend | tests |
| 8 | Idempotency/retry | tests |
| 9 | Chain adapter | `chainAdapter.ts` (LOCAL_IN_MEMORY) |
| 10 | Failure/reconciliation | `reconciliation.ts` |
| 11 | Admin console | `app/sandbox/digital-asset/admin` |
| 12 | User preview | `app/sandbox/digital-asset/user` (no actionable convert) |
| 13 | History | `app/sandbox/digital-asset/history` |
| 14 | Treasury sandbox | `app/sandbox/digital-asset/treasury` |
| 15 | Roles mint/burn/pause | `roles.ts` + token |
| 16 | Security controls | firewall constants + tests |
| 17 | Audit trail | `audit.ts` |
| 18 | Local deploy tooling | `scripts/sandbox/digital-asset/local-deploy.ts` |
| 19 | Automated tests | `lib/sandbox/digitalAsset/*.test.ts` |
| 20 | E2E synthetic conversion | `digitalAsset.e2e.test.ts` |

Demo User A: 1000 TEST UM POINTS. Isolated tests convert 100. Product default remains disabled.

---

## A13 — UI rules

- Every sandbox surface shows **TEST / SANDBOX / NO REAL VALUE**.
- Product user preview uses `productUserPreview()` which forces `convertActionable = false`.
- No convert control is wired on `/rewards` or production wallet.
- Routes are isolated under `/sandbox/digital-asset` and are **not** added to `APP_ROUTES` or mobile nav.

---

## A14 — Cost categories (no invented vendor prices)

| Work | Category |
| --- | --- |
| This local lab engineering | VARIABLE (already sunk in this GO) |
| Public testnet RPC / faucet / keys | VARIABLE — skipped |
| Mainnet deploy / gas | FORBIDDEN |
| Qualified legal counsel (US / EU / home) | QUOTE_REQUIRED + JURISDICTION_DEPENDENT |
| CASP / VASP / MT license | JURISDICTION_DEPENDENT |
| KYC/AML vendor | QUOTE_REQUIRED — not purchased |
| Qualified custody | QUOTE_REQUIRED |
| Exchange listing | FORBIDDEN now; later QUOTE_REQUIRED |
| Security audit of a real contract | QUOTE_REQUIRED if a real deploy is ever authorized |
| Insurance / travel-rule messaging | QUOTE_REQUIRED + JURISDICTION_DEPENDENT |

---

## A15 — Roadmap GO / NO-GO per phase

| Phase | Intent | Gate | Verdict now |
| --- | --- | --- | --- |
| P0 Research + architecture | This document | Official sources + no legal conclusion | **GO (done)** |
| P1 Private local lab | Synthetic engine + tests | No production connection | **GO (done)** |
| P2 Public testnet | Optional evidence | Adds key/RPC risk, little invariant value | **NO-GO** |
| P3 Enable conversion in product | Point → token | Counsel + product owner + rate decided | **NO-GO** |
| P4 Production points migration | Move real balances | Explicitly forbidden | **NO-GO** |
| P5 Mainnet token | Public asset | Counsel + licenses + tokenomics decided | **NO-GO** |
| P6 Deposits / withdrawals / trading | Money movement | Counsel + licenses | **NO-GO** |
| P7 Marketing as investment / yield | Capital raise language | Forbidden | **NO-GO** |

NEXT_RECOMMENDED_PHASE = keep UM Points internal; use the private lab only for future design reviews; engage qualified counsel once company jurisdiction is set.

---

## A16 — Questions

### Product owner

1. Is there any product job a public token must do that UM Points cannot?
2. Will users ever transfer value off-platform?
3. Should the future slot stay named UMT / umtuba_token or remain unnamed until counsel reviews?
4. Confirm company jurisdiction and target user countries.
5. Confirm no conversion marketing on rewards or mobile.

### Legal counsel

1. Home-jurisdiction perimeter: points vs stored value vs crypto-asset vs investment contract.
2. Apply the 2026 SEC/CFTC interpretation and local analogues to any future offer — without assuming “utility token” is safe.
3. MiCA issuer/CASP analysis if any EU user can receive a transferable token.
4. VASP / Travel Rule trigger if any withdrawal to an unhosted wallet.
5. Whether current Terms language remains accurate after any token slot is shown in UI.
6. Advertising constraints: no profit, no peg, no listing promise.

---

## A17 — Blockers

- Company jurisdiction PENDING.
- LEGAL_CLASSIFICATION unresolved (mandatory counsel).
- CONVERSION_RATE / supply / price UNDECIDED.
- Production spend is not a full append-only debit ledger (design debt if conversion is ever enabled).
- No qualified custody, KYC, or license work has started (correct for this GO).

---

## A18 — End-state flags

| Flag | Value |
| --- | --- |
| DIGITAL_ASSET_ARCHITECTURE_READY | YES |
| LOCAL_TOKEN_SANDBOX_READY | YES |
| POINT_TO_TOKEN_ENGINE_READY | YES (disabled in product) |
| DOUBLE_SPEND_PROTECTION_READY | YES (lab) |
| WALLET_SANDBOX_READY | YES |
| ADMIN_SANDBOX_READY | YES |
| USER_SANDBOX_READY | YES |
| SECURITY_TESTS_READY | YES |
| TEST_AUTOMATION_READY | YES |
| CONVERSION_ENABLED | FALSE |
| MAINNET_DEPLOYED | NO |
| PRODUCTION_CONNECTED | NO |
| PRODUCTION_POINTS_TOUCHED | NO |
| MOBILE_TOUCHED | NO |
| DEPLOYED | NO |
