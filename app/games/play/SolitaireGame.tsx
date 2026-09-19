"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  createPlayStopwatch,
  formatPlayClock,
  formatPlayNumber,
  prefersReducedMotion,
  shuffled,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import {
  createKlondikeDeck,
  dealKlondike,
  dealKlondikeDragRun,
  dealKlondikeLegalOpen,
  dealKlondikeLongPile,
  destsMatch,
  klondikeAutoFoundation,
  klondikeColor,
  klondikeDraw,
  klondikeLegalDests,
  klondikeRankLabel,
  klondikeSelectedCards,
  klondikeSuitMark,
  klondikeTryMove,
  klondikeWon,
  type KlondikeCard,
  type KlondikeDest,
  type KlondikeSel,
  type KlondikeState,
} from "../../../lib/games/play/klondike";
import { klondikePileMetrics } from "../../../lib/games/play/klondikeLayout";
import { writeBestIfHigher } from "../../../lib/games/play/scores";
import {
  PlayHowTo,
  PlayPanel,
  PlayResult,
  PlayStat,
  usePlayHelp,
} from "./PlayChrome";

const DRAG_THRESHOLD_PX = 8;

function readFixtureDeal() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem("umtuba.klondike.deal") ?? "";
}

function sameSel(a: KlondikeSel | null, b: KlondikeSel): boolean {
  if (!a || a.zone !== b.zone) return false;
  if (a.zone === "waste") return true;
  if (a.zone === "foundation" && b.zone === "foundation") return a.pile === b.pile;
  if (a.zone === "tableau" && b.zone === "tableau") {
    return a.pile === b.pile && a.index === b.index;
  }
  return false;
}

function cardSelected(sel: KlondikeSel | null, zone: KlondikeSel): boolean {
  if (!sel) return false;
  if (sel.zone === "waste" && zone.zone === "waste") return true;
  if (sel.zone === "foundation" && zone.zone === "foundation") return sel.pile === zone.pile;
  if (sel.zone === "tableau" && zone.zone === "tableau") {
    return sel.pile === zone.pile && zone.index >= sel.index;
  }
  return false;
}

function destFromPoint(x: number, y: number): KlondikeDest | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const tab = el.closest("[data-tableau]");
  if (tab) return { zone: "tableau", pile: Number(tab.getAttribute("data-tableau")) };
  const slot = el.closest("[data-kslot]");
  const name = slot?.getAttribute("data-kslot") ?? "";
  if (name.startsWith("foundation-")) {
    return { zone: "foundation", pile: Number(name.slice("foundation-".length)) };
  }
  return null;
}

function CardFace({ card }: { card: KlondikeCard }) {
  const label = klondikeRankLabel(card.rank);
  const mark = klondikeSuitMark(card.suit);
  if (!card.up) {
    return <span className="um-kcard-pattern" aria-hidden="true" />;
  }
  return (
    <>
      <span className="um-kcard-idx" dir="ltr" lang="en">
        <span className="um-kcard-rank" lang="en" data-k-rank="true">
          {label}
        </span>
        <span className="um-kcard-pip" aria-hidden="true">
          {mark}
        </span>
      </span>
      <span className="um-kcard-suit" aria-hidden="true">
        {mark}
      </span>
      <span className="um-kcard-idx bot" dir="ltr" lang="en" aria-hidden="true">
        <span className="um-kcard-rank" lang="en" data-k-rank="true">
          {label}
        </span>
        <span className="um-kcard-pip">{mark}</span>
      </span>
    </>
  );
}

type DragLive = {
  sel: KlondikeSel;
  cards: KlondikeCard[];
  x: number;
  y: number;
  originX: number;
  originY: number;
  legal: KlondikeDest[];
  hover: KlondikeDest | null;
  returning: boolean;
};

