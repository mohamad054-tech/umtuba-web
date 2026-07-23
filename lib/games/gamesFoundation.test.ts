import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GAMES_AUTHORITATIVE_RESULT_DENYLIST,
  GAMES_INTERNAL_HELPERS,
  GAMES_LIMITS,
  GAMES_PRIVACY_DEFAULTS,
  GAMES_PUBLIC_RPCS,
  GAMES_RESERVED_INTEGRATION_KEYS,
  GAMES_RESULT_VALIDATION_MODES,
  GAMES_SESSION_STATUSES,
  GAMES_UM_POINTS_DENYLIST,
  canSubmitGameSession,
  canTransitionGameSession,
  defaultPrivacySettings,
  mergeAchievementUnlockIds,
  validateClientResultClaim,
  validateIdempotencyKey,
  validatePrivacySettingsPatch,
  validateReservedIntegrationFields,
  validateScoreClaim,
} from "./gamesFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260842_games_platform_foundation_v1.sql";
const DOC = "docs/games/implementation/GAMES_PLATFORM_FOUNDATION_V1.md";
const MODULE = "lib/games/gamesFoundation.ts";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

function fnBody(sql: string, name: string) {
  const fnStarts = [
    ...sql.matchAll(/create or replace function public\.(\w+)/g),
  ];
  const idx = fnStarts.findIndex((m) => m[1] === name);
  if (idx < 0) throw new Error(`function ${name} not found`);
  const start = fnStarts[idx].index ?? 0;
  const end =
    idx + 1 < fnStarts.length
      ? (fnStarts[idx + 1].index ?? sql.length)
      : sql.length;
  return sql.slice(start, end);
}

describe("Games Platform Foundation V1 — files & ordering", () => {
  it("ships migration, module, docs; 20260842 after 20260841", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, MODULE))).toBe(true);
    expect(MIGRATION > "supabase/migrations/20260841_learning_learner_result_delivery_v1.sql").toBe(
      true
    );
  });

  it("does not reuse prior migration versions", () => {
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    const hits = migrations.filter((f) => f.startsWith("20260842"));
    expect(hits).toEqual(["20260842_games_platform_foundation_v1.sql"]);
  });
});

describe("Games Platform Foundation V1 — privacy defaults", () => {
  it("defaults are all private / opt-in false", () => {
    expect(GAMES_PRIVACY_DEFAULTS).toEqual({
      share_achievements: false,
      share_best_score: false,
      share_level_or_progress: false,
      share_activity: false,
    });
    expect(defaultPrivacySettings()).toEqual(GAMES_PRIVACY_DEFAULTS);
  });

  it("SQL defaults privacy columns to false", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/share_achievements boolean not null default false/);
    expect(sql).toMatch(/share_best_score boolean not null default false/);
    expect(sql).toMatch(/share_level_or_progress boolean not null default false/);
    expect(sql).toMatch(/share_activity boolean not null default false/);
  });
});

