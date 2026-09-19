import Image from "next/image";
import type { JSX, ReactNode } from "react";
import {
  gameArtworkSrc,
  type PlayableGameSlug,
} from "../../../lib/games/play/catalog";

/** Original Umtuba tile marks. Geometric only — not derived from third-party art. */

const C = {
  field: "#0A1028",
  surface: "#12182F",
  raise: "#1A2140",
  line: "#343C6A",
  gold: "#F0A93B",
  goldDim: "#9A6E22",
  ink: "#EEF1FB",
  clay: "#D46A5E",
  mint: "#7ED9B8",
};

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 160"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      focusable="false"
    >
      <rect width="160" height="160" rx="14" fill={C.field} />
      {children}
    </svg>
  );
}

function SudokuArt() {
  const origin = 22;
  const size = 116;
  const step = size / 9;
  const lines = [];
  for (let i = 0; i <= 9; i += 1) {
    const thick = i % 3 === 0;
    const p = origin + i * step;
    const stroke = thick ? C.goldDim : C.line;
    const width = thick ? 1.8 : 0.75;
    lines.push(
      <line
        key={`h${i}`}
        x1={origin}
        y1={p}
        x2={origin + size}
        y2={p}
        stroke={stroke}
        strokeWidth={width}
      />
    );
    lines.push(
      <line
        key={`v${i}`}
        x1={p}
        y1={origin}
        x2={p}
        y2={origin + size}
        stroke={stroke}
        strokeWidth={width}
      />
    );
  }
  const nums = [
    [0, 1, "5"],
    [1, 4, "2"],
    [2, 7, "9"],
    [4, 4, "7"],
    [6, 0, "3"],
    [8, 6, "1"],
  ] as const;
  return (
    <Frame>
      <rect
        x={origin}
        y={origin}
        width={size}
        height={size}
        rx="4"
        fill={C.surface}
      />
      {lines}
      {nums.map(([row, col, value]) => (
        <text
          key={`${row}-${col}`}
          x={origin + (col + 0.5) * step}
          y={origin + (row + 0.72) * step}
          textAnchor="middle"
          fill={row === 4 && col === 4 ? C.gold : C.ink}
          fontSize="11"
          fontWeight="700"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {value}
        </text>
      ))}
    </Frame>
  );
}

function G2048Art() {
  const tiles = [
    { x: 24, y: 58, n: "2", fill: C.raise, ink: C.ink },
    { x: 48, y: 40, n: "4", fill: C.surface, ink: C.mint },
    { x: 72, y: 64, n: "8", fill: C.goldDim, ink: "#14261C" },
    { x: 88, y: 28, n: "16", fill: C.gold, ink: "#14261C" },
  ];
  return (
    <Frame>
      {tiles.map((tile) => (
        <g key={tile.n}>
          <rect
            x={tile.x}
            y={tile.y}
            width="46"
            height="46"
            rx="10"
            fill={tile.fill}
            stroke={C.line}
            strokeWidth="1"
          />
          <text
            x={tile.x + 23}
            y={tile.y + 29}
            textAnchor="middle"
            fill={tile.ink}
            fontSize={tile.n === "16" ? "16" : "18"}
            fontWeight="800"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {tile.n}
          </text>
        </g>
      ))}
    </Frame>
  );
}

function SnakeArt() {
  const segs = [
    [30, 96],
    [50, 96],
    [70, 96],
    [70, 76],
    [70, 56],
    [90, 56],
  ];
  return (
    <Frame>
      {segs.map(([x, y], i) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="18"
          height="18"
          rx="5"
          fill={i === segs.length - 1 ? C.gold : C.mint}
        />
      ))}
      <circle cx="122" cy="42" r="7" fill={C.clay} />
    </Frame>
  );
}

function MemoryArt() {
  return (
    <Frame>
      <g transform="translate(22 40)">
        <rect width="52" height="72" rx="10" fill={C.raise} stroke={C.line} />
        <circle cx="26" cy="36" r="7" fill="none" stroke={C.goldDim} strokeWidth="2" />
      </g>
      <g transform="translate(86 32) rotate(-8 26 36)">
        <rect width="52" height="72" rx="10" fill={C.surface} stroke={C.gold} />
        <path
          d="M26 22c8 8 14 14 14 22a14 14 0 0 1-28 0c0-8 6-14 14-22z"
          fill={C.mint}
        />
      </g>
    </Frame>
  );
}

function XoArt() {
  return (
    <Frame>
      <g stroke={C.line} strokeWidth="3" strokeLinecap="round">
        <line x1="58" y1="28" x2="58" y2="132" />
        <line x1="102" y1="28" x2="102" y2="132" />
        <line x1="28" y1="58" x2="132" y2="58" />
        <line x1="28" y1="102" x2="132" y2="102" />
      </g>
      <path
        d="M34 34l18 18M52 34L34 52"
        stroke={C.gold}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="80" cy="80" r="12" fill="none" stroke={C.mint} strokeWidth="5" />
    </Frame>
  );
}

