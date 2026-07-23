import { describe, expect, it } from "vitest";
import {
  GAMES_CATALOG_FEATURE_FLAG_DEFAULTS,
  type GamesCatalogEntryView,
} from "./gamesCatalog";
import {
  GAMES_HUB_RUNTIME_AUTHORITY,
  abandonGamesRuntimeSession,
  buildGamesHubDomainContract,
  canTransitionGamesRuntimeLifecycle,
  completeGamesRuntimeSession,
  evaluateGamesRuntimeEligibility,
  evaluateGamesRuntimeLifecycleTransition,
  expireGamesRuntimeSession,
  finalizeGamesRuntimeSession,
  resumeGamesRuntimeSession,
  startGamesRuntimeSession,
  type GamesRuntimeSessionContract,
} from "./gamesHubRuntime";

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const PLAYER_A = "player.user-a";
const PLAYER_B = "player.user-b";
const NOW = "2026-07-24T00:00:00.000Z";

function playableEntry(
  overrides: Partial<GamesCatalogEntryView> = {}
): GamesCatalogEntryView {
  return {
    id: GAME_ID,
    game_key: "sample_game",
    slug: "sample-game",
    name: "Sample Game",
    description: "A foundation sample",
    short_blurb: "sample",
    status: "active",
    availability: "available",
    visibility: "listed",
    category: "casual",
    difficulty: "easy",
    min_players: 1,
    max_players: 1,
    platforms: ["web"],
    feature_flags: { ...GAMES_CATALOG_FEATURE_FLAG_DEFAULTS },
    catalog_version: 1,
    content_version: "1.0.0",
    sort_order: 10,
    is_featured: false,
    result_validation_mode: "fail_closed",
    session_ttl_seconds: 3600,
    ...overrides,
  };
}

function activeSession(
  overrides: Partial<GamesRuntimeSessionContract> = {}
): GamesRuntimeSessionContract {
  const started = startGamesRuntimeSession({
    catalogEntry: playableEntry(),
    playerId: PLAYER_A,
    nowIso: NOW,
  });
  if (!started.ok) throw new Error(started.reason);
  return { ...started.value, ...overrides };
}

describe("Games Hub / Runtime Foundation V1 — authority", () => {
  it("keeps runtime authority closed", () => {
    expect(GAMES_HUB_RUNTIME_AUTHORITY.runsActualGameServer).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.grantsRewards).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.acceptsClientResultAsAuthoritative).toBe(
      false
    );
    expect(GAMES_HUB_RUNTIME_AUTHORITY.multiplayerEnabled).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.matchmakingEnabled).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.appliesMigrations).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.publicApiEnabled).toBe(false);
    expect(
      GAMES_HUB_RUNTIME_AUTHORITY.productionRuntimeEndpointEnabled
    ).toBe(false);
  });
});

describe("Games Hub / Runtime Foundation V1 — hub domain", () => {
  it("builds hub contracts from trusted catalog entries", () => {
    const hub = buildGamesHubDomainContract(playableEntry());
    expect(hub.ok).toBe(true);
    if (hub.ok) {
      expect(hub.value.gameId).toBe(GAME_ID);
      expect(hub.value.title).toBe("Sample Game");
      expect(hub.value.supportedModes).toEqual(["solo"]);
      expect(hub.value.runtimeEligible).toBe(true);
      expect(hub.value.grantsRewards).toBe(false);
    }
  });
});

describe("Games Hub / Runtime Foundation V1 — eligibility fail-closed", () => {
  it("accepts playable catalog entries", () => {
    const report = evaluateGamesRuntimeEligibility(playableEntry());
    expect(report.ok).toBe(true);
    expect(report.reason).toBe("eligible");
  });

  it("rejects draft, archived, maintenance, suspended, coming_soon", () => {
    expect(
      evaluateGamesRuntimeEligibility(playableEntry({ status: "draft" })).reason
    ).toBe("game_draft");
    expect(
      evaluateGamesRuntimeEligibility(playableEntry({ status: "archived" }))
        .reason
    ).toBe("game_archived");
    expect(
      evaluateGamesRuntimeEligibility(
        playableEntry({ availability: "maintenance" })
      ).reason
    ).toBe("under_maintenance");
    expect(
      evaluateGamesRuntimeEligibility(
        playableEntry({ availability: "unavailable" })
      ).reason
    ).toBe("game_suspended");
    expect(
      evaluateGamesRuntimeEligibility(
        playableEntry({ availability: "coming_soon" })
      ).reason
    ).toBe("unavailable_for_player");
  });

  it("rejects missing runtime metadata and disabled sessions", () => {
    expect(
      evaluateGamesRuntimeEligibility(
        playableEntry({ game_key: undefined as unknown as string })
      ).reason
    ).toBe("missing_runtime_metadata");
    expect(
      evaluateGamesRuntimeEligibility(
        playableEntry({
          feature_flags: {
            ...GAMES_CATALOG_FEATURE_FLAG_DEFAULTS,
            sessions_enabled: false,
          },
        })
      ).reason
    ).toBe("sessions_disabled");
  });

  it("rejects unavailable games on start", () => {
    const started = startGamesRuntimeSession({
      catalogEntry: playableEntry({ availability: "unavailable" }),
      playerId: PLAYER_A,
      nowIso: NOW,
    });
    expect(started.ok).toBe(false);
    if (!started.ok) expect(started.reason).toBe("game_suspended");
  });
});

