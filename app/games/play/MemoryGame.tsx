"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  createPlayStopwatch,
  formatPlayClock,
  formatPlayNumber,
  shuffled,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import { writeBestIfHigher } from "../../../lib/games/play/scores";
import {
  PlayHowTo,
  PlayPanel,
  PlayResult,
  PlayStat,
  usePlayHelp,
} from "./PlayChrome";

const FACES = ["🌿", "🕌", "🏔️", "🌊", "🪁", "🎻", "🫖", "🧭"];

type Card = { id: number; face: string; up: boolean; done: boolean };

function deal(): Card[] {
  return shuffled([...FACES, ...FACES]).map((face, id) => ({
    id,
    face,
    up: false,
    done: false,
  }));
}

export default function MemoryGame() {
  const { t, locale } = useI18n();
  const { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay } = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [cards, setCards] = useState<Card[]>(() =>
    [...FACES, ...FACES].map((face, id) => ({
      id,
      face,
      up: false,
      done: false,
    }))
  );
  const [moves, setMoves] = useState(0);
  const [found, setFound] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lock, setLock] = useState(false);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const openRef = useRef<number[]>([]);
  const watchRef = useRef(createPlayStopwatch(setElapsed));

  const begin = () => {
    if (!ready) setCards(deal());
    dismissHelp();
  };

  const restart = () => {
    watchRef.current.stop();
    watchRef.current = createPlayStopwatch(setElapsed);
    openRef.current = [];
    setCards(deal());
    setMoves(0);
    setFound(0);
    setLock(false);
    setDone(false);
    setScore(0);
    keepReadyOnReplay();
    watchRef.current.start();
  };

  useEffect(() => {
    if (!ready) return;
    watchRef.current.start();
    return () => {
      watchRef.current.stop();
    };
  }, [ready]);

  const flip = (index: number) => {
    const card = cards[index];
    if (!ready || !card || lock || card.up || card.done || done) return;
    sfx.flip();
    const nextOpen = [...openRef.current, index];
    setCards((prev) => prev.map((item, i) => (i === index ? { ...item, up: true } : item)));
    if (nextOpen.length < 2) {
      openRef.current = nextOpen;
      return;
    }
    const [a, b] = nextOpen;
    const first = cards[a];
    const second = index === b ? card : cards[b];
    setMoves((n) => n + 1);
    setLock(true);
    if (first && second && first.face === second.face) {
      window.setTimeout(() => {
        setCards((prev) =>
          prev.map((item, i) =>
            i === a || i === b ? { ...item, done: true, up: false } : item
          )
        );
        const nextFound = found + 1;
        setFound(nextFound);
        sfx.ok();
        openRef.current = [];
        setLock(false);
        if (nextFound === 8) {
          const seconds = watchRef.current.stop();
          const pts = Math.max(120, 1000 - (moves + 1 - 8) * 35 - seconds * 4);
          setScore(pts);
          writeBestIfHigher("memory", pts);
          setDone(true);
          sfx.win();
        }
      }, 340);
    } else {
      window.setTimeout(() => {
        setCards((prev) =>
          prev.map((item, i) => (i === a || i === b ? { ...item, up: false } : item))
        );
        sfx.no();
        openRef.current = [];
        setLock(false);
      }, 740);
    }
  };

  if (done) {
    return (
    <PlayPanel
      stats={
        <>
          <PlayStat label={t("games.moves")} value={formatPlayNumber(locale, moves)} />
          <PlayStat label={t("games.time")} value={formatPlayClock(elapsed)} />
        </>
      }
      helpOpen={helpOpen}
      onToggleHelp={toggleHelp}
    >
      <PlayHowTo
        open={helpOpen}
        lines={[t("games.memory.howTo1"), t("games.memory.howTo2"), t("games.memory.howTo3")]}
        cta="gotIt"
        onDismiss={dismissHelp}
      />
      <PlayResult
          score={score}
          verdictKey={verdictFromScore("moves", moves)}
          detail={`${formatPlayNumber(locale, moves)} ${t("games.moves")} · ${formatPlayClock(elapsed)}`}
          onAgain={restart}
        />
      </PlayPanel>
    );
  }

  return (
    <PlayPanel
      stats={
        <>
          <PlayStat label={t("games.moves")} value={formatPlayNumber(locale, moves)} />
          <PlayStat
            label={t("games.pairs")}
            value={`${formatPlayNumber(locale, found)} / ${formatPlayNumber(locale, 8)}`}
          />
          <PlayStat label={t("games.time")} value={formatPlayClock(elapsed)} />
        </>
      }
      helpOpen={helpOpen}
      onToggleHelp={toggleHelp}
    >
      <PlayHowTo
        open={helpOpen}
        lines={[t("games.memory.howTo1"), t("games.memory.howTo2"), t("games.memory.howTo3")]}
        cta={ready ? "gotIt" : "start"}
        onDismiss={begin}
      />
      <div className="um-play-memgrid um-play-board" dir="ltr">
        {cards.map((card, index) => (
          <button
            key={card.id}
            type="button"
            className={`um-play-mem-card${card.up ? " up" : ""}${card.done ? " done" : ""}`}
            onClick={() => flip(index)}
            aria-label={card.up || card.done ? card.face : t("games.cardFacedown")}
          >
            <span className="um-play-mem-inner">
              <span className="um-play-mem-face um-play-mem-back" />
              <span className="um-play-mem-face um-play-mem-front">{card.face}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="um-play-row" style={{ justifyContent: "center" }}>
        <button type="button" className="um-play-btn" onClick={restart}>
          {t("games.newGame")}
        </button>
      </div>
    </PlayPanel>
  );
}
