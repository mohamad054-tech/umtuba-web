# Central review — UM Life + Communications + Rich Profile integration

```text
TASK_ID = CENTRAL_UMTUBA_SOCIAL_COMM_PROFILE_INTEGRATION_REVIEW_V1
STATUS = SOURCE_PASS_MIGRATION_HOLD
TODAY = 2026-08-31
AUTHORITATIVE_BASE_REF = origin/alpha-0.2
AUTHORITATIVE_BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
PC2_CANDIDATE_SHA = 814226776ced7325b174665f773906e163efcb2d
CENTRAL_REBASED_CANDIDATE_SHA = SAME / 81422677
LOCAL_REVIEW_FIX_SHA = 75b3896c6a3852258f4e303c4cb54c17d1da5836
DISCOVERY_NOT_FOUND_ACCEPTED = YES
DISCOVERY_NOT_FOUND_SHA = b67a7b33
SOURCE_REVIEW = PASS
BUILD = PASS
TYPECHECK = PASS
HOME = PASS
WATCH = PASS
UM_LIFE = PASS
MESSAGES = PASS
RICH_PROFILE = PASS
LEARNING = PASS
STORE = PASS
BRAND_REGRESSION = NO
SOCIAL_ARCHITECTURE_REGRESSION = NO
MIGRATION_20260915_DECISION = AMEND_FIRST
MIGRATION_20260916_DECISION = AMEND_FIRST
MIGRATION_GO_REQUIRED = YES
LOCAL_BOOTSTRAP_0F89D449_INCLUDED = NO
UNINTENDED_DIFF = NO
CONFLICTS_REMAINING = NO
READY_FOR_SOURCE_MERGE = NO
READY_FOR_MIGRATION_APPLICATION = NO
READY_FOR_PRODUCTION_DEPLOY = NO
PUSH = NO
MERGE = NO
PRODUCTION_TOUCHED = NO
PRODUCTION_DB_TOUCHED = NO
DEPLOYED = NO
HOSTED_SUPABASE_REQUESTS_OBSERVED = NO
NEXT_REQUIRED_GATE = CENTRAL_MIGRATION_VERSION_REALLOCATION_THEN_SOURCE_MERGE_GO
```

## 1. Fetch / identity

`git fetch --prune` on the primary checkout and the candidate worktree.

| Check | Result |
| --- | --- |
| Candidate worktree HEAD | `814226776ced7325b174665f773906e163efcb2d` at review start |
| Branch | `pc2/umtuba-social-comm-profile-central-integration-candidate-v1` (no upstream) |
| Parent | `b5fbeff29cb0f308481b38c06500c572cd44a9c4` |
| `origin/alpha-0.2` after fetch | `b5fbeff29cb0f308481b38c06500c572cd44a9c4` (`fix(welcome): remove Alpha 0.2 and Join Beta labels.`) |
| Rebase required | **NO** — base did not advance |
| UM Life worktree | Untouched `09155b158228df7b5523d2388a53a02481f98726` |
| `0f89d449` ancestor of candidate | **NO** (`merge-base --is-ancestor` exit 1) |

`CENTRAL_REBASED_CANDIDATE_SHA = SAME / 81422677`

Local review-only fix (not a rebase, not pushed): `75b3896c6a3852258f4e303c4cb54c17d1da5836`.

## 2. Source review

`git diff --stat b5fbeff2..81422677` = 63 files, +9719 / −158. Intended product only:

- Communications discovery / 1:1 / privacy / `/u/[username]` / `@handle` rewrite
- Rich Profile editor + contract + About wiring (no cover-upload port)
- UM Life first-class chrome landing on `/`; `/life` 307 alias
- i18n keys; two new migration files

No `.env`, no bootstrap precursor, no historical filename uniquification, no `0f89d449` posts precursor, no recovery junk in the commit.

`git diff --check` on `b5fbeff2..81422677` and on the local fix: exit 0.

### discoveryNotFound = ACCEPT `b67a7b33`

