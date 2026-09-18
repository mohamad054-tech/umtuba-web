import { describe, expect, it } from "vitest";
import { shuffled } from "./engine";
import {
  createKlondikeDeck,
  dealKlondike,
  dealKlondikeLegalOpen,
  klondikeAllCards,
  klondikeDraw,
  klondikeFoundationCanPlace,
  klondikeRankLabel,
  klondikeTableauCanPlace,
  klondikeTryMove,
} from "./klondike";

describe("klondike rules", () => {
  it("prints only Latin poker ranks", () => {
    const labels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(klondikeRankLabel);
    expect(labels).toEqual(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]);
    expect(labels.every((label) => /^(A|[2-9]|10|J|Q|K)$/.test(label))).toBe(true);
  });

  it("builds tableau down in alternating colours", () => {
    expect(klondikeTableauCanPlace({ suit: "H", rank: 6 }, { suit: "S", rank: 7 })).toBe(true);
    expect(klondikeTableauCanPlace({ suit: "H", rank: 6 }, { suit: "D", rank: 7 })).toBe(false);
    expect(klondikeTableauCanPlace({ suit: "H", rank: 6 }, { suit: "S", rank: 8 })).toBe(false);
  });

  it("builds foundations up by suit from Ace", () => {
    expect(klondikeFoundationCanPlace({ suit: "H", rank: 1 })).toBe(true);
    expect(klondikeFoundationCanPlace({ suit: "H", rank: 2 })).toBe(false);
    expect(klondikeFoundationCanPlace({ suit: "H", rank: 2 }, { suit: "H", rank: 1 })).toBe(true);
    expect(klondikeFoundationCanPlace({ suit: "S", rank: 2 }, { suit: "H", rank: 1 })).toBe(false);
  });

  it("allows only a King onto an empty tableau pile", () => {
    expect(klondikeTableauCanPlace({ suit: "S", rank: 13 })).toBe(true);
    expect(klondikeTableauCanPlace({ suit: "H", rank: 12 })).toBe(false);
  });

  it("recycles waste onto an empty stock, face down, reversing order", () => {
    const ace = { id: "S-1", suit: "S" as const, rank: 1, up: true };
    const two = { id: "S-2", suit: "S" as const, rank: 2, up: true };
    const three = { id: "S-3", suit: "S" as const, rank: 3, up: true };
    const drawn = klondikeDraw({
      tableau: [[], [], [], [], [], [], []],
      foundations: [[], [], [], []],
      stock: [],
      waste: [ace, two, three],
    });
    expect(drawn.ok).toBe(true);
    expect(drawn.next.waste).toEqual([]);
    expect(drawn.next.stock.map((card) => card.id)).toEqual(["S-3", "S-2", "S-1"]);
    expect(drawn.next.stock.every((card) => !card.up)).toBe(true);
  });

  it("deals 52 unique cards with 7 piles of 1..7 and seven face-up", () => {
    const state = dealKlondike(shuffled(createKlondikeDeck()));
    const ids = klondikeAllCards(state).map((card) => card.id);
    expect(new Set(ids).size).toBe(52);
    expect(state.tableau.map((pile) => pile.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.tableau.flat()).toHaveLength(28);
    expect(state.tableau.flat().filter((card) => card.up)).toHaveLength(7);
    expect(state.stock).toHaveLength(24);
  });

  it("accepts 6♥ onto 7♠ and rejects 6♥ onto an empty foundation", () => {
    const state = dealKlondikeLegalOpen();
    const legal = klondikeTryMove(
      state,
      { zone: "tableau", pile: 0, index: 0 },
      { zone: "tableau", pile: 1 }
    );
    expect(legal.ok).toBe(true);
    expect(legal.next.tableau[1]?.map((card) => card.id).at(-1)).toBe("H-6");
    const illegal = klondikeTryMove(
      state,
      { zone: "tableau", pile: 0, index: 0 },
      { zone: "foundation", pile: 0 }
    );
    expect(illegal.ok).toBe(false);
    expect(illegal.next.tableau[0]?.[0]?.id).toBe("H-6");
  });
});
