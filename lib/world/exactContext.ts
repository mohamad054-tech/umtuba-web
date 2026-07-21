export const EXACT_CONTEXT_STORAGE_KEY = "umtuba:return-context:v2";
export const EXTERNAL_NAVIGATION_PENDING_KEY =
  "umtuba:external-navigation-pending:v1";
export const EXACT_CONTEXT_TTL_MS = 2 * 60 * 60 * 1000;
export const EXACT_CONTEXT_RESTORE_EVENT = "umtuba:restore-exact-context";

const SAFE_PARAM_KEYS = new Set([
  "city",
  "country",
  "category",
  "radius",
  "tab",
  "filter",
  "sort",
  "q",
  "id",
  "post",
  "postId",
  "product",
  "store",
  "modal",
  "from",
  "vid",
]);

const SAFE_PATH =
  /^\/(?:$|[a-z0-9._~-]+(?:\/[a-z0-9._~-]+)*)\/?$/i;

export type ExactContextVideoState = {
  videoId: string;
  playbackTimeSeconds: number;
};

export type ExactReturnContext = {
  version: 2;
  internalPath: string;
  routeParams: Record<string, string>;
  scrollY: number;
  selectedTab: string | null;
  selectedFilters: Record<string, string>;
  modalState: string | null;
  video: ExactContextVideoState | null;
  openPlaceId: string | null;
  openCityId: string | null;
  currentJourneyId: string | null;
  currentSearch: string | null;
  createdAt: number;
  expiresAt: number;
};

function sanitizeSmallText(value: unknown, max = 120): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > max || /[\u0000-\u001f\u007f]/.test(text)) {
    return null;
  }
  return text;
}

function sanitizeUuid(value: unknown): string | null {
  const text = sanitizeSmallText(value, 36);
  return text &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text
    )
    ? text
    : null;
}

export function sanitizeInternalPath(path: string): string | null {
  const trimmed = path.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("..") ||
    trimmed.includes("?") ||
    trimmed.includes("#") ||
    !SAFE_PATH.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
}

export function sanitizeRouteParams(
  input: Record<string, unknown> | URLSearchParams
): Record<string, string> {
  const entries =
    input instanceof URLSearchParams
      ? Array.from(input.entries())
      : Object.entries(input);
  const safe: Record<string, string> = {};
  for (const [key, raw] of entries) {
    if (!SAFE_PARAM_KEYS.has(key)) continue;
    const value = sanitizeSmallText(raw, key === "q" ? 80 : 120);
    if (value) safe[key] = value;
  }
  return safe;
}

function sanitizeFilters(
  input: Record<string, unknown> | undefined
): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const [key, raw] of Object.entries(input ?? {})) {
    if (!/^[a-z][a-z0-9_-]{0,31}$/i.test(key)) continue;
    const value = sanitizeSmallText(raw, 80);
    if (value) safe[key] = value;
  }
  return safe;
}

export function createExactReturnContext(input: {
  internalPath: string;
  routeParams?: Record<string, unknown> | URLSearchParams;
  scrollY?: number;
  selectedTab?: string | null;
  selectedFilters?: Record<string, unknown>;
  modalState?: string | null;
  video?: { videoId?: unknown; playbackTimeSeconds?: unknown } | null;
  openPlaceId?: unknown;
  openCityId?: unknown;
  currentJourneyId?: unknown;
  currentSearch?: unknown;
  now?: number;
}): ExactReturnContext | null {
  const internalPath = sanitizeInternalPath(input.internalPath);
  if (!internalPath) return null;
  const now = input.now ?? Date.now();
  const videoId = sanitizeSmallText(input.video?.videoId, 120);
  const playback = input.video?.playbackTimeSeconds;
  const video =
    videoId &&
    typeof playback === "number" &&
    Number.isFinite(playback) &&
    playback >= 0 &&
    playback <= 24 * 60 * 60
      ? { videoId, playbackTimeSeconds: playback }
      : null;

  return {
    version: 2,
    internalPath,
    routeParams: sanitizeRouteParams(input.routeParams ?? {}),
    scrollY:
      typeof input.scrollY === "number" &&
      Number.isFinite(input.scrollY) &&
      input.scrollY >= 0
        ? Math.min(Math.round(input.scrollY), 10_000_000)
        : 0,
    selectedTab: sanitizeSmallText(input.selectedTab, 60),
    selectedFilters: sanitizeFilters(input.selectedFilters),
    modalState: sanitizeSmallText(input.modalState, 80),
    video,
    openPlaceId: sanitizeUuid(input.openPlaceId),
    openCityId: sanitizeUuid(input.openCityId),
    currentJourneyId: sanitizeUuid(input.currentJourneyId),
    currentSearch: sanitizeSmallText(input.currentSearch, 80),
    createdAt: now,
    expiresAt: now + EXACT_CONTEXT_TTL_MS,
  };
}

