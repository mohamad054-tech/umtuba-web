import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GAME_CITIES, GAME_LANDMARKS, buildPlaceQuiz, placeLabel } from "./places";

function webpSize(filePath: string): { width: number; height: number } {
  const buf = readFileSync(filePath);
  const format = buf.toString("ascii", 12, 16);
  if (format === "VP8X") {
    return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  }
  if (format === "VP8 ") {
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  const b0 = buf[21] ?? 0;
  const b1 = buf[22] ?? 0;
  const b2 = buf[23] ?? 0;
  const b3 = buf[24] ?? 0;
  return {
    width: 1 + (((b1 & 0x3f) << 8) | b0),
    height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
  };
}

describe("city and landmark pictures", () => {
  it("keeps every indexed picture on disk within the size limit", () => {
    for (const [folder, places, expected] of [
      ["cities", GAME_CITIES, 80],
      ["landmarks", GAME_LANDMARKS, 20],
    ] as const) {
      expect(places).toHaveLength(expected);
      const files = new Set<string>();
      const labels = new Set<string>();
      for (const place of places) {
        expect(place.file.endsWith(".webp")).toBe(true);
        expect(files.has(place.file)).toBe(false);
        files.add(place.file);
        const label = placeLabel(place);
        expect(label).toBe(`${place.nameAr}\n${place.nameEn}`);
        expect(labels.has(label)).toBe(false);
        labels.add(label);
        expect(place.countryAr.length).toBeGreaterThan(0);
        expect(place.countryEn.length).toBeGreaterThan(0);
        expect(Number.isFinite(place.lat)).toBe(true);
        expect(Number.isFinite(place.lng)).toBe(true);
        const filePath = join(process.cwd(), "public", "games", folder, place.file);
        expect(existsSync(filePath)).toBe(true);
        expect(statSync(filePath).size).toBeLessThanOrEqual(100 * 1024);
        const size = webpSize(filePath);
        expect(size.width).toBeLessThanOrEqual(512);
        expect(size.height).toBeLessThanOrEqual(512);
      }
    }
  });

  it("builds a four-choice round from the picture file name", () => {
    const deck = buildPlaceQuiz(GAME_LANDMARKS, 8);
    expect(deck).toHaveLength(8);
    for (const item of deck) {
      expect(item.prompt.endsWith(".webp")).toBe(true);
      expect(GAME_LANDMARKS.some((place) => place.file === item.prompt)).toBe(true);
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.choices[item.correct]?.split("\n")).toHaveLength(2);
    }
  });
});
