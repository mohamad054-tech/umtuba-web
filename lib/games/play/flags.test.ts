import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COUNTRIES, DIST_CITIES, FLAGS } from "./banks";

const ROOT = process.cwd();

describe("flag game pictures", () => {
  it("uses a local flag file for every country in the game", () => {
    const mark = readFileSync(join(ROOT, "app/games/play/FlagMark.tsx"), "utf8");
    expect(mark).not.toContain("<rect");
    expect(mark).not.toContain("#006C35");
    for (const flag of FLAGS) {
      const file = readFileSync(join(ROOT, "public/games/flags", `${flag.id}.svg`), "utf8");
      expect(file).toContain(`id="flag-icons-${flag.id}"`);
      expect(file.startsWith("<svg")).toBe(true);
    }
    const license = readFileSync(join(ROOT, "public/games/flags/LICENSE"), "utf8");
    expect(license).toContain("MIT License");
    expect(license).toContain("Panayiotis Lipiridis");
  });

  it("keeps a local flag for countries and city pairs, with no drawn outlines", () => {
    const ids = new Set<string>([
      ...FLAGS.map((flag) => flag.id),
      ...COUNTRIES.map((country) => country.id),
      ...DIST_CITIES.map((city) => city.iso),
    ]);
    for (const id of ids) {
      const file = readFileSync(join(ROOT, "public/games/flags", `${id}.svg`), "utf8");
      expect(file).toContain(`id="flag-icons-${id}"`);
    }
    for (const country of COUNTRIES) {
      expect(country.name.length).toBeGreaterThan(0);
      expect(country.nameEn.length).toBeGreaterThan(0);
    }
    const place = readFileSync(join(ROOT, "app/games/play/PlaceCard.tsx"), "utf8");
    expect(place).not.toContain("CountryShape");
    expect(place).not.toContain("fromCodePoint");
  });

  it("keeps the Saudi flag green with white calligraphy, not a white cross", () => {
    const file = readFileSync(join(ROOT, "public/games/flags/sa.svg"), "utf8");
    expect(file).toContain('fill="#165d31"');
    expect(file).toContain('fill="#fff"');
    expect(file).not.toContain("<rect");
    expect(file).not.toContain("#006C35");
  });
});
