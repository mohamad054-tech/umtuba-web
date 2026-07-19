import { redirect } from "next/navigation";

type SellerProductAliasPageProps = {
  params: Promise<{ productId: string }>;
};

/** Friendly alias — canonical edit screen lives under `/seller/store/products/[productId]/edit`. */
export default async function SellerProductAliasPage({
  params,
}: SellerProductAliasPageProps) {
  const { productId } = await params;
  redirect(`/seller/store/products/${productId}/edit`);
}
