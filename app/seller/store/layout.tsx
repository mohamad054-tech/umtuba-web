import type { ReactNode } from "react";
import { requireApprovedSellerStoreSession } from "./requireApprovedSellerStore";

export default async function SellerStoreLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireApprovedSellerStoreSession();
  return children;
}
