import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  UEOS_FUTURE_TOKEN_ASSET,
  UEOS_SEEDED_ACTIVE_FIAT_ASSETS,
  UEOS_SEEDED_POINTS_ASSET,
  UEOS_WRITE_GATE_RPCS,
  buildUeosEnsureAccountArgs,
  isUeosFutureTokenAsset,
  isUeosPostableLifecycle,
  toUeosPostLinesJson,
} from "./index";

const ROOT = process.cwd();
const MIGRATION = "supabase/migrations/20260822_ueos_foundation_v1.sql";
const DOC = "docs/ueos/UEOS_FOUNDATION_V1.md";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return acc;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "ueos"
      ) {
        continue;
      }
      listSourceFiles(rel, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) acc.push(rel);
  }
  return acc;
}

describe("UEOS Foundation V1 — files", () => {
  it("ships migration and documentation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
  });
});

describe("UEOS Foundation V1 — helper contracts", () => {
  it("exposes write-gate RPC names only", () => {
    expect([...UEOS_WRITE_GATE_RPCS]).toEqual([
      "ueos_ensure_account",
      "ueos_post_journal",
    ]);
  });

  it("maps post lines to RPC JSON shape", () => {
    expect(
      toUeosPostLinesJson([
        {
          accountId: "11111111-1111-1111-1111-111111111111",
          direction: "debit",
          amountMinor: 500,
          assetCode: "USD",
        },
        {
          accountId: "22222222-2222-2222-2222-222222222222",
          direction: "credit",
          amountMinor: 500,
        },
      ])
    ).toEqual([
      {
        account_id: "11111111-1111-1111-1111-111111111111",
        direction: "debit",
        amount_minor: 500,
        asset_code: "USD",
      },
      {
        account_id: "22222222-2222-2222-2222-222222222222",
        direction: "credit",
        amount_minor: 500,
      },
    ]);
  });

  it("builds ensure-account args without inventing money fields", () => {
    expect(
      buildUeosEnsureAccountArgs({
        ownerType: "platform",
        ownerId: null,
        accountKind: "clearing",
        assetCode: "USD",
        productScope: "ueos",
      })
    ).toEqual({
      p_owner_type: "platform",
      p_owner_id: null,
      p_account_kind: "clearing",
      p_asset_code: "USD",
      p_product_scope: "ueos",
    });
  });

  it("treats only active lifecycle as postable; UMT is future token", () => {
    expect(isUeosPostableLifecycle("active")).toBe(true);
    expect(isUeosPostableLifecycle("planned")).toBe(false);
    expect(isUeosPostableLifecycle("future_reserved")).toBe(false);
    expect(isUeosPostableLifecycle("disabled")).toBe(false);
    expect(isUeosFutureTokenAsset(UEOS_FUTURE_TOKEN_ASSET)).toBe(true);
    expect(isUeosFutureTokenAsset("usd")).toBe(false);
  });
});

