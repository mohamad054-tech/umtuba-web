import {
  getLivingNavigationItem,
  isLivingNavigationItemEnabled,
  type LivingNavigationId,
} from "./livingNavigationConfig";

export type LivingNavigationState = {
  selectedId: LivingNavigationId | null;
};

export type LivingNavigationAction =
  | { type: "open"; id: LivingNavigationId }
  | { type: "close" }
  | { type: "escape" };

export const INITIAL_LIVING_NAVIGATION_STATE: LivingNavigationState = {
  selectedId: null,
};

export function reduceLivingNavigation(
  state: LivingNavigationState,
  action: LivingNavigationAction
): LivingNavigationState {
  if (action.type === "close" || action.type === "escape") {
    return state.selectedId === null
      ? state
      : INITIAL_LIVING_NAVIGATION_STATE;
  }

  const item = getLivingNavigationItem(action.id);
  if (!item || !isLivingNavigationItemEnabled(item)) {
    return state;
  }

  return state.selectedId === item.id ? state : { selectedId: item.id };
}