function PlayingCard({
  card,
  selected,
  stacked = false,
  lead = false,
  peek = 0,
  peekKind,
  stackIndex = 0,
  placeholder = false,
  draggable = false,
  onPress,
  onDragPointerDown,
}: {
  card: KlondikeCard;
  selected: boolean;
  stacked?: boolean;
  lead?: boolean;
  peek?: number;
  peekKind?: "lead" | "up" | "down";
  stackIndex?: number;
  placeholder?: boolean;
  draggable?: boolean;
  onPress: () => void;
  onDragPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
}) {
  const color = klondikeColor(card.suit);
  const label = klondikeRankLabel(card.rank);
  const mark = klondikeSuitMark(card.suit);
  return (
    <button
      type="button"
      dir="ltr"
      lang="en"
      className={`um-kcard${card.up ? ` face ${color}` : " back"}${selected ? " sel" : ""}${
        stacked ? " stacked" : ""
      }${lead ? " lead" : ""}${placeholder ? " placeholder" : ""}`}
      style={
        stacked
          ? {
              ["--um-k-peek" as string]: `${peek}px`,
              zIndex: stackIndex + 1,
            }
          : undefined
      }
      data-play-item="true"
      data-kcard={card.id}
      data-up={card.up ? "true" : "false"}
      data-k-peek={stacked ? peekKind : undefined}
      data-k-draggable={draggable ? "true" : undefined}
      data-k-placeholder={placeholder ? "true" : undefined}
      {...(card.up
        ? {
            "data-suit": card.suit,
            "data-rank": card.rank,
            "data-rank-label": label,
            "data-color": color,
          }
        : {})}
      aria-label={card.up ? `${label} ${mark}` : "facedown"}
      onPointerDown={onDragPointerDown}
      onClick={onPress}
    >
      <CardFace card={card} />
    </button>
  );
}

