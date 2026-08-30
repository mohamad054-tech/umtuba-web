# CURSOR_REPORT

## Summary

Part 1B identity + discovery + privacy + conversation entry is implemented on an isolated comms branch cut from web HEAD `455fdca8` (which already includes Part 1B-A social home and Part 2A/2B rich profile). Existing messenger is reused: every discovery path returns a public identity, then `StartDirectMessageButton` / `get_or_create_direct_conversation`. No second messenger. No calls. No phone/email on `public.profiles`. Email default privacy is Nobody. Phone default is Nobody because verified contact-sync matching is not available. Phone bind is unverified foundation only — SMS/OTP was not selected and `phone_verified_at` is never set. Contact sync is foundation (permission/revoke, no address-book upload). Mobile remains blocked: `umtuba-mobile` @ `77e9e287` is ahead 1 / behind 1 vs `origin/master`; that tree was not merged, rebased, or patched as authoritative.

```text
TASK_ID = PC2_UMTUBA_COMMUNICATIONS_V1_PART1B_IDENTITY_DISCOVERY
STATUS = IMPLEMENTED
WEB_BASE_SHA = 455fdca8805b39cc5716861583109a4ab6600dbe
WEB_CANDIDATE_SHA = 1abfb94d83688aca190dc54fbda707d2b0b9ba92
BRANCH = pc2/umtuba-communications-v1-part1b-identity-discovery
DEPLOYED = NO
DATABASE_CHANGED = NO
MIGRATION_APPLIED_LOCALLY = NO
PRODUCTION_DATABASE_CHANGED = NO
```

## Exact files changed

New:

- `supabase/migrations/20260916_communications_identity_discovery_v1.sql`
- `lib/comms/contactLink.ts`
- `lib/comms/emailIdentity.ts`
- `lib/comms/phoneIdentity.ts`
- `lib/comms/privacyContract.ts`
- `lib/comms/qrSvg.ts`
- `lib/supabase/communicationsDiscovery.ts`
- `lib/content/communicationsDiscovery.v1.test.ts`
- `app/actions/communications.ts`
- `app/messages/components/StartConversationPanel.tsx`
- `app/messages/components/DiscoveredIdentityCard.tsx`
- `app/messages/components/PersonalQrCard.tsx`
- `app/settings/CommunicationsPrivacyPanel.tsx`
- `app/u/[username]/page.tsx`
- `docs/ai/PC2_UMTUBA_RICH_PERSONAL_PROFILE_V1_PART2B_REPORT.md` (2B report archived)

Modified:

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `lib/supabase/database.types.ts`
- `lib/supabase/middleware.ts` (`/@username` → `/u/username`)
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/i18nFoundation.test.ts`
- `lib/i18n/appShellTranslation.test.ts`
- `app/lib/nav/routes.ts`
- `app/lib/nav/index.ts`
- `app/messages/page.tsx`
- `app/messages/MessagesExperience.tsx`
- `app/messages/components/ConversationList.tsx`
- `app/settings/SettingsExperience.tsx`

Left untouched: rich profile migration `20260915_rich_personal_profile_foundation_v1.sql`, Store/Learning/Watch, `.env` / secrets, mobile divergent tree, production.

## Migrations created

`supabase/migrations/20260916_communications_identity_discovery_v1.sql`

AUTHORIZED_MIGRATION_SCOPE = COMMUNICATIONS_IDENTITY_DISCOVERY_ONLY.

- `communication_phone_identities` (E.164 unique, hash, country, nullable `phone_verified_at`)
- `communication_privacy_settings` (email nobody|everyone default nobody; phone nobody|contacts|everyone default nobody)
- `communication_contact_sync_state` (permission/revoke only)
- SECURITY DEFINER RPCs with locked `search_path`: discover by username/email/phone, get/set privacy, bind/unbind phone, contact-sync foundation
- Email lookup reads `auth.users` internally (confirmed only) and returns public identity only
- Phone lookup requires `phone_verified_at` and `find_by_phone = everyone`; contacts mode is stored but treated as nobody
- Block hook documented only (MUTE != BLOCK). `user_blocks` not created

Not applied: no local Docker/Supabase apply in this pass. Never applied to remote production.

## Security review

- FORCE RLS on all new tables. Owner-only policies (`user_id = auth.uid()`).
- Digest helper and public-identity helper revoked from anon/authenticated.
- Discovery RPCs authenticated-only, return username/display/avatar/user_id only.
- Same empty result for unknown email/phone and privacy-hidden (no enumeration leak).
- Phone uniqueness error is generic (`Phone unavailable`).
- No client service_role. No secrets committed. Pepper is optional `app.settings.comms_identity_pepper` (not an env secret); fallback is a documented domain separator, not a production pepper.
- No `auth.users` exposure to clients. No raw phone/email in discovery results, QR, or contact URLs.
- No raw address book stored.
- Cross-user writes blocked by RLS + DEFINER owner checks.

## Tests

`npx vitest run` targeted (pass):

- `lib/content/communicationsDiscovery.v1.test.ts` (8)
- `app/messages/messengerProduction.test.ts` (11)
- `lib/i18n/i18nFoundation.test.ts` (20)
- `lib/i18n/appShellTranslation.test.ts` (6)
- `lib/content/richProfileContract.v1.test.ts` (8)
- `lib/content/richPersonalProfile.v1.test.ts` (5)
- `lib/supabase/profileContent.test.ts` (10)
- `lib/env/supabasePublic.test.ts` (14)
- `app/lib/nav/platformNavContract.test.ts` (8)
- `app/lib/nav/homeReadinessGuardrails.test.ts` (5)
- `app/lib/nav/contentFlowPolicyContract.test.ts` (5)
- `app/lib/nav/deepLinkAliasContract.test.ts` (4)

Live discovery RPCs were not executed against a database (migration not applied).

## TypeScript

`npx tsc --noEmit` exit 0.

## Build

Not run. Existing `http://localhost:3000/` was reused and not killed.