function HanoiArt() {
  const pegs = [40, 80, 120];
  const discs = [
    { peg: 0, y: 112, w: 44 },
    { peg: 0, y: 96, w: 34 },
    { peg: 0, y: 80, w: 24 },
    { peg: 1, y: 112, w: 18 },
  ];
  return (
    <Frame>
      <rect x="20" y="124" width="120" height="8" rx="4" fill={C.line} />
      {pegs.map((x) => (
        <rect key={x} x={x - 3} y="48" width="6" height="76" rx="3" fill={C.line} />
      ))}
      {discs.map((disc, i) => (
        <rect
          key={i}
          x={pegs[disc.peg]! - disc.w / 2}
          y={disc.y}
          width={disc.w}
          height="14"
          rx="7"
          fill={i === 3 ? C.mint : C.gold}
          stroke={C.goldDim}
        />
      ))}
    </Frame>
  );
}

function GlyphArt({
  glyph,
  accent = C.gold,
}: {
  glyph: string;
  accent?: string;
}) {
  return (
    <Frame>
      <rect x="28" y="36" width="104" height="88" rx="14" fill={C.surface} stroke={C.line} />
      <text
        x="80"
        y="96"
        textAnchor="middle"
        fill={accent}
        fontSize="34"
        fontWeight="800"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {glyph}
      </text>
    </Frame>
  );
}

function LessonQuizArt() {
  return <GlyphArt glyph="؟" />;
}
function GuessCityArt() {
  return (
    <Frame>
      <circle cx="80" cy="72" r="38" fill={C.surface} stroke={C.line} />
      <path d="M80 40c14 18 22 28 22 38a22 22 0 1 1-44 0c0-10 8-20 22-38z" fill={C.gold} />
      <circle cx="80" cy="78" r="7" fill={C.field} />
    </Frame>
  );
}
function LandmarkArt() {
  return (
    <Frame>
      <path d="M28 124 L80 36 L132 124Z" fill={C.raise} />
      <path d="M48 124 L80 68 L112 124Z" fill={C.gold} />
    </Frame>
  );
}
function CollectorArt() {
  return (
    <Frame>
      {[
        [44, 56],
        [92, 44],
        [118, 86],
        [60, 102],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill={C.mint} />
      ))}
      <path d="M44 56 L92 44 L118 86 L60 102Z" fill="none" stroke={C.gold} strokeWidth="3" />
    </Frame>
  );
}
function PriceArt() {
  return <GlyphArt glyph="$" accent={C.mint} />;
}
function WheelArt() {
  return (
    <Frame>
      <circle cx="80" cy="80" r="46" fill={C.surface} stroke={C.gold} strokeWidth="6" />
      <path d="M80 80 L80 36 A44 44 0 0 1 118 96Z" fill={C.gold} />
      <circle cx="80" cy="80" r="8" fill={C.field} />
    </Frame>
  );
}
function BasketArt() {
  return (
    <Frame>
      <path d="M36 52h88l-8 64H44Z" fill={C.raise} stroke={C.gold} />
      <path d="M50 52 V40 a30 16 0 0 1 60 0v12" fill="none" stroke={C.mint} strokeWidth="6" />
    </Frame>
  );
}
function HangwordArt() {
  return (
    <Frame>
      <path d="M40 124 V36 H96 V52" stroke={C.line} strokeWidth="6" fill="none" />
      <circle cx="96" cy="66" r="10" fill={C.gold} />
      <text x="80" y="128" textAnchor="middle" fill={C.ink} fontSize="16" fontWeight="700">
        ـ ـ ـ
      </text>
    </Frame>
  );
}
function FlagGuessArt() {
  return (
    <Frame>
      <rect x="28" y="44" width="104" height="72" rx="6" fill={C.raise} />
      <rect x="28" y="44" width="34" height="72" fill={C.clay} />
      <rect x="62" y="44" width="36" height="72" fill={C.ink} />
      <rect x="98" y="44" width="34" height="72" fill={C.mint} />
    </Frame>
  );
}
function FartherPairArt() {
  return (
    <Frame>
      <circle cx="44" cy="86" r="10" fill={C.mint} />
      <circle cx="122" cy="52" r="10" fill={C.gold} />
      <path d="M50 80 L116 56" stroke={C.ink} strokeWidth="3" strokeDasharray="5 4" />
    </Frame>
  );
}
function LargerCountryArt() {
  return (
    <Frame>
      <ellipse cx="56" cy="88" rx="26" ry="20" fill={C.raise} />
      <ellipse cx="100" cy="72" rx="38" ry="30" fill={C.gold} />
    </Frame>
  );
}
function CheaperArt() {
  return (
    <Frame>
      <rect x="28" y="54" width="46" height="58" rx="10" fill={C.raise} />
      <rect x="86" y="40" width="46" height="72" rx="10" fill={C.gold} />
      <text x="51" y="90" textAnchor="middle" fill={C.ink} fontSize="16" fontWeight="800">
        2
      </text>
      <text x="109" y="84" textAnchor="middle" fill={C.field} fontSize="16" fontWeight="800">
        8
      </text>
    </Frame>
  );
}
function SortPriceArt() {
  return (
    <Frame>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={28 + i * 8}
          y={48 + i * 22}
          width={104 - i * 16}
          height="18"
          rx="6"
          fill={i === 0 ? C.gold : C.raise}
        />
      ))}
    </Frame>
  );
}
function GuessDiscountArt() {
  return <GlyphArt glyph="%" accent={C.clay} />;
}
function QuickQArt() {
  return <GlyphArt glyph="Q" />;
}
function OrderStepsArt() {
  return (
    <Frame>
      {["1", "2", "3"].map((n, i) => (
        <g key={n}>
          <circle cx={48 + i * 32} cy="80" r="14" fill={i === 1 ? C.gold : C.raise} />
          <text
            x={48 + i * 32}
            y="86"
            textAnchor="middle"
            fill={i === 1 ? C.field : C.ink}
            fontSize="14"
            fontWeight="800"
          >
            {n}
          </text>
        </g>
      ))}
    </Frame>
  );
}
function MatchTermArt() {
  return (
    <Frame>
      <rect x="28" y="44" width="40" height="22" rx="6" fill={C.gold} />
      <rect x="92" y="88" width="40" height="22" rx="6" fill={C.mint} />
      <path d="M68 55 L92 99" stroke={C.ink} strokeWidth="3" />
    </Frame>
  );
}
function VocabArt() {
  return <GlyphArt glyph="Aa" />;
}
function FillBlankArt() {
  return (
    <Frame>
      <rect x="28" y="68" width="104" height="14" rx="4" fill={C.line} />
      <rect x="56" y="64" width="48" height="22" rx="6" fill={C.gold} />
    </Frame>
  );
}
function SolitaireArt() {
  return (
    <Frame>
      <rect x="30" y="36" width="42" height="60" rx="8" fill={C.raise} />
      <rect x="62" y="48" width="42" height="60" rx="8" fill={C.surface} stroke={C.gold} />
      <rect x="88" y="62" width="42" height="60" rx="8" fill={C.gold} />
    </Frame>
  );
}
function ShapesArt() {
  return (
    <Frame>
      <circle cx="54" cy="62" r="16" fill={C.gold} />
      <rect x="90" y="46" width="32" height="32" rx="4" fill={C.mint} />
      <path d="M54 118 L70 90 L38 90Z" fill={C.clay} />
    </Frame>
  );
}
function TypeRaceArt() {
  return (
    <Frame>
      <rect x="28" y="48" width="104" height="64" rx="10" fill={C.surface} stroke={C.line} />
      <rect x="40" y="64" width="54" height="10" rx="3" fill={C.gold} />
      <rect x="40" y="84" width="80" height="8" rx="3" fill={C.line} />
    </Frame>
  );
}
function UnoArt() {
  return (
    <Frame>
      <rect x="38" y="40" width="52" height="78" rx="10" fill={C.clay} transform="rotate(-12 64 79)" />
      <rect x="70" y="36" width="52" height="78" rx="10" fill={C.gold} transform="rotate(10 96 75)" />
    </Frame>
  );
}

