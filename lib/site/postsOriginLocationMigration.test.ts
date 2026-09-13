import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260942_posts_origin_location_v1.sql"
  ),
  "utf8"
);

describe("20260942 posts origin location", () => {
  it("is additive, nullable, and does not backfill", () => {
    expect(SQL).toMatch(/add column if not exists origin_country_code text/);
    expect(SQL).toMatch(/add column if not exists origin_city text/);
    expect(SQL).toMatch(/add column if not exists origin_lat numeric/);
    expect(SQL).toMatch(/add column if not exists origin_lng numeric/);
    expect(SQL).toMatch(/origin_country_code ~ '\^\[A-Z\]\{2\}\$'/);
    expect(SQL).toMatch(/posts_origin_coords_pair_check/);
    expect(SQL).toMatch(/posts_origin_country_code_idx/);
    expect(SQL).not.toMatch(/\bdrop table\b/i);
    expect(SQL).not.toMatch(/\bdelete from\b/i);
    expect(SQL).not.toMatch(/\bupdate public\.posts\b/i);
    expect(SQL).not.toMatch(/default '/i);
  });
});
