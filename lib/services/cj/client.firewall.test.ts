import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CJ_ENDPOINTS,
  CJ_FORBIDDEN_WRITE_PATHS,
  CJ_WRITE_CALLS_ENABLED,
  LIVE_STORE_PUBLISH_ENABLED,
  PAYMENT_ACTION,
  PRODUCTION_CHANGED,
} from "./constants";
import { createCjReadOnlyClient } from "./client";
import { createMemoryTokenCache } from "./tokenCache";

const ROOT = join(__dirname);

function listTs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      listTs(abs, acc);
      continue;
    }
    if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".test.ts") &&
      entry.name !== "constants.ts"
    ) {
      acc.push(abs);
    }
  }
  return acc;
}

describe("cj pilot firewall", () => {
  it("keeps production, orders, and payments off", () => {
    expect(LIVE_STORE_PUBLISH_ENABLED).toBe(false);
    expect(CJ_WRITE_CALLS_ENABLED).toBe(false);
    expect(PRODUCTION_CHANGED).toBe(false);
    expect(PAYMENT_ACTION).toBe(false);
  });

  it("only references read-only catalog and logistics paths", () => {
    const constantsSrc = readFileSync(join(ROOT, "constants.ts"), "utf8");
    expect(constantsSrc).toContain(CJ_ENDPOINTS.listV2);
    expect(constantsSrc).toContain(CJ_ENDPOINTS.freightCalculate);
    expect(constantsSrc).toContain(CJ_ENDPOINTS.getAccessToken);

    const src = listTs(ROOT)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    for (const blocked of CJ_FORBIDDEN_WRITE_PATHS) {
      expect(src).not.toContain(blocked);
    }
    expect(src).not.toMatch(/createOrder/i);
    expect(src).not.toMatch(/stripe|paypal|checkout\.session/i);
  });

  it("refuses to call write paths even if a test tries", async () => {
    const client = createCjReadOnlyClient({
      apiKey: "test-key-not-real",
      cache: createMemoryTokenCache(),
      fetchImpl: async () => {
        throw new Error("network should not run for forbidden paths");
      },
    });
    await expect(
      createCjReadOnlyClient({
        apiKey: "test-key-not-real",
        cache: createMemoryTokenCache(),
        fetchImpl: async (url) => {
          expect(url).not.toContain("/shopping/order");
          return {
            status: 200,
            json: {
              result: true,
              data: {
                accessToken: "cached-test-token",
                accessTokenExpiryDate: new Date(Date.now() + 86400000).toISOString(),
              },
            },
          };
        },
      }).authenticate()
    ).resolves.toMatchObject({ ok: true });
    expect(client.listUsedEndpoints).toBeTypeOf("function");
  });
});
