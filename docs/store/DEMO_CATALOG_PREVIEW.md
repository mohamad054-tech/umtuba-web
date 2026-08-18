# Store demo catalog preview (QA only)

Internal fixture catalog (26 DEMO_ONLY products). **Not** live inventory.
Never apply SQL `20260929`. Default **OFF** for ordinary production users.

## Safety

- `PURCHASABLE = NO`
- `CHECKOUT_REAL = NO`
- `REAL_PROVIDER = NONE`
- DEMO badge is always visible
- Fixtures load from `lib/store/demo/` — they are not public catalog rows

## How QA enables it

1. Set **`STORE_DEMO_PREVIEW=1`** on the process that serves the web app.
2. Then use one of:
   - Local / non-production: open `/store/demo-preview`
   - Production-like host: also set `STORE_DEMO_PREVIEW_TOKEN` and open  
     `/store/demo-preview?demo_token=<token>`
   - Or sign in as a **platform admin** (`platform_admins`) while the env flag is on

Without `STORE_DEMO_PREVIEW=1`, the preview page stays denied even for admins.

Do **not** set `NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG=1` for this preview.
That flag is a separate E2E sandbox merchandising switch and must stay off in production.
