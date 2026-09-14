# PC2 Social Communications Rich Profile Source Promotion + Web Deploy V1

```text
TASK_ID = SOCIAL_COMMUNICATIONS_RICH_PROFILE_SOURCE_PROMOTION_WEB_DEPLOY_V1
STATUS = BLOCKED
DEVICE = PC2
DATE = 2026-09-02
AUTHORITATIVE_CANDIDATE = 3ccc164f02ccb8e54cb978bc3620d907038e64a4
PREVIOUS_ALPHA_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
FAST_FORWARD_VERIFIED = YES
UM_STREAK_INCLUDED = NO
ORIGIN_ALPHA_SHA_AFTER = b5fbeff29cb0f308481b38c06500c572cd44a9c4
DEPLOYED = NO
ORIGIN_ALPHA_PUSHED = NO
DATABASE_CHANGED_DURING_DEPLOY = NO
ROLLBACK_REQUIRED = NO
LIVE_URL = https://umtuba.com
BLOCKERS = NO_AUTHORIZED_ROLLBACK_CAPABLE_WEB_DEPLOY_MECHANISM_ON_PC2; PREVIOUS_LIVE_RELEASE_SHA_UNPROVEN
NEXT_RECOMMENDED_STEP = CENTRAL_PROVIDE_EXISTING_NGINX_NEXT_RELEASE_PATH_THEN_FF_ALPHA_AND_CUTOVER
```

Isolated worktree only: `C:\Users\Giga store\Desktop\umtuba\umtuba-web-social-comm-rich-profile-renumber-integrate-v1`  
Branch: `pc2/social-comm-rich-profile-renumber-integrate-v1`  
Main dirty checkout was **not** reset. UM Streak worktree was **not** touched. No force push. No `db push`. No apply of `20260934` or `20260937`. No Play / App Store. `.env` values were not printed.

---

## What passed

