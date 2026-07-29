import { describe, expect, it } from "vitest";
import { isAiProductExperienceEnabled } from "./betaProductSurfaces";

describe("AI beta product surfaces", () => {
  it("defaults OFF when env empty", () => {
    expect(isAiProductExperienceEnabled({ env: {} })).toBe(false);
  });

  it("enables when Hub OR Assistant Runtime is ON", () => {
    expect(
      isAiProductExperienceEnabled({ env: { UMTUBA_AI_HUB: "1" } })
    ).toBe(true);
    expect(
      isAiProductExperienceEnabled({
        env: { UMTUBA_AI_ASSISTANT_RUNTIME: "true" },
      })
    ).toBe(true);
  });

  it("stays OFF for non-truthy flag values", () => {
    expect(
      isAiProductExperienceEnabled({
        env: { UMTUBA_AI_HUB: "0", UMTUBA_AI_ASSISTANT_RUNTIME: "false" },
      })
    ).toBe(false);
  });
});
