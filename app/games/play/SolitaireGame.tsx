"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  createPlayStopwatch,
  formatPlayClock,
  formatPlayNumber,
  shuffled,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import {
  createKlondikeDeck,
  dealKlondike,
  dealKlondikeLegalOpen,
  dealKlondikeLongPile,
  klondikeAutoFoundation,
  klondikeColor,
  klondikeDraw,
  klondikeRankLabel,
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

function PlayingCard({
  card,
  selected,
  stacked = false,
  lead = false,
  peek = 0,
  peekKind,
  stackIndex = 0,
  onPress,
}: {
  card: KlondikeCard;
  selected: boolean;
  stacked?: boolean;
  lead?: boolean;
  peek?: number;
  peekKind?: "lead" | "up" | "down";
  stackIndex?: number;
  onPress: () => void;
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
      }${lead ? " lead" : ""}`}
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
      {...(card.up
        ? {
            "data-suit": card.suit,
            "data-rank": card.rank,
            "data-rank-label": label,
            "data-color": color,
          }
        : {})}
      aria-label={card.up ? `${label} ${mark}` : "facedown"}
      onClick={onPress}
    >
      {card.up ? (
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
      ) : (
        <span className="um-kcard-pattern" aria-hidden="true" />
      )}
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
  const lastTap = useRef<{ key: string; at: number }>({ key: "", at: 0 });
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
          : dealKlondike(shuffled(createKlondikeDeck()));
    setState(next);
    setSel(null);
    setHistory([]);
    setMoves(0);
    setElapsed(0);
    setDone(false);
    setScore(0);
    setLastMove("none");
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
    if (!sel) return;
    const attempt = klondikeTryMove(state, sel, dest);
    commit(attempt.next, attempt.ok);
  };

  const selectOrMove = (next: KlondikeSel, dest: KlondikeDest, key: string) => {
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
        <div className="um-klondike-shell">
          <div
            ref={bindBoard}
            className="um-klondike"
            dir="ltr"
            data-klondike-board="true"
            data-last-move={lastMove}
            data-k-card-h={layout.cardH.toFixed(2)}
            data-k-peek-up={layout.peekUp.toFixed(2)}
            data-k-peek-down={layout.peekDown.toFixed(2)}
            style={{
              ["--um-k-card-w" as string]: `${layout.cardW}px`,
              ["--um-k-card-h" as string]: `${layout.cardH}px`,
              ["--um-k-peek-up" as string]: `${layout.peekUp}px`,
              ["--um-k-peek-down" as string]: `${layout.peekDown}px`,
            }}
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
                    onPress={() => selectOrMove({ zone: "waste" }, { zone: "tableau", pile: 0 }, "waste")}
                  />
                ) : (
                  <span className="um-kslot-empty">{t("games.waste")}</span>
                )}
              </div>
              <div className="um-kslot spacer" />
              {state.foundations.map((pile, pileIndex) => {
                const top = pile[pile.length - 1];
                return (
                  <div key={`f-${pileIndex}`} className="um-kslot" data-kslot={`foundation-${pileIndex}`}>
                    {top ? (
                      <PlayingCard
                        card={top}
                        selected={cardSelected(sel, { zone: "foundation", pile: pileIndex })}
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
              {state.tableau.map((pile, pileIndex) => (
                <div
                  key={`t-${pileIndex}`}
                  className="um-ktableau"
                  data-tableau={pileIndex}
                  data-tableau-count={pile.length}
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
              ))}
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
        </div>
      ) : null}
    </PlayPanel>
  );
}
