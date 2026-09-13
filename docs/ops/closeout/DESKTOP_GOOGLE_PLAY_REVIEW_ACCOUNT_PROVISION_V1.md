# DESKTOP_GOOGLE_PLAY_REVIEW_ACCOUNT_PROVISION_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_RELEASE_OPERATOR  
**PRIORITY:** RELEASE_CRITICAL  
**MODE:** INSPECT / PROVISION_IF_SAFE / VERIFY  
**DATE:** 2026-08-13  
**TASK_ID:** DESKTOP_GOOGLE_PLAY_REVIEW_ACCOUNT_PROVISION_V1  
**PACKAGE:** `com.umtuba.app`  
**VERSION_NAME:** `1.0.0`  
**VERSION_CODE:** `3`  
**TRACK (context):** CLOSED_TESTING_ALPHA  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` `master` @ `fe14a34`  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web` `office/profile-hero-completeness-v1` @ `7ed9159`  
**AUTH HOST:** `tgucwnjwoyeqoxqaxmew.supabase.co` (web `.env.local`, mobile `.env`, and linked CLI project-ref all match)

No Android rebuild. No versionCode 4. No AAB upload. No Google Play Console mutation. Live not enabled. No global auth-setting change. No git commit / push. Password is **not** in this file.

---

## Verdict

| Gate | Result |
|------|--------|
| AUTH_METHOD | **email_password** (`signInWithPassword`) |
| REVIEW_ACCOUNT_PREEXISTED | **NO** |
| REVIEW_ACCOUNT_CREATED | **YES** |
| REVIEW_ACCOUNT_EXISTS | **YES** |
| REVIEW_ACCOUNT_IDENTIFIER | `google-play-review@umtuba.com` |
| EMAIL_PASSWORD_LOGIN | **PASS** |
| EMAIL_VERIFICATION_GATE | **NOT_REQUIRED** (production `mailer_autoconfirm: true`; created user has `email_confirmed_at`) |
| MFA_GATE | **NOT_REQUIRED** (0 TOTP / phone factors; login returned a session with no MFA challenge) |
| CAPTCHA | **NOT_PRESENT** on Android login/signup; GoTrue settings had no captcha keys; external provider = `email` only |
| ACCOUNT_ACTIVE | **YES** (`role=authenticated`) |
| REVIEW_ACCOUNT_SCOPE | **normal authenticated user** (Watch / Discover / Create / Messages). No elevated role. |
| LIVE_REQUIRED | **NO** (Live INTENTIONALLY_UNAVAILABLE / OUT_OF_SCOPE) |
| GOOGLE_PLAY_LOGIN_DETAILS_READY | **YES** (non-secret form text below; password operator-local only) |
| REVIEW_PASSWORD_EXPOSED_IN_REPO | **NO** |
| SERVICE_ROLE_EXPOSED | **NO** |
| PRODUCT_CODE_CHANGED | **NO** |
| NEW_AAB_REQUIRED | **NO** |
| GOOGLE_PLAY_MUTATED | **NO** |
| VERDICT | **REVIEW_ACCOUNT_PROVISIONED_AND_VERIFIED** |

---

## 1 — Repository state (pre-edit)

Inspected before any docs writes. No product files touched.

### umtuba-web

- Branch: `office/profile-hero-completeness-v1` @ `7ed9159f62d6a82d1999b19ef9d1df9a63c09de9`
- Upstream: `origin/office/profile-hero-completeness-v1` — **in sync** after `git fetch --prune` (0 ahead / 0 behind)
- Dirty before this task: prior `docs/ai/*` + untracked `docs/ops/closeout/` and `worktrees/`
- No merge / rebase / reset / stash / force

### umtuba-mobile

- Branch: `master` @ `fe14a34e7d5d10f8fd6fe2f1845e3bd81ffe2f99` = `origin/master` after `git fetch --prune` (0 ahead / 0 behind)
- Uncommitted (prior runtime-config rebuild; **kept**): `eas.json`, `app.config.ts`, untracked `release-artifacts/`
- This task did **not** modify product/runtime files

---

## 2 — Phase 1 auth audit (versionCode 3)

Android login implementation (`umtuba-mobile`):

- Login screen: email + password only (`app/(auth)/login.tsx`).
- Sign-in API: `supabase.auth.signInWithPassword` in `src/lib/auth/AuthContext.tsx`.
- Signup is available in-app (`app/(auth)/signup.tsx`); if a session is not returned, the app tells the user to confirm email. That branch is the client-side guard; **production GoTrue currently auto-confirms**.
- Successful login redirects to `/(tabs)/watch`. Unauthenticated tabs redirect to login.
- Client password rule: minimum 6 characters (`src/contracts/validation.ts`). Local `config.toml` `minimum_password_length = 6`.
- No OAuth buttons, no OTP field, no MFA enrollment UI, no CAPTCHA widget on login/signup.
- Mobile client uses publishable/anon key only (`src/lib/env.ts` rejects service-role-looking keys).
- Profile row is loaded after session (`src/lib/auth/profile.ts`). DB trigger `handle_new_user` creates `public.profiles` from auth metadata.

Production GoTrue settings (read-only `GET /auth/v1/settings` on the same host):

| Setting | Value |
|---------|--------|
| host | `tgucwnjwoyeqoxqaxmew.supabase.co` |
| `disable_signup` | `false` |
| `mailer_autoconfirm` | `true` |
| `phone_autoconfirm` | `false` |
| external providers enabled | `email` only |
| captcha / MFA keys in settings payload | none |

