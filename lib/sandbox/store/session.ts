import { SANDBOX_ORDERS } from "../fixtures/commerce";
import { SANDBOX_SHIPPING_EXAMPLES } from "../fixtures/store";
import type { PaymentOutcome, SandboxOrderStatus, StoreCommerceMode } from "../fixtures/types";
import { getStoreListingView, type StoreListingView } from "./listings";
import {
  checkoutCreatesOrder,
  runSandboxMockPayment,
  type CheckoutPaymentOutcome,
} from "./payment";

export type CartLine = {
  productSlug: string;
  variantId: string;
  quantity: number;
};

export type SyntheticAddress = {
  name: string;
  line1: string;
  city: string;
  region: string;
  postal: string;
  country: string;
};

export type ShippingId = "standard" | "express" | "digital";

export type ShopperOrderLine = {
  productSlug: string;
  variantId: string;
  title: string;
  variantTitle: string;
  quantity: number;
  unitMinor: number;
  currency: "USD";
  actorId: string;
  commerceMode: StoreCommerceMode;
};

export type ShopperOrder = {
  id: string;
  createdAt: string;
  lines: ShopperOrderLine[];
  address: SyntheticAddress;
  shippingId: ShippingId;
  shippingLabel: string;
  shippingMinor: number;
  subtotalMinor: number;
  totalMinor: number;
  status: SandboxOrderStatus;
  paymentOutcome: PaymentOutcome;
  paymentMode: "SANDBOX";
  realPayment: false;
  realProviderCall: false;
  customerName: string;
  afterSale?: "RETURN_PENDING" | "REFUND_PENDING" | "REFUNDED_DEMO";
};

export type StoreSessionState = {
  cart: CartLine[];
  favorites: string[];
  orders: ShopperOrder[];
  address: SyntheticAddress;
  nextOrderSeq: number;
};

export const DEFAULT_SANDBOX_ADDRESS: SyntheticAddress = {
  name: "Demo Student 01",
  line1: "1 Sandbox Lane",
  city: "Preview City",
  region: "QA",
  postal: "00000",
  country: "PS",
};

export function shippingQuote(
  shippingId: ShippingId,
  listings: readonly { stockKind: "digital" | "physical" }[]
): { id: ShippingId; label: string; amountMinor: number } {
  const allDigital = listings.length > 0 && listings.every((row) => row.stockKind === "digital");
  if (shippingId === "digital" || allDigital) {
    return { id: "digital", label: "Digital delivery · not a live file store", amountMinor: 0 };
  }
  const row =
    shippingId === "express" ? SANDBOX_SHIPPING_EXAMPLES[1] : SANDBOX_SHIPPING_EXAMPLES[0];
  return {
    id: shippingId,
    label: `${row?.label ?? "Sandbox shipping"} · not a promise`,
    amountMinor: row?.amountMinor ?? 0,
  };
}

function seedOrdersFromFixtures(): ShopperOrder[] {
  return SANDBOX_ORDERS.map((order, index) => {
    const listing = getStoreListingView(order.productSlug);
    const variant = listing?.product.variants[0];
    const line: ShopperOrderLine = {
      productSlug: order.productSlug,
      variantId: variant?.id ?? `${order.productSlug}-default`,
      title: order.productTitle,
      variantTitle: variant?.title ?? "Default",
      quantity: order.quantity,
      unitMinor: variant?.priceMinor ?? order.amountMinor,
      currency: "USD",
      actorId: listing?.actorId ?? "umtuba-owned",
      commerceMode: listing?.commerceMode ?? "UMTUBA_OWNED",
    };
    return {
      id: order.id,
      createdAt: `2026-08-18T10:0${index}:00.000Z`,
      lines: [line],
      address: DEFAULT_SANDBOX_ADDRESS,
      shippingId: order.shippingLabel.includes("express") ? "express" : "standard",
      shippingLabel: order.shippingLabel,
      shippingMinor: 0,
      subtotalMinor: order.amountMinor,
      totalMinor: order.amountMinor,
      status: order.status,
      paymentOutcome: order.paymentOutcome,
      paymentMode: "SANDBOX",
      realPayment: false,
      realProviderCall: false,
      customerName: order.customerName,
      afterSale:
        order.paymentOutcome === "REFUNDED_DEMO"
          ? "REFUNDED_DEMO"
          : order.paymentOutcome === "REFUND_PENDING"
            ? "REFUND_PENDING"
            : undefined,
    };
  });
}

