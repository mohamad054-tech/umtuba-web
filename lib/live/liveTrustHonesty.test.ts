import { describe, expect, it } from "vitest";
import {
  buildLiveBetaReadiness,
  isTechnicalLiveMessage,
  LIVE_MEDIA_NOT_CONFIGURED_MESSAGE,
  LIVE_TEMPORARILY_UNAVAILABLE_MESSAGE,
  toLiveUserFacingMessage,
} from "./index";

describe("live user-facing copy", () => {
  it("flags SQL, env, and schema messages as technical", () => {
    expect(
      isTechnicalLiveMessage(
        "Apply supabase/migrations/20260713_live_streaming_v1_foundation.sql"
      )
    ).toBe(true);
    expect(
      isTechnicalLiveMessage(
        "Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL"
      )
    ).toBe(true);
    expect(isTechnicalLiveMessage("relation public.live_rooms does not exist")).toBe(
      true
    );
    expect(isTechnicalLiveMessage("Unable to load live rooms.")).toBe(false);
  });

  it("replaces technical messages with human fallback", () => {
    expect(
      toLiveUserFacingMessage(
        "Apply supabase/migrations/20260713_live_streaming_v1_foundation.sql"
      )
    ).toBe(LIVE_TEMPORARILY_UNAVAILABLE_MESSAGE);
    expect(
      toLiveUserFacingMessage(
        "Set NEXT_PUBLIC_LIVEKIT_URL to your LiveKit wss:// URL."
      )
    ).toBe(LIVE_TEMPORARILY_UNAVAILABLE_MESSAGE);
    expect(toLiveUserFacingMessage("This live room has ended.")).toBe(
      "This live room has ended."
    );
  });
});

describe("live beta readiness", () => {
  it("is ready only when database and media are ready", () => {
    expect(
      buildLiveBetaReadiness({ databaseReady: true, mediaReady: true }).ok
    ).toBe(true);
    expect(
      buildLiveBetaReadiness({ databaseReady: false, mediaReady: true }).ok
    ).toBe(false);
    expect(
      buildLiveBetaReadiness({ databaseReady: true, mediaReady: false }).reason
    ).toBe("media_unavailable");
    expect(
      buildLiveBetaReadiness({ databaseReady: true, mediaReady: false })
        .userMessage
    ).toMatch(/temporarily unavailable/i);
  });

  it("never returns secret or migration names in readiness copy", () => {
    const cases = [
      buildLiveBetaReadiness({ databaseReady: false, mediaReady: false }),
      buildLiveBetaReadiness({ databaseReady: false, mediaReady: true }),
      buildLiveBetaReadiness({ databaseReady: true, mediaReady: false }),
    ];
    for (const readiness of cases) {
      expect(readiness.userMessage).not.toMatch(/LIVEKIT_/i);
      expect(readiness.userMessage).not.toMatch(/\.sql/i);
      expect(readiness.userMessage).not.toMatch(/migration/i);
      expect(readiness.userMessage.length).toBeGreaterThan(10);
    }
    expect(LIVE_MEDIA_NOT_CONFIGURED_MESSAGE).not.toMatch(/LIVEKIT_/i);
  });
});
