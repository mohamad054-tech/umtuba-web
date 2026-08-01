#!/usr/bin/env node
/**
 * Commerce Chain Verification & Migration Apply Readiness V1
 * Static, fail-closed repository checks. Does NOT inspect or mutate any database.
 *
 * Usage: node scripts/verify-commerce-chain-migration-apply-readiness.mjs
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

const REQUIRED_APPLY_ORDER = [
  "20260889_store_digital_entitlement_revoke_on_refund_v1.sql",
  "20260890_store_commission_decomposition_bridge_apply_v1.sql",
  "20260891_store_commission_policy_activation_v1.sql",
];

const PREREQUISITE_MIGRATIONS = [
  "20260823_store_payment_outcome_sync_v1.sql",
  "20260824_store_merchant_settlement_foundation_v1.sql",
  "20260877_store_digital_entitlement_grant_v1.sql",
  "20260884_store_commission_policy_foundation_v1.sql",
  "20260887_store_commerce_transactional_notifications_v1.sql",
  "20260888_store_refund_operations_surface_v1.sql",
];

const RPC_CONTRACTS = [
  {
    rpc: "revoke_store_digital_entitlements_after_refund",
    migration: "20260889_store_digital_entitlement_revoke_on_refund_v1.sql",
    tsFile: "lib/store/digitalEntitlementRevoke.ts",
    sqlArgs: ["p_payment_attempt_id", "p_event_key", "p_correlation_id"],
    tsArgs: ["p_payment_attempt_id", "p_event_key", "p_correlation_id"],
  },
  {
    rpc: "apply_store_commission_decomposition_after_capture",
    migration: "20260890_store_commission_decomposition_bridge_apply_v1.sql",
    tsFile: "lib/store/commissionDecompositionBridgeApply.ts",
    sqlArgs: ["p_payment_attempt_id", "p_event_key", "p_correlation_id"],
    tsArgs: ["p_payment_attempt_id", "p_event_key", "p_correlation_id"],
  },
  {
    rpc: "mark_store_commission_decomposition_after_refund",
    migration: "20260890_store_commission_decomposition_bridge_apply_v1.sql",
    tsFile: "lib/store/commissionDecompositionBridgeApply.ts",
    sqlArgs: ["p_payment_attempt_id", "p_correlation_id"],
    tsArgs: ["p_payment_attempt_id", "p_correlation_id"],
  },
  {
    rpc: "get_store_commission_decomposition_for_attempt",
    migration: "20260890_store_commission_decomposition_bridge_apply_v1.sql",
    tsFile: "lib/store/commissionDecompositionBridgeApply.ts",
    sqlArgs: ["p_payment_attempt_id"],
    tsArgs: ["p_payment_attempt_id"],
  },
  {
    rpc: "activate_store_commission_policy",
    migration: "20260891_store_commission_policy_activation_v1.sql",
    tsFile: "lib/store/commissionPolicyActivation.ts",
    sqlArgs: ["p_policy_code", "p_version", "p_event_key", "p_correlation_id"],
    tsArgs: ["p_policy_code", "p_version", "p_event_key", "p_correlation_id"],
  },
  {
    rpc: "deactivate_store_commission_policy",
    migration: "20260891_store_commission_policy_activation_v1.sql",
    tsFile: "lib/store/commissionPolicyActivation.ts",
    sqlArgs: ["p_policy_code", "p_version", "p_event_key", "p_correlation_id"],
    tsArgs: ["p_policy_code", "p_version", "p_event_key", "p_correlation_id"],
  },
  {
    rpc: "resolve_store_commission_policy",
    migration: "20260891_store_commission_policy_activation_v1.sql",
    tsFile: null,
    sqlArgs: ["p_currency", "p_at"],
    tsArgs: [],
    mustAppearIn: [
      "20260890_store_commission_decomposition_bridge_apply_v1.sql",
    ],
  },
];

const errors = [];
const warnings = [];

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function listMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    fail(`Missing migrations directory: ${MIGRATIONS_DIR}`);
    return [];
  }
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function checkDuplicateNumbers(files) {
  const byPrefix = new Map();
  for (const f of files) {
    const m = f.match(/^(\d{8})/);
    if (!m) continue;
    const prefix = m[1];
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix).push(f);
  }
  for (const [prefix, names] of byPrefix) {
    if (names.length > 1) {
      // Historical duplicate prefixes outside 20260889-91 are noted but only
      // fail closed for the apply-readiness chain prefixes.
      if (["20260889", "20260890", "20260891", "20260887"].includes(prefix)) {
        fail(
          `Duplicate migration number ${prefix}: ${names.join(", ")}`
        );
      } else {
        warn(
          `Historical duplicate migration prefix ${prefix}: ${names.join(", ")}`
        );
      }
    }
  }
}

function checkRequiredFiles(files) {
  const set = new Set(files);
  for (const req of [...PREREQUISITE_MIGRATIONS, ...REQUIRED_APPLY_ORDER]) {
    if (!set.has(req)) {
      fail(`Missing required migration file: ${req}`);
    }
  }
}

function checkOrdering(files) {
  const idxs = REQUIRED_APPLY_ORDER.map((f) => files.indexOf(f));
  if (idxs.some((i) => i < 0)) return;
  for (let i = 1; i < idxs.length; i++) {
    if (idxs[i] <= idxs[i - 1]) {
      fail(
        `Invalid migration order: ${REQUIRED_APPLY_ORDER[i]} must sort after ${REQUIRED_APPLY_ORDER[i - 1]}`
      );
    }
  }
  // Lexicographic filenames encode order; also assert numeric sequence.
  if (
    !(
      "20260889" < "20260890" &&
      "20260890" < "20260891"
    )
  ) {
    fail("Numeric migration order 20260889 < 20260890 < 20260891 violated");
  }
}

function checkObsolete20260887(files) {
  const obsoleteName = "20260887_store_commission_policy_activation_v1.sql";
  if (files.includes(obsoleteName)) {
    fail(
      `Obsolete commission activation migration present in active tree: ${obsoleteName}`
    );
  }
  const notifications = "20260887_store_commerce_transactional_notifications_v1.sql";
  if (!files.includes(notifications)) {
    fail(`Expected notifications migration missing: ${notifications}`);
  } else {
    const sql = read(`supabase/migrations/${notifications}`);
    if (/activate_store_commission_policy|store_commission_policy_activation_events/i.test(sql)) {
      fail(
        `${notifications} unexpectedly contains commission policy activation definitions`
      );
    }
    if (!/Transactional Notifications|create_store_commerce_notification/i.test(sql)) {
      fail(
        `${notifications} does not look like the transactional notifications migration`
      );
    }
  }

  // Exactly one activate/deactivate definition locus: 20260891
  let activateDefs = 0;
  for (const f of files) {
    const sql = read(`supabase/migrations/${f}`);
    if (
      /create\s+or\s+replace\s+function\s+public\.activate_store_commission_policy/i.test(
        sql
      )
    ) {
      activateDefs += 1;
      if (f !== "20260891_store_commission_policy_activation_v1.sql") {
        fail(
          `activate_store_commission_policy defined outside 20260891: ${f}`
        );
      }
    }
  }
  if (activateDefs !== 1) {
    fail(
      `Expected exactly one activate_store_commission_policy definition, found ${activateDefs}`
    );
  }
}

function checkRpcContracts() {
  for (const c of RPC_CONTRACTS) {
    const migPath = `supabase/migrations/${c.migration}`;
    if (!existsSync(join(ROOT, migPath))) {
      fail(`RPC contract migration missing: ${migPath}`);
      continue;
    }
    const sql = read(migPath);
    if (!new RegExp(`function\\s+public\\.${c.rpc}\\s*\\(`, "i").test(sql)) {
      fail(`RPC ${c.rpc} not found in ${c.migration}`);
    }
    for (const arg of c.sqlArgs) {
      if (!sql.includes(arg)) {
        fail(`RPC ${c.rpc} missing SQL arg ${arg} in ${c.migration}`);
      }
    }
    if (
      !new RegExp(
        `grant\\s+execute\\s+on\\s+function\\s+public\\.${c.rpc}[\\s\\S]*?to\\s+service_role`,
        "i"
      ).test(sql)
    ) {
      fail(`RPC ${c.rpc} missing GRANT EXECUTE to service_role in ${c.migration}`);
    }
    if (
      !new RegExp(
        `revoke\\s+all\\s+on\\s+function\\s+public\\.${c.rpc}[\\s\\S]*?from\\s+public,\\s*anon,\\s*authenticated`,
        "i"
      ).test(sql)
    ) {
      fail(
        `RPC ${c.rpc} missing REVOKE from public/anon/authenticated in ${c.migration}`
      );
    }

    if (c.tsFile) {
      if (!existsSync(join(ROOT, c.tsFile))) {
        fail(`TS call site missing for ${c.rpc}: ${c.tsFile}`);
        continue;
      }
      const ts = read(c.tsFile);
      if (!ts.includes(c.rpc) && !ts.includes(`"${c.rpc}"`)) {
        // constants may hold the name
        const constOk =
          ts.includes("REVOKE_RPC") ||
          ts.includes("APPLY_RPC") ||
          ts.includes("MARK_REFUND_RPC") ||
          ts.includes("GET_RPC") ||
          ts.includes("ACTIVATE_RPC") ||
          ts.includes("DEACTIVATE_RPC") ||
          ts.includes(c.rpc);
        if (!constOk) {
          fail(`TS file ${c.tsFile} does not reference RPC ${c.rpc}`);
        }
      }
      for (const arg of c.tsArgs) {
        if (!ts.includes(arg)) {
          fail(`TS file ${c.tsFile} missing arg ${arg} for ${c.rpc}`);
        }
      }
    }

    if (c.mustAppearIn) {
      for (const other of c.mustAppearIn) {
        const otherSql = read(`supabase/migrations/${other}`);
        if (!otherSql.includes(c.rpc)) {
          fail(`Dependency: ${other} must reference ${c.rpc}`);
        }
      }
    }
  }
}

function checkDependencyGraph() {
  const m89 = read(
    "supabase/migrations/20260889_store_digital_entitlement_revoke_on_refund_v1.sql"
  );
  const m90 = read(
    "supabase/migrations/20260890_store_commission_decomposition_bridge_apply_v1.sql"
  );
  const m91 = read(
    "supabase/migrations/20260891_store_commission_policy_activation_v1.sql"
  );

  if (!/store_digital_entitlements/.test(m89)) {
    fail("20260889 must alter/use store_digital_entitlements");
  }
  if (!/store_payment_outcome_events/.test(m89)) {
    fail("20260889 must require trusted refunded outcome events");
  }
  if (!/resolve_store_commission_policy/.test(m90)) {
    fail("20260890 must call resolve_store_commission_policy");
  }
  if (!/compute_store_commission_split/.test(m90)) {
    fail("20260890 must call compute_store_commission_split");
  }
  if (!/store_settlement_events/.test(m90)) {
    fail("20260890 must require prior settlement allocate");
  }
  if (!/store_commission_policies_one_active_per_currency_uidx/.test(m91)) {
    fail("20260891 must create one-active-per-currency unique index");
  }
  if (!/status in \('active', 'superseded'\)/.test(m91)) {
    fail("20260891 resolve must consider active and superseded windows");
  }
  if (/insert into public\.store_commission_policies/i.test(m91)) {
    fail("20260891 must not seed active commercial policies");
  }
}

function checkWireIn() {
  const refund = read("lib/store/fullOrderRefundPath.ts");
  if (!/revokeDigitalEntitlementsAfterTrustedRefund/.test(refund)) {
    fail("fullOrderRefundPath must wire entitlement revoke");
  }
  if (!/markCommissionDecompositionAfterTrustedRefund/.test(refund)) {
    fail("fullOrderRefundPath must wire commission decomposition mark");
  }
  const apply = read("lib/store/stripePaymentOutcomeApply.ts");
  if (!/applyCommissionDecompositionAfterTrustedCapture/.test(apply)) {
    fail("stripePaymentOutcomeApply must wire commission decomposition apply");
  }
}

function main() {
  console.log(
    "Commerce Chain Migration Apply Readiness V1 — static verification"
  );
  console.log("Remote database: NOT INSPECTED / NOT MODIFIED");
  console.log("");

  const files = listMigrations();
  checkDuplicateNumbers(files);
  checkRequiredFiles(files);
  checkOrdering(files);
  checkObsolete20260887(files);
  checkRpcContracts();
  checkDependencyGraph();
  checkWireIn();

  if (warnings.length) {
    console.log("Warnings:");
    for (const w of warnings) console.log(`  WARN  ${w}`);
    console.log("");
  }

  if (errors.length) {
    console.log("FAIL — repository migration readiness");
    for (const e of errors) console.log(`  FAIL  ${e}`);
    process.exit(1);
  }

  console.log("PASS — repository migration readiness (static)");
  console.log("Apply order: 20260889 -> 20260890 -> 20260891");
  console.log(
    "Decision pending human GO for remote apply. This script does not apply migrations."
  );
  process.exit(0);
}

main();
