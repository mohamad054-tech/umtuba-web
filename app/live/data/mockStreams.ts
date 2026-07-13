export type LiveChatMessage = {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  avatarGradient: string;
  text: string;
  sentAt: string;
  isCreator?: boolean;
};

export type LiveStream = {
  id: string;
  title: string;
  category: string;
  city: string;
  country: string;
  viewerCount: number;
  startedAtLabel: string;
  previewGradient: string;
  previewAccent: string;
  previewLabel: string;
  creator: {
    id: string;
    name: string;
    handle: string;
    initials: string;
    avatarGradient: string;
    followersLabel: string;
  };
  chat: LiveChatMessage[];
};

export const LIVE_REACTIONS = ["🔥", "❤️", "👏", "🌍", "✨", "🙌"] as const;

export const LIVE_QUALITY_OPTIONS = [
  "Auto",
  "1080p",
  "720p",
  "480p",
  "360p",
] as const;

export type LiveQuality = (typeof LIVE_QUALITY_OPTIONS)[number];

export const MOCK_LIVE_STREAMS: LiveStream[] = [
  {
    id: "live-lagos-sunrise",
    title: "Sunrise over Lagos Island — live from the waterfront",
    category: "Travel",
    city: "Lagos",
    country: "Nigeria",
    viewerCount: 18420,
    startedAtLabel: "Started 42 min ago",
    previewGradient: "from-[#1a1040] via-[#0c1a3a] to-[#061820]",
    previewAccent: "bg-amber-400/40",
    previewLabel: "Lagos waterfront · golden hour",
    creator: {
      id: "creator-amara",
      name: "Amara Okonkwo",
      handle: "@amara.ok",
      initials: "AO",
      avatarGradient: "from-amber-400 to-rose-500",
      followersLabel: "128K",
    },
    chat: [
      {
        id: "lc1",
        userId: "u1",
        userName: "Kai Nakamura",
        userInitials: "KN",
        avatarGradient: "from-cyan-400 to-blue-600",
        text: "That skyline glow is unreal 🔥",
        sentAt: "2m ago",
      },
      {
        id: "lc2",
        userId: "u2",
        userName: "Sofia Reyes",
        userInitials: "SR",
        avatarGradient: "from-fuchsia-400 to-violet-600",
        text: "Watching from Mexico City — good morning Lagos!",
        sentAt: "1m ago",
      },
      {
        id: "lc3",
        userId: "creator-amara",
        userName: "Amara Okonkwo",
        userInitials: "AO",
        avatarGradient: "from-amber-400 to-rose-500",
        text: "Welcome everyone — pan left in a sec for the ferry.",
        sentAt: "1m ago",
        isCreator: true,
      },
      {
        id: "lc4",
        userId: "u3",
        userName: "Youssef Haddad",
        userInitials: "YH",
        avatarGradient: "from-emerald-400 to-teal-600",
        text: "UMTUBA globe pulse brought me here 🌍",
        sentAt: "48s ago",
      },
      {
        id: "lc5",
        userId: "u4",
        userName: "Elena Voss",
        userInitials: "EV",
        avatarGradient: "from-sky-400 to-indigo-500",
        text: "Can you show the bridge again?",
        sentAt: "32s ago",
      },
      {
        id: "lc6",
        userId: "u5",
        userName: "Tariq Mensah",
        userInitials: "TM",
        avatarGradient: "from-orange-400 to-red-500",
        text: "Best live on the network tonight.",
        sentAt: "18s ago",
      },
    ],
  },
  {
    id: "live-tokyo-night",
    title: "Shibuya crossing after rain",
    category: "City Life",
    city: "Tokyo",
    country: "Japan",
    viewerCount: 22105,
    startedAtLabel: "Started 1h ago",
    previewGradient: "from-[#1a0a28] via-[#0a1228] to-[#041018]",
    previewAccent: "bg-pink-400/35",
    previewLabel: "Shibuya · neon rain",
    creator: {
      id: "creator-yuki",
      name: "Yuki Tanaka",
      handle: "@yuki.live",
      initials: "YT",
      avatarGradient: "from-pink-400 to-violet-600",
      followersLabel: "96K",
    },
    chat: [
      {
        id: "tc1",
        userId: "u6",
        userName: "Maya Chen",
        userInitials: "MC",
        avatarGradient: "from-blue-400 to-indigo-600",
        text: "Neon reflections are perfect tonight",
        sentAt: "3m ago",
      },
      {
        id: "tc2",
        userId: "creator-yuki",
        userName: "Yuki Tanaka",
        userInitials: "YT",
        avatarGradient: "from-pink-400 to-violet-600",
        text: "Crossing clears in 20 seconds — stay with me.",
        sentAt: "1m ago",
        isCreator: true,
      },
    ],
  },
  {
    id: "live-rio-samba",
    title: "Street samba rehearsal — Lapa",
    category: "Music",
    city: "Rio de Janeiro",
    country: "Brazil",
    viewerCount: 9734,
    startedAtLabel: "Started 18 min ago",
    previewGradient: "from-[#2a1010] via-[#1a1420] to-[#0a1820]",
    previewAccent: "bg-lime-400/30",
    previewLabel: "Lapa · rehearsal energy",
    creator: {
      id: "creator-rafa",
      name: "Rafael Costa",
      handle: "@rafa.beats",
      initials: "RC",
      avatarGradient: "from-lime-400 to-emerald-600",
      followersLabel: "54K",
    },
    chat: [
      {
        id: "rc1",
        userId: "u7",
        userName: "Aisha Diallo",
        userInitials: "AD",
        avatarGradient: "from-yellow-400 to-orange-500",
        text: "That rhythm hits from across the ocean 🙌",
        sentAt: "2m ago",
      },
    ],
  },
  {
    id: "live-paris-atelier",
    title: "Midnight atelier — sketching the Seine",
    category: "Art",
    city: "Paris",
    country: "France",
    viewerCount: 6120,
    startedAtLabel: "Started 55 min ago",
    previewGradient: "from-[#101828] via-[#12101f] to-[#081018]",
    previewAccent: "bg-sky-400/30",
    previewLabel: "Seine · soft floodlights",
    creator: {
      id: "creator-camille",
      name: "Camille Dupont",
      handle: "@camille.ink",
      initials: "CD",
      avatarGradient: "from-sky-400 to-blue-700",
      followersLabel: "41K",
    },
    chat: [
      {
        id: "pc1",
        userId: "u8",
        userName: "Noah Berg",
        userInitials: "NB",
        avatarGradient: "from-slate-300 to-slate-600",
        text: "Love the quiet pace of this stream",
        sentAt: "4m ago",
      },
    ],
  },
  {
    id: "live-dubai-skyline",
    title: "Marina skyline drone pass",
    category: "Aerial",
    city: "Dubai",
    country: "UAE",
    viewerCount: 14302,
    startedAtLabel: "Started 27 min ago",
    previewGradient: "from-[#0a1828] via-[#0c1020] to-[#180a18]",
    previewAccent: "bg-cyan-300/35",
    previewLabel: "Marina · golden glass",
    creator: {
      id: "creator-layla",
      name: "Layla Al-Hassan",
      handle: "@layla.air",
      initials: "LA",
      avatarGradient: "from-cyan-300 to-blue-600",
      followersLabel: "210K",
    },
    chat: [
      {
        id: "dc1",
        userId: "u9",
        userName: "Omar Farouk",
        userInitials: "OF",
        avatarGradient: "from-teal-400 to-cyan-700",
        text: "Altitude looks buttery smooth",
        sentAt: "1m ago",
      },
    ],
  },
  {
    id: "live-nairobi-market",
    title: "Maasai Market morning walk",
    category: "Culture",
    city: "Nairobi",
    country: "Kenya",
    viewerCount: 4888,
    startedAtLabel: "Started 12 min ago",
    previewGradient: "from-[#1a1808] via-[#14120f] to-[#081410]",
    previewAccent: "bg-yellow-400/30",
    previewLabel: "Market · morning color",
    creator: {
      id: "creator-wambui",
      name: "Wambui Njoroge",
      handle: "@wambui.walks",
      initials: "WN",
      avatarGradient: "from-yellow-400 to-orange-600",
      followersLabel: "33K",
    },
    chat: [
      {
        id: "nc1",
        userId: "u10",
        userName: "Priya Sharma",
        userInitials: "PS",
        avatarGradient: "from-rose-400 to-red-600",
        text: "Those textiles are stunning",
        sentAt: "50s ago",
      },
    ],
  },
];

export const FEATURED_STREAM_ID = MOCK_LIVE_STREAMS[0].id;

export function formatViewerCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return String(count);
}

export function getStreamById(id: string): LiveStream | undefined {
  return MOCK_LIVE_STREAMS.find((stream) => stream.id === id);
}
