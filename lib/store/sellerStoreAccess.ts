/**
 * Seller Center access is decided from DB membership + application status,
 * never from cookies or client-side seller flags.
 *
 * Platform approval remains `/admin/store/sellers` →
 * `admin_approve_seller_application` (pending → approved + verified store).
 */

export type SellerStoreAccessKind =
  | "approved"
  | "pending_review"
  | "setup"
  | "rejected"
  | "suspended";

export type SellerStoreAccessMembership = {
  store: {
    status: string;
    verification_status: string;
  };
};

export type SellerStoreAccessApplication = {
  status: string;
};

export function isApprovedSellerStore(input: {
  storeStatus: string | null | undefined;
  verificationStatus: string | null | undefined;
}): boolean {
  return (
    input.storeStatus === "active" && input.verificationStatus === "verified"
  );
}

export function isSellerApplicationAwaitingReview(status: string | null | undefined): boolean {
  return status === "pending" || status === "pending_review";
}

export function resolveSellerStoreAccess(input: {
  membership: SellerStoreAccessMembership | null;
  application: SellerStoreAccessApplication | null;
}): SellerStoreAccessKind {
  const store = input.membership?.store ?? null;
  const appStatus = input.application?.status ?? null;

  if (store?.status === "suspended" || appStatus === "suspended") {
    return "suspended";
  }

  if (
    isApprovedSellerStore({
      storeStatus: store?.status,
      verificationStatus: store?.verification_status,
    })
  ) {
    return "approved";
  }

  if (appStatus === "rejected") {
    return "rejected";
  }

  if (store) {
    return "pending_review";
  }

  if (isSellerApplicationAwaitingReview(appStatus)) {
    return "pending_review";
  }

  return "setup";
}

/** Where a non-approved seller must land instead of `/seller/store/*`. */
export function sellerStoreAccessRedirectPath(
  kind: SellerStoreAccessKind
): "/seller" | "/seller/setup" | "/seller/store" {
  if (kind === "approved") return "/seller/store";
  if (kind === "setup") return "/seller/setup";
  return "/seller";
}
