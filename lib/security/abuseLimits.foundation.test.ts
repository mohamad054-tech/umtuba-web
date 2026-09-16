import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

describe("20260948 abuse limits migration (applied 2026-09-16)", () => {
  const sql = readFileSync(
    join(ROOT, "supabase/migrations/20260948_abuse_limits_v1.sql"),
    "utf8"
  );

  it("keeps existing RPC signatures and adds a cleanup-friendly helper table", () => {
    expect(sql).toMatch(/create table if not exists public\.rpc_abuse_events/);
    expect(sql).toMatch(/created_at timestamptz not null default now\(\)/);
    expect(sql).toMatch(
      /create or replace function public\.record_post_view\(/
    );
    expect(sql).toMatch(
      /create or replace function public\.record_post_share\(/
    );
    expect(sql).toMatch(/interval '24 hours'/);
    expect(sql).toMatch(/interval '1 hour', 20/);
    expect(sql).toMatch(/record_watch_signal/);
    expect(sql).toMatch(/record_referral_attribution/);
  });

  it("locks video_commerce_events writes and caps metadata", () => {
    expect(sql).toMatch(
      /revoke update, delete on table public\.video_commerce_events/
    );
    expect(sql).toMatch(/octet_length\(coalesce\(metadata::text, ''\)\) <= 4096/);
    expect(sql).toMatch(/badge_shown/);
    expect(sql).toMatch(/badge_opened/);
    expect(sql).toMatch(/product_viewed/);
    expect(sql).toMatch(/ROLLBACK/);
    expect(sql).toMatch(/^-- APPLIED TO PRODUCTION 2026-09-16/m);
    expect(sql).not.toMatch(/NOT APPLIED TO PRODUCTION/);
    expect(sql).not.toMatch(/ALREADY APPLIED MANUALLY TO PRODUCTION/);
  });
});