Authoritative. Do **not** integrate `d84dbda5`.

| Evidence | Location |
| --- | --- |
| Client-safe helper, no `"use server"` | `lib/comms/discoveryNotFound.ts` |
| Generic privacy copy | `No UMTUBA account is available to message with this lookup.` |
| Regression test: helper off the server-action module | `lib/content/communicationsDiscovery.v1.test.ts` (`discovery not-found copy`) |
| UI imports the helper, not a sync export from actions | `app/messages/components/StartConversationPanel.tsx` |
| Actions module has no `export function discoveryNotFoundMessage` | `app/actions/communications.ts` (`"use server"` only async actions) |

`d84dbda5` remains the XOR loser (inline `t("comms.notFound")`, removed shared helper).

### Product architecture

- `/life` is a 307 alias to `/` with query preserved — **not** a second feed. `LifeExperience` remains on disk unused (residual).
- Home and UM Life both highlight on `/` (shared destination, intended).
- Compose stays on Central Create. `HomeSocialComposer` (`4d4953d8`) not ported.
- Messages wrapped in `I18nProvider`. Start conversation present. No Part 2 (calls / groups / RTC) in the diff.
- Rich Profile existing chrome preserved; owner Save/Edit hidden cross-user (re-gated).
- Official stacked logo present on `/welcome`. No Join Beta / Alpha 0.2 badge on the rendered welcome HTML.

### Local review fix `75b3896c`

Review-blocking source defect: `APP_NAV_ITEMS` now has two entries with `href: "/"`. Welcome `LandingHero` keyed by `item.href` and labeled via `desktopNavLabelKey(item.href)`, so UM Life collapsed to a second "Home" on landing chrome.

Smallest local fix (not pushed):

- `app/components/landing/LandingHero.tsx` — same `label:href` key + `nav.umLife` labeling as `AppTopNav`
- Contract tests: `mobileNav.test.ts`, `shellCoherence.test.ts` (desktop labels only), `umLifeHomeEntry.test.ts`

Pre-existing Central residuals **not** amended:

- `shellCoherence` still asserts DiscoverShell must not contain `overflow-x-hidden bg-[#050510]` — DiscoverShell is unchanged vs `b5fbeff2`
- `joinCta.contract.test.ts` still expects `JoinBetaLink` after Central welcome cleanup removed it

## 3. Migrations — review only, not applied

Neither file exists on `origin/alpha-0.2`. Later Central files already exist: `20260928`, `20260930`, `20260932`, `20260933`, `20260934`. No later Central SQL creates `profile_places` / `profile_education` / `communication_phone_identities` / `discover_user_by_*`. **Not ALREADY_EQUIVALENT.**

Production DB was **not** queried.

### `20260915_rich_personal_profile_foundation_v1.sql` → **AMEND_FIRST**

Body is additive (IF NOT EXISTS, FORCE RLS, audience helper, no phone/email on `profiles`). `set_row_updated_at()` already exists on Central.

It **must not be applied as version `20260915`:**

1. In-repo remote history map `docs/ai/COMPUTER_2_CENTRAL_SERVER_HANDOFF_V1.md` records remote `schema_migrations` **20260915** = `store_partial_refund_provider_money_execution_v1` (Store/Commerce). That Store file is **not** on `origin/alpha-0.2` (`8c6a53e7` is not an ancestor), so this is a repo/remote version-namespace conflict.
2. Inserting `20260915` after Central already carries `20260928+` is the documented “insert before last migration” hazard (`docs/operations/MIGRATION_BASELINE_CUTOVER_PLAN_V1.md`).
3. Workflow: never reuse a version; never silent-renumber a committed file on shared history.

**Before any production application:** allocate a **new unique version after verified remote tip** (likely `20260935+` — confirm read-only remote history in a later GO). Keep the SQL body. Do not apply this filename as-is.

Minor residual in the body (not the amend reason): `profile_tags` drops `profile_tags_set_updated_at` and never recreates it.

