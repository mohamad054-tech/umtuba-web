import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGE_CATALOGS } from "../../i18n/messages/catalogs";
import { gamesArMessages, gamesEnMessages } from "../../i18n/messages/gamesCatalogs";
import {
  PLAYABLE_GAME_SLUGS,
  getPlayableGame,
  isPlayableGameSlug,
} from "./catalog";

const ROOT = join(process.cwd());

describe("playable games catalog", () => {
  it("lists the twenty-nine playable slugs and 404s unknown ids", () => {
    expect([...PLAYABLE_GAME_SLUGS]).toEqual([
      "sudoku",
      "g2048",
      "snake",
      "memory",
      "xo",
      "hanoi",
      "lesson-quiz",
      "guess-city",
      "landmark",
      "collector",
      "price",
      "wheel",
      "basket",
      "hangword",
      "flag-guess",
      "farther-pair",
      "larger-country",
      "cheaper",
      "sort-price",
      "guess-discount",
      "quick-q",
      "order-steps",
      "match-term",
      "vocab",
      "fill-blank",
      "solitaire",
      "shapes",
      "typerace",
      "uno",
    ]);
    expect(isPlayableGameSlug("sudoku")).toBe(true);
    expect(isPlayableGameSlug("quick-q")).toBe(true);
    expect(getPlayableGame("missing")).toBeNull();
    expect(getPlayableGame("quick-q")?.arabicContent).toBe(true);
    expect(getPlayableGame("guess-city")?.demoData).toBe(true);
  });

  it("writes Arabic and English games chrome and keeps the play page noindex", () => {
    expect(gamesArMessages["games.title"]).toBe("الألعاب");
    expect(gamesEnMessages["games.title"]).toBe("Games");
    expect(MESSAGE_CATALOGS.fr["games.title"]).toBe(gamesEnMessages["games.title"]);
    expect(MESSAGE_CATALOGS.es["games.play"]).toBe(gamesEnMessages["games.play"]);
    expect(MESSAGE_CATALOGS.de["games.newGame"]).toBe(gamesEnMessages["games.newGame"]);
    expect(MESSAGE_CATALOGS.pt["games.localBest"]).toBe(
      gamesEnMessages["games.localBest"]
    );
    const page = readFileSync(join(ROOT, "app/games/page.tsx"), "utf8");
    expect(page).not.toMatch(/not available/i);
    expect(page).not.toMatch(/\bBeta\b/);
    const play = readFileSync(join(ROOT, "app/games/[slug]/page.tsx"), "utf8");
    expect(play).toMatch(/notFound\(\)/);
    expect(play).toMatch(/index: "noindex"/);
    const sitemap = readFileSync(join(ROOT, "lib/site/indexing.ts"), "utf8");
    expect(sitemap).not.toMatch(/\/games\/\[slug\]/);
    expect(sitemap).not.toMatch(/gamesPlayPath/);
  });

  it("uses original inline SVG tiles with no third-party artwork", () => {
    const art = readFileSync(join(ROOT, "app/games/play/GameArt.tsx"), "utf8");
    const withoutXmlns = art.replaceAll('xmlns="http://www.w3.org/2000/svg"', "");
    expect(withoutXmlns).not.toMatch(/https?:\/\//);
    expect(art).not.toMatch(/<image\b/);
    expect(art).not.toMatch(/xlink:href|href=["']data:/);
    expect(art).not.toMatch(/unsplash|shutterstock|midjourney|dall-e|openai|stable diffusion/i);
    for (const slug of PLAYABLE_GAME_SLUGS) {
      expect(art).toMatch(new RegExp(`["']?${slug}["']?:`));
    }
  });
});
