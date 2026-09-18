import type { JSX, ReactNode } from "react";
import type { PlayableGameSlug } from "../../../lib/games/play/catalog";

/** Original Umtuba tile marks. Geometric only — not derived from third-party art. */

const C = {
  field: "#0C2723",
  surface: "#14352F",
  raise: "#1B443C",
  line: "#255A50",
  gold: "#F0A93B",
  goldDim: "#9A6E22",
  ink: "#EAF2EE",
  clay: "#D46A5E",
  mint: "#5FCBA4",
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

const ART: Record<PlayableGameSlug, () => JSX.Element> = {
  sudoku: SudokuArt,
  g2048: G2048Art,
  snake: SnakeArt,
  memory: MemoryArt,
  xo: XoArt,
  hanoi: HanoiArt,
};

export default function GameArt({ slug }: { slug: PlayableGameSlug }) {
  const Art = ART[slug];
  return <Art />;
}
