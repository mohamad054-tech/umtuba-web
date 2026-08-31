import { describe, expect, it } from "vitest";
import type { ProfileView } from "../../app/profile/types";
import {
  getAboutInternalNav,
  getProfilePlaces,
  hasPersonalIntroContent,
  resolveProfileIdentityRoles,
  stripJoinedPrefix,
} from "../../app/profile/lib/profileIdentity";

function baseProfile(partial: Partial<ProfileView> = {}): ProfileView {
  return {
    source: "supabase",
    id: "11111111-1111-4111-8111-111111111111",
    username: "maya",
    displayName: "Maya",
    bio: "",
    city: "",
    country: "",
    avatarInitial: "M",
    avatarUrl: null,
    avatarGradient: "from-blue-400 to-indigo-600",
    followersLabel: "0",
    followingLabel: "0",
    likesLabel: "0",
    viewsLabel: "0",
    videoTotalCount: 0,
    isLive: false,
    videos: [],
    posts: [],
    articles: [],
    liveSessions: [],
    about: { joinedLabel: "Joined March 2024", interests: [] },
    ...partial,
  };
}

describe("profile identity (no-migration)", () => {
  it("assigns roles only from existing public activity", () => {
    expect(
      resolveProfileIdentityRoles({
        videoCount: 0,
        articleCount: 0,
        photoCount: 0,
        courseCount: 0,
        productCount: 0,
      })
    ).toEqual([]);

    expect(
      resolveProfileIdentityRoles({
        videoCount: 2,
        articleCount: 0,
        photoCount: 0,
        courseCount: 1,
        productCount: 3,
      })
    ).toEqual(["creator", "teacher", "seller"]);

    expect(
      resolveProfileIdentityRoles({
        videoCount: 0,
        articleCount: 0,
        photoCount: 1,
        courseCount: 0,
        productCount: 0,
      })
    ).toEqual(["creator"]);
  });

  it("surfaces places from city/country only", () => {
    expect(getProfilePlaces({ city: "  Cairo ", country: "Egypt" })).toEqual({
      city: "Cairo",
      country: "Egypt",
      hasPlaces: true,
    });
    expect(getProfilePlaces({ city: "", country: "  " })).toEqual({
      city: "",
      country: "",
      hasPlaces: false,
    });
  });

  it("strips a leading Joined prefix for locale wrapping", () => {
    expect(stripJoinedPrefix("Joined March 2024")).toBe("March 2024");
    expect(stripJoinedPrefix("March 2024")).toBe("March 2024");
  });

  it("keeps Overview always and hides empty About sections", () => {
    const empty = baseProfile();
    expect(getAboutInternalNav(empty)).toEqual(["overview"]);
    expect(hasPersonalIntroContent(empty)).toBe(true);

    const rich = baseProfile({
      bio: "Hello",
      city: "Cairo",
      country: "Egypt",
      about: {
        joinedLabel: "Joined 2024",
        interests: ["Travel"],
        education: [{ title: "Arts" }],
        website: "https://example.com",
      },
    });
    expect(getAboutInternalNav(rich)).toEqual([
      "overview",
      "places",
      "education",
      "specialtiesInterests",
      "links",
    ]);
  });
});
