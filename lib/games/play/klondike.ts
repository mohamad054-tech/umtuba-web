export const KLONDIKE_SUITS = ["S", "H", "D", "C"] as const;
export type KlondikeSuit = (typeof KLONDIKE_SUITS)[number];

export type KlondikeCard = {
  id: string;
  suit: KlondikeSuit;
  rank: number;
  up: boolean;
};

export type KlondikeState = {
  tableau: KlondikeCard[][];
  foundations: KlondikeCard[][];
  stock: KlondikeCard[];
  waste: KlondikeCard[];
};

export type KlondikeSel =
  | { zone: "waste" }
  | { zone: "tableau"; pile: number; index: number }
  | { zone: "foundation"; pile: number };

export type KlondikeDest =
  | { zone: "tableau"; pile: number }
  | { zone: "foundation"; pile: number };

export function klondikeColor(suit: KlondikeSuit): "red" | "black" {
  return suit === "H" || suit === "D" ? "red" : "black";
}

export function klondikeRankLabel(rank: number): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

export function klondikeSuitMark(suit: KlondikeSuit): string {
  if (suit === "S") return "♠";
  if (suit === "H") return "♥";
  if (suit === "D") return "♦";
  return "♣";
}

export function klondikeCardId(suit: KlondikeSuit, rank: number): string {
  return `${suit}-${rank}`;
}

export function createKlondikeDeck(): KlondikeCard[] {
  const deck: KlondikeCard[] = [];
  for (const suit of KLONDIKE_SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ id: klondikeCardId(suit, rank), suit, rank, up: false });
    }
  }
  return deck;
}

export function cloneKlondike(state: KlondikeState): KlondikeState {
  return {
    tableau: state.tableau.map((pile) => pile.map((card) => ({ ...card }))),
    foundations: state.foundations.map((pile) => pile.map((card) => ({ ...card }))),
    stock: state.stock.map((card) => ({ ...card })),
    waste: state.waste.map((card) => ({ ...card })),
  };
}

function flipTableauTop(pile: KlondikeCard[]) {
  const top = pile[pile.length - 1];
  if (top && !top.up) pile[pile.length - 1] = { ...top, up: true };
}

export function dealKlondike(deck: readonly KlondikeCard[]): KlondikeState {
  const mixed = deck.map((card) => ({ ...card, up: false }));
  const tableau: KlondikeCard[][] = [[], [], [], [], [], [], []];
  for (let col = 0; col < 7; col += 1) {
    for (let n = 0; n <= col; n += 1) {
      const card = mixed.pop();
      if (card) tableau[col]!.push({ ...card, up: n === col });
    }
  }
  return {
    tableau,
    foundations: [[], [], [], []],
    stock: mixed,
    waste: [],
  };
}

/** Fixed open tops so 6♥ can legally drop on 7♠. Still 7 piles of 1..7. */
export function dealKlondikeLegalOpen(): KlondikeState {
  const reserved = new Set(["H-6", "S-7"]);
  const leftover = createKlondikeDeck()
    .filter((card) => !reserved.has(card.id))
    .map((card) => ({ ...card, up: false }));
  const next = () => leftover.pop()!;
  const sixHeart: KlondikeCard = { id: "H-6", suit: "H", rank: 6, up: true };
  const sevenSpade: KlondikeCard = { id: "S-7", suit: "S", rank: 7, up: true };
  const tableau: KlondikeCard[][] = [
    [sixHeart],
    [next(), sevenSpade],
    [next(), next(), next()],
    [next(), next(), next(), next()],
    [next(), next(), next(), next(), next()],
    [next(), next(), next(), next(), next(), next()],
    [next(), next(), next(), next(), next(), next(), next()],
  ];
  for (const pile of tableau) {
    for (let i = 0; i < pile.length; i += 1) {
      pile[i] = { ...pile[i]!, up: i === pile.length - 1 };
    }
  }
  return {
    tableau,
    foundations: [[], [], [], []],
    stock: leftover,
    waste: [],
  };
}

export function klondikeTableauCanPlace(
  moving: Pick<KlondikeCard, "suit" | "rank">,
  destTop?: Pick<KlondikeCard, "suit" | "rank">
): boolean {
  if (!destTop) return moving.rank === 13;
  return (
    klondikeColor(moving.suit) !== klondikeColor(destTop.suit) &&
    moving.rank === destTop.rank - 1
  );
}

export function klondikeFoundationCanPlace(
  moving: Pick<KlondikeCard, "suit" | "rank">,
  destTop?: Pick<KlondikeCard, "suit" | "rank">
): boolean {
  if (!destTop) return moving.rank === 1;
  return moving.suit === destTop.suit && moving.rank === destTop.rank + 1;
}

