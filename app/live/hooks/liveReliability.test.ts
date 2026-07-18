import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  LIVE_MEDIA_MAX_RECONNECT_ATTEMPTS,
  LIVE_MEDIA_TOKEN_REFRESH_LEAD_SECONDS,
  LIVE_MEDIA_TOKEN_TTL_SECONDS,
  LIVE_PARTICIPANT_STALE_SECONDS,
  isIntentionalLiveDisconnectReason,
  liveMediaConnectionLabel,
  liveMediaReconnectDelayMs,
  liveMediaTokenRefreshDelayMs,
} from "./liveSessionPolicy";
import { classifyMediaCaptureError } from "./mediaDeviceErrors";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("liveSessionPolicy", () => {
  it("documents token TTL and refresh lead", () => {
    expect(LIVE_MEDIA_TOKEN_TTL_SECONDS).toBe(720);
    expect(LIVE_MEDIA_TOKEN_REFRESH_LEAD_SECONDS).toBe(90);
    expect(LIVE_MEDIA_MAX_RECONNECT_ATTEMPTS).toBe(8);
    expect(LIVE_PARTICIPANT_STALE_SECONDS).toBe(120);
  });

  it("schedules token refresh before expiry", () => {
    const now = 1_000_000_000_000;
    const expiresAt = Math.floor(now / 1000) + 720;
    const delay = liveMediaTokenRefreshDelayMs(expiresAt, now);
    expect(delay).toBe((720 - 90) * 1000);
  });

  it("returns 0 delay when refresh window already passed", () => {
    const now = 1_000_000_000_000;
    const expiresAt = Math.floor(now / 1000) + 30;
    expect(liveMediaTokenRefreshDelayMs(expiresAt, now)).toBe(0);
  });

  it("backs off reconnect delays", () => {
    expect(liveMediaReconnectDelayMs(0)).toBe(1_200);
    expect(liveMediaReconnectDelayMs(1)).toBe(2_400);
    expect(liveMediaReconnectDelayMs(10)).toBe(12_000);
  });

  it("labels connecting / reconnecting / network interrupted", () => {
    expect(liveMediaConnectionLabel("connecting")).toMatch(/Connecting/);
    expect(liveMediaConnectionLabel("reconnecting")).toMatch(/Reconnecting/);
    expect(liveMediaConnectionLabel("error")).toMatch(/Network interrupted/);
    expect(liveMediaConnectionLabel("connected", "poor")).toBe("Poor");
  });

  it("detects intentional disconnect reasons", () => {
    expect(isIntentionalLiveDisconnectReason("client initiated disconnect")).toBe(
      true
    );
    expect(isIntentionalLiveDisconnectReason("room ended")).toBe(true);
    expect(isIntentionalLiveDisconnectReason("websocket error")).toBe(false);
  });
});

