import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CJ_TOKEN_CACHE_RELATIVE_PATH } from "./constants";
import type { CjCachedToken, TokenCacheStore } from "./types";

function isCachedToken(value: unknown): value is CjCachedToken {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.accessToken === "string" &&
    row.accessToken.length > 0 &&
    typeof row.accessTokenExpiryMs === "number" &&
    Number.isFinite(row.accessTokenExpiryMs)
  );
}

export function createFileTokenCache(rootDir = process.cwd()): TokenCacheStore {
  const filePath = join(rootDir, CJ_TOKEN_CACHE_RELATIVE_PATH);

  return {
    read() {
      try {
        const raw = readFileSync(filePath, "utf8");
        const parsed: unknown = JSON.parse(raw);
        return isCachedToken(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    write(token) {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(token, null, 2), "utf8");
    },
  };
}

export function createMemoryTokenCache(
  initial: CjCachedToken | null = null
): TokenCacheStore {
  let current = initial;
  return {
    read() {
      return current;
    },
    write(token) {
      current = token;
    },
  };
}

export function isTokenFresh(
  token: CjCachedToken | null,
  nowMs = Date.now(),
  skewMs = 0
): boolean {
  if (!token) return false;
  return token.accessTokenExpiryMs - skewMs > nowMs;
}
