import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  FEED_AUDIO_STORAGE_KEY,
  preferredFeedMuted,
  readFeedUnmutedPreference,
  resetFeedAudioPreferenceForTests,
  writeFeedUnmutedPreference,
} from "./feedAudioPreference";

const memory = new Map<string, string>();
const sessionStorageMock = {
  getItem(key: string) {
    return memory.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    memory.set(key, value);
  },
  removeItem(key: string) {
    memory.delete(key);
  },
};

beforeAll(() => {
  vi.stubGlobal("window", { sessionStorage: sessionStorageMock });
  vi.stubGlobal("sessionStorage", sessionStorageMock);
});

afterEach(() => {
  memory.clear();
  resetFeedAudioPreferenceForTests();
});

describe("feedAudioPreference", () => {
  it("defaults to muted until the viewer unmutes", () => {
    expect(readFeedUnmutedPreference()).toBe(false);
    expect(preferredFeedMuted()).toBe(true);
  });

  it("persists unmute in memory and sessionStorage", () => {
    writeFeedUnmutedPreference(true);
    expect(readFeedUnmutedPreference()).toBe(true);
    expect(preferredFeedMuted()).toBe(false);
    expect(sessionStorage.getItem(FEED_AUDIO_STORAGE_KEY)).toBe("1");
  });

  it("survives a remount by reading sessionStorage", () => {
    writeFeedUnmutedPreference(true);
    resetFeedAudioPreferenceForTests();
    sessionStorage.setItem(FEED_AUDIO_STORAGE_KEY, "1");
    expect(readFeedUnmutedPreference()).toBe(true);
    expect(preferredFeedMuted()).toBe(false);
  });

  it("keeps an explicit mute after a later remount", () => {
    writeFeedUnmutedPreference(true);
    writeFeedUnmutedPreference(false);
    resetFeedAudioPreferenceForTests();
    sessionStorage.setItem(FEED_AUDIO_STORAGE_KEY, "0");
    expect(readFeedUnmutedPreference()).toBe(false);
    expect(preferredFeedMuted()).toBe(true);
  });
});
