"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CheckoutPaymentOutcome } from "../../../../lib/sandbox/store/payment";
import {
  addToCart,
  completeRefundDemo,
  emptyStoreSession,
  placeOrder,
  requestRefund,
  requestReturn,
  setAddress,
  setCartQuantity,
  toggleFavorite,
  type PlaceOrderResult,
  type ShippingId,
  type StoreSessionState,
  type SyntheticAddress,
} from "../../../../lib/sandbox/store/session";

const STORAGE_KEY = "umtuba-sandbox-store-session-v2";

type StoreSessionApi = {
  state: StoreSessionState;
  hydrated: boolean;
  addToCart: (slug: string, variantId: string, quantity?: number) => void;
  setQty: (slug: string, variantId: string, quantity: number) => void;
  toggleFavorite: (slug: string) => void;
  setAddress: (address: SyntheticAddress) => void;
  checkout: (shippingId: ShippingId, outcome: CheckoutPaymentOutcome) => PlaceOrderResult;
  requestReturn: (orderId: string) => void;
  requestRefund: (orderId: string) => void;
  completeRefundDemo: (orderId: string) => void;
};

const StoreSessionContext = createContext<StoreSessionApi | null>(null);

export function StoreSessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreSessionState>(emptyStoreSession);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StoreSessionState;
          if (parsed && Array.isArray(parsed.cart) && Array.isArray(parsed.orders)) {
            setState({ ...emptyStoreSession(), ...parsed });
          }
        }
      } catch {
        /* keep seed */
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const api = useMemo<StoreSessionApi>(
    () => ({
      state,
      hydrated,
      addToCart: (slug, variantId, quantity) =>
        setState((current) => addToCart(current, slug, variantId, quantity)),
      setQty: (slug, variantId, quantity) =>
        setState((current) => setCartQuantity(current, slug, variantId, quantity)),
      toggleFavorite: (slug) => setState((current) => toggleFavorite(current, slug)),
      setAddress: (address) => setState((current) => setAddress(current, address)),
      checkout: (shippingId, outcome) => {
        const result = placeOrder(state, { shippingId, outcome });
        setState(result.state);
        return result;
      },
      requestReturn: (orderId) => setState((current) => requestReturn(current, orderId)),
      requestRefund: (orderId) => setState((current) => requestRefund(current, orderId)),
      completeRefundDemo: (orderId) =>
        setState((current) => completeRefundDemo(current, orderId)),
    }),
    [state, hydrated]
  );

  return <StoreSessionContext.Provider value={api}>{children}</StoreSessionContext.Provider>;
}

export function useStoreSession(): StoreSessionApi {
  const value = useContext(StoreSessionContext);
  if (!value) {
    throw new Error("useStoreSession requires StoreSessionProvider");
  }
  return value;
}

export function useStoreSessionOptional(): StoreSessionApi | null {
  return useContext(StoreSessionContext);
}

export function useFavoriteToggle(slug: string): { saved: boolean; toggle: () => void } {
  const session = useStoreSession();
  const saved = session.state.favorites.includes(slug);
  const toggle = useCallback(() => session.toggleFavorite(slug), [session, slug]);
  return { saved, toggle };
}
