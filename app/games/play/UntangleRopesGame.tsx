"use client";

import { useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import { createPlaySfx, formatPlayNumber } from "../../../lib/games/play/engine";
import { readBest, writeBestIfHigher } from "../../../lib/games/play/scores";
import { PlayHowTo, PlayPanel, PlayStat, usePlayHelp } from "./PlayChrome";

type Dot = { x: number; y: number };
type Edge = readonly [number, number];

function orient(a: Dot, b: Dot, c: Dot) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function ropesCross(a: Dot, b: Dot, c: Dot, d: Dot) {
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}

function crossCount(dots: Dot[], edges: Edge[]) {
  let count = 0;
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const [a, b] = edges[i]!;
      const [c, d] = edges[j]!;
      if (a === c || a === d || b === c || b === d) continue;
      if (ropesCross(dots[a]!, dots[b]!, dots[c]!, dots[d]!)) count += 1;
    }
  }
  return count;
}

function randomDots(count: number): Dot[] {
  return Array.from({ length: count }, () => ({
    x: 14 + Math.random() * 72,
    y: 14 + Math.random() * 72,
  }));
}

function makeLevel(level: number) {
  const count = Math.min(9, 4 + level);
  const edges: Edge[] = [];
  for (let i = 0; i < count; i += 1) edges.push([i, (i + 1) % count]);
  const home = Array.from({ length: count }, (_, i) => ({
    x: 50 + 34 * Math.cos((i / count) * Math.PI * 2),
    y: 50 + 34 * Math.sin((i / count) * Math.PI * 2),
  }));
  for (let i = 0; i < count; i += 2) {
    const chord: Edge = [i, (i + 2) % count];
    if (crossCount(home, [...edges, chord]) === 0) edges.push(chord);
  }
  let dots = randomDots(count);
  for (let attempt = 0; attempt < 24 && crossCount(dots, edges) === 0; attempt += 1) dots = randomDots(count);
  if (crossCount(dots, edges) === 0) {
    const mid = Math.floor(count / 2);
    const first = dots[0]!;
    dots[0] = dots[mid]!;
    dots[mid] = first;
  }
  return { dots, edges };
}

export default function UntangleRopesGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<number | null>(null);
  const [level, setLevel] = useState(0);
  const [layout, setLayout] = useState(() => makeLevel(0));
  const layoutRef = useRef(layout);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [isBest, setIsBest] = useState(false);
  const scoreRef = useRef(0);
  const wonRef = useRef(false);

  const crossings = crossCount(layout.dots, layout.edges);

  const moveDot = (clientX: number, clientY: number) => {
    const index = drag.current;
    const field = fieldRef.current;
    if (index == null || !field || won) return;
    const rect = field.getBoundingClientRect();
    const x = Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(92, Math.max(8, ((clientY - rect.top) / rect.height) * 100));
    const current = layoutRef.current;
    const dots = current.dots.map((dot, dotIndex) => (dotIndex === index ? { x, y } : dot));
    const next = { dots, edges: current.edges };
    layoutRef.current = next;
    setLayout(next);
  };

  const release = () => {
    const index = drag.current;
    drag.current = null;
    if (index == null || wonRef.current) return;
    if (crossCount(layoutRef.current.dots, layoutRef.current.edges) === 0) {
      wonRef.current = true;
      const nextScore = scoreRef.current + (level + 1) * 100;
      scoreRef.current = nextScore;
      const previous = readBest("untangle-ropes") ?? 0;
      setIsBest(nextScore > previous);
      writeBestIfHigher("untangle-ropes", nextScore);
      setScore(nextScore);
      setWon(true);
      sfx.win();
    }
  };

  const nextLevel = () => {
    const next = level + 1;
    setLevel(next);
    const made = makeLevel(next);
    layoutRef.current = made;
    setLayout(made);
    wonRef.current = false;
    setWon(false);
  };

  return (
    <PlayPanel
      stats={
        <>
          <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
          <PlayStat label={t("games.round")} value={formatPlayNumber(locale, level + 1)} />
        </>
      }
      helpOpen={help.helpOpen}
      onToggleHelp={help.toggleHelp}
    >
      <PlayHowTo
        open={help.helpOpen}
        lines={[t("games.untangle-ropes.howTo1"), t("games.untangle-ropes.howTo2"), t("games.untangle-ropes.howTo3")]}
        cta={help.ready ? "gotIt" : "start"}
        onDismiss={help.dismissHelp}
      />
      {help.ready ? (
        <div className="um-ropes" dir="ltr">
          <div ref={fieldRef} className="um-ropes-field um-lit-board">
            <svg viewBox="0 0 100 100" className="um-ropes-svg">
              {layout.edges.map(([a, b]) => {
                const from = layout.dots[a]!;
                const to = layout.dots[b]!;
                const crossing = layout.edges.some(([c, d]) => {
                  if (a === c || a === d || b === c || b === d) return false;
                  return ropesCross(from, to, layout.dots[c]!, layout.dots[d]!);
                });
                return (
                  <line
                    key={`${a}-${b}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className={crossing ? "cross" : "clear"}
                  />
                );
              })}
            </svg>
            {layout.dots.map((dot, index) => (
              <button
                key={index}
                type="button"
                className="um-ropes-dot"
                style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                onPointerDown={(event) => {
                  if (won) return;
                  drag.current = index;
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => moveDot(event.clientX, event.clientY)}
                onPointerUp={release}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              />
            ))}
            {won ? (
              <div className="um-ropes-win">
                <p>{t("games.youWin")}</p>
                <button type="button" className="um-play-btn" onClick={nextLevel}>
                  {t("games.round")} {formatPlayNumber(locale, level + 2)}
                </button>
                {isBest ? <p>{t("games.localBest", { values: { score: formatPlayNumber(locale, score) } })}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </PlayPanel>
  );
}
