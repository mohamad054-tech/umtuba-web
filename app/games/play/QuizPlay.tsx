"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../../components/i18n";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import { CHOICE_TAGS, type QuizItem } from "../../../lib/games/play/banks";
import {
  createPlayCountdown,
  createPlaySfx,
  formatPlayNumber,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import { readBest, writeBestIfHigher } from "../../../lib/games/play/scores";
import type { PlayableGameSlug } from "../../../lib/games/play/catalog";
import { useBoardScrollLock } from "./boardPointer";
import {
  PlayHowTo,
  PlayPanel,
  PlayResult,
  PlayStat,
  usePlayHelp,
} from "./PlayChrome";

type Props = {
  slug: PlayableGameSlug;
  howTo: [TranslationKey, TranslationKey, TranslationKey];
  load: () => QuizItem[];
  seconds: number;
  extra?: (item: QuizItem, index: number) => ReactNode;
  hidePrompt?: boolean;
  fit?: boolean;
  globe?: boolean;
};

function GoldGlobe({
  mark,
  children,
}: {
  mark: "" | "ok" | "no";
  children: ReactNode;
}) {
  return (
    <div className={`um-globe-stage${mark ? ` ${mark}` : ""}`}>
      <div className="um-globe" aria-hidden="true">
        <span className="um-globe-grid" />
        <span className="um-globe-face">{children}</span>
        <span className="um-globe-shine" />
      </div>
    </div>
  );
}

function ChoiceText({ text }: { text: string }) {
  const [arabic, english] = text.split("\n");
  if (!english) return <span>{text}</span>;
  return (
    <span className="um-place-names">
      <span>{arabic}</span>
      <span className="en">{english}</span>
    </span>
  );
}

export default function QuizPlay({ slug, howTo, load, seconds, extra, hidePrompt, fit, globe }: Props) {
  const { t, locale } = useI18n();
  const sfx = useMemo(() => createPlaySfx(), []);
  const { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay } = usePlayHelp();
  const [deck, setDeck] = useState<QuizItem[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [right, setRight] = useState(0);
  const [left, setLeft] = useState(seconds);
  const [pick, setPick] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [done, setDone] = useState(false);
  const locked = pick != null || timedOut;
  const clockRef = useRef(
    createPlayCountdown(seconds, setLeft, () => setTimedOut(true))
  );
  const boardRef = useRef<HTMLDivElement>(null);
  const [floor, setFloor] = useState(0);
  useBoardScrollLock(boardRef, ready && !done);

  const begin = () => {
    if (!ready) {
      setFloor(readBest(slug) ?? 0);
      setDeck(load());
      setIndex(0);
      setScore(0);
      setStreak(0);
      setBest(0);
      setRight(0);
      setPick(null);
      setTimedOut(false);
      setDone(false);
    }
    dismissHelp();
  };

  const restart = () => {
    clockRef.current.stop();
    setFloor(readBest(slug) ?? 0);
    setDeck(load());
    setIndex(0);
    setScore(0);
    setStreak(0);
    setBest(0);
    setRight(0);
    setPick(null);
    setTimedOut(false);
    setDone(false);
    keepReadyOnReplay();
  };

  useEffect(() => {
    if (!ready || done || deck.length === 0 || pick != null) return;
    const clock = clockRef.current;
    clock.start(seconds);
    return () => {
      clock.stop();
    };
  }, [ready, done, deck, index, pick, seconds]);

  useEffect(() => {
    if (!timedOut || pick != null) return;
    const clock = clockRef.current;
    const id = window.setTimeout(() => {
      setPick(-1);
      clock.stop();
      setStreak(0);
      sfx.no();
    }, 0);
    return () => window.clearTimeout(id);
  }, [timedOut, pick, sfx]);

  const item = deck[index];

  const answer = (choice: number) => {
    if (!ready || !item || locked) return;
    clockRef.current.stop();
    const hit = choice === item.correct;
    setPick(choice);
    if (hit) {
      const nextStreak = streak + 1;
      setRight((n) => n + 1);
      setStreak(nextStreak);
      setBest((n) => Math.max(n, nextStreak));
      setScore((n) => n + 70 + Math.round(Math.max(clockRef.current.left, 0) * 2));
      sfx.ok();
    } else {
      setStreak(0);
      sfx.no();
    }
  };

  const advance = () => {
    if (index + 1 >= deck.length) {
      const pts = score;
      writeBestIfHigher(slug, pts);
      setDone(true);
      if (right >= Math.ceil(deck.length * 0.75)) sfx.win();
      return;
    }
    setIndex((n) => n + 1);
    setPick(null);
    setTimedOut(false);
  };

  if (done) {
    return (
      <PlayPanel
        fill={fit || globe}
        stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}
        helpOpen={helpOpen}
        onToggleHelp={toggleHelp}
      >
        <PlayHowTo open={helpOpen} lines={howTo.map((key) => t(key))} cta="gotIt" onDismiss={dismissHelp} />
        <div className={score > floor ? "um-play-best" : "um-play-celebrate"}>
          <PlayResult
            score={score}
            verdictKey={verdictFromScore("high", score)}
            detail={
              score > floor
                ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } })
                : `${formatPlayNumber(locale, right)} ${t("games.of")} ${formatPlayNumber(locale, deck.length)} · ${t("games.streak")} ${formatPlayNumber(locale, best)}`
            }
            onAgain={restart}
          />
        </div>
      </PlayPanel>
    );
  }

  return (
    <PlayPanel
      fill={fit || globe}
      stats={
        <>
          <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
          <PlayStat label={t("games.streak")} value={formatPlayNumber(locale, streak)} />
          {ready ? <PlayStat label={t("games.time")} value={formatPlayNumber(locale, left)} warn={left <= 5} /> : null}
        </>
      }
      helpOpen={helpOpen}
      onToggleHelp={toggleHelp}
    >
      <PlayHowTo
        open={helpOpen}
        lines={howTo.map((key) => t(key))}
        cta={ready ? "gotIt" : "start"}
        onDismiss={begin}
      />
      {ready && item ? (
        <div
          ref={boardRef}
          className={`um-play-quiz um-lit-board${fit || globe ? " um-place-quiz" : ""}${globe ? " um-globe-quiz" : ""}${
            pick != null && pick === item.correct ? " ok um-play-celebrate" : ""
          }${pick != null && pick !== item.correct ? " no" : ""}`}
          dir="ltr"
        >
          <p className="um-play-qnum">
            {t("games.question")} {formatPlayNumber(locale, index + 1)} {t("games.of")}{" "}
            {formatPlayNumber(locale, deck.length)}
          </p>
          {extra ? (
            globe ? (
              <GoldGlobe mark={pick == null ? "" : pick === item.correct ? "ok" : "no"}>{extra(item, index)}</GoldGlobe>
            ) : (
              extra(item, index)
            )
          ) : null}
          {hidePrompt ? null : <p className="um-play-qtext">{item.prompt}</p>}
          <div className="um-play-choices">
            {item.choices.map((text, choice) => (
              <button
                key={`${item.prompt}-${choice}`}
                type="button"
                className={`um-play-choice${pick != null && choice === item.correct ? " right" : ""}${
                  pick != null && pick === choice && choice !== item.correct ? " wrong" : ""
                }`}
                data-play-item="true"
                disabled={locked}
                onClick={() => answer(choice)}
              >
                <span className="tag">{CHOICE_TAGS[choice] ?? choice + 1}</span>
                <ChoiceText text={text} />
              </button>
            ))}
          </div>
          {pick != null ? (
            <>
              <div className={`um-play-why${pick === item.correct ? " ok" : " no"}`}>
                <strong>
                  {pick < 0 ? t("games.timeout") : pick === item.correct ? t("games.correct") : t("games.wrong")}
                </strong>
                {item.why ? <span> {item.why}</span> : null}
              </div>
              <div className="um-play-row">
                <button type="button" className="um-play-btn go" data-play-item="true" onClick={advance}>
                  {index + 1 >= deck.length ? t("games.results") : t("games.next")}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </PlayPanel>
  );
}
