import { redirect } from "next/navigation";

/** Friendly alias — canonical listing lives under `/seller/store/products`. */
export default function SellerProductsAliasPage() {
  redirect("/seller/store/products");
}
