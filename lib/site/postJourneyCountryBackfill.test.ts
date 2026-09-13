import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SQL = readFileSync(
  join(ROOT, "supabase/migrations/20260941_post_journey_country_names_backfill_v1.sql"),
  "utf8"
);

describe("20260941 post journey country_name backfill", () => {
  it("is additive-only and maps PT/CH/CL", () => {
    expect(SQL).toMatch(/update public\.post_journey_countries/);
    expect(SQL).toMatch(/and j\.country_name = j\.country_code/);
    expect(SQL).toMatch(/\('PT', 'Portugal'\)/);
    expect(SQL).toMatch(/\('CH', 'Switzerland'\)/);
    expect(SQL).toMatch(/\('CL', 'Chile'\)/);
    expect(SQL).not.toMatch(/\bdrop table\b/i);
    expect(SQL).not.toMatch(/\bdelete from\b/i);
    expect(SQL).not.toMatch(/\balter table\b/i);
  });
});
