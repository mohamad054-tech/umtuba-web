/**
 * Migration-foundation contract tests for committed-reservation compensation SQL.
 * Reads local draft only — no remote apply, no service/UI wiring.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const MIGRATION_VERSION = "20260907";
const MIGRATION_FILE =
  "20260907_store_partial_refund_ledger_compensate_committed_v1.sql";

function readMigration(): string {
  return readFileSync(
    join(ROOT, "supabase/migrations", MIGRATION_FILE),
    "utf8"
  ).replace(/\r\n/g, "\n");
}

describe("compensate committed migration foundation — SQL contract", () => {
  it("ships 20260907 local draft with compensated status + privilege boundary", () => {
    const sql = readMigration();
    expect(sql).toMatch(/LOCAL ONLY/);
    expect(sql).toMatch(/20260907/);
    expect(sql).toMatch(/Rejected 20260906|Learning/);
    expect(sql).toMatch(
      /status in \('planned', 'committing', 'committed', 'failed', 'compensated'\)/
    );
    expect(sql).toMatch(/compensation_reason_safe/);
    expect(sql).toMatch(/compensated_at/);
    expect(sql).toMatch(
      /create or replace function public\.compensate_store_partial_refund_ledger_commit/
    );
    expect(sql).toMatch(/already_compensated/);
    expect(sql).toMatch(/for update/);
    expect(sql).toMatch(/committed_refund_amount_minor - /);
    expect(sql).toMatch(/committed_quantity - /);
    expect(sql).toMatch(
      /revoke all on function public\.compensate_store_partial_refund_ledger_commit\(uuid, text, uuid\)\s+from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /grant execute on function public\.compensate_store_partial_refund_ledger_commit\(uuid, text, uuid\)\s+to service_role/
    );
    expect(sql).not.toMatch(/grant execute[\s\S]*to authenticated;/);
    expect(sql).not.toMatch(/grant execute[\s\S]*to anon;/);
  });

  it("keeps money/provider/downstream domains out of the migration body", () => {
    const sql = readMigration();
    expect(sql).not.toMatch(/\bstripe\b/i);
    expect(sql).not.toMatch(/create table.*restock|restock_inventory|perform restock/i);
    expect(sql).not.toMatch(/store_payout|payout_execution/i);
    expect(sql).not.toMatch(/store_commerce_confirm_enabled|enable.*commerce_confirm/i);
    expect(sql).not.toMatch(/insert into public\.store_partial_refund/);
    expect(MIGRATION_VERSION).toBe("20260907");
  });
});
