import {
  CJ_ACCESS_TOKEN_TTL_MS,
  CJ_API_BASE_URL,
  CJ_ENDPOINTS,
  CJ_FORBIDDEN_WRITE_PATHS,
  CJ_TOKEN_REFRESH_SKEW_MS,
  CJ_WRITE_CALLS_ENABLED,
  IRELAND_TEST_DESTINATION,
} from "./constants";
import { isTokenFresh } from "./tokenCache";
import type {
  CjAccessTokenPayload,
  CjApiEnvelope,
  CjCachedToken,
  CjCategoryNode,
  CjFreightOption,
  CjHttpFetcher,
  CjListV2Data,
  CjProductDetail,
  TokenCacheStore,
} from "./types";

export type CjClientOptions = {
  apiKey?: string;
  cache: TokenCacheStore;
  fetchImpl?: CjHttpFetcher;
  now?: () => number;
};

export type CjClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const FETCH_TIMEOUT_MS = 25000;

function defaultFetcher(): CjHttpFetcher {
  return async (url, init) => {
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const json: unknown = await response.json().catch(() => null);
    return { status: response.status, json };
  };
}

function asEnvelope<T>(json: unknown): CjApiEnvelope<T> {
  if (!json || typeof json !== "object") return {};
  return json as CjApiEnvelope<T>;
}

