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
import {
  HUSARY_AUDIO_ATTRIBUTION,
  REPEAT_COUNT_OPTIONS,
  REPEAT_PAUSE_LENGTH_OPTIONS,
  repeatWordOpacity,
  type HifzAudioClipId,
  type RepeatCount,
  type RepeatPauseLength,
} from "../../../lib/hifz/audio";
import { buildLinkingPrompt } from "../../../lib/hifz/linking";
import {
  markAyahReviewed,
  readProgress,
  readRepeatPauseLength,
  softMasteryVibrate,
  writeRepeatPauseLength,
} from "../../../lib/hifz/progress";
import {
  firstLetterOfToken,
  tokenizeAyah,
} from "../../../lib/hifz/tokenize";
import type { HifzLocalProgress, HifzModeId } from "../../../lib/hifz/types";
import { useHusaryPlayer } from "./useHusaryPlayer";

const amiriQuran = localFont({
  src: "../../../public/fonts/amiri-quran/AmiriQuran-Regular.ttf",
  display: "swap",
  variable: "--font-amiri-quran",
});

const MODES: Array<{ id: HifzModeId; label: string }> = [
  { id: "learn", label: "تعلّم" },
  { id: "listen", label: "الاستماع" },
  { id: "listenRepeat", label: "التكرار" },
  { id: "tilawaLink", label: "وصل التلاوة" },
  { id: "fading", label: "تلاشٍ" },
  { id: "letters", label: "الحروف الأولى" },
  { id: "linking", label: "الوصل" },
  { id: "order", label: "رتّب الآيات" },
  { id: "sky", label: "تقدّم الحفظ" },
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

const ORDER_HINT_IDLE_MS = 4500;

function clampAyah(n: number): number {
  return Math.min(15, Math.max(1, n));
}

function isAudioMode(mode: HifzModeId): boolean {
  return mode === "listen" || mode === "listenRepeat" || mode === "tilawaLink";
}

function countMemorized(stars: HifzLocalProgress["stars"]): number {
  let n = 0;
  for (let i = 1; i <= 15; i++) {
    if (stars[String(i)]) n += 1;
  }
  return n;
}

function nextUnreviewed(stars: HifzLocalProgress["stars"]): number | null {
  for (let i = 1; i <= 15; i++) {
    if (!stars[String(i)]) return i;
  }
  return null;
}

export default function HifzShamsExperience() {
  const ayat = useMemo(() => getAshShamsAyat(), []);
  const [mode, setMode] = useState<HifzModeId>("learn");
  const [ayahIndex, setAyahIndex] = useState(1);
  const [showBasmala, setShowBasmala] = useState(false);
  const [fadeStep, setFadeStep] = useState(0);
  const [revealedWords, setRevealedWords] = useState<Set<number>>(() => new Set());
  const [linkPromptIndex, setLinkPromptIndex] = useState(1);
  const [linkShake, setLinkShake] = useState(false);
  const [linkDone, setLinkDone] = useState(false);
  const [orderNext, setOrderNext] = useState(1);
  const [orderPath, setOrderPath] = useState<number[]>([]);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderStarted, setOrderStarted] = useState(false);
  const [orderHint, setOrderHint] = useState(false);
  const [orderPraise, setOrderPraise] = useState<string | null>(null);
  const [progress, setProgress] = useState<HifzLocalProgress | null>(null);
  const [fadeVisible, setFadeVisible] = useState(true);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const orderIdleRef = useRef<number | null>(null);
  const praiseTimerRef = useRef<number | null>(null);

  const player = useHusaryPlayer();

  useEffect(() => {
    setProgress(readProgress());
    player.setPauseLength(readRepeatPauseLength());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, []);

  const ayah = ayat[ayahIndex - 1];
  const words = useMemo(() => tokenizeAyah(ayah.text), [ayah.text]);
  const imageSrc = ayahImageSrc(ayahIndex);

  const recordMastery = useCallback((n: number) => {
    const next = markAyahReviewed(n);
    setProgress(next);
    softMasteryVibrate();
  }, []);

  const goAyah = useCallback((next: number) => {
    setFadeVisible(false);
    setShowBasmala(false);
    window.setTimeout(() => {
      setAyahIndex(clampAyah(next));
      setFadeStep(0);
      setRevealedWords(new Set());
      setFadeVisible(true);
    }, 180);
  }, []);

  // Sync displayed ayah with player when audio advances
  useEffect(() => {
    const clip = player.activeClip;
    if (clip == null) return;
    if (clip === "basmala") {
      setShowBasmala(true);
      return;
    }
    setShowBasmala(false);
    if (clip !== ayahIndex) {
      setAyahIndex(clip);
      setFadeVisible(true);
    }
  }, [player.activeClip, ayahIndex]);

  const clearOrderIdle = useCallback(() => {
    if (orderIdleRef.current != null) {
      window.clearTimeout(orderIdleRef.current);
      orderIdleRef.current = null;
    }
  }, []);

  const armOrderIdle = useCallback(() => {
    clearOrderIdle();
    if (!orderStarted || orderComplete) return;
    orderIdleRef.current = window.setTimeout(() => {
      setOrderHint(true);
    }, ORDER_HINT_IDLE_MS);
  }, [clearOrderIdle, orderComplete, orderStarted]);

  useEffect(() => {
    if (mode !== "order" || !orderStarted || orderComplete) {
      clearOrderIdle();
      return;
    }
    armOrderIdle();
    return clearOrderIdle;
  }, [mode, orderStarted, orderComplete, orderNext, armOrderIdle, clearOrderIdle]);

  useEffect(() => {
    return () => {
      if (praiseTimerRef.current != null) window.clearTimeout(praiseTimerRef.current);
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    touchRef.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    if (mode !== "learn" && mode !== "fading" && mode !== "letters" && !isAudioMode(mode)) {
      return;
    }
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
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

  useEffect(() => {
    if (!isAudioMode(mode)) {
      player.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stop only on mode leave
  }, [mode]);

  const linkingPrompt = useMemo(() => {
    if (mode !== "linking") return null;
    return buildLinkingPrompt(ayat, linkPromptIndex);
  }, [mode, ayat, linkPromptIndex]);

  const revealWord = (idx: number) => {
    setRevealedWords((prev) => {
      const next = setCopy(prev, idx);
      if (next.size === words.length) {
        window.setTimeout(() => recordMastery(ayahIndex), 0);
      }
      return next;
    });
  };

  const wordOpacity = (idx: number): number => {
    if (mode === "listenRepeat" && (player.playing || player.inRepeatSilence)) {
      return repeatWordOpacity(
        player.repeatIndex,
        player.repeatCount,
      );
    }
    if (mode === "learn" || isAudioMode(mode)) return 1;
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

  const showOrderPraise = (msg: string) => {
    if (praiseTimerRef.current != null) window.clearTimeout(praiseTimerRef.current);
    setOrderPraise(msg);
    praiseTimerRef.current = window.setTimeout(() => setOrderPraise(null), 1400);
  };

  const onOrderTap = (n: number) => {
    if (orderComplete) return;
    if (!orderStarted) {
      setOrderStarted(true);
      setOrderHint(false);
    }
    if (n !== orderNext) {
      setOrderHint(true);
      armOrderIdle();
      return;
    }
    const path = [...orderPath, n];
    setOrderPath(path);
    setOrderHint(false);
    recordMastery(n);
    showOrderPraise(n === 15 ? "أحسنت" : "في مكانها");
    if (n === 15) {
      setOrderComplete(true);
      clearOrderIdle();
    } else {
      setOrderNext(n + 1);
      armOrderIdle();
    }
  };

  const resetOrder = () => {
    setOrderNext(1);
    setOrderPath([]);
    setOrderComplete(false);
    setOrderStarted(false);
    setOrderHint(false);
    setOrderPraise(null);
    clearOrderIdle();
  };

  const startClip: HifzAudioClipId = showBasmala ? "basmala" : ayahIndex;

  const playCurrent = () => {
    if (mode === "listenRepeat") {
      player.start("repeat", typeof startClip === "number" ? startClip : 1);
    } else if (mode === "tilawaLink") {
      player.start("tilawaLink", startClip === "basmala" ? "basmala" : ayahIndex);
    } else {
      player.start("single", startClip);
    }
  };

  const playWholeSurah = () => {
    player.start("surah", "basmala");
  };

  const onPauseLength = (length: RepeatPauseLength) => {
    player.setPauseLength(length);
    writeRepeatPauseLength(length);
  };

  const skyStars = progress?.stars ?? {};
  const memorizedCount = countMemorized(skyStars);
  const nextReview = nextUnreviewed(skyStars);
  const showAyahPane =
    mode === "learn" ||
    mode === "fading" ||
    mode === "letters" ||
    isAudioMode(mode);

  const tilawaPlaying =
    mode === "tilawaLink" &&
    (player.playing || player.paused) &&
    player.activeClip != null &&
    player.activeClip !== "basmala";

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
      <audio
        ref={player.bindAudio}
        playsInline
        preload="none"
        className="hidden"
      />

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
        className="relative z-10 mx-auto flex w-full max-w-3xl gap-1.5 overflow-x-auto px-3 pb-3"
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
                setShowBasmala(false);
                if (m.id === "linking") {
                  setLinkPromptIndex(1);
                  setLinkDone(false);
                }
                if (m.id === "order") {
                  resetOrder();
                }
              }}
              className={`shrink-0 rounded-full px-3 py-2 text-xs transition sm:py-1.5 ${
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
        {showAyahPane && (
          <div
            className={`mx-auto flex w-full max-w-3xl flex-1 flex-col transition-opacity duration-300 ${
              fadeVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-5">
              {tilawaPlaying && (
                <p className="rounded-full bg-[#e8c87a]/15 px-4 py-1.5 text-sm text-[#f5e6b8] ring-1 ring-[#e8c87a]/40">
                  الآن تُتلى الآية ﴿{ayahIndex}﴾
                </p>
              )}
              <div
                className="relative aspect-square w-full max-w-[min(100%,320px)] overflow-hidden rounded-[28px] border border-white/10 bg-[#080816]/70 transition-opacity duration-700 sm:max-w-[min(100%,360px)]"
                style={{ opacity: imageOpacity }}
              >
                {imageSrc && !showBasmala ? (
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    sizes="360px"
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

              {showBasmala ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isAudioMode(mode)) player.start("single", "basmala");
                  }}
                  className="text-center text-xl text-[#e8c87a]/90"
                >
                  البسملة
                </button>
              ) : (
                <div
                  className={`${amiriQuran.className} px-2 text-center text-[1.55rem] leading-[2.35] text-[#f7efd8] sm:text-[1.75rem] ${
                    isAudioMode(mode) ? "cursor-pointer" : ""
                  }`}
                  onClick={() => {
                    if (!isAudioMode(mode)) return;
                    if (mode === "listenRepeat") player.start("repeat", ayahIndex);
                    else if (mode === "tilawaLink") {
                      player.start("tilawaLink", ayahIndex);
                    } else player.start("single", ayahIndex);
                  }}
                  onKeyDown={(e) => {
                    if (!isAudioMode(mode)) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (mode === "listenRepeat") player.start("repeat", ayahIndex);
                      else if (mode === "tilawaLink") {
                        player.start("tilawaLink", ayahIndex);
                      } else player.start("single", ayahIndex);
                    }
                  }}
                  role={isAudioMode(mode) ? "button" : undefined}
                  tabIndex={isAudioMode(mode) ? 0 : undefined}
                >
                  {words.map((word, idx) => {
                    const showLettersOnly =
                      mode === "letters" && !revealedWords.has(idx);
                    const opaque = wordOpacity(idx);
                    const hiddenFaded =
                      mode === "fading" && fadeStep >= 1 && !revealedWords.has(idx);
                    const listeningHighlight =
                      isAudioMode(mode) &&
                      player.activeClip === ayahIndex &&
                      player.activeWord === idx &&
                      (player.playing || player.paused);
                    if (mode === "fading" || mode === "letters") {
                      return (
                        <button
                          key={`${ayahIndex}-${idx}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            revealWord(idx);
                          }}
                          className={`mx-0.5 inline-block rounded-md px-0.5 align-baseline transition-opacity duration-700 cursor-pointer ${
                            hiddenFaded ? "hover:opacity-40" : ""
                          }`}
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
                    }
                    return (
                      <span
                        key={`${ayahIndex}-${idx}`}
                        className={`mx-0.5 inline-block rounded-md px-0.5 align-baseline transition duration-500 ${
                          listeningHighlight ? "hifz-word-active" : ""
                        }`}
                        style={{ opacity: opaque } satisfies CSSProperties}
                      >
                        {word}
                      </span>
                    );
                  })}
                  <span
                    className={`ms-2 inline-block align-baseline font-sans text-base transition ${
                      tilawaPlaying
                        ? "rounded-full bg-[#e8c87a]/25 px-2 py-0.5 text-[#ffe9a8] ring-1 ring-[#e8c87a]/50"
                        : "text-[#e8c87a]/80"
                    }`}
                  >
                    ﴿{ayahIndex}﴾
                  </span>
                </div>
              )}
            </div>

            {(mode === "learn" || isAudioMode(mode)) && (
              <AudioBar
                mode={mode}
                playing={player.playing}
                paused={player.paused}
                inSilence={player.inRepeatSilence}
                loading={player.loadState === "loading"}
                error={player.audioError}
                repeatCount={player.repeatCount}
                onRepeatCount={(n) => player.setRepeatCount(n)}
                pauseLength={player.pauseLength}
                onPauseLength={onPauseLength}
                onPlay={playCurrent}
                onPauseToggle={player.togglePause}
                onStop={player.stop}
                onPrev={() => {
                  if (showBasmala) {
                    setShowBasmala(false);
                    return;
                  }
                  if (ayahIndex <= 1) {
                    setShowBasmala(true);
                    player.stop();
                    return;
                  }
                  goAyah(ayahIndex - 1);
                  player.stop();
                }}
                onNext={() => {
                  if (showBasmala) {
                    setShowBasmala(false);
                    goAyah(1);
                    player.stop();
                    return;
                  }
                  goAyah(ayahIndex + 1);
                  player.stop();
                }}
                onSurah={playWholeSurah}
                onListenFromLearn={() => {
                  setMode("listen");
                  window.setTimeout(() => player.start("single", ayahIndex), 0);
                }}
                onBasmala={() => {
                  setShowBasmala(true);
                  player.start("single", "basmala");
                }}
              />
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goAyah(ayahIndex + 1)}
                disabled={ayahIndex >= 15}
                className="min-h-11 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 disabled:opacity-30"
              >
                التالية
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isAudioMode(mode) || mode === "learn") {
                    setShowBasmala(false);
                    if (mode === "listen" || mode === "learn") {
                      player.start("single", ayahIndex);
                    } else if (mode === "listenRepeat") {
                      player.start("repeat", ayahIndex);
                    } else if (mode === "tilawaLink") {
                      player.start("tilawaLink", ayahIndex);
                    }
                  }
                }}
                className={`${amiriQuran.className} max-w-[55%] truncate text-xs text-white/40 underline-offset-4 ${
                  isAudioMode(mode) ? "hover:text-[#e8c87a]/80 hover:underline" : ""
                }`}
                title={isAudioMode(mode) ? "استمع لهذه الآية" : undefined}
              >
                {showBasmala ? "البسملة" : `${ayahIndex} / 15`}
              </button>
              <button
                type="button"
                onClick={() => goAyah(ayahIndex - 1)}
                disabled={ayahIndex <= 1 && !showBasmala}
                className="min-h-11 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 disabled:opacity-30"
              >
                السابقة
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] leading-relaxed text-white/30">
              {HUSARY_AUDIO_ATTRIBUTION}
            </p>
          </div>
        )}

        {mode === "linking" && (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6">
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
                      className={`${amiriQuran.className} min-h-12 rounded-2xl border border-[#e8c87a]/25 bg-[#080816]/80 px-4 py-3 text-lg text-[#f3e6c0] transition hover:border-[#e8c87a]/55`}
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
          <div className="relative mx-auto flex h-full w-full max-w-3xl flex-1 flex-col">
            {!orderStarted && (
              <div className="relative z-10 mb-3 shrink-0 rounded-2xl border border-[#e8c87a]/20 bg-[#080816]/80 px-4 py-3">
                <p className="text-center text-base leading-relaxed text-[#f3e6c0]">
                  اضغط النجوم بالترتيب من ١ إلى ١٥ لتربطها بخطٍ ذهبي.
                </p>
                <OrderDemoAnimation />
                <button
                  type="button"
                  onClick={() => {
                    setOrderStarted(true);
                    setOrderHint(false);
                    armOrderIdle();
                  }}
                  className="mx-auto mt-3 flex min-h-11 items-center justify-center rounded-full bg-[#e8c87a]/20 px-6 py-2 text-sm text-[#f5e6b8] ring-1 ring-[#e8c87a]/45"
                >
                  ابدأ
                </button>
              </div>
            )}

            {orderStarted && !orderComplete && (
              <div className="relative z-10 mb-2 shrink-0 text-center">
                <p className="text-sm text-white/55">
                  اضغط النجمة المضيئة التالية:{" "}
                  <span className="text-[#e8c87a]">﴿{orderNext}﴾</span>
                </p>
                {orderHint && (
                  <p className="mt-1 text-sm text-[#e8c87a]/85" role="status">
                    تلميح هادئ: الآية التالية رقم {orderNext}
                  </p>
                )}
                {orderPraise && (
                  <p className="mt-1 text-sm text-[#f5e6b8]/90 hifz-order-praise" role="status">
                    {orderPraise}
                  </p>
                )}
              </div>
            )}

            <div className="relative min-h-0 flex-1">
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
                const next = orderStarted && n === orderNext && !orderComplete;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onOrderTap(n)}
                    className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm transition sm:h-10 sm:w-10 ${
                      lit
                        ? "bg-[#e8c87a] text-[#1a1205] shadow-[0_0_16px_rgba(232,200,122,0.65)]"
                        : next
                          ? "hifz-order-next bg-white/20 text-[#f5e6b8] ring-2 ring-[#e8c87a]/70"
                          : "bg-white/10 text-white/50"
                    } ${orderComplete ? "shadow-[0_0_22px_rgba(232,200,122,0.85)]" : ""}`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    aria-label={`آية ${n}${next ? " — التالية" : ""}`}
                  >
                    {n}
                  </button>
                );
              })}
              {orderComplete && (
                <div className="absolute inset-x-0 bottom-4 z-10 text-center">
                  <p className="text-sm text-[#e8c87a]/90">اكتمل برج الآيات بهدوء.</p>
                  <button
                    type="button"
                    onClick={resetOrder}
                    className="mt-2 min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm text-white/70"
                  >
                    من جديد
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "sky" && (
          <div className="relative mx-auto flex h-full w-full max-w-3xl flex-1 flex-col">
            <div className="relative z-10 mb-4 shrink-0 rounded-2xl border border-[#e8c87a]/20 bg-[#080816]/80 px-4 py-4 text-center">
              <p className="text-xl font-medium text-[#f5e6b8] sm:text-2xl">
                حفظت {memorizedCount} من 15 آية
              </p>
              <p className="mt-2 text-base leading-relaxed text-white/70">
                {memorizedCount >= 15
                  ? "أحسنت — راجعت السورة كلها. افتح وضعاً للمراجعة بهدوء."
                  : nextReview != null
                    ? `الآية التالية للمراجعة: ﴿${nextReview}﴾ — اضغط النجمة أو افتح «تعلّم».`
                    : "اضغط نجمة لفتح آيتها في التعلّم."}
              </p>
            </div>
            <div className="relative min-h-0 flex-1">
              {STAR_LAYOUT.map((pos, i) => {
                const n = i + 1;
                const entry = skyStars[String(n)];
                const known = Boolean(entry);
                const isNext = nextReview === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setMode("learn");
                      goAyah(n);
                    }}
                    title={known ? "راجعتها" : "لم تُراجع بعد"}
                    className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs transition sm:h-10 sm:w-10 ${
                      isNext ? "ring-2 ring-[#e8c87a]/60" : ""
                    }`}
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      background: known
                        ? "rgba(232,200,122,0.95)"
                        : "rgba(255,255,255,0.12)",
                      boxShadow: known
                        ? "0 0 14px rgba(232,200,122,0.7)"
                        : "none",
                      color: known ? "#1a1205" : "rgba(255,255,255,0.45)",
                    }}
                    aria-label={`نجمة الآية ${n}${known ? " — محفوظة" : ""}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function OrderDemoAnimation() {
  return (
    <div
      className="mx-auto mt-3 flex h-16 w-full max-w-[220px] items-center justify-center"
      aria-hidden
    >
      <svg viewBox="0 0 160 56" className="h-full w-full overflow-visible">
        <line
          x1="28"
          y1="28"
          x2="132"
          y2="28"
          className="hifz-order-demo-line"
          stroke="rgba(232,200,122,0.55)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="28" cy="28" r="12" fill="rgba(232,200,122,0.95)" />
        <text
          x="28"
          y="32"
          textAnchor="middle"
          fontSize="11"
          fill="#1a1205"
          fontFamily="sans-serif"
        >
          1
        </text>
        <g className="hifz-order-demo-star">
          <circle cx="132" cy="28" r="12" fill="rgba(255,255,255,0.18)" stroke="rgba(232,200,122,0.7)" strokeWidth="1.5" />
          <text
            x="132"
            y="32"
            textAnchor="middle"
            fontSize="11"
            fill="#f5e6b8"
            fontFamily="sans-serif"
          >
            2
          </text>
        </g>
      </svg>
    </div>
  );
}

function setCopy(prev: Set<number>, idx: number): Set<number> {
  const next = new Set(prev);
  next.add(idx);
  return next;
}

type AudioBarProps = {
  mode: HifzModeId;
  playing: boolean;
  paused: boolean;
  inSilence: boolean;
  loading: boolean;
  error: string | null;
  repeatCount: RepeatCount;
  onRepeatCount: (n: RepeatCount) => void;
  pauseLength: RepeatPauseLength;
  onPauseLength: (length: RepeatPauseLength) => void;
  onPlay: () => void;
  onPauseToggle: () => void;
  onStop: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSurah: () => void;
  onListenFromLearn: () => void;
  onBasmala: () => void;
};

function AudioBar({
  mode,
  playing,
  paused,
  inSilence,
  loading,
  error,
  repeatCount,
  onRepeatCount,
  pauseLength,
  onPauseLength,
  onPlay,
  onPauseToggle,
  onStop,
  onPrev,
  onNext,
  onSurah,
  onListenFromLearn,
  onBasmala,
}: AudioBarProps) {
  const busy = playing || inSilence;
  const showFull = isAudioMode(mode);

  return (
    <div className="mt-2 rounded-2xl border border-[#e8c87a]/20 bg-[#080816]/75 px-3 py-3">
      {mode === "learn" && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onListenFromLearn}
            className="min-h-11 rounded-full bg-[#e8c87a]/20 px-4 py-2 text-sm text-[#f5e6b8] ring-1 ring-[#e8c87a]/40"
          >
            استمع
          </button>
          <p className="w-full text-center text-[11px] text-white/40">
            خطوة الاستماع من التعلّم — بهدوء بلا درجات.
          </p>
        </div>
      )}

      {showFull && (
        <>
          {mode === "listenRepeat" && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] text-white/45">عدد التكرار</span>
                {REPEAT_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onRepeatCount(n)}
                    className={`h-10 w-10 rounded-full text-sm sm:h-8 sm:w-8 ${
                      repeatCount === n
                        ? "bg-[#e8c87a]/25 text-[#f5e6b8] ring-1 ring-[#e8c87a]/50"
                        : "bg-white/5 text-white/55"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
                <span className="text-[11px] text-white/45">فاصل التكرار</span>
                {REPEAT_PAUSE_LENGTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onPauseLength(opt.id)}
                    className={`min-h-10 rounded-full px-3 py-1.5 text-sm sm:min-h-8 sm:text-xs ${
                      pauseLength === opt.id
                        ? "bg-[#e8c87a]/25 text-[#f5e6b8] ring-1 ring-[#e8c87a]/50"
                        : "bg-white/5 text-white/55"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onPrev}
              className="min-h-11 min-w-11 rounded-full border border-white/15 px-3 py-2 text-sm text-white/75"
              aria-label="السابقة"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => {
                if (busy || paused) onPauseToggle();
                else onPlay();
              }}
              disabled={loading}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8c87a]/25 text-lg text-[#f5e6b8] ring-1 ring-[#e8c87a]/45 disabled:opacity-50"
              aria-label={busy && !paused ? "إيقاف مؤقت" : "تشغيل"}
            >
              {loading ? "…" : busy && !paused && !inSilence ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              onClick={onNext}
              className="min-h-11 min-w-11 rounded-full border border-white/15 px-3 py-2 text-sm text-white/75"
              aria-label="التالية"
            >
              ›
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onSurah}
              className="min-h-10 rounded-full border border-[#e8c87a]/30 px-3 py-1.5 text-xs text-[#e8c87a]/90"
            >
              السورة كاملة
            </button>
            <button
              type="button"
              onClick={onBasmala}
              className="min-h-10 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70"
            >
              البسملة
            </button>
            {(busy || paused) && (
              <button
                type="button"
                onClick={onStop}
                className="min-h-10 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45"
              >
                إيقاف
              </button>
            )}
          </div>

          {inSilence && (
            <p className="mt-2 text-center text-xs text-[#e8c87a]/70">
              دورك للتكرار بصوت هادئ…
            </p>
          )}
          {mode === "tilawaLink" && (
            <p className="mt-2 text-center text-[11px] text-white/40">
              وصل التلاوة: من هذه الآية حتى آخر السورة — أو حتى تضغط إيقاف.
            </p>
          )}
        </>
      )}

      {error && (
        <p className="mt-2 text-center text-xs text-[#e8c87a]/85" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