export function emptyStoreSession(): StoreSessionState {
  return {
    cart: [],
    favorites: [],
    orders: seedOrdersFromFixtures(),
    address: DEFAULT_SANDBOX_ADDRESS,
    nextOrderSeq: 2001,
  };
}

export function cartQuantity(state: StoreSessionState): number {
  return state.cart.reduce((sum, line) => sum + line.quantity, 0);
}

export function resolveCartLines(state: StoreSessionState): {
  line: CartLine;
  listing: StoreListingView;
  variantTitle: string;
  unitMinor: number;
}[] {
  return state.cart.flatMap((line) => {
    const listing = getStoreListingView(line.productSlug);
    if (!listing) return [];
    const variant =
      listing.product.variants.find((row) => row.id === line.variantId) ??
      listing.product.variants[0];
    return [
      {
        line,
        listing,
        variantTitle: variant?.title ?? "Default",
        unitMinor: variant?.priceMinor ?? 0,
      },
    ];
  });
}

export function cartSubtotalMinor(state: StoreSessionState): number {
  return resolveCartLines(state).reduce(
    (sum, row) => sum + row.unitMinor * row.line.quantity,
    0
  );
}

export function cartActorIds(state: StoreSessionState): string[] {
  return [...new Set(resolveCartLines(state).map((row) => row.listing.actorId))];
}

export function addToCart(
  state: StoreSessionState,
  productSlug: string,
  variantId: string,
  quantity = 1
): StoreSessionState {
  const listing = getStoreListingView(productSlug);
  if (!listing) return state;
  const resolved =
    listing.product.variants.find((row) => row.id === variantId)?.id ??
    listing.product.variants[0]?.id;
  if (!resolved) return state;
  const qty = Math.max(1, Math.min(99, Math.floor(quantity)));
  const existing = state.cart.find(
    (line) => line.productSlug === productSlug && line.variantId === resolved
  );
  if (!existing) {
    return { ...state, cart: [...state.cart, { productSlug, variantId: resolved, quantity: qty }] };
  }
  return {
    ...state,
    cart: state.cart.map((line) =>
      line === existing ? { ...line, quantity: Math.min(99, line.quantity + qty) } : line
    ),
  };
}

export function setCartQuantity(
  state: StoreSessionState,
  productSlug: string,
  variantId: string,
  quantity: number
): StoreSessionState {
  const qty = Math.floor(quantity);
  if (qty <= 0) return removeCartLine(state, productSlug, variantId);
  return {
    ...state,
    cart: state.cart.map((line) =>
      line.productSlug === productSlug && line.variantId === variantId
        ? { ...line, quantity: Math.min(99, qty) }
        : line
    ),
  };
}

export function removeCartLine(
  state: StoreSessionState,
  productSlug: string,
  variantId: string
): StoreSessionState {
  return {
    ...state,
    cart: state.cart.filter(
      (line) => !(line.productSlug === productSlug && line.variantId === variantId)
    ),
  };
}

export function toggleFavorite(state: StoreSessionState, productSlug: string): StoreSessionState {
  if (state.favorites.includes(productSlug)) {
    return { ...state, favorites: state.favorites.filter((slug) => slug !== productSlug) };
  }
  if (!getStoreListingView(productSlug)) return state;
  return { ...state, favorites: [...state.favorites, productSlug] };
}

export function setAddress(
  state: StoreSessionState,
  address: SyntheticAddress
): StoreSessionState {
  return { ...state, address };
}

