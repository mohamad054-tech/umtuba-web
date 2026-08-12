# LAPTOP_POST_RELEASE_PLATFORM_QA_SWEEP_V1

**TASK_ID:** `LAPTOP_POST_RELEASE_PLATFORM_QA_SWEEP_V1`  
**TARGET_DEVICE:** LAPTOP  
**DEVICE_ROLE:** TEMPORARY_POST_RELEASE_QA_WORKER  
**MODE:** THREE_AGENT_PARALLEL (executed as single Laptop QA sweep; Learning/Collaboration locked)  
**Date:** 2026-08-13  
**Production target:** `https://umtuba.com`

## Critical locks respected

- LEARNING = CLOSED — no domain reopen / no product edits
- COLLABORATION = CLOSED — no domain reopen / no product edits
- DO NOT execute LB003 (PC2 owns)
- DO NOT touch migrations
- Central owns 20260921 Git parity
- No destructive tests / no privileged mutations

---

## A1 — PRODUCTION WEB UX QA

### Method

Safe black-box HTTP probes against production (HEAD/GET, no auth mutations, no privileged writes). Sampled public navigation hrefs from home HTML and probed status codes.

### Route evidence (selected)

| Path | Status | Notes |
|------|--------|-------|
| `/` | 200 | Home; viewport + manifest link present; ~49KB HTML |
| `/login` | 200 | Login entry OK |
| `/signup` | 200 | Signup entry OK |
| `/register` | 307 | Redirect (auth entry still reachable via `/signup`) |
| `/learning` | 200 | Public Learning surface OK |
| `/learning/courses` | 404 | Not a public route (or missing); not treated as P0 without product contract |
| `/store` | 200 | Public Commerce/store OK |
| `/store/products` | 200 | Store listing OK |
| `/marketplace` | 404 | Alias absent; commerce lives under `/store` |
| `/commerce` | 404 | Alias absent |
| `/saved` | 307 | Auth-gated redirect (expected for anonymous) |
| `/profile`, `/settings`, `/messages`, `/create/video` | 307 | Auth-gated redirects |
| `/live`, `/world`, `/welcome`, `/games`, `/search` | 200 | Public nav targets OK |
| `/feed`, `/explore`, `/jinn` | 404 | Not present as public URLs |
| Fake path `/this-path-should-404-umtuba-qa` | 404 | Expected 404 behavior |
| `/auth/callback` | 307 | Callback route responds (redirect; no localhost Location observed in probe) |

### Document headers (HTML documents)

- `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` on `/`, `/login`, `/learning`, `/store` — correct for dynamic/auth-sensitive HTML
- No `Content-Encoding` observed on HTML HEAD responses (compression not advertised on these probes)
- Home HTML: `viewport` present; `/manifest.webmanifest` linked; no service-worker string; Next static chunks referenced

### Verdicts

```
PRODUCTION_WEB_UX_QA = PASS
P0_FINDINGS = []
P1_FINDINGS = [
  "HTML responses do not advertise Content-Encoding (gzip/br) on probed document routes — verify CDN/edge compression in post-release perf pass",
  "/marketplace and /commerce return 404 while /store is the live commerce surface — consider redirects or nav copy alignment if any external links still use those paths"
]
POST_RELEASE_FINDINGS = [
  "/learning/courses returns 404 (public Learning hub at /learning is OK)",
  "/feed and /explore return 404 (not linked as primary home nav; leftover naming risk only)",
  "Anonymous probes of /saved /profile /settings /messages correctly 307 (auth gate) — full authenticated UX not covered in this black-box pass",
  "No obvious client-error strings in home HTML; no runtime console capture in this remote HEAD/GET sweep"
]
```

**A1 notes:** Mobile browser behavior inferred from viewport meta + responsive CSS chunks only (no device lab). No destructive tests performed.

---

## A2 — MEDIA / PERFORMANCE RELEASE TAIL

### Method

Production header probes for HTML + hashed static CSS; source-of-truth note from locked `app/manifest.ts` (read-only); no mass conversion; no Jinn corpus mutation.

### Evidence

- Hashed Next static CSS (`/_next/static/chunks/*.css`): `200`, `Cache-Control: public, max-age=31536000, immutable` — good long-cache for fingerprinted assets
- Static CSS HEAD did **not** show `Content-Encoding` in this probe environment (possible edge/proxy artifact or missing compression — classify post-release)
- Favicon `/favicon.ico`: `200`, `public, max-age=0, must-revalidate`
- Dedicated PWA PNGs (`/icons/icon-192.png`, `/icon-192.png`): **404** (documented in manifest as favicon-only)
- Document HTML: aggressively no-store (appropriate); not a media caching bug
- Jinn: public `/jinn` URL 404; no production Jinn media surface exercised; **Jinn media boundary not breached**; no corpus mutation

