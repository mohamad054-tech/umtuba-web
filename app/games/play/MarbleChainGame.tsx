"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../components/i18n";
import {
  createPlaySfx,
  formatPlayNumber,
  prefersReducedMotion,
  verdictFromScore,
} from "../../../lib/games/play/engine";
import { readBest, writeBestIfHigher } from "../../../lib/games/play/scores";
import {
  PlayHowTo,
  PlayPanel,
  PlayResult,
  PlayStat,
  usePlayHelp,
} from "./PlayChrome";

const COLORS = ["#f0a93b", "#7ed9b8", "#6ea8ff", "#e07a6a"];
const GAP = 0.046;
const STAGES = [
  { speed: 0.01, balls: 14 },
  { speed: 0.013, balls: 16 },
  { speed: 0.016, balls: 18 },
] as const;

type Shot = { x: number; y: number; vx: number; vy: number; color: number };

function pathPoint(t: number, w: number, h: number, stage: number) {
  const x = 28 + t * (w - 56);
  if (stage === 1) {
    return { x, y: h * 0.44 + Math.sin(t * Math.PI * 2.5) * h * 0.2 };
  }
  if (stage >= 2) {
    return { x, y: h * 0.4 + Math.sin(t * Math.PI * 3.2) * h * 0.22 };
  }
  return { x, y: h * 0.4 + Math.sin(t * Math.PI * 1.15) * h * 0.16 };
}

function makeChain(count: number): number[] {
  const balls: number[] = [];
  for (let i = 0; i < count; i += 1) balls.push(Math.floor(i / 2) % COLORS.length);
  return balls;
}

function ballT(head: number, index: number) {
  return head - index * GAP;
}

function clearRuns(balls: number[]) {
  const next = [...balls];
  let removed = 0;
  let chains = 0;
  let points = 0;
  let again = true;
  while (again) {
    again = false;
    let i = 0;
    while (i < next.length) {
      let j = i + 1;
      while (j < next.length && next[j] === next[i]) j += 1;
      if (j - i >= 3) {
        const count = j - i;
        chains += 1;
        removed += count;
        points += count * 40 * chains;
        next.splice(i, count);
        again = true;
      } else {
        i = j;
      }
    }
  }
  return { balls: next, removed, points };
}

function deviceIsSlow() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory;
  const cores = navigator.hardwareConcurrency || 8;
  return prefersReducedMotion() || (typeof memory === "number" && memory <= 4) || cores <= 4;
}

