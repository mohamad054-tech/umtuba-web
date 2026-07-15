import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decideAuthGate,
  isProtectedPath,
  serviceUnavailableBody,
} from "./supabaseAuthGate";
import {
  messageForSupabasePublicIssue,
  requireSupabasePublicEnv,
  validateSupabasePublicEnv,
} from "./supabasePublic";

const ROOT = process.cwd();

const VALID = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key_1234567890",
};

describe("validateSupabasePublicEnv", () => {
  it("accepts valid configuration", () => {
    const result = validateSupabasePublicEnv(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.env.url).toBe("https://example.supabase.co");
    expect(result.env.publishableKey).toBe(VALID.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  });

  it("rejects missing Supabase URL", () => {
    const result = validateSupabasePublicEnv({
      ...VALID,
      NEXT_PUBLIC_SUPABASE_URL: "",
    });
    expect(result).toEqual({
      ok: false,
      issue: "missing_url",
      message: messageForSupabasePublicIssue("missing_url"),
    });
  });

  it("rejects missing anon/publishable key", () => {
    const result = validateSupabasePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: VALID.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue).toBe("missing_key");
  });

  it("rejects malformed Supabase URL", () => {
    const result = validateSupabasePublicEnv({
      ...VALID,
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue).toBe("malformed_url");
  });

  it("rejects non-http(s) URL schemes", () => {
    const result = validateSupabasePublicEnv({
      ...VALID,
      NEXT_PUBLIC_SUPABASE_URL: "ftp://example.supabase.co",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue).toBe("malformed_url");
  });

  it("accepts NEXT_PUBLIC_SUPABASE_ANON_KEY as publishable alias", () => {
    const result = validateSupabasePublicEnv({
      NEXT_PUBLIC_SUPABASE_URL: VALID.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9test",
    });
    expect(result.ok).toBe(true);
  });

  it("requireSupabasePublicEnv throws sanitized errors without secret values", () => {
    const secret = "super-secret-publishable-key-value-999";
    const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const previousAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    try {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = secret;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      expect(() => requireSupabasePublicEnv()).toThrow(
        /Supabase URL is invalid/
      );
      try {
        requireSupabasePublicEnv();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).not.toContain(secret);
        expect(message).not.toContain("not-a-url");
      }
    } finally {
      if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
      if (previousKey === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
      }
      if (previousAnon === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousAnon;
      }
    }
  });
});

describe("decideAuthGate fail-closed behavior", () => {
  const invalid = validateSupabasePublicEnv({});
  const valid = validateSupabasePublicEnv(VALID);

  it("denies protected routes when configuration is missing", () => {
    expect(isProtectedPath("/rewards")).toBe(true);
    expect(decideAuthGate("/rewards", invalid)).toEqual({
      action: "service_unavailable",
      forPath: "protected",
    });
    expect(decideAuthGate("/messages/inbox", invalid)).toEqual({
      action: "service_unavailable",
      forPath: "protected",
    });
    expect(serviceUnavailableBody("protected")).not.toMatch(/supabase|key|secret/i);
  });

  it("shows controlled unavailable state for auth routes when config is missing", () => {
    expect(decideAuthGate("/login", invalid)).toEqual({
      action: "service_unavailable",
      forPath: "auth",
    });
    expect(decideAuthGate("/signup", invalid)).toEqual({
      action: "service_unavailable",
      forPath: "auth",
    });
    expect(decideAuthGate("/forgot-password", invalid)).toEqual({
      action: "service_unavailable",
      forPath: "auth",
    });
    expect(decideAuthGate("/auth/update-password", invalid)).toEqual({
      action: "service_unavailable",
      forPath: "auth",
    });
  });

  it("allows public routes to continue without session when config is missing", () => {
    expect(decideAuthGate("/", invalid)).toEqual({
      action: "continue_without_session",
    });
    expect(decideAuthGate("/discover", invalid)).toEqual({
      action: "continue_without_session",
    });
  });

  it("checks session when configuration is valid", () => {
    expect(decideAuthGate("/rewards", valid)).toEqual({
      action: "check_session",
    });
    expect(decideAuthGate("/login", valid)).toEqual({
      action: "check_session",
    });
  });
});

describe("service-role isolation", () => {
  function listSourceFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = join(dir, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        listSourceFiles(rel, acc);
        continue;
      }
      if (
        /\.(ts|tsx)$/.test(entry.name) &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".test.tsx")
      ) {
        acc.push(rel);
      }
    }
    return acc;
  }

  it("does not reference SUPABASE_SERVICE_ROLE_KEY in client-reachable modules", () => {
    const files = [
      "lib/supabase/client.ts",
      "lib/env/supabasePublic.ts",
      "lib/env/supabaseAuthGate.ts",
      "lib/env/serviceUnavailableResponse.ts",
      ...listSourceFiles("app/components"),
      ...listSourceFiles("app/notifications"),
      ...listSourceFiles("app/messages"),
      ...listSourceFiles("app/discover"),
    ];

    for (const path of files) {
      const src = readFileSync(join(ROOT, path), "utf8");
      expect(src, path).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
      expect(src, path).not.toMatch(/SERVICE_ROLE/);
    }
  });
});
