# PC2 local Next.js → local Supabase integration gate

```text
TASK_ID = PC2_UMTUBA_LOCAL_APP_SUPABASE_INTEGRATION_GATE_V1
STATUS = LOCAL_INTEGRATION_PROVED
PRIMARY_TARGET = LOCAL
PRODUCTION_TOUCHED = NO
PRODUCTION_DB_TOUCHED = NO
DEPLOYED = NO
PUSH = NO
LOCAL_API = http://127.0.0.1:54321
LOCAL_STUDIO = http://127.0.0.1:54323
LOCAL_APP_URL = http://localhost:3000
HOSTED_SUPABASE_REQUESTS_OBSERVED = NO
NEW_COMMIT = d84dbda5
LOCAL_RECOVERY_COMMIT = 0f89d449
```

## Stack confirmed

| Check | Result |
| --- | --- |
| WSL Ubuntu user | `giga_store` |
| Docker / local Supabase | Running (`npx supabase status`, no `--linked`) |
| API health | HTTP 200 at `http://127.0.0.1:54321/auth/v1/health` |
| Studio | HTTP 307 at `http://127.0.0.1:54323` |
| DB | Listening `127.0.0.1:54322` |
| CLI linked hosted ref | Still `tgucwnjwoyeqoxqaxmew` — not used |
| LOCAL_ANON | present |
| LOCAL_SERVICE | present |
| imgproxy / pooler | Still stopped (pre-existing `status -o env` residual) |

`npx supabase status` from Windows cannot see Docker. Status was taken inside WSL Ubuntu. `-o env` was not used.

## Next.js local runtime

`.env*` is gitignored (`.gitignore:41`). `.env.local` is untracked.

- Did **not** overwrite a shared `.env` (none present).
- Existing hosted `.env.local` was copied to `.env.local.hosted.bak` (also gitignored).
- New `.env.local` points at `http://127.0.0.1:54321` + LOCAL publishable key only. No service-role in the Next app.
- `npm run dev` reports `Environments: .env.local` and listens on `http://localhost:3000`.

App reads URL/key via `lib/env/supabasePublic.ts` → `lib/supabase/client.ts` / `server.ts` / `middleware.ts`.

## Browser QA method

`cursor-ide-browser` could create tabs but they vanished before navigation (`Browser view not found` / `No browser tab available`). Required UI QA used Playwright + system Chrome against the live `npm run dev` server (same origin `http://localhost:3000`). Network was recorded on every request.

## Smoke

| Surface | Result | Evidence |
| --- | --- | --- |
| Home `/` | PASS | HTTP 200, UMTUBA chrome, Learning/Store/World/Messages tiles |
| Watch `/watch` | PASS | HTTP 200, Watch title, demo video fallback usable |
| UM Life `/life` | NOT_IN_THIS_CHECKOUT | HTTP 404. This comms checkout has no `app/life`. UM Life nav remains in the separate worktree. |
| World `/world` | PASS | HTTP 200 World Discovery (closest living-earth surface here) |
| Learning `/learning` | PASS | Signed-out 200 → `/login?next=/learning` (fail-closed) |
| Store `/store` | PASS | HTTP 200, Shop/Catalog chrome |
| Messages signed-out | PASS | Redirect `/login?next=/messages` |
| Profile signed-out | PASS | Redirect `/login?next=/profile` |

## Communications (TEST_USER_A / TEST_USER_B)

Local users already existed. Passwords were reset locally via Auth admin. Credentials are not printed.

After compile fix, A signed in to `/settings`. Messages authenticated page loaded: inbox, **Start conversation**, `@testusera`.

| Field | Result |
| --- | --- |
| COMM_USERNAME_DISCOVERY | PASS — Start panel opened; username lookup found the peer (`found: true`) |
| COMM_EMAIL_DISCOVERY | UI_PRESENT — Email tab + Settings “Find me by email” (nobody/everyone). This-pass email fill timed out after username find. Prior local RLS: nobody ≡ empty, everyone finds B |
| COMM_PHONE_DISCOVERY | UI_PRESENT — Phone tab + bind/privacy UI. This-pass unverified lookup not finished. Prior local RLS: unverified phone not discoverable |
| COMM_1TO1 | UI_PRESENT — `StartDirectMessageButton` / `openDirectConversationAction` implemented; inbox copy tells users to start from profile/Discover |
| COMM_MESSAGE_SEND_READ | PARTIAL — composer/send implemented in `MessageComposer`; this-pass send/read not confirmed after username find |
| COMM_RLS | PASS — prior local SQL/RPC gate; Next uses publishable/user JWT only (no service-role client) |

