export const KLONDIKE_MAX_PILE = 19;
export const KLONDIKE_PEEK_UP = 0.3;
export const KLONDIKE_PEEK_DOWN = 0.1;
export const KLONDIKE_PEEK_UP_MIN = 0.25;
export const KLONDIKE_CARD_RATIO = 7 / 5;
export const KLONDIKE_MIN_CARD_H = 36;
export const KLONDIKE_ROW_GAP = 8;

export type KlondikePileFace = { up: boolean };

export type KlondikeLayoutMetrics = {
  cardW: number;
  cardH: number;
  peekUp: number;
  peekDown: number;
};

function pileExtra(pile: readonly KlondikePileFace[], peekUp: number, peekDown: number) {
  return pile.slice(0, -1).reduce((sum, card) => sum + (card.up ? peekUp : peekDown), 0);
}

export function tallestPileExtra(
  piles: readonly (readonly KlondikePileFace[])[],
  peekUp: number,
  peekDown: number
) {
  return piles.reduce((max, pile) => Math.max(max, pileExtra(pile, peekUp, peekDown)), 0);
}

/** Card size and peeks so a 19-card pile still fits `boardH`, with ~30% face-up peek. */
export function klondikePileMetrics(
  piles: readonly (readonly KlondikePileFace[])[],
  boardW: number,
  boardH: number,
  cols = 7,
  gap = 6
): KlondikeLayoutMetrics {
  const colW = Math.max(24, (boardW - gap * (cols - 1)) / cols);
  const widthCardH = colW * KLONDIKE_CARD_RATIO;
  const avail = Math.max(96, boardH - KLONDIKE_ROW_GAP);
  const heightCardH = avail / (2 + (KLONDIKE_MAX_PILE - 1) * KLONDIKE_PEEK_UP_MIN);
  const cardH = Math.max(KLONDIKE_MIN_CARD_H, Math.min(widthCardH, heightCardH));
  const cardW = cardH / KLONDIKE_CARD_RATIO;

  let peekUp = cardH * KLONDIKE_PEEK_UP;
  let peekDown = Math.max(6, cardH * KLONDIKE_PEEK_DOWN);
  const tableauAvail = avail - cardH;
  const needed = cardH + tallestPileExtra(piles, peekUp, peekDown);
  if (needed > tableauAvail + 0.5) {
    const room = Math.max(0, tableauAvail - cardH);
    const raw = tallestPileExtra(piles, peekUp, peekDown);
    const scale = raw > 0 ? room / raw : 1;
    peekUp = Math.max(cardH * KLONDIKE_PEEK_UP_MIN, peekUp * scale);
    peekDown = Math.max(6, peekDown * scale);
  }

  return { cardW, cardH, peekUp, peekDown };
}
