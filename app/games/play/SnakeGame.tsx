"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  consumeSnakeTurn,
  formatPlayNumber,
  prefersReducedMotion,
  queueSnakeTurn,
  SNAKE_SIZE,
  snakeDirAngle,
  snakeDirFromDelta,
  snakeHeading,
  snakeKey,
  snakeTickMs,
  snakeVisualChain,
  stepSnake,
  type Dir4,
  type SnakePoint,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import { readBest, writeBestIfHigher } from "../../../lib/games/play/scores";
import { GAME_THEME, lerpAngle, readGameMuted, writeGameMuted } from "../../../lib/games/play/theme";
import {
  PlayHowTo,
  PlayPanel,
  PlayResult,
  PlayStat,
  usePlayHelp,
} from "./PlayChrome";

const START: SnakePoint[] = [
  { x: 8, y: 8 },
  { x: 7, y: 8 },
  { x: 6, y: 8 },
];

const STARS = Array.from({ length: 22 }, (_, index) => ({
  x: ((index * 47) % 97) / 97,
  y: ((index * 29) % 89) / 89,
  r: 0.6 + (index % 3) * 0.45,
  phase: index * 0.7,
}));

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number };
type Floater = { x: number; y: number; life: number; text: string; best: boolean };

function subscribeGameMuted(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("umtuba-games-mute", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("umtuba-games-mute", onChange);
    window.removeEventListener("storage", onChange);
  };
}

type Sim = {
  body: SnakePoint[];
  dir: Dir4;
  pending: Dir4;
  extra: Dir4 | null;
  food: SnakePoint;
  score: number;
  bestAtStart: number;
  acc: number;
  dead: boolean;
  sparks: Spark[];
  floaters: Floater[];
  shake: number;
  angle: number;
  celebrated: boolean;
  isBest: boolean;
};

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

function keyToDir(key: string): Dir4 | null {
  if (key === "ArrowLeft" || key === "a" || key === "A") return "left";
  if (key === "ArrowRight" || key === "d" || key === "D") return "right";
  if (key === "ArrowUp" || key === "w" || key === "W") return "up";
  if (key === "ArrowDown" || key === "s" || key === "S") return "down";
  return null;
}

const SWIPE_PX = 10;

function applyTurn(sim: Sim, next: Dir4) {
  if (sim.dead) return;
  const queued = queueSnakeTurn(
    { dir: sim.dir, pending: sim.pending, extra: sim.extra },
    next
  );
  if (queued.pending === sim.pending && queued.extra === sim.extra) return;
  sim.pending = queued.pending;
  sim.extra = queued.extra;
  const tick = snakeTickMs(sim.score, prefersReducedMotion());
  const soon = Math.max(0, tick - 16);
  if (sim.acc < soon) sim.acc = soon;
}

function sampleChain(points: SnakePoint[], steps: number): SnakePoint[] {
  if (points.length < 2) return points.map((point) => ({ ...point }));
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const len = Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
    lengths.push(len);
    total += len;
  }
  if (total < 0.001) return points.map((point) => ({ ...point }));
  const out: SnakePoint[] = [];
  const count = Math.max(steps, 2);
  for (let step = 0; step <= count; step += 1) {
    let dist = (step / count) * total;
    let index = 1;
    while (index < points.length && dist > (lengths[index - 1] ?? 0)) {
      dist -= lengths[index - 1] ?? 0;
      index += 1;
    }
    const from = points[Math.max(0, index - 1)]!;
    const to = points[Math.min(index, points.length - 1)]!;
    const span = lengths[index - 1] || 1;
    const blend = dist / span;
    out.push({
      x: from.x + (to.x - from.x) * blend,
      y: from.y + (to.y - from.y) * blend,
    });
  }
  return out;
}

function freshSim(): Sim {
  return {
    body: START.map((point) => ({ ...point })),
    dir: "right",
    pending: "right",
    extra: null,
    food: { x: 11, y: 8 },
    score: 0,
    bestAtStart: 0,
    acc: 0,
    dead: false,
    sparks: [],
    floaters: [],
    shake: 0,
    angle: 0,
    celebrated: false,
    isBest: false,
  };
}

