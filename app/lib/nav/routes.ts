import { slugifyCity } from "../journey/handoff";

export const APP_ROUTES = {
  home: "/",
  welcome: "/welcome",
  discover: "/discover",
  watch: "/watch",
  live: "/live",
  messages: "/messages",
  notifications: "/notifications",
  settings: "/settings",
  saved: "/saved",
  search: "/search",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  updatePassword: "/auth/update-password",
  authCallback: "/auth/callback",
  terms: "/terms",
  privacy: "/privacy",
  profile: "/profile",
  createVideo: "/create/video",
  createArticle: "/create/article",
  postJourney: "/post-journey",
  worldDiscovery: "/world",
  worldSearch: "/world/search",
  rewards: "/rewards",
  creatorInsights: "/creator/insights",
  learning: "/learning",
  games: "/games",
  store: "/store",
  storeSearch: "/store/search",
  storeCart: "/store/cart",
  storeCheckout: "/store/checkout",
  storeOrders: "/store/orders",
  storeWishlist: "/store/wishlist",
  seller: "/seller",
  sellerApply: "/seller/apply",
  sellerSetup: "/seller/setup",
  sellerStore: "/seller/store",
  sellerStoreProducts: "/seller/store/products",
  sellerMarketplace: "/seller/store/marketplace",
  sellerProducts: "/seller/products",
  sellerOrders: "/seller/store/orders",
  sellerInventory: "/seller/store/inventory",
  sellerPromotions: "/seller/store/promotions",
  sellerShipping: "/seller/store/shipping",
  sellerAnalytics: "/seller/store/analytics",
  advertise: "/advertise",
  advertiseApply: "/advertise/apply",
  advertiseDashboard: "/advertise/dashboard",
  advertiseCampaigns: "/advertise/campaigns",
  advertiseCampaignsNew: "/advertise/campaigns/new",
  advertiseCreativesNew: "/advertise/creatives/new",
  advertiseSettings: "/advertise/settings",
  adminAds: "/admin/ads",
  adminAdsAdvertisers: "/admin/ads/advertisers",
  adminAdsCampaigns: "/admin/ads/campaigns",
  adminAdsCreatives: "/admin/ads/creatives",
  adminAdsReviews: "/admin/ads/reviews",
  adminAdsDiagnostics: "/admin/ads/diagnostics",
  adminStore: "/admin/store",
  adminStoreSellers: "/admin/store/sellers",
  adminStoreProducts: "/admin/store/products",
  adminStoreReservations: "/admin/store/reservations",
} as const;

/** Campaign detail workspace under Advertise. */
export function advertiseCampaignDetail(campaignId: string): string {
  return `${APP_ROUTES.advertiseCampaigns}/${campaignId.trim()}`;
}

export type AppRouteHref =
  | (typeof APP_ROUTES)["home"]
  | (typeof APP_ROUTES)["discover"]
  | (typeof APP_ROUTES)["live"]
  | (typeof APP_ROUTES)["messages"]
  | (typeof APP_ROUTES)["worldDiscovery"]
  | (typeof APP_ROUTES)["learning"];

export type AppNavItem = {
  label: string;
  href: AppRouteHref;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { label: "Home", href: APP_ROUTES.home },
  { label: "Discover", href: APP_ROUTES.discover },
  { label: "World", href: APP_ROUTES.worldDiscovery },
  { label: "Learning", href: APP_ROUTES.learning },
  { label: "Live", href: APP_ROUTES.live },
  { label: "Messages", href: APP_ROUTES.messages },
];

