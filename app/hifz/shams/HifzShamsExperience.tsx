"use client";

import Image from "next/image";
import localFont from "next/font/local";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ayahImageSrc, getAshShamsAyat } from "../../../lib/hifz/ashShamsData";
import { buildLinkingPrompt } from "../../../lib/hifz/linking";
import {
  isStarDimmed,
  markAyahReviewed,
  readProgress,
  softMasteryVibrate,
} from "../../../lib/hifz/progress";
import {
  firstLetterOfToken,
  tokenizeAyah,
} from "../../../lib/hifz/tokenize";
import type { HifzLocalProgress, HifzModeId } from "../../../lib/hifz/types";

const amiriQuran = localFont({
  src: "../../../public/fonts/amiri-quran/AmiriQuran-Regular.ttf",
  display: "swap",
  variable: "--font-amiri-quran",
});

const MODES: Array<{ id: HifzModeId; label: string }> = [
  { id: "learn", label: "تعلّم" },
  { id: "fading", label: "تلاشٍ" },
  { id: "letters", label: "الحروف الأولى" },
  { id: "linking", label: "الوصل" },
  { id: "order", label: "الترتيب" },
  { id: "sky", label: "السماء" },
];

/** Calm scattered positions for 15 constellation stars (phone-first %). */
const STAR_LAYOUT: Array<{ x: number; y: number }> = [
  { x: 18, y: 22 },
  { x: 42, y: 14 },
  { x: 68, y: 20 },
  { x: 84, y: 34 },
  { x: 72, y: 48 },
  { x: 48, y: 40 },
  { x: 26, y: 46 },
  { x: 12, y: 62 },
  { x: 34, y: 68 },
  { x: 56, y: 62 },
  { x: 78, y: 70 },
  { x: 62, y: 84 },
  { x: 38, y: 86 },
  { x: 20, y: 80 },
  { x: 50, y: 52 },
];

function clampAyah(n: number): number {
  return Math.min(15, Math.max(1, n));
}