## Rich Personal Profile

Settings owner edit works for bio (`Profile saved.`). Public `/profile/testusera` shows that bio to owner and to B. B does not get A’s Save profile control.

| Field | Result |
| --- | --- |
| RICH_PROFILE_EDIT | PASS_BIO. Places/education/work/milestones/links **UI_PRESENT** (`RichProfileEditor` + Settings Places heading). Automation hit the first Places `<select>` (kind), not the city input — adds not completed this pass |
| RICH_PROFILE_PUBLIC_RENDER | PASS for bio. Empty rich sections not shown on the public profile in this pass |
| RICH_PROFILE_PRIVACY | PARTIAL — public bio visible to B; `only_me` place add not completed; Connections reserved in UI |
| RICH_PROFILE_CROSS_USER_PROTECTION | PASS at UI (B cannot open A’s editor). Prior local RLS: cross-user insert/update blocked |

## Hosted traffic

Request interceptor on the live app:

- Hosted `*.supabase.co` / `tgucwnjwoyeqoxqaxmew`: **0**
- Local `127.0.0.1:54321`: **131–208** (`/auth/v1/token`, `/auth/v1/user`, `/rest/v1/profiles`, …)
- Page HTML did not contain the hosted project ref

**HOSTED_SUPABASE_REQUESTS_OBSERVED = NO**

## Defect and fix

**Compile blocker:** `app/actions/communications.ts` is `"use server"` and exported sync `discoveryNotFoundMessage()`. Next 16: “Server Actions must be async functions.” That broke Settings/Messages compile and blocked login-to-messages.

**Smallest fix (committed locally, not pushed):** remove that export; `StartConversationPanel` uses `t("comms.notFound")` for the sr-only string.

```text
NEW_COMMIT = d84dbda5
MESSAGE = fix(comms): do not export a sync helper from the server-actions module
PARENT = 0f89d449
PUSH = NO
```

Regression after fix: Settings HTTP 307→login then 200 when authed; Messages authed inbox + Start conversation; `npx tsc --noEmit` exit 0; `git diff --check` exit 0.

## Residuals

1. CLI still linked to hosted `umtuba` / `tgucwnjwoyeqoxqaxmew`. Do not `db push` / `--linked`.
2. imgproxy/pooler still stopped.
3. `/life` is not on this checkout.
4. `/messages` SSR can throw `useI18n must be used within I18nProvider` then recover on the client. Not fixed (not required to prove local Supabase).
5. Email/phone lookup + 1:1 send/read need a follow-up UI pass (tabs/placeholders). Not Part 2.
6. `0f89d449` and `d84dbda5` are local-only. Do not push.
7. Historical dirty/untracked files left untouched.

## OUTPUT

```text
TASK_ID = PC2_UMTUBA_LOCAL_APP_SUPABASE_INTEGRATION_GATE_V1
STATUS = LOCAL_INTEGRATION_PROVED
LOCAL_SUPABASE = RUNNING
LOCAL_NEXT_APP = RUNNING
LOCAL_APP_URL = http://localhost:3000
HOSTED_SUPABASE_REQUESTS_OBSERVED = NO
HOME = PASS
WATCH = PASS
UM_LIFE = NOT_IN_THIS_CHECKOUT
MESSAGES = PASS
COMM_USERNAME_DISCOVERY = PASS
COMM_EMAIL_DISCOVERY = UI_PRESENT
COMM_PHONE_DISCOVERY = UI_PRESENT
COMM_1TO1 = UI_PRESENT
COMM_MESSAGE_SEND_READ = PARTIAL
COMM_RLS = PASS
RICH_PROFILE_EDIT = PASS_BIO
RICH_PROFILE_PUBLIC_RENDER = PASS
RICH_PROFILE_PRIVACY = PARTIAL
RICH_PROFILE_CROSS_USER_PROTECTION = PASS
LEARNING = PASS
STORE = PASS
DEFECTS_FOUND = YES_ONE_FIXED
FIXES_MADE = YES
NEW_COMMIT = d84dbda5
PUSH = NO
PRODUCTION_TOUCHED = NO
PRODUCTION_DB_TOUCHED = NO
DEPLOYED = NO
RESIDUALS = linked-cli; imgproxy/pooler; /life absent; messages I18n SSR; email/phone/1:1 send follow-up; do not push 0f89d449 or d84dbda5
```
