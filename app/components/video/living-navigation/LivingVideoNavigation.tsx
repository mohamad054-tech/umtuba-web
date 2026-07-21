"use client";

import LivingNavigationAction from "./LivingNavigationAction";
import LivingNavigationOverlay from "./LivingNavigationOverlay";
import {
  getLivingNavigationItem,
  LIVING_NAVIGATION_ITEMS,
  type LivingNavigationId,
  type LivingNavigationItem,
} from "./livingNavigationConfig";

type LivingVideoNavigationProps = {
  selectedId: LivingNavigationId | null;
  onSelect: (id: LivingNavigationId) => void;
  onClose: () => void;
};

export default function LivingVideoNavigation({
  selectedId,
  onSelect,
  onClose,
}: LivingVideoNavigationProps) {
  const selectedItem = getLivingNavigationItem(selectedId);

  function handleSelect(item: LivingNavigationItem) {
    onSelect(item.id);
  }

  return (
    <>
      <nav
        aria-label="Living video navigation"
        className="pointer-events-auto absolute right-3 top-[28%] z-30 flex max-h-[38%] flex-col gap-2 overflow-y-auto md:top-[24%]"
      >
        {LIVING_NAVIGATION_ITEMS.map((item) => (
          <LivingNavigationAction
            key={item.id}
            item={item}
            active={item.id === selectedId}
            onSelect={handleSelect}
          />
        ))}
      </nav>

      {selectedItem ? (
        <LivingNavigationOverlay
          item={selectedItem}
          onSelect={handleSelect}
          onClose={onClose}
        />
      ) : null}
    </>
  );
}