### Classification

| Class | Items |
|-------|--------|
| **P0** | none |
| **P1** | Confirm edge compression (br/gzip) for HTML and static assets in production CDN config |
| **POST_RELEASE** | Dedicated 192/512 PNG icons (manifest currently favicon-only by design); optional image audit for oversized creator uploads; deeper Lighthouse pass |
| **OPTIONAL** | Redirect aliases `/marketplace`→`/store`; expand `next/image` adoption where large hero assets appear |

```
MEDIA_RELEASE_TAIL_STATUS = PASS_WITH_POST_RELEASE_TAIL
PRODUCTION_BLOCKING_MEDIA = NO
POST_RELEASE_MEDIA_WORK = [
  "Verify CDN/edge Content-Encoding for HTML and /_next/static assets",
  "Add reviewed 192x192 and 512x512 PWA icons (do not fabricate brand assets)",
  "Optional Lighthouse / Core Web Vitals pass on / /learning /store",
  "Optional oversized user-media inventory (no mass conversion this wave)"
]
```

---

## A3 — PWA WEB TECHNICAL QA

### Method

Production manifest/icon/SW/auth-callback probes; read-only review of `app/manifest.ts` on Collab tip (icons policy documented). No Android project created.

### Evidence

| Check | Result |
|-------|--------|
| `/manifest.webmanifest` | **200** `application/manifest+json` |
| Manifest fields | name/short_name UMTUBA; `start_url=/`; `display=standalone`; theme/background `#050510` |
| Icons | Only `/favicon.ico` (`sizes: any`) — **200** |
| `/manifest.json` | 404 (Next uses `.webmanifest` — OK) |
| `/sw.js` | 404 |
| Service worker in home HTML | **absent** |
| Repo SW / workbox references | **none found** in main checkout TS/JS |
| Installability | Partial: manifest present; missing standard PNG icon sizes; no SW → limited install / offline story |
| Auth callback | `/auth/callback` → **307** (live route; did not duplicate PC2 callback changes) |
| Stale localhost | No localhost start_url / icon URLs in production manifest |
| Responsive | viewport meta present on home |

```
PWA_TECHNICAL_QA = PASS_WITH_GAPS
PWA_PRODUCTION_READY = YES
PWA_POST_RELEASE_SCOPE = [
  "Add reviewed 192/512 PNG icons and apple-touch-icon when brand assets approved",
  "Decide whether offline/service-worker is in scope (currently none — not a release blocker if install-lite is intentional)",
  "Track installability criteria in browsers that require maskable PNG icons",
  "Do not blindly mirror PC2 auth-callback edits; re-verify /auth/callback after any Central/PC2 auth change"
]
```

**PWA_PRODUCTION_READY = YES** means: production serves a valid manifest + start URL + favicon; app is usable as a web app. It does **not** mean full offline PWA parity.

---

## FINAL ROLLUP

```
NEW_CURRENT_RELEASE_BLOCKER_FOUND = NO
POST_RELEASE_FINDINGS = [
  "Edge/document compression not observed on HEAD probes (verify CDN)",
  "Commerce path aliases /marketplace /commerce 404 (canonical /store OK)",
  "PWA icons limited to favicon.ico; no service worker",
  "/learning/courses public 404 while /learning OK",
  "Authenticated deep UX and mobile device-lab not covered in this black-box wave"
]
CENTRAL_ACTION_REQUIRED = [
  "SYNC_GIT_FILE_20260921_learning_certification_persistence_v1_INTO_LEARNING_SOT (unchanged owner — not introduced by this QA)",
  "Optional: confirm production CDN compression + whether PWA offline is intentionally deferred"
]
LAPTOP_STATUS_AFTER_REPORT = READY_FOR_NEXT_POST_RELEASE_QA
```

### Domain lock confirmation

- Learning / Collaboration: **not modified**, **not reopened**
- LB003: **not executed**
- Migrations: **not touched**

### Agent matrix (logical)

| Agent | Result |
|-------|--------|
| A1 Production Web UX | **PASS** · P0 empty |
| A2 Media / Perf Tail | **PASS_WITH_POST_RELEASE_TAIL** · blocking media **NO** |
| A3 PWA Technical | **PASS_WITH_GAPS** · production ready **YES** (install-lite) |
