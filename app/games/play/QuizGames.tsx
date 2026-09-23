"use client";

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
      howTo={["games.flag-guess.howTo1", "games.flag-guess.howTo2", "games.flag-guess.howTo3"]}
      load={flagQuiz}
      seconds={18}
      extra={(item) => (
        <div className="um-play-flagbox" data-play-item="true" dir="ltr">
          <FlagMark id={item.prompt} />
        </div>
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
      howTo={["games.guess-city.howTo1", "games.guess-city.howTo2", "games.guess-city.howTo3"]}
      load={() => buildPlaceQuiz(GAME_CITIES, CITY_ROUND)}
      seconds={18}
      extra={(item) => <PlacePhoto src={placeSrc("cities", item.prompt)} />}
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
