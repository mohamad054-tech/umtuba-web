export type DemoVideo = {
  id: string;
  src: string;
  poster?: string;
  title: string;
  caption: string;
  location: {
    city: string;
    country: string;
  };
  music: string;
  aiSummary: string;
  translation: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  /** Display-only seed counts for the demo UI (not persisted). */
  demoStats: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
};

export const demoVideos: DemoVideo[] = [
  {
    id: "v1",
    src: "/videos/demo-1.mp4",
    title: "Bloom in motion",
    caption:
      "A quiet frame that travels — ideas without borders start with one moment.",
    location: { city: "Jerusalem", country: "Palestine" },
    music: "Original sound · Lina Creates",
    aiSummary: "A contemplative nature moment inviting global curiosity.",
    translation: "View in Arabic",
    author: {
      name: "Lina Haddad",
      username: "@lina.creates",
      avatar: "L",
    },
    demoStats: { likes: 1284, comments: 86, shares: 41, saves: 62 },
  },
  {
    id: "v2",
    src: "/videos/demo-2.mp4",
    title: "Big energy, small clip",
    caption:
      "Challenges, greetings, and discovery — swipe for the next stop on your journey.",
    location: { city: "Amman", country: "Jordan" },
    music: "City Pulse · UMTUBA Mix",
    aiSummary: "High-energy clip with strong discovery potential across regions.",
    translation: "View in English",
    author: {
      name: "Omar Khalil",
      username: "@omar.travels",
      avatar: "O",
    },
    demoStats: { likes: 3420, comments: 210, shares: 95, saves: 188 },
  },
  {
    id: "v3",
    src: "/videos/demo-3.mp4",
    title: "City pulse",
    caption:
      "From your street to the globe. Tap Post Journey to see how a post can travel.",
    location: { city: "Istanbul", country: "Türkiye" },
    music: "Bosphorus Lights · Demo Track",
    aiSummary: "Urban atmosphere that connects local streets to a worldwide audience.",
    translation: "View in Turkish",
    author: {
      name: "Maya Chen",
      username: "@maya.labs",
      avatar: "M",
    },
    demoStats: { likes: 892, comments: 54, shares: 27, saves: 41 },
  },
  {
    id: "v4",
    src: "/videos/demo-1.mp4",
    title: "Second bloom",
    caption:
      "Another angle on the same world — discovery continues as the journey unfolds.",
    location: { city: "Berlin", country: "Germany" },
    music: "Night Garden · Ambient",
    aiSummary: "Soft visual storytelling designed for calm, cross-border sharing.",
    translation: "View in German",
    author: {
      name: "Samir Nasser",
      username: "@samir.builds",
      avatar: "S",
    },
    demoStats: { likes: 512, comments: 33, shares: 12, saves: 29 },
  },
  {
    id: "v5",
    src: "/videos/demo-2.mp4",
    title: "Keep scrolling",
    caption:
      "Every swipe is a new place to meet people, ideas, and opportunities.",
    location: { city: "Cairo", country: "Egypt" },
    music: "Nile Drift · Creator Audio",
    aiSummary: "A momentum clip built for global reach and creator connection.",
    translation: "View in French",
    author: {
      name: "Noor Ali",
      username: "@noor.world",
      avatar: "N",
    },
    demoStats: { likes: 2104, comments: 144, shares: 68, saves: 97 },
  },
];

export function getDemoVideoById(id: string | null | undefined) {
  if (!id) {
    return demoVideos[0];
  }

  return demoVideos.find((video) => video.id === id) ?? demoVideos[0];
}

export function getDemoVideoIndex(id: string | null | undefined) {
  if (!id) {
    return 0;
  }

  const index = demoVideos.findIndex((video) => video.id === id);
  return index >= 0 ? index : 0;
}
