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

  it("prepares stale participant prune migration without client grants", () => {
    const sql = read(
      "supabase/migrations/20260727_live_stale_participant_prune.sql"
    );
    expect(sql).toMatch(/prune_stale_live_participants/);
    expect(sql).toMatch(/do not apply remotely until approved/i);
    expect(sql).toMatch(/revoke all[\s\S]*authenticated/i);
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
