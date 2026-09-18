"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  formatPlayNumber,
  prefersReducedMotion,
  SNAKE_SIZE,
  snakeKey,
  snakeTickMs,
  stepSnake,
  type Dir4,
  type SnakePoint,
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

function randomFood(body: readonly SnakePoint[]): SnakePoint {
  const taken = new Set(body.map(snakeKey));
  const free: SnakePoint[] = [];
  for (let y = 0; y < SNAKE_SIZE; y += 1) {
    for (let x = 0; x < SNAKE_SIZE; x += 1) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free[Math.floor(Math.random() * free.length)] ?? { x: 3, y: 3 };
}

const START: SnakePoint[] = [
  { x: 8, y: 8 },
  { x: 7, y: 8 },
  { x: 6, y: 8 },
];

function keyToDir(key: string): Dir4 | null {
  if (key === "ArrowLeft" || key === "a" || key === "A") return "left";
  if (key === "ArrowRight" || key === "d" || key === "D") return "right";
  if (key === "ArrowUp" || key === "w" || key === "W") return "up";
  if (key === "ArrowDown" || key === "s" || key === "S") return "down";
  return null;
}

export default function SnakeGame() {
  const { t, locale } = useI18n();
  const sfx = useMemo(() => createPlaySfx(), []);
  const { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay } = usePlayHelp();
  const [body, setBody] = useState<SnakePoint[]>(START);
  const [food, setFood] = useState<SnakePoint>({ x: 11, y: 8 });
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const dirRef = useRef<Dir4>("right");
  const pendingRef = useRef<Dir4>("right");
  const bodyRef = useRef(body);
  const foodRef = useRef(food);
  const scoreRef = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    bodyRef.current = body;
    foodRef.current = food;
    scoreRef.current = score;
  }, [body, food, score]);

  const restart = () => {
    setBody(START);
    setFood({ x: 11, y: 8 });
    setScore(0);
    setDead(false);
    dirRef.current = "right";
    pendingRef.current = "right";
    keepReadyOnReplay();
  };

  const turn = useCallback((next: Dir4) => {
    const current = dirRef.current;
    const opposite =
      (current === "left" && next === "right") ||
      (current === "right" && next === "left") ||
      (current === "up" && next === "down") ||
      (current === "down" && next === "up");
    if (!opposite) pendingRef.current = next;
  }, []);

  useEffect(() => {
    if (!ready || dead) return;
    const onKey = (event: KeyboardEvent) => {
      const dir = keyToDir(event.key);
      if (!dir) return;
      event.preventDefault();
      turn(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dead, ready, turn]);

  useEffect(() => {
    if (dead || !ready) return;
    let cancelled = false;
    let timer = 0;
    const reduced = prefersReducedMotion();
    const tick = () => {
      if (cancelled) return;
      dirRef.current = pendingRef.current;
      const stepped = stepSnake(bodyRef.current, dirRef.current, foodRef.current);
      if (stepped.dead) {
        setDead(true);
        writeBestIfHigher("snake", scoreRef.current);
        sfx.no();
        return;
      }
      setBody(stepped.body);
      if (stepped.ate) {
        const nextScore = scoreRef.current + 10;
        scoreRef.current = nextScore;
        setScore(nextScore);
        writeBestIfHigher("snake", nextScore);
        setFood(randomFood(stepped.body));
        sfx.ok();
      }
      timer = window.setTimeout(tick, snakeTickMs(scoreRef.current, reduced));
    };
    timer = window.setTimeout(tick, snakeTickMs(scoreRef.current, reduced));
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [dead, ready, sfx]);

  const onTouchStart = (event: TouchEvent) => {
    const point = event.changedTouches[0];
    if (!point || !ready) return;
    touch.current = { x: point.clientX, y: point.clientY };
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    const point = event.changedTouches[0];
    touch.current = null;
    if (!ready || !start || !point) return;
    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? "right" : "left");
    else turn(dy > 0 ? "down" : "up");
  };

  const cells = useMemo(() => {
    const head = body[0];
    const occupied = new Set(body.map(snakeKey));
    return Array.from({ length: SNAKE_SIZE * SNAKE_SIZE }, (_, index) => {
      const x = index % SNAKE_SIZE;
      const y = Math.floor(index / SNAKE_SIZE);
      const key = `${x},${y}`;
      if (head && head.x === x && head.y === y) return "head";
      if (food.x === x && food.y === y) return "food";
      if (occupied.has(key)) return "s";
      return "";
    });
  }, [body, food]);

  const head = body[0] ?? START[0];

  if (dead) {
    return (
      <PlayPanel
        stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}
        helpOpen={helpOpen}
        onToggleHelp={toggleHelp}
      >
        <PlayHowTo
          open={helpOpen}
          lines={[t("games.snake.howTo1"), t("games.snake.howTo2"), t("games.snake.howTo3")]}
          cta="gotIt"
          onDismiss={dismissHelp}
        />
        <PlayResult
          score={score}
          verdictKey={verdictFromScore("high", score)}
          detail={t("games.youLose")}
          onAgain={restart}
        />
      </PlayPanel>
    );
  }

  return (
    <PlayPanel
      stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}
      helpOpen={helpOpen}
      onToggleHelp={toggleHelp}
    >
      <PlayHowTo
        open={helpOpen}
        lines={[t("games.snake.howTo1"), t("games.snake.howTo2"), t("games.snake.howTo3")]}
        cta={ready ? "gotIt" : "start"}
        onDismiss={dismissHelp}
      />
      <div
        className="um-play-snake um-play-board"
        dir="ltr"
        data-snake-board="true"
        data-board-dir="ltr"
        data-head-x={head.x}
        data-head-y={head.y}
        style={{ gridTemplateColumns: `repeat(${SNAKE_SIZE}, minmax(0, 1fr))` }}
        role="img"
        aria-label={t("games.snake.title")}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {cells.map((kind, index) => {
          const x = index % SNAKE_SIZE;
          const y = Math.floor(index / SNAKE_SIZE);
          return (
            <div
              key={index}
              className={`um-play-scell${kind ? ` ${kind}` : ""}`}
              data-x={x}
              data-y={y}
              data-snake-head={kind === "head" ? "true" : undefined}
            />
          );
        })}
      </div>
      <div className="um-play-dpad" dir="ltr">
        <span />
        <button type="button" className="um-play-btn" onClick={() => turn("up")} aria-label="up">
          ↑
        </button>
        <span />
        <button type="button" className="um-play-btn" onClick={() => turn("left")} aria-label="left">
          ←
        </button>
        <button type="button" className="um-play-btn" onClick={() => turn("down")} aria-label="down">
          ↓
        </button>
        <button type="button" className="um-play-btn" onClick={() => turn("right")} aria-label="right">
          →
        </button>
      </div>
      <div className="um-play-row" style={{ justifyContent: "center" }}>
        <button type="button" className="um-play-btn" onClick={restart}>
          {t("games.newGame")}
        </button>
      </div>
    </PlayPanel>
  );
}