describe("Games Hub / Runtime Foundation V1 — lifecycle", () => {
  it("allows explicit transitions and forbids illegal ones", () => {
    expect(canTransitionGamesRuntimeLifecycle("created", "active")).toBe(true);
    expect(canTransitionGamesRuntimeLifecycle("active", "paused")).toBe(true);
    expect(canTransitionGamesRuntimeLifecycle("active", "completed")).toBe(
      true
    );
    expect(canTransitionGamesRuntimeLifecycle("paused", "active")).toBe(true);
    expect(canTransitionGamesRuntimeLifecycle("completed", "active")).toBe(
      false
    );
    expect(canTransitionGamesRuntimeLifecycle("abandoned", "active")).toBe(
      false
    );
    expect(
      evaluateGamesRuntimeLifecycleTransition({
        from: "expired",
        to: "active",
      }).ok
    ).toBe(false);
  });
});

describe("Games Hub / Runtime Foundation V1 — start / resume", () => {
  it("starts from trusted catalog and ignores client-forged playability intent", () => {
    const started = startGamesRuntimeSession({
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      mode: "solo",
      nowIso: NOW,
    });
    expect(started.ok).toBe(true);
    if (started.ok) {
      expect(started.value.lifecycleState).toBe("active");
      expect(started.value.finalized).toBe(false);
      expect(started.value.runsActualGameServer).toBe(false);
    }
  });

  it("rejects a second active session for the same player/game", () => {
    const first = activeSession();
    const second = startGamesRuntimeSession({
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      nowIso: NOW,
      existingActiveSessions: [first],
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("active_session_already_exists");
  });

  it("rejects invalid reconnect (other player, terminal, unavailable game)", () => {
    const session = activeSession();

    const otherPlayer = resumeGamesRuntimeSession({
      session,
      catalogEntry: playableEntry(),
      playerId: PLAYER_B,
      nowIso: NOW,
    });
    expect(otherPlayer.ok).toBe(false);
    if (!otherPlayer.ok) expect(otherPlayer.reason).toBe("session_owner_mismatch");

    const terminal = resumeGamesRuntimeSession({
      session: { ...session, lifecycleState: "completed", finalized: true },
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      nowIso: NOW,
    });
    expect(terminal.ok).toBe(false);
    if (!terminal.ok) expect(terminal.reason).toBe("session_terminal");

    const unavailable = resumeGamesRuntimeSession({
      session,
      catalogEntry: playableEntry({ availability: "maintenance" }),
      playerId: PLAYER_A,
      nowIso: NOW,
    });
    expect(unavailable.ok).toBe(false);
    if (!unavailable.ok) expect(unavailable.reason).toBe("under_maintenance");
  });

  it("resumes paused sessions for the owner when game remains eligible", () => {
    const session = activeSession({ lifecycleState: "paused" });
    const resumed = resumeGamesRuntimeSession({
      session,
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      nowIso: "2026-07-24T00:10:00.000Z",
    });
    expect(resumed.ok).toBe(true);
    if (resumed.ok) expect(resumed.value.lifecycleState).toBe("active");
  });
});

describe("Games Hub / Runtime Foundation V1 — completion / abandon / expiry", () => {
  it("rejects client-forged authoritative results", () => {
    const session = activeSession();
    const forged = completeGamesRuntimeSession({
      session,
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      idempotencyKey: "idem-1",
      clientClaim: {
        score: 10,
        um_points: 999,
        accepted: true,
      },
    });
    expect(forged.ok).toBe(false);
    if (!forged.ok) {
      expect(forged.reason).toBe("authoritative_field_forbidden");
    }
  });

  it("prepares completion handoff without granting rewards", () => {
    const session = activeSession();
    const completed = completeGamesRuntimeSession({
      session,
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      idempotencyKey: "idem-ok",
      clientClaim: { score: 42, level: 2 },
    });
    expect(completed.ok).toBe(true);
    if (completed.ok) {
      expect(completed.session.lifecycleState).toBe("completed");
      expect(completed.session.finalized).toBe(true);
      expect(completed.handoff.grantsRewards).toBe(false);
      expect(completed.handoff.acceptsClientResultAsAuthoritative).toBe(false);
      expect(completed.handoff.applied).toBe(false);
      expect(completed.handoff.preparesGameResult).toBe(true);
    }
  });

  it("supports idempotent double completion", () => {
    const session = activeSession();
    const first = completeGamesRuntimeSession({
      session,
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      idempotencyKey: "idem-dup",
      clientClaim: { score: 7 },
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = completeGamesRuntimeSession({
      session: first.session,
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      idempotencyKey: "idem-dup",
      clientClaim: { score: 7 },
    });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.handoff.applied).toBe(false);
      expect(second.session.finalized).toBe(true);
    }
  });

  it("abandons and expires with idempotent finalization", () => {
    const session = activeSession();
    const abandoned = abandonGamesRuntimeSession({
      session,
      playerId: PLAYER_A,
      nowIso: NOW,
    });
    expect(abandoned.ok).toBe(true);
    if (!abandoned.ok) return;
    expect(abandoned.value.lifecycleState).toBe("abandoned");
    expect(abandoned.value.finalized).toBe(true);

    const replay = finalizeGamesRuntimeSession({
      session: abandoned.value,
      to: "abandoned",
      playerId: PLAYER_A,
      allowIdempotentReplay: true,
    });
    expect(replay.ok).toBe(true);

    const expirable = activeSession({
      expiresAt: "2026-07-23T23:00:00.000Z",
    });
    const expired = expireGamesRuntimeSession({
      session: expirable,
      nowIso: NOW,
    });
    expect(expired.ok).toBe(true);
    if (expired.ok) {
      expect(expired.value.lifecycleState).toBe("expired");
      expect(expired.value.finalized).toBe(true);
    }

    const notDue = expireGamesRuntimeSession({
      session: activeSession({
        expiresAt: "2026-07-24T12:00:00.000Z",
      }),
      nowIso: NOW,
    });
    expect(notDue.ok).toBe(false);
  });
});