function parseExpiryMs(value: string | undefined, fallbackFrom: number): number {
  if (value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallbackFrom + CJ_ACCESS_TOKEN_TTL_MS;
}

function assertReadOnlyPath(path: string): void {
  if (CJ_WRITE_CALLS_ENABLED) {
    throw new Error("CJ write calls must stay disabled in this pilot.");
  }
  if (CJ_FORBIDDEN_WRITE_PATHS.some((blocked) => path.startsWith(blocked))) {
    throw new Error(`Forbidden CJ write path: ${path}`);
  }
}

export function hasCjApiKey(apiKey: string | undefined): boolean {
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

export function readCjApiKeyFromEnv(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const value = env.CJ_API_KEY?.trim();
  return value ? value : undefined;
}

export function createCjReadOnlyClient(options: CjClientOptions) {
  const fetchImpl = options.fetchImpl ?? defaultFetcher();
  const now = options.now ?? Date.now;
  const endpointsUsed = new Set<string>();

  async function request<T>(input: {
    path: string;
    method: "GET" | "POST";
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    token?: string;
  }): Promise<CjClientResult<T>> {
    assertReadOnlyPath(input.path);
    endpointsUsed.add(input.path);

    const url = new URL(`${CJ_API_BASE_URL}${input.path}`);
    if (input.query) {
      for (const [key, value] of Object.entries(input.query)) {
        if (value === undefined) continue;
        url.searchParams.set(key, String(value));
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (input.token) headers["CJ-Access-Token"] = input.token;

    let response: { status: number; json: unknown };
    try {
      response = await fetchImpl(url.toString(), {
        method: input.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
      });
    } catch (error) {
      const name = error instanceof Error ? error.name : "Error";
      const timedOut = name === "TimeoutError" || name === "AbortError";
      return {
        ok: false,
        message: timedOut ? `CJ request timed out (${input.path})` : `CJ request failed (${input.path})`,
      };
    }
    const envelope = asEnvelope<T>(response.json);
    if (response.status >= 400 || envelope.result === false || envelope.success === false) {
      return {
        ok: false,
        message: envelope.message || `CJ request failed (${response.status})`,
      };
    }
    if (envelope.data === undefined) {
      return { ok: false, message: envelope.message || "CJ response missing data" };
    }
    return { ok: true, data: envelope.data };
  }

  async function authenticate(): Promise<CjClientResult<string>> {
    const cached = options.cache.read();
    if (cached && isTokenFresh(cached, now(), CJ_TOKEN_REFRESH_SKEW_MS)) {
      return { ok: true, data: cached.accessToken };
    }

    if (cached?.refreshToken) {
      const refreshed = await request<CjAccessTokenPayload>({
        path: CJ_ENDPOINTS.refreshAccessToken,
        method: "POST",
        body: { refreshToken: cached.refreshToken },
      });
      if (refreshed.ok) {
        persistToken(refreshed.data);
        return { ok: true, data: refreshed.data.accessToken };
      }
    }

    if (!hasCjApiKey(options.apiKey)) {
      return {
        ok: false,
        message:
          "CJ_API_KEY is missing. Add it to .env.local as CJ_API_KEY= (server-only, never NEXT_PUBLIC).",
      };
    }

    const minted = await request<CjAccessTokenPayload>({
      path: CJ_ENDPOINTS.getAccessToken,
      method: "POST",
      body: { apiKey: options.apiKey },
    });
    if (!minted.ok) return minted;
    persistToken(minted.data);
    return { ok: true, data: minted.data.accessToken };
  }

  function persistToken(payload: CjAccessTokenPayload): void {
    const token: CjCachedToken = {
      accessToken: payload.accessToken,
      accessTokenExpiryMs: parseExpiryMs(payload.accessTokenExpiryDate, now()),
      refreshToken: payload.refreshToken,
      refreshTokenExpiryMs: payload.refreshTokenExpiryDate
        ? Date.parse(payload.refreshTokenExpiryDate)
        : undefined,
      cachedAt: new Date(now()).toISOString(),
    };
    options.cache.write(token);
  }

  async function withToken<T>(
    run: (token: string) => Promise<CjClientResult<T>>
  ): Promise<CjClientResult<T>> {
    const auth = await authenticate();
    if (!auth.ok) return auth;
    return run(auth.data);
  }

  return {
    authenticate,
    listUsedEndpoints() {
      return [...endpointsUsed].sort();
    },
    getCategories() {
      return withToken((token) =>
        request<CjCategoryNode[]>({
          path: CJ_ENDPOINTS.getCategory,
          method: "GET",
          token,
        })
      );
    },
    listProductsV2(query: {
      keyWord?: string;
      page?: number;
      size?: number;
      features?: string;
    }) {
      return withToken((token) =>
        request<CjListV2Data>({
          path: CJ_ENDPOINTS.listV2,
          method: "GET",
          token,
          query: {
            keyWord: query.keyWord,
            page: query.page ?? 1,
            size: query.size ?? 20,
            features: query.features ?? "enable_category,enable_description",
          },
        })
      );
    },
    queryProduct(pid: string) {
      return withToken((token) =>
        request<CjProductDetail>({
          path: CJ_ENDPOINTS.productQuery,
          method: "GET",
          token,
          query: { pid, features: "enable_inventory" },
        })
      );
    },
    queryProductBySku(productSku: string) {
      return withToken((token) =>
        request<CjProductDetail>({
          path: CJ_ENDPOINTS.productQuery,
          method: "GET",
          token,
          query: { productSku, features: "enable_inventory" },
        })
      );
    },
    queryProductByVariantSku(variantSku: string) {
      return withToken((token) =>
        request<CjProductDetail>({
          path: CJ_ENDPOINTS.productQuery,
          method: "GET",
          token,
          query: { variantSku, features: "enable_inventory" },
        })
      );
    },
    queryVariantByVid(vid: string) {
      return withToken((token) =>
        request<unknown>({
          path: CJ_ENDPOINTS.variantQueryByVid,
          method: "GET",
          token,
          query: { vid },
        })
      );
    },
    queryStockByVid(vid: string) {
      return withToken((token) =>
        request<unknown>({
          path: CJ_ENDPOINTS.stockQueryByVid,
          method: "GET",
          token,
          query: { vid },
        })
      );
    },
    queryStockBySku(sku: string) {
      return withToken((token) =>
        request<unknown>({
          path: CJ_ENDPOINTS.stockQueryBySku,
          method: "GET",
          token,
          query: { sku },
        })
      );
    },
    freightToIreland(input: {
      vid: string;
      quantity?: number;
      startCountryCode?: string;
    }) {
      return withToken((token) =>
        request<CjFreightOption[]>({
          path: CJ_ENDPOINTS.freightCalculate,
          method: "POST",
          token,
          body: {
            startCountryCode: input.startCountryCode ?? "CN",
            endCountryCode: IRELAND_TEST_DESTINATION.countryCode,
            zip: IRELAND_TEST_DESTINATION.postcode,
            products: [
              {
                vid: input.vid,
                quantity: input.quantity ?? 1,
              },
            ],
          },
        })
      );
    },
  };
}

export type CjReadOnlyClient = ReturnType<typeof createCjReadOnlyClient>;