describe("live reliability contracts", () => {
  it("auto-reconnects and refreshes tokens in the media session", () => {
    const session = read("app/live/hooks/useLiveMediaSession.ts");
    expect(session).toMatch(/scheduleUnexpectedReconnect/);
    expect(session).toMatch(/scheduleTokenRefresh/);
    expect(session).toMatch(/expiresAt/);
    expect(session).toMatch(/desiredDevicesRef/);
    expect(session).toMatch(/restoreDesiredDevices/);
    expect(session).toMatch(/removeAllListeners/);
    // Connect effect deps: displayName hydration must not remount the SFU session.
    expect(session).toMatch(
      /tokenEpoch,\s*anonIdentity,\s*forcePublish,\s*rebuildTiles/
    );
    expect(session).not.toMatch(
      /tokenEpoch,\s*anonIdentity,\s*displayName,\s*forcePublish/
    );
  });

  it("uses membership mutex, pagehide leave, and host leave ≠ end", () => {
    const membership = read("app/live/hooks/useLiveRoomMembership.ts");
    const experience = read("app/live/LiveRoomExperience.tsx");
    const leaveRoute = read("app/api/live/leave/route.ts");
    const signal = read("app/live/lib/signalLiveLeave.ts");

    expect(membership).toMatch(/joinInFlightRef/);
    expect(membership).toMatch(/pagehide/);
    expect(membership).toMatch(/signalLiveLeave/);
    expect(membership).toMatch(/heartbeatLiveParticipantAction/);
    expect(signal).toMatch(/keepalive:\s*true/);
    expect(leaveRoute).toMatch(/leaveLiveRoom/);
    expect(experience).toMatch(/useLiveRoomMembership/);
    expect(experience).toMatch(/endIfHost:\s*false/);
    expect(experience).toMatch(/Network interrupted/);
    expect(experience).toMatch(/Live ended/);
  });

  it("fails closed without media identity and keeps stable anon keys", () => {
    const mint = read("lib/livekit/server.ts");
    const viewerKey = read("app/lib/social/shareAndViews.ts");
    expect(mint).toMatch(/Missing media identity/);
    expect(mint).not.toMatch(/Math\.random\(\)/);
    expect(viewerKey).toMatch(/memoryViewerKey/);
  });

  it("ships B7 prune migration without client execute grants", () => {
    const sql = read(
      "supabase/migrations/20260727_live_stale_participant_prune.sql"
    );
    expect(sql).toMatch(/prune_stale_live_participants/);
    expect(sql).toMatch(/last_seen_at/);
    expect(sql).toMatch(/refresh_live_room_viewer_count/);
    expect(sql).toMatch(/is distinct from 'host'/);
    expect(sql).toMatch(
      /revoke all on function public\.prune_stale_live_participants\(integer\) from public;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.prune_stale_live_participants\(integer\) from anon, authenticated;/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.prune_stale_live_participants/i
    );
    expect(sql).not.toMatch(/do not apply remotely until approved/i);
  });

  it("ships B7 verify script covering grants and stale rules", () => {
    const verify = read("scripts/verify-live-stale-participant-prune.sql");
    expect(verify).toMatch(/prune_rpc_exists/);
    expect(verify).toMatch(/prune_rpc_no_anon_execute/);
    expect(verify).toMatch(/prune_rpc_no_authenticated_execute/);
    expect(verify).toMatch(/prune_body_marks_stale_non_hosts/);
    expect(verify).toMatch(/prune_body_refreshes_viewer_counts/);
    expect(verify).toMatch(/prune_enforces_minimum_stale_window/);
    expect(verify).toMatch(/refresh_viewer_count_still_not_client_callable/);
    expect(verify).toMatch(/20260727_live_stale_participant_prune\.sql/);
  });

  it("enforces minimum stale window and host exclusion in prune body", () => {
    const sql = read(
      "supabase/migrations/20260727_live_stale_participant_prune.sql"
    );
    expect(sql).toMatch(/p_stale_seconds < 60/);
    expect(sql).toMatch(/p_stale_seconds := 120/);
    expect(sql).toMatch(/is distinct from 'host'/);
    expect(LIVE_PARTICIPANT_STALE_SECONDS).toBe(120);
  });

  it("prevents duplicate participant rows and keeps join reconnect idempotent", () => {
    const foundation = read(
      "supabase/migrations/20260713_live_streaming_v1_foundation.sql"
    );
    expect(foundation).toMatch(/create table if not exists public\.live_participants/);
    expect(foundation).toMatch(/primary key \(room_id, user_id\)/);
    expect(foundation).toMatch(/on conflict \(room_id, user_id\) do update/);
    expect(foundation).toMatch(/left_at = null/);
    expect(foundation).toMatch(/last_seen_at = now\(\)/);
  });

  it("keeps leave idempotent, protects host, and cleans up on end", () => {
    const foundation = read(
      "supabase/migrations/20260713_live_streaming_v1_foundation.sql"
    );
    const mediaV2 = read(
      "supabase/migrations/20260714_live_media_v2_multi_guest.sql"
    );

    expect(foundation).toMatch(/create or replace function public\.leave_live_room/);
    expect(foundation).toMatch(/Host must remain a participant/);
    expect(foundation).toMatch(/and left_at is null/);
    expect(mediaV2).toMatch(/create or replace function public\.end_live_room/);
    expect(mediaV2).toMatch(/left_at = coalesce\(left_at, v_now\)/);
    expect(mediaV2).toMatch(/refresh_live_room_viewer_count/);
  });

  it("keeps viewer_count refresh non-client and based on active participants", () => {
    const foundation = read(
      "supabase/migrations/20260713_live_streaming_v1_foundation.sql"
    );
    expect(foundation).toMatch(
      /create or replace function public\.refresh_live_room_viewer_count/
    );
    expect(foundation).toMatch(/left_at is null/);
    expect(foundation).toMatch(
      /revoke all on function public\.refresh_live_room_viewer_count\(uuid\) from public;/i
    );
    expect(foundation).not.toMatch(
      /grant execute on function public\.refresh_live_room_viewer_count/i
    );
  });

  it("separates Realtime watching presence from DB viewer_count", () => {
    const presence = read("app/live/hooks/useLiveRoomPresence.ts");
    const membership = read("app/live/hooks/useLiveRoomMembership.ts");
    expect(presence).toMatch(/live-presence:/);
    expect(presence).toMatch(/track\(/);
    expect(membership).toMatch(/onViewerCount/);
    expect(membership).toMatch(/joinLiveRoomAction|leaveLiveRoomAction/);
  });

  it("locks live_participants writes behind RPCs (RLS grants)", () => {
    const foundation = read(
      "supabase/migrations/20260713_live_streaming_v1_foundation.sql"
    );
    expect(foundation).toMatch(
      /alter table public\.live_participants enable row level security;/
    );
    expect(foundation).toMatch(
      /revoke insert, delete on table public\.live_participants from authenticated, anon;/i
    );
    expect(foundation).toMatch(
      /revoke update on table public\.live_participants from authenticated;/i
    );
    expect(foundation).toMatch(
      /grant execute on function public\.join_live_room\(uuid\) to authenticated;/i
    );
    expect(foundation).toMatch(
      /grant execute on function public\.leave_live_room\(uuid\) to authenticated;/i
    );
    expect(foundation).toMatch(
      /grant execute on function public\.heartbeat_live_participant\(uuid\) to authenticated;/i
    );
  });

  it("documents GitHub cron schedule and DATABASE_URL secret requirement", () => {
    const workflow = read(
      ".github/workflows/prune-stale-live-participants.yml"
    );
    expect(workflow).toMatch(/cron:\s*"\*\/5 \* \* \* \*"/);
    expect(workflow).toMatch(/workflow_dispatch:/);
    expect(workflow).toMatch(/secrets\.DATABASE_URL/);
    expect(workflow).toMatch(/DATABASE_URL secret is not set/);
    expect(workflow).toMatch(
      /select public\.prune_stale_live_participants\(120\);/
    );
    expect(workflow).toMatch(/Never commit DATABASE_URL|Do not print DATABASE_URL/i);
    expect(workflow).not.toMatch(/echo "\$\{?DATABASE_URL\}?"/);
  });

  it("documents B7 as a required migration with verify + cron ops", () => {
    const readme = read("supabase/README.md");
    expect(readme).toMatch(/20260727_live_stale_participant_prune\.sql/);
    expect(readme).toMatch(/verify-live-stale-participant-prune\.sql/);
    expect(readme).toMatch(/DATABASE_URL/);
    expect(readme).toMatch(/prune-stale-live-participants\.yml/);
    const b7Section = readme.slice(
      readme.indexOf("20260727_live_stale_participant_prune.sql"),
      readme.indexOf("24. Click **Run**")
    );
    expect(b7Section).not.toMatch(/Prepared — apply only after review/i);
  });

  it("classifies camera and microphone denial for UI feedback", () => {
    expect(
      classifyMediaCaptureError(
        { name: "NotAllowedError", message: "denied" },
        "camera"
      )
    ).toMatch(/Camera permission was denied/i);
    expect(
      classifyMediaCaptureError(
        { name: "NotAllowedError", message: "denied" },
        "microphone"
      )
    ).toMatch(/Microphone permission was denied/i);
  });

  it("presence subscribe timeout does not fire after joined", () => {
    const presence = read("app/live/hooks/useLiveRoomPresence.ts");
    expect(presence).toMatch(/channelRef\.current\?\.state === ["']joined["']/);
  });
});