export type PlaceOrderResult =
  | { ok: true; state: StoreSessionState; order: ShopperOrder; payment: ReturnType<typeof runSandboxMockPayment> }
  | {
      ok: false;
      state: StoreSessionState;
      reason: "EMPTY_CART" | "DECLINED" | "CANCELLED";
      payment: ReturnType<typeof runSandboxMockPayment>;
    };

export function placeOrder(
  state: StoreSessionState,
  input: { shippingId: ShippingId; outcome: CheckoutPaymentOutcome }
): PlaceOrderResult {
  const payment = runSandboxMockPayment(input.outcome);
  const resolved = resolveCartLines(state);
  if (resolved.length === 0) {
    return { ok: false, state, reason: "EMPTY_CART", payment };
  }
  if (input.outcome === "DECLINED") {
    return { ok: false, state, reason: "DECLINED", payment };
  }
  if (input.outcome === "CANCELLED") {
    return { ok: false, state, reason: "CANCELLED", payment };
  }
  if (!checkoutCreatesOrder(input.outcome)) {
    return { ok: false, state, reason: "CANCELLED", payment };
  }

  const listings = resolved.map((row) => row.listing);
  const ship = shippingQuote(input.shippingId, listings);
  const subtotalMinor = resolved.reduce(
    (sum, row) => sum + row.unitMinor * row.line.quantity,
    0
  );
  const status: SandboxOrderStatus = input.outcome === "PROCESSING" ? "PROCESSING" : "CAPTURED";
  const order: ShopperOrder = {
    id: `sandbox-ord-${state.nextOrderSeq}`,
    createdAt: new Date().toISOString(),
    lines: resolved.map((row) => ({
      productSlug: row.line.productSlug,
      variantId: row.line.variantId,
      title: row.listing.product.title,
      variantTitle: row.variantTitle,
      quantity: row.line.quantity,
      unitMinor: row.unitMinor,
      currency: "USD",
      actorId: row.listing.actorId,
      commerceMode: row.listing.commerceMode,
    })),
    address: state.address,
    shippingId: ship.id,
    shippingLabel: ship.label,
    shippingMinor: ship.amountMinor,
    subtotalMinor,
    totalMinor: subtotalMinor + ship.amountMinor,
    status,
    paymentOutcome: input.outcome,
    paymentMode: "SANDBOX",
    realPayment: false,
    realProviderCall: false,
    customerName: state.address.name,
  };

  return {
    ok: true,
    order,
    payment,
    state: {
      ...state,
      cart: [],
      orders: [order, ...state.orders],
      nextOrderSeq: state.nextOrderSeq + 1,
    },
  };
}

export function requestReturn(state: StoreSessionState, orderId: string): StoreSessionState {
  return {
    ...state,
    orders: state.orders.map((order) => {
      if (order.id !== orderId) return order;
      if (order.paymentOutcome !== "SUCCESS" && order.status !== "CAPTURED") return order;
      return { ...order, status: "RETURN_PENDING", afterSale: "RETURN_PENDING" };
    }),
  };
}

export function requestRefund(state: StoreSessionState, orderId: string): StoreSessionState {
  return {
    ...state,
    orders: state.orders.map((order) => {
      if (order.id !== orderId) return order;
      if (order.afterSale === "REFUNDED_DEMO") return order;
      const payment = runSandboxMockPayment("REFUND_PENDING");
      void payment;
      return {
        ...order,
        status: "REFUND_PENDING",
        paymentOutcome: "REFUND_PENDING",
        afterSale: "REFUND_PENDING",
        realProviderCall: false,
      };
    }),
  };
}

export function completeRefundDemo(state: StoreSessionState, orderId: string): StoreSessionState {
  return {
    ...state,
    orders: state.orders.map((order) => {
      if (order.id !== orderId) return order;
      const payment = runSandboxMockPayment("REFUNDED_DEMO");
      void payment;
      return {
        ...order,
        status: "REFUNDED",
        paymentOutcome: "REFUNDED_DEMO",
        afterSale: "REFUNDED_DEMO",
        realProviderCall: false,
      };
    }),
  };
}

export function listingOnHandUnchanged(
  before: number | null,
  after: number | null
): boolean {
  return before === after;
}