export function isNavActive(pathname: string, href: AppRouteHref): boolean {
  if (href === APP_ROUTES.home) {
    // `/discover` aliases Home feed — keep Home highlighted after redirect targets.
    return (
      pathname === APP_ROUTES.home ||
      pathname === APP_ROUTES.discover ||
      pathname.startsWith(`${APP_ROUTES.discover}/`)
    );
  }

  if (href === APP_ROUTES.discover) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function normalizeCityKey(city: string): string {
  return slugifyCity(city);
}

export function citiesMatch(a: string, b: string): boolean {
  return normalizeCityKey(a) === normalizeCityKey(b);
}

/** Living Earth / Explore-this-city → Discover with city selected. */
export function buildDiscoverCityHref(city: string, country?: string): string {
  const params = new URLSearchParams({
    city: normalizeCityKey(city) || city.trim(),
  });

  if (country?.trim()) {
    params.set("country", country.trim());
  }

  return `${APP_ROUTES.discover}?${params.toString()}`;
}

/** Discover / Live → Living Earth focused on a city (mock). */
export function buildHomeCityFocusHref(city: string): string {
  const params = new URLSearchParams({
    focus: normalizeCityKey(city) || city.trim(),
  });

  return `${APP_ROUTES.home}?${params.toString()}`;
}

/** Normalize a creator handle/username for `/profile/[username]`. */
export function normalizeProfileUsername(username: string): string {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Discover / Live → public creator profile. */
export function buildCreatorProfileHref(input: {
  username: string;
  /** When set, profile shows an optional “open linked article” prompt. */
  articleId?: string | null;
}): string {
  const base = `${APP_ROUTES.profile}/${normalizeProfileUsername(input.username)}`;
  const articleId =
    typeof input.articleId === "string" ? input.articleId.trim() : "";
  if (!articleId || !UUID_RE.test(articleId)) {
    return base;
  }
  const params = new URLSearchParams({ article: articleId });
  return `${base}?${params.toString()}`;
}

/** Full article page (public). */
export function buildArticleHref(articleId: string): string {
  return `/articles/${sanitizeIdSegment(articleId)}`;
}

/** Profile articles tab deep link. */
export function buildProfileArticlesHref(username: string): string {
  return `${APP_ROUTES.profile}/${normalizeProfileUsername(username)}?tab=articles`;
}

/** True when `value` is a UUID suitable for messaging peers / conversations. */
export function isUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

/** Open an existing DM by conversation id (survives refresh). */
export function buildConversationHref(
  conversationId: string,
  options?: { messageId?: string | null }
): string {
  const params = new URLSearchParams({
    conversation: conversationId.trim(),
  });

  const messageId = options?.messageId?.trim();
  if (messageId && isUuid(messageId)) {
    params.set("message", messageId);
  }

  return `${APP_ROUTES.messages}?${params.toString()}`;
}

/**
 * Profile / Discover → start (or reopen) a DM with a peer user id.
 * Prefer `StartDirectMessageButton`, which creates/reuses then navigates to
 * `buildConversationHref`. This href is used for login `?next=` handoff.
 */
export function buildMessageCreatorHref(input: {
  id: string;
  name: string;
}): string {
  const params = new URLSearchParams({
    creatorId: input.id,
    creatorName: input.name,
    intent: "message",
  });

  return `${APP_ROUTES.messages}?${params.toString()}`;
}

export function buildLiveStreamHref(streamId: string): string {
  return `${APP_ROUTES.live}/${streamId.trim()}`;
}

/** Deep-link into Discover focused on a post (and optional comment). */
export function buildPostNotificationHref(input: {
  postId: string | number;
  commentId?: string | number | null;
}): string {
  const params = new URLSearchParams({
    post: String(input.postId),
  });
  if (input.commentId != null && String(input.commentId).trim()) {
    params.set("comment", String(input.commentId));
  }
  return `${APP_ROUTES.discover}?${params.toString()}`;
}

/** Journey notifications → Post Journey focused on a post. */
export function buildPostJourneyHref(postId: string | number): string {
  const params = new URLSearchParams({
    postId: String(postId),
  });
  return `${APP_ROUTES.postJourney}?${params.toString()}`;
}

/** Rewards / UM Points. */
export function buildRewardsHref(): string {
  return APP_ROUTES.rewards;
}

function sanitizeWorldSlugSegment(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$/.test(normalized)
    ? normalized
    : "";
}

export function buildWorldPlaceHref(slug: string): string {
  return `${APP_ROUTES.worldDiscovery}/place/${sanitizeWorldSlugSegment(slug)}`;
}

export function buildWorldCityHref(slug: string): string {
  return `${APP_ROUTES.worldDiscovery}/city/${sanitizeWorldSlugSegment(slug)}`;
}

/** AI / creator insights. */
export function buildAiInsightHref(): string {
  return APP_ROUTES.creatorInsights;
}

const PRODUCT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sanitize an id segment for use in a URL path (UUID-shaped only, else empty). */
function sanitizeIdSegment(id: string): string {
  const trimmed = id.trim();
  return PRODUCT_ID_RE.test(trimmed) ? trimmed : "";
}

/**
 * Id-based product link (e.g. from a wishlist row or a shoppable video
 * attachment) — resolves server-side to the canonical slug PDP.
 */
export function buildStoreProductIdHref(productId: string): string {
  return `${APP_ROUTES.store}/products/${sanitizeIdSegment(productId)}`;
}

/**
 * Id-based store link — resolves server-side to the canonical slug store
 * profile page.
 */
export function buildStoreShopIdHref(shopId: string): string {
  return `${APP_ROUTES.store}/shops/${sanitizeIdSegment(shopId)}`;
}

/** Seller-side deep link to edit a specific product draft/listing. */
export function buildSellerProductHref(productId: string): string {
  return `${APP_ROUTES.sellerStore}/products/${sanitizeIdSegment(productId)}/edit`;
}

/** Buyer order detail. */
export function buildStoreOrderHref(orderId: string): string {
  return `${APP_ROUTES.storeOrders}/${sanitizeIdSegment(orderId)}`;
}

/** Seller order detail. */
export function buildSellerOrderHref(orderId: string): string {
  return `${APP_ROUTES.sellerOrders}/${sanitizeIdSegment(orderId)}`;
}

export function findIndexByPostId<T extends { id: string | number }>(
  items: T[],
  postParam: string | null | undefined
): number {
  if (!postParam?.trim()) {
    return -1;
  }

  const needle = postParam.trim();
  const index = items.findIndex((item) => String(item.id) === needle);
  return index;
}

export function findIndexByCity<T extends { location: { city: string } }>(
  items: T[],
  cityParam: string | null | undefined
): number {
  if (!cityParam?.trim()) {
    return 0;
  }

  const index = items.findIndex((item) =>
    citiesMatch(item.location.city, cityParam)
  );

  return index >= 0 ? index : 0;
}
