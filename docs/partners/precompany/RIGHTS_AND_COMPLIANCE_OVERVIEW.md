# Rights and compliance overview (internal)

Unknown rights DENY. That rule is the product, not a temporary QA flag.

## Store rights

CATALOG_DISPLAY_ALLOWED, IMAGE_USAGE_ALLOWED, PRICE_SYNC_ALLOWED, INVENTORY_SYNC_ALLOWED, CHECKOUT_ALLOWED, RESELL_ALLOWED.

Negative cases already tested: missing catalog, missing image, missing resell. DEMO items are SOURCE_TYPE=DEMO, RIGHTS_STATUS=DEMO_ONLY, PURCHASABLE=NO, REAL_PROVIDER=NONE.

## Learning rights

METADATA_DISPLAY_ALLOWED, CONTENT_HOSTING_ALLOWED, VIDEO_HOSTING_ALLOWED, ENROLLMENT_ALLOWED, PAYMENT_ALLOWED, AI_USAGE_ALLOWED (default FALSE), CERTIFICATE_INTEGRATION_ALLOWED.

Negative cases already tested: missing hosting, AI_USAGE_ALLOWED=false, missing certificate rights.

## Content rules

- No unauthorized third-party product or course data.
- No fabricated external instructors.
- UMTUBA certificates represent UMTUBA only.
- AI Tutor may prepare context for UMTUBA-owned originals with AI_TUTOR_ALLOWED. Ingest still requires publish.
- Partner lessons must not be pasted into owned-course tutor prompts (side-channel ingest).

## Credentials and secrets

Vault reference plus status only. Reject `sk-`, `pk_`, and `bearer ` shapes. Do not store secrets in git, tickets, or this pack.

## Company-registration placeholders

- Data-processing addendum: _[PLACEHOLDER]_
- IP indemnity: _[PLACEHOLDER]_
- Consumer law / distance-selling: _[PLACEHOLDER]_
- Tax collection: not implemented; classification UNCLASSIFIED
- Privacy policy URL: _[PLACEHOLDER — public legal pages not finalized]_

## Outreach

This pack is not an outbound message. Do not send it to a vendor as if UMTUBA were already contracted or registered.
