import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, translate } from "./index";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import type { TranslationKey } from "./messages/types";

const NEW_KEYS: TranslationKey[] = [
  "home.subtitleHelp",
  "home.opening",
  "search.opening",
  "watch.loadingVideo",
  "watch.deleted",
  "watch.linkExpired",
  "watch.unableToPlay",
  "watch.retryPlayback",
  "watch.refreshing",
  "watch.playVideo",
  "watch.pauseVideo",
  "watch.unmute",
  "watch.mute",
  "watch.emptyFeed",
  "live.opening",
];

describe("web perf / autoplay / translation fix keys", () => {
  it("ships the new chrome keys in all 13 locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of NEW_KEYS) {
        expect(MESSAGE_CATALOGS[locale][key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("uses a natural Arabic Home subtitle instead of a confusing literal", () => {
    expect(translate("en", "home.subtitle")).toBe("Video feed");
    expect(translate("ar", "home.subtitle")).toBe("خلاصة الفيديوهات");
    expect(translate("ar", "home.subtitle")).not.toMatch(/أولاً/);
    expect(translate("ar", "home.subtitleHelp")).toMatch(/وصف/);
  });
});