## git diff --check

Exit 0 on comms paths.

## git status --short

Comms files staged/committed on `pc2/umtuba-communications-v1-part1b-identity-discovery`. Unrelated prior dirt (`.env.example`, `vitest.config.ts`, PC2 logs/sandbox/worktrees) left uncommitted.

## Open issues

1. **Migration not applied** locally or remotely. Discovery RPCs will  PGRST202-fallback until an authorized local/dev apply.
2. **PHONE_VERIFICATION_RUNTIME = FOUNDATION_ONLY.** No SMS/OTP vendor. Bound numbers stay unverified and cannot be found.
3. **CONTACT_SYNC = FOUNDATION_ONLY.** Permission/revoke only. No hash matcher. `find_by_phone=contacts` is stored but effective nobody.
4. **Android/iOS blocked** on authoritative source reconciliation. Isolated worktree from `origin/master` (`09e94f8`) is possible; the inspected `77e9e287` tree was not patched.
5. **Block product not implemented.** Hook documented for a later `user_blocks` fail-closed gate.
6. **Prepared settings** (who can message/call, read receipts, last seen) are stored/labeled, not enforced.
7. Browser MCP could not keep a tab. Verification used curl: `/` 200, `/watch` 200, `/messages` 307 login, `/settings` 307 login, `/u/mohamad` 200, `/@mohamad` 200 rewrite. Signed-in start-conversation click was not live-executed.

---

# STRUCTURED PART 1B OUTPUT

```text
TASK_ID = PC2_UMTUBA_COMMUNICATIONS_V1_PART1B_IDENTITY_DISCOVERY
STATUS = IMPLEMENTED
WEB_BASE_SHA = 455fdca8805b39cc5716861583109a4ab6600dbe
MOBILE_AUTHORIZED_BASE_SHA = 09e94f80775855d7e2036fa7d83d63b9202fb8a4
BACKEND_CANDIDATE_SHA = 1abfb94d83688aca190dc54fbda707d2b0b9ba92
WEB_CANDIDATE_SHA = 1abfb94d83688aca190dc54fbda707d2b0b9ba92
MOBILE_CANDIDATE_SHA = NOT_CREATED
BRANCHES = web:pc2/umtuba-communications-v1-part1b-identity-discovery; profile2b:pc2/um-life-rich-personal-profile-v1-part2b@455fdca8; part1b-a:4d4953d8/8ab99fba; mobile-inspected:pc2/eas-preview-config-v1@77e9e287
EXISTING_MESSENGER_REUSED = YES
USERNAME_DISCOVERY = PASS
EMAIL_DISCOVERY = PASS
PHONE_IDENTITY = PASS
PHONE_VERIFICATION_RUNTIME = FOUNDATION_ONLY
PHONE_DISCOVERY = PARTIAL
PHONE_NUMBER_EXPOSED = NO
PRIVATE_EMAIL_EXPOSED = NO
CONTACT_LINK = PASS
QR_CONTACT = PASS
CONTACT_SYNC = FOUNDATION_ONLY
CONTACT_PERMISSION = NOT_APPLICABLE
DISCOVERY_PRIVACY = PASS
EMAIL_DEFAULT_PRIVACY = NOBODY
PHONE_DEFAULT_PRIVACY = NOBODY
PROFILE_MESSAGE_ENTRY = PASS
DIRECT_CONVERSATION_DEDUP = PASS
WEB = PASS
ANDROID = BLOCKED_AUTHORITATIVE_SOURCE_RECONCILIATION
IOS = BLOCKED_AUTHORITATIVE_SOURCE_RECONCILIATION
RTL = PASS
LTR = PASS
DATABASE_CHANGES_REQUIRED = YES
MIGRATION_FILES = supabase/migrations/20260916_communications_identity_discovery_v1.sql
RLS_SECURITY = PASS
CROSS_USER_WRITE_BLOCK = PASS
AUTH_USERS_EXPOSED = NO
RAW_CONTACT_BOOK_STORED = NO
TESTS_RUN = npx vitest run (12 files / ~104 tests, pass); npx tsc --noEmit (exit 0); git diff --check (exit 0); curl HOME/WATCH 200, /messages /settings 307 login, /u/mohamad and /@mohamad 200
REGRESSIONS_FOUND = none in targeted messenger/profile/home/watch/nav/i18n checks. Signed-in start-conversation not live-clicked. Discovery RPCs not live against a database.
RICH_PROFILE_WORK_PRESERVED = YES
PART1B_SOCIAL_WORK_PRESERVED = YES
VOICE_CALL_IMPLEMENTED = NO
VIDEO_CALL_IMPLEMENTED = NO
RTC_INFRA_CREATED = NO
PRODUCTION_DATABASE_CHANGED = NO
WEB_PRODUCTION_CHANGED = NO
PLAY_UPLOAD = NO
APP_STORE_UPLOAD = NO
READY_FOR_COMMUNICATIONS_PART2 = YES
READY_FOR_OWNER_COMMUNICATIONS_REVIEW = YES
```
