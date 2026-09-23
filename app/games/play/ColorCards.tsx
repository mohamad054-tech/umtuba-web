import type { UnoCard } from "../../../lib/games/play/engine";

function CardGlyph({ value }: { value: string }) {
  if (value === "skip") {
    return (
      <svg viewBox="0 0 64 64" className="um-ccard-symbol" aria-hidden="true">
        <circle cx="32" cy="32" r="16" />
        <path d="M22 42 L42 22" />
      </svg>
    );
  }
  if (value === "rev") {
    return (
      <svg viewBox="0 0 64 64" className="um-ccard-symbol" aria-hidden="true">
        <path d="M18 26h22l-6-7" />
        <path d="M46 38H24l6 7" />
      </svg>
    );
  }
  return (
    <span className="um-ccard-big" dir="ltr">
      {value}
    </span>
  );
}

export function ColorCard({
  card,
  faceDown = false,
}: {
  card?: UnoCard;
  faceDown?: boolean;
}) {
  if (faceDown || !card) {
    return (
      <span className="um-ccard down" aria-hidden="true">
        <span className="um-ccard-face">
          <span className="um-ccard-diamond" />
        </span>
      </span>
    );
  }
  return (
    <span className={`um-ccard ${card.c}`}>
      <span className="um-ccard-face">
        <span className="um-ccard-oval" aria-hidden="true" />
        <span className="um-ccard-pip tl" dir="ltr">
          {card.v}
        </span>
        <CardGlyph value={card.v} />
        <span className="um-ccard-pip br" dir="ltr">
          {card.v}
        </span>
      </span>
    </span>
  );
}
