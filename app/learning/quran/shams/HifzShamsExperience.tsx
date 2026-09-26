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
} from "react";
import { ayahImageSrc, getAshShamsAyat } from "../../../../lib/hifz/ashShamsData";
import {
  HUSARY_AUDIO_ATTRIBUTION,
  REPEAT_COUNT_OPTIONS,
  REPEAT_PAUSE_LENGTH_OPTIONS,
  repeatWordOpacity,
  type RepeatCount,
  type RepeatPauseLength,
} from "../../../../lib/hifz/audio";
import { buildLinkingPrompt } from "../../../../lib/hifz/linking";
import {
  advancePath,
  displayAyah,
  initialPathState,
  isHideStep,
  isLinkStep,
  nextDisabled,
  PATH_STEP_LABELS_AR,
  showsNextButton,
  type PathState,
  type PathStepId,
} from "../../../../lib/hifz/pathSteps";
import {
  listDueToday,
  rateAyah,
  readProgress,
  readRepeatPauseLength,
  softMasteryVibrate,
  writeRepeatPauseLength,
} from "../../../../lib/hifz/progress";
import {
  mapVerseStatus,
  surahProgressPercent,
  type MapVerseStatus,
} from "../../../../lib/hifz/reviewSchedule";
import {
  firstLetterOfToken,
  tokenizeAyah,
} from "../../../../lib/hifz/tokenize";
import type { HifzLocalProgress } from "../../../../lib/hifz/types";
import { useHusaryPlayer } from "./useHusaryPlayer";
import { VerseSourcedNotes } from "./VerseSourcedNotes";

const amiriQuran = localFont({
  src: "../../../../public/fonts/amiri-quran/AmiriQuran-Regular.ttf",
  display: "swap",
  variable: "--font-amiri-quran",
});

type Surface =
  | "path"
  | "map"
  | "reviews"
  | "order"
  | "linking"
  | "tilawa"
  | "listenBlind";

type ToolActionId =
  | "order"
  | "tilawa"
  | "surah"
  | "basmala"
  | "linking"
  | "listenBlind";

const TOOL_ITEMS: Array<{ id: ToolActionId; label: string }> = [
  { id: "order", label: "رتّب الآيات" },
  { id: "tilawa", label: "وصل التلاوة" },
  { id: "surah", label: "السورة كاملة" },
  { id: "basmala", label: "البسملة" },
  { id: "linking", label: "الوصل" },
  { id: "listenBlind", label: "الاستماع بلا نظر" },
];

const MAP_STATUS_LABEL: Record<MapVerseStatus, string> = {
  memorized: "محفوظة ✓",
  needsReview: "تحتاج مراجعة",
  notStarted: "لم تبدأ",
};

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

function setCopy(prev: Set<number>, idx: number): Set<number> {
  const next = new Set(prev);
  next.add(idx);
  return next;
}

function needsAudioControls(step: PathStepId): boolean {
  return step === "listen" || step === "repeat" || isLinkStep(step);
}

function hideModeForStep(
  step: PathStepId,
): "full" | "partial" | "letters" | "all" | null {
  if (step === "hideFull") return "full";
  if (step === "hidePartial") return "partial";
  if (step === "hideLetters") return "letters";
  if (step === "hideAll") return "all";
  return null;
}

