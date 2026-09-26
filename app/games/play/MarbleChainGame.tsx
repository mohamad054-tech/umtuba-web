"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useI18n } from "../../components/i18n";
import { formatPlayNumber, prefersReducedMotion, verdictFromScore } from "../../../lib/games/play/engine";
import {
  MARBLE_SPACING,
  clearTouching,
  createMarbleSfx,
  pushApart,
  segmentsOf,
  stepChain,
} from "../../../lib/games/play/marbleChain";
import { readBest, writeBestIfHigher } from "../../../lib/games/play/scores";
import { readGameMuted, writeGameMuted } from "../../../lib/games/play/theme";
import Link from "next/link";
import { APP_ROUTES } from "../../lib/nav";
import { PlayResult, usePlayHelp } from "./PlayChrome";

const COLORS = ["#f0a93b", "#3ee0b0", "#5aa6ff", "#ff6d6d"];
const SPACING = MARBLE_SPACING;

function subscribeGameMuted(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("umtuba-games-mute", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("umtuba-games-mute", onChange);
    window.removeEventListener("storage", onChange);
  };
}
const ROUNDS = [
  { balls: 12, speed: 16, turns: 1.05, angle: -0.9 },
  { balls: 18, speed: 24, turns: 1.45, angle: 0.7 },
  { balls: 24, speed: 32, turns: 1.85, angle: 2.1 },
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

function makeChain(count: number, lead: number, round: number): Ball[] {
  const balls: Ball[] = [];
  const rhythm = round >= 2 ? [2, 1, 2, 1] : [2];
  let color = round % COLORS.length;
  let run = rhythm[0] ?? 2;
  let step = 0;
  for (let i = 0; i < count; i += 1) {
    if (run <= 0) {
      step += 1;
      color = (color + 1) % COLORS.length;
      run = rhythm[step % rhythm.length] ?? 2;
    }
    balls.push({ color, s: lead - i * SPACING });
    run -= 1;
  }
  return balls;
}

function buildPath(w: number, h: number, round: number): Path {
  const spec = ROUNDS[round] ?? ROUNDS[0];
  const cx = w * 0.5;
  const cy = h * 0.5;
  const maxR = Math.min(w, h) * 0.44;
  const minR = Math.min(w, h) * 0.2;
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

function deviceIsSlow() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory;
  const cores = navigator.hardwareConcurrency || 8;
  return prefersReducedMotion() || (typeof memory === "number" && memory <= 4) || cores <= 4;
}

type Bit = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Floater = { x: number; y: number; text: string; life: number };

function launcherHub(w: number, h: number) {
  return Math.min(48, Math.max(34, Math.min(w, h) * 0.1));
}

function traceTrack(ctx: CanvasRenderingContext2D, path: Path) {
  ctx.beginPath();
  for (let i = 0; i < path.points.length; i += 2) {
    const p = path.points[i]!;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
}

function paintMark(ctx: CanvasRenderingContext2D, color: number, radius: number) {
  const s = radius * 0.46;
  ctx.fillStyle = "rgba(18, 10, 16, 0.88)";
  ctx.strokeStyle = "rgba(18, 10, 16, 0.88)";
  ctx.lineWidth = Math.max(1.4, radius * 0.1);
  ctx.lineCap = "round";
  if (color === 0) {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55);
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.stroke();
    }
    return;
  }
  ctx.beginPath();
  if (color === 1) {
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.9, s * 0.62);
    ctx.lineTo(-s * 0.9, s * 0.62);
  } else if (color === 2) {
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.72, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.72, 0);
  } else {
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? s : s * 0.38;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function paintBall(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: number, spin: number, lite: boolean) {
  ctx.beginPath();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.ellipse(x, y + radius * 0.85, radius * 0.72, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  const fill = COLORS[color] ?? COLORS[0]!;
  const glow = ctx.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.1, x, y, radius);
  glow.addColorStop(0, "#fff8e8");
  glow.addColorStop(0.28, fill);
  glow.addColorStop(1, "#1a1028");
  ctx.beginPath();
  ctx.fillStyle = glow;
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  if (!lite) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.arc(x, y, radius - 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  paintMark(ctx, color, radius);
  ctx.restore();
}

export default function MarbleChainGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createMarbleSfx(), []);
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
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const aimAngle = useRef(-Math.PI / 2);
  const shownAngle = useRef(-Math.PI / 2);
  const recoilRef = useRef(0);
  const flashRef = useRef(0);
  const bitsRef = useRef<Bit[]>([]);
  const floatRef = useRef<Floater[]>([]);
  const starsRef = useRef<{ x: number; y: number; r: number }[] | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [over, setOver] = useState<"win" | "lose" | null>(null);
  const [banner, setBanner] = useState(false);
  const [isBest, setIsBest] = useState(false);
  const [paused, setPaused] = useState(false);
  const muted = useSyncExternalStore(subscribeGameMuted, readGameMuted, () => false);

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
    if (!mutedRef.current) {
      if (result === "win") sfx.win();
      else sfx.lose();
    }
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
  };

  useEffect(() => {
    pauseRef.current = !help.ready || help.helpOpen || Boolean(over) || banner || paused;
    pausedRef.current = paused;
    mutedRef.current = muted;
  }, [help.ready, help.helpOpen, over, banner, paused, muted]);

  useEffect(() => {
    document.documentElement.setAttribute("data-marble-play", "1");
    return () => document.documentElement.removeAttribute("data-marble-play");
  }, []);

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
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#07061a");
      sky.addColorStop(0.55, "#1a1460");
      sky.addColorStop(1, "#5a2494");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      if (!starsRef.current || starsRef.current.length === 0) {
        starsRef.current = Array.from({ length: lite ? 18 : 36 }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.4 + 0.4,
        }));
      }
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (const star of starsRef.current) {
        ctx.globalAlpha = 0.35 + (Math.sin(now / 700 + star.x) + 1) * 0.2;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

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
        const start = roundRef.current === 0 ? 0.2 : roundRef.current === 1 ? 0.32 : 0.4;
        const chain = makeChain(
          ROUNDS[roundRef.current]!.balls,
          Math.min(path.total * start, path.total - 80),
          roundRef.current,
        );
        ballsRef.current = chain;
        readyRef.current = chain[0]?.color ?? 0;
        queuedRef.current = chain.find((ball) => ball.color !== readyRef.current)?.color ?? (readyRef.current + 1) % COLORS.length;
        layoutRef.current = false;
      }

      const hole = pointAt(path, path.total);
      traceTrack(ctx, path);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(240, 169, 59, 0.7)";
      ctx.shadowBlur = lite ? 0 : 18;
      ctx.strokeStyle = "rgba(240, 169, 59, 0.55)";
      ctx.lineWidth = 30;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#6a4a22";
      ctx.lineWidth = 24;
      ctx.stroke();
      const stone = ctx.createLinearGradient(0, 0, path.w, path.h);
      stone.addColorStop(0, "#3c3428");
      stone.addColorStop(0.5, "#1c160f");
      stone.addColorStop(1, "#2a2418");
      ctx.strokeStyle = stone;
      ctx.lineWidth = 14;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 231, 163, 0.28)";
      ctx.lineWidth = 16;
      ctx.stroke();
      const close = ballsRef.current[0] ? path.total - ballsRef.current[0].s < 140 : false;
      const pulse = 1 + Math.sin(now / 280) * 0.05;
      ctx.save();
      ctx.translate(hole.x, hole.y);
      ctx.scale(pulse, pulse);
      const gate = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
      gate.addColorStop(0, close ? "rgba(255, 120, 90, 0.95)" : "rgba(255, 228, 160, 0.95)");
      gate.addColorStop(0.4, close ? "rgba(90, 16, 28, 0.8)" : "rgba(120, 72, 16, 0.55)");
      gate.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gate;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffe7a3";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = close ? "rgba(255,160,140,0.9)" : "rgba(255,231,163,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 11, now / 380, now / 380 + Math.PI * 1.35);
      ctx.stroke();
      ctx.restore();

      const spec = ROUNDS[roundRef.current] ?? ROUNDS[0];
      if (!pauseRef.current && !overRef.current && !bannerRef.current) {
        const balls = ballsRef.current;
        const pulling = stepChain(balls, dt, spec.speed);
        if (pulling && comboRef.current > 0) comboUntil.current = Math.max(comboUntil.current, now + 700);
        if (!mutedRef.current && balls[0] && path.total - balls[0].s < 140) sfx.danger(now);
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
            recoilRef.current = 1;
            if (!mutedRef.current) sfx.insert();
          } else if (shot.x < -30 || shot.y < -30 || shot.x > w + 30 || shot.y > h + 30) {
            shotRef.current = null;
          }
        }
        const before = balls.slice();
        const removed = clearTouching(balls);
        if (removed) {
          const stamp = now;
          if (stamp > comboUntil.current) comboRef.current = 0;
          comboRef.current += 1;
          comboUntil.current = stamp + 2800;
          const gained = removed * 50 * comboRef.current;
          scoreRef.current += gained;
          setScore(scoreRef.current);
          if (!mutedRef.current) {
            sfx.pop(comboRef.current);
            if (segmentsOf(balls).length > 1) sfx.whoosh();
          }
          const cap = lite ? 16 : 28;
          flashRef.current = 0.55;
          let floated = false;
          for (const ball of before) {
            if (balls.includes(ball) || ball.s < 0) continue;
            const spot = pointAt(path, ball.s);
            if (!floated) {
              floatRef.current.push({ x: spot.x, y: spot.y - 8, text: `+${gained}`, life: 1 });
              if (comboRef.current > 1) {
                floatRef.current.push({ x: spot.x, y: spot.y - 30, text: `×${comboRef.current}`, life: 1.15 });
              }
              floated = true;
            }
            if (!lite) {
              for (let n = 0; n < 6 && bitsRef.current.length < cap; n += 1) {
                bitsRef.current.push({
                  x: spot.x,
                  y: spot.y,
                  vx: (Math.random() - 0.5) * 140,
                  vy: (Math.random() - 0.75) * 140,
                  life: 1,
                  color: n % 2 === 0 ? (COLORS[ball.color] ?? COLORS[0]!) : "#ffe7a3",
                });
              }
            }
          }
          keepAmmo();
        }
        if (!balls.length) {
          if (roundRef.current >= ROUNDS.length - 1) finish("win");
          else {
            bannerRef.current = true;
            setBanner(true);
            if (!mutedRef.current) sfx.win();
          }
        } else if (balls[0] && balls[0].s >= path.total - 8) {
          finish("lose");
        }
      }

      const ballR = Math.min(16, Math.max(13, w * 0.04));
      for (const ball of ballsRef.current) {
        if (ball.s < -4 || ball.s > path.total + 4) continue;
        const p = pointAt(path, ball.s);
        paintBall(ctx, p.x, p.y, ballR, ball.color, ball.s * 0.08, lite);
      }

      const flying = shotRef.current;
      if (flying) paintBall(ctx, flying.x, flying.y, ballR * 0.9, flying.color, now * 0.004, lite);

      bitsRef.current = bitsRef.current.filter((bit) => bit.life > 0);
      for (const bit of bitsRef.current) {
        bit.x += bit.vx * dt;
        bit.y += bit.vy * dt;
        bit.life -= dt * 1.6;
        ctx.globalAlpha = Math.max(0, bit.life);
        ctx.fillStyle = bit.color;
        ctx.beginPath();
        ctx.arc(bit.x, bit.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      floatRef.current = floatRef.current.filter((item) => item.life > 0);
      ctx.font = "800 22px sans-serif";
      ctx.textAlign = "center";
      for (const item of floatRef.current) {
        item.y -= 18 * dt;
        item.life -= dt * 0.8;
        ctx.globalAlpha = Math.max(0, item.life);
        ctx.fillStyle = "#ffe7a3";
        ctx.fillText(item.text, item.x, item.y);
      }
      ctx.globalAlpha = 1;
      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(255, 236, 190, ${flashRef.current * 0.28})`;
        ctx.fillRect(0, 0, w, h);
        flashRef.current = Math.max(0, flashRef.current - dt * 1.8);
      }

      const sx = w / 2;
      const sy = h / 2;
      const hub = launcherHub(w, h);
      const aim = aimRef.current;
      if (aim) aimAngle.current = Math.atan2(aim.y - sy, aim.x - sx);
      let spin = aimAngle.current - shownAngle.current;
      while (spin > Math.PI) spin -= Math.PI * 2;
      while (spin < -Math.PI) spin += Math.PI * 2;
      shownAngle.current += spin * Math.min(1, dt * 14);
      const ang = shownAngle.current;
      recoilRef.current = Math.max(0, recoilRef.current - dt * 4);
      const kick = recoilRef.current * 10;
      const lx = sx - Math.cos(ang) * kick;
      const ly = sy - Math.sin(ang) * kick;
      if (aim) {
        ctx.save();
        ctx.setLineDash([5, 7]);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 231, 163, 0.75)";
        ctx.lineWidth = 2;
        ctx.moveTo(lx + Math.cos(ang) * (hub + 8), ly + Math.sin(ang) * (hub + 8));
        ctx.lineTo(lx + Math.cos(ang) * (hub + 120), ly + Math.sin(ang) * (hub + 120));
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(lx, ly);
      const metal = ctx.createRadialGradient(-hub * 0.25, -hub * 0.3, hub * 0.15, 0, 0, hub);
      metal.addColorStop(0, "#fff6d8");
      metal.addColorStop(0.42, "#e2b04a");
      metal.addColorStop(1, "#6d3d0e");
      ctx.beginPath();
      ctx.fillStyle = metal;
      ctx.arc(0, 0, hub, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff1c4";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.rotate(ang);
      ctx.fillStyle = "#f3d48a";
      ctx.beginPath();
      ctx.moveTo(hub * 0.15, -hub * 0.26);
      ctx.lineTo(hub * 1.2, -hub * 0.14);
      ctx.lineTo(hub * 1.2, hub * 0.14);
      ctx.lineTo(hub * 0.15, hub * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#8a5a16";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      paintBall(ctx, lx + Math.cos(ang) * hub * 0.08, ly + Math.sin(ang) * hub * 0.08, hub * 0.46, readyRef.current, 0, lite);
      const nx = lx + hub * 0.95;
      const ny = ly + hub * 0.95;
      ctx.beginPath();
      ctx.fillStyle = "rgba(12, 8, 20, 0.72)";
      ctx.strokeStyle = "#ffe7a3";
      ctx.lineWidth = 2;
      ctx.arc(nx, ny, hub * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      paintBall(ctx, nx, ny, hub * 0.3, queuedRef.current, 0, lite);

      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [sfx]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    sfx.unlock();
    if (overRef.current || bannerRef.current || pausedRef.current) return;
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
    if (!aim || overRef.current || bannerRef.current || pausedRef.current || shotRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const sx = rect.width / 2;
    const sy = rect.height / 2;
    const hub = launcherHub(rect.width, rect.height);
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dx = x - sx;
    const dy = y - sy;
    const onHub = Math.hypot(dx, dy) < hub + 8;
    const onNext = Math.hypot(x - (sx + hub * 0.95), y - (sy + hub * 0.95)) < hub * 0.55;
    if ((onHub || onNext) && Math.hypot(x - aim.x, y - aim.y) < 18) {
      const ready = readyRef.current;
      readyRef.current = queuedRef.current;
      queuedRef.current = ready;
      return;
    }
    const len = Math.hypot(dx, dy) || 1;
    if (!mutedRef.current) sfx.shoot();
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

  const bar = (
    <div className="um-marble-bar">
      <Link href={APP_ROUTES.games} className="um-marble-icon" aria-label={t("games.backToCatalog")}>
        ←
      </Link>
      <span className="um-marble-readout">
        <small>{t("games.score")}</small>
        {formatPlayNumber(locale, score)}
      </span>
      <span className="um-marble-readout">
        <small>{t("games.round")}</small>
        {formatPlayNumber(locale, round + 1)}
      </span>
      <button type="button" className="um-marble-icon" onClick={() => setPaused((value) => !value)} aria-label={t("games.paused")}>
        {paused ? "▶" : "Ⅱ"}
      </button>
      <button type="button" className="um-marble-icon" onClick={help.toggleHelp} aria-label={t("games.howTo")}>
        ?
      </button>
      <button
        type="button"
        className="um-marble-icon"
        onClick={() => {
          sfx.unlock();
          writeGameMuted(!readGameMuted());
        }}
        aria-label={muted ? t("games.unmute") : t("games.mute")}
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );

  return (
    <div className="um-marble-shell">
      {bar}
      <div className="um-marble-stage">
        <canvas
          ref={canvasRef}
          className="um-marble-board"
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
            <svg viewBox="0 0 72 40" aria-hidden="true">
              <path d="M6 28 C18 8 34 8 46 22" fill="none" stroke="#e8c87a" strokeWidth="8" strokeLinecap="round" />
              <path d="M6 28 C18 8 34 8 46 22" fill="none" stroke="#2a2116" strokeWidth="3" strokeLinecap="round" />
              <circle cx="16" cy="18" r="6" fill="#f0a93b" />
              <circle cx="28" cy="12" r="6" fill="#3ee0b0" />
              <circle cx="40" cy="16" r="6" fill="#5aa6ff" />
              <circle cx="60" cy="26" r="8" fill="#120818" stroke="#ffe7a3" strokeWidth="2" />
            </svg>
            <p>{t("games.marble-chain.howTo1")}</p>
          </div>
          <div className="um-marble-help">
            <svg viewBox="0 0 72 40" aria-hidden="true">
              <circle cx="28" cy="22" r="11" fill="#e2b04a" stroke="#fff1c4" strokeWidth="2" />
              <circle cx="28" cy="22" r="5" fill="#3ee0b0" />
              <path d="M36 18 L52 8" fill="none" stroke="#ffe7a3" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="54" cy="30" r="5" fill="#5aa6ff" stroke="#ffe7a3" strokeWidth="1.5" />
            </svg>
            <p>{t("games.marble-chain.howTo2")}</p>
          </div>
          <div className="um-marble-help">
            <svg viewBox="0 0 72 40" aria-hidden="true">
              <circle cx="14" cy="20" r="7" fill="#ff6d6d" />
              <circle cx="30" cy="20" r="7" fill="#ff6d6d" />
              <circle cx="46" cy="20" r="7" fill="#ff6d6d" />
              <path d="M54 12 L62 20 L54 28" fill="none" stroke="#ffe7a3" strokeWidth="2" />
            </svg>
            <p>{t("games.marble-chain.howTo3")}</p>
          </div>
          <div className="um-play-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="um-play-btn go"
              data-howto-dismiss="true"
              onClick={() => {
                sfx.unlock();
                help.dismissHelp();
              }}
            >
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
        {over ? (
          <div className="um-marble-banner um-marble-over">
            <PlayResult
              score={score}
              verdictKey={over === "win" ? "games.youWin" : verdictFromScore("high", score)}
              detail={isBest ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } }) : t("games.marble-chain.title")}
              onAgain={restart}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
