# DESKTOP_ACCOUNT_DELETION_WEB_FLOW_IMPLEMENTATION_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** IMPLEMENT / TEST / PREPARE_FOR_CENTRAL_DEPLOY  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_ACCOUNT_DELETION_WEB_FLOW_IMPLEMENTATION_V1  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9` + **UNCOMMITTED** web deletion work  
**MOBILE:** not modified (`C:\Users\1\Desktop\umtuba\umtuba-mobile`)  
**COMMIT_SHA:** UNCOMMITTED (user did not ask to commit)  
**PRODUCTION_DEPLOY_PERFORMED:** NO  

Google Play Closed Testing is blocked by a missing public account-deletion URL. This packet implements the smallest safe **public web deletion-request** flow. It does **not** deploy production, mutate Play Console, rebuild Android, or delete real users.

---

## Verdict

| Field | Result |
|------|--------|
| ACCOUNT_DELETION_PAGE_IMPLEMENTED | **YES** |
| ACCOUNT_DELETION_ROUTE | `/account-deletion` |
| DELETION_REQUEST_ACTIONABLE | **YES** (authenticated submit queues a request) |
| DELETION_MODE | **QUEUED** (not immediate) |
| AUTHORIZATION_MODEL | Public page; **signed-in session required** to submit (`getServerUser` + RLS `auth.uid()`) |
| UNAUTHORIZED_DELETION_BLOCKED | **YES** |
| SERVICE_ROLE_EXPOSED | **NO** |
| TESTS | **PASS** (focused vitest 19/19 in `lib/accountDeletion`; legal/nav/metadata included in 103 passing) |
| TypeScript | **PASS** (`tsc --noEmit`; also during `next build`) |
| Build | **PASS** (`npm run build`; route listed as `ƒ /account-deletion`) |
| git diff --check | **PASS** |
| PRODUCTION_DEPLOY_PERFORMED | **NO** |
| ACCOUNT_DELETION_URL | `https://umtuba.com/account-deletion` |
| ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE | **PENDING_DEPLOY** |
| GOOGLE_PLAY_ACCOUNT_DELETION_REQUIREMENT_READY | **PENDING_DEPLOY** |
| ANDROID_CODE_CHANGED | **NO** |
| NEW_AAB_REQUIRED_FOR_WEB_DELETION | **NO** |
| MIGRATION_APPLIED_REMOTE | **NO** (file created locally only) |
| VERDICT | **IMPLEMENTED_UNCOMMITTED / PENDING_CENTRAL_MIGRATE_AND_DEPLOY** |

**Do not** paste `https://umtuba.com/privacy` into Play. Do **not** claim the public URL works until Central deploys this work and HTTP-verifies `/account-deletion`.

Do **not** hijack Central’s current auth-callback deploy of `2df90a29`. This deletion work is **additional** uncommitted web change and must be stacked **after** that SHA.

---

## Phase 1 — Existing account lifecycle (audit)

Authoritative search of `umtuba-web` (not Android):

| Area | Finding |
|------|---------|
| Auth | Supabase Auth (`getServerUser` / `auth.getUser()`). No `auth.admin.deleteUser` path in `lib/` or `app/`. |
| Profiles | `profiles` keyed by auth user id. |
| Watch / media | Posts + Storage owned by user; no existing account-wipe cleanup. |
| Messages | Messenger V1 documents `messages.sender_id SET NULL` **if** auth user is deleted — anonymize, keep content for recipients. No user-initiated delete-account API. |
| Reactions / likes / saves | Social tables keyed by `user_id`; no account-deletion RPC. |
| Learning | Linked to the same auth user; no erasure workflow. |
| Commerce | Orders / payments / settlements are financial records. Must not be destroyed by a self-serve wipe. |
| Legal | Privacy/Terms (19 July 2026) said deletion “where supported” / contact method. No dedicated page. Live `/account/delete` was 404 (Data Safety audit). |
| Admin / scheduled deletion | None found. |

**Design choice:** do **not** invent immediate `deleteUser`. Extend with a **queued request** table + authenticated web form. Immediate deletion would be unsafe (commerce retention, message recipient copies, missing storage cascade).

---

## Phase 2–4 — Implemented flow

### Public page

- Route: `/account-deletion` (App Router `app/account-deletion/page.tsx`)
- Indexed in sitemap; **not** behind `PROTECTED_PREFIXES` (Google can open it signed-out)
- Identifies UMTUBA / umtuba.com
- Explains how to request, identity requirement, consequences, data categories, retention, confirmation, success/failure
- Signed-out: “Sign in to request deletion” → `/login?next=/account-deletion`
- Signed-in: checkbox + type `DELETE` + submit
- Accurate copy: **queued, not immediate**

### Action

- `requestAccountDeletionAction` (`"use server"`)
- `getServerUser()` required
- Inserts into `account_deletion_requests` with the **user session client** (RLS)
- No service-role in browser or in the action
- Duplicate open requests return the existing row (idempotent)
- Unauthenticated submit does not insert

### Migration (local file only)

`supabase/migrations/20260872_account_deletion_requests_v1.sql`

- Table `public.account_deletion_requests`
- FORCE RLS; anon revoked; authenticated **select+insert only**
- BEFORE trigger forces `user_id = auth.uid()`, `status = 'pending'`
- Unique open request per user (`pending`/`processing`)
- **Not applied** to remote Supabase from Desktop

