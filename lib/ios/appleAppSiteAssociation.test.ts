import { describe, expect, it } from "vitest";
import {
  IOS_BUNDLE_IDENTIFIER,
  buildAppleAppSiteAssociation,
  normalizeAppleTeamId,
} from "./appleAppSiteAssociation";

describe("appleAppSiteAssociation", () => {
  it("does not invent a Team ID or serve AASA without one", () => {
    expect(normalizeAppleTeamId(undefined)).toBeNull();
    expect(normalizeAppleTeamId("")).toBeNull();
    expect(normalizeAppleTeamId("too-short")).toBeNull();
    expect(buildAppleAppSiteAssociation(undefined)).toBeNull();
    expect(IOS_BUNDLE_IDENTIFIER).toBe("com.umtuba.app");
  });

  it("builds AASA only for a well-formed 10-character Team ID", () => {
    const association = buildAppleAppSiteAssociation("a1b2c3d4e5");
    expect(association).toEqual({
      applinks: {
        details: [
          {
            appIDs: ["A1B2C3D4E5.com.umtuba.app"],
            components: [{ "/": "/*" }],
          },
        ],
      },
    });
  });
});
