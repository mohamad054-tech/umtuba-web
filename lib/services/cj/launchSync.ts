/**
 * Read-only CJ sync foundation for the 59 approved drafts.
 * Price, stock, availability, and shipping/delivery only.
 * Write/order/payment paths stay disabled.
 */

import { CJ_ENDPOINTS, CJ_FORBIDDEN_WRITE_PATHS } from "./constants";

export const CJ_LAUNCH_SYNC_FIELDS = [
  "price",
  "stock",
  "availability",
  "shipping",
  "delivery",
] as const;

export type CjReadSyncPlan = {
  mode: "read_only";
  fields: typeof CJ_LAUNCH_SYNC_FIELDS;
  endpoints: string[];
  write_calls_enabled: false;
  order_calls_enabled: false;
};

export function createCjLaunchReadSyncPlan(): CjReadSyncPlan {
  return {
    mode: "read_only",
    fields: CJ_LAUNCH_SYNC_FIELDS,
    endpoints: [
      CJ_ENDPOINTS.productQuery,
      CJ_ENDPOINTS.listV2,
      CJ_ENDPOINTS.freightCalculate,
    ],
    write_calls_enabled: false,
    order_calls_enabled: false,
  };
}

export function assertReadOnlySyncPath(path: string): void {
  if (CJ_FORBIDDEN_WRITE_PATHS.some((blocked) => path.startsWith(blocked))) {
    throw new Error("Forbidden CJ write path in launch sync.");
  }
}
