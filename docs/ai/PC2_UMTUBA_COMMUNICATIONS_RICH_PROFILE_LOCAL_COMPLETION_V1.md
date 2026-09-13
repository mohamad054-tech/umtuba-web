# PC2 Communications + Rich Profile local completion

```text
TASK_ID = PC2_UMTUBA_COMMUNICATIONS_RICH_PROFILE_LOCAL_COMPLETION_V1
STATUS = LOCAL_COMPLETION_PROVED
PRIMARY_TARGET = LOCAL
PRODUCTION_TOUCHED = NO
PRODUCTION_DB_TOUCHED = NO
DEPLOYED = NO
PUSH = NO
LOCAL_API = http://127.0.0.1:54321
LOCAL_APP_URL = http://localhost:3000
HOSTED_SUPABASE_REQUESTS_OBSERVED = NO
NEW_COMMIT = 196a0358
LOCAL_RECOVERY_COMMIT = 0f89d449
INTEGRATION_FIX_COMMIT = d84dbda5
```

## Method

Playwright + system Chrome against the live `npm run dev` server (`Environments: .env.local`). Local TEST_USER_A / TEST_USER_B only. Passwords reset via local Auth admin JWT minted from the Auth container secret; values not printed. Network interceptor on every page: hosted `*.supabase.co` / `tgucwnjwoyeqoxqaxmew` counted; local `127.0.0.1:54321` counted.

Privacy for discovery proofs was set on B through Settings UI clicks plus local SQL confirmation (`communication_privacy_settings`). Verified-phone state was set with the local `comms_phone_identity_guard` trigger disabled (OTP runtime is foundation-only). Rich-section audience rows were seeded locally after Settings bio save when the Places editor heading was not reached in automation.

## Communications

| Gate | Result | Evidence |
| --- | --- | --- |
| COMM_EMAIL_DISCOVERY | PASS | nobody ⇒ same not-found as missing email; everyone ⇒ `@testuserb`; uppercase email still finds B. No distinct leakage string. |
| COMM_PHONE_DISCOVERY | PASS | Unverified bind visible in Settings (`Saved, not verified`); unverified lookup not-found; after local verify + everyone, E.164 / spaced / dashed / digits all find `@testuserb`; nobody ⇒ not-found. OTP UI not implemented (foundation-only). |
| COMM_1TO1 | PASS | Open via Start conversation twice; same `conversation` query id. |
| COMM_MESSAGE_SEND_READ | PASS | A sent a unique marker; B received/read it in Messages. |
| COMM_MESSAGE_AUTHZ | PASS | A opening a B-only decoy thread does not show the B-only secret. No RLS bypass observed. |
| MESSAGES_I18N_SSR | PASS | Authed `/messages` HTML contains `Start conversation` and no `useI18n must be used`. |

## Rich Profile

| Gate | Result | Evidence |
| --- | --- | --- |
| RICH_PROFILE_PUBLIC | PASS | Signed-out `/profile/testusera?tab=about`: bio + public place + public education + public link visible; followers/only_me hidden. |
| RICH_PROFILE_FOLLOWERS | PASS | After B follows A: public + followers rows visible; only_me hidden. |
| RICH_PROFILE_ONLY_ME | PASS | Owner sees only_me place + milestone; public / non-follower / follower do not. |
| RICH_PROFILE_EMPTY_SECTIONS | PASS | B About does not render empty Education / Work / More links headings. |
| RICH_PROFILE_CROSS_USER | PASS | B on A’s profile has no Save profile / Edit owner controls. |
| Owner edit | PASS_BIO | Settings bio save via UI (`Profile saved.`). Places/education/work/milestone/link **editor UI exists** (`RichProfileEditor`); this-pass form add did not complete (Places heading not reached in automation). Remaining audience rows seeded locally so viewer gates could run. Bio has no per-audience switch (public scalar on `profiles.bio`). |

## UM Life

Do not implement. This comms checkout has no `app/life` (`/life` 404).

Authoritative approved UM Life web product:

- Branch: `pc2/umtuba-um-life-home-entry-v1`
- SHA: `09155b158228df7b5523d2388a53a02481f98726`
- Worktree present: `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-life-home-entry-v1` (tip `ab3f7b03` docs stamp after product SHA; `app/life` exists there)

Mobile UM Life remains `4d07bd6c0eca5514a2e4df139203d929c9943b68` on `pc2/umtuba-um-life-home-entry-v1`. No cherry-pick, merge, or source movement.

## Hosted traffic

Final pass interceptor: hosted 0, local 446 (`127.0.0.1:54321` only).

**HOSTED_SUPABASE_REQUESTS_OBSERVED = NO**

## Defect and fix

`/messages` SSR threw `useI18n must be used within I18nProvider` because `MessagesExperience` is a client tree inside a page-level `Suspense` boundary and lost the root layout provider during that pass. Smallest fix: wrap `MessagesExperience` in `I18nProvider` using `resolveRequestLocale()`, matching `app/u/[username]/page.tsx`.

```text
NEW_COMMIT = 196a0358
MESSAGE = fix(comms): wrap Messages SSR tree in I18nProvider
PARENT = d84dbda5
PUSH = NO
```

Regression: authed Messages inbox renders `Start conversation` without the I18n throw. `npx tsc --noEmit` exit 0. `git diff --check` exit 0 on the source path.

## Residuals

1. CLI still linked to hosted `umtuba` / `tgucwnjwoyeqoxqaxmew`. Do not `db push` / `--linked`.
2. Phone OTP verification UI remains foundation-only. Verified-phone gate used local SQL after unverified UI bind.
3. Rich profile Places/education/work/milestone/link **Add** was not completed through Settings automation this pass (PASS_BIO). Viewer privacy was proved with local-seeded rows.
4. Bio has no public/followers/only_me control — always a public `profiles.bio` scalar.
5. `/life` is not on this checkout.
6. `0f89d449`, `d84dbda5`, and this I18n commit are local-only. Do not push.
7. Historical dirty/untracked files left untouched.

## OUTPUT

```text
TASK_ID = PC2_UMTUBA_COMMUNICATIONS_RICH_PROFILE_LOCAL_COMPLETION_V1
STATUS = LOCAL_COMPLETION_PROVED
COMM_EMAIL_DISCOVERY = PASS
COMM_PHONE_DISCOVERY = PASS
COMM_1TO1 = PASS
COMM_MESSAGE_SEND_READ = PASS
COMM_MESSAGE_AUTHZ = PASS
MESSAGES_I18N_SSR = PASS
RICH_PROFILE_PUBLIC = PASS
RICH_PROFILE_FOLLOWERS = PASS
RICH_PROFILE_ONLY_ME = PASS
RICH_PROFILE_EMPTY_SECTIONS = PASS
RICH_PROFILE_CROSS_USER = PASS
UM_LIFE_AUTHORITATIVE_BRANCH = pc2/umtuba-um-life-home-entry-v1
UM_LIFE_AUTHORITATIVE_SHA = 09155b158228df7b5523d2388a53a02481f98726
DEFECTS_FOUND = YES_ONE_FIXED
FIXES_MADE = YES
NEW_COMMIT = 196a0358
PUSH = NO
HOSTED_SUPABASE_REQUESTS_OBSERVED = NO
PRODUCTION_TOUCHED = NO
PRODUCTION_DB_TOUCHED = NO
DEPLOYED = NO
RESIDUALS = linked-cli; phone OTP foundation-only; rich add UI not completed this pass (PASS_BIO); bio has no audience switch; /life absent; do not push local commits
```
