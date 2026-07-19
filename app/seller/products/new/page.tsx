import { redirect } from "next/navigation";

/** Friendly alias — canonical draft creation lives under `/seller/store/products/new`. */
export default function SellerNewProductAliasPage() {
  redirect("/seller/store/products/new");
}