export function klondikeRunFrom(
  pile: readonly KlondikeCard[],
  index: number
): KlondikeCard[] | null {
  const card = pile[index];
  if (!card?.up) return null;
  const run = pile.slice(index).map((item) => ({ ...item }));
  for (let i = 1; i < run.length; i += 1) {
    const prev = run[i - 1]!;
    const next = run[i]!;
    if (!next.up || !klondikeTableauCanPlace(next, prev)) return null;
  }
  return run;
}

export function klondikeSelectedCards(
  state: KlondikeState,
  sel: KlondikeSel
): KlondikeCard[] {
  if (sel.zone === "waste") {
    const card = state.waste[state.waste.length - 1];
    return card ? [{ ...card }] : [];
  }
  if (sel.zone === "foundation") {
    const pile = state.foundations[sel.pile] ?? [];
    const card = pile[pile.length - 1];
    return card ? [{ ...card }] : [];
  }
  return klondikeRunFrom(state.tableau[sel.pile] ?? [], sel.index) ?? [];
}

function removeSelection(state: KlondikeState, sel: KlondikeSel): KlondikeState {
  const next = cloneKlondike(state);
  if (sel.zone === "waste") {
    next.waste = next.waste.slice(0, -1);
    return next;
  }
  if (sel.zone === "foundation") {
    const pile = next.foundations[sel.pile] ?? [];
    next.foundations[sel.pile] = pile.slice(0, -1);
    return next;
  }
  const pile = next.tableau[sel.pile] ?? [];
  next.tableau[sel.pile] = pile.slice(0, sel.index);
  flipTableauTop(next.tableau[sel.pile]!);
  return next;
}

export function klondikeTryMove(
  state: KlondikeState,
  sel: KlondikeSel,
  dest: KlondikeDest
): { next: KlondikeState; ok: boolean } {
  const moving = klondikeSelectedCards(state, sel);
  const head = moving[0];
  if (!head) return { next: state, ok: false };

  if (dest.zone === "tableau") {
    if (sel.zone === "tableau" && sel.pile === dest.pile) {
      return { next: state, ok: false };
    }
    const destPile = state.tableau[dest.pile] ?? [];
    const destTop = destPile[destPile.length - 1];
    if (!klondikeTableauCanPlace(head, destTop)) return { next: state, ok: false };
    const next = removeSelection(state, sel);
    next.tableau[dest.pile] = [...(next.tableau[dest.pile] ?? []), ...moving.map((card) => ({ ...card, up: true }))];
    return { next, ok: true };
  }

  if (moving.length !== 1) return { next: state, ok: false };
  if (sel.zone === "foundation" && sel.pile === dest.pile) {
    return { next: state, ok: false };
  }
  const destPile = state.foundations[dest.pile] ?? [];
  const destTop = destPile[destPile.length - 1];
  if (!klondikeFoundationCanPlace(head, destTop)) return { next: state, ok: false };
  const next = removeSelection(state, sel);
  next.foundations[dest.pile] = [...(next.foundations[dest.pile] ?? []), { ...head, up: true }];
  return { next, ok: true };
}

export function klondikeDraw(state: KlondikeState): { next: KlondikeState; ok: boolean } {
  if (state.stock.length) {
    const card = state.stock[state.stock.length - 1]!;
    return {
      ok: true,
      next: {
        ...cloneKlondike(state),
        stock: state.stock.slice(0, -1).map((item) => ({ ...item })),
        waste: [...state.waste.map((item) => ({ ...item })), { ...card, up: true }],
      },
    };
  }
  if (state.waste.length) {
    return {
      ok: true,
      next: {
        ...cloneKlondike(state),
        stock: state.waste
          .slice()
          .reverse()
          .map((card) => ({ ...card, up: false })),
        waste: [],
      },
    };
  }
  return { next: state, ok: false };
}

export function klondikeAutoFoundation(
  state: KlondikeState,
  sel?: KlondikeSel | null
): { next: KlondikeState; ok: boolean } {
  const candidates: KlondikeSel[] = sel
    ? [sel]
    : [
        ...(state.waste.length ? [{ zone: "waste" } as const] : []),
        ...state.tableau.flatMap((pile, pileIndex) =>
          pile.length ? [{ zone: "tableau" as const, pile: pileIndex, index: pile.length - 1 }] : []
        ),
      ];
  for (const candidate of candidates) {
    const cards = klondikeSelectedCards(state, candidate);
    if (cards.length !== 1) continue;
    for (let pile = 0; pile < 4; pile += 1) {
      const attempt = klondikeTryMove(state, candidate, { zone: "foundation", pile });
      if (attempt.ok) return attempt;
    }
  }
  return { next: state, ok: false };
}

export function klondikeWon(state: KlondikeState): boolean {
  return state.foundations.every((pile) => pile.length === 13);
}

export function klondikeAllCards(state: KlondikeState): KlondikeCard[] {
  return [
    ...state.tableau.flat(),
    ...state.foundations.flat(),
    ...state.stock,
    ...state.waste,
  ];
}
