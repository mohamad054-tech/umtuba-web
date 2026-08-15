import { describe, expect, it } from "vitest";
import {
  isWorldDiscoveryPubliclyLive,
  worldDiscoveryHoldMessage,
  worldSearchHoldMessage,
} from "./holdUi";

describe("World hold UX copy", () => {
  it("distinguishes migration hold from flag-off hold", () => {
    expect(worldDiscoveryHoldMessage(false)).toContain("migrations are not available");
    expect(worldDiscoveryHoldMessage(true)).toContain("disabled pending platform approval");
    expect(worldSearchHoldMessage(false)).toContain("migrations are not available");
    expect(worldSearchHoldMessage(true)).toContain("disabled pending platform approval");
  });

  it("requires schema + discovery flag for public live", () => {
    expect(
      isWorldDiscoveryPubliclyLive({
        databaseReady: false,
        flags: { worldDiscoveryEnabled: true },
      })
    ).toBe(false);
    expect(
      isWorldDiscoveryPubliclyLive({
        databaseReady: true,
        flags: { worldDiscoveryEnabled: false },
      })
    ).toBe(false);
    expect(
      isWorldDiscoveryPubliclyLive({
        databaseReady: true,
        flags: { worldDiscoveryEnabled: true },
      })
    ).toBe(true);
  });
});
