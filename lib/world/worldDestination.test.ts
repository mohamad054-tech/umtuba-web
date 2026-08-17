import { describe, expect, it } from "vitest";
import { slugifyCity } from "../../app/lib/journey/handoff";
import { resolveWorldDestination } from "./worldDestination";

const cities = [
  { id: "1", slug: "amman" },
  { id: "2", slug: "paris" },
  { id: "3", slug: "sao-paulo" },
];

describe("World destination resolution", () => {
  it("opens the exact requested catalog city", () => {
    expect(resolveWorldDestination(cities, "paris")).toEqual({
      cityId: "2",
      requestedSlug: "paris",
      matched: true,
      unknownRequested: false,
    });
  });

  it("does not fall back to the first city when the slug is unknown", () => {
    expect(resolveWorldDestination(cities, "atlantis")).toEqual({
      cityId: "",
      requestedSlug: "atlantis",
      matched: false,
      unknownRequested: true,
    });
  });

  it("allows browse without a requested city", () => {
    expect(resolveWorldDestination(cities, null).cityId).toBe("1");
    expect(resolveWorldDestination(cities, null).unknownRequested).toBe(false);
  });

  it("slugifies accented Explore This City names", () => {
    expect(slugifyCity("São Paulo")).toBe("sao-paulo");
    expect(slugifyCity("Bogotá")).toBe("bogota");
    expect(slugifyCity("Amman")).toBe("amman");
  });
});
