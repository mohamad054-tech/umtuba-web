import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGE_CATALOGS } from "../../i18n/messages/catalogs";
import { gamesArMessages, gamesEnMessages } from "../../i18n/messages/gamesCatalogs";
import {
  GAME_ARTWORK_SLUGS,
  PLAYABLE_GAME_SLUGS,
  gameArtworkSrc,
  getPlayableGame,
  isPlayableGameSlug,
} from "./catalog";

const ROOT = join(process.cwd());

describe("playable games catalog", () => {
  it("lists the playable slugs and 404s unknown ids", () => {
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
      "marble-chain",
    ]);
    expect(isPlayableGameSlug("sudoku")).toBe(true);
    expect(isPlayableGameSlug("quick-q")).toBe(true);
    expect(getPlayableGame("missing")).toBeNull();
    expect(getPlayableGame("quick-q")?.arabicContent).toBe(true);
    expect(getPlayableGame("price")?.demoData).toBe(true);
  });

  it("writes Arabic and English games chrome and keeps the play page noindex", () => {
    expect(gamesArMessages["games.title"]).toBe("الألعاب");
    expect(gamesEnMessages["games.title"]).toBe("Games");
    expect(MESSAGE_CATALOGS.fr["games.title"]).toBe("Jeux");
    expect(MESSAGE_CATALOGS.es["games.play"]).toBe("Jugar");
    expect(MESSAGE_CATALOGS.de["games.newGame"]).not.toBe(
      gamesEnMessages["games.newGame"]
    );
    expect(MESSAGE_CATALOGS.pt["games.localBest"]).not.toBe(
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

  it("keeps SVG marks for games without owner artwork and maps 13 local WebP tiles", () => {
    const art = readFileSync(join(ROOT, "app/games/play/GameArt.tsx"), "utf8");
    expect(art).not.toMatch(/unsplash|shutterstock|midjourney|dall-e|openai|stable diffusion/i);
    expect(GAME_ARTWORK_SLUGS).toHaveLength(14);
    for (const slug of PLAYABLE_GAME_SLUGS) {
      const src = gameArtworkSrc(slug);
      if (GAME_ARTWORK_SLUGS.includes(slug as (typeof GAME_ARTWORK_SLUGS)[number])) {
        expect(src).toBe(`/games/art/${slug}.webp`);
        const file = join(ROOT, "public", "games", "art", `${slug}.webp`);
        expect(existsSync(file)).toBe(true);
        expect(statSync(file).size).toBeGreaterThan(0);
        expect(statSync(file).size).toBeLessThan(100 * 1024);
      } else {
        expect(src).toBeNull();
        expect(art).toMatch(new RegExp(`["']?${slug}["']?:`));
      }
    }
  });
});