export default function MarbleChainGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballsRef = useRef<number[]>(makeChain(STAGES[0].balls));
  const headRef = useRef(0.4);
  const stageRef = useRef(0);
  const shotRef = useRef<Shot | null>(null);
  const aimRef = useRef<{ x: number; y: number } | null>(null);
  const readyRef = useRef(Math.floor(Math.random() * COLORS.length));
  const queuedRef = useRef((readyRef.current + 1) % COLORS.length);
  const scoreRef = useRef(0);
  const overRef = useRef<"win" | "lose" | null>(null);
  const liteRef = useRef(false);
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(0);
  const [over, setOver] = useState<"win" | "lose" | null>(null);
  const [isBest, setIsBest] = useState(false);

  const finish = (result: "win" | "lose") => {
    overRef.current = result;
    const previous = readBest("marble-chain") ?? 0;
    setIsBest(scoreRef.current > previous);
    writeBestIfHigher("marble-chain", scoreRef.current);
    setOver(result);
    if (result === "win") sfx.win();
    else sfx.no();
  };

  const restart = () => {
    ballsRef.current = makeChain(STAGES[0].balls);
    headRef.current = 0.4;
    stageRef.current = 0;
    shotRef.current = null;
    aimRef.current = null;
    readyRef.current = Math.floor(Math.random() * COLORS.length);
    queuedRef.current = (readyRef.current + 1) % COLORS.length;
    scoreRef.current = 0;
    overRef.current = null;
    setScore(0);
    setStage(0);
    setOver(null);
    setIsBest(false);
    help.keepReadyOnReplay();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !help.ready || over) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    liteRef.current = deviceIsSlow();
    let slowFrames = 0;
    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(32, now - last) / 1000;
      last = now;
      if (dt > 0.028) slowFrames += 1;
      else slowFrames = 0;
      if (slowFrames > 8) liteRef.current = true;
      const lite = liteRef.current;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const dpr = lite ? 1 : Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const stageIndex = stageRef.current;

      ctx.beginPath();
      const steps = lite ? 18 : 40;
      for (let i = 0; i <= steps; i += 1) {
        const p = pathPoint(i / steps, w, h, stageIndex);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = "rgba(240, 169, 59, 0.55)";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.stroke();

      if (!overRef.current) {
        headRef.current += dt * STAGES[stageIndex]!.speed;
        const shot = shotRef.current;
        if (shot) {
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          let hit = -1;
          let best = 22;
          ballsRef.current.forEach((_, index) => {
            const p = pathPoint(ballT(headRef.current, index), w, h, stageIndex);
            const dist = Math.hypot(p.x - shot.x, p.y - shot.y);
            if (dist < best) {
              best = dist;
              hit = index;
            }
          });
          if (hit >= 0) {
            const p = pathPoint(ballT(headRef.current, hit), w, h, stageIndex);
            const insertAt = shot.x < p.x ? hit + 1 : hit;
            ballsRef.current.splice(insertAt, 0, shot.color);
            const cleared = clearRuns(ballsRef.current);
            ballsRef.current = cleared.balls;
            shotRef.current = null;
            if (cleared.removed) {
              headRef.current = Math.max(0.2, headRef.current - cleared.removed * GAP);
              scoreRef.current += cleared.points;
              setScore(scoreRef.current);
              sfx.ok();
            } else sfx.flip();
            if (ballsRef.current.length === 0) {
              if (stageRef.current >= STAGES.length - 1) finish("win");
              else {
                stageRef.current += 1;
                ballsRef.current = makeChain(STAGES[stageRef.current]!.balls);
                headRef.current = 0.36;
                setStage(stageRef.current);
                sfx.win();
              }
            }
          } else if (shot.x < -20 || shot.y < -20 || shot.x > w + 20 || shot.y > h + 20) {
            shotRef.current = null;
          }
        }
        if (headRef.current >= 0.98 && ballsRef.current.length > 0) finish("lose");
      }

      ballsRef.current.forEach((color, index) => {
        const point = ballT(headRef.current, index);
        if (point < -0.02 || point > 1.02) return;
        const p = pathPoint(point, w, h, stageIndex);
        const fill = COLORS[color] ?? COLORS[0]!;
        ctx.beginPath();
        ctx.fillStyle = fill;
        if (!lite) {
          ctx.shadowColor = fill;
          ctx.shadowBlur = 12;
        }
        ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      const flying = shotRef.current;
      if (flying) {
        ctx.beginPath();
        ctx.fillStyle = COLORS[flying.color] ?? COLORS[0]!;
        ctx.arc(flying.x, flying.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      const sx = w / 2;
      const sy = h - 28;
      ctx.beginPath();
      ctx.fillStyle = COLORS[readyRef.current] ?? COLORS[0]!;
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = COLORS[queuedRef.current] ?? COLORS[0]!;
      ctx.arc(sx + 30, sy + 2, 8, 0, Math.PI * 2);
      ctx.fill();
      const aim = aimRef.current;
      if (aim) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 231, 163, 0.8)";
        ctx.moveTo(sx, sy);
        ctx.lineTo(aim.x, aim.y);
        ctx.stroke();
      }

      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [help.ready, over, sfx]);

  const swapReady = () => {
    const ready = readyRef.current;
    readyRef.current = queuedRef.current;
    queuedRef.current = ready;
  };

  const shoot = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || shotRef.current || overRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const sx = rect.width / 2;
    const sy = rect.height - 28;
    const dx = x - sx;
    const dy = y - sy;
    if (Math.hypot(dx, dy) < 26) {
      swapReady();
      return;
    }
    const len = Math.hypot(dx, dy) || 1;
    shotRef.current = {
      x: sx,
      y: sy,
      vx: (dx / len) * 420,
      vy: (dy / len) * 420,
      color: readyRef.current,
    };
    readyRef.current = queuedRef.current;
    queuedRef.current = Math.floor(Math.random() * COLORS.length);
  };

  const stats = (
    <>
      <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
      <PlayStat label={t("games.round")} value={formatPlayNumber(locale, stage + 1)} />
    </>
  );

  if (over) {
    return (
      <PlayPanel stats={stats}>
        <PlayResult
          score={score}
          verdictKey={over === "win" ? "games.youWin" : verdictFromScore("high", score)}
          detail={isBest ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } }) : t("games.marble-chain.title")}
          onAgain={restart}
        />
      </PlayPanel>
    );
  }

  return (
    <PlayPanel stats={stats} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp}>
      <PlayHowTo
        open={help.helpOpen}
        lines={[
          t("games.marble-chain.howTo1"),
          t("games.marble-chain.howTo2"),
          t("games.marble-chain.howTo3"),
        ]}
        cta={help.ready ? "gotIt" : "start"}
        onDismiss={help.dismissHelp}
      />
      {help.ready ? (
        <canvas
          ref={canvasRef}
          className="um-marble-board um-play-board um-lit-board"
          dir="ltr"
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            aimRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            aimRef.current = null;
            shoot(event.clientX, event.clientY);
          }}
        />
      ) : null}
    </PlayPanel>
  );
}
