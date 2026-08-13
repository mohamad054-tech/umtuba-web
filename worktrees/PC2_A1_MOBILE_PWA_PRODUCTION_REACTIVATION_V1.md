# PC2-A1 — MOBILE_PWA_PRODUCTION_REACTIVATION_V1

```
WAVE_ID = MOBILE_FULL_REACTIVATION_PRODUCTION_CLOSEOUT_V1
TASK_ID = MOBILE_PWA_PRODUCTION_REACTIVATION_V1
AGENT_ID = PC2-A1
SOURCE_DEVICE = PC2
TIMESTAMP_LOCAL = 2026-08-12 ~15:06–15:12 +03:00
FEATURE_EXPANSION = FORBIDDEN (honored — no product/PWA implementation)
COMMIT_CREATED = NO
PUSHED = NO
PRODUCT_CODE_CHANGED = NO
MIGRATIONS = NONE
```

## Machine-readable finals

```
MOBILE_PWA_CLOSEOUT_PERCENT = 48
PWA_PRODUCTION_READY = NO
SERVER_DEPENDENT_BLOCKERS_CLEARED = PARTIAL
AUTHORIZE_PWA = NO (NOT_CONFIRMED; no AUTHORIZE_PWA=YES packet on PC2)
NATIVE_REQUIREMENT = NO
GOOGLE_PLAY_REQUIRED_FOR_LAUNCH = NO
ALPHA_TIP_SHA = e84475a769c731bb7e1ad511b3543ee714d2feea
PROD_ORIGIN = https://umtuba.com
PROD_MANIFEST = https://umtuba.com/manifest.webmanifest (200, application/manifest+json)
PROD_SW = ABSENT (404 /sw.js, /service-worker.js)
PROD_AUTH_CALLBACK = ROUTE_ALIVE_BUT_ORIGIN_BROKEN (307 → https://localhost:3001/login?…)
VERDICT = SERVER_HOSTING_CLEARED_FOR_MOBILE_SURFACE; FULL_PWA_NOT_PRODUCTION_READY; AUTH_CALLBACK_ORIGIN_OPERATOR_REQUIRED
```

---

## 1. Scope / sync

| Item | Evidence |
| --- | --- |
| Workspace | `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1` |
| CURRENT_TASK.md | Translation Studio V1 PRODUCTION_ACCEPTED — Mobile/PWA **outside** Translation allowed scope; this task is wave QA/closeout only (no feature expansion) |
| PROJECT_STATE.md | Active AI-core private deployment elsewhere — no Mobile reopen authorization |
| `git fetch --prune` | OK on workspace + PWA inspection worktree |
| Workspace HEAD | `1c5ae0b` `office/platform-translation-trunk-port-v1` (synced with origin) |
| Authoritative product tip | `origin/alpha-0.2` = `e84475a769c731bb7e1ad511b3543ee714d2feea` |
| Inspection worktree | `...\worktrees\PC2-A1-PWA-AUTHORIZED-IMPLEMENTATION-BRANCH-READY-V1` @ `e84475a` |
| Test worktree (deps present) | `...\worktrees\PC2-A3-WHOLE-PROJECT-READINESS-REFRESH-V11` @ `e84475a` |

**Desktop\umtuba search:** Only `umtuba-web-translation-sot`, `umtuba-web-translation-trunk-port-v1`, and `worktrees/`. **No separate native Mobile / Capacitor / Expo / React Native / Android repo** on Desktop.

---

## 2. Authoritative Mobile/PWA source inventory

