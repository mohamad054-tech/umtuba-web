import { describe, expect, it } from "vitest";
import { sandboxStoreTitle } from "./titles";
import { catalogHasArabicScript, STORE_MESSAGE_KEYS, storeT } from "./messages";

describe("sandbox store messages and titles", () => {
  it("translates Arabic chrome and body, not only the badge", () => {
    expect(catalogHasArabicScript("ar")).toBe(true);
    expect(storeT("ar", "heroTitle")).toMatch(/[\u0600-\u06FF]/);
    expect(storeT("ar", "addToCart")).toMatch(/[\u0600-\u06FF]/);
    expect(storeT("ar", "checkoutTitle")).toMatch(/[\u0600-\u06FF]/);
    expect(storeT("ar", "payNote")).toMatch(/[\u0600-\u06FF]/);
    expect(storeT("en", "storeName")).toMatch(/UMTUBA Store/);
    expect(STORE_MESSAGE_KEYS.length).toBeGreaterThan(80);
  });

  it("spot-checks fr es de pt chrome", () => {
    expect(storeT("fr", "cart")).toBe("Panier");
    expect(storeT("es", "cart")).toBe("Carrito");
    expect(storeT("de", "cart")).toBe("Warenkorb");
    expect(storeT("pt", "cart")).toBe("Carrinho");
  });

  it("does not emit UMTUBA | UMTUBA titles", () => {
    expect(sandboxStoreTitle("UMTUBA")).toBe("UMTUBA · Sandbox Store");
    expect(sandboxStoreTitle("Business preview sandbox | UMTUBA")).toBe(
      "Business preview sandbox · Sandbox Store"
    );
    expect(sandboxStoreTitle("Demo Studio Earbuds")).not.toMatch(/UMTUBA \| UMTUBA/);
  });
});