export function isValidExactReturnContext(
  value: unknown,
  now = Date.now()
): value is ExactReturnContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Partial<ExactReturnContext>;
  if (
    context.version !== 2 ||
    typeof context.createdAt !== "number" ||
    typeof context.expiresAt !== "number" ||
    context.expiresAt <= context.createdAt ||
    context.expiresAt < now ||
    context.expiresAt - context.createdAt > EXACT_CONTEXT_TTL_MS
  ) {
    return false;
  }
  if (
    typeof context.internalPath !== "string" ||
    sanitizeInternalPath(context.internalPath) !== context.internalPath
  ) {
    return false;
  }
  if (
    !context.routeParams ||
    typeof context.routeParams !== "object" ||
    !context.selectedFilters ||
    typeof context.selectedFilters !== "object" ||
    typeof context.scrollY !== "number" ||
    !Number.isFinite(context.scrollY) ||
    context.scrollY < 0
  ) {
    return false;
  }
  const routeParams = sanitizeRouteParams(
    context.routeParams as Record<string, unknown>
  );
  const filters = sanitizeFilters(
    context.selectedFilters as Record<string, unknown>
  );
  if (
    JSON.stringify(routeParams) !== JSON.stringify(context.routeParams) ||
    JSON.stringify(filters) !== JSON.stringify(context.selectedFilters)
  ) {
    return false;
  }
  if (
    context.selectedTab !== null &&
    sanitizeSmallText(context.selectedTab, 60) !== context.selectedTab
  ) {
    return false;
  }
  if (
    context.modalState !== null &&
    sanitizeSmallText(context.modalState, 80) !== context.modalState
  ) {
    return false;
  }
  if (context.video !== null) {
    if (
      !context.video ||
      sanitizeSmallText(context.video.videoId, 120) !== context.video.videoId ||
      !Number.isFinite(context.video.playbackTimeSeconds) ||
      context.video.playbackTimeSeconds < 0 ||
      context.video.playbackTimeSeconds > 24 * 60 * 60
    ) {
      return false;
    }
  }
  for (const id of [
    context.openPlaceId,
    context.openCityId,
    context.currentJourneyId,
  ]) {
    if (id !== null && sanitizeUuid(id) !== id) return false;
  }
  if (
    context.currentSearch !== null &&
    sanitizeSmallText(context.currentSearch, 80) !== context.currentSearch
  ) {
    return false;
  }
  return true;
}

export function buildExactContextHref(context: ExactReturnContext): string {
  const params = new URLSearchParams(context.routeParams);
  const query = params.toString();
  return `${context.internalPath}${query ? `?${query}` : ""}`;
}

export function saveExactReturnContext(context: ExactReturnContext): boolean {
  if (typeof window === "undefined" || !isValidExactReturnContext(context)) {
    return false;
  }
  try {
    window.sessionStorage.setItem(
      EXACT_CONTEXT_STORAGE_KEY,
      JSON.stringify(context)
    );
    return true;
  } catch {
    return false;
  }
}

type ExternalNavigationPending = {
  createdAt: number;
  departed: boolean;
};

