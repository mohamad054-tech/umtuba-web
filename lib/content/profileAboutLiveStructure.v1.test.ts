import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bucketProfileLiveSessions,
  getVisibleAboutSections,
  getVisibleLiveBuckets,
  LIVE_BUCKET_LABELS,
  LIVE_BUCKET_ORDER,
  ABOUT_SECTION_ORDER,
  resolveProfileLiveBucket,
} from "../../app/profile/lib/profileAboutLiveStructure";
import { PROFILE_TAB_ORDER } from "../../app/profile/lib/profileTabs";
import type { ProfileAbout, ProfileLivePreview } from "../../app/profile/types";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function session(
  partial: Partial<ProfileLivePreview> & Pick<ProfileLivePreview, "streamId" | "title">
): ProfileLivePreview {
  return {
    viewersLabel: "1K",
    city: "City",
    country: "World",
    previewGradient: "from-[#101828] to-[#081018]",
    ...partial,
  };
}

describe("About / Live Structure V1", () => {
  it("orders About sections Bio → Roles → Experience → Education → Specialties & interests → Achievements → Links → Joined", () => {
    expect([...ABOUT_SECTION_ORDER]).toEqual([
      "bio",
      "roles",
      "experience",
      "education",
      "specialtiesInterests",
      "achievements",
      "links",
      "joined",
    ]);
  });

  it("omits empty About sections and keeps Joined when labeled", () => {
    const about: ProfileAbout = {
      joinedLabel: "Joined March 2024",
      interests: [],
      website: "umtuba.world/demo",
      experience: [{ title: "Creator", detail: "3 years" }],
    };

    expect(
      getVisibleAboutSections({
        bio: "",
        location: "",
        about,
      })
    ).toEqual(["experience", "links", "joined"]);

    expect(
      getVisibleAboutSections({
        bio: "Hello",
        location: "Cairo, Egypt",
        about: {
          joinedLabel: "Joined 2024",
          interests: ["Travel"],
          specialties: ["Film"],
          education: [{ title: "Arts" }],
          achievements: ["Badge"],
          links: [{ label: "Site", href: "https://example.com" }],
        },
      })
    ).toEqual([
      "bio",
      "education",
      "specialtiesInterests",
      "achievements",
      "links",
      "joined",
    ]);
  });

  it("orders Live buckets Now → Upcoming → Past and skips empty headers", () => {
    expect([...LIVE_BUCKET_ORDER]).toEqual(["now", "upcoming", "past"]);
    expect(LIVE_BUCKET_LABELS).toEqual({
      now: "Live Now",
      upcoming: "Upcoming",
      past: "Past",
    });

    const buckets = bucketProfileLiveSessions(
      [
        session({ streamId: "a", title: "Now", bucket: "now", isLiveNow: true }),
        session({
          streamId: "b",
          title: "Later",
          bucket: "upcoming",
          isLiveNow: false,
          scheduledLabel: "Tomorrow",
        }),
        session({ streamId: "c", title: "Ended", bucket: "past", isLiveNow: false }),
      ],
      true
    );

    expect(getVisibleLiveBuckets(buckets)).toEqual(["now", "upcoming", "past"]);
    expect(
      getVisibleLiveBuckets(
        bucketProfileLiveSessions(
          [session({ streamId: "c", title: "Ended", bucket: "past" })],
          false
        )
      )
    ).toEqual(["past"]);
  });

  it("derives live bucket from explicit field, isLiveNow, then profile isLive", () => {
    expect(
      resolveProfileLiveBucket(
        session({ streamId: "1", title: "A", bucket: "upcoming" }),
        true
      )
    ).toBe("upcoming");
    expect(
      resolveProfileLiveBucket(
        session({ streamId: "2", title: "B", isLiveNow: true }),
        false
      )
    ).toBe("now");
    expect(
      resolveProfileLiveBucket(
        session({ streamId: "3", title: "C", isLiveNow: false }),
        true
      )
    ).toBe("past");
    expect(
      resolveProfileLiveBucket(session({ streamId: "4", title: "D" }), true)
    ).toBe("now");
    expect(
      resolveProfileLiveBucket(session({ streamId: "5", title: "E" }), false)
    ).toBe("past");
  });

  it("wires structured About + Live panels without new live backend queries", () => {
    const about = read("app/profile/components/ProfileAbout.tsx");
    const live = read("app/profile/components/ProfileLivePanel.tsx");
    const structure = read("app/profile/lib/profileAboutLiveStructure.ts");
    const content = read("lib/supabase/profileContent.ts");

    expect(about).toMatch(/t\("profile.roles"\)/);
    expect(about).toMatch(/t\("profile.experience"\)/);
    expect(about).toMatch(/t\("profile.education"\)/);
    expect(about).toMatch(/t\("profile.specialtiesInterests"\)/);
    expect(about).toMatch(/t\("profile.achievements"\)/);
    expect(about).toMatch(/t\("profile.links"\)/);
    expect(about).toMatch(/t\("profile.joined"\)/);
    expect(about).toMatch(/getVisibleAboutSections/);

    expect(live).toMatch(/Live Now/);
    expect(live).toMatch(/Upcoming/);
    expect(live).toMatch(/Past/);
    expect(live).toMatch(/bucketProfileLiveSessions/);
    expect(live).toMatch(/getVisibleLiveBuckets/);

    expect(structure).toMatch(/Creator Space Experience/);
    expect(content).toMatch(/bucket: "now"/);
    expect(content).toMatch(/\.eq\("status", "live"\)/);
    expect(content).not.toMatch(/status", "ended"/);
    expect(content).not.toMatch(/status", "scheduled"/);

    expect(
      existsSync(join(ROOT, "app/profile/lib/profileAboutLiveStructure.ts"))
    ).toBe(true);
  });

  it("does not touch Home feed, Watch player, or Creator Hub tab model", () => {
    const structure = read("app/profile/lib/profileAboutLiveStructure.ts");
    const about = read("app/profile/components/ProfileAbout.tsx");
    const live = read("app/profile/components/ProfileLivePanel.tsx");

    expect(structure).not.toMatch(/DiscoverExperience|HomeFeed|swipe/);
    expect(about).not.toMatch(/DiscoverExperience|HomeFeed/);
    expect(live).not.toMatch(/DiscoverExperience|HomeFeed|WatchPlayer/);
    expect([...PROFILE_TAB_ORDER]).toEqual([
      "all",
      "posts",
      "articles",
      "videos",
      "courses",
      "products",
      "photos",
      "live",
      "about",
    ]);
  });
});
