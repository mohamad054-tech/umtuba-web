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
import { PlayPanel, PlayResult, PlayStat, usePlayHelp } from "./PlayChrome";

const COLORS = ["#f0a93b", "#7ed9b8", "#6ea8ff", "#e07a6a"];
const SPACING = 26;
const ROUNDS = [
  { balls: 16, speed: 26, turns: 1.15, angle: -0.9 },
  { balls: 22, speed: 32, turns: 1.6, angle: 0.7 },
  { balls: 28, speed: 40, turns: 2.05, angle: 2.1 },
] as const;

type Ball = { color: number; s: number };
type Shot = { x: number; y: number; vx: number; vy: number; color: number };
type Path = { points: { x: number; y: number }[]; len: number[]; total: number; w: number; h: number; round: number };

function colorsLeft(balls: Ball[]) {
  const found: number[] = [];
  for (const ball of balls) {
    if (!found.includes(ball.color)) found.push(ball.color);
  }
  return found.length ? found : [0];
}

function pickColor(balls: Ball[]) {
  const colors = colorsLeft(balls);
  return colors[Math.floor(Math.random() * colors.length)] ?? 0;
}

function makeChain(count: number, lead: number): Ball[] {
  const balls: Ball[] = [];
  const colors = [0, 0, 1, 1, 0, 0];
  for (let i = 0; i < count; i += 1) {
    const color = i < colors.length ? colors[i]! : Math.floor(i / 2) % COLORS.length;
    balls.push({ color, s: lead - i * SPACING });
  }
  return balls;
}

