import { redirect } from "next/navigation";
import { APP_ROUTES } from "../../lib/nav";

export const metadata = {
  title: "Apply to Sell | UMTUBA",
};

/**
 * Legacy entry point — Store Setup Wizard is the Seller Self-Service V1 path.
 */
export default function SellerApplyPage() {
  redirect(APP_ROUTES.sellerSetup);
}
