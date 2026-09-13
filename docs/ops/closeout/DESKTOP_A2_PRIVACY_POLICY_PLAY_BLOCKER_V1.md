# DESKTOP_A2_PRIVACY_POLICY_PLAY_BLOCKER_V1

**DEVICE:** DESKTOP-A2  
**DATE:** 2026-08-16 (UTC window ~21:20–21:26)  
**WORKSPACE:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**BRANCH (local, not deploy source):** `office/profile-hero-completeness-v1` @ `380a36646d4de8a37c39a56ac3ccd449f6d8b20d` (dirty docs/closeout; not FF’d; not used)  
**PRODUCTION LINE:** `origin/alpha-0.2` @ `35d41fa848e21d9d30bae33de0bb741a5c8089ce`  
**PRODUCTION HOST RELEASE:** `/opt/umtuba/production/releases/35d41fa8-20260815215800`  
**LAPTOP:** RETIRED (not used)

No new privacy policy was written. Learning/Store were not redesigned. No Windows Desktop writes. `_port_extract` untouched. Secrets/.env not read or printed. No commit. No push. No deploy.

---

## Verdict

```
PRIVACY_SOURCE_FOUND = YES
PRIVACY_ROUTE_BEFORE = LIVE HTTP 200 https://umtuba.com/privacy (NOT 404)
FIX_REQUIRED = NO
FIX = NONE
SOURCE_SHA = 35d41fa848e21d9d30bae33de0bb741a5c8089ce
DEPLOYED = NO
PRODUCTION_SHA = 35d41fa848e21d9d30bae33de0bb741a5c8089ce
HTTPS_STATUS = 200
PUBLIC_ANONYMOUS_ACCESS = YES
PRIVACY_PAGE_RENDER = YES
APP_PRIVACY_LINK = https://umtuba.com/privacy (already correct; no app change)
GOOGLE_PLAY_PRIVACY_BLOCKER_CLEARED = YES_PUBLIC_URL_LIVE
BLOCKERS = Play Console operator re-check only (this session did not open Play Console). Public URL is not 404.
```

Prior session claim that `/privacy` was HTTP 200 is **re-verified NOW**. Production tip moved (`b3fd0d0` → `6266b30` → **`35d41fa`**). Host current matches that tip. The page is the existing UMTUBA Privacy Policy, not a soft-404.

---

## 1 — Anonymous production verify (this session)

All fetches unauthenticated. No cookies. No login.

| URL | Result |
| --- | --- |
| `https://umtuba.com/privacy` HEAD | **HTTP 200** `text/html` nginx + HSTS |
| `https://umtuba.com/privacy` GET `-L` | **HTTP 200** (no extra redirect) |
| `https://umtuba.com/privacy/` | 308 → `/privacy` → **200** |
| `https://www.umtuba.com/privacy` | **HTTP 200** (Cloudflare edge) |
| `http://umtuba.com/privacy` | 301 → `https://umtuba.com/privacy` → **200** |
| Googlebot UA | **200**; title `Privacy Policy \| UMTUBA`; H1 `Privacy Policy`; no “Page not found”; body ~50616 bytes |
| `Google-Play` UA | **HTTP 200** |
| Android Chrome UA | **HTTP 200** |
| `https://umtuba.com/en/privacy` | **404** (no locale-prefix routes; not the Play URL) |
| `https://umtuba.com/ar/privacy` | **404** (same) |
| `https://umtuba.com/legal` | **404** (no `/legal` index) |
| `https://umtuba.com/legal/privacy` | **404** (no `/legal/privacy` alias) |
| `https://umtuba.com/account-deletion` | **200** (known live) |
| `https://umtuba.com/terms` | **200** |
| `https://umtuba.com/robots.txt` | Allow `/`; `/privacy` not disallowed; sitemap listed |
| `https://umtuba.com/sitemap.xml` | contains `<loc>https://umtuba.com/privacy</loc>` |
| `https://umtuba.com/healthz` | **200** `umtuba-production-ok` |

### Body snippet (apex GET, SSR, no login)

- `<title>Privacy Policy | UMTUBA</title>`
- canonical `https://umtuba.com/privacy`
- `robots` / `googlebot` = `index, follow`
- `<h1>Privacy Policy</h1>`
- Effective date **19 July 2026**; Last updated **13 August 2026**
- Sections include Overview, Information you provide, Usage/device/log data, Approximate location, and remaining `PRIVACY_SECTIONS`
- No “Page not found” string
- No redirect to `/login` or a broken route

`/privacy` is **not** in `PROTECTED_PREFIXES`. Middleware does not require auth.

---