function isMemoryStep(step: PathStepId): boolean {
  return step === "reciteMemory" || step === "surahMemory";
}
export default function HifzShamsExperience() {
  const ayat = useMemo(() => getAshShamsAyat(), []);
  const [surface, setSurface] = useState<Surface>("path");
  const [path, setPath] = useState<PathState>(() => initialPathState(1));
  const [toolsOpen, setToolsOpen] = useState(false);
  const [memoryRevealed, setMemoryRevealed] = useState(false);
  const [revealedWords, setRevealedWords] = useState<Set<number>>(() => new Set());
  const [showBasmala, setShowBasmala] = useState(false);
  const [blindAyah, setBlindAyah] = useState(1);
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
  const orderIdleRef = useRef<number | null>(null);
  const praiseTimerRef = useRef<number | null>(null);
  const lastAutoStepRef = useRef<string>("");

  const player = useHusaryPlayer();

  useEffect(() => {
    setProgress(readProgress());
    player.setPauseLength(readRepeatPauseLength());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, []);

  const shownAyah = surface === "listenBlind" ? blindAyah : displayAyah(path);
  const ayah = ayat[shownAyah - 1];
  const words = useMemo(() => tokenizeAyah(ayah.text), [ayah.text]);
  const imageSrc = ayahImageSrc(shownAyah);
  const step = path.step;
  const hideMode = hideModeForStep(step);
  const dueToday = useMemo(
    () => (progress ? listDueToday(progress) : []),
    [progress],
  );

  const mapStatuses = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 15 }, (_, i) => {
      const entry = progress?.verses[String(i + 1)];
      return mapVerseStatus(
        entry ? { rating: entry.rating, dueAt: entry.dueAt } : null,
        now,
      );
    });
  }, [progress]);

  const mapPercent = surahProgressPercent(mapStatuses);

  const goPath = useCallback((event: Parameters<typeof advancePath>[1]) => {
    setFadeVisible(false);
    window.setTimeout(() => {
      setPath((prev) => advancePath(prev, event));
      setMemoryRevealed(false);
      setRevealedWords(new Set());
      setShowBasmala(false);
      setFadeVisible(true);
    }, 160);
  }, []);

  const openAyahOnPath = useCallback((n: number) => {
    setSurface("path");
    setToolsOpen(false);
    setFadeVisible(false);
    window.setTimeout(() => {
      setPath(initialPathState(n));
      setMemoryRevealed(false);
      setRevealedWords(new Set());
      setShowBasmala(false);
      setFadeVisible(true);
    }, 160);
  }, []);

  const onRate = useCallback(
    (rating: "again" | "unsure" | "remembered") => {
      const next = rateAyah(path.ayah, rating);
      setProgress(next);
      if (rating === "remembered") softMasteryVibrate();
      goPath({ type: "rate", rating });
    },
    [goPath, path.ayah],
  );

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
    if (surface !== "order" || !orderStarted || orderComplete) {
      clearOrderIdle();
      return;
    }
    armOrderIdle();
    return clearOrderIdle;
  }, [surface, orderStarted, orderComplete, orderNext, armOrderIdle, clearOrderIdle]);

  useEffect(() => {
    return () => {
      if (praiseTimerRef.current != null) window.clearTimeout(praiseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setRevealedWords(new Set());
    setMemoryRevealed(false);
  }, [step, shownAyah]);

  // Auto-play listen / link audio when those path steps begin
  useEffect(() => {
    if (surface !== "path") return;
    const key = `${path.ayah}:${step}`;
    if (lastAutoStepRef.current === key) return;
    lastAutoStepRef.current = key;

    if (step === "listen") {
      player.start("single", path.ayah);
      return;
    }
    if (step === "repeat") {
      player.start("repeat", path.ayah);
      return;
    }
    if (step === "linkAlone") {
      player.startQueue([path.ayah]);
      return;
    }
    if (step === "linkNextAlone") {
      const next = Math.min(15, path.ayah + 1);
      player.startQueue([next]);
      return;
    }
    if (step === "linkTogether") {
      const next = Math.min(15, path.ayah + 1);
      player.startQueue([path.ayah, next]);
      return;
    }
    if (!needsAudioControls(step)) {
      player.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional on step enter
  }, [surface, path.ayah, step]);

  useEffect(() => {
    if (surface === "path" || surface === "tilawa" || surface === "listenBlind") return;
    player.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface]);

  useEffect(() => {
    const clip = player.activeClip;
    if (clip == null || clip === "basmala") return;
    if (surface === "tilawa" && clip !== shownAyah) {
      setPath((prev) => ({ ...prev, ayah: clip }));
    }
  }, [player.activeClip, surface, shownAyah]);

  const linkingPrompt = useMemo(() => {
    if (surface !== "linking") return null;
    return buildLinkingPrompt(ayat, linkPromptIndex);
  }, [surface, ayat, linkPromptIndex]);

  const revealWord = (idx: number) => {
    setRevealedWords((prev) => setCopy(prev, idx));
  };

  const wordOpacity = (idx: number): number => {
    if (surface === "path" && step === "repeat" && (player.playing || player.inRepeatSilence)) {
      return repeatWordOpacity(player.repeatIndex, player.repeatCount);
    }
    if (hideMode === "letters") {
      return revealedWords.has(idx) ? 1 : 0.22;
    }
    if (hideMode === "partial") {
      if (revealedWords.has(idx)) return 1;
      return idx % 2 === 0 ? 0.2 : 0.55;
    }
    if (hideMode === "all") {
      return revealedWords.has(idx) ? 1 : 0.08;
    }
    return 1;
  };

  const imageOpacity =
    hideMode === "all" && revealedWords.size < words.length ? 0.15 : 1;

  const onLinkChoose = (chosen: number) => {
    if (!linkingPrompt) return;
    if (chosen === linkingPrompt.correctAyah) {
      const a = rateAyah(linkingPrompt.fromAyah, "remembered");
      const b = rateAyah(linkingPrompt.correctAyah, "remembered");
      setProgress(b.verses ? b : a);
      softMasteryVibrate();
      if (linkPromptIndex >= 14) setLinkDone(true);
      else {
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
    const nextPath = [...orderPath, n];
    setOrderPath(nextPath);
    setOrderHint(false);
    setProgress(rateAyah(n, "remembered"));
    softMasteryVibrate();
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

  const onPauseLength = (length: RepeatPauseLength) => {
    player.setPauseLength(length);
    writeRepeatPauseLength(length);
  };

  const playPathAudio = () => {
    if (step === "repeat") {
      player.start("repeat", path.ayah);
      return;
    }
    if (step === "linkAlone") {
      player.startQueue([path.ayah]);
      return;
    }
    if (step === "linkNextAlone") {
      player.startQueue([Math.min(15, path.ayah + 1)]);
      return;
    }
    if (step === "linkTogether") {
      const next = Math.min(15, path.ayah + 1);
      player.startQueue([path.ayah, next]);
      return;
    }
    player.start("single", path.ayah);
  };

  const onToolPick = (id: ToolActionId) => {
    setToolsOpen(false);
    if (id === "surah") {
      setShowBasmala(true);
      player.start("surah", "basmala");
      setSurface("tilawa");
      return;
    }
    if (id === "basmala") {
      setShowBasmala(true);
      player.start("single", "basmala");
      setSurface("tilawa");
      return;
    }
    if (id === "order") {
      resetOrder();
      setSurface("order");
      return;
    }
    if (id === "linking") {
      setLinkPromptIndex(1);
      setLinkDone(false);
      setSurface("linking");
      return;
    }
    if (id === "tilawa") {
      setShowBasmala(false);
      setSurface("tilawa");
      return;
    }
    if (id === "listenBlind") {
      setBlindAyah(path.ayah);
      setSurface("listenBlind");
    }
  };

  const showVerseText =
    surface === "path" &&
    !isMemoryStep(step) &&
    step !== "rate" &&
    !showBasmala;

  const showPathAyahPane =
    surface === "path" &&
    (needsAudioControls(step) ||
      isHideStep(step) ||
      isMemoryStep(step) ||
      step === "rate");

  return (
    <div
      className={`${amiriQuran.variable} hifz-shell fixed inset-0 z-[200] flex flex-col text-white`}
      dir="rtl"
      lang="ar"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #1a1540 0%, #0a0a1a 45%, #050510 100%)",
      }}
    >
      <audio ref={player.bindAudio} playsInline preload="none" className="hidden" />

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

      <header className="relative z-10 shrink-0 px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-center text-lg font-semibold text-[#f3e6c0]">سورة الشمس</h1>
      </header>

      <div className="relative z-20 mx-auto flex w-full max-w-3xl items-center justify-center gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={() => {
            setToolsOpen(false);
            setSurface("reviews");
            setProgress(readProgress());
          }}
          className={`min-h-11 shrink-0 rounded-full px-3 py-2 text-xs transition ${
            surface === "reviews"
              ? "bg-[#e8c87a]/20 text-[#f5e6b8] ring-1 ring-[#e8c87a]/45"
              : "bg-white/5 text-white/60 ring-1 ring-white/10"
          }`}
        >
          مراجعات اليوم
          {dueToday.length > 0 ? ` (${dueToday.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => {
            setToolsOpen(false);
            setSurface("map");
            setProgress(readProgress());
          }}
          className={`min-h-11 shrink-0 rounded-full px-3 py-2 text-xs transition ${
            surface === "map"
              ? "bg-[#e8c87a]/20 text-[#f5e6b8] ring-1 ring-[#e8c87a]/45"
              : "bg-white/5 text-white/60 ring-1 ring-white/10"
          }`}
        >
          خريطة الحفظ
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setToolsOpen((o) => !o)}
            className={`min-h-11 shrink-0 rounded-full px-3 py-2 text-xs transition ${
              toolsOpen ||
              surface === "order" ||
              surface === "linking" ||
              surface === "tilawa" ||
              surface === "listenBlind"
                ? "bg-[#e8c87a]/20 text-[#f5e6b8] ring-1 ring-[#e8c87a]/45"
                : "bg-white/5 text-white/60 ring-1 ring-white/10"
            }`}
            aria-expanded={toolsOpen}
            aria-haspopup="menu"
          >
            أدوات أخرى
          </button>
          {toolsOpen && (
            <div
              role="menu"
              className="absolute left-1/2 top-full z-30 mt-2 w-52 -translate-x-1/2 rounded-2xl border border-[#e8c87a]/25 bg-[#0a0a18]/98 p-2 shadow-xl backdrop-blur"
            >
              {TOOL_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => onToolPick(item.id)}
                  className="flex min-h-11 w-full items-center justify-center rounded-xl px-3 py-2 text-sm text-[#f3e6c0] transition hover:bg-[#e8c87a]/15"
                >
                  {item.label}
                </button>
              ))}
              {surface !== "path" && (
                <button
                  type="button"
                  onClick={() => {
                    setToolsOpen(false);
                    setSurface("path");
                    player.stop();
                  }}
                  className="mt-1 flex min-h-11 w-full items-center justify-center rounded-xl border border-white/10 px-3 py-2 text-sm text-white/55"
                >
                  العودة للمسار
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <main className="relative z-10 flex flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {surface === "path" && showPathAyahPane && (
          <div
            className={`mx-auto flex w-full max-w-3xl flex-1 flex-col transition-opacity duration-300 ${
              fadeVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="mb-2 text-center text-sm text-[#e8c87a]/85">
              {PATH_STEP_LABELS_AR[step]}
              <span className="ms-2 font-sans text-xs text-white/40">
                ﴿{path.ayah}﴾ · {path.ayah}/15
              </span>
            </p>

            <div className="flex flex-col items-center gap-4">
              <div
                className="hifz-ayah-frame relative overflow-hidden rounded-[28px] border border-white/10 bg-[#080816]/70 transition-opacity duration-700"
                style={{ opacity: imageOpacity }}
              >
                {imageSrc && !showBasmala ? (
                  <Image
                    src={imageSrc}
                    alt=""
                    fill
                    sizes="360px"
                    className="object-cover"
                    priority={shownAyah <= 2}
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

              {isMemoryStep(step) && (
                <div className="flex flex-col items-center gap-3">
                  {!memoryRevealed ? (
                    <button
                      type="button"
                      onClick={() => setMemoryRevealed(true)}
                      className="min-h-12 rounded-full bg-[#e8c87a]/20 px-6 py-3 text-base text-[#f5e6b8] ring-1 ring-[#e8c87a]/45"
                    >
                      أظهر الآية
                    </button>
                  ) : (
                    <p
                      className={`${amiriQuran.className} px-2 text-center text-[1.55rem] leading-[2.35] text-[#f7efd8] sm:text-[1.75rem]`}
                    >
                      {ayah.text}
                      <span className="ms-2 inline-block align-baseline font-sans text-base text-[#e8c87a]/80">
                        ﴿{shownAyah}﴾
                      </span>
                    </p>
                  )}
                </div>
              )}

              {step === "rate" && (
                <div className="flex w-full max-w-sm flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => onRate("remembered")}
                    className="min-h-14 rounded-2xl bg-[#e8c87a]/25 text-lg text-[#f5e6b8] ring-1 ring-[#e8c87a]/50"
                  >
                    حفظتها
                  </button>
                  <button
                    type="button"
                    onClick={() => onRate("unsure")}
                    className="min-h-14 rounded-2xl border border-white/15 bg-white/5 text-lg text-white/80"
                  >
                    متردد
                  </button>
                  <button
                    type="button"
                    onClick={() => onRate("again")}
                    className="min-h-14 rounded-2xl border border-white/15 bg-white/5 text-lg text-white/80"
                  >
                    أعدها
                  </button>
                </div>
              )}

              {showVerseText && (
                <div
                  className={`${amiriQuran.className} px-2 text-center text-[1.55rem] leading-[2.35] text-[#f7efd8] sm:text-[1.75rem]`}
                >
                  {words.map((word, idx) => {
                    const showLettersOnly =
                      hideMode === "letters" && !revealedWords.has(idx);
                    const opaque = wordOpacity(idx);
                    const interactive = hideMode != null && hideMode !== "full";
                    const listeningHighlight =
                      needsAudioControls(step) &&
                      player.activeClip === shownAyah &&
                      player.activeWord === idx &&
                      (player.playing || player.paused);
                    if (interactive) {
                      return (
                        <button
                          key={`${shownAyah}-${idx}`}
                          type="button"
                          onClick={() => revealWord(idx)}
                          className="mx-0.5 inline-block rounded-md px-0.5 align-baseline transition-opacity duration-700"
                          style={{ opacity: opaque } satisfies CSSProperties}
                          aria-label={
                            showLettersOnly ? `كشف كلمة ${idx + 1}` : undefined
                          }
                        >
                          {showLettersOnly ? firstLetterOfToken(word) : word}
                        </button>
                      );
                    }
                    return (
                      <span
                        key={`${shownAyah}-${idx}`}
                        className={`mx-0.5 inline-block rounded-md px-0.5 align-baseline transition duration-500 ${
                          listeningHighlight ? "hifz-word-active" : ""
                        }`}
                        style={{ opacity: opaque } satisfies CSSProperties}
                      >
                        {word}
                      </span>
                    );
                  })}
                  <span className="ms-2 inline-block align-baseline font-sans text-base text-[#e8c87a]/80">
                    ﴿{shownAyah}﴾
                  </span>
                </div>
              )}
            </div>

            {!showBasmala &&
              (showVerseText || (isMemoryStep(step) && memoryRevealed)) && (
                <VerseSourcedNotes ayahNumber={shownAyah} />
              )}

            {needsAudioControls(step) && (
              <PathAudioBar
                step={step}
                playing={player.playing}
                paused={player.paused}
                inSilence={player.inRepeatSilence}
                loading={player.loadState === "loading"}
                error={player.audioError}
                repeatCount={player.repeatCount}
                onRepeatCount={(n) => player.setRepeatCount(n)}
                pauseLength={player.pauseLength}
                onPauseLength={onPauseLength}
                onPlay={playPathAudio}
                onPauseToggle={player.togglePause}
                onStop={player.stop}
              />
            )}

            {showsNextButton(step) && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => goPath({ type: "next" })}
                  disabled={nextDisabled(path)}
                  className="min-h-14 min-w-[10rem] rounded-full bg-[#e8c87a]/25 px-8 py-3 text-lg text-[#f5e6b8] ring-1 ring-[#e8c87a]/50 disabled:opacity-35"
                >
                  التالي
                </button>
              </div>
            )}

            <p className="mt-3 text-center text-[10px] leading-relaxed text-white/30">
              {HUSARY_AUDIO_ATTRIBUTION}
            </p>
          </div>
        )}

        {surface === "map" && (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
            <div className="rounded-2xl border border-[#e8c87a]/20 bg-[#080816]/80 px-4 py-4 text-center">
              <p className="text-2xl font-medium text-[#f5e6b8]">{mapPercent}%</p>
              <p className="mt-1 text-sm text-white/60">نسبة الآيات المحفوظة</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {mapStatuses.map((status, i) => {
                const n = i + 1;
                const tone =
                  status === "memorized"
                    ? "border-[#e8c87a]/45 bg-[#e8c87a]/20 text-[#f5e6b8]"
                    : status === "needsReview"
                      ? "border-white/20 bg-white/10 text-white/80"
                      : "border-white/10 bg-white/5 text-white/45";
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => openAyahOnPath(n)}
                    className={`flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center ${tone}`}
                  >
                    <span className="text-lg">﴿{n}﴾</span>
                    <span className="text-[11px] leading-snug">
                      {MAP_STATUS_LABEL[status]}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setSurface("path")}
              className="mx-auto min-h-11 rounded-full border border-white/15 px-5 py-2 text-sm text-white/70"
            >
              العودة للمسار
            </button>
          </div>
        )}

        {surface === "reviews" && (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-4 pt-4">
            <p className="text-sm text-white/55">مراجعات مستحقة اليوم</p>
            {dueToday.length === 0 ? (
              <p className="text-center text-[#e8c87a]/85">لا مراجعات اليوم — أحسنت.</p>
            ) : (
              <div className="flex w-full flex-col gap-2">
                {dueToday.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => openAyahOnPath(n)}
                    className="min-h-14 rounded-2xl border border-[#e8c87a]/25 bg-[#080816]/80 px-4 text-lg text-[#f3e6c0]"
                  >
                    راجع الآية ﴿{n}﴾
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSurface("path")}
              className="min-h-11 rounded-full border border-white/15 px-5 py-2 text-sm text-white/70"
            >
              العودة للمسار
            </button>
          </div>
        )}

        {surface === "listenBlind" && (
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8">
            <p className="text-sm text-white/45">الاستماع بلا نظر</p>
            <p className="text-4xl text-[#f5e6b8]">﴿{blindAyah}﴾</p>
            <p className="text-center text-sm text-white/50">الشيخ محمود خليل الحصري</p>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setBlindAyah((n) => Math.max(1, n - 1));
                  player.stop();
                }}
                className="min-h-11 min-w-11 rounded-full border border-white/15 text-white/70"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => {
                  if (player.playing || player.paused) player.togglePause();
                  else player.start("single", blindAyah);
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8c87a]/25 text-xl text-[#f5e6b8] ring-1 ring-[#e8c87a]/45"
                aria-label={player.playing ? "إيقاف مؤقت" : "تشغيل"}
              >
                {player.playing && !player.paused ? "❚❚" : "▶"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBlindAyah((n) => Math.min(15, n + 1));
                  player.stop();
                }}
                className="min-h-11 min-w-11 rounded-full border border-white/15 text-white/70"
              >
                ›
              </button>
            </div>
            {(player.playing || player.paused) && (
              <button
                type="button"
                onClick={player.stop}
                className="min-h-10 rounded-full border border-white/10 px-4 text-xs text-white/45"
              >
                إيقاف
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                player.stop();
                setSurface("path");
              }}
              className="min-h-11 rounded-full border border-white/15 px-5 py-2 text-sm text-white/70"
            >
              العودة للمسار
            </button>
          </div>
        )}
        {surface === "tilawa" && (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
            <p className="mb-2 text-center text-sm text-[#e8c87a]/85">وصل التلاوة</p>
            <div className="flex flex-col items-center gap-4">
              <div className="hifz-ayah-frame relative overflow-hidden rounded-[28px] border border-white/10 bg-[#080816]/70">
                {ayahImageSrc(path.ayah) && !showBasmala ? (
                  <Image
                    src={ayahImageSrc(path.ayah)!}
                    alt=""
                    fill
                    sizes="360px"
                    className="object-cover"
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
                <p className="text-center text-xl text-[#e8c87a]/90">البسملة</p>
              ) : (
                <p
                  className={`${amiriQuran.className} px-2 text-center text-[1.55rem] leading-[2.35] text-[#f7efd8]`}
                >
                  {ayat[path.ayah - 1].text}
                  <span className="ms-2 font-sans text-base text-[#e8c87a]/80">
                    ﴿{path.ayah}﴾
                  </span>
                </p>
              )}
            </div>
            <PathAudioBar
              step="listen"
              playing={player.playing}
              paused={player.paused}
              inSilence={player.inRepeatSilence}
              loading={player.loadState === "loading"}
              error={player.audioError}
              repeatCount={player.repeatCount}
              onRepeatCount={(n) => player.setRepeatCount(n)}
              pauseLength={player.pauseLength}
              onPauseLength={onPauseLength}
              onPlay={() => {
                if (showBasmala) player.start("surah", "basmala");
                else player.start("tilawaLink", path.ayah);
              }}
              onPauseToggle={player.togglePause}
              onStop={player.stop}
              tilawaExtras
              onBasmala={() => {
                setShowBasmala(true);
                player.start("single", "basmala");
              }}
              onSurah={() => {
                setShowBasmala(true);
                player.start("surah", "basmala");
              }}
              onPrev={() => {
                if (showBasmala) {
                  setShowBasmala(false);
                  return;
                }
                if (path.ayah <= 1) {
                  setShowBasmala(true);
                  player.stop();
                  return;
                }
                setPath((p) => ({ ...p, ayah: p.ayah - 1 }));
                player.stop();
              }}
              onNext={() => {
                if (showBasmala) {
                  setShowBasmala(false);
                  setPath((p) => ({ ...p, ayah: 1 }));
                  player.stop();
                  return;
                }
                setPath((p) => ({ ...p, ayah: Math.min(15, p.ayah + 1) }));
                player.stop();
              }}
            />
            <button
              type="button"
              onClick={() => {
                player.stop();
                setSurface("path");
              }}
              className="mx-auto mt-3 min-h-11 rounded-full border border-white/15 px-5 py-2 text-sm text-white/70"
            >
              العودة للمسار
            </button>
          </div>
        )}

        {surface === "linking" && (
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
                    linkShake ? { animation: "hifz-shake 0.4s ease" } : undefined
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
            <button
              type="button"
              onClick={() => setSurface("path")}
              className="min-h-11 rounded-full border border-white/15 px-5 py-2 text-sm text-white/70"
            >
              العودة للمسار
            </button>
          </div>
        )}

        {surface === "order" && (
          <div className="relative mx-auto flex min-h-[70dvh] w-full max-w-3xl flex-1 flex-col">
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
                  <p
                    className="mt-1 text-sm text-[#f5e6b8]/90 hifz-order-praise"
                    role="status"
                  >
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
            <button
              type="button"
              onClick={() => setSurface("path")}
              className="relative z-10 mx-auto mt-2 mb-2 min-h-11 rounded-full border border-white/15 px-5 py-2 text-sm text-white/70"
            >
              العودة للمسار
            </button>
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
          <circle
            cx="132"
            cy="28"
            r="12"
            fill="rgba(255,255,255,0.18)"
            stroke="rgba(232,200,122,0.7)"
            strokeWidth="1.5"
          />
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

type PathAudioBarProps = {
  step: PathStepId;
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
  tilawaExtras?: boolean;
  onBasmala?: () => void;
  onSurah?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
};

function PathAudioBar({
  step,
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
  tilawaExtras,
  onBasmala,
  onSurah,
  onPrev,
  onNext,
}: PathAudioBarProps) {
  const busy = playing || inSilence;
  const showRepeat = step === "repeat";

  return (
    <div className="mt-2 rounded-2xl border border-[#e8c87a]/20 bg-[#080816]/75 px-3 py-3">
      {showRepeat && (
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
        {tilawaExtras && onPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="min-h-11 min-w-11 rounded-full border border-white/15 px-3 py-2 text-sm text-white/75"
            aria-label="السابقة"
          >
            ‹
          </button>
        )}
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
        {tilawaExtras && onNext && (
          <button
            type="button"
            onClick={onNext}
            className="min-h-11 min-w-11 rounded-full border border-white/15 px-3 py-2 text-sm text-white/75"
            aria-label="التالية"
          >
            ›
          </button>
        )}
      </div>

      {(tilawaExtras || busy || paused) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {tilawaExtras && onSurah && (
            <button
              type="button"
              onClick={onSurah}
              className="min-h-10 rounded-full border border-[#e8c87a]/30 px-3 py-1.5 text-xs text-[#e8c87a]/90"
            >
              السورة كاملة
            </button>
          )}
          {tilawaExtras && onBasmala && (
            <button
              type="button"
              onClick={onBasmala}
              className="min-h-10 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70"
            >
              البسملة
            </button>
          )}
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
      )}

      {inSilence && (
        <p className="mt-2 text-center text-xs text-[#e8c87a]/70">
          دورك للتكرار بصوت هادئ…
        </p>
      )}
      {tilawaExtras && (
        <p className="mt-2 text-center text-[11px] text-white/40">
          وصل التلاوة: من هذه الآية حتى آخر السورة — أو حتى تضغط إيقاف.
        </p>
      )}
      {error && (
        <p className="mt-2 text-center text-xs text-[#e8c87a]/85" role="status">
          {error}
        </p>
      )}
    </div>
  );
}