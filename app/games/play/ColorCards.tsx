import type { UnoCard } from "../../../lib/games/play/engine";

export function ColorCard({
  card,
  faceDown = false,
}: {
  card?: UnoCard;
  faceDown?: boolean;
}) {
  if (faceDown || !card) {
    return (
      <span className="um-ccard down" dir="ltr" aria-hidden="true">
        <span className="um-ccard-back">
          <span className="um-ccard-diamond" />
        </span>
      </span>
    );
  }
  return (
    <span className={`um-ccard ${card.c}`} dir="ltr">
      <span className="um-ccard-pip tl">{card.v}</span>
      <span className="um-ccard-oval">
        <span className="um-ccard-big">{card.v}</span>
      </span>
      <span className="um-ccard-pip br">{card.v}</span>
    </span>
  );
}
