"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_REPEAT_COUNT,
  husaryClipUrl,
  repeatPauseMs,
  type HifzAudioClipId,
  type RepeatCount,
} from "../../../lib/hifz/audio";
import {
  getHusaryAyahTiming,
  wordIndexAtMs,
} from "../../../lib/hifz/husaryTimings";

export type AudioPlayMode = "single" | "repeat" | "tilawaLink" | "surah";

type QueueItem = {
  clip: HifzAudioClipId;
  /** When set, after this clip ends wait silently then continue (listen & repeat). */
  pauseAfterMs?: number;
  repeatIndex?: number;
  repeatCount?: RepeatCount;
};

function buildQueue(
  mode: AudioPlayMode,
  start: HifzAudioClipId,
  repeatCount: RepeatCount,
): QueueItem[] {
  if (mode === "single") {
    return [{ clip: start }];
  }
  if (mode === "repeat") {
    if (start === "basmala") return [{ clip: "basmala" }];
    const ayah = start;
    const durationMs = getHusaryAyahTiming(ayah)?.durationMs ?? 5000;
    const pause = repeatPauseMs(durationMs);
    const items: QueueItem[] = [];
    for (let i = 0; i < repeatCount; i++) {
      items.push({
        clip: ayah,
        pauseAfterMs: i < repeatCount - 1 ? pause : undefined,
        repeatIndex: i,
        repeatCount,
      });
    }
    return items;
  }
  if (mode === "tilawaLink") {
    if (start === "basmala") {
      return [{ clip: "basmala" }, { clip: 1 }];
    }
    if (start >= 15) return [{ clip: start }];
    return [{ clip: start }, { clip: (start + 1) as number }];
  }
  // whole surah
  const items: QueueItem[] = [{ clip: "basmala" }];
  for (let n = 1; n <= 15; n++) items.push({ clip: n });
  return items;
}

