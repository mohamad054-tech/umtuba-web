import { afterEach, describe, expect, it } from "vitest";
import { GAMES_BEST_STORAGE_KEY, readBest, writeBestIfHigher } from "./scores";

class MemoryStorage {
  store = new Map<string, string>();
  getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

describe("local game bests", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  it("keeps the higher score in localStorage", () => {
    const storage = new MemoryStorage();
    (globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = {
      localStorage: storage,
    };
    expect(readBest("snake")).toBeNull();
    expect(writeBestIfHigher("snake", 40)).toBe(40);
    expect(writeBestIfHigher("snake", 20)).toBe(40);
    expect(writeBestIfHigher("snake", 90)).toBe(90);
    expect(readBest("snake")).toBe(90);
    expect(storage.getItem(GAMES_BEST_STORAGE_KEY)).toContain("90");
  });
});
