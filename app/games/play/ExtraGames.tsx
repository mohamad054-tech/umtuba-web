"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../../components/i18n";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import {
  ARABIC_LETTERS,
  BASKET_ITEMS,
  COUNTRIES,
  DIST_CITIES,
  HANG_WORDS,
  PRICE_CATALOG,
  STEPS,
  STORE_PRODUCTS,
  TERMS,
  TYPE_PHRASES,
  WHEEL_SLICES,
  WORLD_CITIES,
  cityDistance,
  normArabicLetter,
} from "../../../lib/games/play/banks";
import {
  createPlaySfx,
  formatPlayNumber,
  prefersReducedMotion,
  shuffled,
  unoCpuIndex,
  unoMatch,
  verdictFromScore,
  wheelIndexAt,
  wheelStopAngle,
  type UnoCard,
} from "../../../lib/games/play/engine";
import { readBest, writeBestIfHigher } from "../../../lib/games/play/scores";
import { useBoardScrollLock } from "./boardPointer";
import type { PlayableGameSlug } from "../../../lib/games/play/catalog";
import { ColorCard } from "./ColorCards";
import ProductMark from "./ProductMark";
import { CityFace, CountryShape, PairSketch, flagEmoji } from "./PlaceCard";
import {
  PlayHowTo,
  PlayPanel,
  PlayResult,
  PlayStat,
  usePlayHelp,
} from "./PlayChrome";

const GameMap = dynamic(() => import("./GameMap"), {
  ssr: false,
  loading: () => <div className="um-play-gamemap" dir="ltr" />,
});

function Shell({
  howTo,
  stats,
  children,
  ready,
  helpOpen,
  onToggleHelp,
  begin,
}: {
  slug: PlayableGameSlug;
  howTo: TranslationKey[];
  stats: ReactNode;
  children: ReactNode;
  ready: boolean;
  helpOpen: boolean;
  onToggleHelp: () => void;
  begin: () => void;
}) {
  const { t } = useI18n();
  return (
    <PlayPanel stats={stats} helpOpen={helpOpen} onToggleHelp={onToggleHelp}>
      <PlayHowTo
        open={helpOpen}
        lines={howTo.map((key) => t(key))}
        cta={ready ? "gotIt" : "start"}
        onDismiss={begin}
      />
      {ready ? children : null}
    </PlayPanel>
  );
}

