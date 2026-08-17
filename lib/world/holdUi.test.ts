import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, translate } from "../i18n";
import {
  isWorldDiscoveryPubliclyLive,
  localizeWorldDiscoveryError,
  localizeWorldSearchError,
  worldDiscoveryHoldKey,
  worldDiscoveryHoldMessage,
  worldSearchHoldKey,
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

  it("does not leak English hold or error copy in ar/fr/es/de/pt", () => {
    const holdKeys = [
      worldDiscoveryHoldKey(false),
      worldDiscoveryHoldKey(true),
      worldSearchHoldKey(false),
      worldSearchHoldKey(true),
      "world.titleHold",
      "world.error.unavailable",
      "world.empty.destination",
    ] as const;
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      for (const key of holdKeys) {
        const localized = translate(locale, key);
        const english = translate("en", key);
        expect(localized.length).toBeGreaterThan(0);
        expect(localized).not.toBe(english);
      }
    }
  });

  it("localizes known discovery and search errors", () => {
    expect(
      localizeWorldDiscoveryError("ar", "Places could not be loaded.")
    ).toBe(translate("ar", "world.error.loadPlaces"));
    expect(
      localizeWorldSearchError("fr", "Search must contain 2 to 80 characters.")
    ).toBe(translate("fr", "world.error.searchLength"));
  });
});