| Concern | Authoritative location | State |
| --- | --- | --- |
| Product source | `umtuba-web` monorepo / `origin/alpha-0.2` | Tip `e84475a` |
| PWA manifest source | `app/manifest.ts` | Partial (favicon-only icons; `display: standalone`; `start_url: /`) |
| Prod manifest | `/manifest.webmanifest` via Next MetadataRoute | Live on prod |
| Service worker | — | **ABSENT** tip + prod |
| Icons | `app/favicon.ico` only (25931 B tip) | No 192/512/maskable/apple-touch |
| Installability | HTTPS + link rel=manifest yes; SW + dedicated icons no | **Not Chromium-installable** as honest PWA |
| Offline / caching / update lifecycle | No workbox/serwist/next-pwa | **Not implemented** |
| Responsive critical path | `app/lib/nav/mobileNav.ts`, `AppMobileBottomNav.tsx`, World affordance contracts | **On alpha**; tests pass |
| Mobile affordance branch | `origin/office/platform-navigation-mobile-world-affordance-decision-v1` @ `f72c35e` | **Merged into alpha** (`merge-base --is-ancestor` exit 0) |
| Dedicated PWA impl branch | — | **Not created** (prior hard gate) |
| Push notifications | — | **Out of scoped evidence / NOT_RELEASE_REQUIRED** |
| Native / Play Store | No product native package | **NOT_RELEASE_REQUIRED** for web launch; Play = future if scoped |
| Prod URL / brand | `lib/site/brand.ts` `productionOrigin: https://umtuba.com` | Matches live origin |
| Auth callback path | `app/auth/callback/route.ts` → `/auth/callback` | Route live; **origin broken on prod** (below) |
| Unpushed Mobile/PWA branches | None material; only remote mobile-affordance already in alpha | — |

### Prior reports consumed (not inventing features)

1. `worktrees/PWA_AUTHORIZED_IMPLEMENTATION_BRANCH_READY_V1_REPORT.md` — `AUTHORIZE_PWA=NO`, branch not opened  
2. `worktrees/UMTUBA_AI_GAMES_MOBILE_INDEPENDENT_ARCHITECTURE_REVIEW_V1_REPORT.md` — `MOBILE_REVIEW=RESPONSIVE_WEB_FIRST`; native NO  
3. `worktrees/PC2_A2_RELEASE_TAIL_CLASSIFICATION_V1.md` — PWA OPTIONAL_POST_RELEASE / FROZEN until AUTHORIZE_PWA; `EXTERNAL_PRODUCTION_SERVER_BLOCKER=CLEARED`  
4. Whole-project readiness V12/V13 — Mobile FUTURE_SCOPE / not launch P0 without AUTHORIZE_PWA  

Fresh PC2 search: **zero** packets with literal `AUTHORIZE_PWA = YES` / `AUTHORIZE_PWA=YES` as an authorization grant (only mentions of the *required* token).

---

## 3. Safe production-facing verification (non-destructive)

| Check | Result |
| --- | --- |
| TCP 443 `umtuba.com` | **OK** |
| `GET https://umtuba.com/` | **200** `text/html`; nginx; HSTS `max-age=31536000; includeSubDomains` |
| HTML `<link rel="manifest">` | **Present** → `/manifest.webmanifest` |
| `GET /manifest.webmanifest` | **200** `application/manifest+json` body matches tip shape: name/short_name UMTUBA, `display=standalone`, icons=`/favicon.ico` `sizes=any` |
| `GET /manifest.json` | **404** (expected; Next uses `.webmanifest`) |
| `GET /favicon.ico` | **200** |
| `GET /sw.js`, `/service-worker.js` | **404** |
| apple-touch-icon in HTML | **0** matches |
| serviceWorker refs in HTML | **0** matches |
| `GET /login` | **200** |
| `GET /auth/callback` (no code) | **307** `Location: https://localhost:3001/login?error=This+sign-in+link+is+invalid+or+has+expired.+Please+try+again.` |
| Lighthouse CLI | Available via npx (`13.4.1`); **not run against prod** (heavy; installability already falsified by missing SW + icon sizes) |
| `npm run build` | **Not run** (FEATURE_EXPANSION forbidden; deps absent on PWA inspection wt; no authorized PWA code change) |
| Mobile unit tests @ `e84475a` | **13/13 passed** (`mobileNav` + `mobileWorldAffordanceContract`) on V11 worktree |

### Prod auth callback finding (critical)

