import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { isProtectedPath, PROTECTED_PREFIXES } from "../env/supabaseAuthGate";
import { SITEMAP_STATIC_ROUTES } from "../site/indexing";
import { dataExportMetadata } from "../site/routeMetadata";
import { DATA_EXPORT_PATH } from "./requestDataExport";

const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/20260940_data_export_requests_v1.sql";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("data export public route", () => {
  it("exposes /data-export as a public indexed App Router page", () => {
    expect(APP_ROUTES.dataExport).toBe("/data-export");
    expect(DATA_EXPORT_PATH).toBe("/data-export");
    expect(existsSync(join(ROOT, "app/data-export/page.tsx"))).toBe(true);
    expect(isProtectedPath("/data-export")).toBe(false);
    expect(PROTECTED_PREFIXES).not.toContain("/data-export");
    expect(SITEMAP_STATIC_ROUTES).toContain("/data-export");
    expect(dataExportMetadata.alternates?.canonical).toBe("/data-export");
    expect(dataExportMetadata.robots).toMatchObject({
      index: true,
      follow: true,
    });
  });
});

describe("data export migration security", () => {
  const sql = readRepo(MIGRATION);

  it("queues requests and does not export user data", () => {
    expect(sql).toMatch(
      /create table if not exists public\.data_export_requests/
    );
    expect(sql).not.toMatch(/\bcopy\b/i);
    expect(sql).toMatch(/Does not generate, package, or download user data/i);
  });

  it("enables force RLS and blocks anon", () => {
    expect(sql).toMatch(
      /alter table public\.data_export_requests enable row level security;/
    );
    expect(sql).toMatch(
      /alter table public\.data_export_requests force row level security;/
    );
    expect(sql).toMatch(
      /revoke all on table public\.data_export_requests from anon;/
    );
    expect(sql).toMatch(
      /grant select, insert on table public\.data_export_requests to authenticated;/
    );
    expect(sql).not.toMatch(
      /grant (update|delete|all) on table public\.data_export_requests to authenticated;/
    );
  });

  it("binds insert to auth.uid and pending status", () => {
    expect(sql).toMatch(/new\.user_id := auth\.uid\(\);/);
    expect(sql).toMatch(/new\.status := 'pending';/);
    expect(sql).toMatch(/data_export_requests_one_open_per_user_uidx/);
  });
});