Local `supabase/config.toml` (not mutated; not assumed to override hosted settings):

- `[auth.email] enable_confirmations = false` — consistent with production autoconfirm
- `[auth.captcha]` commented / disabled
- `[auth.mfa.totp]` / `[auth.mfa.phone]` `enroll_enabled = false`, `verify_enabled = false`
- SMS signup disabled

Special role: **not required**. Internal Testing CORE already evidenced Watch / Discover / Messages / Create for a normal authenticated Android user. Live is fail-closed for everyone (`isLiveLobbySourceConfigured()` returns `false`).

Existing dedicated review account search (`docs/ai`, `docs/ops/closeout`, Android closeouts, auth docs, `google-play-review` / `review@` / `play review`): **none found**. Username `playreview` was not present in `profiles` before create.

---

## 3 — Phase 2 requirements vs result

| Requirement | Result |
|-------------|--------|
| Dedicated store-review identity | YES — `google-play-review@umtuba.com` / username `playreview` |
| Not operator personal account | YES |
| Email/password | YES |
| Persistent / non-expiring | YES (standard Supabase user; no timebox configured in local auth config) |
| No MFA / OTP | YES (verified) |
| No personal information | YES (display name “UMTUBA Play Reviewer”) |
| Normal user permissions | YES (`authenticated`) |
| Compatible with versionCode 3 | YES (same host + same `signInWithPassword` path) |
| Live not enabled | YES |

---

## 4 — Phase 3 provision

Preferred admin path: `SUPABASE_SERVICE_ROLE_KEY` is **named** in web `.env.local` but the value is **empty**. Service-role admin `createUser` was therefore **not** used. The key was never printed.

Safe fallback used because production `mailer_autoconfirm` is **true** (no inbox / no email-verify gate):

- Public `auth.signUp` with the **mobile publishable key** against `tgucwnjwoyeqoxqaxmew.supabase.co` — the same production auth path Android versionCode 3 uses.
- Metadata: `full_name` / `display_name` / `username=playreview` so `handle_new_user` created the profile.
- Domain `umtuba.com` is the existing authorized UMTUBA site domain. No invented auth host.
- Project-wide confirm-email / MFA settings were **not** changed.

Created user id: `34d591fc-2e89-49c2-84b0-525a5694b039`  
Created at: `2026-08-13T12:33:08Z`

---

## 5 — Phase 4 verify

After signup, signed out, then `signInWithPassword` with the generated password (anon/publishable client, persistSession false).

| Check | Result |
|-------|--------|
| Session created | YES |
| `email_confirmed_at` | `2026-08-13T12:33:08.859307Z` |
| Profile row | YES — `playreview` / `UMTUBA Play Reviewer` |
| MFA factors | totp=0, phone=0, all=0 |
| MFA challenge on login | none |
| Production content created | NO (no posts, messages, or Live activity) |

EMAIL_PASSWORD_LOGIN = PASS  
EMAIL_VERIFICATION_GATE = NOT_REQUIRED  
MFA_GATE = NOT_REQUIRED  
ACCOUNT_ACTIVE = YES

---

## 6 — Google Play form values (non-secret)

Copy these into Play Console → App content → App access / Login details. **Do not paste the password from this document** (it is not here).

```
PLAY_LOGIN_INSTRUCTION_NAME = UMTUBA reviewer access
PLAY_LOGIN_USERNAME = google-play-review@umtuba.com
PLAY_LOGIN_PASSWORD = (operator-local only; see secret delivery)
PLAY_ADDITIONAL_INSTRUCTIONS =
1. Open UMTUBA.
2. Sign in with the supplied email and password.
3. No OTP, MFA, or CAPTCHA is required.
4. After login the app opens Watch. Discover, Create, and Messages are in the bottom tabs.
5. Live shows unavailable by design and is outside this release. No special role is required.
```

Character count of additional instructions is under 500. Statements are limited to audited/verified behavior.

---

## 7 — Secret delivery

| Field | Value |
|-------|--------|
| REVIEW_PASSWORD_FILE | `C:\Users\1\Desktop\umtuba\umtuba-mobile\.env.play-review.local` |
| gitignore | mobile `.gitignore` rule `.env.*` (confirmed `git check-ignore`; `git status --ignored` shows `!!`) |
| REVIEW_PASSWORD_EXPOSED_IN_REPO | **NO** |
| Written to docs/ai | **NO** |
| Written to this closeout | **NO** |

Operator: paste the password from that gitignored file (or the one-time chat SECRET block) into Google Play. Do not commit the file. Do not copy it into `.env` (Expo must not ingest it).

---

## 8 — Operator action

1. Open Play Console → `com.umtuba.app` → **App content** → **App access / Login details**.
2. Set restricted access = YES (already selected).
3. Instruction name / username / additional instructions: values in section 6.
4. Password: from the operator-local file above. Do not commit it.
5. Do not rebuild Android. Do not bump versionCode. Do not upload another AAB. Do not enable Live.

GOOGLE_PLAY_MUTATED by this task = **NO** (form fill is operator).

---

## Open issues (not this task)

- Closed Testing still needs ≥12 opted-in testers for 14 continuous days (operator Play setup; not this packet).
- Android production release remaining Console completeness remains operator confirmation (prior production-gate audit).
- Live remains INTENTIONALLY_UNAVAILABLE / OUT_OF_SCOPE.
- Web `.env.local` `SUPABASE_SERVICE_ROLE_KEY` is empty; future admin resets need the operator to supply that key locally (never commit).