`app/auth/callback/route.ts` builds redirects from `new URL(request.url).origin`. Live nginx→Next returns **`https://localhost:3001`** as that origin on bare `/auth/callback`. Home/metadata still advertise `umtuba.com`, so this is a **runtime/proxy/trust-host / SITE_URL forwarding** production defect — not a “server missing” pause.

Impact on Mobile/PWA: magic-link / password-reset / OAuth return URLs that hit prod `/auth/callback` can bounce users to localhost — breaks mobile deep-link/auth completion even for responsive web.

---

## 4. Historical Mobile/PWA blocker classification

| Blocker (historical framing) | Classification | Notes |
| --- | --- | --- |
| No external production host / WAITING_SERVER / PAUSED_EXTERNAL_SERVER for Mobile URL | **STALE** → hosting now **CLEARED_BY_EXTERNAL_SERVER** | `EXTERNAL_PRODUCTION_SERVER=AVAILABLE`; `umtuba.com` live HTTPS+nginx |
| HTTPS required for PWA installability | **CLEARED_BY_EXTERNAL_SERVER** | TLS + HSTS observed |
| Manifest must be served at prod URL | **CLEARED_BY_EXTERNAL_SERVER** | `/manifest.webmanifest` 200 |
| API/runtime reachability for responsive web shell | **CLEARED_BY_EXTERNAL_SERVER** (shell) | Home/login 200; deeper API matrix out of this task |
| Auth callback path must exist on prod domain | **CLEARED_BY_EXTERNAL_SERVER** (route) + **STILL_BLOCKED** (origin) | Route 307; Location host wrong → **OPERATOR_REQUIRED** |
| Service worker / offline / update lifecycle | **STILL_BLOCKED** (impl) / **NOT_RELEASE_REQUIRED** (launch contract until AUTHORIZE_PWA) | Absent tip+prod; frozen pending Central GO |
| Dedicated 192/512/maskable/apple-touch icons | **OPERATOR_REQUIRED** (approved assets) | Do not fabricate; favicon-only |
| `AUTHORIZE_PWA=YES` + SW design GO | **OPERATOR_REQUIRED** (Central) | Still missing on PC2 |
| PWA implementation branch | **STILL_BLOCKED** by authorization | Prior report: BRANCH_CREATED=NO |
| Native iOS/Android rewrite | **NOT_RELEASE_REQUIRED** | Architecture: NATIVE_REQUIREMENT=NO |
| Google Play listing / store packaging | **GOOGLE_PLAY_REQUIRED** (only if/when native/store scoped) | Not launch-required for web-first Mobile |
| Push notifications | **NOT_RELEASE_REQUIRED** | Not evidenced in approved Mobile scope |
| Elevating Games/PWA to whole-project launch P0 without GO | **STALE** | Release-tail: OPTIONAL_POST_RELEASE / FROZEN |

### SERVER_DEPENDENT_BLOCKERS_CLEARED = PARTIAL

**Cleared:** hosting, public HTTPS URL, HSTS, live partial webmanifest, favicon, login/HTML shell.  
**Not cleared:** production auth callback **origin** (`localhost:3001`).  
**Never primarily server-gated:** AUTHORIZE_PWA, icon approval, SW/offline stack.

---

## 5. Closeout scoring rubric → 48%

| Slice | Weight | Score | Rationale |
| --- | --- | --- | --- |
| External HTTPS + prod origin live | 15 | 15 | Cleared |
| Manifest fetchable + linked | 10 | 10 | Cleared (partial content) |
| Responsive mobile nav on alpha + tests | 15 | 15 | 13/13 pass; affordance merged |
| Auth/deep-link callback healthy on prod | 15 | 0 | localhost:3001 Location |
| Honest install icons (192/512/maskable/apple) | 15 | 0 | Missing / OPERATOR |
| SW + offline + update lifecycle | 15 | 0 | Absent |
| Central AUTHORIZE_PWA + scoped impl | 15 | 0 | NOT_CONFIRMED |
| **Total** | **100** | **48** | |