describe("Games Platform Foundation V1 — claim validation", () => {
  it("accepts allowlisted finite non-negative score", () => {
    const r = validateClientResultClaim({ score: 12.5, level: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.score).toBe(12.5);
      expect(r.value.level).toBe(2);
    }
  });

  it("rejects unknown result fields", () => {
    expect(
      validateClientResultClaim({ score: 1, combo: 9 }).ok
    ).toBe(false);
    expect(
      validateClientResultClaim({ score: 1, combo: 9 })
    ).toMatchObject({ reason: "unknown_claim_field" });
  });

  it("rejects server-authoritative fields", () => {
    for (const key of [
      "server_score",
      "awarded_points",
      "um_points",
      "anti_cheat_passed",
      "best_score",
    ]) {
      expect(
        validateClientResultClaim({ score: 1, [key]: true }).ok
      ).toBe(false);
      expect(
        validateClientResultClaim({ score: 1, [key]: true })
      ).toMatchObject({ reason: "authoritative_field_forbidden" });
    }
    expect(GAMES_AUTHORITATIVE_RESULT_DENYLIST.length).toBeGreaterThan(5);
  });

  it("rejects negative scores", () => {
    expect(validateScoreClaim(-1)).toMatchObject({
      ok: false,
      reason: "score_negative",
    });
    expect(validateClientResultClaim({ score: -5 }).ok).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(validateScoreClaim(Number.NaN).ok).toBe(false);
    expect(validateScoreClaim(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(validateScoreClaim(Number.NEGATIVE_INFINITY).ok).toBe(false);
    expect(validateClientResultClaim({ score: Number.NaN }).ok).toBe(false);
  });

  it("rejects oversized metadata", () => {
    const big = "x".repeat(GAMES_LIMITS.clientMetaMaxBytes + 50);
    const r = validateClientResultClaim({
      score: 1,
      client_meta: { note: big },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("client_meta_too_large");
  });
});

describe("Games Platform Foundation V1 — sessions & transitions", () => {
  it("lists required session statuses", () => {
    expect([...GAMES_SESSION_STATUSES]).toEqual([
      "active",
      "submitted",
      "accepted",
      "rejected",
      "expired",
      "cancelled",
    ]);
  });

  it("rejects invalid session transitions", () => {
    expect(canTransitionGameSession("accepted", "active")).toBe(false);
    expect(canTransitionGameSession("expired", "submitted")).toBe(false);
    expect(canTransitionGameSession("rejected", "accepted")).toBe(false);
    expect(canTransitionGameSession("active", "accepted")).toBe(true);
  });

  it("expired session cannot submit", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(canSubmitGameSession("active", past).ok).toBe(false);
    expect(canSubmitGameSession("expired", null).ok).toBe(false);
    expect(
      canSubmitGameSession(
        "active",
        new Date(Date.now() + 60_000).toISOString()
      ).ok
    ).toBe(true);
  });
});

describe("Games Platform Foundation V1 — idempotency & achievements", () => {
  it("validates idempotency keys", () => {
    expect(validateIdempotencyKey("run-1").ok).toBe(true);
    expect(validateIdempotencyKey("").ok).toBe(false);
    expect(validateIdempotencyKey("bad key").ok).toBe(false);
  });

  it("SQL enforces unique idempotency per user+game and session uniqueness", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /constraint game_session_results_user_game_idempotency_unique/
    );
    expect(sql).toMatch(/constraint game_session_results_session_unique/);
    const submit = fnBody(sql, "submit_game_session_result");
    expect(submit).toMatch(/idempotent_replay/);
  });

  it("achievement unlock merge is idempotent", () => {
    expect(mergeAchievementUnlockIds(["a", "b"], ["b", "c"])).toEqual([
      "a",
      "b",
      "c",
    ]);
    const sql = read(MIGRATION);
    const apply = fnBody(sql, "game_apply_accepted_result");
    expect(apply).toMatch(/on conflict \(user_id, achievement_id\) do nothing/);
  });
});

describe("Games Platform Foundation V1 — security contracts (SQL)", () => {
  const sql = read(MIGRATION);
  const code = stripSqlComments(sql);

  it("player cannot access another player session (shared deny)", () => {
    const getFn = fnBody(sql, "get_my_game_session");
    const submitFn = fnBody(sql, "submit_game_session_result");
    expect(getFn).toMatch(/Not allowed to read this game session/);
    expect(submitFn).toMatch(/Not allowed to submit this game session/);
    expect(getFn).toMatch(/v_session\.user_id is distinct from v_uid/);
    expect(submitFn).toMatch(/v_session\.user_id is distinct from v_uid/);
  });

  it("one active session per user+game", () => {
    expect(sql).toMatch(/game_sessions_one_active_uidx/);
    expect(sql).toMatch(
      /on public\.game_sessions \(user_id, game_id\)\s+where status = 'active'/
    );
  });

  it("no UM Points award function or balance mutation in Games V1", () => {
    // Executable SQL only — comments may mention the firewall by name.
    expect(code).not.toMatch(/award_um_points_to_user\s*\(/);
    expect(code).not.toMatch(/perform\s+public\.award_um_points/i);
    expect(code).not.toMatch(/insert\s+into\s+public\.um_points_ledger/i);
    expect(code).not.toMatch(/update\s+public\.um_point_balances/i);
    expect(code).not.toMatch(/from\s+public\.um_point_balances/i);

    const moduleSrc = read(MODULE);
    expect(moduleSrc).not.toMatch(/award_um_points_to_user\s*\(/);
    expect(moduleSrc).not.toMatch(/from\(\s*['"]um_point_balances['"]\s*\)/);
    // Denylist constants are intentional documentation of banned surfaces.
    for (const banned of GAMES_UM_POINTS_DENYLIST) {
      expect(GAMES_UM_POINTS_DENYLIST as readonly string[]).toContain(banned);
    }
  });

  it("reserved future fields are nullable and have no FKs", () => {
    for (const key of GAMES_RESERVED_INTEGRATION_KEYS) {
      expect(sql).toMatch(new RegExp(`${key} uuid`));
    }
    expect(code).not.toMatch(
      /city_id uuid[\s\S]{0,40}references/i
    );
    expect(
      validateReservedIntegrationFields({
        city_id: "abc",
        world_event_id: null,
      }).ok
    ).toBe(true);
    expect(
      validateReservedIntegrationFields({ city_id: 123 }).ok
    ).toBe(false);
  });

  it("public leaderboard / cross-player read policy is absent", () => {
    // No ranking tables/policies; owner-only SELECTs only.
    expect(code).not.toMatch(/create table[\s\S]{0,80}leaderboard/i);
    expect(sql).not.toMatch(/Players read all game progress/i);
    expect(sql).not.toMatch(/Public read game session results/i);
    expect(sql).not.toMatch(/Players read others/i);
    expect(sql).not.toMatch(
      /using\s*\(\s*share_achievements\s*=\s*true/i
    );
  });

  it("internal helpers revoked from authenticated; public RPCs granted", () => {
    for (const name of Object.values(GAMES_INTERNAL_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}[\\s\\S]*?from public, anon, authenticated`
        )
      );
    }
    for (const name of Object.values(GAMES_PUBLIC_RPCS)) {
      expect(sql).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}[\\s\\S]*?to authenticated`
        )
      );
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}[\\s\\S]*?from public, anon`
        )
      );
    }
  });

  it("FORCE RLS on sensitive tables; RPC-only writes", () => {
    for (const table of [
      "game_sessions",
      "game_session_results",
      "game_player_progress",
      "game_player_achievements",
      "game_privacy_settings",
    ]) {
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table} force row level security`)
      );
      expect(sql).toMatch(
        new RegExp(
          `revoke insert, update, delete on table public\\.${table}`
        )
      );
    }
  });

  it("result_validation_mode is fail_closed only", () => {
    expect([...GAMES_RESULT_VALIDATION_MODES]).toEqual(["fail_closed"]);
    expect(sql).toMatch(/result_validation_mode in \('fail_closed'\)/);
  });

  it("does not activate Ads placements or invent Ads game ids as PK", () => {
    expect(code).not.toMatch(/placementRegistry/);
    expect(code).not.toMatch(/games_promo/);
    expect(sql).toMatch(/game_key/);
    expect(sql).not.toMatch(/owningProduct/);
  });

  it("creates exactly the eight foundation tables", () => {
    const created = [
      ...sql.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]);
    expect(created).toEqual([
      "games",
      "game_player_profiles",
      "game_privacy_settings",
      "game_sessions",
      "game_session_results",
      "game_player_progress",
      "game_achievements",
      "game_player_achievements",
    ]);
  });
});

describe("Games Platform Foundation V1 — privacy patch", () => {
  it("accepts boolean opt-in patch only", () => {
    expect(
      validatePrivacySettingsPatch({ share_achievements: true }).ok
    ).toBe(true);
    expect(
      validatePrivacySettingsPatch({ share_achievements: "yes" }).ok
    ).toBe(false);
    expect(
      validatePrivacySettingsPatch({ unknown: true }).ok
    ).toBe(false);
  });
});