export function FartherPairGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [pair, setPair] = useState<{ a: string; b: string; c: string; d: string; win: "L" | "R" } | null>(null);

  const deal = () => {
    const ids = DIST_CITIES.map((city) => city.id);
    const options: { a: string; b: string; km: number }[] = [];
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const km = cityDistance(ids[i]!, ids[j]!);
        if (km) options.push({ a: ids[i]!, b: ids[j]!, km });
      }
    }
    const pool = shuffled(options);
    const left = pool[0]!;
    const right = pool.find((item) => Math.abs(item.km - left.km) >= 400) ?? pool[1]!;
    setPair({
      a: left.a,
      b: left.b,
      c: right.a,
      d: right.b,
      win: left.km >= right.km ? "L" : "R",
    });
  };

  const label = (id: string) => DIST_CITIES.find((city) => city.id === id);

  const begin = () => {
    if (!help.ready) {
      setRound(0);
      setScore(0);
      setDone(false);
      deal();
    }
    help.dismissHelp();
  };

  const pick = (side: "L" | "R") => {
    if (!pair || done) return;
    if (side === pair.win) {
      setScore((n) => n + 90);
      sfx.ok();
    } else sfx.no();
    if (round + 1 >= 8) {
      writeBestIfHigher("farther-pair", score + (side === pair.win ? 90 : 0));
      setDone(true);
    } else {
      setRound((n) => n + 1);
      deal();
    }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={t("games.farther-pair.title")} onAgain={() => { setDone(false); setRound(0); setScore(0); deal(); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="farther-pair" howTo={["games.farther-pair.howTo1", "games.farther-pair.howTo2", "games.farther-pair.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      {pair ? (
        <div className="um-play-pairgrid" dir="ltr">
          {(["L", "R"] as const).map((side) => {
            const left = side === "L";
            const first = label(left ? pair.a : pair.c);
            const second = label(left ? pair.b : pair.d);
            if (!first || !second) return null;
            return (
              <button key={side} type="button" className="um-place-card" data-play-item="true" onClick={() => pick(side)}>
                <span className="um-place-row">
                  <CityFace flag={flagEmoji(first.iso)} name={first.city} country={first.country} />
                  <CityFace flag={flagEmoji(second.iso)} name={second.city} country={second.country} />
                </span>
                <PairSketch a={first} b={second} />
              </button>
            );
          })}
        </div>
      ) : null}
    </Shell>
  );
}

export function LargerCountryGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [pair, setPair] = useState<[typeof COUNTRIES[number], typeof COUNTRIES[number]] | null>(null);

  const deal = () => setPair(shuffled(COUNTRIES).slice(0, 2) as [typeof COUNTRIES[number], typeof COUNTRIES[number]]);
  const begin = () => {
    if (!help.ready) { setScore(0); setRound(0); setDone(false); deal(); }
    help.dismissHelp();
  };
  const pick = (index: 0 | 1) => {
    if (!pair || done) return;
    const win = pair[0].km2 >= pair[1].km2 ? 0 : 1;
    if (index === win) { setScore((n) => n + 85); sfx.ok(); } else sfx.no();
    if (round + 1 >= 8) { writeBestIfHigher("larger-country", score + (index === win ? 85 : 0)); setDone(true); }
    else { setRound((n) => n + 1); deal(); }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={t("games.larger-country.title")} onAgain={() => { setDone(false); setScore(0); setRound(0); deal(); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="larger-country" howTo={["games.larger-country.howTo1", "games.larger-country.howTo2", "games.larger-country.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      {pair ? (
        <div className="um-play-pairgrid" dir="ltr">
          {pair.map((country, index) => (
            <button key={country.id} type="button" className="um-place-card" data-play-item="true" onClick={() => pick(index as 0 | 1)}>
              <CityFace flag={flagEmoji(country.id)} name={country.name} country="" />
              <CountryShape id={country.id} />
            </button>
          ))}
        </div>
      ) : null}
    </Shell>
  );
}

export function CheaperGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [pair, setPair] = useState<typeof STORE_PRODUCTS | null>(null);

  const deal = () => setPair(shuffled(STORE_PRODUCTS).slice(0, 2));
  const begin = () => { if (!help.ready) { setScore(0); setRound(0); setDone(false); deal(); } help.dismissHelp(); };
  const pick = (index: 0 | 1) => {
    if (!pair || done) return;
    const win = pair[0]!.price <= pair[1]!.price ? 0 : 1;
    if (index === win) { setScore((n) => n + 70); sfx.ok(); } else sfx.no();
    if (round + 1 >= 8) { writeBestIfHigher("cheaper", score + (index === win ? 70 : 0)); setDone(true); }
    else { setRound((n) => n + 1); deal(); }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={t("games.cheaper.title")} onAgain={() => { setDone(false); setScore(0); setRound(0); deal(); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="cheaper" howTo={["games.cheaper.howTo1", "games.cheaper.howTo2", "games.cheaper.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      {pair ? (
        <div className="um-play-pairgrid" dir="ltr">
          {pair.map((item, index) => (
            <button key={item.id} type="button" className="um-play-pair" data-play-item="true" onClick={() => pick(index as 0 | 1)}>
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
    </Shell>
  );
}

export function OrderStepsGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [i, setI] = useState(0);
  const [items, setItems] = useState<string[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const deal = (index = 0) => {
    const pack = shuffled(STEPS[index]?.steps ?? []);
    setItems(pack);
    setSel(null);
  };
  const begin = () => { if (!help.ready) { setI(0); setScore(0); setDone(false); deal(0); } help.dismissHelp(); };
  const tap = (idx: number) => {
    if (sel == null) { setSel(idx); return; }
    if (sel === idx) { setSel(null); return; }
    const next = [...items];
    const a = next[sel]!;
    next[sel] = next[idx]!;
    next[idx] = a;
    setItems(next);
    setSel(null);
    sfx.ok();
  };
  const confirm = () => {
    const truth = STEPS[i]?.steps ?? [];
    const hit = items.every((step, idx) => step === truth[idx]);
    if (hit) { setScore((n) => n + 130); sfx.ok(); } else sfx.no();
    if (i + 1 >= STEPS.length) { writeBestIfHigher("order-steps", score + (hit ? 130 : 0)); setDone(true); }
    else { const next = i + 1; setI(next); deal(next); }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={t("games.order-steps.title")} onAgain={() => { setDone(false); setI(0); setScore(0); deal(0); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="order-steps" howTo={["games.order-steps.howTo1", "games.order-steps.howTo2", "games.order-steps.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      <p className="um-play-qtext">{STEPS[i]?.title}</p>
      <div className="um-play-sort">
        {items.map((text, idx) => (
          <button key={`${text}-${idx}`} type="button" className={`um-play-step${sel === idx ? " sel" : ""}`} data-play-item="true" onClick={() => tap(idx)}>
            <span className="n">{idx + 1}</span> {text}
          </button>
        ))}
      </div>
      <div className="um-play-row">
        <button type="button" className="um-play-btn go" data-play-item="true" onClick={confirm}>{t("games.confirm")}</button>
      </div>
    </Shell>
  );
}

export function SortPriceGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [round, setRound] = useState(0);
  const [items, setItems] = useState<typeof STORE_PRODUCTS>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const deal = () => setItems(shuffled(STORE_PRODUCTS).slice(0, 4));
  const begin = () => { if (!help.ready) { setRound(0); setScore(0); setDone(false); deal(); } help.dismissHelp(); };
  const tap = (idx: number) => {
    if (sel == null) { setSel(idx); return; }
    if (sel === idx) { setSel(null); return; }
    const next = [...items];
    const a = next[sel]!;
    next[sel] = next[idx]!;
    next[idx] = a;
    setItems(next);
    setSel(null);
  };
  const confirm = () => {
    const hit = items.every((item, idx) => idx === 0 || (items[idx - 1]?.price ?? 0) <= item.price);
    if (hit) { setScore((n) => n + 120); sfx.ok(); } else sfx.no();
    if (round + 1 >= 5) { writeBestIfHigher("sort-price", score + (hit ? 120 : 0)); setDone(true); }
    else { setRound((n) => n + 1); deal(); }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={t("games.sort-price.title")} onAgain={() => { setDone(false); setRound(0); setScore(0); deal(); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="sort-price" howTo={["games.sort-price.howTo1", "games.sort-price.howTo2", "games.sort-price.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      <div className="um-play-sort">
        {items.map((item, idx) => (
          <button key={item.id} type="button" className={`um-play-step${sel === idx ? " sel" : ""}`} data-play-item="true" onClick={() => tap(idx)}>
            {item.name} · {item.price}
          </button>
        ))}
      </div>
      <div className="um-play-row">
        <button type="button" className="um-play-btn go" data-play-item="true" onClick={confirm}>{t("games.confirm")}</button>
      </div>
    </Shell>
  );
}

export function MatchTermGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [pairs, setPairs] = useState<typeof TERMS>([]);
  const [defs, setDefs] = useState<typeof TERMS>([]);
  const [left, setLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);

  const deal = () => {
    const next = shuffled(TERMS).slice(0, 4);
    setPairs(next);
    setDefs(shuffled(next));
    setLeft(null);
    setMatched([]);
    setDone(false);
    setScore(0);
  };
  const begin = () => { if (!help.ready) deal(); help.dismissHelp(); };
  const pickDef = (term: string) => {
    if (!left) return;
    if (left === term) {
      const next = [...matched, term];
      setMatched(next);
      setScore(next.length * 40);
      setLeft(null);
      sfx.ok();
      if (next.length === 4) {
        writeBestIfHigher("match-term", next.length * 40);
        setDone(true);
      }
    } else {
      sfx.no();
      setLeft(null);
    }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={t("games.match-term.title")} onAgain={() => { deal(); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="match-term" howTo={["games.match-term.howTo1", "games.match-term.howTo2", "games.match-term.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      <div className="um-play-match" dir="ltr">
        <div className="um-play-choices">
          {pairs.map((pair) => (
            <button key={pair.t} type="button" className={`um-play-choice${left === pair.t ? " sel" : ""}`} data-play-item="true" disabled={matched.includes(pair.t)} onClick={() => setLeft(pair.t)}>
              {pair.t}
            </button>
          ))}
        </div>
        <div className="um-play-choices">
          {defs.map((pair) => (
            <button key={pair.d} type="button" className="um-play-choice" data-play-item="true" disabled={matched.includes(pair.t)} onClick={() => pickDef(pair.t)}>
              {pair.d}
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function PriceGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [deck, setDeck] = useState<typeof PRICE_CATALOG>([]);
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState(200);
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState(false);
  const item = deck[i];
  const min = item ? Math.max(20, Math.round((item.p * 0.2) / 10) * 10) : 20;
  const max = item ? Math.round((item.p * 2.2) / 10) * 10 : 400;

  const begin = () => {
    if (!help.ready) {
      const next = shuffled(PRICE_CATALOG).slice(0, 5);
      setDeck(next);
      setI(0);
      setScore(0);
      setLocked(false);
      setDone(false);
      const first = next[0];
      setGuess(first ? Math.round((Math.max(20, Math.round((first.p * 0.2) / 10) * 10) + Math.round((first.p * 2.2) / 10) * 10) / 2) : 200);
    }
    help.dismissHelp();
  };

  const lock = () => {
    if (!item || locked) return;
    setLocked(true);
    const rel = Math.abs(guess - item.p) / item.p;
    const pts = rel <= 0.03 ? 200 : rel <= 0.08 ? 150 : rel <= 0.15 ? 100 : rel <= 0.3 ? 55 : rel <= 0.5 ? 20 : 0;
    setScore((n) => n + pts);
    if (pts >= 100) sfx.ok(); else sfx.no();
  };

  const next = () => {
    if (i + 1 >= deck.length) {
      writeBestIfHigher("price", score);
      setDone(true);
    } else {
      const n = i + 1;
      setI(n);
      setLocked(false);
      const nxt = deck[n];
      if (nxt) setGuess(Math.round((Math.max(20, Math.round((nxt.p * 0.2) / 10) * 10) + Math.round((nxt.p * 2.2) / 10) * 10) / 2));
    }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={t("games.price.title")} onAgain={() => { const next = shuffled(PRICE_CATALOG).slice(0, 5); setDeck(next); setI(0); setScore(0); setLocked(false); setDone(false); const first = next[0]; setGuess(first ? Math.round((Math.max(20, Math.round((first.p * 0.2) / 10) * 10) + Math.round((first.p * 2.2) / 10) * 10) / 2) : 200); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="price" howTo={["games.price.howTo1", "games.price.howTo2", "games.price.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      {item ? (
        <div className="um-play-quiz" dir="ltr">
          <p className="um-play-note">{t("games.madeUpPrices")}</p>
          <ProductMark kind={item.k} />
          <p className="um-play-qtext">{item.n}</p>
          <p className="um-play-priceline" dir="ltr">
            {formatPlayNumber(locale, guess)}
            {locked ? ` / ${formatPlayNumber(locale, item.p)}` : ""}
          </p>
          <input className="um-play-slider" type="range" min={min} max={max} step={5} value={guess} data-play-item="true" disabled={locked} onChange={(e) => setGuess(Number(e.target.value))} />
          <div className="um-play-row">
            {!locked ? (
              <button type="button" className="um-play-btn go" data-play-item="true" onClick={lock}>{t("games.lockGuess")}</button>
            ) : (
              <button type="button" className="um-play-btn go" data-play-item="true" onClick={next}>{i + 1 >= deck.length ? t("games.results") : t("games.next")}</button>
            )}
          </div>
        </div>
      ) : null}
    </Shell>
  );
}

export function WheelGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const angleRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [total, setTotal] = useState(0);
  const [spins, setSpins] = useState(0);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const [floor, setFloor] = useState(0);
  useBoardScrollLock(stageRef, help.ready);

  const begin = () => { if (!help.ready) { setFloor(readBest("wheel") ?? 0); setTotal(0); setSpins(0); setWon(null); } help.dismissHelp(); };
  const spin = () => {
    if (busy) return;
    setBusy(true);
    setWon(null);
    const pick = Math.floor(Math.random() * WHEEL_SLICES.length);
    const reduced = prefersReducedMotion();
    const next = wheelStopAngle(angleRef.current, pick, WHEEL_SLICES.length, reduced ? 0 : 5);
    angleRef.current = next;
    setAngle(next);
    window.setTimeout(() => {
      const index = wheelIndexAt(next, WHEEL_SLICES.length);
      const val = WHEEL_SLICES[index] ?? WHEEL_SLICES[pick] ?? 5;
      setSpins((n) => n + 1);
      setTotal((n) => n + val);
      setWon(val);
      writeBestIfHigher("wheel", total + val);
      sfx.win();
      setBusy(false);
    }, reduced ? 40 : 2600);
  };
  const step = 360 / WHEEL_SLICES.length;

  return (
    <Shell slug="wheel" howTo={["games.wheel.howTo1", "games.wheel.howTo2", "games.wheel.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, total)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      <div ref={stageRef} className="um-play-wheel-stage um-lit-board" dir="ltr">
        <div className="um-play-wheel-pointer" aria-hidden="true" />
        <div
          className="um-play-wheel"
          data-play-item="true"
          style={{ transform: `rotate(${angle}deg)` }}
          onPointerDown={(event) => {
            if (!event.isPrimary || busy) return;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (!event.isPrimary) return;
            spin();
          }}
        >
          {WHEEL_SLICES.map((value, index) => (
            <span
              key={`${value}-${index}`}
              className="um-play-slice"
              dir="ltr"
              style={{ transform: `rotate(${index * step + step / 2}deg) translateY(-78px)` }}
            >
              {value}%
            </span>
          ))}
        </div>
      </div>
      <p className={`um-play-wheel-won${won != null && total > floor ? " um-play-best" : won != null ? " um-play-celebrate" : ""}`} dir="ltr">
        {won == null ? "\u00a0" : t("games.wheel.won", { values: { value: `${formatPlayNumber(locale, won)}%` } })}
      </p>
      <div className="um-play-row" style={{ justifyContent: "center" }}>
        <button type="button" className="um-play-btn go" data-play-item="true" onClick={spin} disabled={busy}>{t("games.spin")}</button>
      </div>
      <p className="um-play-qnum">{formatPlayNumber(locale, spins)}</p>
    </Shell>
  );
}

export function BasketGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [picked, setPicked] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const cap = 900;
  const need = 4;
  const sum = picked.reduce((acc, idx) => acc + (BASKET_ITEMS[idx]?.p ?? 0), 0);

  const begin = () => { if (!help.ready) { setPicked([]); setDone(false); setScore(0); } help.dismissHelp(); };
  const toggle = (idx: number) => {
    setPicked((cur) => {
      if (cur.includes(idx)) return cur.filter((item) => item !== idx);
      if (cur.length >= need) return cur;
      sfx.flip();
      return [...cur, idx];
    });
  };
  const finish = () => {
    const over = sum > cap;
    const gap = cap - sum;
    const pts = picked.length < need ? 0 : over ? 40 : gap <= 30 ? 800 : gap <= 80 ? 600 : gap <= 160 ? 420 : 250;
    setScore(pts);
    writeBestIfHigher("basket", pts);
    setDone(true);
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={t("games.basket.title")} onAgain={() => { setDone(false); setPicked([]); setScore(0); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="basket" howTo={["games.basket.howTo1", "games.basket.howTo2", "games.basket.howTo3"]} stats={<PlayStat label={t("games.score")} value={`${formatPlayNumber(locale, sum)} / ${formatPlayNumber(locale, cap)}`} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      <p className="um-play-note">{t("games.madeUpPrices")}</p>
      <div className="um-play-shelf">
        {BASKET_ITEMS.map((item, idx) => (
          <button key={`${item.n}-${idx}`} type="button" className={`um-product-card${picked.includes(idx) ? " sel" : ""}`} data-play-item="true" onClick={() => toggle(idx)}>
            <ProductMark kind={item.k} />
            <span className="um-product-copy">
              <span className="um-place-name">{item.n}</span>
              <span className="um-place-country" dir="ltr">{formatPlayNumber(locale, item.p)}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="um-play-row">
        <button type="button" className="um-play-btn go" data-play-item="true" disabled={picked.length !== need} onClick={finish}>{t("games.confirm")}</button>
      </div>
    </Shell>
  );
}

export function CollectorGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [queue, setQueue] = useState<typeof WORLD_CITIES>([]);
  const [got, setGot] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const current = queue[0];

  const begin = () => { if (!help.ready) { setQueue(shuffled(WORLD_CITIES)); setGot([]); setDone(false); } help.dismissHelp(); };
  const drop = (id: string) => {
    if (!current) return;
    if (id === current.id) {
      const nextGot = [...got, id];
      setGot(nextGot);
      setQueue((q) => q.slice(1));
      sfx.ok();
      if (nextGot.length === WORLD_CITIES.length) {
        writeBestIfHigher("collector", 400);
        setDone(true);
      }
    } else sfx.no();
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.collected")} value={formatPlayNumber(locale, got.length)} />}>
        <PlayResult score={400} verdictKey="games.perfect" detail={t("games.collector.title")} onAgain={() => { setQueue(shuffled(WORLD_CITIES)); setGot([]); setDone(false); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="collector" howTo={["games.collector.howTo1", "games.collector.howTo2", "games.collector.howTo3"]} stats={<PlayStat label={t("games.collected")} value={`${formatPlayNumber(locale, got.length)} / ${formatPlayNumber(locale, WORLD_CITIES.length)}`} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      <p className="um-play-qtext">{current ? `${current.city} · ${current.country}` : ""}</p>
      <GameMap
        pins={WORLD_CITIES.map((city) => ({
          id: city.id,
          lng: city.lng,
          lat: city.lat,
          state: got.includes(city.id) ? "got" : "idle",
        }))}
        fit="all"
        interactive
        onPick={drop}
      />
    </Shell>
  );
}

export function HangwordGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [deck, setDeck] = useState<typeof HANG_WORDS>([]);
  const [i, setI] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [lives, setLives] = useState(6);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(0);
  const [done, setDone] = useState(false);
  const word = deck[i];
  const boardRef = useRef<HTMLDivElement>(null);
  const [floor, setFloor] = useState(0);
  useBoardScrollLock(boardRef, help.ready && !done);

  const begin = () => {
    if (!help.ready) {
      setFloor(readBest("hangword") ?? 0);
      setDeck(shuffled(HANG_WORDS).slice(0, 4));
      setI(0); setFound([]); setUsed([]); setLives(6); setScore(0); setSolved(0); setDone(false);
    }
    help.dismissHelp();
  };
  const guess = (ch: string) => {
    if (!word || used.includes(ch)) return;
    setUsed((cur) => [...cur, ch]);
    const hit = [...word.w].some((c) => normArabicLetter(c) === ch);
    if (hit) {
      const nextFound = [...found, ch];
      setFound(nextFound);
      sfx.ok();
      if ([...word.w].every((c) => nextFound.includes(normArabicLetter(c)))) {
        const pts = 120 + lives * 30;
        setScore((n) => n + pts);
        setSolved((n) => n + 1);
        if (i + 1 >= deck.length) { writeBestIfHigher("hangword", score + pts); setDone(true); }
        else { setI((n) => n + 1); setFound([]); setUsed([]); setLives(6); }
      }
    } else {
      const nextLives = lives - 1;
      setLives(nextLives);
      sfx.no();
      if (nextLives <= 0) {
        if (i + 1 >= deck.length) { writeBestIfHigher("hangword", score); setDone(true); }
        else { setI((n) => n + 1); setFound([]); setUsed([]); setLives(6); }
      }
    }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <div className={score > floor ? "um-play-best" : undefined}>
          <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={score > floor ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } }) : `${formatPlayNumber(locale, solved)} ${t("games.of")} 4`} onAgain={() => { setDeck(shuffled(HANG_WORDS).slice(0, 4)); setI(0); setFound([]); setUsed([]); setLives(6); setScore(0); setSolved(0); setDone(false); help.keepReadyOnReplay(); }} />
        </div>
      </PlayPanel>
    );
  }

  return (
    <Shell slug="hangword" howTo={["games.hangword.howTo1", "games.hangword.howTo2", "games.hangword.howTo3"]} stats={<PlayStat label={t("games.lives")} value={formatPlayNumber(locale, lives)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      {word ? (
        <>
          <p className="um-play-qnum">{word.h}</p>
          <div className="um-play-word">
            {[...word.w].map((ch, idx) => (
              <span key={`${ch}-${idx}`} className="um-play-slot">{found.includes(normArabicLetter(ch)) ? ch : ""}</span>
            ))}
          </div>
          <div ref={boardRef} className="um-play-letters um-lit-board">
            {ARABIC_LETTERS.map((ch) => (
              <button key={ch} type="button" className="um-play-ltr" data-play-item="true" disabled={used.includes(ch)} onClick={() => guess(ch)}>
                {ch}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  );
}

export function TypeRaceGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [i, setI] = useState(0);
  const [value, setValue] = useState("");
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const text = TYPE_PHRASES[i] ?? "";

  const begin = () => { if (!help.ready) { setI(0); setValue(""); setScore(0); setDone(false); } help.dismissHelp(); };
  const onChange = (next: string) => {
    setValue(next);
    if (next === text) {
      const pts = 80;
      setScore((n) => n + pts);
      sfx.ok();
      if (i + 1 >= TYPE_PHRASES.length) { writeBestIfHigher("typerace", score + pts); setDone(true); }
      else { setI((n) => n + 1); setValue(""); }
    }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <PlayResult score={score} verdictKey="games.perfect" detail={t("games.typerace.title")} onAgain={() => { setDone(false); setI(0); setValue(""); setScore(0); help.keepReadyOnReplay(); }} />
      </PlayPanel>
    );
  }

  return (
    <Shell slug="typerace" howTo={["games.typerace.howTo1", "games.typerace.howTo2", "games.typerace.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      <p className="um-play-qtext">{text}</p>
      <input className="um-play-typein" dir="rtl" value={value} data-play-item="true" onChange={(e) => onChange(e.target.value)} autoComplete="off" />
    </Shell>
  );
}

export function ShapesGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  type Card = { sh: string; col: string; up: boolean; done: boolean };
  const boardRef = useRef<HTMLDivElement>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [floor, setFloor] = useState(0);
  useBoardScrollLock(boardRef, help.ready && !done);

  const deal = () => {
    const shapes = ["circle", "square", "diamond"];
    const cols = ["#F0A93B", "#7ED9B8"];
    const pack: Card[] = [];
    shapes.forEach((sh) => cols.forEach((col) => {
      pack.push({ sh, col, up: false, done: false }, { sh, col, up: false, done: false });
    }));
    setCards(shuffled(pack));
    setOpen([]);
    setScore(0);
    setDone(false);
    setFloor(readBest("shapes") ?? 0);
  };

  const begin = () => { if (!help.ready) deal(); help.dismissHelp(); };
  const flip = (index: number) => {
    const card = cards[index];
    if (!card || card.up || card.done || open.length === 2) return;
    const nextOpen = [...open, index];
    setCards((prev) => prev.map((item, i) => (i === index ? { ...item, up: true } : item)));
    if (nextOpen.length < 2) { setOpen(nextOpen); return; }
    const [a, b] = nextOpen;
    const first = cards[a]!;
    const second = index === b ? card : cards[b]!;
    if (first.sh === second.sh && first.col === second.col) {
      setCards((prev) => prev.map((item, i) => (i === a || i === b ? { ...item, done: true } : item)));
      const nextScore = score + 50;
      setScore(nextScore);
      sfx.ok();
      setOpen([]);
      if (cards.filter((item) => item.done).length + 2 === cards.length) {
        writeBestIfHigher("shapes", nextScore);
        setDone(true);
      }
    } else {
      sfx.no();
      window.setTimeout(() => {
        setCards((prev) => prev.map((item, i) => (i === a || i === b ? { ...item, up: false } : item)));
        setOpen([]);
      }, 500);
    }
  };

  if (done) {
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />}>
        <div className={score > floor ? "um-play-best" : undefined}>
          <PlayResult score={score} verdictKey={verdictFromScore("high", score)} detail={score > floor ? t("games.localBest", { values: { score: formatPlayNumber(locale, score) } }) : t("games.shapes.title")} onAgain={() => { deal(); help.keepReadyOnReplay(); }} />
        </div>
      </PlayPanel>
    );
  }

  return (
    <Shell slug="shapes" howTo={["games.shapes.howTo1", "games.shapes.howTo2", "games.shapes.howTo3"]} stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, score)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      <div ref={boardRef} className="um-play-shapeg um-lit-board" dir="ltr">
        {cards.map((card, index) => {
          const face = card.up || card.done;
          return (
            <button key={index} type="button" className={`um-play-scard${face ? " up" : ""}`} data-play-item="true" onClick={() => flip(index)}>
              {face ? <span className={`um-play-shape ${card.sh}`} style={{ background: card.col }} /> : <span className="um-play-shape-gem" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

function refillDeck(deck: UnoCard[], pile: UnoCard[]): { deck: UnoCard[]; pile: UnoCard[] } {
  if (deck.length > 0 || pile.length < 2) return { deck, pile };
  const top = pile[pile.length - 1]!;
  return { deck: shuffled(pile.slice(0, -1)), pile: [top] };
}

function drawCards(deck: UnoCard[], pile: UnoCard[], n: number) {
  let nextDeck = deck;
  let nextPile = pile;
  const drawn: UnoCard[] = [];
  for (let i = 0; i < n; i += 1) {
    const refilled = refillDeck(nextDeck, nextPile);
    nextDeck = refilled.deck;
    nextPile = refilled.pile;
    const card = nextDeck[nextDeck.length - 1];
    if (!card) break;
    drawn.push(card);
    nextDeck = nextDeck.slice(0, -1);
  }
  return { drawn, deck: nextDeck, pile: nextPile };
}

export function UnoGame() {
  const { t, locale } = useI18n();
  const help = usePlayHelp();
  const sfx = useMemo(() => createPlaySfx(), []);
  const [you, setYou] = useState<UnoCard[]>([]);
  const [cpu, setCpu] = useState<UnoCard[]>([]);
  const [pile, setPile] = useState<UnoCard[]>([]);
  const [deck, setDeck] = useState<UnoCard[]>([]);
  const [turn, setTurn] = useState<"you" | "cpu">("you");
  const [done, setDone] = useState<"win" | "lose" | null>(null);
  const [floor, setFloor] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);
  const pileRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const skipClick = useRef(false);
  useBoardScrollLock(tableRef, help.ready && !done);

  const makeDeck = () => {
    const colors: UnoCard["c"][] = ["red", "gold", "mint", "ink"];
    const vals = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+2", "skip", "rev"];
    const d: UnoCard[] = [];
    colors.forEach((c) => vals.forEach((v) => d.push({ c, v })));
    return shuffled([...d, ...d]);
  };

  const deal = () => {
    const d = makeDeck();
    setYou(d.slice(0, 7));
    setCpu(d.slice(7, 14));
    setPile([d[14]!]);
    setDeck(d.slice(15));
    setTurn("you");
    setDone(null);
    setFloor(readBest("uno") ?? 0);
  };

  const begin = () => { if (!help.ready) deal(); help.dismissHelp(); };

  const playYou = (index: number) => {
    if (turn !== "you" || done) return;
    const card = you[index];
    const top = pile[pile.length - 1];
    if (!card || !top || !unoMatch(card, top)) { sfx.no(); return; }
    const nextYou = you.filter((_, i) => i !== index);
    setYou(nextYou);
    setPile((cur) => [...cur, card]);
    sfx.ok();
    if (!nextYou.length) { writeBestIfHigher("uno", 200); setDone("win"); return; }
    setTurn("cpu");
  };

  const drawYou = () => {
    if (turn !== "you" || done) return;
    const taken = drawCards(deck, pile, 1);
    setYou((cur) => [...cur, ...taken.drawn]);
    setDeck(taken.deck);
    setPile(taken.pile);
    setTurn("cpu");
  };

  useEffect(() => {
    if (turn !== "cpu" || done) return;
    const top = pile[pile.length - 1];
    if (!top) return;
    const timer = window.setTimeout(() => {
      const idx = unoCpuIndex(cpu, top);
      if (idx < 0) {
        const taken = drawCards(deck, pile, 1);
        setCpu((cur) => [...cur, ...taken.drawn]);
        setDeck(taken.deck);
        setPile(taken.pile);
        setTurn("you");
        return;
      }
      const card = cpu[idx]!;
      const nextCpu = cpu.filter((_, i) => i !== idx);
      setCpu(nextCpu);
      setPile((cur) => [...cur, card]);
      if (!nextCpu.length) { setDone("lose"); return; }
      setTurn("you");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [turn, cpu, deck, pile, done]);

  if (done) {
    const pts = done === "win" ? 200 : 30;
    return (
      <PlayPanel stats={<PlayStat label={t("games.score")} value={formatPlayNumber(locale, pts)} />}>
        <div className={pts > floor ? "um-play-best" : undefined}>
          <PlayResult score={pts} verdictKey={done === "win" ? "games.youWin" : "games.youLose"} detail={pts > floor ? t("games.localBest", { values: { score: formatPlayNumber(locale, pts) } }) : t("games.uno.title")} onAgain={() => { deal(); help.keepReadyOnReplay(); }} />
        </div>
      </PlayPanel>
    );
  }

  const top = pile[pile.length - 1];

  return (
    <Shell slug="uno" howTo={["games.uno.howTo1", "games.uno.howTo2", "games.uno.howTo3"]} stats={<PlayStat label={t("games.cpu")} value={formatPlayNumber(locale, cpu.length)} />} ready={help.ready} helpOpen={help.helpOpen} onToggleHelp={help.toggleHelp} begin={begin}>
      <div ref={tableRef} className="um-color-table um-lit-board" dir="ltr">
        <div className="um-color-cpu" aria-label={t("games.cpu")}>
          {cpu.map((card, index) => (
            <ColorCard key={`${card.c}-${card.v}-${index}`} faceDown />
          ))}
        </div>
        <p className="um-color-turn">{turn === "you" ? t("games.yourTurn") : t("games.cpuTurn")}</p>
        <div className="um-color-piles">
          <button type="button" className="um-color-pile" data-play-item="true" onClick={drawYou} disabled={turn !== "you"}>
            <ColorCard faceDown />
            <span className="um-color-pile-label">{t("games.drawCard")} · {formatPlayNumber(locale, deck.length)}</span>
          </button>
          <div ref={pileRef} className="um-color-pile" data-uno-discard="true">
            {top ? <ColorCard card={top} /> : <ColorCard faceDown />}
            <span className="um-color-pile-label">{t("games.waste")}</span>
          </div>
        </div>
        <div className="um-color-hand">
          {you.map((card, index) => {
            const legal = top ? unoMatch(card, top) : false;
            return (
              <button
                key={`${card.c}-${card.v}-${index}`}
                type="button"
                className="um-color-play"
                data-play-item="true"
                disabled={turn !== "you" || !legal}
                onPointerDown={(event) => {
                  if (!event.isPrimary || turn !== "you" || !legal) return;
                  dragRef.current = { id: index, x: event.clientX, y: event.clientY };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerUp={(event) => {
                  const start = dragRef.current;
                  dragRef.current = null;
                  if (!start || start.id !== index) return;
                  if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 10) return;
                  skipClick.current = true;
                  const pile = pileRef.current;
                  const hit = document.elementFromPoint(event.clientX, event.clientY);
                  if (pile && hit && pile.contains(hit)) playYou(index);
                }}
                onClick={() => {
                  if (skipClick.current) {
                    skipClick.current = false;
                    return;
                  }
                  playYou(index);
                }}
              >
                <ColorCard card={card} />
              </button>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
