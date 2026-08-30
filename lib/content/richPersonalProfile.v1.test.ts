import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAboutInternalNav } from "../../app/profile/lib/profileIdentity";
import { profileRowToView } from "../../app/profile/lib/mapProfile";
import type { ProfileView } from "../../app/profile/types";
import type { ProfileRow } from "../supabase/database.types";
import { EMPTY_RICH_PROFILE_BUNDLE } from "../supabase/richProfile";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260915_rich_personal_profile_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

const BASE_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  username: "maya",
  display_name: "Maya",
  full_name: "Maya",
  bio: "Short",
  bio_long: "A longer story about making films.",
  city: "Cairo",
  country: "Egypt",
  avatar_url: null,
  cover_url: "https://cdn.example/cover.jpg",
  website_url: "https://maya.example",
  avatar_initial: "M",
  created_at: "2026-01-15T12:00:00.000Z",
  updated_at: "2026-01-15T12:00:00.000Z",
} as ProfileRow;

describe("rich personal profile foundation v1", () => {
  it("adds only authorized profile schema and FORCE RLS", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);

    expect(sql).toMatch(/add column if not exists bio_long text/);
    expect(sql).toMatch(/add column if not exists cover_url text/);
    expect(sql).toMatch(/add column if not exists website_url text/);
    expect(sql).toMatch(/create table if not exists public\.profile_places/);
    expect(sql).toMatch(/create table if not exists public\.profile_education/);
    expect(sql).toMatch(/create table if not exists public\.profile_work/);
    expect(sql).toMatch(/create table if not exists public\.profile_tags/);
    expect(sql).toMatch(/create table if not exists public\.profile_milestones/);
    expect(sql).toMatch(/create table if not exists public\.profile_links/);

    for (const table of [
      "profile_places",
      "profile_education",
      "profile_work",
      "profile_tags",
      "profile_milestones",
      "profile_links",
    ]) {
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table} enable row level security`, "i")
      );
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table} force row level security`, "i")
      );
    }

    expect(sql).toMatch(/create or replace function public\.can_read_profile_audience/);
    expect(sql).toMatch(/security invoker/);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/p_visibility = 'public'/);
    expect(sql).toMatch(/p_visibility = 'followers'/);
    expect(sql).toMatch(/from public\.profile_follows/);
    expect(sql).not.toMatch(/p_visibility = 'connections'/);
    expect(sql).toMatch(/profile-covers/);
    expect(sql).toMatch(/storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/);

    expect(sql).not.toMatch(/alter table public\.post_comments/);
    expect(sql).not.toMatch(/post_reactions/);
    expect(sql).not.toMatch(
      /create table if not exists public\.user_interest_profiles/
    );
    expect(sql).not.toMatch(/create table if not exists public\.friends/);
    expect(sql).not.toMatch(/create table if not exists public\.blocks/);
    expect(sql).not.toMatch(/\bphone\b/);
    expect(sql).not.toMatch(/street_address|latitude|longitude|pronouns/);
  });

  it("maps real rich rows into About without dumping empty sections", () => {
    const view = profileRowToView(BASE_ROW, {
      rich: {
        ...EMPTY_RICH_PROFILE_BUNDLE,
        education: [
          {
            id: "e1",
            profile_id: BASE_ROW.id,
            institution: "Cairo Arts",
            education_type: "undergraduate",
            field_of_study: "Film",
            credential: "BA",
            location_label: "Cairo",
            start_year: 2014,
            end_year: 2018,
            is_current: false,
            description: null,
            external_url: null,
            sort_order: 0,
            visibility: "public",
            created_at: BASE_ROW.created_at,
            updated_at: BASE_ROW.updated_at,
          },
        ],
        work: [],
        tags: [
          {
            id: "t1",
            profile_id: BASE_ROW.id,
            kind: "skill",
            label: "Editing",
            sort_order: 0,
            visibility: "public",
            created_at: BASE_ROW.created_at,
          },
        ],
        milestones: [
          {
            id: "m1",
            profile_id: BASE_ROW.id,
            category: "achievement",
            title: "Opened a studio",
            description: null,
            occurred_on: null,
            occurred_year: 2022,
            location_label: null,
            external_url: null,
            sort_order: 0,
            visibility: "public",
            created_at: BASE_ROW.created_at,
            updated_at: BASE_ROW.updated_at,
          },
        ],
        links: [],
      },
    });

    expect(view.coverUrl).toBe("https://cdn.example/cover.jpg");
    expect(view.bioLong).toBe("A longer story about making films.");
    expect(view.about.website).toBe("https://maya.example");
    expect(view.about.education?.[0]?.title).toBe("Cairo Arts");
    expect(view.about.specialties).toEqual(["Editing"]);
    expect(view.about.achievements).toEqual(["Opened a studio"]);
    expect(getAboutInternalNav(view)).toEqual([
      "overview",
      "places",
      "education",
      "specialtiesInterests",
      "achievements",
      "links",
    ]);
  });

  it("hides empty education/work from visitors and keeps role tabs unchanged", () => {
    const empty: ProfileView = profileRowToView(BASE_ROW, {
      rich: EMPTY_RICH_PROFILE_BUNDLE,
    });
    empty.city = "";
    empty.country = "";
    empty.about.website = undefined;
    expect(getAboutInternalNav(empty)).toEqual(["overview"]);

    const tabs = read("app/profile/lib/profileTabs.ts");
    expect(tabs).toMatch(/"about"/);
    expect(tabs).toMatch(/PROFILE_TAB_ORDER/);
  });

  it("keeps post→profile links and settings editor on /settings", () => {
    const home = read("app/lib/social/homeSocialPost.ts");
    const settings = read("app/settings/SettingsExperience.tsx");
    const editor = read("app/settings/RichProfileEditor.tsx");
    const about = read("app/profile/components/ProfileAbout.tsx");
    const header = read("app/profile/components/ProfileHeader.tsx");

    expect(home).toMatch(/buildHomeSocialProfileHref|buildCreatorProfileHref|\/profile\//);
    expect(settings).toMatch(/RichProfileEditor/);
    expect(settings).toMatch(/uploadProfileCover/);
    expect(editor).toMatch(/createProfilePlace/);
    expect(editor).toMatch(/createProfileEducation/);
    expect(editor).toMatch(/createProfileWork/);
    expect(editor).toMatch(/createProfileTag/);
    expect(editor).toMatch(/createProfileMilestone/);
    expect(editor).toMatch(/createProfileLink/);
    expect(editor).toMatch(/settings\.visibility\.connectionsHint/);
    expect(about).toMatch(/profile\.about\.achievementsUmtuba/);
    expect(about).toMatch(/profile\.about\.achievementsShared/);
    expect(about).toMatch(/dir="auto"/);
    expect(header).toMatch(/coverUrl/);
    expect(header).not.toMatch(/\bverified\b/i);
  });

  it("does not start Part 1B-B social schema work", () => {
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/PART ?1B-?B/i);
    expect(sql).toMatch(/AUTHORIZED_MIGRATION_SCOPE = RICH_PROFILE_ONLY/);
  });
});