describe("UEOS Foundation V1 — migration contracts", () => {
  const sql = read(MIGRATION);

  it("creates all foundation tables", () => {
    for (const table of [
      "ueos_products",
      "ueos_assets",
      "ueos_policies",
      "ueos_accounts",
      "ueos_journal_entries",
      "ueos_ledger_lines",
      "ueos_account_balances",
    ]) {
      expect(sql).toMatch(
        new RegExp(`create table if not exists public\\.${table}`, "i")
      );
    }
  });

  it("seeds neutral fiat registry plus UM_POINTS and future_reserved UMT", () => {
    for (const code of UEOS_SEEDED_ACTIVE_FIAT_ASSETS) {
      expect(sql).toContain(`'${code}'`);
    }
    expect(sql).toContain(`'${UEOS_SEEDED_POINTS_ASSET}'`);
    expect(sql).toMatch(/'UMT'[\s\S]*'future_reserved'/);
    expect(sql).toMatch(
      /lifecycle_status in \('active', 'planned', 'future_reserved', 'disabled'\)/
    );
  });

  it("rejects non-active asset lifecycles and UMT for accounts and posts", () => {
    expect(sql).toMatch(/lifecycle_status is distinct from 'active'/);
    expect(sql).toMatch(/UMT is future_reserved and cannot have accounts/);
    expect(sql).toMatch(/UMT is future_reserved and cannot be posted/);
    expect(sql).toMatch(/UMT accounts must not exist/);
  });

  it("uses product and policy registries instead of hard product enums on journals", () => {
    expect(sql).toMatch(
      /product_code text not null references public\.ueos_products/
    );
    expect(sql).toMatch(/policy_id uuid references public\.ueos_policies/);
    expect(sql).toMatch(/create table if not exists public\.ueos_products/i);
    expect(sql).toMatch(/create table if not exists public\.ueos_policies/i);
    expect(sql).not.toMatch(
      /product_code text not null\s+check\s*\(\s*product_code in \('store'/i
    );
  });

  it("validates product and policy effectiveness on post", () => {
    expect(sql).toMatch(/product % is not active/);
    expect(sql).toMatch(/ueos_policy_is_effective/);
    expect(sql).toMatch(/policy % v% is not effective/);
    expect(sql).toMatch(
      /policy_id is required for product %/
    );
    expect(sql).toMatch(
      /p_policy_id is null and v_product_code not in \('ueos', 'system'\)/
    );
  });

  it("enforces balanced double-entry, asset match, positive amounts, overflow", () => {
    expect(sql).toMatch(/unbalanced journal for asset %/);
    expect(sql).toMatch(/asset_code does not match account asset/);
    expect(sql).toMatch(/amount_minor must be > 0/);
    expect(sql).toMatch(
      /ueos_ledger_lines_amount_positive check \(amount_minor > 0\)/
    );
    expect(sql).toMatch(/journal requires at least 2 lines/);
    expect(sql).toMatch(/ueos_assert_bigint_add/);
    expect(sql).toMatch(/balance overflow/);
    expect(sql).toMatch(/unknown keys are not allowed/);
  });

  it("implements semantic idempotency with fingerprint conflict detection", () => {
    expect(sql).toMatch(/request_fingerprint text not null/);
    expect(sql).toMatch(/ueos_compute_request_fingerprint/);
    expect(sql).toMatch(/ueos_normalize_post_lines/);
    expect(sql).toMatch(/idempotency conflict: key % already used/);
    expect(sql).toMatch(/'replayed', true/);
    expect(sql).toMatch(/ueos_journal_entries_idempotency_key_uidx unique/);
    expect(sql).toMatch(/unique_violation/);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
  });

  it("locks accounts in deterministic order and aggregates duplicate account lines", () => {
    expect(sql).toMatch(/order by 1/);
    expect(sql).toMatch(/for update/);
    expect(sql).toMatch(/group by account_id/);
    expect(sql).toMatch(/order by account_id/);
  });

  it("restricts authenticated visibility away from platform/system and journals", () => {
    expect(sql).toMatch(
      /owner_type = 'user'\s+and owner_id = \(select auth\.uid\(\)\)/
    );
    expect(sql).not.toMatch(
      /or owner_type in \('platform', 'system'\)/
    );
    expect(sql).toMatch(
      /revoke all on public\.ueos_journal_entries from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on public\.ueos_ledger_lines from public, anon, authenticated/
    );
    expect(sql).not.toMatch(
      /grant select on public\.ueos_journal_entries to authenticated/i
    );
    expect(sql).not.toMatch(
      /grant select on public\.ueos_ledger_lines to authenticated/i
    );
  });

  it("exposes only the trusted write gate and revokes client execute/writes", () => {
    expect(sql).toMatch(
      /create or replace function public\.ueos_ensure_account\(/i
    );
    expect(sql).toMatch(
      /create or replace function public\.ueos_post_journal\(/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.ueos_ensure_account\(text, uuid, text, text, text\)\s+from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.ueos_post_journal\([\s\S]*?\) from public, anon, authenticated/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.ueos_journal_payload\(uuid\) from public, anon, authenticated/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.ueos_ensure_account/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.ueos_post_journal/i
    );

    for (const table of [
      "ueos_journal_entries",
      "ueos_ledger_lines",
      "ueos_account_balances",
    ]) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on public\\.${table} from public, anon, authenticated`,
          "i"
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `alter table public\\.${table} force row level security`,
          "i"
        )
      );
    }
  });

  it("hardens SECURITY DEFINER helpers with explicit search_path", () => {
    expect(sql).toMatch(
      /create or replace function public\.ueos_ensure_account\([\s\S]*?security definer\s+set search_path = public/i
    );
    expect(sql).toMatch(
      /create or replace function public\.ueos_post_journal\([\s\S]*?security definer\s+set search_path = public/i
    );
    expect(sql).toMatch(
      /create or replace function public\.ueos_journal_payload\([\s\S]*?security definer\s+set search_path = public/i
    );
    expect(sql).toMatch(/actor_user_id is audit-only/i);
  });

  it("protects journal and line immutability", () => {
    expect(sql).toMatch(/ueos_forbid_ledger_mutation/);
    expect(sql).toMatch(/before update on public\.ueos_journal_entries/i);
    expect(sql).toMatch(/before delete on public\.ueos_journal_entries/i);
    expect(sql).toMatch(/before update on public\.ueos_ledger_lines/i);
    expect(sql).toMatch(/before delete on public\.ueos_ledger_lines/i);
    expect(sql).toMatch(
      /set search_path = public\s+as \$\$\s*begin\s*raise exception 'UEOS ledger history is immutable'/i
    );
  });

  it("documents additive scope and Store independence", () => {
    expect(sql).toMatch(/Does NOT modify Store or UM Points/i);
    expect(sql).toMatch(/no FK to Store/i);
    expect(sql).toMatch(/Single write gate/i);
  });
});

describe("UEOS Foundation V1 — documentation", () => {
  it("covers write gate, RLS matrix, UMT, Sync, and idempotency conflict", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Single write gate/i);
    expect(doc).toMatch(/future_reserved/i);
    expect(doc).toMatch(/Payment Outcome Sync|ueos_post_journal/);
    expect(doc).toMatch(/Authenticated visibility/i);
    expect(doc).toMatch(/platform\/system/i);
    expect(doc).toMatch(/idempotency conflict/i);
    expect(doc).toMatch(/request_fingerprint/i);
    expect(doc).toMatch(/UM Points/i);
  });
});

describe("UEOS Foundation V1 — Store and UM Points untouched", () => {
  it("does not reference Store payment tables from UEOS helpers", () => {
    const indexSrc = read("lib/ueos/index.ts");
    const typesSrc = read("lib/ueos/types.ts");
    expect(indexSrc).not.toMatch(
      /payment_attempts|create_deferred_payment|orders\./
    );
    expect(typesSrc).not.toMatch(
      /payment_attempts|create_deferred_payment/
    );
  });

  it("does not import UEOS from Store or UM Points award paths", () => {
    const storeFiles = listSourceFiles("lib/store");
    const rewardsFiles = listSourceFiles("lib/rewards");
    const walletFiles = listSourceFiles("lib/wallet");

    for (const path of [...storeFiles, ...rewardsFiles, ...walletFiles]) {
      if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) continue;
      const src = read(path);
      expect(src, path).not.toMatch(/from ["'].*lib\/ueos/);
      expect(src, path).not.toMatch(/ueos_post_journal|ueos_ensure_account/);
    }
  });

  it("does not alter Store payment or UM Points award migrations", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/alter table public\.orders\b/i);
    expect(sql).not.toMatch(/alter table public\.payment_attempts\b/i);
    expect(sql).not.toMatch(/alter table public\.um_point_balances\b/i);
    expect(sql).not.toMatch(/alter table public\.um_points_ledger\b/i);
    expect(sql).not.toMatch(
      /create or replace function public\.award_um_points/i
    );
    expect(sql).not.toMatch(
      /create or replace function public\.create_deferred_payment_attempt/i
    );
  });
});