## 2 — Authoritative source (do not invent a new policy)

Existing production/source routing already serves the legal document at `/privacy`.

| Artifact | Role |
| --- | --- |
| `app/privacy/page.tsx` | App Router page; title “Privacy Policy”; `sections={PRIVACY_SECTIONS}` |
| `lib/legal/legalDocuments.ts` | Authoritative English body (`PRIVACY_SECTIONS`, `LEGAL_EFFECTIVE_DATE`, `LEGAL_LAST_UPDATED`) |
| `app/components/legal/LegalDocumentPage.tsx` | Shared legal renderer |
| `lib/site/routeMetadata.ts` | `privacyMetadata` path `/privacy` |
| `app/lib/nav/routes.ts` | `privacy: "/privacy"` |
| `lib/site/indexing.ts` | sitemap static route `/privacy` |
| `lib/site/legalPages.test.ts` | asserts `/privacy` exists, is public, is in sitemap |
| `next.config.ts` | no redirects/rewrites (empty config) |

Present on `origin/alpha-0.2` (`git ls-tree`). Last privacy-page commit on that line: `ef475cd43b25c70406c7d2b6af50a753f38faabb` (`fix(ux): close user-reported final blockers V2`). Introduced earlier by `5bd2106 feat(legal): add public terms and privacy pages`.

No `/legal/privacy` route exists. That 404 is expected and is **not** the Play URL.

---

## 3 — Why no source fix

The GO authorized a smallest-safe routing alias **only if** `/privacy` was missing/404. It is **not** missing. Implementing a new page, rewriting policy text, or adding `/legal` aliases would violate “do not invent a new privacy policy” and “smallest safe production fix only.”

`FIX_REQUIRED = NO`. `FIX = NONE`. No commit. No push.

---

## 4 — Mobile app privacy link

| Tree | SHA | Link |
| --- | --- | --- |
| `C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-A1-ANDROID-V6` | `f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604` | `src/lib/settings/supportLinks.ts` `privacy: "https://umtuba.com/privacy"` |
| `C:\Users\1\Desktop\umtuba\umtuba-mobile` | `3b335610ced48aa2595fe49eef5b97511c7f4cb5` | same `SUPPORT_LINKS.privacy` |

Settings “Privacy Policy” calls `openSupport("privacy")` → that URL. App already targets the working public URL. **No app source change. No new versionCode.**

---

## 5 — Git / deploy

- `git fetch --prune` this session: `origin/alpha-0.2` moved `6266b30..35d41fa`.
- Local workspace stayed on dirty `office/profile-hero-completeness-v1`. **Not merged. Not rebased. Not reset. Not FF’d** (wrong branch; dirty WIP preserved).
- Desktop is **not** the authorized production deploy operator for this GO. No improvised SSH restart/docker deploy.
- Read-only host check only (documented production SSH pattern):  
  `current` → `/opt/umtuba/production/releases/35d41fa8-20260815215800`  
  = `35d41fa848e21d9d30bae33de0bb741a5c8089ce` (matches `origin/alpha-0.2` tip).
- `DEPLOYED = NO` because nothing needed deploying. Privacy route is already on that SHA.

**CENTRAL_ACTION_REQUIRED = NO_FOR_SOURCE.** If Play Console still shows a stale “Page not found” card, Central/operator re-opens App content → Privacy policy → confirm `https://umtuba.com/privacy` → Save. Do not invent a Desktop deploy command.

---

## 6 — Play Console note (not fabricated)

This session **did not** open Google Play Console. The public URL that Play is documented to use is live HTTP 200 with a rendered Privacy Policy. If Closed Testing still shows “Page not found,” that is a **stale Console crawl / operator re-save**, not a missing production route.

Do **not** paste `/privacy` into the account-deletion field. Deletion URL remains `https://umtuba.com/account-deletion`.

---

## Files changed

| File | Change |
| --- | --- |
| `docs/ops/closeout/DESKTOP_A2_PRIVACY_POLICY_PLAY_BLOCKER_V1.md` | this packet only |

No product/runtime files. `PROJECT_STATE.md` / `CURRENT_TASK.md` / `CURSOR_REPORT.md` / `SESSION_HANDOFF.md` **not** overwritten.

---

## Security

- Public legal page only. No auth bypass. No secrets. No `.env`. No migration. No `_port_extract`.

## Tests / TypeScript / Build

- Not run (no source change).

## git diff --check

- N/A for product files. Closeout markdown only.

## Open issues

- Play Console card save / re-crawl is operator-only.
- Locale-prefix `/en/privacy` and `/legal/privacy` remain 404 by design; do not give those URLs to Play.