export default function SolitaireGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [state, setState] = useState<KlondikeState>(() =>
    dealKlondike(createKlondikeDeck())
  );
  const [sel, setSel] = useState<KlondikeSel | null>(null);
  const [history, setHistory] = useState<KlondikeState[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [lastMove, setLastMove] = useState<"ok" | "no" | "none">("none");
  const [drag, setDrag] = useState<DragLive | null>(null);
  const lastTap = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const suppressClick = useRef(false);
  const clock = useMemo(() => createPlayStopwatch(setElapsed), []);
  const [boardBox, setBoardBox] = useState({ w: 720, h: 420 });
  const boardObserver = useRef<ResizeObserver | null>(null);
  const bindBoard = useCallback((node: HTMLDivElement | null) => {
    boardObserver.current?.disconnect();
    boardObserver.current = null;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setBoardBox({ w: rect.width, h: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    boardObserver.current = observer;
  }, []);
  const layout = useMemo(
    () => klondikePileMetrics(state.tableau, boardBox.w, boardBox.h),
    [state.tableau, boardBox.w, boardBox.h]
  );

  const deal = () => {
    const fixture = readFixtureDeal();
    const next =
      fixture === "legal-open"
        ? dealKlondikeLegalOpen()
        : fixture === "long-pile"
          ? dealKlondikeLongPile()
          : fixture === "drag-run"
            ? dealKlondikeDragRun()
            : dealKlondike(shuffled(createKlondikeDeck()));
    setState(next);
    setSel(null);
    setHistory([]);
    setMoves(0);
    setElapsed(0);
    setDone(false);
    setScore(0);
    setLastMove("none");
    setDrag(null);
    clock.start();
  };

  const begin = () => {
    if (!help.ready) deal();
    help.dismissHelp();
  };

  const restart = () => {
    deal();
    help.keepReadyOnReplay();
  };

  const commit = (next: KlondikeState, ok: boolean) => {
    if (!ok) {
      setLastMove("no");
      sfx.no();
      return;
    }
    setHistory((cur) => [...cur, state]);
    setState(next);
    setSel(null);
    setMoves((n) => n + 1);
    setLastMove("ok");
    sfx.ok();
    if (klondikeWon(next)) {
      const pts = Math.max(200, 1600 - moves * 2 - clock.stop() * 2);
      setScore(pts);
      writeBestIfHigher("solitaire", pts);
      setDone(true);
      sfx.win();
    }
  };

  const tryDest = (dest: KlondikeDest) => {
    if (suppressClick.current || !sel) return;
    const attempt = klondikeTryMove(state, sel, dest);
    commit(attempt.next, attempt.ok);
  };

  const selectOrMove = (next: KlondikeSel, dest: KlondikeDest, key: string) => {
    if (suppressClick.current) return;
    const now = Date.now();
    if (sameSel(sel, next) && now - lastTap.current.at < 340) {
      const auto = klondikeAutoFoundation(state, next);
      commit(auto.next, auto.ok);
      lastTap.current = { key: "", at: 0 };
      return;
    }
    lastTap.current = { key, at: now };
    if (sel && !sameSel(sel, next)) {
      const attempt = klondikeTryMove(state, sel, dest);
      if (attempt.ok) {
        commit(attempt.next, true);
        return;
      }
    }
    setSel(next);
    setLastMove("none");
    sfx.flip();
  };

  const draw = () => {
    if (suppressClick.current) return;
    const attempt = klondikeDraw(state);
    if (!attempt.ok) {
      sfx.no();
      return;
    }
    commit(attempt.next, true);
  };

  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((cur) => cur.slice(0, -1));
    setState(prev);
    setSel(null);
    setMoves((n) => Math.max(0, n - 1));
    setLastMove("none");
  };

  const startCardDrag = (nextSel: KlondikeSel) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const cards = klondikeSelectedCards(state, nextSel);
    if (!cards.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const grabX = event.clientX - rect.left;
    const grabY = event.clientY - rect.top;
    const legal = klondikeLegalDests(state, nextSel);
    let active = false;

    const onMove = (move: PointerEvent) => {
      const dx = move.clientX - startX;
      const dy = move.clientY - startY;
      if (!active && dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      if (!active) {
        active = true;
        suppressClick.current = true;
      }
      if (move.cancelable) move.preventDefault();
      const hover = destFromPoint(move.clientX, move.clientY);
      const legalHover = hover && legal.some((dest) => destsMatch(dest, hover)) ? hover : null;
      setDrag({
        sel: nextSel,
        cards,
        x: move.clientX - grabX,
        y: move.clientY - grabY,
        originX: rect.left,
        originY: rect.top,
        legal,
        hover: legalHover,
        returning: false,
      });
    };

    const onUp = (up: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!active) return;
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 320);
      const dest = destFromPoint(up.clientX, up.clientY);
      const attempt = dest ? klondikeTryMove(state, nextSel, dest) : { next: state, ok: false };
      if (attempt.ok) {
        setDrag(null);
        commit(attempt.next, true);
        return;
      }
      const snap = () => {
        setDrag(null);
        commit(state, false);
      };
      if (prefersReducedMotion()) {
        snap();
        return;
      }
      setDrag({
        sel: nextSel,
        cards,
        x: rect.left,
        y: rect.top,
        originX: rect.left,
        originY: rect.top,
        legal,
        hover: null,
        returning: true,
      });
      window.setTimeout(snap, 200);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const howTo = [
    t("games.solitaire.howTo1"),
    t("games.solitaire.howTo2"),
    t("games.solitaire.howTo3"),
    t("games.solitaire.howTo4"),
    t("games.solitaire.howTo5"),
  ];

  if (done) {
    return (
      <PlayPanel
        stats={
          <>
            <PlayStat label={t("games.moves")} value={formatPlayNumber(locale, moves)} />
            <PlayStat label={t("games.time")} value={formatPlayClock(elapsed)} />
          </>
        }
      >
        <PlayHowTo open={false} lines={howTo} cta="gotIt" onDismiss={help.dismissHelp} />
        <PlayResult
          score={score}
          verdictKey={verdictFromScore("moves", moves)}
          detail={t("games.solitaire.win")}
          onAgain={restart}
        />
      </PlayPanel>
    );
  }

  const waste = state.waste[state.waste.length - 1];
  const dragIds = new Set(drag?.cards.map((card) => card.id) ?? []);
  const cardVars = {
    ["--um-k-card-w" as string]: `${layout.cardW}px`,
    ["--um-k-card-h" as string]: `${layout.cardH}px`,
    ["--um-k-peek-up" as string]: `${layout.peekUp}px`,
    ["--um-k-peek-down" as string]: `${layout.peekDown}px`,
  };
  const dropClass = (dest: KlondikeDest) => {
    if (!drag) return "";
    const ok = drag.legal.some((item) => destsMatch(item, dest));
    if (!ok) return "";
    return destsMatch(drag.hover, dest) ? " drop-ok drop-hover" : " drop-ok";
  };

  return (
    <PlayPanel
      fill
      stats={
        <>
          <PlayStat label={t("games.moves")} value={formatPlayNumber(locale, moves)} />
          <PlayStat label={t("games.time")} value={formatPlayClock(elapsed)} />
        </>
      }
      helpOpen={help.helpOpen}
      onToggleHelp={help.toggleHelp}
    >
      <PlayHowTo
        open={help.helpOpen}
        lines={howTo}
        cta={help.ready ? "gotIt" : "start"}
        onDismiss={begin}
      />
      {help.ready ? (
        <div className="um-klondike-shell" style={cardVars}>
          <div
            ref={bindBoard}
            className="um-klondike"
            style={cardVars}
            dir="ltr"
            data-klondike-board="true"
            data-last-move={lastMove}
            data-k-dragging={drag ? "true" : "false"}
            data-k-card-h={layout.cardH.toFixed(2)}
            data-k-peek-up={layout.peekUp.toFixed(2)}
            data-k-peek-down={layout.peekDown.toFixed(2)}
          >
            <div className="um-klondike-row top">
              <div className="um-kslot" data-kslot="stock">
                {state.stock.length ? (
                  <PlayingCard
                    card={state.stock[state.stock.length - 1]!}
                    selected={false}
                    onPress={draw}
                  />
                ) : (
                  <button
                    type="button"
                    className="um-kslot-hit"
                    data-play-item="true"
                    data-stock-recycle="true"
                    aria-label={t("games.stock")}
                    onClick={draw}
                  >
                    <span className="um-kslot-empty">↺</span>
                  </button>
                )}
              </div>
              <div className="um-kslot" data-kslot="waste">
                {waste ? (
                  <PlayingCard
                    card={waste}
                    selected={cardSelected(sel, { zone: "waste" })}
                    placeholder={dragIds.has(waste.id)}
                    draggable
                    onDragPointerDown={startCardDrag({ zone: "waste" })}
                    onPress={() => selectOrMove({ zone: "waste" }, { zone: "tableau", pile: 0 }, "waste")}
                  />
                ) : (
                  <span className="um-kslot-empty">{t("games.waste")}</span>
                )}
              </div>
              <div className="um-kslot spacer" />
              {state.foundations.map((pile, pileIndex) => {
                const top = pile[pile.length - 1];
                const dest: KlondikeDest = { zone: "foundation", pile: pileIndex };
                return (
                  <div
                    key={`f-${pileIndex}`}
                    className={`um-kslot${dropClass(dest)}`}
                    data-kslot={`foundation-${pileIndex}`}
                    data-k-drop={drag?.legal.some((item) => destsMatch(item, dest)) ? "ok" : undefined}
                  >
                    {top ? (
                      <PlayingCard
                        card={top}
                        selected={cardSelected(sel, { zone: "foundation", pile: pileIndex })}
                        placeholder={dragIds.has(top.id)}
                        draggable
                        onDragPointerDown={startCardDrag({ zone: "foundation", pile: pileIndex })}
                        onPress={() => {
                          if (sel) tryDest({ zone: "foundation", pile: pileIndex });
                          else {
                            selectOrMove(
                              { zone: "foundation", pile: pileIndex },
                              { zone: "foundation", pile: pileIndex },
                              `f-${pileIndex}`
                            );
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        dir="ltr"
                        className="um-kslot-hit"
                        data-play-item="true"
                        data-foundation-empty={pileIndex}
                        data-foundation-suit={["S", "H", "D", "C"][pileIndex]}
                        aria-label={`${t("games.foundation")} ${["♠", "♥", "♦", "♣"][pileIndex]}`}
                        onClick={() => tryDest({ zone: "foundation", pile: pileIndex })}
                      >
                        <span className="um-kslot-suit" aria-hidden="true">
                          {["♠", "♥", "♦", "♣"][pileIndex]}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="um-klondike-row tab">
              {state.tableau.map((pile, pileIndex) => {
                const dest: KlondikeDest = { zone: "tableau", pile: pileIndex };
                return (
                  <div
                    key={`t-${pileIndex}`}
                    className={`um-ktableau${dropClass(dest)}`}
                    data-tableau={pileIndex}
                    data-tableau-count={pile.length}
                    data-k-drop={drag?.legal.some((item) => destsMatch(item, dest)) ? "ok" : undefined}
                  >
                    <button
                      type="button"
                      className="um-kslot-hit um-ktableau-hit"
                      data-play-item="true"
                      aria-label={`${t("games.solitaire.title")} ${pileIndex + 1}`}
                      onClick={() => tryDest({ zone: "tableau", pile: pileIndex })}
                    />
                    {pile.map((card, index) => {
                      const prev = pile[index - 1];
                      const peek = index === 0 ? 0 : prev?.up ? layout.peekUp : layout.peekDown;
                      return (
                        <PlayingCard
                          key={card.id}
                          card={card}
                          stacked
                          lead={index === 0}
                          peek={peek}
                          peekKind={index === 0 ? "lead" : prev?.up ? "up" : "down"}
                          stackIndex={index}
                          selected={cardSelected(sel, { zone: "tableau", pile: pileIndex, index })}
                          placeholder={dragIds.has(card.id)}
                          draggable={card.up}
                          onDragPointerDown={
                            card.up
                              ? startCardDrag({ zone: "tableau", pile: pileIndex, index })
                              : undefined
                          }
                          onPress={() => {
                            if (!card.up) return;
                            selectOrMove(
                              { zone: "tableau", pile: pileIndex, index },
                              { zone: "tableau", pile: pileIndex },
                              `${pileIndex}-${index}`
                            );
                          }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="um-kdeck-sr" aria-hidden="true">
              {state.stock.slice(0, -1).map((card) => (
                <span key={card.id} data-kcard={card.id} data-up="false" data-zone="stock" />
              ))}
              {state.waste.slice(0, -1).map((card) => (
                <span key={card.id} data-kcard={card.id} data-up="true" data-zone="waste" />
              ))}
              {state.foundations.flatMap((pile) =>
                pile.slice(0, -1).map((card) => (
                  <span key={card.id} data-kcard={card.id} data-up="true" data-zone="foundation" />
                ))
              )}
            </div>
          </div>
          <div className="um-play-row um-klondike-actions">
            <button type="button" className="um-play-btn" data-play-item="true" data-klondike-undo="true" onClick={undo} disabled={!history.length}>
              {t("games.undo")}
            </button>
            <button
              type="button"
              className="um-play-btn go"
              data-play-item="true"
              data-klondike-foundation="true"
              onClick={() => {
                const auto = klondikeAutoFoundation(state, sel);
                commit(auto.next, auto.ok);
              }}
            >
              {t("games.toFoundation")}
            </button>
          </div>
          {drag ? (
            <div className="um-kdrag-layer" data-k-drag="true" aria-hidden="true">
              {drag.cards.map((card, index) => (
                <div
                  key={card.id}
                  className={`um-kdrag-ghost${drag.returning ? " return" : ""}`}
                  data-k-ghost={card.id}
                  style={{
                    width: layout.cardW,
                    height: layout.cardH,
                    transform: `translate3d(${drag.x}px, ${drag.y + index * layout.peekUp}px, 0)`,
                    zIndex: 20 + index,
                  }}
                >
                  <div
                    className={`um-kcard face ${klondikeColor(card.suit)}`}
                    dir="ltr"
                    lang="en"
                  >
                    <CardFace card={card} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </PlayPanel>
  );
}
