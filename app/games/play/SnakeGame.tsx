"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  formatPlayNumber,
  prefersReducedMotion,
  SNAKE_SIZE,
  snakeKey,
  stepSnake,
  type Dir4,
  type SnakePoint,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import { writeBestIfHigher } from "../../../lib/games/play/scores";
import { PlayPanel, PlayResult, PlayStat } from "./PlayChrome";

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

export default function SnakeGame() {
  const { t, locale } = useI18n();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [body, setBody] = useState<SnakePoint[]>(START);
  const [food, setFood] = useState<SnakePoint>({ x: 11, y: 8 });
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const dirRef = useRef<Dir4>("right");
  const pendingRef = useRef<Dir4>("right");
  const bodyRef = useRef(body);
  const foodRef = useRef(food);
  const scoreRef = useRef(0);

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
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "a") turn("left");
      if (event.key === "ArrowRight" || event.key === "d") turn("right");
      if (event.key === "ArrowUp" || event.key === "w") turn("up");
      if (event.key === "ArrowDown" || event.key === "s") turn("down");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  useEffect(() => {
    if (dead) return;
    const ms = prefersReducedMotion() ? 240 : 140;
    const id = window.setInterval(() => {
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
    }, ms);
    return () => window.clearInterval(id);
  }, [dead, sfx]);

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

  if (dead) {
    return (
      <PlayPanel
        stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}
      >
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
    >
      <div
        className="um-play-snake"
        style={{ gridTemplateColumns: `repeat(${SNAKE_SIZE}, minmax(0, 1fr))` }}
        role="img"
        aria-label={t("games.snake.title")}
      >
        {cells.map((kind, index) => (
          <div key={index} className={`um-play-scell${kind ? ` ${kind}` : ""}`} />
        ))}
      </div>
      <div className="um-play-dpad">
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
