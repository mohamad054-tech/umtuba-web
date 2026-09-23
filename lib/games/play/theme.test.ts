import { describe, expect, it } from "vitest";
import { easeOutCubic, lerpAngle, parseMuted } from "./theme";

describe("game theme", () => {
  it("eases out and treats only the stored mute flag as muted", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(parseMuted("1")).toBe(true);
    expect(parseMuted("0")).toBe(false);
    expect(parseMuted(null)).toBe(false);
  });

  it("turns an angle the short way", () => {
    const turned = lerpAngle(3, -3, 1);
    expect(Math.cos(turned)).toBeCloseTo(Math.cos(-3), 5);
    expect(Math.sin(turned)).toBeCloseTo(Math.sin(-3), 5);
  });
});