const ART: Record<PlayableGameSlug, () => JSX.Element> = {
  sudoku: SudokuArt,
  g2048: G2048Art,
  snake: SnakeArt,
  memory: MemoryArt,
  xo: XoArt,
  hanoi: HanoiArt,
  "lesson-quiz": LessonQuizArt,
  "guess-city": GuessCityArt,
  landmark: LandmarkArt,
  collector: CollectorArt,
  price: PriceArt,
  wheel: WheelArt,
  basket: BasketArt,
  hangword: HangwordArt,
  "flag-guess": FlagGuessArt,
  "farther-pair": FartherPairArt,
  "larger-country": LargerCountryArt,
  cheaper: CheaperArt,
  "sort-price": SortPriceArt,
  "guess-discount": GuessDiscountArt,
  "quick-q": QuickQArt,
  "order-steps": OrderStepsArt,
  "match-term": MatchTermArt,
  vocab: VocabArt,
  "fill-blank": FillBlankArt,
  solitaire: SolitaireArt,
  shapes: ShapesArt,
  typerace: TypeRaceArt,
  uno: UnoArt,
};

export default function GameArt({
  slug,
  alt = "",
  priority = false,
  loading = "lazy",
}: {
  slug: PlayableGameSlug;
  alt?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
}) {
  const src = gameArtworkSrc(slug);
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={512}
        height={512}
        sizes="(max-width: 719px) 50vw, (max-width: 1099px) 33vw, 25vw"
        priority={priority}
        loading={priority ? undefined : loading}
        data-game-art={slug}
        data-game-art-photo="true"
      />
    );
  }
  const Art = ART[slug];
  return <Art />;
}