export default function HifzShamsExperience() {
  const ayat = useMemo(() => getAshShamsAyat(), []);
  const [mode, setMode] = useState<HifzModeId>("learn");
  const [ayahIndex, setAyahIndex] = useState(1);
  const [fadeStep, setFadeStep] = useState(0);
  const [revealedWords, setRevealedWords] = useState<Set<number>>(() => new Set());
  const [linkPromptIndex, setLinkPromptIndex] = useState(1);
  const [linkShake, setLinkShake] = useState(false);
  const [linkDone, setLinkDone] = useState(false);
  const [orderNext, setOrderNext] = useState(1);
  const [orderPath, setOrderPath] = useState<number[]>([]);
  const [orderComplete, setOrderComplete] = useState(false);
  const [progress, setProgress] = useState<HifzLocalProgress | null>(null);
  const [fadeVisible, setFadeVisible] = useState(true);
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setProgress(readProgress());
  }, []);

  const ayah = ayat[ayahIndex - 1];
  const words = useMemo(() => tokenizeAyah(ayah.text), [ayah.text]);
  const imageSrc = ayahImageSrc(ayahIndex);

  const recordMastery = useCallback((n: number) => {
    const next = markAyahReviewed(n);
    setProgress(next);
    softMasteryVibrate();
  }, []);

  const goAyah = useCallback(
    (next: number) => {
      setFadeVisible(false);
      window.setTimeout(() => {
        setAyahIndex(clampAyah(next));
        setFadeStep(0);
        setRevealedWords(new Set());
        setFadeVisible(true);
      }, 180);
    },
    [],
  );

  const onPointerDown = (e: ReactPointerEvent) => {
    touchRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    if (mode !== "learn" && mode !== "fading" && mode !== "letters") return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    // RTL: swipe right → previous, swipe left → next (finger direction)
    if (dx > 0) goAyah(ayahIndex - 1);
    else goAyah(ayahIndex + 1);
  };

  useEffect(() => {
    if (mode !== "fading") return;
    setFadeStep(0);
    setRevealedWords(new Set());
    const t1 = window.setTimeout(() => setFadeStep(1), 900);
    const t2 = window.setTimeout(() => setFadeStep(2), 1800);
    const t3 = window.setTimeout(() => setFadeStep(3), 2700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [mode, ayahIndex]);

  useEffect(() => {
    if (mode === "letters") setRevealedWords(new Set());
  }, [mode, ayahIndex]);

  const linkingPrompt = useMemo(() => {
    if (mode !== "linking") return null;
    return buildLinkingPrompt(ayat, linkPromptIndex);
  }, [mode, ayat, linkPromptIndex]);

  const revealWord = (idx: number) => {
    setRevealedWords((prev) => {
      const next = new Set(prev);
      next.add(idx);
      if (next.size === words.length) {
        window.setTimeout(() => recordMastery(ayahIndex), 0);
      }
      return next;
    });
  };

  const wordOpacity = (idx: number): number => {
    if (mode === "learn") return 1;
    if (mode === "letters") {
      return revealedWords.has(idx) ? 1 : 0.22;
    }
    if (mode === "fading") {
      if (revealedWords.has(idx)) return 1;
      if (fadeStep <= 0) return 1;
      if (fadeStep === 1) return idx % 3 === 0 ? 0.35 : 1;
      if (fadeStep === 2) return idx % 2 === 0 ? 0.2 : 0.55;
      return 0.08;
    }
    return 1;
  };

  const imageOpacity =
    mode === "fading" && fadeStep >= 3 && revealedWords.size < words.length
      ? 0.15
      : 1;

  const onLinkChoose = (chosen: number) => {
    if (!linkingPrompt) return;
    if (chosen === linkingPrompt.correctAyah) {
      recordMastery(linkingPrompt.fromAyah);
      recordMastery(linkingPrompt.correctAyah);
      if (linkPromptIndex >= 14) {
        setLinkDone(true);
      } else {
        setLinkPromptIndex((n) => n + 1);
        setLinkShake(false);
      }
    } else {
      setLinkShake(true);
      window.setTimeout(() => setLinkShake(false), 420);
    }
  };

  const onOrderTap = (n: number) => {
    if (orderComplete) return;
    if (n !== orderNext) return;
    const path = [...orderPath, n];
    setOrderPath(path);
    recordMastery(n);
    if (n === 15) {
      setOrderComplete(true);
    } else {
      setOrderNext(n + 1);
    }
  };

  const skyStars = progress?.stars ?? {};

  return (
    <div
      className={`${amiriQuran.variable} fixed inset-0 z-[200] flex flex-col overflow-hidden text-white`}
      dir="rtl"
      lang="ar"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #1a1540 0%, #0a0a1a 45%, #050510 100%)",
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,220,150,0.7), transparent)," +
            "radial-gradient(1px 1px at 70% 20%, rgba(255,230,180,0.55), transparent)," +
            "radial-gradient(1.5px 1.5px at 40% 70%, rgba(255,210,120,0.5), transparent)," +
            "radial-gradient(1px 1px at 85% 60%, rgba(255,240,200,0.45), transparent)",
        }}
      />

      <header className="relative z-10 shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-center text-[11px] tracking-[0.35em] text-[#e8c87a]/70">
          سماء الحفظ
        </p>
        <h1 className="mt-1 text-center text-lg font-semibold text-[#f3e6c0]">
          سورة الشمس
        </h1>
      </header>

      <nav
        className="relative z-10 mx-auto flex w-full max-w-lg gap-1.5 overflow-x-auto px-3 pb-3"
        aria-label="أوضاع الحفظ"
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMode(m.id);
                setFadeStep(0);
                setRevealedWords(new Set());
                if (m.id === "linking") {
                  setLinkPromptIndex(1);
                  setLinkDone(false);
                }
                if (m.id === "order") {
                  setOrderNext(1);
                  setOrderPath([]);
                  setOrderComplete(false);
                }
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition ${
                active
                  ? "bg-[#e8c87a]/20 text-[#f5e6b8] ring-1 ring-[#e8c87a]/45"
                  : "bg-white/5 text-white/55 ring-1 ring-white/10"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </nav>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {(mode === "learn" || mode === "fading" || mode === "letters") && (
          <div
            className={`mx-auto flex w-full max-w-lg flex-1 flex-col transition-opacity duration-300 ${
              fadeVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-5">
              <div
                className="relative aspect-square w-full max-w-[min(100%,280px)] overflow-hidden rounded-[28px] border border-white/10 bg-[#080816]/70 transition-opacity duration-700"
                style={{ opacity: imageOpacity }}
              >
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    sizes="280px"
                    className="object-cover"
                    priority={ayahIndex <= 2}
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 40% 30%, #2a2458, #050510 70%)",
                    }}
                  />
                )}
              </div>

              <div
                className={`${amiriQuran.className} px-2 text-center text-[1.55rem] leading-[2.35] text-[#f7efd8] sm:text-[1.75rem]`}
              >
                {words.map((word, idx) => {
                  const showLettersOnly =
                    mode === "letters" && !revealedWords.has(idx);
                  const opaque = wordOpacity(idx);
                  const hiddenFaded =
                    mode === "fading" && fadeStep >= 1 && !revealedWords.has(idx);
                  return (
                    <button
                      key={`${ayahIndex}-${idx}`}
                      type="button"
                      disabled={mode === "learn"}
                      onClick={() => {
                        if (mode === "fading" || mode === "letters") {
                          revealWord(idx);
                        }
                      }}
                      className={`mx-0.5 inline-block rounded-md px-0.5 align-baseline transition-opacity duration-700 ${
                        mode === "learn" ? "cursor-default" : "cursor-pointer"
                      } ${hiddenFaded ? "hover:opacity-40" : ""}`}
                      style={{ opacity: opaque } satisfies CSSProperties}
                      aria-label={
                        showLettersOnly
                          ? `كشف كلمة ${idx + 1}`
                          : undefined
                      }
                    >
                      {showLettersOnly ? firstLetterOfToken(word) : word}
                    </button>
                  );
                })}
                <span className="ms-2 inline-block align-baseline font-sans text-base text-[#e8c87a]/80">
                  ﴿{ayahIndex}﴾
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goAyah(ayahIndex + 1)}
                disabled={ayahIndex >= 15}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 disabled:opacity-30"
              >
                التالية
              </button>
              <span className="text-xs text-white/40">
                {ayahIndex} / 15
              </span>
              <button
                type="button"
                onClick={() => goAyah(ayahIndex - 1)}
                disabled={ayahIndex <= 1}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 disabled:opacity-30"
              >
                السابقة
              </button>
            </div>
          </div>
        )}

        {mode === "linking" && (
          <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6">
            {linkDone || !linkingPrompt ? (
              <p className="text-center text-[#e8c87a]/90">
                أحسنت — وصلتَ آخر الآيات بهدوء.
              </p>
            ) : (
              <>
                <p className="text-sm text-white/50">أكمل الوصل…</p>
                <p
                  className={`${amiriQuran.className} text-center text-2xl leading-relaxed text-[#f7efd8] transition-transform`}
                  style={
                    linkShake
                      ? { animation: "hifz-shake 0.4s ease" }
                      : undefined
                  }
                >
                  …{linkingPrompt.endSnippet}
                  <span className="ms-2 font-sans text-sm text-[#e8c87a]/70">
                    ﴿{linkingPrompt.fromAyah}﴾
                  </span>
                </p>
                <div className="flex w-full flex-col gap-2">
                  {linkingPrompt.options.map((opt) => (
                    <button
                      key={opt.ayah}
                      type="button"
                      onClick={() => onLinkChoose(opt.ayah)}
                      className={`${amiriQuran.className} rounded-2xl border border-[#e8c87a]/25 bg-[#080816]/80 px-4 py-3 text-lg text-[#f3e6c0] transition hover:border-[#e8c87a]/55`}
                    >
                      {opt.snippet}…
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {mode === "order" && (
          <div className="relative mx-auto h-full w-full max-w-lg flex-1">
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              {orderPath.length > 1 &&
                orderPath.slice(1).map((n, i) => {
                  const a = STAR_LAYOUT[orderPath[i] - 1];
                  const b = STAR_LAYOUT[n - 1];
                  return (
                    <line
                      key={`line-${n}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="rgba(232,200,122,0.75)"
                      strokeWidth="0.45"
                    />
                  );
                })}
            </svg>
            {STAR_LAYOUT.map((pos, i) => {
              const n = i + 1;
              const lit = orderPath.includes(n);
              const next = n === orderNext && !orderComplete;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onOrderTap(n)}
                  className={`absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full text-xs transition ${
                    lit
                      ? "bg-[#e8c87a] text-[#1a1205] shadow-[0_0_16px_rgba(232,200,122,0.65)]"
                      : next
                        ? "bg-white/15 text-[#f5e6b8] ring-1 ring-[#e8c87a]/50"
                        : "bg-white/10 text-white/50"
                  } ${orderComplete ? "shadow-[0_0_22px_rgba(232,200,122,0.85)]" : ""}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  aria-label={`آية ${n}`}
                >
                  {n}
                </button>
              );
            })}
            {orderComplete && (
              <p className="absolute inset-x-0 bottom-4 text-center text-sm text-[#e8c87a]/90">
                اكتمل برج الآيات بهدوء.
              </p>
            )}
          </div>
        )}

        {mode === "sky" && (
          <div className="relative mx-auto h-full w-full max-w-lg flex-1">
            <p className="mb-3 text-center text-sm text-white/45">
              كل آية راجعتها تصبح نجمة. بعد أيام قليلة تخفت قليلاً حتى تعود إليها.
            </p>
            {STAR_LAYOUT.map((pos, i) => {
              const n = i + 1;
              const entry = skyStars[String(n)];
              const dim = isStarDimmed(entry?.lastReviewedAt);
              const known = Boolean(entry);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setMode("learn");
                    goAyah(n);
                  }}
                  title={
                    entry?.lastReviewedAt
                      ? `آخر مراجعة: ${new Date(entry.lastReviewedAt).toLocaleDateString("ar")}`
                      : "لم تُراجع بعد"
                  }
                  className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full transition"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    background: known
                      ? dim
                        ? "rgba(232,200,122,0.28)"
                        : "rgba(232,200,122,0.95)"
                      : "rgba(255,255,255,0.12)",
                    boxShadow: known && !dim
                      ? "0 0 14px rgba(232,200,122,0.7)"
                      : "none",
                  }}
                  aria-label={`نجمة الآية ${n}`}
                />
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
