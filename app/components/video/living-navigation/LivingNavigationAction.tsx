import LivingNavigationIcon from "./LivingNavigationIcon";
import {
  isLivingNavigationItemEnabled,
  type LivingNavigationItem,
} from "./livingNavigationConfig";

type LivingNavigationActionProps = {
  item: LivingNavigationItem;
  active: boolean;
  onSelect: (item: LivingNavigationItem) => void;
};

export default function LivingNavigationAction({
  item,
  active,
  onSelect,
}: LivingNavigationActionProps) {
  const enabled = isLivingNavigationItemEnabled(item);
  const accessibleLabel = enabled
    ? `${item.label}, open prototype overlay`
    : `${item.label}, unavailable until its feature is enabled`;

  return (
    <button
      type="button"
      className={`group watch-focus-ring relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
        active
          ? "border-white bg-white text-[#050510]"
          : enabled
            ? "border-white/20 bg-black/55 text-white hover:bg-black/75"
            : "cursor-not-allowed border-white/10 bg-black/35 text-white/35"
      }`}
      aria-label={accessibleLabel}
      aria-pressed={enabled ? active : undefined}
      aria-disabled={!enabled}
      data-living-navigation-id={item.id}
      data-feature-status={item.featureStatus}
      onClick={() => {
        if (enabled) onSelect(item);
      }}
    >
      <LivingNavigationIcon icon={item.icon} />
      <span
        className="pointer-events-none absolute right-[calc(100%+0.5rem)] z-10 whitespace-nowrap rounded-full border border-white/10 bg-black/80 px-2.5 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        aria-hidden="true"
      >
        {item.label}
        {!enabled ? " · unavailable" : ""}
      </span>
    </button>
  );
}
