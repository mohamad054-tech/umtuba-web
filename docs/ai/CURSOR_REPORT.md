# CURSOR_REPORT

## Summary

PART 2A implemented no-migration personal-profile UX on a dedicated branch from the PART 1B-A candidate. The current `public.profiles` row only stores display name, username, short bio, city, country, and avatar. About extras (education, work, website, interests, achievements, links) exist only on mock profiles. That inventory drove the split: ship presentation for real fields now; design normalized tables for later authorization.

Public profile now leads with a person, not a creator dashboard: role chips only when the person already posts/teaches/sells; empty Courses/Products tabs hidden for everyone; a compact “Who they are” strip from city/country/join date; About as one surface with internal Overview/Places/… chips; settings grouped into Personal intro + Places with a public-data and no-address safety note. Home/post author avatar and name still route to `/profile/[username]` and now show display name.

No commit. No migrations. PART 1B-A remains at `8ab99fba` on `pc2/um-life-part1b-a-social-home-candidate`. PART 1B-B was not started.

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_RICH_PERSONAL_PROFILE_V1_PART2A
STATUS = IMPLEMENTED_UNCOMMITTED
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
FINAL_SHA = 8ab99fba6c02267c7efc576dd6ff79d131b52b5f
BRANCH = pc2/um-life-rich-personal-profile-v1-part2a
IMPLEMENTED = YES
DEPLOYED = NO
DATABASE_CHANGED = NO
MIGRATIONS_CREATED = NO
PART1B_B_STARTED = NO
PART1B_A_PRESERVED = YES
```

## Exact files changed

Uncommitted on `pc2/um-life-rich-personal-profile-v1-part2a` (HEAD still `8ab99fba`; 2A work is working-tree only):

New:

- `app/profile/lib/profileIdentity.ts`
- `app/profile/components/ProfileWhoSummary.tsx`
- `lib/content/profileIdentity.v1.test.ts`

Modified:

- `app/profile/ProfileExperience.tsx`
- `app/profile/components/ProfileAbout.tsx`
- `app/profile/components/ProfileActions.tsx`
- `app/profile/components/ProfileHeader.tsx`
- `app/profile/components/ProfileTabs.tsx`
- `app/profile/lib/mapProfile.ts`
- `app/profile/lib/profileTabs.ts`
- `app/profile/types.ts`
- `app/settings/SettingsExperience.tsx`
- `app/discover/components/DiscoverCreatorInfo.tsx`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/i18nFoundation.test.ts`
- `lib/i18n/appShellTranslation.test.ts`
- `lib/content/profileCreatorHubReadiness.v1.test.ts`
- `lib/content/profileHeroCompleteness.v1.test.ts`
- `lib/content/profileAboutLiveStructure.v1.test.ts`
- `lib/supabase/profileContent.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

Left untouched (unrelated worktree dirt, not 2A): `.env.example`, `vitest.config.ts`, PC2 docs/logs/sandbox/worktrees.

## Migrations created

None.

## Security review

- No secrets, `.env`, or service-role usage added or printed.
- No RLS, grants, or profile table changes.
- Existing model unchanged: `profiles` SELECT is public (`using (true)`); INSERT/UPDATE owner-only; no delete policy.
- Settings still writes only `display_name`, `username`, `bio`, `city`, `country`, `avatar_url` through existing `updateOwnProfile` / `uploadAvatar`.
- Safety copy added: city/country only; do not publish street address, phone, or private email.
- Metadata still omits email, UM Points, and treats location as optional public display (existing `generateMetadata` does not emit city/country).
- Pronouns not implemented (no existing field).
- Home/1B-A social files were not modified (profile work stays separable).

## Tests

`npx vitest run` targeted (pass):

- `lib/content/profileIdentity.v1.test.ts` (4)
- `lib/content/profileCreatorHubReadiness.v1.test.ts` (7)
- `lib/content/profileHeroCompleteness.v1.test.ts` (5)
- `lib/content/profileAboutLiveStructure.v1.test.ts` (6)
- `lib/content/profileCoursesProductsStructure.v1.test.ts` (3)
- `lib/content/profileMotionA11y.v1.test.ts` (3)
- `lib/content/profilePinnedContentStructure.v1.test.ts` (5)
- `lib/content/profileAllTimelineContract.v1.test.ts` (9)
- `lib/i18n/i18nFoundation.test.ts` (20)
- `lib/i18n/appShellTranslation.test.ts` (6)
- `lib/supabase/profileContent.test.ts` (10)
- `app/lib/nav/creatorProfileArticleDeeplink.test.ts` (6)
- `app/lib/product/rewardsProfileJourney.harden.test.ts` (7)

Owner-empty Courses/Products tabs are now hidden; `profileCreatorHubReadiness` was updated to match that product rule.

## TypeScript

`npx tsc --noEmit` exit 0.

## Build

Not run. Dev server already serving (`GET /` 200, `GET /profile/mohamad` 200). App UI entry points were not replaced.

## git diff --check

Exit 0.

## git status --short

PART 2A files are uncommitted on `pc2/um-life-rich-personal-profile-v1-part2a`. HEAD equals `8ab99fba`. PART 1B-A branch still points at the same SHA. Worktree remains dirty with unrelated prior-task files.

## Open issues

1. **Browser MCP** still cannot keep a tab (same failure as PART 1B-A). Public profile verified via curl HTML instead. Desktop/mobile screenshot pass and authenticated settings edit were not executed in a real browser.
2. **Schema still required** for education, work, extra places, milestones, skills/languages/hobbies, longer bio, cover, social links, and field-level privacy.
3. **`city`/`country` are fully public** today. Future visibility (FOLLOWERS / CONNECTIONS / ONLY ME) needs schema + RLS — designed only.
4. **Settings edit** not live-tested (signed-out `/settings` still redirects to login). No fake users created.
5. **Activity tier / Follow / Message / Share / Live** preserved. User-entered achievements still mock-only and labeled “Shared by them” so they are never implied UMTUBA-recognized.
6. PART 1B-B not started.

---

## Source-first inventory

`public.profiles` (20260712 + 20260713 only): `id`, `username`, `display_name`, `full_name`, `bio`, `city`, `country`, `avatar_url`, `avatar_initial`, `created_at`, `updated_at`. RLS: public SELECT; owner INSERT/UPDATE. No cover, website, social-links, education, work, places, milestones, skills, languages, or pronouns columns. No repeatable profile tables. `user_interest_profiles` is recommendation infra, not a personal About list.

`ProfileAbout` types (experience, education, specialties, interests, achievements, website, links) populate from **mocks only**. `profileRowToView` sets `joinedLabel` + empty `interests`.

Settings already edits the real columns. Post→profile already uses `buildCreatorProfileHref` / `buildHomeSocialProfileHref`.

---

# STRUCTURED PART 2A OUTPUT

```text
TASK_ID = PC2_UMTUBA_UM_LIFE_RICH_PERSONAL_PROFILE_V1_PART2A
STATUS = IMPLEMENTED_UNCOMMITTED
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
FINAL_SHA = 8ab99fba6c02267c7efc576dd6ff79d131b52b5f
BRANCH = pc2/um-life-rich-personal-profile-v1-part2a
CURRENT_PROFILE_SCHEMA = public.profiles (id PK→auth.users, username unique/ci, display_name, full_name, bio, city, country, avatar_url, avatar_initial, created_at, updated_at). RLS: SELECT public using(true); INSERT/UPDATE owner-only; no DELETE. Avatars bucket public-read, owner-folder write.
EXISTING_PERSONAL_FIELDS = display_name, username, full_name, bio (short), city, country, avatar_url, avatar_initial, created_at
MISSING_PERSONAL_FIELDS = longer bio, cover, languages, interests, skills, hobbies, pronouns (legal later), birthplace, hometown, previous cities, website, social links, education records, work records, milestones, user-entered achievements, field-level visibility
EXISTING_REPEATABLE_PROFILE_DATA = none in production schema. Mock-only arrays on ProfileAbout (experience, education, specialties, interests, achievements, links). Activity tier is platform-computed, not user-entered.
CURRENT_PROFILE_PRIVACY_MODEL = entire profiles row is publicly readable. Owner may update own row. No per-field visibility. No followers/connections audience. Metadata omits email and wallet; city/country are public when set.
RICH_PROFILE_INFORMATION_ARCHITECTURE = HERO (photo, name, username, optional role chips, clamped bio, compact location) → WHO THEY ARE strip (home city / country / on UM since) → STATS + Follow/Message/Share → TABS: All, Articles, Videos, Photos, Live (existing rules), Courses/Products only when count>0, About. About is one surface with internal Overview / Places / Education / Work / Skills / Achievements / Links. No new top-level tabs. No Posts tab.
PERSONAL_INTRO_PLAN = Now: name, username, avatar, short bio, city, country, join date, role chips from existing activity. Later: longer bio, languages, interests, skills, hobbies via profile_tags + optional profiles.bio_long. Pronouns design-only until legal review.
PLACES_PLAN = Now: labeled Home city + Country from profiles.city/country (not “Born in”). Later: profile_places rows (hometown, current_city, previous_city, optional birthplace) user-entered only. No auto-inference. No street address.
EDUCATION_PLAN = Now: mock-only list if present. Later: profile_education (institution, field, credential, years, current, location_label, sort). International, not one-country system.
WORK_PLAN = Now: mock-only experience list. Later: profile_work with work_kind employed|owner|freelance|creator|teacher|seller|student|independent so people without a formal employer can still share.
SKILLS_INTERESTS_PLAN = Now: mock specialties/interests chips only. Later: profile_tags kind=interest|skill|language|hobby. Do not reuse user_interest_profiles (recs).
ACHIEVEMENTS_PLAN = Now: activity tier labeled “UMTUBA recognized”; mock user list labeled “Shared by them”. Never imply user-entered is verified. Later: optional user achievements as a milestone kind or separate rows with source=user.
MILESTONES_PLAN = Name: Milestones (UMTUBA). Not Facebook Life Events. Later: profile_milestones with a small safe category allowlist (no medical, legal, financial, government-ID). Schema only this part.
SOCIAL_LINKS_PLAN = Preserve current mock website/links renderer. No second link system. Later: profile_links (label, https url, sort) plus optional profiles.website_url. One editor in Settings.
ONE_IDENTITY_ROLE_PLAN = Single profile. Chips: Creator if posts/videos/articles/live; Teacher if courses>0; Seller if products>0. Hide empty Teacher/Seller/Learning/Store tabs. Social identity remains the default for users with none of those.
PROFILE_EDITOR_PLAN = Same /settings profile section. Now: grouped Personal intro (avatar, name, username, bio) + Places (city, country) + public/safety copy. Later: Add/Edit/Remove/Reorder for repeatable tables in this same settings surface — not a duplicate editor.
POST_TO_PROFILE_DISCOVERY_PLAN = Avatar/name/username already Link to /profile/[username] (Home, Discover, comments, mentions). Discover overlay now shows display name + @username · city · country. Profile landing answers who/where/when via Who they are + About Overview. Progressive disclosure: hero bio clamp, About for depth.
PRIVACY_PLAN = Architecture: PUBLIC / FOLLOWERS / CONNECTIONS / ONLY ME per repeatable row and later per sensitive column. Today everything on profiles is PUBLIC. Do not collect address, live location, phone, private email, government ID, financial. Owner always sees own data.
NO_MIGRATION_UX_IMPLEMENTED = Yes: IA (About internal sections, no new tabs), hero bio clamp + dir=auto, Who they are strip, role chips from existing counts, hide empty courses/products, personal About overview/places, UMTUBA vs shared achievements labeling, settings grouping + safety/public copy, i18n EN/AR on touched surfaces, post→profile display-name discovery.
FILES_CHANGED = app/profile/lib/profileIdentity.ts; app/profile/components/ProfileWhoSummary.tsx; app/profile/ProfileExperience.tsx; app/profile/components/ProfileAbout.tsx; app/profile/components/ProfileActions.tsx; app/profile/components/ProfileHeader.tsx; app/profile/components/ProfileTabs.tsx; app/profile/lib/mapProfile.ts; app/profile/lib/profileTabs.ts; app/profile/types.ts; app/settings/SettingsExperience.tsx; app/discover/components/DiscoverCreatorInfo.tsx; lib/i18n/messages/{types,en,ar}.ts; lib/i18n/{i18nFoundation,appShellTranslation}.test.ts; lib/content/profileIdentity.v1.test.ts; lib/content/profileCreatorHubReadiness.v1.test.ts; lib/content/profileHeroCompleteness.v1.test.ts; lib/content/profileAboutLiveStructure.v1.test.ts; lib/supabase/profileContent.test.ts; docs/ai/CURRENT_TASK.md; docs/ai/CURSOR_REPORT.md
TESTS_RUN = npx vitest run (13 files / ~91 tests, pass); npx tsc --noEmit (exit 0); git diff --check (exit 0); curl GET / 200, /profile/mohamad 200, /profile/mohamad?tab=about 200, /profile/lina.creates 200, umtuba_locale=ar dir=rtl
DATABASE_CHANGES_REQUIRED = YES
PROPOSED_MINIMUM_SCHEMA_DELTA = Additive only. Keep public.profiles. Optional columns: bio_long text, cover_url text, website_url text (https check). New normalized tables owned by profile_id: profile_places (kind hometown|current_city|previous_city|birthplace, label, country, sort_order, visibility); profile_education (institution, field, credential, start_year, end_year, is_current, location_label, sort_order, visibility); profile_work (title, organization, work_kind employed|owner|freelance|creator|teacher|seller|student|independent, years, is_current, location_label, summary, sort_order, visibility); profile_milestones (title, occurred_on, category allowlist, summary, sort_order, visibility); profile_tags (kind interest|skill|language|hobby, label, sort_order, visibility); profile_links (label, url, sort_order, visibility). visibility text check in (public, followers, connections, only_me) default public. Do not invent duplicate tables. Do not reuse user_interest_profiles. No pronouns column until legal review. No address/phone/email/id/financial columns.
PROPOSED_RLS_REQUIREMENTS = FORCE RLS on every new table. SELECT: owner always; public rows when visibility=public; followers/connections policies only after those graphs are product-authorized. INSERT/UPDATE/DELETE: authenticated and auth.uid()=profile_id. Grants: authenticated + anon SELECT as needed for public visibility; no client service_role. search_path locked on any SECURITY DEFINER helper. Storage for cover follows avatars pattern (owner folder, public read).
MIGRATIONS_CREATED = NO
DATABASE_CHANGED = NO
DEPLOYED = NO
PART1B_A_PRESERVED = YES
PART1B_B_STARTED = NO
READY_FOR_RICH_PROFILE_SCHEMA_AUTHORIZATION = YES
READY_FOR_OWNER_PROFILE_VISUAL_REVIEW = YES
```
