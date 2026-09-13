/**
 * Learning Production Smoke — Live join fail-closed when LiveKit unset / gate denies.
 */

import { afterEach, describe, expect, it } from "vitest";
import { requestLearningLiveJoin } from "./liveCalendarFoundation";

const SESSION = "e2e60803-0001-4000-8000-0000000000s1";

function fakeRpcClient(handlers: {
  gate?: Record<string, unknown> | null;
  gateError?: string;
  attendanceError?: string;
}) {
  return {
    rpc: async (name: string) => {
      if (name === "get_learning_live_session_join_gate") {
        if (handlers.gateError) {
          return { data: null, error: { message: handlers.gateError } };
        }
        return { data: handlers.gate ?? null, error: null };
      }
      if (name === "upsert_learning_live_attendance") {
        if (handlers.attendanceError) {
          return { data: null, error: { message: handlers.attendanceError } };
        }
        return { data: { ok: true }, error: null };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    },
  };
}

const LIVEKIT_KEYS = [
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "LIVEKIT_URL",
  "NEXT_PUBLIC_LIVEKIT_URL",
] as const;

describe("learning live join fail-closed", () => {
  const prior: Partial<Record<(typeof LIVEKIT_KEYS)[number], string | undefined>> =
    {};

  afterEach(() => {
    for (const k of LIVEKIT_KEYS) {
      if (k in prior) {
        if (prior[k] === undefined) delete process.env[k];
        else process.env[k] = prior[k];
      }
    }
  });

  function clearLiveKitEnv() {
    for (const k of LIVEKIT_KEYS) {
      prior[k] = process.env[k];
      delete process.env[k];
    }
  }

  it("returns blocker and null token when gate denies join", async () => {
    clearLiveKitEnv();
    const client = fakeRpcClient({
      gate: {
        can_join: false,
        reason: "outside_window",
        sfu_room_name: "room-a",
        identity: "user-a",
        status: "scheduled",
        role: "learner",
        can_publish_audio: false,
        can_publish_video: false,
        can_share_screen: false,
      },
    });
    const result = await requestLearningLiveJoin(client as never, SESSION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.token).toBeNull();
    expect(result.data.blocker).toBe("outside_window");
    expect(result.data.mediaReady).toBe(false);
  });

  it("fail-closes token issuance when LiveKit env is unset after gate allows join", async () => {
    clearLiveKitEnv();
    const client = fakeRpcClient({
      gate: {
        can_join: true,
        reason: null,
        sfu_room_name: "room-b",
        identity: "user-b",
        status: "live",
        role: "learner",
        can_publish_audio: false,
        can_publish_video: false,
        can_share_screen: false,
      },
    });
    const result = await requestLearningLiveJoin(client as never, SESSION);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mediaReady).toBe(false);
    expect(result.data.token).toBeNull();
    expect(result.data.livekitUrl).toBeNull();
    expect(result.data.blocker).toMatch(/Live media is not configured/i);
  });

  it("propagates gate RPC failure as ok:false (no forged token)", async () => {
    clearLiveKitEnv();
    const client = fakeRpcClient({ gateError: "Not entitled to this course" });
    const result = await requestLearningLiveJoin(client as never, SESSION);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message.toLowerCase()).toMatch(/entitle|not|fail|gate|course/);
  });
});
