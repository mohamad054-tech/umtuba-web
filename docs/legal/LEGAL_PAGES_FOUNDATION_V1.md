# UMTUBA Legal Pages Foundation V1

## Architecture

Public, directly reachable legal documents rendered as App Router pages:

| Route | Module |
| --- | --- |
| `/terms` | `app/terms/page.tsx` |
| `/privacy` | `app/privacy/page.tsx` |

Shared presentation: `app/components/legal/LegalDocument.tsx`  
Shared link row: `app/components/legal/SiteLegalLinks.tsx`  
Content sources: `lib/legal/termsContent.ts`, `lib/legal/privacyContent.ts`, `lib/legal/constants.ts`

No i18n locale routing exists in the repo; pages ship in English with explicit `lang="en"` / `dir="ltr"` on the document shell. Arabic brand tagline remains elsewhere in marketing metadata only.

## Draft publishing status (current)

Both pages are **Draft for legal review** and still contain unresolved placeholders.

Until **Legal Approval** (counsel + owner):

| Control | Status |
| --- | --- |
| In-product / direct links | **Enabled** (signup, login, footer, advertise, seller, etc.) |
| `robots` metadata | **`noindex` + `nofollow`** via `buildPageMetadata({ index: "noindex" })` |
| Sitemap (`SITEMAP_STATIC_ROUTES`) | **Not listed** (`/terms`, `/privacy` excluded) |
| Indexable in search engines | **Not allowed** |

Do **not** switch these routes to `index: "index"` or add them to the sitemap until:

1. Final legal review is complete  
2. All placeholders are filled with real entity details  
3. Owner and counsel explicitly approve the text for production  

## Metadata & SEO (after approval only)

When approved later:

- Flip `termsMetadata` / `privacyMetadata` to `index: "index"`
- Add `/terms` and `/privacy` to `SITEMAP_STATIC_ROUTES`
- Update contract tests accordingly

Canonical paths already exist for correct absolute URLs when shared.

## Integration

Real links (no dead spans) appear in:

- Signup acceptance checkbox (`Terms of Service` + `Privacy Policy`)
- Login / signup / forgot-password auth footers
- Landing page footer
- Advertise landing
- Seller hub

## Placeholders (owner / counsel required)

| Placeholder | Purpose |
| --- | --- |
| `[LEGAL ENTITY NAME]` | Operating company / controller |
| `[REGISTERED ADDRESS]` | Registered office |
| `[LEGAL EMAIL]` | Legal / privacy contact inbox |
| `[GOVERNING LAW]` | Governing law / privacy jurisdiction framing |

Do not invent company names, addresses, emails, or jurisdictions in product copy.

## Legal review requirements

Both documents show a persistent banner:

> Draft for legal review. This document requires legal review before production release.

Counsel must review before treating these pages as production-ready Terms/Privacy. This foundation is not legal advice.

## Limitations

- English-only legal text (no locale routes yet)
- No cookie consent SDK / CMP wiring
- No in-product “download PDF” export
- Advertiser/seller onboarding does not yet require a separate legal acceptance checkbox beyond signup
- Draft liability/disclaimer language needs jurisdiction-specific counsel edits
- Search indexing intentionally disabled while Draft

## Future work

- Fill placeholders after entity formation
- Legal Approval → enable index + sitemap
- Localize AR/EN legal text when i18n lands
- Cookie preference center if analytics expand
- Versioned acceptance logging at signup
- Counsel-approved governing law and dispute venue clauses
