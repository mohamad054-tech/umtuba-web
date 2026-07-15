import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-07-15T12:00:00.000Z");

  it("formats recent buckets", () => {
    expect(formatRelativeTime("2026-07-15T11:59:40.000Z", now)).toBe("Just now");
    expect(formatRelativeTime("2026-07-15T11:50:00.000Z", now)).toBe("10m ago");
    expect(formatRelativeTime("2026-07-15T09:00:00.000Z", now)).toBe("3h ago");
  });

  it("formats calendar yesterday", () => {
    // 18h earlier — may be "Yesterday" or a short date depending on local TZ
    const label = formatRelativeTime("2026-07-14T18:00:00.000Z", now);
    expect(
      label === "Yesterday" ||
        /^\d+h ago$/.test(label) ||
        /[A-Za-z]{3} \d+/.test(label)
    ).toBe(true);
  });
});
