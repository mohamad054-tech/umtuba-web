import type { DiscoverVideo } from "../types";

/**
 * Legacy local mock cards — Discover now loads real Supabase video posts.
 * Kept only for reference / local demos; not used by the Discover page.
 * creator.id is null: mocks are not real auth users (Message stays hidden).
 */
export const mockDiscoverVideos: DiscoverVideo[] = [
  {
    id: "discover-1",
    src: "/videos/demo-1.mp4",
    caption:
      "Morning light on quiet streets — the kind of moment that makes you want to stay a little longer.",
    hashtags: ["#Jerusalem", "#TravelShorts", "#UMTUBA", "#MorningVibes"],
    location: { city: "Jerusalem", country: "Palestine" },
    creator: {
      id: null,
      name: "Lina Haddad",
      username: "@lina.creates",
      avatar: "L",
    },
    stats: { likes: 12840, comments: 862, shares: 410, saves: 620, views: 91000 },
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "discover-2",
    src: "/videos/demo-2.mp4",
    caption:
      "City energy after sunset. One clip, a hundred stories waiting around the corner.",
    hashtags: ["#Amman", "#NightOut", "#CreatorLife", "#Discover"],
    location: { city: "Amman", country: "Jordan" },
    creator: {
      id: null,
      name: "Omar Khalil",
      username: "@omar.travels",
      avatar: "O",
    },
    stats: { likes: 34200, comments: 2104, shares: 950, saves: 1880, views: 210000 },
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "discover-3",
    src: "/videos/demo-3.mp4",
    caption:
      "Crossing the bridge between continents — skyline, sea, and a soundtrack that never ends.",
    hashtags: ["#Istanbul", "#Bosphorus", "#UrbanPulse", "#Shorts"],
    location: { city: "Istanbul", country: "Türkiye" },
    creator: {
      id: null,
      name: "Maya Chen",
      username: "@maya.labs",
      avatar: "M",
    },
    stats: { likes: 8920, comments: 540, shares: 270, saves: 410, views: 54000 },
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "discover-4",
    src: "/videos/demo-1.mp4",
    caption:
      "Soft neon, hard bass. Berlin nights hit different when the camera stays honest.",
    hashtags: ["#Berlin", "#Nightlife", "#GlassCity", "#UMTUBA"],
    location: { city: "Berlin", country: "Germany" },
    creator: {
      id: null,
      name: "Samir Nasser",
      username: "@samir.builds",
      avatar: "S",
      isFollowing: true,
    },
    stats: { likes: 5120, comments: 330, shares: 120, saves: 290, views: 28000 },
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "discover-5",
    src: "/videos/demo-2.mp4",
    caption:
      "From the river to the rooftops — keep scrolling, the world keeps opening.",
    hashtags: ["#Cairo", "#Nile", "#GlobalCreators", "#Explore"],
    location: { city: "Cairo", country: "Egypt" },
    creator: {
      id: null,
      name: "Noor Ali",
      username: "@noor.world",
      avatar: "N",
    },
    stats: { likes: 21040, comments: 1440, shares: 680, saves: 970, views: 120000 },
    likedByMe: false,
    savedByMe: false,
  },
  {
    id: "discover-6",
    src: "/videos/demo-3.mp4",
    caption:
      "Harbor fog and coffee steam. Tokyo mornings feel like a film you already love.",
    hashtags: ["#Tokyo", "#MorningRitual", "#Japan", "#DiscoverFeed"],
    location: { city: "Tokyo", country: "Japan" },
    creator: {
      id: null,
      name: "Yuki Tanaka",
      username: "@yuki.frames",
      avatar: "Y",
    },
    stats: { likes: 17650, comments: 980, shares: 520, saves: 1340, views: 88000 },
    likedByMe: false,
    savedByMe: false,
  },
];
