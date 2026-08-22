import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, translate } from "./index";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import type { TranslationKey } from "./messages/types";

const CLOSEOUT_KEYS: TranslationKey[] = [
  "home.nowPlaying",
  "home.asideHint",
  "home.exploreCity",
  "home.creator",
  "home.message",
  "home.messageOpening",
  "stories.add",
  "stories.yourStory",
  "stories.railAria",
  "stories.emptyFollow",
  "stories.addAria",
  "stories.signInAdd",
  "watch.aiSummary",
  "watch.openAiPanel",
  "watch.linkedArticle",
  "watch.postJourney",
  "watch.openingJourney",
  "watch.aiSummaryBody",
];

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Arabic leak + Watch autoplay closeout keys", () => {
  it("ships aside, story, and Watch AI chrome keys in all 13 locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of CLOSEOUT_KEYS) {
        expect(MESSAGE_CATALOGS[locale][key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("uses Arabic product chrome instead of English literals", () => {
    expect(translate("ar", "home.nowPlaying")).toBe("يُعرض الآن");
    expect(translate("ar", "stories.add")).toBe("أضف قصة");
    expect(translate("ar", "home.message")).toBe("رسالة");
    expect(translate("ar", "watch.aiSummary")).toBe("خلاصة الذكاء الاصطناعي");
    expect(translate("ar", "watch.postJourney")).toBe("رحلة المنشور");
    expect(translate("en", "home.nowPlaying")).toBe("Now playing");
  });

  it("wires Home aside, Story rail, and Watch overlay to i18n keys", () => {
    const aside = readRepo("app/discover/DiscoverExperience.tsx");
    const rail = readRepo("app/stories/components/StoryRail.tsx");
    const overlay = readRepo("app/components/video/VideoOverlay.tsx");
    const message = readRepo("app/components/messaging/StartDirectMessageButton.tsx");

    expect(aside).toMatch(/t\("home.nowPlaying"\)/);
    expect(aside).not.toMatch(/Now playing/);
    expect(rail).toMatch(/t\("stories.add"\)/);
    expect(rail).not.toMatch(/>\s*Add Story\s*</);
    expect(overlay).toMatch(/t\("watch.aiSummary"\)/);
    expect(overlay).toMatch(/t\("watch.aiSummaryBody"\)/);
    expect(overlay).not.toMatch(/>\s*AI summary\s*</);
    expect(message).toMatch(/t\("home.message"\)/);
    expect(message).not.toMatch(/label = "Message"/);
  });

  it("pauses the previous Watch player immediately on keyboard advance", () => {
    const feed = readRepo("app/components/video/VerticalVideoFeed.tsx");
    const player = readRepo("app/components/video/VideoPlayer.tsx");
    expect(feed).toMatch(/programmaticIndexRef/);
    expect(feed).toMatch(/setActiveIndex\(nextIndex\)/);
    expect(player).toMatch(/pauseInactiveVideo/);
    expect(player).toMatch(/playGenerationRef/);
  });
});
