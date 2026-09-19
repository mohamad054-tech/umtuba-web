export const KLONDIKE_MAX_PILE = 19;
export const KLONDIKE_TARGET_PILE = 13;
export const KLONDIKE_PEEK_UP = 0.3;
export const KLONDIKE_PEEK_DOWN = 0.1;
export const KLONDIKE_PEEK_UP_MIN = 0.25;
export const KLONDIKE_CARD_RATIO = 7 / 5;
export const KLONDIKE_MIN_CARD_H = 36;
export const KLONDIKE_ROW_GAP = 8;
export const KLONDIKE_COL_GAP_MIN = 3;
export const KLONDIKE_COL_GAP_MAX = 6;

export type KlondikePileFace = { up: boolean };

export type KlondikeLayoutMetrics = {
  cardW: number;
  cardH: number;
  peekUp: number;
  peekDown: number;
  colGap: number;
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

export function klondikeColumnGap(boardW: number) {
  return Math.min(
    KLONDIKE_COL_GAP_MAX,
    Math.max(KLONDIKE_COL_GAP_MIN, Math.round(boardW * 0.004))
  );
}

function cardHForStack(avail: number, stack: number) {
  return avail / (2 + Math.max(0, stack - 1) * KLONDIKE_PEEK_UP_MIN);
}

/** Card size and peeks so a typical 14-card pile stays large; longer piles compress. */
export function klondikePileMetrics(
  piles: readonly (readonly KlondikePileFace[])[],
  boardW: number,
  boardH: number,
  cols = 7,
  gap = klondikeColumnGap(boardW)
): KlondikeLayoutMetrics {
  const colW = Math.max(24, (boardW - gap * (cols - 1)) / cols);
  const widthCardH = colW * KLONDIKE_CARD_RATIO;
  const avail = Math.max(96, boardH - KLONDIKE_ROW_GAP);
  const targetH = cardHForStack(avail, KLONDIKE_TARGET_PILE);
  const actualLen = piles.reduce((max, pile) => Math.max(max, pile.length), 1);
  const fitH =
    actualLen > KLONDIKE_TARGET_PILE
      ? cardHForStack(avail, Math.min(actualLen, KLONDIKE_MAX_PILE))
      : targetH;
  const cardH = Math.max(KLONDIKE_MIN_CARD_H, Math.min(widthCardH, targetH, fitH));
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

  return { cardW, cardH, peekUp, peekDown, colGap: gap };
}
