import type { UnoCard } from "../../../lib/games/play/engine";

const INK: Record<UnoCard["c"], string> = {
  red: "#c23b3b",
  gold: "#b8860b",
  mint: "#0f7a56",
  ink: "#1c2748",
};

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
        <span className="um-ccard-diamond" />
      </span>
    );
  }
  const ink = INK[card.c];
  return (
    <span className={`um-ccard ${card.c}`} style={{ color: ink, borderColor: ink }}>
      <span className="um-ccard-pip tl" dir="ltr">
        {card.v}
      </span>
      <span className="um-ccard-big" dir="ltr">
        {card.v}
      </span>
      <span className="um-ccard-pip br" dir="ltr">
        {card.v}
      </span>
    </span>
  );
}