export function useHusaryPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const indexRef = useRef(0);
  const pauseTimerRef = useRef<number | null>(null);
  const scaleRef = useRef(1);
  const playingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [inRepeatSilence, setInRepeatSilence] = useState(false);
  const [activeClip, setActiveClip] = useState<HifzAudioClipId | null>(null);
  const [activeWord, setActiveWord] = useState(-1);
  const [repeatIndex, setRepeatIndex] = useState(0);
  const [repeatCount, setRepeatCount] = useState<RepeatCount>(DEFAULT_REPEAT_COUNT);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );

  const clearPauseTimer = useCallback(() => {
    if (pauseTimerRef.current != null) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  }, []);

  const updateMediaSession = useCallback((clip: HifzAudioClipId) => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const title =
      clip === "basmala" ? "البسملة — سورة الشمس" : `سورة الشمس ﴿${clip}﴾`;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: "الشيخ محمود خليل الحصري",
      album: "سماء الحفظ",
    });
  }, []);

  const stopInternal = useCallback(() => {
    clearPauseTimer();
    playingRef.current = false;
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    queueRef.current = [];
    indexRef.current = 0;
    setPlaying(false);
    setPaused(false);
    setInRepeatSilence(false);
    setActiveClip(null);
    setActiveWord(-1);
    setRepeatIndex(0);
    setLoadState("idle");
  }, [clearPauseTimer]);

  const playIndex = useCallback(
    async (qi: number) => {
      const el = audioRef.current;
      if (!el) return;
      const item = queueRef.current[qi];
      if (!item) {
        stopInternal();
        return;
      }
      clearPauseTimer();
      setInRepeatSilence(false);
      setAudioError(null);
      setLoadState("loading");
      indexRef.current = qi;
      setActiveClip(item.clip);
      setRepeatIndex(item.repeatIndex ?? 0);
      setActiveWord(-1);
      updateMediaSession(item.clip);

      const url = husaryClipUrl(item.clip);
      el.preload = "auto";
      el.src = url;
      try {
        await el.play();
        playingRef.current = true;
        setPlaying(true);
        setPaused(false);
        setLoadState("ready");
      } catch {
        setLoadState("error");
        setAudioError("تعذّر تشغيل التلاوة. تحقّق من الاتصال ثم حاول مرة أخرى.");
        playingRef.current = false;
        setPlaying(false);
      }
    },
    [clearPauseTimer, stopInternal, updateMediaSession],
  );

  const advanceAfterClip = useCallback(() => {
    const qi = indexRef.current;
    const item = queueRef.current[qi];
    if (!item) {
      stopInternal();
      return;
    }
    const next = qi + 1;
    if (item.pauseAfterMs != null && item.pauseAfterMs > 0 && next < queueRef.current.length) {
      setInRepeatSilence(true);
      setActiveWord(-1);
      pauseTimerRef.current = window.setTimeout(() => {
        setInRepeatSilence(false);
        void playIndex(next);
      }, item.pauseAfterMs);
      return;
    }
    if (next < queueRef.current.length) {
      void playIndex(next);
    } else {
      stopInternal();
    }
  }, [playIndex, stopInternal]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onEnded = () => advanceAfterClip();
    const onTimeUpdate = () => {
      const clip = queueRef.current[indexRef.current]?.clip;
      if (clip == null || clip === "basmala") {
        setActiveWord(-1);
        return;
      }
      const timing = getHusaryAyahTiming(clip);
      if (!timing) {
        setActiveWord(-1);
        return;
      }
      const expected = timing.durationMs;
      const actual = el.duration * 1000;
      const scale =
        Number.isFinite(actual) && actual > 0 && expected > 0 ? actual / expected : 1;
      scaleRef.current = scale;
      setActiveWord(wordIndexAtMs(clip, el.currentTime * 1000, scale));
    };
    const onError = () => {
      setLoadState("error");
      setAudioError("تعذّر تحميل التلاوة. حاول مرة أخرى بهدوء.");
      playingRef.current = false;
      setPlaying(false);
    };
    const onLoaded = () => {
      const clip = queueRef.current[indexRef.current]?.clip;
      if (clip == null || clip === "basmala") return;
      const timing = getHusaryAyahTiming(clip);
      if (!timing || !Number.isFinite(el.duration) || el.duration <= 0) return;
      scaleRef.current = (el.duration * 1000) / timing.durationMs;
    };

    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("error", onError);
    el.addEventListener("loadedmetadata", onLoaded);
    return () => {
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("error", onError);
      el.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [advanceAfterClip]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler("play", () => {
      void audioRef.current?.play();
      setPlaying(true);
      setPaused(false);
    });
    ms.setActionHandler("pause", () => {
      audioRef.current?.pause();
      setPlaying(false);
      setPaused(true);
    });
    ms.setActionHandler("stop", () => stopInternal());
    return () => {
      ms.setActionHandler("play", null);
      ms.setActionHandler("pause", null);
      ms.setActionHandler("stop", null);
    };
  }, [stopInternal]);

  useEffect(() => () => stopInternal(), [stopInternal]);

  const start = useCallback(
    (mode: AudioPlayMode, startClip: HifzAudioClipId) => {
      stopInternal();
      queueRef.current = buildQueue(mode, startClip, repeatCount);
      indexRef.current = 0;
      void playIndex(0);
    },
    [playIndex, repeatCount, stopInternal],
  );

  const togglePause = useCallback(() => {
    const el = audioRef.current;
    if (!el || !activeClip) return;
    if (inRepeatSilence) return;
    if (playingRef.current && !el.paused) {
      el.pause();
      playingRef.current = false;
      setPlaying(false);
      setPaused(true);
    } else {
      void el.play().then(() => {
        playingRef.current = true;
        setPlaying(true);
        setPaused(false);
      });
    }
  }, [activeClip, inRepeatSilence]);

  const bindAudio = useCallback((node: HTMLAudioElement | null) => {
    audioRef.current = node;
  }, []);

  return {
    bindAudio,
    start,
    stop: stopInternal,
    togglePause,
    playing,
    paused,
    inRepeatSilence,
    activeClip,
    activeWord,
    repeatIndex,
    repeatCount,
    setRepeatCount,
    audioError,
    loadState,
    clearError: () => setAudioError(null),
  };
}