| Gate | Result |
| --- | --- |
| `git fetch --prune` | Done |
| `origin/alpha-0.2` still `b5fbeff29cb0f308481b38c06500c572cd44a9c4` | YES |
| `git merge-base --is-ancestor origin/alpha-0.2 3ccc164f` | YES (exit 0) |
| Final diff review | 5 commits, 70 files, `+10224 / -269` |
| UM Streak / `20260937` in candidate delta | NO |
| `20260937` file in candidate tree | ABSENT |
| `20260934` in candidate delta vs alpha | NO (already on alpha; not applied) |
| LIVE_DB_TIP | `20260936` |
| Row count | 112 |
| `20260934` live | ABSENT |
| `20260935` / `20260936` live | PRESENT_ONCE (`rich_personal_profile_foundation_v1` / `communications_identity_discovery_v1`) |
| Clean tree at exact SHA | YES — detached worktree `C:\Users\Giga store\Desktop\umtuba\umtuba-web-3ccc164f-clean-build` at `3ccc164f`, `git status` empty |
| Isolated worktree dirty | docs only; no product source dirt |
| `npx tsc --noEmit` | PASS |
| Relevant candidate tests | 86/87 in the targeted set. Comms / rich profile / UM Life nav / env / siteUrl PASS |
| Pre-existing alpha shell test | FAIL — `shellCoherence` Home/Watch language-control assertion. `DiscoverShell.tsx` unchanged vs alpha. Same assertion exists on `origin/alpha-0.2` |
| `npm run build` | PASS. Next.js 16.2.11. `Environments: .env.local` (existing Next method; key names only: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |

### Candidate commits (`origin/alpha-0.2..3ccc164f`)

1. `81422677` feat(web): integrate UM Life, communications, and rich profile onto central
2. `75b3896c` fix(web): keep UM Life distinct from Home on welcome nav
3. `9d59302e` feat(central): ship social comms and rich profile as 20260935/20260936
4. `4eb8e91a` Stop email discovery from failing on a repeated lookup because PL/pgSQL treated RETURNS TABLE user_id as the ON CONFLICT target
5. `3ccc164f` Stop hashing communications phones with a public fallback; read the named Vault pepper and fail closed if it is missing

`20260937` appears only as “not edited / absent” notes in docs. No UM Streak source or migration is in the delta.

---

## Why deploy stopped

`docs/DEVELOPMENT_WORKFLOW.md` defines git / migration / test / push rules only. It does not name a web host, SSH target, release directory, or Vercel project.

This repo still has:

- no `vercel.json`
- no deploy GitHub Action
- no deploy script
- no documented nginx release folder

Live `https://umtuba.com` answers `Server: nginx` (Next HTML). That matches the 2026-08-24 Store staged-deploy stop. Inventing a Vercel cutover, SSH, or a new env method would violate the GO.

`npx vercel --version` was a presence check only. The CLI was not preinstalled. `VERCEL_TOKEN` was not used. `gh` is not logged in. No production host files were overwritten.

Because the rollback-capable release path is not available on PC2, **alpha was not fast-forwarded** and **web was not cut over**.

---

## Previous live release

| Field | Value |
| --- | --- |
| Live origin | `https://umtuba.com` |
| Host | nginx + Next |
| Exact live SHA | **UNPROVEN** (Next 16 HTML has hashed chunks, no `buildId`) |
| Historical documented live SHA | `57de1988` — **stale**. Night Market and `/life` are already live |
| Current alpha tip (FF parent) | `b5fbeff29cb0f308481b38c06500c572cd44a9c4` |
| Rollback target if a later cutover happens | keep the current nginx live tree until smoke succeeds |

Current-live read-only fingerprint (no login, no fake users, no phone bind):

| URL | Status | Notes |
| --- | --- | --- |
| `/` | 200 | Title `UMTUBA — Ideas Without Borders`. Approved-video brand symbol present. No `__next_error__` |
| `/welcome` | 200 | Same brand. Night Market tokens present |
| `/watch` | 200 | Title `Watch \| UMTUBA` |
| `/life` | 200 | Title `UM Life — UMTUBA` (already live; this GO did not ship a new release) |
| `/messages` | 307 | `/login?next=%2Fmessages` |
| `/settings` | 307 | `/login?next=%2Fsettings` |
| `/learning` | 200 | Title `My Learning \| UMTUBA` |
| `/store` | 200 | Title `Store — UMTUBA`. Night Market tokens present |
| `/?hl=ar` | 200 | Title `UMTUBA — أفكار بلا حدود`. RTL |

Rich profile view/edit, username/email discovery, and phone fail-safe were **not** exercised: they need an authenticated session. No phones were bound. No hashes inserted. No users created.

---

## What was not done

- No `git push origin 3ccc164f:alpha-0.2`
- No `git merge --ff-only`
- No force / `--force-with-lease`
- No Vercel / nginx / SSH cutover
- No migration command
- No Play Store / App Store / TestFlight
- No production data writes
- No UM Streak merge

---

## Live DB re-read (SELECT only)

Command class: `npx supabase db query --linked --project-ref <hosted-umtuba-ref> --file docs/ai/pc2-source-promo-q-tip.sql`

```text
LIVE_TIP = 20260936
ROW_COUNT = 112
has_20260934 = 0
has_20260935 = 1
has_20260936 = 1
has_20260937 = 0
name_20260935 = rich_personal_profile_foundation_v1
name_20260936 = communications_identity_discovery_v1
```

---

## Tests detail

Targeted vitest (comms / profile / nav / public env):

- PASS: `communicationsDiscovery.v1`, `profileIdentity.v1`, `richPersonalProfile.v1`, `richProfileContract.v1`, `umLifeHomeEntry`, `mobileNav`, `mobileWorldAffordanceContract`, `supabasePublic`, `siteUrl`
- FAIL (pre-existing on alpha): `shellCoherence` “keeps the compact language control discoverable on Home and Watch” because `DiscoverShell` already contains `overflow-x-hidden bg-[#050510]`. Candidate did not change that file.

This pre-existing alpha failure was **not** used as the deploy blocker. The blocker is the missing authorized web-release mechanism.

---

## Security review

- Code deploy only was authorized. None ran.
- Hosted DB: SELECT `schema_migrations` only.
- No Vault decrypt. No `.env` values printed.
- No fake discovery data.
- Isolated dirty files are prior-GO docs plus this report’s SELECT helpers.

---

## Open issues

1. PC2 still has no authorized rollback-capable nginx/Next release path.
2. Exact current live SHA is unproven from HTML.
3. Pre-existing alpha `shellCoherence` Home/Watch assertion still fails.
4. Authenticated Rich Profile / discovery smoke needs a later session after cutover. Do not create fake phones or users to force it.
