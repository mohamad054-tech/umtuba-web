import { describe, expect, it } from "vitest";
import { formatInteractionCount } from "./shareAndViews";

describe("formatInteractionCount", () => {
  it("shows 0 as the string 0", () => {
    expect(formatInteractionCount(0)).toBe("0");
  });

  it("keeps small counts unabbreviated", () => {
    expect(formatInteractionCount(1)).toBe("1");
    expect(formatInteractionCount(999)).toBe("999");
  });

  it("uses compact K and M labels", () => {
    expect(formatInteractionCount(1000)).toBe("1K");
    expect(formatInteractionCount(1200)).toBe("1.2K");
    expect(formatInteractionCount(3_400_000)).toBe("3.4M");
  });
});