`PWA_PRODUCTION_READY=YES` is **not** permitted by evidence (missing SW, incomplete icons, no AUTHORIZE_PWA, broken auth callback origin).

---

## 6. REMAINING_MOBILE_BLOCKERS

1. **PROD_AUTH_CALLBACK_ORIGIN_MISCONFIG** — `OPERATOR_REQUIRED` / `STILL_BLOCKED`  
   - Evidence: `curl -sI https://umtuba.com/auth/callback` → `Location: https://localhost:3001/login?…`  
   - Owner: production operator (nginx/`Host`/`X-Forwarded-*` / Next trust proxy / env). Not a feature expansion.

2. **AUTHORIZE_PWA_NOT_CONFIRMED** — `OPERATOR_REQUIRED`  
   - No Central `AUTHORIZE_PWA=YES` on PC2 Desktop/OUTBOX.

3. **PWA_ICON_ASSETS_INCOMPLETE** — `OPERATOR_REQUIRED`  
   - Need approved 192/512/maskable (+ apple-touch if iOS A2HS scoped). Favicon-only insufficient for honest installability.

4. **SERVICE_WORKER_ABSENT** — `STILL_BLOCKED` until AUTHORIZE_PWA + design GO; `NOT_RELEASE_REQUIRED` for mandatory Initial Launch per release-tail classification.

5. **NATIVE / GOOGLE_PLAY** — `NOT_RELEASE_REQUIRED` / `GOOGLE_PLAY_REQUIRED` only under future store scope.

---

## 7. What became executable because Hetzner is up — executed safely

| Action | Done |
| --- | --- |
| Reclassify WAITING_SERVER Mobile hosting as stale/cleared | YES |
| Curl prod home / manifest / SW / auth / login | YES |
| Re-inspect tip manifest/SW/icons vs prod | YES |
| Confirm no separate Mobile repo | YES |
| Confirm mobile affordance branch merged | YES |
| Run mobile nav unit tests on alpha tip | YES (13/13) |
| Open PWA implementation / invent assets/SW | **NO** (FORBIDDEN / unauthorized) |
| Commit / push / prod mutate | **NO** |

---

## 8. Exact files changed (this task)

| Path | Action |
| --- | --- |
| `worktrees/PC2_A1_MOBILE_PWA_PRODUCTION_REACTIVATION_V1.md` | **Created** (this report) |
| `docs/ai/CURSOR_REPORT.md` | **Not updated** (dedicated A1 artifact; reconciler merges) |

---

## 9. Quality gates (this task)

| Gate | Result |
| --- | --- |
| Migrations | NONE |
| Security review | No secrets dumped; prod probe read-only. Auth origin defect reported, not exploited. |
| Tests | Mobile nav + World affordance: **13 passed / 2 files** @ `e84475a` |
| TypeScript | N/A (no TS product edits) |
| Build | Not required / not run |
| git diff --check | No report whitespace issues introduced beyond new markdown artifact |
| git status | Workspace dirty from parallel agents; this task adds only the A1 worktree markdown |

---

## 10. Open issues / next owner actions

1. **Operator:** Fix prod `/auth/callback` redirect origin so Location uses `https://umtuba.com` (not `localhost:3001`).  
2. **Central:** Publish `AUTHORIZE_PWA=YES` + icon/SW design GO if honest installable PWA is in scope.  
3. **Desktop (after GO only):** Implementation branch for icons ± bounded SW — still post-release/optional unless scope flips.  
4. **Do not** treat this report as authorization to invent PWA features or native clients.

```
MOBILE_PWA_CLOSEOUT_PERCENT = 48
PWA_PRODUCTION_READY = NO
SERVER_DEPENDENT_BLOCKERS_CLEARED = PARTIAL
REMAINING_MOBILE_BLOCKERS = PROD_AUTH_CALLBACK_ORIGIN_MISCONFIG; AUTHORIZE_PWA_NOT_CONFIRMED; PWA_ICON_ASSETS_INCOMPLETE; SERVICE_WORKER_ABSENT; NATIVE/PLAY=NOT_RELEASE_REQUIRED
```