### Data handling (honest disclosure; fulfillment later)

When operators later process a queued request (out of this Desktop task):

**Deleted (intended):** auth credentials/account, profile, push/session tokens, likes/saves/follows, Watch UGC/media still controlled by UMTUBA, learning progress tied only to the account.

**Anonymized (intended):** DM sender identity (`sender_id` SET NULL contract); comments where architecture allows.

**Retained:** store/order/payment/tax records; security/abuse logs; recipient copies of messages; backup/cache rotation.

This task does **not** run that fulfillment and does **not** call `deleteUser`.

---

## Phase 5 — Tests

| Check | Result |
|------|--------|
| `npx`/local `tsc --noEmit` | PASS |
| `vitest` `lib/accountDeletion` | PASS (19 tests) |
| `lib/site/legalPages.test.ts` + `metadata.test.ts` + `app/lib/nav` | PASS (included in 103) |
| `npm run build` | PASS; `ƒ /account-deletion` present |
| Unauthorized insert | blocked in unit tests (`requiresAuth`, no `insertPending`) |
| Confirmation required | PASS |
| Service-role strings in flow modules | absent |

No destructive tests against production users.

---

## Phase 6 — Deploy (Desktop is not production authority)

| Item | Value |
|------|--------|
| Target URL | `https://umtuba.com/account-deletion` |
| Desktop deploy | **NOT PERFORMED** |
| Current host SHA (prior packet) | `e84475a…` until Central deploys |
| Central in-flight SHA | `2df90a29` (auth-callback) — **do not rewrite / hijack** |
| This work | UNCOMMITTED on `office/profile-hero-completeness-v1` @ `7ed9159` working tree |

**Central must:**

1. Commit/integrate this web change on the intended deploy branch (after `2df90a29`, not instead of it).
2. Apply `20260872_account_deletion_requests_v1` with targeted migration (never `supabase db push` of all).
3. Deploy production.
4. HTTP-verify `GET https://umtuba.com/account-deletion` returns the deletion page (not 404, not privacy).

Until then: `ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE = PENDING_DEPLOY`.

---

## Phase 7 — Privacy / Terms

| Field | Result |
|------|--------|
| PRIVACY_POLICY_UPDATE_REQUIRED | **YES** |
| PRIVACY_POLICY_UPDATED | **YES** (smallest accurate update in `lib/legal/legalDocuments.ts`) |
| LEGAL_LAST_UPDATED | 13 August 2026 |
| Terms | Suspension section now points at `/account-deletion` and states queued processing |

Does **not** claim immediate erasure.

---

## Phase 8 — Google Play handoff

| Field | Value |
|------|--------|
| ACCOUNT_DELETION_URL | `https://umtuba.com/account-deletion` |
| ACCOUNT_DELETION_URL_PUBLICLY_REACHABLE | **PENDING_DEPLOY** (not YES) |
| GOOGLE_PLAY_ACCOUNT_DELETION_REQUIREMENT_READY | **PENDING_DEPLOY** |
| Play Console mutated | **NO** |

After Central deploy + HTTP verify, operator may paste that URL into Data safety / account deletion. Still do **not** use `/privacy`.

---

## Phase 9 — Android

| Field | Value |
|------|--------|
| ANDROID_CODE_CHANGED | **NO** |
| NEW_AAB_REQUIRED_FOR_WEB_DELETION | **NO** |
| REMAINING_ANDROID_POLICY_WORK | IN_APP_ACCOUNT_DELETION, REPORT_CONTENT, REPORT_USER, BLOCK_USER, TERMS_ACCEPTANCE_BEFORE_PUBLISHING |

Preserve mobile uncommitted `eas.json` / `app.config.ts` / `release-artifacts/`.

---

## Security review

- Page is public; **action is not**.
- No unauthenticated endpoint that deletes another user.
- CSRF: Next.js server action + cookie session; origin-bound.
- Ownership: `getServerUser()` then insert `user_id` from session; DB trigger overwrites to `auth.uid()`.
- RLS FORCE; no authenticated UPDATE/DELETE on the queue table.
- No service-role key in client bundles or this action.
- No secrets printed.

---

## Files (this task)

**Added**

- `app/account-deletion/page.tsx`
- `app/account-deletion/AccountDeletionExperience.tsx`
- `app/actions/accountDeletion.ts`
- `lib/accountDeletion/requestAccountDeletion.ts`
- `lib/accountDeletion/accountDeletionStore.ts`
- `lib/accountDeletion/disclosure.ts`
- `lib/accountDeletion/requestAccountDeletion.test.ts`
- `lib/accountDeletion/accountDeletionFoundation.test.ts`
- `supabase/migrations/20260872_account_deletion_requests_v1.sql`
- `docs/ops/closeout/DESKTOP_ACCOUNT_DELETION_WEB_FLOW_IMPLEMENTATION_V1.md`

**Modified**

- `app/lib/nav/routes.ts`
- `app/components/legal/LegalDocumentPage.tsx`
- `app/settings/SettingsExperience.tsx`
- `app/welcome/page.tsx`
- `lib/legal/legalDocuments.ts`
- `lib/site/indexing.ts`
- `lib/site/routeMetadata.ts`
- `lib/site/legalPages.test.ts`
- `lib/site/metadata.test.ts`
- `vitest.config.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/CURSOR_REPORT.md`

Android product tree: unchanged.