### `20260916_communications_identity_discovery_v1.sql` → **AMEND_FIRST**

`ON CONFLICT (user_id)` is **valid**. All three tables use `user_id uuid PRIMARY KEY`:

- `communication_phone_identities`
- `communication_privacy_settings`
- `communication_contact_sync_state`

The `0f89d449` rewrite to `ON CONFLICT ON CONSTRAINT …_pkey` is a local-bootstrap-only change. **Do not replay it.** If a fresh apply ever needs the named-constraint form, that must be a **new additive migration**, not a history rewrite.

Amend reason is **version placement**, not ON CONFLICT:

- Version `20260916` sits before already-present Central `20260928+`
- Historical Learning bookmark reallocations used `20260915`/`20260916` on branches that are **not** ancestors of `origin/alpha-0.2` (`da676abd` not ancestor)
- Pepper must be set on the database before first production apply (`ALTER DATABASE … app.settings.comms_identity_pepper`) — do not commit the pepper

**MIGRATION_GO_REQUIRED = YES**

## 4. Gates (candidate worktree, local only)

Checkout-local gitignored `.env.local` against `127.0.0.1:54321`. Next.js already running on **3002** (`Environments: .env.local`). IDE browser could not attach a tab; Playwright + system Chrome + HTTP used as authorized fallback.

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (Next.js 16.2.11) |
| Targeted vitest (UM Life, comms discovery, rich profile, platform nav, welcome labels) | PASS |
| HTTP `/life` | **307** `Location: /` |
| HTTP `/welcome` | 200; no Join Beta; no Alpha 0.2 badge; official logo asset present |
| HTTP `/watch` `/learning` `/store` | 200 |
| HTTP `/messages` signed-out | **307** to login |
| Playwright local product gate | HOME / UM Life one-tap / WATCH / LEARNING / STORE / MESSAGES / COMM_DISCOVERY / COMM_1TO1 / COMM_SEND_READ / RICH_PROFILE / RICH_PROFILE_PRIVACY / COMM_AUTHZ **PASS** |
| Hosted interceptor | hosted=0, local=172 |

`LOCAL_RUNTIME_NOT_REPEATED` does **not** apply — local Supabase WSL stack was up and the product gate was re-run.

## 5. Safety

- Production untouched. Production DB untouched. Not deployed.
- Migrations not applied. No `db push` / `--linked`.
- No push of `origin/alpha-0.2`, main, shared, or the candidate branch.
- No force-push. No merge.
- `0f89d449` excluded. Secrets not printed.
- UM Life worktree not modified.

## 6. Residuals

1. Local fix `75b3896c` is on the candidate only — not pushed. Include it in any later source package.
2. `20260915` / `20260916` must be reallocated to unique versions after verified remote tip before merge or apply.
3. Phase 1 `LifeExperience` remains on disk under the alias.
4. Home + UM Life both highlight on `/`.
5. Cover upload / `profileCovers` and `HomeSocialComposer` not ported.
6. Full email/phone nobody + decoy-thread matrix not re-automated (username discovery + send/read were).
7. Pre-existing Central tests: DiscoverShell overflow assertion; `JoinBetaLink` contract vs welcome cleanup.
8. Unused i18n `landing.badge` still contains “Alpha 0.2” on Central; welcome does not render it.
9. Untracked gate script `scripts/_pc2_central_integration_candidate_gate.mjs` — do not commit keys; script itself has no secrets.
10. CLI may still be linked to hosted `tgucwnjwoyeqoxqaxmew`. Never `--linked` / `db push`.

## 7. Next required gate

`CENTRAL_MIGRATION_VERSION_REALLOCATION_THEN_SOURCE_MERGE_GO`

1. Read-only verify current remote `schema_migrations` (separate GO; not this task).
2. Add **new** unique versions for rich-profile + comms identity after that tip. Do not reuse `20260915` / `20260916`. Do not replay `0f89d449`.
3. Then a separate source-merge GO. Then a separate targeted migration GO. Then a separate deploy GO.
