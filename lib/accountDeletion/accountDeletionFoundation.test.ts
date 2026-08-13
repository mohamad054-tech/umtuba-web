import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { isProtectedPath, PROTECTED_PREFIXES } from "../env/supabaseAuthGate";
import { SITEMAP_STATIC_ROUTES } from "../site/indexing";
import { accountDeletionMetadata } from "../site/routeMetadata";
import {
  ACCOUNT_DELETION_DATA_ANONYMIZED,
  ACCOUNT_DELETION_DATA_DELETED,
  ACCOUNT_DELETION_DATA_RETAINED,
  ACCOUNT_DELETION_RETENTION_REASON,
} from "./disclosure";
import { ACCOUNT_DELETION_PATH } from "./requestAccountDeletion";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260872_account_deletion_requests_v1.sql";

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("account deletion public route", () => {
  it("exposes /account-deletion as a public indexed App Router page", () => {
    expect(APP_ROUTES.accountDeletion).toBe("/account-deletion");
    expect(ACCOUNT_DELETION_PATH).toBe("/account-deletion");
    expect(existsSync(join(ROOT, "app/account-deletion/page.tsx"))).toBe(true);
    expect(isProtectedPath("/account-deletion")).toBe(false);
    expect(PROTECTED_PREFIXES).not.toContain("/account-deletion");
    expect(SITEMAP_STATIC_ROUTES).toContain("/account-deletion");
    expect(accountDeletionMetadata.alternates?.canonical).toBe(
      "/account-deletion"
    );
    expect(accountDeletionMetadata.robots).toMatchObject({
      index: true,
      follow: true,
    });
  });

  it("does not use privacy as the deletion URL", () => {
    expect(APP_ROUTES.accountDeletion).not.toBe(APP_ROUTES.privacy);
    expect(APP_ROUTES.accountDeletion).not.toBe("/");
  });
});

describe("account deletion migration security", () => {
  const sql = readRepo(MIGRATION);

  it("queues requests and does not delete auth users", () => {
    expect(sql).toMatch(
      /create table if not exists public\.account_deletion_requests/
    );
    expect(sql).not.toMatch(/\bdelete from auth\.users\b/i);
    expect(sql).not.toMatch(/create or replace function public\.delete_user/i);
    expect(sql).toMatch(/Does not delete auth users/i);
  });

  it("enables force RLS and blocks anon", () => {
    expect(sql).toMatch(
      /alter table public\.account_deletion_requests enable row level security;/
    );
    expect(sql).toMatch(
      /alter table public\.account_deletion_requests force row level security;/
    );
    expect(sql).toMatch(
      /revoke all on table public\.account_deletion_requests from anon;/
    );
    expect(sql).toMatch(
      /grant select, insert on table public\.account_deletion_requests to authenticated;/
    );
    expect(sql).not.toMatch(
      /grant (update|delete|all) on table public\.account_deletion_requests to authenticated;/
    );
  });

  it("binds insert to auth.uid and pending status", () => {
    expect(sql).toMatch(/new\.user_id := auth\.uid\(\);/);
    expect(sql).toMatch(/new\.status := 'pending';/);
    expect(sql).toMatch(
      /account_deletion_requests_one_open_per_user_uidx/
    );
    expect(sql).toMatch(/\(select auth\.uid\(\)\) = user_id/);
    expect(sql).toMatch(/status = 'pending'/);
  });

  it("does not ship a client-callable delete-user RPC", () => {
    expect(sql).not.toMatch(/create or replace function public\.delete_user/i);
    expect(sql).not.toMatch(/grant execute on function public\.delete_user/i);
  });
});

describe("account deletion client/server secret hygiene", () => {
  it("keeps service-role credentials out of the web flow modules", () => {
    const files = [
      "app/account-deletion/page.tsx",
      "app/account-deletion/AccountDeletionExperience.tsx",
      "app/actions/accountDeletion.ts",
      "lib/accountDeletion/accountDeletionStore.ts",
      "lib/accountDeletion/requestAccountDeletion.ts",
      "lib/accountDeletion/disclosure.ts",
    ];
    for (const path of files) {
      const src = readRepo(path);
      expect(src, path).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
      expect(src, path).not.toMatch(/SERVICE_ROLE_KEY/);
      expect(src, path).not.toMatch(/service_role_key/);
    }
  });

  it("server action authorizes with getServerUser", () => {
    const src = readRepo("app/actions/accountDeletion.ts");
    expect(src).toMatch(/"use server"/);
    expect(src).toMatch(/getServerUser/);
    expect(src).not.toMatch(/auth\.admin/);
    expect(src).not.toMatch(/deleteUser/);
  });
});

describe("account deletion disclosure honesty", () => {
  it("describes queued processing and retention", () => {
    const page = readRepo(
      "app/account-deletion/AccountDeletionExperience.tsx"
    );
    expect(page).toMatch(/Delete your UMTUBA account/);
    expect(page).toMatch(/not\s+immediate/i);
    expect(page).toMatch(/queues a request/i);
    expect(ACCOUNT_DELETION_DATA_DELETED.length).toBeGreaterThan(3);
    expect(ACCOUNT_DELETION_DATA_ANONYMIZED.length).toBeGreaterThan(0);
    expect(ACCOUNT_DELETION_DATA_RETAINED.join(" ")).toMatch(/orders/i);
    expect(ACCOUNT_DELETION_RETENTION_REASON.join(" ")).toMatch(/law/i);
  });
});
