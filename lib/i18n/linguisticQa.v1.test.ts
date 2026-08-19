import { describe, expect, it } from "vitest";
import { translate } from "./index";
import { MESSAGE_CATALOGS } from "./messages/catalogs";

describe("13-language deep linguistic QA v1", () => {
  it("keeps UMTUBA Latin and never transliterates the brand in Arabic", () => {
    for (const value of Object.values(MESSAGE_CATALOGS.ar)) {
      expect(value).not.toMatch(/أمتوبة|أم طوبا/);
      if (value.includes("UMTUBA") || /[أ-ي]/.test(value)) {
        expect(value).not.toMatch(/أم.?طوبا/);
      }
    }
    expect(translate("ar", "landing.joinCta")).toContain("UMTUBA");
  });

  it("uses pt-BR forms for Following and common chrome", () => {
    expect(translate("pt", "nav.following")).toBe("Seguindo");
    expect(translate("pt", "actions.save")).toBe("Salvar");
    expect(translate("pt", "status.loading")).toBe("Carregando…");
    expect(translate("pt", "status.saving")).toBe("Salvando…");
    expect(translate("pt", "watch.eyebrow")).toBe("Assistir");
  });

  it("keeps Hello City as the branded feature name in every locale", () => {
    for (const locale of [
      "ar",
      "en",
      "fr",
      "es",
      "de",
      "pt",
      "id",
      "hi",
      "ru",
      "tr",
      "zh-CN",
      "ja",
      "ko",
    ] as const) {
      expect(translate(locale, "world.helloCity")).toBe("Hello City");
    }
  });

  it("never uses Unfollow as the already-following button label", () => {
    for (const locale of [
      "ar",
      "en",
      "fr",
      "es",
      "de",
      "pt",
      "id",
      "hi",
      "ru",
      "tr",
      "zh-CN",
      "ja",
      "ko",
    ] as const) {
      const following = translate(locale, "social.following");
      expect(following.toLowerCase()).not.toMatch(/unfollow|отписаться|takibi bırak|取消关注|フォロー解除|언팔/);
      expect(translate(locale, "social.follow").length).toBeGreaterThan(0);
    }
  });

  it("separates Hindi Discover from Search and uses compact Following", () => {
    expect(translate("hi", "nav.discover")).toBe("एक्सप्लोर");
    expect(translate("hi", "nav.search")).toBe("खोज");
    expect(translate("hi", "nav.following")).toBe("फ़ॉलोइंग");
  });

  it("uses professional Discover nouns in Japanese and Russian", () => {
    expect(translate("ja", "nav.discover")).toBe("発見");
    expect(translate("ru", "nav.discover")).toBe("Интересное");
  });

  it("uses Simplified Chinese for Discover and Profile", () => {
    expect(translate("zh-CN", "nav.discover")).toBe("发现");
    expect(translate("zh-CN", "nav.discover")).not.toBe("發現");
    expect(translate("zh-CN", "nav.profile")).toBe("个人主页");
  });
});
