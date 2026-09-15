import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FEED_SOUND_COOKIE_NAME,
  FEED_SOUND_COOKIE_OFF,
  FEED_SOUND_COOKIE_ON,
  buildFeedSoundDocumentCookie,
  initialElementMuted,
  parseFeedSoundCookieValue,
  persistUserWantsSound,
  readUserWantsSound,
} from "./feedMutePreference";

describe("feedMutePreference", () => {
  it("treats a missing cookie as a cold muted visit", () => {
    expect(readUserWantsSound("")).toBe(false);
    expect(readUserWantsSound("umtuba_locale=en")).toBe(false);
    expect(parseFeedSoundCookieValue(null)).toBeNull();
    expect(parseFeedSoundCookieValue("maybe")).toBeNull();
  });

  it("reads persisted user intent from the cookie", () => {
    expect(readUserWantsSound(`${FEED_SOUND_COOKIE_NAME}=${FEED_SOUND_COOKIE_ON}`)).toBe(
      true
    );
    expect(readUserWantsSound(`${FEED_SOUND_COOKIE_NAME}=${FEED_SOUND_COOKIE_OFF}`)).toBe(
      false
    );
  });

  it("applies intent to a freshly mounted element without copying prior DOM mute", () => {
    expect(initialElementMuted(false)).toBe(true);
    expect(initialElementMuted(true)).toBe(false);
  });

  it("serializes a client-readable long-lived umtuba cookie", () => {
    const on = buildFeedSoundDocumentCookie(true);
    expect(on).toContain(`${FEED_SOUND_COOKIE_NAME}=${FEED_SOUND_COOKIE_ON}`);
    expect(on).toContain("Path=/");
    expect(on).toContain("Max-Age=31536000");
    expect(on).toContain("SameSite=lax");
    expect(on).not.toContain("HttpOnly");

    const off = buildFeedSoundDocumentCookie(false);
    expect(off).toContain(`${FEED_SOUND_COOKIE_NAME}=${FEED_SOUND_COOKIE_OFF}`);
  });

  it("writes only user intent to document.cookie", () => {
    const cookieBag = { value: "" };
    const original = globalThis.document;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        get cookie() {
          return cookieBag.value;
        },
        set cookie(next: string) {
          cookieBag.value = next;
        },
      },
    });

    persistUserWantsSound(true);
    expect(cookieBag.value).toContain(`${FEED_SOUND_COOKIE_NAME}=${FEED_SOUND_COOKIE_ON}`);
    persistUserWantsSound(false);
    expect(cookieBag.value).toContain(`${FEED_SOUND_COOKIE_NAME}=${FEED_SOUND_COOKIE_OFF}`);

    if (original === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).document;
    } else {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: original,
      });
    }
  });
});

describe("feed mute intent source contract", () => {
  it("does not write autoplay fallback into shared user intent", () => {
    const root = process.cwd();
    const feed = readFileSync(
      join(root, "app/components/video/VerticalVideoFeed.tsx"),
      "utf8"
    );
    const player = readFileSync(
      join(root, "app/components/video/VideoPlayer.tsx"),
      "utf8"
    );
    const discover = readFileSync(
      join(root, "app/discover/components/DiscoverNativeVideo.tsx"),
      "utf8"
    );

    expect(feed).not.toMatch(/handleAutoplayMuted/);
    expect(feed).not.toMatch(/setMuted\(true\)/);
    expect(player).not.toMatch(/onAutoplayMuted/);
    expect(player).toMatch(/setAutoplayFallbackMuted\(true\)/);
    expect(player).toMatch(/useFeedMutePreference/);
    expect(discover).toMatch(/useFeedMutePreference/);
    expect(discover).not.toMatch(/playActiveVideo\(video, true\)/);
    expect(discover).toMatch(/initialElementMuted\(userWantsSound\)/);
  });
});
