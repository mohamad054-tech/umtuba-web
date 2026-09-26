"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../../components/i18n";
import { shuffled } from "../../../lib/games/play/engine";
import {
  BLANKS,
  FLAGS,
  LESSON_QUIZ,
  QUICK_Q,
  STORE_PRODUCTS,
  VOCAB,
  pickQuiz,
  type QuizItem,
} from "../../../lib/games/play/banks";
import {
  CITY_ROUND,
  GAME_CITIES,
  GAME_LANDMARKS,
  LANDMARK_ROUND,
  buildPlaceQuiz,
  placeSrc,
} from "../../../lib/games/play/places";
import FlagMark from "./FlagMark";
import QuizPlay from "./QuizPlay";

function PlacePhoto({ src }: { src: string }) {
  return (
    <div className="um-place-photo-wrap" dir="ltr">
      <img className="um-place-photo" src={src} alt="" draggable={false} />
    </div>
  );
}

function PhotoZoom({
  src,
  contain,
  label,
  onClose,
}: {
  src: string;
  contain?: boolean;
  label: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const zoomTo = (next: number) => {
    const clamped = Math.min(4, Math.max(1, next));
    scaleRef.current = clamped;
    setScale(clamped);
  };

  return (
    <div
      className="um-sight-zoom"
      role="dialog"
      aria-label={label}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        moved.current = false;
        if (pointers.current.size === 2) {
          const pts = [...pointers.current.values()];
          pinchRef.current = {
            dist: Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) || 1,
            scale: scaleRef.current,
          };
        }
      }}
      onPointerMove={(event) => {
        const prev = pointers.current.get(event.pointerId);
        if (!prev) return;
        if (Math.hypot(event.clientX - prev.x, event.clientY - prev.y) > 10) moved.current = true;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size < 2 || !pinchRef.current) return;
        const pts = [...pointers.current.values()];
        const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y) || 1;
        zoomTo(pinchRef.current.scale * (dist / pinchRef.current.dist));
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId);
        if (pointers.current.size < 2) pinchRef.current = null;
        if (pointers.current.size === 0 && !moved.current) onClose();
      }}
      onPointerCancel={() => {
        pointers.current.clear();
        pinchRef.current = null;
      }}
      onWheel={(event) => {
        event.preventDefault();
        zoomTo(scaleRef.current + (event.deltaY < 0 ? 0.25 : -0.25));
      }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className={contain ? "contain" : undefined}
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}

function SightButton({ src, contain, children }: { src: string; contain?: boolean; children: ReactNode }) {
  const { locale } = useI18n();
  const [open, setOpen] = useState(false);
  const openLabel = locale === "ar" ? "افتح الصورة" : "Open the picture";
  const closeLabel = locale === "ar" ? "أغلق الصورة" : "Close the picture";
  return (
    <>
      <button type="button" className={`um-sight${contain ? " contain" : ""}`} aria-label={openLabel} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <PhotoZoom src={src} contain={contain} label={closeLabel} onClose={() => setOpen(false)} />,
            document.body,
          )
        : null}
    </>
  );
}

function flagQuiz(): QuizItem[] {
  return shuffled([...FLAGS]).slice(0, 8).map((flag) => {
    const wrong = shuffled(FLAGS.filter((item) => item.id !== flag.id))
      .slice(0, 3)
      .map((item) => item.name);
    const choices = shuffled([flag.name, ...wrong]);
    return {
      prompt: flag.id,
      choices,
      correct: choices.indexOf(flag.name),
      why: flag.name,
    };
  });
}

function vocabQuiz(): QuizItem[] {
  return shuffled(VOCAB).slice(0, 8).map((row) => {
    const choices = shuffled([row.ar, ...row.wrong]);
    return {
      prompt: row.en,
      choices,
      correct: choices.indexOf(row.ar),
      why: `${row.en} = ${row.ar}`,
    };
  });
}

function blankQuiz(): QuizItem[] {
  return shuffled(BLANKS).slice(0, 8).map((row) => {
    const choices = shuffled(row.o);
    return {
      prompt: row.s,
      choices,
      correct: choices.indexOf(row.a),
      why: row.s.replace("___", row.a),
    };
  });
}