export default function SnakeGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useRef(createPlaySfx());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Sim>(freshSim());
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const [isBest, setIsBest] = useState(false);
  const [paused, setPaused] = useState(false);
  const muted = useSyncExternalStore(subscribeGameMuted, readGameMuted, () => false);

  const turn = (next: Dir4) => {
    applyTurn(simRef.current, next);
  };

  const reset = () => {
    const sim = freshSim();
    sim.bestAtStart = readBest("snake") ?? 0;
    simRef.current = sim;
    setScore(0);
    setDead(false);
    setIsBest(false);
    help.keepReadyOnReplay();
  };

  const begin = () => {
    if (!help.ready) {
      const sim = freshSim();
      sim.bestAtStart = readBest("snake") ?? 0;
      simRef.current = sim;
      setScore(0);
      setDead(false);
      setIsBest(false);
    }
    help.dismissHelp();
  };

  useEffect(() => {
    const onHide = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => {
    if (!help.ready || dead) return;
    const onKey = (event: KeyboardEvent) => {
      const dir = keyToDir(event.key);
      if (!dir) return;
      event.preventDefault();
      turn(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dead, help.ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !help.ready || dead) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let last = performance.now();
    let dpr = 1;
    const reduced = prefersReducedMotion();

    const fit = () => {
      const size = Math.max(160, Math.floor(canvas.clientWidth));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);

    const paint = (now: number) => {
      const sim = simRef.current;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const cell = width / SNAKE_SIZE;
      const sky = ctx.createLinearGradient(0, 0, width, height);
      sky.addColorStop(0, GAME_THEME.navy);
      sky.addColorStop(0.55, "#1A1460");
      sky.addColorStop(1, GAME_THEME.purple);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, height);
      for (const star of STARS) {
        const twinkle = reduced ? 0.7 : 0.45 + Math.sin(now / 700 + star.phase) * 0.35;
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = GAME_THEME.cream;
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const floor = ctx.createRadialGradient(width / 2, height * 0.92, 8, width / 2, height * 0.92, width * 0.46);
      floor.addColorStop(0, "rgba(240, 169, 59, 0.22)");
      floor.addColorStop(1, "rgba(240, 169, 59, 0)");
      ctx.fillStyle = floor;
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.9, width * 0.42, height * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      const heading = snakeHeading(sim.dir);
      const nextCell = sim.body[0]
        ? { x: sim.body[0].x + heading.x, y: sim.body[0].y + heading.y }
        : sim.food;
      const eating = nextCell.x === sim.food.x && nextCell.y === sim.food.y;
      const progress = sim.dead || reduced ? 0 : Math.min(1, sim.acc / snakeTickMs(sim.score, false));
      const chain = snakeVisualChain(sim.body, sim.dir, progress, eating);
      const smooth = sampleChain(chain, Math.min(72, Math.max(16, chain.length * 4)));
      const toPx = (point: SnakePoint) => ({
        x: (point.x + 0.5) * cell,
        y: (point.y + 0.5) * cell,
      });
      const pixels = smooth.map(toPx);
      const headR = cell * 0.46;

      const pulse = reduced ? 1 : 1 + Math.sin(now / 280) * 0.08;
      const food = toPx(sim.food);
      const gem = ctx.createRadialGradient(food.x, food.y, 1, food.x, food.y, cell * 0.55 * pulse);
      gem.addColorStop(0, "#F7FFFC");
      gem.addColorStop(0.35, GAME_THEME.mintGlow);
      gem.addColorStop(0.72, GAME_THEME.mint);
      gem.addColorStop(1, "rgba(61, 255, 200, 0)");
      ctx.fillStyle = gem;
      ctx.beginPath();
      ctx.arc(food.x, food.y, cell * 0.55 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GAME_THEME.goldHot;
      ctx.beginPath();
      ctx.arc(food.x - cell * 0.06, food.y - cell * 0.06, cell * 0.08, 0, Math.PI * 2);
      ctx.fill();

      if (pixels.length > 1) {
        ctx.save();
        ctx.translate(0, cell * 0.07);
        ctx.strokeStyle = "rgba(61, 255, 200, 0.55)";
        ctx.lineWidth = headR * 1.35;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (!reduced) {
          ctx.shadowColor = GAME_THEME.mintGlow;
          ctx.shadowBlur = 14;
        }
        ctx.beginPath();
        pixels.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.restore();

        for (let index = pixels.length - 1; index >= 0; index -= 1) {
          const point = pixels[index]!;
          const along = pixels.length === 1 ? 0 : index / (pixels.length - 1);
          const radius = headR * (1 - along * 0.62);
          const gloss = ctx.createRadialGradient(
            point.x - radius * 0.28,
            point.y - radius * 0.34,
            radius * 0.1,
            point.x,
            point.y,
            radius
          );
          gloss.addColorStop(0, GAME_THEME.goldHot);
          gloss.addColorStop(0.55, GAME_THEME.gold);
          gloss.addColorStop(1, GAME_THEME.goldDeep);
          ctx.fillStyle = gloss;
          ctx.beginPath();
          ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        const head = pixels[0]!;
        sim.angle = reduced
          ? snakeDirAngle(sim.pending)
          : lerpAngle(sim.angle, snakeDirAngle(sim.pending), 0.55);
        const fx = Math.cos(sim.angle);
        const fy = Math.sin(sim.angle);
        const px = -fy;
        const py = fx;
        for (const side of [-1, 1]) {
          const ex = head.x + fx * headR * 0.28 + px * side * headR * 0.34;
          const ey = head.y + fy * headR * 0.28 + py * side * headR * 0.34;
          ctx.fillStyle = GAME_THEME.cream;
          ctx.beginPath();
          ctx.arc(ex, ey, headR * 0.24, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = GAME_THEME.ink;
          ctx.beginPath();
          ctx.arc(ex + fx * headR * 0.08, ey + fy * headR * 0.08, headR * 0.11, 0, Math.PI * 2);
          ctx.fill();
        }
        if (!reduced) {
          ctx.strokeStyle = GAME_THEME.mintGlow;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(head.x + fx * headR * 0.9, head.y + fy * headR * 0.9);
          ctx.quadraticCurveTo(
            head.x + fx * headR * 1.25 + px * headR * 0.2,
            head.y + fy * headR * 1.25 + py * headR * 0.2,
            head.x + fx * headR * 1.15,
            head.y + fy * headR * 1.15
          );
          ctx.stroke();
        }
      }

      sim.sparks = sim.sparks.filter((spark) => spark.life > 0).slice(0, GAME_THEME.particleCap);
      for (const spark of sim.sparks) {
        if (!reduced) {
          spark.x += spark.vx;
          spark.y += spark.vy;
          spark.life -= 1;
        } else {
          spark.life = 0;
        }
        ctx.globalAlpha = Math.max(spark.life / spark.max, 0);
        ctx.fillStyle = GAME_THEME.goldHot;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      sim.floaters = sim.floaters.filter((item) => item.life > 0);
      for (const item of sim.floaters) {
        if (!reduced) {
          item.y -= 0.6;
          item.life -= 1;
        } else {
          item.life = 0;
        }
        ctx.globalAlpha = Math.max(item.life / 28, 0);
        ctx.fillStyle = item.best ? GAME_THEME.goldHot : GAME_THEME.cream;
        ctx.font = `800 ${item.best ? 22 : 16}px ${GAME_THEME.font}`;
        ctx.textAlign = "center";
        ctx.fillText(item.text, item.x, item.y);
      }
      ctx.globalAlpha = 1;

      const headCell = sim.body[0];
      if (headCell) {
        canvas.dataset.headX = String(headCell.x);
        canvas.dataset.headY = String(headCell.y);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(34, now - last);
      last = now;
      const sim = simRef.current;
      if (!document.hidden && !sim.dead) {
        sim.acc += dt;
        const tick = snakeTickMs(sim.score, reduced);
        if (sim.acc >= tick) {
          sim.acc = reduced ? 0 : sim.acc - tick;
          const turned = consumeSnakeTurn({
            dir: sim.dir,
            pending: sim.pending,
            extra: sim.extra,
          });
          sim.dir = turned.dir;
          sim.pending = turned.pending;
          sim.extra = turned.extra;
          if (sim.pending !== sim.dir && sim.acc < tick - 16) sim.acc = Math.max(0, tick - 16);
          const stepped = stepSnake(sim.body, sim.dir, sim.food);
          if (stepped.dead) {
            sim.dead = true;
            const nextBest = sim.score > sim.bestAtStart;
            sim.isBest = nextBest;
            writeBestIfHigher("snake", sim.score);
            sfx.current.no();
            if (reduced) {
              setIsBest(nextBest);
              setDead(true);
            } else {
              sim.shake = 1;
            }
          } else {
            sim.body = stepped.body;
            if (stepped.ate) {
              sim.score += 10;
              setScore(sim.score);
              writeBestIfHigher("snake", sim.score);
              sim.food = randomFood(sim.body);
              sfx.current.ok();
              const at = {
                x: (stepped.body[0]!.x + 0.5) * (canvas.clientWidth / SNAKE_SIZE),
                y: (stepped.body[0]!.y + 0.5) * (canvas.clientHeight / SNAKE_SIZE),
              };
              if (!reduced) {
                const room = GAME_THEME.particleCap - sim.sparks.length;
                for (let i = 0; i < Math.min(8, room); i += 1) {
                  const angle = (i / 8) * Math.PI * 2;
                  sim.sparks.push({
                    x: at.x,
                    y: at.y,
                    vx: Math.cos(angle) * 1.4,
                    vy: Math.sin(angle) * 1.4,
                    life: 16,
                    max: 16,
                  });
                }
                const record = sim.score > sim.bestAtStart && !sim.celebrated;
                if (record) sim.celebrated = true;
                sim.floaters.push({
                  x: at.x,
                  y: at.y - 8,
                  life: 28,
                  text: "+10",
                  best: record,
                });
                sim.shake = Math.max(sim.shake, 0.28);
              }
            }
          }
        }
      }
      if (sim.shake > 0) {
        sim.shake *= 0.9;
        if (sim.shake < 0.04) {
          sim.shake = 0;
          if (sim.dead) {
            setIsBest(sim.isBest);
            setDead(true);
          }
        }
      }
      const jx = sim.shake > 0 && !reduced ? (Math.random() - 0.5) * 8 * sim.shake : 0;
      const jy = sim.shake > 0 && !reduced ? (Math.random() - 0.5) * 8 * sim.shake : 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.save();
      ctx.translate(jx, jy);
      paint(now);
      ctx.restore();
      if (document.hidden) {
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(loop);
    };

    const onVisible = () => {
      if (!document.hidden && frame === 0) {
        last = performance.now();
        frame = window.requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    frame = window.requestAnimationFrame(loop);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisible);
      observer.disconnect();
    };
  }, [dead, help.ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !help.ready || dead) return;
    let start: { x: number; y: number } | null = null;
    let dragged = false;

    const block = (event: Event) => {
      event.preventDefault();
    };

    const onDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      start = { x: event.clientX, y: event.clientY };
      dragged = false;
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        /* the pointer can end before capture */
      }
      event.preventDefault();
    };

    const onMove = (event: PointerEvent) => {
      if (!start || !event.isPrimary) return;
      event.preventDefault();
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) < SWIPE_PX) return;
      const next = snakeDirFromDelta(dx, dy);
      if (!next) return;
      dragged = true;
      applyTurn(simRef.current, next);
      start = { x: event.clientX, y: event.clientY };
    };

    const onUp = (event: PointerEvent) => {
      if (!start) return;
      event.preventDefault();
      const origin = start;
      const didDrag = dragged;
      start = null;
      dragged = false;
      if (didDrag) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.hypot(dx, dy) >= SWIPE_PX) {
        const swiped = snakeDirFromDelta(dx, dy);
        if (swiped) applyTurn(simRef.current, swiped);
        return;
      }
      const head = simRef.current.body[0];
      if (!head) return;
      const rect = canvas.getBoundingClientRect();
      const cell = rect.width / SNAKE_SIZE;
      const headX = rect.left + (head.x + 0.5) * cell;
      const headY = rect.top + (head.y + 0.5) * cell;
      const next = snakeDirFromDelta(event.clientX - headX, event.clientY - headY);
      if (next) applyTurn(simRef.current, next);
    };

    const onCancel = () => {
      start = null;
      dragged = false;
    };

    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove, { passive: false });
    canvas.addEventListener("pointerup", onUp, { passive: false });
    canvas.addEventListener("pointercancel", onCancel, { passive: false });
    canvas.addEventListener("touchstart", block, { passive: false });
    canvas.addEventListener("touchmove", block, { passive: false });
    canvas.addEventListener("gesturestart", block);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("touchstart", block);
      canvas.removeEventListener("touchmove", block);
      canvas.removeEventListener("gesturestart", block);
    };
  }, [dead, help.ready]);

  if (dead) {
    return (
      <PlayPanel
        stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}
        helpOpen={help.helpOpen}
        onToggleHelp={help.toggleHelp}
      >
        <PlayHowTo
          open={help.helpOpen}
          lines={[t("games.snake.howTo1"), t("games.snake.howTo2"), t("games.snake.howTo3")]}
          cta="gotIt"
          onDismiss={help.dismissHelp}
        />
        <div className={isBest ? "um-snake-best" : "um-snake-over"}>
          <PlayResult
            score={score}
            verdictKey={verdictFromScore("high", score)}
            detail={
              isBest
                ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } })
                : t("games.youLose")
            }
            onAgain={reset}
          />
        </div>
      </PlayPanel>
    );
  }

  return (
    <PlayPanel
      stats={
        <>
          <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
          <button
            type="button"
            className="um-play-btn"
            aria-pressed={muted}
            onClick={() => writeGameMuted(!readGameMuted())}
          >
            {muted ? t("games.unmute") : t("games.mute")}
          </button>
        </>
      }
      helpOpen={help.helpOpen}
      onToggleHelp={help.toggleHelp}
    >
      <PlayHowTo
        open={help.helpOpen}
        lines={[t("games.snake.howTo1"), t("games.snake.howTo2"), t("games.snake.howTo3")]}
        cta={help.ready ? "gotIt" : "start"}
        onDismiss={begin}
      />
      {help.ready ? (
        <div className="um-snake-stage" dir="ltr">
          <canvas
            ref={canvasRef}
            className="um-snake-canvas um-play-board"
            dir="ltr"
            data-snake-board="true"
            data-board-dir="ltr"
            role="img"
            aria-label={t("games.snake.title")}
          />
          {paused ? <p className="um-snake-pause">{t("games.paused")}</p> : null}
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
            <button type="button" className="um-play-btn" onClick={reset}>
              {t("games.newGame")}
            </button>
          </div>
        </div>
      ) : null}
    </PlayPanel>
  );
}
