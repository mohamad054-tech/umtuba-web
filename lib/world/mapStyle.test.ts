import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAP_STYLE_URL,
  OPENFREEMAP_TILE_ORIGIN,
  mapStyleOrigin,
  resolveMapStyleUrl,
} from "./mapStyle";

describe("world map style", () => {
  it("defaults to OpenFreeMap liberty without an API key", () => {
    expect(DEFAULT_MAP_STYLE_URL).toBe(
      "https://tiles.openfreemap.org/styles/liberty"
    );
    expect(resolveMapStyleUrl(undefined)).toBe(DEFAULT_MAP_STYLE_URL);
    expect(resolveMapStyleUrl("")).toBe(DEFAULT_MAP_STYLE_URL);
    expect(DEFAULT_MAP_STYLE_URL).not.toMatch(/access_token|api[_-]?key/i);
  });

  it("allows a public style URL override", () => {
    expect(resolveMapStyleUrl("https://tiles.example.org/styles/bright")).toBe(
      "https://tiles.example.org/styles/bright"
    );
    expect(mapStyleOrigin("https://tiles.example.org/styles/bright")).toBe(
      "https://tiles.example.org"
    );
  });

  it("rejects malformed overrides", () => {
    expect(resolveMapStyleUrl("not a url")).toBe(DEFAULT_MAP_STYLE_URL);
    expect(resolveMapStyleUrl("ftp://tiles.example.org/style")).toBe(
      DEFAULT_MAP_STYLE_URL
    );
    expect(mapStyleOrigin(undefined)).toBe(OPENFREEMAP_TILE_ORIGIN);
  });
});