function discountQuiz(): QuizItem[] {
  return Array.from({ length: 8 }, () => {
    const product = shuffled(STORE_PRODUCTS)[0] ?? STORE_PRODUCTS[0]!;
    const pct = [10, 15, 20, 25, 30, 35, 40, 50][Math.floor(Math.random() * 8)] ?? 20;
    const sale = Math.round((product.price * (100 - pct)) / 100);
    const opts = new Set([pct]);
    while (opts.size < 4) {
      opts.add([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60][Math.floor(Math.random() * 11)] ?? 10);
    }
    const choices = shuffled([...opts].map(String));
    return {
      prompt: `${product.name}|${product.price}|${sale}`,
      choices,
      correct: choices.indexOf(String(pct)),
      why: `${product.price} ← ${sale} = ${pct}%`,
    };
  });
}

export function LessonQuizGame() {
  return (
    <QuizPlay
      slug="lesson-quiz"
      howTo={["games.lesson-quiz.howTo1", "games.lesson-quiz.howTo2", "games.lesson-quiz.howTo3"]}
      load={() => pickQuiz(LESSON_QUIZ, 6)}
      seconds={20}
    />
  );
}

export function QuickQGame() {
  return (
    <QuizPlay
      slug="quick-q"
      howTo={["games.quick-q.howTo1", "games.quick-q.howTo2", "games.quick-q.howTo3"]}
      load={() => pickQuiz(QUICK_Q, 10)}
      seconds={12}
    />
  );
}

export function VocabGame() {
  return (
    <QuizPlay
      slug="vocab"
      howTo={["games.vocab.howTo1", "games.vocab.howTo2", "games.vocab.howTo3"]}
      load={vocabQuiz}
      seconds={12}
      extra={(item) => <p className="um-play-enword">{item.prompt}</p>}
      hidePrompt
    />
  );
}

export function FillBlankGame() {
  return (
    <QuizPlay
      slug="fill-blank"
      howTo={["games.fill-blank.howTo1", "games.fill-blank.howTo2", "games.fill-blank.howTo3"]}
      load={blankQuiz}
      seconds={14}
    />
  );
}

export function FlagGuessGame() {
  return (
    <QuizPlay
      slug="flag-guess"
      globe
      howTo={["games.flag-guess.howTo1", "games.flag-guess.howTo2", "games.flag-guess.howTo3"]}
      load={flagQuiz}
      seconds={18}
      extra={(item) => (
        <SightButton src={`/games/flags/${item.prompt}.svg`} contain>
          <div className="um-play-flagbox" data-play-item="true" dir="ltr">
            <FlagMark id={item.prompt} />
          </div>
        </SightButton>
      )}
      hidePrompt
    />
  );
}

export function GuessCityGame() {
  return (
    <QuizPlay
      slug="guess-city"
      fit
      globe
      howTo={["games.guess-city.howTo1", "games.guess-city.howTo2", "games.guess-city.howTo3"]}
      load={() => buildPlaceQuiz(GAME_CITIES, CITY_ROUND)}
      seconds={18}
      extra={(item) => (
        <SightButton src={placeSrc("cities", item.prompt)}>
          <img className="um-place-photo" src={placeSrc("cities", item.prompt)} alt="" draggable={false} />
        </SightButton>
      )}
      hidePrompt
    />
  );
}

export function LandmarkGame() {
  return (
    <QuizPlay
      slug="landmark"
      fit
      howTo={["games.landmark.howTo1", "games.landmark.howTo2", "games.landmark.howTo3"]}
      load={() => buildPlaceQuiz(GAME_LANDMARKS, LANDMARK_ROUND)}
      seconds={18}
      extra={(item) => <PlacePhoto src={placeSrc("landmarks", item.prompt)} />}
      hidePrompt
    />
  );
}

export function GuessDiscountGame() {
  return (
    <QuizPlay
      slug="guess-discount"
      howTo={["games.guess-discount.howTo1", "games.guess-discount.howTo2", "games.guess-discount.howTo3"]}
      load={discountQuiz}
      seconds={14}
      extra={(item) => {
        const [name, oldP, sale] = item.prompt.split("|");
        return (
          <p className="um-play-priceline">
            <s>{oldP}</s> <strong>{sale}</strong> — {name}
          </p>
        );
      }}
      hidePrompt
    />
  );
}