function readExternalNavigationPending(): ExternalNavigationPending | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(EXTERNAL_NAVIGATION_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExternalNavigationPending>;
    if (
      typeof parsed.createdAt !== "number" ||
      Date.now() - parsed.createdAt > EXACT_CONTEXT_TTL_MS ||
      typeof parsed.departed !== "boolean"
    ) {
      window.sessionStorage.removeItem(EXTERNAL_NAVIGATION_PENDING_KEY);
      return null;
    }
    return parsed as ExternalNavigationPending;
  } catch {
    return null;
  }
}

export function markExternalNavigationPending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(
      EXTERNAL_NAVIGATION_PENDING_KEY,
      JSON.stringify({ createdAt: Date.now(), departed: false })
    );
    return true;
  } catch {
    return false;
  }
}

export function markExternalNavigationDeparted() {
  if (typeof window === "undefined") return;
  const pending = readExternalNavigationPending();
  if (!pending) return;
  try {
    window.sessionStorage.setItem(
      EXTERNAL_NAVIGATION_PENDING_KEY,
      JSON.stringify({ ...pending, departed: true })
    );
  } catch {
    // Storage can be unavailable; fail safely.
  }
}

export function shouldRestoreExternalNavigation(): boolean {
  return readExternalNavigationPending()?.departed === true;
}

export function readExactReturnContext(): ExactReturnContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(EXACT_CONTEXT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidExactReturnContext(parsed)) {
      window.sessionStorage.removeItem(EXACT_CONTEXT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      window.sessionStorage.removeItem(EXACT_CONTEXT_STORAGE_KEY);
    } catch {
      // Storage can be unavailable; fail safely.
    }
    return null;
  }
}

export function clearExactReturnContext() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(EXACT_CONTEXT_STORAGE_KEY);
    window.sessionStorage.removeItem(EXTERNAL_NAVIGATION_PENDING_KEY);
  } catch {
    // Storage can be unavailable; fail safely.
  }
}

/**
 * Capture Watch/Living-video exact context before a meaningful departure
 * (World nav, external directions, or leaving the Watch surface).
 * Avoids per-tick writes — call only on departure transitions.
 */
export function saveWatchExactContextDeparture(input: {
  videoId: string | null | undefined;
  playbackTimeSeconds: number | null | undefined;
  feedIndex?: number | null;
  routeParams?: Record<string, unknown> | URLSearchParams;
  scrollY?: number;
  departure?: string | null;
}): ExactReturnContext | null {
  const videoId =
    typeof input.videoId === "string" ? input.videoId.trim() : "";
  const playback =
    typeof input.playbackTimeSeconds === "number" &&
    Number.isFinite(input.playbackTimeSeconds)
      ? Math.max(0, input.playbackTimeSeconds)
      : null;
  const filters: Record<string, string> = {};
  if (
    typeof input.feedIndex === "number" &&
    Number.isInteger(input.feedIndex) &&
    input.feedIndex >= 0
  ) {
    filters.feedIndex = String(input.feedIndex);
  }
  const context = createExactReturnContext({
    internalPath: "/watch",
    routeParams: input.routeParams,
    scrollY: input.scrollY,
    selectedFilters: filters,
    modalState: input.departure ? `depart:${input.departure}` : null,
    video:
      videoId && playback !== null
        ? { videoId, playbackTimeSeconds: playback }
        : null,
  });
  if (!context || !saveExactReturnContext(context)) return null;
  return context;
}

/** Consume a valid Watch video restore payload once; invalid/stale clears storage. */
export function consumeWatchVideoRestore(now = Date.now()): {
  videoId: string;
  playbackTimeSeconds: number;
  feedIndex: number | null;
} | null {
  const context = readExactReturnContext();
  if (!context || !isValidExactReturnContext(context, now)) {
    return null;
  }
  if (context.internalPath !== "/watch" || !context.video) {
    return null;
  }
  const feedRaw = context.selectedFilters.feedIndex;
  const feedIndex =
    feedRaw && /^\d+$/.test(feedRaw) ? Number.parseInt(feedRaw, 10) : null;
  const payload = {
    videoId: context.video.videoId,
    playbackTimeSeconds: context.video.playbackTimeSeconds,
    feedIndex:
      feedIndex !== null && Number.isFinite(feedIndex) ? feedIndex : null,
  };
  clearExactReturnContext();
  return payload;
}