function buildPath(w: number, h: number, round: number): Path {
  const spec = ROUNDS[round] ?? ROUNDS[0];
  const cx = w * 0.5;
  const cy = h * 0.5;
  const maxR = Math.min(w, h) * 0.4;
  const minR = Math.min(w, h) * 0.18;
  const points: { x: number; y: number }[] = [];
  const steps = 280;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const radius = maxR - t * (maxR - minR);
    const angle = spec.angle + t * spec.turns * Math.PI * 2;
    points.push({
      x: cx + Math.cos(angle) * radius * (w / h > 1.05 ? 1.05 : 0.96),
      y: cy + Math.sin(angle) * radius,
    });
  }
  const len = [0];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    len.push(len[i - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return { points, len, total: len[len.length - 1] ?? 1, w, h, round };
}

function pointAt(path: Path, distance: number) {
  const s = Math.max(0, Math.min(path.total, distance));
  let lo = 0;
  let hi = path.len.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (path.len[mid]! < s) lo = mid + 1;
    else hi = mid;
  }
  const index = Math.max(1, lo);
  const prev = path.len[index - 1] ?? 0;
  const span = (path.len[index] ?? prev + 1) - prev || 1;
  const u = (s - prev) / span;
  const a = path.points[index - 1] ?? path.points[0]!;
  const b = path.points[index] ?? a;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

function sortChain(balls: Ball[]) {
  balls.sort((a, b) => b.s - a.s);
}

function pushApart(balls: Ball[]) {
  sortChain(balls);
  for (let i = 1; i < balls.length; i += 1) {
    const limit = balls[i - 1]!.s - SPACING;
    if (balls[i]!.s > limit) balls[i]!.s = limit;
  }
}

function pullClosed(balls: Ball[], dt: number) {
  sortChain(balls);
  if (!balls.length) return;
  for (let i = 1; i < balls.length; i += 1) {
    const desired = balls[i - 1]!.s - SPACING;
    const ball = balls[i]!;
    if (ball.s > desired) ball.s = desired;
    else ball.s += Math.min(desired - ball.s, 220 * dt);
  }
}

function clearTouching(balls: Ball[]) {
  sortChain(balls);
  const drop = new Set<Ball>();
  let index = 0;
  while (index < balls.length) {
    let end = index + 1;
    while (
      end < balls.length &&
      balls[end]!.color === balls[index]!.color &&
      balls[end - 1]!.s - balls[end]!.s <= SPACING * 1.35
    ) {
      end += 1;
    }
    if (end - index >= 3) {
      for (let k = index; k < end; k += 1) drop.add(balls[k]!);
    }
    index = end;
  }
  if (!drop.size) return 0;
  const next = balls.filter((ball) => !drop.has(ball));
  balls.splice(0, balls.length, ...next);
  return drop.size;
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
  const ballsRef = useRef<Ball[]>([]);
  const pathRef = useRef<Path | null>(null);
  const shotRef = useRef<Shot | null>(null);
  const aimRef = useRef<{ x: number; y: number } | null>(null);
  const readyRef = useRef(0);
  const queuedRef = useRef(1);
  const roundRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const comboUntil = useRef(0);
  const overRef = useRef<"win" | "lose" | null>(null);
  const layoutRef = useRef(true);
  const pauseRef = useRef(true);
  const bannerRef = useRef(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [over, setOver] = useState<"win" | "lose" | null>(null);
  const [banner, setBanner] = useState(false);
  const [isBest, setIsBest] = useState(false);

  const keepAmmo = () => {
    const colors = colorsLeft(ballsRef.current);
    if (!colors.includes(readyRef.current)) readyRef.current = pickColor(ballsRef.current);
    if (!colors.includes(queuedRef.current)) queuedRef.current = pickColor(ballsRef.current);
  };

  const beginRound = (index: number, keepScore: boolean) => {
    roundRef.current = index;
    pathRef.current = null;
    ballsRef.current = [];
    layoutRef.current = true;
    readyRef.current = 0;
    queuedRef.current = 1;
    shotRef.current = null;
    aimRef.current = null;
    bannerRef.current = false;
    if (!keepScore) {
      scoreRef.current = 0;
      setScore(0);
      setIsBest(false);
    }
    setRound(index);
    setBanner(false);
  };

  const finish = (result: "win" | "lose") => {
    if (overRef.current) return;
    overRef.current = result;
    const previous = readBest("marble-chain") ?? 0;
    setIsBest(scoreRef.current > previous);
    writeBestIfHigher("marble-chain", scoreRef.current);
    setScore(scoreRef.current);
    setOver(result);
    if (result === "win") sfx.win();
    else sfx.no();
  };

  const restart = () => {
    overRef.current = null;
    setOver(null);
    beginRound(0, false);
    help.keepReadyOnReplay();
  };

  const nextRound = () => {
    const next = roundRef.current + 1;
    if (next >= ROUNDS.length) {
      finish("win");
      return;
    }
    beginRound(next, true);
    sfx.flip();
  };

  useEffect(() => {
    pauseRef.current = !help.ready || help.helpOpen || Boolean(over) || banner;
  }, [help.ready, help.helpOpen, over, banner]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const lite = deviceIsSlow();
    let frame = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = lite ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
      const pw = Math.floor(w * dpr);
      const ph = Math.floor(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      let path = pathRef.current;
      if (!path || path.round !== roundRef.current || Math.abs(path.w - w) > 8 || Math.abs(path.h - h) > 8) {
        const previous = path;
        path = buildPath(w, h, roundRef.current);
        if (previous && previous.round === path.round && previous.total > 0 && !layoutRef.current) {
          const scale = path.total / previous.total;
          for (const ball of ballsRef.current) ball.s *= scale;
        }
        pathRef.current = path;
      }
      if (layoutRef.current) {
        ballsRef.current = makeChain(ROUNDS[roundRef.current]!.balls, Math.min(path.total * 0.42, path.total - 40));
        readyRef.current = 0;
        queuedRef.current = 1;
        layoutRef.current = false;
      }

      ctx.beginPath();
      for (let i = 0; i < path.points.length; i += 6) {
        const p = path.points[i]!;
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const hole = pointAt(path, path.total);
      ctx.lineTo(hole.x, hole.y);
      ctx.strokeStyle = "rgba(240, 169, 59, 0.45)";
      ctx.lineWidth = 16;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "#140b22";
      ctx.arc(hole.x, hole.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f0a93b";
      ctx.lineWidth = 3;
      ctx.stroke();

      const spec = ROUNDS[roundRef.current] ?? ROUNDS[0];
      if (!pauseRef.current && !overRef.current && !bannerRef.current) {
        const balls = ballsRef.current;
        sortChain(balls);
        if (balls[0]) balls[0].s += spec.speed * dt;
        pullClosed(balls, dt);
        const shot = shotRef.current;
        if (shot) {
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
            let hit: Ball | null = null;
            let best = 28;
            const prevX = shot.x - shot.vx * dt;
            const prevY = shot.y - shot.vy * dt;
            for (const ball of balls) {
              if (ball.s < 0) continue;
              const p = pointAt(path, ball.s);
              const vx = shot.x - prevX;
              const vy = shot.y - prevY;
              const len2 = vx * vx + vy * vy || 1;
              const tHit = Math.max(0, Math.min(1, ((p.x - prevX) * vx + (p.y - prevY) * vy) / len2));
              const dist = Math.hypot(p.x - (prevX + vx * tHit), p.y - (prevY + vy * tHit));
              if (dist < best) {
                best = dist;
                hit = ball;
              }
            }
          if (hit) {
            const at = pointAt(path, hit.s);
            const ahead = pointAt(path, hit.s + 14);
            const behind = pointAt(path, hit.s - 14);
            const towardHole = Math.hypot(ahead.x - shot.x, ahead.y - shot.y) < Math.hypot(behind.x - shot.x, behind.y - shot.y);
            balls.push({ color: shot.color, s: hit.s + (towardHole ? SPACING * 0.45 : -SPACING * 0.45) });
            pushApart(balls);
            shotRef.current = null;
            sfx.flip();
          } else if (shot.x < -30 || shot.y < -30 || shot.x > w + 30 || shot.y > h + 30) {
            shotRef.current = null;
          }
        }
        const removed = clearTouching(balls);
        if (removed) {
          const stamp = now;
          if (stamp > comboUntil.current) comboRef.current = 0;
          comboRef.current += 1;
          comboUntil.current = stamp + 800;
          scoreRef.current += removed * 50 * comboRef.current;
          setScore(scoreRef.current);
          sfx.ok();
          keepAmmo();
        }
        if (!balls.length) {
          if (roundRef.current >= ROUNDS.length - 1) finish("win");
          else {
            bannerRef.current = true;
            setBanner(true);
            sfx.win();
          }
        } else if (balls[0] && balls[0].s >= path.total - 8) {
          finish("lose");
        }
      }

      for (const ball of ballsRef.current) {
        if (ball.s < -4 || ball.s > path.total + 4) continue;
        const p = pointAt(path, ball.s);
        ctx.beginPath();
        ctx.fillStyle = COLORS[ball.color] ?? COLORS[0]!;
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.arc(p.x - 3, p.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      const flying = shotRef.current;
      if (flying) {
        ctx.beginPath();
        ctx.fillStyle = COLORS[flying.color] ?? COLORS[0]!;
        ctx.arc(flying.x, flying.y, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      const sx = w / 2;
      const sy = h / 2;
      const aim = aimRef.current;
      if (aim) {
        const dx = aim.x - sx;
        const dy = aim.y - sy;
        const len = Math.hypot(dx, dy) || 1;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 231, 163, 0.45)";
        ctx.lineWidth = 2;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (dx / len) * 120, sy + (dy / len) * 120);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.fillStyle = "#f0a93b";
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = COLORS[readyRef.current] ?? COLORS[0]!;
      ctx.arc(sx, sy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = COLORS[queuedRef.current] ?? COLORS[0]!;
      ctx.arc(sx + 28, sy + 16, 8, 0, Math.PI * 2);
      ctx.fill();

      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [sfx]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (overRef.current || bannerRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    aimRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!aimRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    aimRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const aim = aimRef.current;
    aimRef.current = null;
    if (!aim || overRef.current || bannerRef.current || shotRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const sx = rect.width / 2;
    const sy = rect.height / 2;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dx = x - sx;
    const dy = y - sy;
    if (Math.hypot(dx, dy) < 36 && Math.hypot(x - aim.x, y - aim.y) < 20) {
      const ready = readyRef.current;
      readyRef.current = queuedRef.current;
      queuedRef.current = ready;
      return;
    }
    const len = Math.hypot(dx, dy) || 1;
    shotRef.current = {
      x: sx,
      y: sy,
      vx: (dx / len) * 640,
      vy: (dy / len) * 640,
      color: readyRef.current,
    };
    readyRef.current = queuedRef.current;
    queuedRef.current = pickColor(ballsRef.current);
  };

  const stats = (
    <>
      <PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />
      <PlayStat label={t("games.round")} value={formatPlayNumber(locale, round + 1)} />
      <button type="button" className="um-play-btn" onClick={restart}>
        {t("games.playAgain")}
      </button>
    </>
  );

  if (over) {
    return (
      <PlayPanel stats={stats} fill>
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
    <PlayPanel stats={stats} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} fill>
      <div className="um-marble-stage">
        <canvas
          ref={canvasRef}
          className="um-marble-board um-lit-board"
          dir="ltr"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            aimRef.current = null;
          }}
        />
        {help.helpOpen ? (
        <div className="um-play-howto um-marble-howto" data-howto="true">
          <p className="um-play-howto-title">{t("games.howTo")}</p>
          <div className="um-marble-help">
            <svg viewBox="0 0 64 28" aria-hidden="true">
              <path d="M4 20 C16 4 28 4 40 16" fill="none" stroke="#f0a93b" strokeWidth="3" />
              <circle cx="14" cy="12" r="4" fill="#f0a93b" />
              <circle cx="24" cy="8" r="4" fill="#7ed9b8" />
              <circle cx="34" cy="12" r="4" fill="#6ea8ff" />
              <circle cx="52" cy="18" r="6" fill="#140b22" stroke="#f0a93b" strokeWidth="2" />
            </svg>
            <p>{t("games.marble-chain.howTo1")}</p>
          </div>
          <div className="um-marble-help">
            <svg viewBox="0 0 64 28" aria-hidden="true">
              <circle cx="32" cy="16" r="7" fill="#f0a93b" />
              <circle cx="32" cy="16" r="3" fill="#7ed9b8" />
              <line x1="32" y1="16" x2="54" y2="6" stroke="rgba(255,231,163,0.8)" strokeWidth="2" />
            </svg>
            <p>{t("games.marble-chain.howTo2")}</p>
          </div>
          <div className="um-marble-help">
            <svg viewBox="0 0 64 28" aria-hidden="true">
              <circle cx="16" cy="14" r="5" fill="#e07a6a" />
              <circle cx="28" cy="14" r="5" fill="#e07a6a" />
              <circle cx="40" cy="14" r="5" fill="#e07a6a" />
              <circle cx="54" cy="18" r="3" fill="#6ea8ff" />
            </svg>
            <p>{t("games.marble-chain.howTo3")}</p>
          </div>
          <div className="um-play-row" style={{ marginTop: 10 }}>
            <button type="button" className="um-play-btn go" data-howto-dismiss="true" onClick={help.dismissHelp}>
              {help.ready ? t("games.gotIt") : t("games.start")}
            </button>
          </div>
        </div>
      ) : null}
        {banner ? (
          <div className="um-marble-banner">
            <p>{t("games.youWin")}</p>
            <button type="button" className="um-play-btn go" onClick={nextRound}>
              {t("games.round")} {formatPlayNumber(locale, round + 2)}
            </button>
          </div>
        ) : null}
      </div>
    </PlayPanel>
  );
}
