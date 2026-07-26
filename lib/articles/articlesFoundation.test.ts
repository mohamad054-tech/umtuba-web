import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ARTICLE_RPCS,
  isArticleUuid,
  sanitizeArticleError,
} from "./articlesFoundation";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260865_articles_teaser_foundation_v1.sql";

describe("Articles foundation", () => {
  it("ships migration 20260865", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260865_articles_teaser_foundation_v1.sql"
    );
  });

  it("defines articles table, article_id on posts, and publish RPC", () => {
    const sql = readFileSync(join(ROOT, MIGRATION), "utf8");
    expect(sql).toMatch(/create table if not exists public\.articles/);
    expect(sql).toMatch(/add column if not exists article_id/);
    expect(sql).toMatch(
      new RegExp(`create or replace function public\\.${ARTICLE_RPCS.publish}`)
    );
    expect(sql).toMatch(/revoke all on function public\.publish_my_article/);
  });

  it("validates uuids and sanitizes auth errors", () => {
    expect(isArticleUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
    expect(isArticleUuid("nope")).toBe(false);
    expect(sanitizeArticleError("Authentication required")).toMatch(/sign in/i);
  });
});
